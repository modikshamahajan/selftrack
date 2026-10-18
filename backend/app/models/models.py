import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    phone = Column(String(50), unique=True, index=True, nullable=True)
    email = Column(String(255), unique=True, index=True, nullable=True)
    password_hash = Column(String(255), nullable=True, default="")
    avatar_url = Column(String(500), default="")
    total_xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    streak_count = Column(Integer, default=0)
    interests = Column(Text, default="[]")  # JSON encoded list of strings
    goals = Column(Text, default="[]")      # JSON encoded list of strings
    platform = Column(String(50), default="unknown")
    last_active_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    settings = relationship("UserSettings", back_populates="user", uselist=False, cascade="all, delete-orphan")
    habits = relationship("Habit", back_populates="user", cascade="all, delete-orphan")
    health_metrics = relationship("HealthMetric", back_populates="user", cascade="all, delete-orphan")
    food_logs = relationship("FoodLog", back_populates="user", cascade="all, delete-orphan")
    journal_entries = relationship("JournalEntry", back_populates="user", cascade="all, delete-orphan")
    user_badges = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    chat_messages = relationship("AIChatMessage", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class UserSettings(Base):
    __tablename__ = "user_settings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    
    # AI & Model Preferences
    ai_mode = Column(String(50), default="gemini")  # gemini | openai | byok
    ai_model_name = Column(String(100), default="gemini-2.5-flash")
    ollama_endpoint = Column(String(255), nullable=True, default="")
    custom_api_key = Column(String(255), default="")
    ai_suggestions = Column(Boolean, default=True)
    daily_summary = Column(Boolean, default=True)
    ai_personality = Column(String(50), default="Friendly")
    
    # App & Device Settings
    push_notifications = Column(Boolean, default=True)
    sound_effects = Column(Boolean, default=True)
    haptic_feedback = Column(Boolean, default=True)
    dark_mode = Column(Boolean, default=False)
    auto_sync = Column(Boolean, default=True)
    large_text = Column(Boolean, default=False)
    high_contrast = Column(Boolean, default=False)
    reduce_motion = Column(Boolean, default=False)
    
    # Security Settings
    biometrics_enabled = Column(Boolean, default=True)
    pin_lock = Column(Boolean, default=False)
    pin_hash = Column(String(100), default="")
    auto_lock = Column(Boolean, default=True)
    privacy_hide_leaderboard = Column(Boolean, default=False)
    privacy_private_journal = Column(Boolean, default=True)

    user = relationship("User", back_populates="settings")


class Habit(Base):
    __tablename__ = "habits"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    icon = Column(String(50), default="droplet")
    color = Column(String(20), default="#2ECC71")
    category = Column(String(50), default="Health")
    streak_target = Column(Integer, default=7)
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit", cascade="all, delete-orphan")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    habit_id = Column(String(36), ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    log_date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    completed = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    habit = relationship("Habit", back_populates="logs")


class HealthMetric(Base):
    __tablename__ = "health_metrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    steps = Column(Integer, default=0)
    step_goal = Column(Integer, default=10000)
    water_glasses = Column(Integer, default=0)
    water_goal = Column(Integer, default=8)
    sleep_hours = Column(Float, default=7.5)
    sleep_quality = Column(Integer, default=80)
    calories_burned = Column(Integer, default=0)
    distance_km = Column(Float, default=0.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="health_metrics")


class FoodLog(Base):
    __tablename__ = "food_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    name = Column(String(100), nullable=False)
    qty = Column(Integer, default=1)
    calories = Column(Integer, nullable=False)
    serving = Column(String(50), default="1 serving")
    category = Column(String(50), default="Healthy")
    image_url = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


    user = relationship("User", back_populates="food_logs")


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(String(10), nullable=False, index=True)  # YYYY-MM-DD
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    mood = Column(String(20), default="good")
    mood_score = Column(Integer, default=4)
    images = Column(Text, default="[]")  # JSON list of image strings
    has_voice = Column(Boolean, default=False)
    voice_url = Column(String(500), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="journal_entries")


class Badge(Base):
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    slug = Column(String(50), unique=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    image_name = Column(String(50), nullable=False)
    xp_reward = Column(Integer, default=100)


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(String(36), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    unlocked_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="user_badges")
    badge = relationship("Badge")


class SocialPost(Base):
    __tablename__ = "social_posts"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String(100), nullable=False)
    user_avatar = Column(String(50), default="👤")
    content = Column(Text, nullable=False)
    achievement = Column(String(100), default="")
    image_url = Column(String(500), default="")
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    comments = relationship("SocialComment", back_populates="post", cascade="all, delete-orphan", order_by="SocialComment.created_at")


class SocialComment(Base):
    __tablename__ = "social_comments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    post_id = Column(String(36), ForeignKey("social_posts.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    user_name = Column(String(100), nullable=False)
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    post = relationship("SocialPost", back_populates="comments")
    user = relationship("User")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(100), nullable=False)
    message = Column(String(255), nullable=False)
    category = Column(String(50), default="general")
    icon = Column(String(50), default="bell")
    color = Column(String(20), default="#2ECC71")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="notifications")


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    model_used = Column(String(100), default="")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="chat_messages")


class Admin(Base):
    __tablename__ = "admins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="admin")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AppDownload(Base):
    __tablename__ = "app_downloads"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    device_id = Column(String(100), unique=True, index=True, nullable=False)
    platform = Column(String(50), nullable=False)  # ios, android, web
    app_version = Column(String(50), default="1.0.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
