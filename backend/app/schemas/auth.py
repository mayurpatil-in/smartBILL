from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str
    remember: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
