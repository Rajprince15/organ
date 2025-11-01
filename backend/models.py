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
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
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
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

class DonationApplicationUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    date_of_birth: Optional[str] = None
    blood_group: Optional[str] = None
    organs: Optional[list[str]] = None
    consent: Optional[bool] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    status: Optional[Literal["pending", "approved", "active", "cancelled"]] = None

class HospitalRequirement(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hospital_id: str
    hospital_name: str
    patient_name: str
    age: int
    blood_group: str
    organ_required: str
    urgency_level: Literal["critical", "high", "medium"]
    doctor_name: str
    contact_number: str
    email: EmailStr
    medical_history: str
    status: Literal["active", "fulfilled", "cancelled"] = "active"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class HospitalRequirementCreate(BaseModel):
    patient_name: str
    age: int
    blood_group: str
    organ_required: str
    urgency_level: Literal["critical", "high", "medium"]
    hospital_name: str
    doctor_name: str
    contact_number: str
    email: EmailStr
    medical_history: str

class HospitalRequirementUpdate(BaseModel):
    patient_name: Optional[str] = None
    age: Optional[int] = None
    blood_group: Optional[str] = None

# Contact History Models
class ContactHistory(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hospital_id: str
    donor_id: str
    donor_name: str
    donor_email: str
    contact_method: str  # email, phone, etc.
    notes: Optional[str] = None
    contacted_at: datetime = Field(default_factory=datetime.utcnow)

class ContactHistoryCreate(BaseModel):
    donor_id: str
    contact_method: str
    notes: Optional[str] = None

# Shortlist Models
class Shortlist(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    hospital_id: str
    donor_id: str
    donor_name: str
    donor_email: str
    blood_group: str
    organs: list[str]
    notes: Optional[str] = None
    added_at: datetime = Field(default_factory=datetime.utcnow)

class ShortlistCreate(BaseModel):
    donor_id: str
    notes: Optional[str] = None

    organ_required: Optional[str] = None
    urgency_level: Optional[Literal["critical", "high", "medium"]] = None
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    medical_history: Optional[str] = None
    status: Optional[Literal["active", "fulfilled", "cancelled"]] = None
