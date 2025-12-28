from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
from datetime import datetime
from .core.config import settings


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=settings.MIN_PASSWORD_LENGTH)
    security_question: str = Field(..., min_length=3, max_length=200)
    security_answer: str = Field(..., min_length=1, max_length=100)
    hint: str = Field(..., max_length=200)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < settings.MIN_PASSWORD_LENGTH:
            raise ValueError(f'Password must be at least {settings.MIN_PASSWORD_LENGTH} characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @field_validator('security_answer')
    @classmethod
    def normalize_security_answer(cls, v: str) -> str:
        # Normalize to lowercase and strip whitespace for consistency
        return v.lower().strip()


class PasswordReset(BaseModel):
    email: EmailStr
    security_answer: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=settings.MIN_PASSWORD_LENGTH)

    @field_validator('new_password')
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < settings.MIN_PASSWORD_LENGTH:
            raise ValueError(f'Password must be at least {settings.MIN_PASSWORD_LENGTH} characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v

    @field_validator('security_answer')
    @classmethod
    def normalize_security_answer(cls, v: str) -> str:
        return v.lower().strip()


class MindMapBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    data: str  # JSON string


class MindMapCreate(MindMapBase):
    pass


class MindMapUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    data: Optional[str] = None


class MindMapResponse(MindMapBase):
    id: int
    user_id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True  # Pydantic v2 (was orm_mode in v1)
