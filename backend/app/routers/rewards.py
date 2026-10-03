from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.models import User, Badge, UserBadge
from app.schemas.schemas import RewardSummaryResponse, BadgeResponse, LeaderboardItem

router = APIRouter(prefix="/rewards", tags=["Rewards & Gamification"])

DEFAULT_BADGES = [
    {"slug": "early_bird", "title": "Early Bird", "description": "Complete a morning habit before 8 AM", "image_name": "firebadge", "xp_reward": 100},
    {"slug": "consistent", "title": "Consistent", "description": "Maintain a 7-day habit streak", "image_name": "purplecandy", "xp_reward": 150},
    {"slug": "focused", "title": "Focused", "description": "Hit 10,000 steps in a single day", "image_name": "trophyicon", "xp_reward": 200},
    {"slug": "achiever", "title": "Achiever", "description": "Complete all daily habits 3 days in a row", "image_name": "goldstar", "xp_reward": 250},
]


async def seed_badges_if_empty(db: AsyncSession):
    res = await db.execute(select(Badge))
    badges = res.scalars().all()
    if not badges:
        for b in DEFAULT_BADGES:
            db.add(Badge(**b))
        await db.commit()


@router.get("/summary", response_model=RewardSummaryResponse)
async def get_reward_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    level = (user.total_xp // 1000) + 1
    current_level_xp = user.total_xp % 1000
    next_level_xp = 1000
    
    # Count unlocked badges
    res = await db.execute(select(UserBadge).where(UserBadge.user_id == user.id))
    unlocked_count = len(res.scalars().all())
    
    return RewardSummaryResponse(
        total_xp=user.total_xp,
        level=level,
        current_level_xp=current_level_xp,
        next_level_xp=next_level_xp,
        streak_count=user.streak_count,
        badges_count=unlocked_count
    )


@router.get("/badges", response_model=List[BadgeResponse])
async def get_badges(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    await seed_badges_if_empty(db)
    
    res = await db.execute(select(Badge))
    badges = res.scalars().all()
    
    user_badges_res = await db.execute(select(UserBadge).where(UserBadge.user_id == user.id))
    unlocked_map = {ub.badge_id: ub.unlocked_at for ub in user_badges_res.scalars().all()}
    
    return [
        BadgeResponse(
            id=b.id,
            slug=b.slug,
            title=b.title,
            description=b.description,
            image_name=b.image_name,
            xp_reward=b.xp_reward,
            is_unlocked=b.id in unlocked_map or b.slug == "early_bird",  # Starter badge unlocked
            unlocked_at=unlocked_map.get(b.id)
        )
        for b in badges
    ]


@router.get("/leaderboard", response_model=List[LeaderboardItem])
async def get_leaderboard(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    res = await db.execute(select(User).order_by(desc(User.total_xp)).limit(10))
    top_users = res.scalars().all()
    
    leaderboard = []
    user_in_top = False
    
    bg_colors = ['#FFF6E7', '#F0EEFF', '#EAF7FF', '#E9FFF1', '#FFF0F0']
    avatars = ['👑', '🥈', '🥉', '⭐', '🚀']
    
    for i, u in enumerate(top_users):
        rank = i + 1
        if u.id == user.id:
            user_in_top = True
        leaderboard.append(
            LeaderboardItem(
                rank=rank,
                name=f"{u.name} (You)" if u.id == user.id else u.name,
                xp=f"{u.total_xp:,} XP",
                avatar=avatars[min(i, len(avatars)-1)],
                bg=bg_colors[min(i, len(bg_colors)-1)]
            )
        )
        
    # If fewer than 4 users, supply demo peers to keep leaderboard engaging
    demo_peers = [
        {"name": "Sophia", "xp": 4250, "avatar": "👑", "bg": "#FFF6E7"},
        {"name": "Liam", "xp": 3890, "avatar": "🥈", "bg": "#F0EEFF"},
        {"name": "Emma", "xp": 3450, "avatar": "🥉", "bg": "#EAF7FF"},
    ]
    if len(leaderboard) < 3:
        for p in demo_peers:
            if not any(item.name == p["name"] for item in leaderboard):
                leaderboard.append(
                    LeaderboardItem(
                        rank=len(leaderboard) + 1,
                        name=p["name"],
                        xp=f"{p['xp']:,} XP",
                        avatar=p["avatar"],
                        bg=p["bg"]
                    )
                )
                
    return leaderboard
