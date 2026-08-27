from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from .database import Base

class Track(Base):
    __tablename__ = "tracks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(150), nullable=False)
    genre = Column(String(50), nullable=False, index=True)
    bpm = Column(Integer, nullable=False, index=True)
    musical_key = Column(String(20), nullable=False, index=True)
    technical_challenge = Column(Text, nullable=True)
    highlighted_mix_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="tracks")
    versions = relationship("TrackVersion", back_populates="track", cascade="all, delete-orphan")
    replies = relationship("Reply", back_populates="track", cascade="all, delete-orphan")

class TrackVersion(Base):
    __tablename__ = "track_versions"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    version_name = Column(String(100), nullable=False) # e.g. "Mix v1", "Vocal Stem"
    file_url = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    track = relationship("Track", back_populates="versions")

class Reply(Base):
    __tablename__ = "replies"

    id = Column(Integer, primary_key=True, index=True)
    track_id = Column(Integer, ForeignKey("tracks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    votes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    track = relationship("Track", back_populates="replies")