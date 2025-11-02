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
    organ_required: Optional[str] = None
    urgency_level: Optional[Literal["critical", "high", "medium"]] = None
    hospital_name: Optional[str] = None
    doctor_name: Optional[str] = None
    contact_number: Optional[str] = None
    email: Optional[EmailStr] = None
    medical_history: Optional[str] = None
    status: Optional[Literal["active", "fulfilled", "cancelled"]] = None

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

# Notification Models
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: Literal["match_found", "status_change", "contact_received", "new_requirement", "general"]
    title: str
    message: str
    link: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[dict] = None

class NotificationCreate(BaseModel):
    user_id: str
    type: Literal["match_found", "status_change", "contact_received", "new_requirement", "general"]
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[dict] = None

# Community Post Models
class CommunityPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    author_name: str
    author_image: Optional[str] = None
    content: str
    image: Optional[str] = None
    post_type: Literal["post", "reel"] = "post"
    likes: int = 0
    comments_count: int = 0
    shares: int = 0
    is_flagged: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class CommunityPostCreate(BaseModel):
    content: str
    image: Optional[str] = None
    post_type: Literal["post", "reel"] = "post"

class CommunityPostUpdate(BaseModel):
    content: Optional[str] = None
    image: Optional[str] = None
    is_flagged: Optional[bool] = None
    is_active: Optional[bool] = None

# Event Models
class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    date: str
    time: str
    location: str
    organizer_id: str
    organizer_name: str
    attendees_count: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class EventCreate(BaseModel):
    title: str
    description: str
    date: str
    time: str
    location: str

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    is_active: Optional[bool] = None

# Resource/Article Models
class Resource(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    content: str
    category: str
    author_id: str
    author_name: str
    is_published: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ResourceCreate(BaseModel):
    title: str
    description: str
    content: str
    category: str

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    is_published: Optional[bool] = None

# Activity Log Models
class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    activity_type: str  # registration, application_submitted, requirement_posted, match_made, contact_made, status_change
    description: str
    metadata: Optional[dict] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Audit Log Models  
class AuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    admin_id: str
    admin_name: str
    action: str  # create, update, delete, login, logout, view
    target_type: str  # user, donation, requirement, post, event, resource
    target_id: Optional[str] = None
    changes: Optional[dict] = None  # before/after values
    ip_address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Platform Settings Model
class PlatformSettings(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    site_name: str = "Organ Donation Platform"
    site_logo: Optional[str] = None
    maintenance_mode: bool = False
    public_registration_enabled: bool = True
    email_service_enabled: bool = False
    sms_service_enabled: bool = False
    auto_archive_days: int = 365
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
