from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..auth import get_current_active_user
from ..models import ContactCreate, ContactResponse, UserInDB
from ..repositories import ContactRepository

router = APIRouter()


# Success response model
class SuccessResponse:
    def __init__(self, message: str, success: bool = True):
        self.message = message
        self.success = success


@router.post("/")
async def create_contact_message(contact: ContactCreate):
    """Create a new contact message"""
    db_contact = await ContactRepository.create_contact(contact)
    return {"message": "Message sent successfully", "success": True}


@router.get("/", response_model=List[ContactResponse])
async def get_contact_messages(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Get contact messages (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view contact messages",
        )

    contacts = await ContactRepository.get_contacts(skip, limit)
    return [ContactResponse(**contact.dict()) for contact in contacts]


@router.put("/{contact_id}/mark-read")
async def mark_contact_as_read(
    contact_id: int,
    current_user: UserInDB = Depends(get_current_active_user),
):
    """Mark a contact message as read (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify contact messages",
        )

    contact = await ContactRepository.mark_contact_as_read(contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Contact message not found"
        )

    return {"message": "Contact message marked as read", "success": True}
