from pydantic import BaseModel, EmailStr, field_validator, Field
from typing import Optional
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
    @field_validator('data')
    @classmethod
    def validate_mindmap_data(cls, v: str) -> str:
        """Validate mind map data structure."""
        import json
        try:
            data = json.loads(v)
            # Recursively validate all node descriptions
            cls._validate_node_descriptions(data)
            return v
        except json.JSONDecodeError:
            raise ValueError('Invalid JSON format')
        except ValueError as e:
            raise ValueError(str(e))
    
    @staticmethod
    def _validate_node_descriptions(node: dict, max_length: int = 5000):
        """Recursively validate node descriptions."""
        if 'description' in node and node['description']:
            desc = node['description']
            if len(desc) > max_length:
                raise ValueError(f"Node description exceeds {max_length} characters")
        
        # Recursively check children
        if 'children' in node and isinstance(node['children'], list):
            for child in node['children']:
                MindMapCreate._validate_node_descriptions(child, max_length)


class MindMapUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    data: Optional[str] = None
    
    @field_validator('data')
    @classmethod
    def validate_mindmap_data(cls, v: Optional[str]) -> Optional[str]:
        """Validate mind map data structure."""
        if v is None:
            return v
        
        import json
        try:
            data = json.loads(v)
            # Recursively validate all node descriptions
            MindMapCreate._validate_node_descriptions(data)
            return v
        except json.JSONDecodeError:
            raise ValueError('Invalid JSON format')
        except ValueError as e:
            raise ValueError(str(e))


class MindMapResponse(MindMapBase):
    id: int
    user_id: int

    class Config:
        from_attributes = True  # Pydantic v2 (was orm_mode in v1)
