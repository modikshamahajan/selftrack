from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Notification
from app.schemas.schemas import NotificationResponse, NotificationCreate

router = APIRouter(prefix="/notifications", tags=["Notifications"])

DEFAULT_NOTIFS = [
    {"title": "Birthday Reminder", "message": "Mom's Birthday is coming up in 3 days! Plan gifts & warm wishes 🎂", "category": "birthday", "icon": "gift", "color": "#EC4899"},
    {"title": "Upcoming Meeting", "message": "Product Strategy & Roadmap Sync starts tomorrow at 02:30 PM 💼", "category": "meeting", "icon": "briefcase", "color": "#2563EB"},
    {"title": "Habit Reminder", "message": "Time for your evening meditation! Keep your streak alive 🔥", "category": "habit", "icon": "bell", "color": "#2ECC71"},
    {"title": "Anniversary Milestone", "message": "Happy 3rd Work Anniversary! Cheers to growth and resilience 💍✨", "category": "anniversary", "icon": "heart", "color": "#E11D48"},
    {"title": "Special Occasion", "message": "Annual Tech & Wellness Gala invitation is confirmed for next week 🎉", "category": "occasion", "icon": "star", "color": "#8B5CF6"},
    {"title": "AI Motivation", "message": "You're on fire! 3 more habits to complete today. You got this! 💪", "category": "ai", "icon": "cpu", "color": "#6C5CE7"},
    {"title": "Achievement Unlocked", "message": "You earned the '7 Day Streak' badge! +100 XP", "category": "achievement", "icon": "award", "color": "#F39C12"},
    {"title": "Health Alert", "message": "You haven't logged your water intake today. Stay hydrated!", "category": "health", "icon": "heart", "color": "#E74C3C"},
    {"title": "Social Update", "message": "Sarah completed a 30-day challenge! Send her kudos 🎉", "category": "social", "icon": "users", "color": "#00B4D8"},
]


async def seed_notifs_if_empty(db: AsyncSession, user_id: str):
    res = await db.execute(select(Notification).where(Notification.user_id == user_id))
    notifs = res.scalars().all()
    if not notifs:
        for n in DEFAULT_NOTIFS:
            notif = Notification(user_id=user_id, **n)
            db.add(notif)
        await db.commit()


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await seed_notifs_if_empty(db, user.id)
    
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

