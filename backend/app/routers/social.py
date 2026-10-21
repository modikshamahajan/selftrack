from typing import List, Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, SocialPost, SocialComment
from app.schemas.schemas import SocialPostCreate, SocialPostResponse, SocialCommentCreate, SocialCommentResponse

router = APIRouter(prefix="/social", tags=["Social Community"])


@router.get("/feed", response_model=List[SocialPostResponse])
async def get_feed(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    
    res = await db.execute(
        select(SocialPost)
        .options(selectinload(SocialPost.comments))
        .order_by(desc(SocialPost.created_at))
    )
    posts = res.scalars().all()
    
    feed = []
    drift_detected = False
    for p in posts:
        c_list = [
            SocialCommentResponse(
                id=c.id,
                user=c.user_name,
                text=c.text,
                time=c.created_at.strftime("%I:%M %p") if c.created_at else "Just now"
            )
            for c in (p.comments or [])
        ]
        # Guarantee comments count matches real comments length
        real_count = len(c_list)
        if p.comments_count != real_count:
            p.comments_count = real_count
            db.add(p)
            drift_detected = True

        feed.append(
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
                comments=real_count,
                commentsList=c_list
            )
        )
    if drift_detected:
        await db.commit()
    return feed


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
        likes_count=0,
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
        comments=0,
        commentsList=[]
    )


@router.post("/posts/{post_id}/comments", response_model=SocialCommentResponse, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: str,
    req: SocialCommentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(
        select(SocialPost)
        .options(selectinload(SocialPost.comments))
        .where(SocialPost.id == post_id)
    )
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    comment = SocialComment(
        post_id=post.id,
        user_id=user.id,
        user_name=user.name,
        text=req.text
    )
    db.add(comment)
    post.comments_count = len(post.comments or []) + 1
    user.total_xp = (user.total_xp or 0) + 5  # +5 XP for engaging
    user.level = (user.total_xp // 1000) + 1
    
    await db.commit()
    await db.refresh(comment)
    
    return SocialCommentResponse(
        id=comment.id,
        user=comment.user_name,
        text=comment.text,
        time="Just now"
    )


class LikeActionRequest(BaseModel):
    action: Optional[str] = "like"


@router.post("/posts/{post_id}/like")
async def toggle_like(
    post_id: str,
    req: Optional[LikeActionRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.execute(select(SocialPost).where(SocialPost.id == post_id))
    post = res.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    if req and req.action == "unlike":
        post.likes_count = max(0, (post.likes_count or 0) - 1)
    else:
        post.likes_count = (post.likes_count or 0) + 1
        
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
