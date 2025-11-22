from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from .. import models, database, auth
from pydantic import BaseModel

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

class UserCreate(BaseModel):
    email: str
    password: str
    security_question: str
    security_answer: str
    hint: str

class PasswordReset(BaseModel):
    email: str
    security_answer: str
    new_password: str

@router.post("/signup")
def signup(user: UserCreate, db: Session = Depends(database.get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    # Hash the security answer as well (using same hash function for simplicity/security)
    hashed_answer = auth.get_password_hash(user.security_answer.lower().strip())
    
    new_user = models.User(
        email=user.email, 
        hashed_password=hashed_password,
        security_question=user.security_question,
        security_answer_hash=hashed_answer,
        hint=user.hint
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully"}

@router.get("/check-email/{email}")
def check_email(email: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    return {"exists": user is not None}

@router.get("/security-question/{email}")
def get_security_question(email: str, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "question": user.security_question,
        "hint": user.hint
    }

@router.post("/reset-password")
def reset_password(reset_data: PasswordReset, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == reset_data.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Verify answer
    if not auth.verify_password(reset_data.security_answer.lower().strip(), user.security_answer_hash):
        raise HTTPException(status_code=400, detail="Incorrect security answer")
        
    # Update password
    user.hashed_password = auth.get_password_hash(reset_data.new_password)
    db.commit()
    
    return {"message": "Password reset successfully"}

@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}
