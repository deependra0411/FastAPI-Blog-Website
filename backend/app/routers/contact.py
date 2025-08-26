from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc

from ..database import get_db
from ..models import User, Contact
from ..schemas import ContactCreate, ContactResponse, SuccessResponse
from ..auth import get_current_active_user

router = APIRouter()


@router.post("/", response_model=SuccessResponse)
async def create_contact_message(
    contact: ContactCreate,
    db: Session = Depends(get_db)
):
    """Create a new contact message"""
    db_contact = Contact(
        name=contact.name,
        email=contact.email,
        phone=contact.phone,
        message=contact.message
    )
    
    db.add(db_contact)
    db.commit()
    db.refresh(db_contact)
    
    return SuccessResponse(message="Message sent successfully")


@router.get("/", response_model=List[ContactResponse])
async def get_contact_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get contact messages (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view contact messages"
        )
    
    contacts = db.query(Contact)\
        .order_by(desc(Contact.created_at))\
        .offset(skip)\
        .limit(limit)\
        .all()
    
    return contacts


@router.put("/{contact_id}/mark-read", response_model=SuccessResponse)
async def mark_contact_as_read(
    contact_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Mark a contact message as read (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify contact messages"
        )
    
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact message not found"
        )
    
    contact.is_read = True
    db.commit()
    
    return SuccessResponse(message="Contact message marked as read")
