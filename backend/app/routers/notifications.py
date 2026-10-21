from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Notification
from app.schemas.schemas import NotificationResponse, NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

from pydantic import BaseModel
from app.services.sms import dispatch_cellular_sms

class SendSmsNotificationRequest(BaseModel):
    phone: str
    message: str

@router.get("", response_model=List[NotificationResponse])
async def get_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    
    res = await db.execute(
        select(Notification).where(Notification.user_id == user.id).order_by(desc(Notification.created_at))
    )
    notifs = res.scalars().all()
    
    return [
        NotificationResponse(
            id=n.id,
            title=n.title,
            message=n.message,
            category=n.category,
            icon=n.icon,
            color=n.color,
            time="5 min ago" if not n.is_read else "2h ago",
            read=n.is_read
        )
        for n in notifs
    ]


@router.patch("/{notif_id}/read")
async def mark_notification_read(
    notif_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(Notification).where(Notification.id == notif_id, Notification.user_id == user.id)
    )
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
        
    notif.is_read = True
    await db.commit()
    return {"message": "Marked as read"}


@router.post("/mark-all-read")
async def mark_all_read(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(
        select(Notification).where(Notification.user_id == user.id)
    )
    for n in res.scalars().all():
        n.is_read = True
    await db.commit()
    return {"message": "All notifications marked as read"}


@router.post("", response_model=NotificationResponse)
async def create_notification(
    req: NotificationCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    notif = Notification(
        user_id=user.id,
        title=req.title,
        message=req.message,
        category=req.category,
        icon=req.icon,
        color=req.color,
    )
    db.add(notif)
    await db.commit()
    await db.refresh(notif)
    return NotificationResponse(
        id=notif.id,
        title=notif.title,
        message=notif.message,
        category=notif.category,
        icon=notif.icon,
        color=notif.color,
        time="Just now",
        read=notif.is_read
    )


@router.post("/send-sms")
async def send_notification_sms(
    req: SendSmsNotificationRequest,
    user: User = Depends(get_current_user)
):
    """
    Dispatches a realtime SMS alert to a mobile number via cellular SMS gateway
    (Twilio, Fast2SMS, or MSG91).
    """
    success, msg, provider = await dispatch_cellular_sms(req.phone, req.message)
    return {
        "status": "success" if success else "fallback",
        "message": msg,
        "provider": provider,
        "sms_sent": success,
        "phone": req.phone
    }


