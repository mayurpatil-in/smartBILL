from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.session import get_db
from app.models.client_login import ClientLogin

# Dedicated OAuth2 scheme for clients (optional, can share if paths differ, 
# but usually good to have distinct if the login URL is different)
oauth2_client_scheme = OAuth2PasswordBearer(tokenUrl="/auth/client/login")

def get_current_client(
    token: str = Depends(oauth2_client_scheme),
    db: Session = Depends(get_db)
) -> ClientLogin:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        # We expect "sub" to be "client:{party_id}"
        # OR better, standard "sub": "party_id" with a "type": "client" claim
        # Let's stick to the plan in client_auth.py where we put party info in 'sub' or data.
        
        # Let's check how I implemented client_auth.py. 
        # I passed `subject=f"client:{client.party_id}"` which is WRONG for the existing create_access_token signature.
        # I will fix client_auth.py to use `data={"type": "client", "client_login_id": ...}`
        
        type_claim = payload.get("type")
        client_login_id = payload.get("client_login_id")
        
        if type_claim != "client" or client_login_id is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    client = db.query(ClientLogin).filter(ClientLogin.id == client_login_id).first()
    if client is None:
        raise credentials_exception
        
    if not client.is_active:
        raise HTTPException(status_code=400, detail="Inactive client account")
        
    return client
