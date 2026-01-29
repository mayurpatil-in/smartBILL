from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core import security
from app.core.config import settings
from app.database.session import get_db
from app.models.client_login import ClientLogin
from app.models.party import Party

router = APIRouter(prefix="/auth/client", tags=["client-auth"])

class ClientToken(BaseModel):
    access_token: str
    token_type: str
    party_name: str

class ClientLoginRequest(BaseModel):
    username: str
    password: str

@router.post("/login", response_model=ClientToken)
def login_access_token(
    login_data: ClientLoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Client Login
    """
    client = db.query(ClientLogin).filter(ClientLogin.username == login_data.username).first()
    
    if not client:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    if not security.verify_password(login_data.password, client.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
        
    if not client.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
        
    # Create token with specific client claims
    token = security.create_access_token(
        data={
            "type": "client",
            "client_login_id": client.id,
            "party_id": client.party_id,
            "sub": str(client.id) # Standard claim
        }
    )
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "party_name": client.party.name
    }
