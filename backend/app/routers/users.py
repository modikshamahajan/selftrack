from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, UserSettings
from app.schemas.schemas import UserSettingsUpdate, UserSettingsResponse, UserResponse, UserProfileUpdate

router = APIRouter(prefix="/users", tags=["Users & Settings"])


@router.get("/settings", response_model=UserSettingsResponse)
async def get_settings(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.put("/settings", response_model=UserSettingsResponse)
async def update_settings(
    req: UserSettingsUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = UserSettings(user_id=user.id)
        db.add(settings)
        
    update_data = req.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(settings, key, value)
        
    await db.commit()
    await db.refresh(settings)
    return settings


@router.put("/profile", response_model=UserResponse)
async def update_profile(
    req: UserProfileUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if req.name is not None:
        user.name = req.name
    if req.avatar_url is not None:
        user.avatar_url = req.avatar_url
        
    await db.commit()
    await db.refresh(user)
    
    import json
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url or "",
        total_xp=user.total_xp,
        level=user.level,
        streak_count=user.streak_count,
        interests=json.loads(user.interests) if user.interests else [],
        goals=json.loads(user.goals) if user.goals else [],
        created_at=user.created_at
    )


@router.get("/me/export")
async def export_my_data(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Google Play & GDPR Compliance: Full personal data export in JSON format."""
    import json
    from app.models.models import Habit, HealthMetric, JournalEntry, UserBadge
    
    habits_res = await db.execute(select(Habit).where(Habit.user_id == user.id))
    habits = habits_res.scalars().all()
    
    health_res = await db.execute(select(HealthMetric).where(HealthMetric.user_id == user.id))
    metrics = health_res.scalars().all()
    
    journal_res = await db.execute(select(JournalEntry).where(JournalEntry.user_id == user.id))
    journals = journal_res.scalars().all()
    
    badges_res = await db.execute(select(UserBadge).where(UserBadge.user_id == user.id))
    badges = badges_res.scalars().all()
    
    return {
        "profile": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "total_xp": user.total_xp,
            "level": user.level,
            "streak_count": user.streak_count,
            "interests": json.loads(user.interests) if user.interests else [],
            "goals": json.loads(user.goals) if user.goals else [],
        },
        "habits": [
            {
                "id": h.id,
                "name": h.name,
                "icon": h.icon,
                "category": h.category,
                "current_streak": h.current_streak,
                "best_streak": h.best_streak,
            }
            for h in habits
        ],
        "health_metrics": [
            {
                "date": m.date,
                "steps": m.steps,
                "water_glasses": m.water_glasses,
                "sleep_hours": m.sleep_hours,
                "calories_burned": m.calories_burned,
                "distance_km": m.distance_km,
            }
            for m in metrics
        ],
        "journal_entries": [
            {
                "id": j.id,
                "title": j.title,
                "content": j.content,
                "mood": j.mood,
                "created_at": j.created_at.isoformat() if j.created_at else None,
            }
            for j in journals
        ],
        "badges": [
            {
                "badge_id": b.badge_id,
                "unlocked_at": b.unlocked_at.isoformat() if b.unlocked_at else None,
            }
            for b in badges
        ]
    }


@router.delete("/me")
async def delete_my_account(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Google Play Compliance: Permanent deletion of user account and all personal data."""
    await db.delete(user)
    await db.commit()
    return {"status": "success", "message": "Account and all associated personal data permanently deleted."}

