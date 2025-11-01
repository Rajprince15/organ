from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Literal
from datetime import datetime
import uuid

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    hashed_password: str
    role: Literal["donor", "hospital", "admin"]
    name: str
    mobile: Optional[str] = None
    age: Optional[int] = None
    mobile_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    confirm_password: str
    role: Literal["donor", "hospital"]
    name: str
    mobile: str
    age: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class OTPVerify(BaseModel):
    mobile: str
    otp: str

class OTPRequest(BaseModel):
    mobile: str

class Token(BaseModel):
    access_token: str
    token_type: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    name: str
    mobile: Optional[str] = None
    age: Optional[int] = None
    mobile_verified: bool
    is_active: bool

class DonationApplication(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    donor_id: str
    donor_email: EmailStr
    full_name: str
    email: EmailStr
    phone: str
    date_of_birth: str
    blood_group: str
    organs: list[str]
    consent: bool
    status: Literal["pending", "approved", "active", "cancelled"] = "pending"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DonationApplicationCreate(BaseModel):
    full_name: str
    email: EmailStr
    phone: str
    date_of_birth: str
    blood_group: str
    organs: list[str]
    consent: bool

class DonationApplicationUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    organs: Optional[list[str]] = None
    consent: Optional[bool] = None
    status: Optional[Literal["pending", "approved", "active", "cancelled"]] = None
