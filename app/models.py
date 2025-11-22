from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    
    security_question = Column(String)
    security_answer_hash = Column(String)
    hint = Column(String)

    mindmaps = relationship("MindMap", back_populates="owner")

class MindMap(Base):
    __tablename__ = "mindmaps"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    data = Column(Text) # JSON string of the mind map data
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    owner = relationship("User", back_populates="mindmaps")
