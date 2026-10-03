from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, UserSettings, Habit, HabitLog, HealthMetric, JournalEntry, AIChatMessage
from app.schemas.schemas import AIChatRequest, AIChatResponse, AIWidgetTipResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Companion & Coaching"])


def get_today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


@router.post("/chat", response_model=AIChatResponse)
async def chat_with_ai(
    req: AIChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not req.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    today_str = get_today_str()
    
    # 1. Fetch user settings
    settings_res = await db.execute(select(UserSettings).where(UserSettings.user_id == user.id))
    user_settings = settings_res.scalar_one_or_none()
    
    # 2. Gather context: active habits and completion today
    habits_res = await db.execute(
        select(Habit).where(and_(Habit.user_id == user.id, Habit.is_archived == False))
    )
    habits = habits_res.scalars().all()
    for h in habits:
        log_res = await db.execute(
            select(HabitLog).where(and_(HabitLog.habit_id == h.id, HabitLog.log_date == today_str))
        )
        h.completed_today = log_res.scalar_one_or_none() is not None
        
    # 3. Gather health metrics
    metrics_res = await db.execute(
        select(HealthMetric).where(and_(HealthMetric.user_id == user.id, HealthMetric.date == today_str))
    )
    metrics = metrics_res.scalar_one_or_none()
    
    # 4. Gather recent mood
    journal_res = await db.execute(
        select(JournalEntry).where(JournalEntry.user_id == user.id).order_by(desc(JournalEntry.created_at)).limit(1)
    )
    recent_entry = journal_res.scalar_one_or_none()
    recent_mood = recent_entry.mood if recent_entry else "good"
    
    # 5. Generate AI response
    reply, model_used = await AIService.generate_response(
        user=user,
        user_settings=user_settings,
        message=req.message,
        habits=habits,
        metrics=metrics,
        recent_mood=recent_mood
    )
    
    # 6. Save message history
    user_msg = AIChatMessage(user_id=user.id, role="user", content=req.message)
    ai_msg = AIChatMessage(user_id=user.id, role="assistant", content=reply, model_used=model_used)
    db.add(user_msg)
    db.add(ai_msg)
    await db.commit()
    
    time_str = datetime.now().strftime("%I:%M %p").lstrip("0")
    return AIChatResponse(
        reply=reply,
        model_used=model_used,
        timestamp=time_str
    )


@router.get("/history")
async def get_chat_history(
    limit: int = 30,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(AIChatMessage)
        .where(AIChatMessage.user_id == user.id)
        .order_by(AIChatMessage.created_at.asc())
        .limit(limit)
    )
    messages = res.scalars().all()
    
    # If no history yet, return helpful onboarding message
    if not messages:
        return [
            {
                "id": "intro-1",
                "text": f"Hi {user.name}! I'm your AI Companion coach. How are you feeling today?",
                "isAI": True,
                "timestamp": "Now"
            }
        ]
        
    return [
        {
            "id": m.id,
            "text": m.content,
            "isAI": m.role == "assistant",
            "timestamp": m.created_at.strftime("%I:%M %p").lstrip("0") if m.created_at else "Now",
            "modelUsed": m.model_used
        }
        for m in messages
    ]


@router.get("/widget-tip", response_model=AIWidgetTipResponse)
async def get_widget_tip(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today_str = get_today_str()
    habits_res = await db.execute(
        select(Habit).where(and_(Habit.user_id == user.id, Habit.is_archived == False))
    )
    habits = habits_res.scalars().all()
    for h in habits:
        log_res = await db.execute(
            select(HabitLog).where(and_(HabitLog.habit_id == h.id, HabitLog.log_date == today_str))
        )
        h.completed_today = log_res.scalar_one_or_none() is not None
        
    metrics_res = await db.execute(
        select(HealthMetric).where(and_(HealthMetric.user_id == user.id, HealthMetric.date == today_str))
    )
    metrics = metrics_res.scalar_one_or_none()
    
    tip = await AIService.generate_widget_tip(user, habits, metrics)
    return AIWidgetTipResponse(message=tip, model_used="SelfTrack AI")
