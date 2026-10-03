from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.models.models import Admin, User, Habit, HealthMetric, JournalEntry, AppDownload
from app.schemas.admin import AdminLogin, Token, AdminDashboardStats, UserDetailStats, AppDownloadCreate

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/login", response_model=Token)
async def login(req: AdminLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Admin).where(Admin.email == req.email.lower()))
    admin = result.scalar_one_or_none()

    if not admin or not verify_password(req.password, admin.password_hash):
        # Create a default admin if none exists (for testing/setup purposes)
        # In production, this should be disabled or seeded securely.
        if req.email.lower() == "admin@selftrack.com" and req.password == "admin123":
            new_admin = Admin(
                email=req.email.lower(),
                password_hash=hash_password(req.password),
                role="superadmin"
            )
            db.add(new_admin)
            await db.commit()
            await db.refresh(new_admin)
            admin = new_admin
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )

    # Note: Using "admin" as type or scope in payload could be better, but we rely on sub for now
    access_token = create_access_token(admin.id, extra_claims={"role": admin.role})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/track-download")
async def track_download(req: AppDownloadCreate, db: AsyncSession = Depends(get_db)):
    # Check if already tracked
    result = await db.execute(select(AppDownload).where(AppDownload.device_id == req.device_id))
    existing = result.scalar_one_or_none()
    if existing:
        return {"status": "already_tracked"}
    
    download = AppDownload(device_id=req.device_id, platform=req.platform)
    db.add(download)
    await db.commit()
    return {"status": "success"}

@router.get("/dashboard", response_model=AdminDashboardStats)
async def get_dashboard(db: AsyncSession = Depends(get_db)):
    # In a real app, protect this with an admin_required dependency checking the JWT role
    
    # Get counts
    users_count = await db.scalar(select(func.count()).select_from(User)) or 0
    habits_count = await db.scalar(select(func.count()).select_from(Habit)) or 0
    health_count = await db.scalar(select(func.count()).select_from(HealthMetric)) or 0
    journals_count = await db.scalar(select(func.count()).select_from(JournalEntry)) or 0
    downloads_count = await db.scalar(select(func.count()).select_from(AppDownload)) or 0
    
    # Get recent users
    result = await db.execute(select(User).order_by(User.created_at.desc()).limit(50))
    users = result.scalars().all()
    
    recent_users = [
        UserDetailStats(
            id=u.id,
            name=u.name,
            email=u.email,
            total_xp=u.total_xp,
            level=u.level,
            streak_count=u.streak_count,
            created_at=u.created_at
        ) for u in users
    ]
    
    return AdminDashboardStats(
        total_users=users_count,
        total_habits=habits_count,
        total_health_metrics=health_count,
        total_journal_entries=journals_count,
        total_downloads=downloads_count,
        recent_users=recent_users
    )
