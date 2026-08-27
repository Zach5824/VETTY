from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class TrackCreate(BaseModel):
    title: str
    genre: str
    bpm: int
    musical_key: str
    technical_challenge: Optional[str] = None

class TrackResponse(TrackCreate):
    id: int
    user_id: int
    highlighted_mix_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ReplyCreate(BaseModel):
    content: str

class ReplyResponse(BaseModel):
    id: int
    track_id: int
    user_id: int
    content: str
    votes_count: int
    created_at: datetime

    class Config:
        from_attributes = True