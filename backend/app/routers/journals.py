import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, JournalEntry
from app.schemas.schemas import JournalCreate, JournalUpdate, JournalResponse

router = APIRouter(prefix="/journals", tags=["Journals & Mood"])


@router.get("", response_model=List[JournalResponse])
async def get_journals(
    date: Optional[str] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(JournalEntry).where(JournalEntry.user_id == user.id)
    if date:
        query = query.where(JournalEntry.date == date)
    query = query.order_by(desc(JournalEntry.created_at))
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    response = []
    for e in entries:
        imgs = json.loads(e.images) if e.images else []
        response.append(
            JournalResponse(
                id=e.id,
                date=e.date,
                title=e.title,
                content=e.content,
                mood=e.mood,
                mood_score=e.mood_score,
                images=imgs,
                has_voice=e.has_voice,
                voice_url=e.voice_url or "",
                created_at=e.created_at
            )
        )
    return response


@router.post("", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
async def create_journal(
    req: JournalCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    today_str = req.date or datetime.now().strftime("%Y-%m-%d")
    
    entry = JournalEntry(
        user_id=user.id,
        date=today_str,
        title=req.title,
        content=req.content,
        mood=req.mood,
        mood_score=req.mood_score,
        images=json.dumps(req.images or []),
        has_voice=req.has_voice,
        voice_url=req.voice_url or ""
    )
    db.add(entry)
    
    # Award XP for mindful journaling
    user.total_xp = (user.total_xp or 0) + 30
    user.level = (user.total_xp // 1000) + 1
    
    await db.commit()
    await db.refresh(entry)
    
    return JournalResponse(
        id=entry.id,
        date=entry.date,
        title=entry.title,
        content=entry.content,
        mood=entry.mood,
        mood_score=entry.mood_score,
        images=req.images or [],
        has_voice=entry.has_voice,
        voice_url=entry.voice_url or "",
        created_at=entry.created_at
    )


@router.put("/{entry_id}", response_model=JournalResponse)
async def update_journal(
    entry_id: str,
    req: JournalUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(JournalEntry).where(and_(JournalEntry.id == entry_id, JournalEntry.user_id == user.id))
    )
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
        
    if req.title is not None:
        entry.title = req.title
    if req.content is not None:
        entry.content = req.content
    if req.mood is not None:
        entry.mood = req.mood
    if req.mood_score is not None:
        entry.mood_score = req.mood_score
    if req.images is not None:
        entry.images = json.dumps(req.images)
    if req.has_voice is not None:
        entry.has_voice = req.has_voice
    if req.voice_url is not None:
        entry.voice_url = req.voice_url

    await db.commit()
    await db.refresh(entry)

    imgs = json.loads(entry.images) if entry.images else []
    return JournalResponse(
        id=entry.id,
        date=entry.date,
        title=entry.title,
        content=entry.content,
        mood=entry.mood,
        mood_score=entry.mood_score,
        images=imgs,
        has_voice=entry.has_voice,
        voice_url=entry.voice_url or "",
        created_at=entry.created_at
    )


@router.delete("/{entry_id}")
async def delete_journal(
    entry_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(JournalEntry).where(and_(JournalEntry.id == entry_id, JournalEntry.user_id == user.id))
    )
    entry = res.scalar_one_or_none()
    if not entry:
        raise HTTPException(status_code=404, detail="Journal entry not found")
        
    await db.delete(entry)
    await db.commit()
    return {"message": "Journal entry deleted successfully"}
