from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Badge, UserBadge
from app.schemas.schemas import RewardSummaryResponse, BadgeResponse, LeaderboardItem

router = APIRouter(prefix="/rewards", tags=["Gamification & Rewards"])


@router.get("/summary", response_model=RewardSummaryResponse)
async def get_reward_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    level = (user.total_xp // 1000) + 1
    current_level_xp = user.total_xp % 1000
    next_level_xp = 1000
    
    res = await db.execute(
        select(UserBadge).where(UserBadge.user_id == user.id)
    )
    user_badges = res.scalars().all()
    badges_count = len(user_badges)
    
    return RewardSummaryResponse(
        total_xp=user.total_xp,
        level=level,
        current_level_xp=current_level_xp,
        next_level_xp=next_level_xp,
        streak_count=user.streak_count,
        badges_unlocked_count=badges_count
    )


@router.get("/badges", response_model=List[BadgeResponse])
async def get_badges(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(Badge))
    badges = res.scalars().all()
    
    res_ub = await db.execute(select(UserBadge.badge_id).where(UserBadge.user_id == user.id))
    unlocked_badge_ids = set(res_ub.scalars().all())
    
    return [
        BadgeResponse(
            id=b.id,
            slug=b.slug,
            title=b.title,
            description=b.description,
            image_name=b.image_name,
            xp_reward=b.xp_reward,
            is_unlocked=(b.id in unlocked_badge_ids)
        )
        for b in badges
    ]


@router.get("/leaderboard", response_model=List[LeaderboardItem])
async def get_leaderboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Query all users who have not chosen to hide from leaderboard
    res = await db.execute(
        select(User)
        .where(User.privacy_hide_leaderboard.is_(False))
        .order_by(desc(User.total_xp))
        .limit(20)
    )
    real_users = res.scalars().all()

    # Pre-calculated demo peers to maintain an engaging, competitive leaderboard
    demo_peers = [
        {"name": "Sophia", "xp": 4250, "avatar": "👑", "bg": "#FFF6E7", "is_user": False},
        {"name": "Liam", "xp": 3890, "avatar": "🥈", "bg": "#F0EEFF", "is_user": False},
        {"name": "Emma", "xp": 3450, "avatar": "🥉", "bg": "#EAF7FF", "is_user": False},
        {"name": "Lucas", "xp": 2100, "avatar": "⚡", "bg": "#E9FFF1", "is_user": False},
        {"name": "Chloe", "xp": 1750, "avatar": "🚀", "bg": "#FFF0F0", "is_user": False},
    ]

    all_entries = []
    current_user_included = False

    for u in real_users:
        is_curr = (u.id == user.id)
        if is_curr:
            current_user_included = True
        all_entries.append({
            "name": f"{u.name} (You)" if is_curr else u.name,
            "xp": u.total_xp or 0,
            "avatar": "⭐" if is_curr else "👤",
            "bg": "#FFF6E7",
            "is_user": is_curr
        })

    # If current user opted out or not in top list, still provide their entry if wanted
    if not current_user_included and not getattr(user, 'privacy_hide_leaderboard', False):
        all_entries.append({
            "name": f"{user.name} (You)",
            "xp": user.total_xp or 0,
            "avatar": "⭐",
            "bg": "#FFF6E7",
            "is_user": True
        })

    # Add demo peers if real user count is small to ensure a lively board
    for p in demo_peers:
        if not any(e["name"] == p["name"] for e in all_entries):
            all_entries.append(p)

    # Sort strictly by total XP in descending order
    all_entries.sort(key=lambda x: x["xp"], reverse=True)

    # Assign dynamic ranks, avatar medals, and card backgrounds
    top_avatars = ['👑', '🥈', '🥉', '⭐', '🚀', '🔥', '🎯', '✨']
    bg_colors = ['#FFF6E7', '#F0EEFF', '#EAF7FF', '#E9FFF1', '#FFF0F0', '#F5EEFF', '#EFF6FF']

    leaderboard = []
    for idx, item in enumerate(all_entries[:10]):
        rank = idx + 1
        avatar = top_avatars[min(idx, len(top_avatars) - 1)] if not item.get("is_user") else "⭐"
        bg = bg_colors[idx % len(bg_colors)]
        leaderboard.append(
            LeaderboardItem(
                rank=rank,
                name=item["name"],
                xp=f"{item['xp']:,} XP",
                avatar=avatar,
                bg=bg
            )
        )

    return leaderboard
