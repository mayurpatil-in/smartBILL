from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember: bool = False
    totp_code: str | None = None  # Added for 2FA validation


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
