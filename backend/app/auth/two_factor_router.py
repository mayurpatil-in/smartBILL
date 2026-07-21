from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
import pyotp
import urllib.parse

from app.database.session import get_db
from app.models.user import User
from app.core.dependencies import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/2fa", tags=["Two-Factor Authentication"])

class Verify2FARequest(BaseModel):
    code: str
    secret: str | None = None

@router.post("/setup")
def setup_2fa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a new TOTP secret for the user and return the provisioning URI.
    Does NOT enable 2FA yet. The user must verify first.
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this account."
        )

    # Generate a random base32 secret
    secret = pyotp.random_base32()
    
    # Generate provisioning URI for QR code
    totp = pyotp.TOTP(secret)
    # The label shown in the authenticator app
    issuer_name = "SmartBill"
    user_email = current_user.email or f"User_{current_user.id}"
    
    uri = totp.provisioning_uri(name=user_email, issuer_name=issuer_name)

    return {
        "secret": secret,
        "uri": uri
    }


@router.post("/verify-setup")
def verify_setup_2fa(
    data: Verify2FARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Verify the first 2FA code and enable 2FA for the user.
    """
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=400,
            detail="2FA is already enabled for this account."
        )

    if not data.secret:
        raise HTTPException(status_code=400, detail="Secret is required for setup.")

    totp = pyotp.TOTP(data.secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code. Please try again.")

    # Valid code! Enable 2FA.
    current_user.totp_secret = data.secret
    current_user.is_2fa_enabled = True
    db.commit()

    return {"message": "2FA has been successfully enabled."}


@router.post("/disable")
def disable_2fa(
    data: Verify2FARequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disable 2FA. Requires verifying the current 2FA code one last time.
    """
    if not current_user.is_2fa_enabled or not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA is not enabled.")

    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Invalid 2FA code.")

    current_user.is_2fa_enabled = False
    current_user.totp_secret = None
    db.commit()

    return {"message": "2FA has been disabled."}
