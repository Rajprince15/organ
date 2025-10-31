from fastapi import APIRouter, HTTPException, Depends, Header, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging
from datetime import timedelta
import random

from models import (
    User, UserRegister, UserLogin, Token, UserResponse,
    OTPRequest, OTPVerify
)
from auth_utils import (
    verify_password, get_password_hash, create_access_token,
    decode_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["authentication"])

# In-memory OTP storage (for demo purposes)
otp_storage = {}

def get_db(request: Request) -> AsyncIOMotorDatabase:
    """Get database from request state."""
    return request.state.db

async def get_current_user(
    authorization: Optional[str] = Header(None),
    request: Request = None
) -> Optional[User]:
    """Get current user from JWT token."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.replace("Bearer ", "")
    payload = decode_access_token(token)
    
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
    
    db = request.state.db
    user_dict = await db.users.find_one({"id": user_id})
    if not user_dict:
        return None
    
    return User(**user_dict)

@router.post("/register", response_model=Token)
async def register(user_data: UserRegister, request: Request):
    """Register a new user (donor or hospital only)."""
    db = get_db(request)
    
    # Check if passwords match
    if user_data.password != user_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if mobile already exists
    existing_mobile = await db.users.find_one({"mobile": user_data.mobile})
    if existing_mobile:
        raise HTTPException(status_code=400, detail="Mobile number already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        name=user_data.name,
        mobile=user_data.mobile,
        age=user_data.age,
        mobile_verified=True  # Auto-verify for demo
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"User registered: {user.email} with role {user.role}")
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    """Login user."""
    db = get_db(request)
    user_dict = await db.users.find_one({"email": credentials.email})
    
    if not user_dict:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    user = User(**user_dict)
    
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is inactive")
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_me(
    authorization: Optional[str] = Header(None),
    request: Request = None
):
    """Get current user info."""
    user = await get_current_user(authorization, request)
    
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        role=user.role,
        name=user.name,
        mobile=user.mobile,
        age=user.age,
        mobile_verified=user.mobile_verified,
        is_active=user.is_active
    )

@router.post("/request-otp")
async def request_otp(otp_data: OTPRequest):
    """Request OTP for mobile verification (mocked for demo)."""
    # Generate random 6-digit OTP
    otp = str(random.randint(100000, 999999))
    
    # Store in memory (in production, use Redis with expiry)
    otp_storage[otp_data.mobile] = otp
    
    logger.info(f"OTP generated for {otp_data.mobile}: {otp}")
    
    # In production, send SMS here
    return {
        "message": "OTP sent successfully",
        "otp": otp  # Only for demo! Remove in production
    }

@router.post("/verify-otp")
async def verify_otp(verify_data: OTPVerify):
    """Verify OTP (mocked for demo)."""
    stored_otp = otp_storage.get(verify_data.mobile)
    
    if not stored_otp:
        # For demo, accept any 6-digit OTP
        if len(verify_data.otp) == 6 and verify_data.otp.isdigit():
            return {"verified": True, "message": "OTP verified successfully"}
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    if stored_otp != verify_data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Remove OTP after verification
    del otp_storage[verify_data.mobile]
    
    return {"verified": True, "message": "OTP verified successfully"}
