from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, FAQ
from ..schemas import UserResponse, FAQCreate, FAQResponse
from ..auth import require_admin

router = APIRouter(prefix="/admin", tags=["Admin Services"])

@router.get("/users", response_model=List[UserResponse])
def list_all_users(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(User).all()

@router.post("/faqs", response_model=FAQResponse, status_code=status.HTTP_201_CREATED)
def create_faq(faq_in: FAQCreate, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    faq = FAQ(
        category=faq_in.category,
        question=faq_in.question,
        answer=faq_in.answer,
        created_by=admin.id
    )
    db.add(faq)
    db.commit()
    db.refresh(faq)
    return faq