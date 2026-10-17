from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class AppDownloadCreate(BaseModel):
    device_id: str
    platform: str
    app_version: Optional[str] = "1.0.0"

class UserDetailStats(BaseModel):
    id: str
    name: str
    email: EmailStr
    total_xp: int
    level: int
    streak_count: int
    created_at: datetime
    last_active_at: Optional[datetime] = None
    platform: Optional[str] = "unknown"
    habits_count: int = 0
    health_metrics_count: int = 0
    status: str = "Active Today"  # Active Today, Active This Week, Dormant

class ActiveUserStats(BaseModel):
    dau: int  # past 24h
    wau: int  # past 7d
    mau: int  # past 30d
    stickiness_ratio: float  # (dau / mau) * 100

class PlatformDownloadStats(BaseModel):
    total_downloads: int
    android_count: int
    ios_count: int
    web_count: int
    android_percentage: float
    ios_percentage: float

class HabitAnalytics(BaseModel):
    total_habits: int
    active_habits: int
    global_completion_rate: float
    category_distribution: Dict[str, int]

class HealthAnalytics(BaseModel):
    total_health_metrics: int
    total_journal_entries: int
    total_food_logs: int
    avg_water_glasses: float
    avg_sleep_hours: float
    avg_steps: int

class AdminDashboardStats(BaseModel):
    total_users: int
    total_habits: int
    total_health_metrics: int
    total_journal_entries: int
    total_downloads: int
    active_users: ActiveUserStats
    downloads_by_platform: PlatformDownloadStats
    habit_analytics: HabitAnalytics
    health_analytics: HealthAnalytics
    recent_users: List[UserDetailStats]

class UserFullProfile(BaseModel):
    id: str
    name: str
    email: EmailStr
    total_xp: int
    level: int
    streak_count: int
    interests: List[str]
    goals: List[str]
    platform: str
    created_at: datetime
    last_active_at: Optional[datetime] = None
    status: str
    habits: List[Dict[str, Any]]
    recent_health_metrics: List[Dict[str, Any]]
    journal_count: int

class BroadcastNotificationRequest(BaseModel):
    title: str
    message: str
    category: Optional[str] = "announcement"
    target: Optional[str] = "all"  # all | active | dormant
