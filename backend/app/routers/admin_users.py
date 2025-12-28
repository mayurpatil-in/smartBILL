from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.user import User, UserRole
from app.core.admin_guard import require_super_admin
from app.core.security import get_password_hash

router = APIRouter(
    prefix="/admin/users",
    tags=["Super Admin"],
)


@router.post("/")
def create_company_admin(
    company_id: int,
    name: str,
    email: str,
    password: str,
    db: Session = Depends(get_db),
    _: str = Depends(require_super_admin),
):
    user = User(
        name=name,
        email=email,
        password_hash=get_password_hash(password),  # ✅ FIXED
        role=UserRole.ADMIN,
        company_id=company_id,
        is_active=True,
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    return {"message": "Company admin created"}
