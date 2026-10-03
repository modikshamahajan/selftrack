from pydantic import BaseModel, EmailStr
from typing import List
from datetime import datetime

class AdminLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserDetailStats(BaseModel):
    id: str
    name: str
    email: EmailStr
    total_xp: int
    level: int
    streak_count: int
    created_at: datetime

class AdminDashboardStats(BaseModel):
    total_users: int
    total_habits: int
    total_health_metrics: int
    total_journal_entries: int
    total_downloads: int
    recent_users: List[UserDetailStats]

class AppDownloadCreate(BaseModel):
    device_id: str
    platform: str
