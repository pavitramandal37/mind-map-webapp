from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from .. import models, database, auth, schemas
from ..core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)

@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(database.get_db)):
    try:
        # Check if user already exists
        db_user = db.query(models.User).filter(models.User.email == user.email).first()
        if db_user:
            logger.warning(f"Signup attempt with existing email: {user.email}")
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password and security answer
        hashed_password = auth.get_password_hash(user.password)
        hashed_answer = auth.get_password_hash(user.security_answer)

        # Create new user
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

        logger.info(f"New user registered: {user.email}")
        return {"message": "User created successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during signup: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="An error occurred during signup")

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
def reset_password(reset_data: schemas.PasswordReset, db: Session = Depends(database.get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == reset_data.email).first()
        if not user:
            # Don't reveal if user exists or not (security best practice)
            logger.warning(f"Password reset attempt for non-existent user: {reset_data.email}")
            raise HTTPException(status_code=400, detail="Invalid email or security answer")

        # Verify security answer
        if not auth.verify_password(reset_data.security_answer, user.security_answer_hash):
            logger.warning(f"Failed password reset attempt for: {reset_data.email}")
            raise HTTPException(status_code=400, detail="Invalid email or security answer")

        # Update password
        user.hashed_password = auth.get_password_hash(reset_data.new_password)
        db.commit()

        logger.info(f"Password reset successful for: {reset_data.email}")
        return {"message": "Password reset successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during password reset: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="An error occurred during password reset")

@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == form_data.username).first()
        if not user or not auth.verify_password(form_data.password, user.hashed_password):
            logger.warning(f"Failed login attempt for: {form_data.username}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )

        logger.info(f"Successful login for: {user.email}")
        return {"access_token": access_token, "token_type": "bearer"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="An error occurred during login")
