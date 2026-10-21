from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Habit, HabitLog
from app.schemas.schemas import HabitCreate, HabitUpdate, HabitToggleRequest, HabitResponse

router = APIRouter(prefix="/habits", tags=["Habits"])


def get_today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


@router.get("", response_model=List[HabitResponse])
async def get_habits(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Habit).where(and_(Habit.user_id == user.id, Habit.is_archived == False))
    )
    habits = result.scalars().all()
    today_str = get_today_str()
    
    # High-Performance Batch Optimization: Fetch all habit logs in 1 query instead of N queries
    habit_ids = [h.id for h in habits]
    logs_by_habit = {}
    if habit_ids:
        logs_res = await db.execute(
            select(HabitLog).where(HabitLog.habit_id.in_(habit_ids))
        )
        for log in logs_res.scalars().all():
            logs_by_habit.setdefault(log.habit_id, []).append(log)

    response = []
    for h in habits:
        logs = logs_by_habit.get(h.id, [])
        completed_days = {log.log_date: log.completed for log in logs if log.completed}
        completed_today = completed_days.get(today_str, False)
        
        response.append(
            HabitResponse(
                id=h.id,
                name=h.name,
                icon=h.icon,
                color=h.color,
                category=h.category,
                streak_target=h.streak_target,
                current_streak=h.current_streak,
                completed=completed_today,
                completed_days=completed_days
            )
        )
    return response


@router.post("", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
async def create_habit(
    req: HabitCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    habit = Habit(
        user_id=user.id,
        name=req.name,
        icon=req.icon,
        color=req.color,
        category=req.category,
        streak_target=req.streak_target,
        current_streak=0,
    )
    db.add(habit)
    user.total_xp = (user.total_xp or 0) + 20  # +20 XP for creating a habit
    user.level = ((user.total_xp or 0) // 1000) + 1
    
    await db.commit()
    await db.refresh(habit)
    
    return HabitResponse(
        id=habit.id,
        name=habit.name,
        icon=habit.icon,
        color=habit.color,
        category=habit.category,
        streak_target=habit.streak_target,
        current_streak=habit.current_streak,
        completed=False,
        completed_days={}
    )


@router.put("/{habit_id}", response_model=HabitResponse)
async def update_habit(
    habit_id: str,
    req: HabitUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Habit).where(and_(Habit.id == habit_id, Habit.user_id == user.id))
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    update_data = req.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(habit, k, v)
        
    await db.commit()
    await db.refresh(habit)
    
    today_str = get_today_str()
    logs_res = await db.execute(select(HabitLog).where(HabitLog.habit_id == habit.id))
    logs = logs_res.scalars().all()
    completed_days = {log.log_date: log.completed for log in logs if log.completed}
    
    return HabitResponse(
        id=habit.id,
        name=habit.name,
        icon=habit.icon,
        color=habit.color,
        category=habit.category,
        streak_target=habit.streak_target,
        current_streak=habit.current_streak,
        completed=completed_days.get(today_str, False),
        completed_days=completed_days
    )


@router.delete("/{habit_id}")
async def delete_habit(
    habit_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Habit).where(and_(Habit.id == habit_id, Habit.user_id == user.id))
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    await db.delete(habit)
    await db.commit()
    return {"message": "Habit deleted successfully"}


@router.post("/{habit_id}/toggle", response_model=HabitResponse)
async def toggle_habit(
    habit_id: str,
    req: HabitToggleRequest = HabitToggleRequest(),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Habit).where(and_(Habit.id == habit_id, Habit.user_id == user.id))
    )
    habit = result.scalar_one_or_none()
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
        
    target_date = req.date or get_today_str()
    
    # Check if a log exists for this date
    log_res = await db.execute(
        select(HabitLog).where(
            and_(HabitLog.habit_id == habit.id, HabitLog.log_date == target_date)
        )
    )
    existing_log = log_res.scalar_one_or_none()
    
    if existing_log:
        # Toggle off
        await db.delete(existing_log)
        habit.current_streak = max(0, habit.current_streak - 1)
        user.total_xp = max(0, user.total_xp - 20)
    else:
        # Toggle on
        new_log = HabitLog(habit_id=habit.id, user_id=user.id, log_date=target_date, completed=True)
        db.add(new_log)
        habit.current_streak += 1
        if habit.current_streak > habit.best_streak:
            habit.best_streak = habit.current_streak
            
        user.total_xp = (user.total_xp or 0) + 20  # +20 XP awarded
        user.level = (user.total_xp // 1000) + 1
        
    # Recalculate user's global streak_count across all active habits
    all_habits_res = await db.execute(
        select(Habit.current_streak).where(and_(Habit.user_id == user.id, Habit.is_archived == False))
    )
    streaks = all_habits_res.scalars().all()
    user.streak_count = max(streaks) if streaks else 0

    await db.commit()
    await db.refresh(habit)
    
    # Reload completed days
    logs_res = await db.execute(select(HabitLog).where(HabitLog.habit_id == habit.id))
    logs = logs_res.scalars().all()
    completed_days = {log.log_date: log.completed for log in logs if log.completed}
    
    return HabitResponse(
        id=habit.id,
        name=habit.name,
        icon=habit.icon,
        color=habit.color,
        category=habit.category,
        streak_target=habit.streak_target,
        current_streak=habit.current_streak,
        completed=completed_days.get(get_today_str(), False),
        completed_days=completed_days
    )
