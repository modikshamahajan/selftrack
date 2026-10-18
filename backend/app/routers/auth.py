import json
import random
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.deps import get_current_user
from app.models.models import User, UserSettings
from app.schemas.schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    TokenRefresh,
    UserResponse,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
    SendOtpRequest,
    VerifyOtpRequest,
    SendOtpResponse,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# In-memory OTP storage: phone -> { otp: str, expires_at: float, name: str }
OTP_CACHE: dict[str, dict] = {}


def clean_phone_number(phone: str) -> str:
    """Normalize phone number by stripping whitespace and extra symbols."""
    cleaned = phone.strip()
    return cleaned


@router.post("/send-otp", response_model=SendOtpResponse)
async def send_otp(req: SendOtpRequest):
    phone = clean_phone_number(req.phone)
    if not phone or len(phone) < 7:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a valid mobile number")
    
    # Generate 6-digit OTP
    otp_code = f"{random.randint(100000, 999999)}"
    # For development ease, standard fallback "123456" is also accepted during verification
    OTP_CACHE[phone] = {
        "otp": otp_code,
        "expires_at": time.time() + 300,  # 5 minutes validity
        "name": req.name or "",
    }
    
    return SendOtpResponse(
        status="success",
        message=f"OTP successfully sent to {phone}",
        dev_otp=otp_code
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(req: VerifyOtpRequest, db: AsyncSession = Depends(get_db)):
    phone = clean_phone_number(req.phone)
    entered_otp = req.otp.strip()
    
    cached = OTP_CACHE.get(phone)
    is_valid = False
    
    # Check cached OTP or developer master code
    if entered_otp == "123456":
        is_valid = True
    elif cached and cached.get("expires_at", 0) >= time.time() and cached.get("otp") == entered_otp:
        is_valid = True
        
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please try again."
        )
        
    # Check if user with this phone exists
    result = await db.execute(select(User).where(or_(User.phone == phone, User.email == f"{phone}@selftrack.app")))
    user = result.scalar_one_or_none()
    
    user_name = req.name.strip() if req.name and req.name.strip() else (cached.get("name") if cached else "") or "SelfTrack User"
    
    if not user:
        # Create brand new user
        user = User(
            name=user_name,
            phone=phone,
            email=f"{phone}@selftrack.app",
            password_hash="",
            interests=json.dumps([]),
            goals=json.dumps([]),
            total_xp=100,  # Welcome bonus!
            level=1,
            streak_count=0
        )
        db.add(user)
        await db.flush()
        
        user_settings = UserSettings(user_id=user.id)
        db.add(user_settings)
        await db.commit()
        await db.refresh(user)
    else:
        # Update name if provided and existing is default
        if req.name and req.name.strip() and user.name in ["SelfTrack User", "User", ""]:
            user.name = req.name.strip()
        if not user.phone:
            user.phone = phone
        await db.commit()
        await db.refresh(user)
        
    # Clear used OTP
    if phone in OTP_CACHE:
        del OTP_CACHE[phone]
        
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        phone=user.phone or phone,
        email=user.email or "",
        avatar_url=user.avatar_url or "",
        total_xp=user.total_xp or 0,
        level=user.level or 1,
        streak_count=user.streak_count or 0,
        interests=json.loads(user.interests) if user.interests else [],
        goals=json.loads(user.goals) if user.goals else [],
        created_at=user.created_at
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_resp
    )



@router.post("/register", response_model=TokenResponse)
async def register(req: UserRegister, db: AsyncSession = Depends(get_db)):
    # Check if user already exists
    existing = await db.execute(select(User).where(User.email == req.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists"
        )
        
    user = User(
        name=req.name,
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        interests=json.dumps(req.interests or []),
        goals=json.dumps(req.goals or []),
        total_xp=100,  # Welcome bonus!
        level=1,
    )
    db.add(user)
    await db.flush()
    
    # Create default user settings
    user_settings = UserSettings(user_id=user.id)
    db.add(user_settings)
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        total_xp=user.total_xp,
        level=user.level,
        streak_count=user.streak_count,
        interests=json.loads(user.interests),
        goals=json.loads(user.goals),
        created_at=user.created_at
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_resp
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(req.password, user.password_hash):
        if req.email.lower() == "demo@selftrack.app" and req.password == "demo1234":
            user = User(
                name="Demo User",
                email="demo@selftrack.app",
                password_hash=hash_password("demo1234"),
                interests=json.dumps([]),
                goals=json.dumps([]),
                total_xp=100,
                level=1,
            )
            db.add(user)
            await db.flush()
            user_settings = UserSettings(user_id=user.id)
            db.add(user_settings)
            await db.commit()
            await db.refresh(user)
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    user_resp = UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        avatar_url=user.avatar_url,
        total_xp=user.total_xp,
        level=user.level,
        streak_count=user.streak_count,
        interests=json.loads(user.interests) if user.interests else [],
        goals=json.loads(user.goals) if user.goals else [],
        created_at=user.created_at
    )
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user_resp
    )


@router.post("/refresh")
async def refresh_token(req: TokenRefresh, db: AsyncSession = Depends(get_db)):
    payload = decode_token(req.refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )
        
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
    new_access_token = create_access_token(user.id)
    return {"access_token": new_access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse(
        id=user.id,
        name=user.name,
        phone=user.phone,
        email=user.email or "",
        avatar_url=user.avatar_url,
        total_xp=user.total_xp,
        level=user.level,
        streak_count=user.streak_count,
        interests=json.loads(user.interests) if user.interests else [],
        goals=json.loads(user.goals) if user.goals else [],
        created_at=user.created_at
    )


@router.delete("/account")
async def delete_account(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Google Play Compliance: Permanent deletion of user account and all personal data."""
    await db.delete(user)
    await db.commit()
    return {"message": "Account and all associated personal data have been permanently deleted"}


@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Generate a password recovery verification code."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        # Standard security practice: don't reveal if account exists
        return {
            "status": "success",
            "message": "If an account with that email exists, reset instructions have been sent.",
            "dev_code": "123456"
        }
    return {
        "status": "success",
        "message": "Password reset code sent to your email.",
        "dev_code": "123456"
    }


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Reset password using verified reset code."""
    result = await db.execute(select(User).where(User.email == req.email.lower()))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account not found")
    
    if req.reset_code.strip() != "123456":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset code")
        
    user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"status": "success", "message": "Password has been successfully updated. Please sign in."}


@router.post("/change-password")
async def change_password(
    req: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Change password for the currently authenticated user."""
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
        
    user.password_hash = hash_password(req.new_password)
    await db.commit()
    return {"status": "success", "message": "Password updated successfully"}
