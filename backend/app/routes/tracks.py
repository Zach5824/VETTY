from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..models_domain import Track
from ..schemas_domain import TrackCreate, TrackResponse
from ..auth import get_current_user

router = APIRouter(prefix="/tracks", tags=["Tracks & Catalog"])

@router.post("/", response_model=TrackResponse, status_code=status.HTTP_201_CREATED)
def create_track(
    track_in: TrackCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    new_track = Track(
        user_id=current_user.id,
        title=track_in.title,
        genre=track_in.genre,
        bpm=track_in.bpm,
        musical_key=track_in.musical_key,
        technical_challenge=track_in.technical_challenge,
    )
    db.add(new_track)
    db.commit()
    db.refresh(new_track)
    return new_track

@router.get("/", response_model=List[TrackResponse])
def list_tracks(
    genre: Optional[str] = None,
    bpm: Optional[int] = None,
    musical_key: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Track)
    if genre:
        query = query.filter(Track.genre.ilike(f"%{genre}%"))
    if bpm:
        query = query.filter(Track.bpm == bpm)
    if musical_key:
        query = query.filter(Track.musical_key == musical_key)
    return query.all()

@router.get("/{track_id}", response_model=TrackResponse)
def get_track(track_id: int, db: Session = Depends(get_db)):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track