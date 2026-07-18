from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from app.database.session import get_db
from app.models.expense import Expense
from app.models.party import Party
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseStats
from app.core.dependencies import get_company_id, get_active_financial_year, get_current_user
from app.services.audit_service import log_audit_action

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.get("/", response_model=List[ExpenseResponse])
def get_expenses(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    category: Optional[str] = None,
    is_recurring: bool = False, # By default fetch normal expenses
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    query = db.query(Expense).options(
        joinedload(Expense.party)
    ).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id,
        Expense.is_recurring == is_recurring 
    )
    
    if start_date:
        query = query.filter(Expense.date >= start_date)
    if end_date:
        query = query.filter(Expense.date <= end_date)
    if category:
        query = query.filter(Expense.category == category)
        
    expenses = query.order_by(Expense.date.desc()).all()
    
    # Transform for Response (to include party_name)
    results = []
    for exp in expenses:
        # Assuming fetch party name eagerly or just accessing it
        # Since we didn't use joinedload on list, accessing exp.party might trigger lazy load
        # For simplicity in this iteration, let's map it. 
        # Ideally query should have options(joinedload(Expense.party))
        item = ExpenseResponse.from_orm(exp)
        if exp.party:
            item.party_name = exp.party.name
        results.append(item)
        
    return results

@router.get("/stats", response_model=ExpenseStats)
def get_expense_stats(
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    # Total Expenses
    total_query = db.query(
        func.sum(Expense.amount).label("total"),
        func.count(Expense.id).label("count")
    ).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id,
        Expense.is_recurring == False
    ).first()
    
    # This Month
    today = date.today()
    start_of_month = today.replace(day=1)
    
    month_query = db.query(func.sum(Expense.amount)).filter(
        Expense.company_id == company_id,
        Expense.financial_year_id == fy.id,
        Expense.is_recurring == False,
        Expense.date >= start_of_month
    ).scalar()
    
    return {
        "total_amount": total_query.total or 0,
        "count": total_query.count or 0,
        "this_month_amount": month_query or 0
    }

@router.post("/", response_model=ExpenseResponse)
def create_expense(
    expense_data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    fy = Depends(get_active_financial_year),
    db: Session = Depends(get_db)
):
    expense = Expense(
        **expense_data.dict(),
        company_id=company_id,
        financial_year_id=fy.id
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    
    # Audit Log
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="EXPENSE_CREATE",
        company_id=company_id,
        details=f"Created expense of {expense.amount} for category {expense.category}"
    )
    
    # Fetch party name if exists
    resp = ExpenseResponse.from_orm(expense)
    if expense.party_id:
        p = db.get(Party, expense.party_id)
        if p:
            resp.party_name = p.name
            
    return resp

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(
    expense_id: int,
    expense_data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.company_id == company_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    for key, value in expense_data.dict(exclude_unset=True).items():
        setattr(expense, key, value)
        
    db.commit()
    db.refresh(expense)
    
    # Audit Log
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="EXPENSE_UPDATE",
        company_id=company_id,
        details=f"Updated expense #{expense.id}"
    )
    
    resp = ExpenseResponse.from_orm(expense)
    if expense.party:
        resp.party_name = expense.party.name
    return resp

@router.delete("/{expense_id}")
def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    expense = db.query(Expense).filter(Expense.id == expense_id, Expense.company_id == company_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    db.delete(expense)
    db.commit()
    
    # Audit Log
    log_audit_action(
        db=db,
        user_id=current_user.id,
        action="EXPENSE_DELETE",
        company_id=company_id,
        details=f"Deleted expense #{expense_id} ({expense.amount})"
    )
    
    return {"message": "Expense deleted successfully"}

# Recurring Specific Endpoints
@router.post("/{template_id}/post")
def post_recurring_expense(
    template_id: int,
    company_id: int = Depends(get_company_id),
    db: Session = Depends(get_db)
):
    """
    Manually 'Post' a recurring template to create a real expense for today.
    """
    template = db.query(Expense).filter(
        Expense.id == template_id, 
        Expense.company_id == company_id,
        Expense.is_recurring == True
    ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="Recurring template not found")
        
    # Create new expense from template
    new_expense = Expense(
        company_id=template.company_id,
        financial_year_id=template.financial_year_id,
        party_id=template.party_id,
        date=date.today(),
        category=template.category,
        description=f"Recurring: {template.description or template.category}",
        amount=template.amount,
        payment_method=template.payment_method,
        is_recurring=False, # This is the REAL instance
        status="PAID"
    )
    
    # Update next due date for template
    if template.recurring_frequency == "Monthly":
        # Add 1 strict month to date
        if template.next_due_date:
            template.next_due_date = template.next_due_date + relativedelta(months=1)
            
    db.add(new_expense)
    db.commit()
    
    return {"message": "Expense posted successfully", "new_expense_id": new_expense.id}
