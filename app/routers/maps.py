from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, database, auth, schemas
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/maps",
    tags=["maps"]
)

@router.get("/", response_model=List[schemas.MindMapResponse])
def get_maps(db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        maps = db.query(models.MindMap).filter(models.MindMap.user_id == current_user.id).all()
        return maps
    except Exception as e:
        logger.error(f"Error fetching maps for user {current_user.email}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching mind maps")

@router.post("/", response_model=schemas.MindMapResponse)
def create_map(map: schemas.MindMapCreate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        # Validate JSON structure
        try:
            json.loads(map.data)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON data for mind map")

        new_map = models.MindMap(**map.model_dump(), user_id=current_user.id)
        db.add(new_map)
        db.commit()
        db.refresh(new_map)

        logger.info(f"Created new mind map '{map.title}' for user {current_user.email}")
        return new_map
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating map: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error creating mind map")

@router.get("/{map_id}", response_model=schemas.MindMapResponse)
def get_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        map_item = db.query(models.MindMap).filter(
            models.MindMap.id == map_id,
            models.MindMap.user_id == current_user.id
        ).first()
        if not map_item:
            raise HTTPException(status_code=404, detail="Mind Map not found")
        return map_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching map {map_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching mind map")

@router.put("/{map_id}", response_model=schemas.MindMapResponse)
def update_map(map_id: int, map_update: schemas.MindMapUpdate, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        map_item = db.query(models.MindMap).filter(
            models.MindMap.id == map_id,
            models.MindMap.user_id == current_user.id
        ).first()
        if not map_item:
            raise HTTPException(status_code=404, detail="Mind Map not found")

        # Validate JSON if data is being updated
        if map_update.data is not None:
            try:
                json.loads(map_update.data)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid JSON data for mind map")
            map_item.data = map_update.data

        if map_update.title is not None:
            map_item.title = map_update.title

        db.commit()
        db.refresh(map_item)

        logger.info(f"Updated mind map {map_id} for user {current_user.email}")
        return map_item
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating map {map_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating mind map")

@router.delete("/{map_id}")
def delete_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        map_item = db.query(models.MindMap).filter(
            models.MindMap.id == map_id,
            models.MindMap.user_id == current_user.id
        ).first()
        if not map_item:
            raise HTTPException(status_code=404, detail="Mind Map not found")

        db.delete(map_item)
        db.commit()

        logger.info(f"Deleted mind map {map_id} for user {current_user.email}")
        return {"message": "Mind Map deleted"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting map {map_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting mind map")

@router.post("/{map_id}/copy", response_model=schemas.MindMapResponse)
def copy_map(map_id: int, db: Session = Depends(database.get_db), current_user: models.User = Depends(auth.get_current_user)):
    try:
        original_map = db.query(models.MindMap).filter(
            models.MindMap.id == map_id,
            models.MindMap.user_id == current_user.id
        ).first()
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

        logger.info(f"Copied mind map {map_id} to {new_map.id} for user {current_user.email}")
        return new_map
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error copying map {map_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error copying mind map")
