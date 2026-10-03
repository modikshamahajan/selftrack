from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, SocialPost
from app.schemas.schemas import SocialPostCreate, SocialPostResponse

router = APIRouter(prefix="/social", tags=["Social Community"])

DEFAULT_POSTS = [
    {
        "user_name": "Sarah K.",
        "user_avatar": "👩",
        "content": "Just completed my 30-day meditation challenge! 🧘‍♀️ Feeling so much calmer and focused.",
        "achievement": "30 Day Warrior",
        "likes_count": 24,
        "comments_count": 8,
    },
    {
        "user_name": "Mike R.",
        "user_avatar": "👨",
        "content": "Hit 10,000 steps every day this week! 🚶‍♂️ The habit tracker really keeps me motivated.",
        "achievement": "",
        "likes_count": 18,
        "comments_count": 5,
    },
    {
        "user_name": "Emma L.",
        "user_avatar": "👩‍🦰",
        "content": "My sleep quality improved by 40% since I started tracking with SelfTrack. Highly recommend the bedtime routine feature!",
        "achievement": "Sleep Master",
        "likes_count": 32,
        "comments_count": 12,
    },
]


async def seed_posts_if_empty(db: AsyncSession, user_id: str):
    res = await db.execute(select(SocialPost))
    posts = res.scalars().all()
    if not posts:
        for p in DEFAULT_POSTS:
            post = SocialPost(user_id=user_id, **p)
            db.add(post)
        await db.commit()


@router.get("/feed", response_model=List[SocialPostResponse])
async def get_feed(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await seed_posts_if_empty(db, user.id)
    
    res = await db.execute(select(SocialPost).order_by(desc(SocialPost.created_at)))
    posts = res.scalars().all()
    
    return [
        SocialPostResponse(
            id=p.id,
            user_id=p.user_id,
            user=p.user_name,
            avatar=p.user_avatar,
            time="Just now" if (user.id == p.user_id) else "2h ago",
            content=p.content,
            achievement=p.achievement or "",
            image_url=p.image_url or "",
            hasImage=bool(p.image_url),
            likes=p.likes_count,
            comments=p.comments_count
        )
        for p in posts
    ]


@router.post("/posts", response_model=SocialPostResponse, status_code=status.HTTP_201_CREATED)
async def create_post(
    req: SocialPostCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    post = SocialPost(
        user_id=user.id,
        user_name=user.name,
        user_avatar="👤",
        content=req.content,
        achievement=req.achievement or "",
        image_url=req.image_url or "",
        likes_count=1,
        comments_count=0
    )
    db.add(post)
    user.total_xp = (user.total_xp or 0) + 15  # +15 XP for community sharing
    user.level = (user.total_xp // 1000) + 1
    
    await db.commit()
    await db.refresh(post)
    
    return SocialPostResponse(
        id=post.id,
        user_id=post.user_id,
        user=post.user_name,
        avatar=post.user_avatar,
        time="Just now",
        content=post.content,
        achievement=post.achievement,
        image_url=post.image_url,
        hasImage=bool(post.image_url),
        likes=post.likes_count,
        comments=post.comments_count
    )


@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    post.likes_count += 1
    await db.commit()
    return {"likes": post.likes_count}

@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")
    await db.delete(post)
    await db.commit()
    return {"message": "Post deleted successfully"}
