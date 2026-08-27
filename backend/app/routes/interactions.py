from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..models_domain import Track, Reply
from ..schemas_domain import ReplyCreate, ReplyResponse
from ..auth import get_current_user

router = APIRouter(prefix="/tracks/{track_id}", tags=["Replies & Voting"])

@router.post("/replies", response_model=ReplyResponse, status_code=status.HTTP_201_CREATED)
def add_reply(
    track_id: int, 
    reply_in: ReplyCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    track = db.query(Track).filter(Track.id == track_id).first()
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    reply = Reply(
        track_id=track_id,
        user_id=current_user.id,
        content=reply_in.content
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return reply

@router.get("/replies", response_model=List[ReplyResponse])
def get_replies(track_id: int, db: Session = Depends(get_db)):
    return db.query(Reply).filter(Reply.track_id == track_id).all()

@router.post("/replies/{reply_id}/vote", response_model=ReplyResponse)
def vote_reply(
    track_id: int, 
    reply_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    reply = db.query(Reply).filter(Reply.id == reply_id, Reply.track_id == track_id).first()
    if not reply:
        raise HTTPException(status_code=404, detail="Reply not found")

    reply.votes_count += 1
    db.commit()
    db.refresh(reply)
    return reply