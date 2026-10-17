from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------------- AUTH SCHEMAS ----------------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    interests: Optional[List[str]] = []
    goals: Optional[List[str]] = []


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: str = ""
    total_xp: int = 0
    level: int = 1
    streak_count: int = 0
    interests: List[str] = []
    goals: List[str] = []
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefresh(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    reset_code: str
    new_password: str = Field(..., min_length=6)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)


# ---------------------- SETTINGS SCHEMAS ----------------------
class UserSettingsUpdate(BaseModel):
    ai_mode: Optional[str] = None
    ai_model_name: Optional[str] = None
    ollama_endpoint: Optional[str] = None
    custom_api_key: Optional[str] = None
    ai_suggestions: Optional[bool] = None
    daily_summary: Optional[bool] = None
    ai_personality: Optional[str] = None
    push_notifications: Optional[bool] = None
    sound_effects: Optional[bool] = None
    haptic_feedback: Optional[bool] = None
    dark_mode: Optional[bool] = None
    auto_sync: Optional[bool] = None
    large_text: Optional[bool] = None
    high_contrast: Optional[bool] = None
    reduce_motion: Optional[bool] = None
    biometrics_enabled: Optional[bool] = None
    pin_lock: Optional[bool] = None
    auto_lock: Optional[bool] = None
    privacy_hide_leaderboard: Optional[bool] = None
    privacy_private_journal: Optional[bool] = None


class UserSettingsResponse(BaseModel):
    ai_mode: str
    ai_model_name: str
    custom_api_key: str
    ollama_endpoint: Optional[str] = ""
    ai_suggestions: bool
    daily_summary: bool
    ai_personality: str
    push_notifications: bool
    sound_effects: bool
    haptic_feedback: bool
    dark_mode: bool
    auto_sync: bool
    large_text: bool
    high_contrast: bool
    reduce_motion: bool
    biometrics_enabled: bool
    pin_lock: bool
    auto_lock: bool
    privacy_hide_leaderboard: bool = False
    privacy_private_journal: bool = True

    model_config = ConfigDict(from_attributes=True)


# ---------------------- HABIT SCHEMAS ----------------------
class HabitCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str = "droplet"
    color: str = "#2ECC71"
    category: str = "Health"
    streak_target: int = 7


class HabitUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    category: Optional[str] = None
    streak_target: Optional[int] = None


class HabitToggleRequest(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD


class HabitResponse(BaseModel):
    id: str
    name: str
    icon: str
    color: str
    category: str
    streak_target: int
    current_streak: int
    completed: bool = False
    completed_days: Dict[str, bool] = {}

    model_config = ConfigDict(from_attributes=True)


# ---------------------- HEALTH SCHEMAS ----------------------
class HealthSyncRequest(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD
    steps: Optional[int] = None
    step_goal: Optional[int] = None
    water_glasses: Optional[int] = None
    water_goal: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[int] = None
    calories_burned: Optional[int] = None
    distance_km: Optional[float] = None


class HealthMetricResponse(BaseModel):
    date: str
    steps: int
    step_goal: int
    water_glasses: int
    water_goal: int
    sleep_hours: float
    sleep_quality: int
    calories_burned: int
    distance_km: float

    model_config = ConfigDict(from_attributes=True)


class FoodLogCreate(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD
    name: str
    qty: int = 1
    calories: int
    serving: str = "1 serving"
    category: str = "Healthy"
    image_url: Optional[str] = None



class FoodLogResponse(BaseModel):
    id: str
    date: str
    name: str
    qty: int
    calories: int
    serving: str
    category: str
    image_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------- JOURNAL SCHEMAS ----------------------
class JournalCreate(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD
    title: str
    content: str
    mood: str = "good"
    mood_score: int = 4
    images: Optional[List[str]] = []
    has_voice: bool = False
    voice_url: str = ""


class JournalResponse(BaseModel):
    id: str
    date: str
    title: str
    content: str
    mood: str
    mood_score: int
    images: List[str] = []
    has_voice: bool
    voice_url: str
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------- AI SCHEMAS ----------------------
class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class AIChatResponse(BaseModel):
    reply: str
    model_used: str
    timestamp: str


class AIWidgetTipResponse(BaseModel):
    message: str
    model_used: str


# ---------------------- REWARDS SCHEMAS ----------------------
class BadgeResponse(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    image_name: str
    xp_reward: int
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class RewardSummaryResponse(BaseModel):
    total_xp: int
    level: int
    current_level_xp: int
    next_level_xp: int
    streak_count: int
    badges_count: int
    badges_unlocked_count: Optional[int] = 0


class LeaderboardItem(BaseModel):
    rank: int
    name: str
    xp: str
    avatar: str
    bg: str


class SocialPostCreate(BaseModel):
    content: str
    achievement: Optional[str] = ""
    image_url: Optional[str] = ""


class SocialCommentCreate(BaseModel):
    text: str


class SocialCommentResponse(BaseModel):
    id: str
    user: str
    text: str
    time: str

    model_config = ConfigDict(from_attributes=True)


class SocialPostResponse(BaseModel):
    id: str
    user_id: str
    user: str
    avatar: str
    time: str
    content: str
    achievement: Optional[str] = ""
    image_url: Optional[str] = ""
    hasImage: bool = False
    likes: int
    comments: int
    commentsList: List[SocialCommentResponse] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------- NOTIFICATION SCHEMAS ----------------------
class NotificationCreate(BaseModel):
    title: str
    message: str
    category: str = "general"
    icon: str = "bell"
    color: str = "#2ECC71"


class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str
    category: str
    icon: str
    color: str
    time: str
    read: bool

    model_config = ConfigDict(from_attributes=True)
