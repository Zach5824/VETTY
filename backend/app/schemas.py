from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from .models import UserRole

# Auth Schemas
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: Optional[UserRole] = UserRole.user

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    role: UserRole
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

# FAQ Schemas
class FAQCreate(BaseModel):
    category: str
    question: str
    answer: str

class FAQResponse(FAQCreate):
    id: int
    created_by: int
    created_at: datetime

    class Config:
        from_attributes = True