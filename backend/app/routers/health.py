from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, HealthMetric, FoodLog
from app.schemas.schemas import HealthSyncRequest, HealthMetricResponse, FoodLogCreate, FoodLogResponse

router = APIRouter(prefix="/health", tags=["Health & Nutrition"])


def get_today_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


async def get_or_create_metric(db: AsyncSession, user_id: str, date_str: str) -> HealthMetric:
    res = await db.execute(
        select(HealthMetric).where(
            and_(HealthMetric.user_id == user_id, HealthMetric.date == date_str)
        )
    )
    metric = res.scalar_one_or_none()
    if not metric:
        metric = HealthMetric(
            user_id=user_id,
            date=date_str,
            steps=0,
            step_goal=10000,
            water_glasses=0,
            water_goal=8,
            sleep_hours=7.5,
            sleep_quality=80,
            calories_burned=0,
            distance_km=0.0
        )
        db.add(metric)
        await db.flush()
    return metric


@router.get("/metrics", response_model=HealthMetricResponse)
async def get_health_metrics(
    date: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = date or get_today_str()
    metric = await get_or_create_metric(db, user.id, target_date)
    return metric


@router.post("/sync", response_model=HealthMetricResponse)
async def sync_health(
    req: HealthSyncRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = req.date or get_today_str()
    metric = await get_or_create_metric(db, user.id, target_date)
    
    update_data = req.model_dump(exclude_unset=True, exclude={"date"})
    for k, v in update_data.items():
        if v is not None:
            if k == "water_glasses":
                v = max(0, min(20, int(v)))
            elif k == "water_goal":
                v = max(1, min(20, int(v)))
            setattr(metric, k, v)
            
    await db.commit()
    await db.refresh(metric)
    return metric


@router.post("/water", response_model=HealthMetricResponse)
async def update_water(
    delta: int = 1,
    date: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = date or get_today_str()
    metric = await get_or_create_metric(db, user.id, target_date)
    metric.water_glasses = max(0, min(20, metric.water_glasses + delta))
    
    # Award XP if goal reached
    if metric.water_glasses == metric.water_goal:
        user.total_xp = (user.total_xp or 0) + 15
        user.level = (user.total_xp // 1000) + 1
        
    await db.commit()
    await db.refresh(metric)
    return metric


@router.get("/food", response_model=List[FoodLogResponse])
async def get_food_logs(
    date: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = date or get_today_str()
    res = await db.execute(
        select(FoodLog).where(
            and_(FoodLog.user_id == user.id, FoodLog.date == target_date)
        )
    )
    return res.scalars().all()


@router.post("/food", response_model=FoodLogResponse)
async def create_food_log(
    req: FoodLogCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    target_date = req.date or get_today_str()
    food = FoodLog(
        user_id=user.id,
        date=target_date,
        name=req.name,
        qty=req.qty,
        calories=req.calories,
        serving=req.serving,
        category=req.category,
        image_url=req.image_url
    )
    db.add(food)
    user.total_xp = (user.total_xp or 0) + 10
    user.level = (user.total_xp // 1000) + 1
    
    await db.commit()
    await db.refresh(food)
    return food


@router.delete("/food/{food_id}")
async def delete_food_log(
    food_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(FoodLog).where(and_(FoodLog.id == food_id, FoodLog.user_id == user.id))
    )
    food = res.scalar_one_or_none()
    if not food:
        raise HTTPException(status_code=404, detail="Food log not found")
    await db.delete(food)
    await db.commit()
    return {"message": "Food log deleted successfully"}


@router.get("/trends")
async def get_health_trends(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Returns 7-day steps trend data for the Bezier line chart in HealthTrackingScreen."""
    today = datetime.now()
    labels = []
    steps_data = []
    
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        labels.append(day.strftime("%a"))
        
        res = await db.execute(
            select(HealthMetric.steps).where(
                and_(HealthMetric.user_id == user.id, HealthMetric.date == day_str)
            )
        )
        steps_val = res.scalar_one_or_none()
        steps_data.append(steps_val or 0)
        
    return {
        "labels": labels,
        "datasets": [{"data": steps_data}]
    }
