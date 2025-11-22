from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import models, database, auth
import json

router = APIRouter(
    prefix="/api/maps",
    tags=["maps"]
)

class MindMapBase(BaseModel):
    title: str
    data: str # JSON string

class MindMapCreate(MindMapBase):
    pass

class MindMapUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[str] = None

class MindMapResponse(MindMapBase):
    id: int
    user_id: int
    
    class Config:
        orm_mode = True

@router.get("/", response_model=List[MindMapResponse])
def get_maps(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.MindMap).filter(models.MindMap.user_id == current_user.id).all()

@router.post("/", response_model=MindMapResponse)
def create_map(map: MindMapCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    new_map = models.MindMap(**map.dict(), user_id=current_user.id)
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return new_map

@router.get("/{map_id}", response_model=MindMapResponse)
def get_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    map_item = db.query(models.MindMap).filter(models.MindMap.id == map_id, models.MindMap.user_id == current_user.id).first()
    if not map_item:
        raise HTTPException(status_code=404, detail="Mind Map not found")
    return map_item

@router.put("/{map_id}", response_model=MindMapResponse)
def update_map(map_id: int, map_update: MindMapUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    map_item = db.query(models.MindMap).filter(models.MindMap.id == map_id, models.MindMap.user_id == current_user.id).first()
    if not map_item:
        raise HTTPException(status_code=404, detail="Mind Map not found")
    
    if map_update.title is not None:
        map_item.title = map_update.title
    if map_update.data is not None:
        map_item.data = map_update.data
        
    db.commit()
    db.refresh(map_item)
    return map_item

@router.delete("/{map_id}")
def delete_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    map_item = db.query(models.MindMap).filter(models.MindMap.id == map_id, models.MindMap.user_id == current_user.id).first()
    if not map_item:
        raise HTTPException(status_code=404, detail="Mind Map not found")
    
    db.delete(map_item)
    db.commit()
    return {"message": "Mind Map deleted"}

@router.post("/{map_id}/copy", response_model=MindMapResponse)
def copy_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    original_map = db.query(models.MindMap).filter(models.MindMap.id == map_id, models.MindMap.user_id == current_user.id).first()
    if not original_map:
        raise HTTPException(status_code=404, detail="Mind Map not found")
    
    new_title = f"copy-{original_map.title}"
    new_map = models.MindMap(
        title=new_title,
        data=original_map.data,
        user_id=current_user.id
    )
    db.add(new_map)
    db.commit()
    db.refresh(new_map)
    return new_map
