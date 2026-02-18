from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, case
from datetime import datetime, timedelta

from app.database.session import get_db
from app.core.dependencies import get_company_id, get_active_financial_year
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.item import Item
from app.models.stock_transaction import StockTransaction
from app.models.party import Party
from app.models.payment import Payment

router = APIRouter(prefix="/ai-insights", tags=["AI Insights"])


# ─── Helper: calculate current stock for a company ───────────────────────────
def _stock_subquery(db: Session, company_id: int):
    return db.query(
        StockTransaction.item_id,
        func.sum(
            case(
                (StockTransaction.transaction_type == "IN", StockTransaction.quantity),
                (StockTransaction.transaction_type == "OUT", -StockTransaction.quantity),
                else_=0,
            )
        ).label("current_stock"),
    ).filter(
        StockTransaction.company_id == company_id
    ).group_by(StockTransaction.item_id).subquery()


# ─── Helper: outstanding balance for a party ─────────────────────────────────
# Outstanding = sum(grand_total - paid_amount) across all non-cancelled invoices
def _party_outstanding(db: Session, party_id: int, company_id: int) -> float:
    result = db.query(
        func.sum(Invoice.grand_total - Invoice.paid_amount)
    ).filter(
        Invoice.party_id == party_id,
        Invoice.company_id == company_id,
        Invoice.status != "CANCELLED",
    ).scalar()
    opening = db.query(Party.opening_balance).filter(Party.id == party_id).scalar() or 0
    return float(result or 0) + float(opening)


# ─────────────────────────────────────────────────────────────────────────────
# BRIEFING
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/briefing")
def get_daily_briefing(
    company_id: int = Depends(get_company_id),
    fy=Depends(get_active_financial_year),
    db: Session = Depends(get_db),
):
    today = datetime.now().date()
    yesterday = today - timedelta(days=1)

    # 1. Sales today vs yesterday
    sales_today = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_date == today,
        Invoice.status != "CANCELLED",
    ).scalar() or 0

    sales_yesterday = db.query(func.sum(Invoice.grand_total)).filter(
        Invoice.company_id == company_id,
        Invoice.invoice_date == yesterday,
        Invoice.status != "CANCELLED",
    ).scalar() or 0

    # 2. Low stock items (stock ≤ 5)
    sq = _stock_subquery(db, company_id)
    low_stock_results = db.query(Item.id, Item.name, sq.c.current_stock).join(
        sq, Item.id == sq.c.item_id
    ).filter(
        Item.company_id == company_id,
        Item.is_active == True,
        sq.c.current_stock <= 5,
    ).all()
    
    low_stock_count = len(low_stock_results)
    low_stock_details = [
        {"id": row.id, "name": row.name, "current_stock": row.current_stock}
        for row in low_stock_results
    ]

    # 3. Total receivable = sum of (grand_total - paid_amount) for all invoices
    total_receivable = db.query(
        func.sum(Invoice.grand_total - Invoice.paid_amount)
    ).filter(
        Invoice.company_id == company_id,
        Invoice.status != "CANCELLED",
        Invoice.payment_status.in_(["PENDING", "PARTIAL"]),
    ).scalar() or 0

    # Narrative
    hour = datetime.now().hour
    greeting = f"Good {'morning' if hour < 12 else 'afternoon' if hour < 17 else 'evening'}!"

    if sales_yesterday > 0:
        pct = ((sales_today - sales_yesterday) / sales_yesterday) * 100
        if pct > 0:
            sales_text = f"Today's sales are ₹{sales_today:,.0f}, up {pct:.1f}% from yesterday! 🚀"
        else:
            sales_text = f"Today's sales are ₹{sales_today:,.0f}, down {abs(pct):.1f}% from yesterday. 📉"
    elif sales_today > 0:
        sales_text = f"Today's sales are ₹{sales_today:,.0f}. Great start!"
    else:
        sales_text = "No sales recorded today yet."

    stock_text = (
        f"⚠️ {low_stock_count} items are running low on stock."
        if low_stock_count > 0
        else "✅ Stock levels look healthy."
    )
    recv_text = f"₹{total_receivable:,.0f} in pending receivables."

    return {
        "greeting": greeting,
        "summary": f"{sales_text} {stock_text} {recv_text}",
        "metrics": {
            "sales_today": float(sales_today),
            "sales_change": float(sales_today - sales_yesterday),
            "low_stock_items": int(low_stock_count),
            "low_stock_details": low_stock_details,
            "total_receivable": float(total_receivable),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# ANOMALIES
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/anomalies")
def get_anomalies(
    company_id: int = Depends(get_company_id),
    fy=Depends(get_active_financial_year),
    db: Session = Depends(get_db),
):
    anomalies = []
    today = datetime.now().date()

    # ── 1. Dormant Customers ──────────────────────────────────────────────────
    # Active in last 6 months BUT no invoice in last 45 days
    six_months_ago = today - timedelta(days=180)
    forty_five_days_ago = today - timedelta(days=45)

    active_ids = [
        r[0]
        for r in db.query(Invoice.party_id)
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date >= six_months_ago,
            Invoice.status != "CANCELLED",
        )
        .distinct()
        .all()
    ]

    if active_ids:
        recent_ids = [
            r[0]
            for r in db.query(Invoice.party_id)
            .filter(
                Invoice.company_id == company_id,
                Invoice.invoice_date >= forty_five_days_ago,
                Invoice.party_id.in_(active_ids),
                Invoice.status != "CANCELLED",
            )
            .distinct()
            .all()
        ]

        dormant_ids = set(active_ids) - set(recent_ids)

        if dormant_ids:
            dormant_parties = db.query(Party).filter(Party.id.in_(dormant_ids)).all()
            for party in dormant_parties:
                last_inv = (
                    db.query(Invoice)
                    .filter(
                        Invoice.party_id == party.id,
                        Invoice.company_id == company_id,
                    )
                    .order_by(Invoice.invoice_date.desc())
                    .first()
                )
                days_since = (today - last_inv.invoice_date).days if last_inv else 0
                anomalies.append({
                    "type": "DORMANT_CUSTOMER",
                    "severity": "medium",
                    "title": f"Dormant Customer: {party.name}",
                    "description": f"Has not purchased in {days_since} days. Last invoice was on {last_inv.invoice_date.strftime('%d %b %Y') if last_inv else 'N/A'}.",
                    "metadata": {"party_id": party.id, "days_since": days_since},
                })

    # ── 2. High Outstanding Balance ───────────────────────────────────────────
    # Parties with unpaid invoice amount > ₹50,000
    HIGH_DEBT_THRESHOLD = 50000

    # Get all parties that have invoices for this company
    party_ids_with_invoices = [
        r[0]
        for r in db.query(Invoice.party_id)
        .filter(
            Invoice.company_id == company_id,
            Invoice.status != "CANCELLED",
            Invoice.payment_status.in_(["PENDING", "PARTIAL"]),
        )
        .distinct()
        .all()
    ]

    for party_id in party_ids_with_invoices:
        outstanding = db.query(
            func.sum(Invoice.grand_total - Invoice.paid_amount)
        ).filter(
            Invoice.party_id == party_id,
            Invoice.company_id == company_id,
            Invoice.status != "CANCELLED",
            Invoice.payment_status.in_(["PENDING", "PARTIAL"]),
        ).scalar() or 0

        opening = db.query(Party.opening_balance).filter(Party.id == party_id).scalar() or 0
        total_outstanding = float(outstanding) + float(opening)

        if total_outstanding > HIGH_DEBT_THRESHOLD:
            party = db.query(Party).filter(Party.id == party_id).first()
            if party:
                anomalies.append({
                    "type": "HIGH_DEBT",
                    "severity": "high",
                    "title": f"High Outstanding: {party.name}",
                    "description": f"Owes ₹{total_outstanding:,.0f}. Immediate collection follow-up recommended.",
                    "metadata": {"party_id": party.id, "amount": total_outstanding},
                })

    return anomalies


# ─────────────────────────────────────────────────────────────────────────────
# PREDICTIONS
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/predictions")
def get_predictions(
    company_id: int = Depends(get_company_id),
    fy=Depends(get_active_financial_year),
    db: Session = Depends(get_db),
):
    predictions = []
    today = datetime.now().date()
    thirty_days_ago = today - timedelta(days=30)

    # Stock subquery
    sq = _stock_subquery(db, company_id)

    # Top selling items in last 30 days
    top_items = (
        db.query(InvoiceItem.item_id, func.sum(InvoiceItem.quantity).label("total_qty"))
        .join(Invoice)
        .filter(
            Invoice.company_id == company_id,
            Invoice.invoice_date >= thirty_days_ago,
            Invoice.status != "CANCELLED",
        )
        .group_by(InvoiceItem.item_id)
        .order_by(desc("total_qty"))
        .limit(20)
        .all()
    )

    for item_id, total_qty in top_items:
        avg_daily = float(total_qty) / 30
        if avg_daily <= 0:
            continue

        item = db.query(Item).filter(Item.id == item_id).first()
        if not item:
            continue

        # Get current stock from subquery
        stock_row = db.query(sq.c.current_stock).filter(sq.c.item_id == item_id).scalar()
        current_stock = float(stock_row) if stock_row is not None else 0

        if current_stock <= 0:
            continue

        days_left = current_stock / avg_daily

        if days_left < 7:
            predictions.append({
                "type": "STOCKOUT_RISK",
                "item_name": item.name,
                "current_stock": current_stock,
                "avg_daily_sales": round(avg_daily, 2),
                "days_remaining": round(days_left, 1),
                "predicted_date": (today + timedelta(days=int(days_left))).isoformat(),
            })

    return predictions
