from fastapi import FastAPI, APIRouter, Request, Query
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import io
import csv
from auth_routes import router as auth_router
from models import (
    DonationApplication, DonationApplicationCreate, DonationApplicationUpdate,
    HospitalRequirement, HospitalRequirementCreate, HospitalRequirementUpdate,
    ContactHistory, ContactHistoryCreate, Shortlist, ShortlistCreate
)
from auth_utils import get_current_user
from fastapi import Depends, HTTPException


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection with fallback to mock database
USE_MOCK_DB = os.environ.get('USE_MOCK_DB', 'true').lower() == 'true'

if USE_MOCK_DB:
    from mock_db import MockMongoClient, seed_mock_data
    
    logger = logging.getLogger(__name__)
    logger.info("🔧 Using MOCK DATABASE (MongoDB not required)")
    
    client = MockMongoClient("mock://localhost:27017")
    db = client[os.environ.get('DB_NAME', 'test_database')]
    
    # Seed mock data
    seed_mock_data(db)
else:
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'test_database')]
    logging.getLogger(__name__).info("🗄️  Connected to MongoDB")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Middleware to inject db into request state
@app.middleware("http")
async def db_session_middleware(request: Request, call_next):
    request.state.db = db
    response = await call_next(request)
    return response


# Define Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.model_dump())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include auth router
api_router.include_router(auth_router)

# Donation Application Routes
@api_router.post("/donations", response_model=DonationApplication)
async def create_donation_application(
    application: DonationApplicationCreate,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Create a new donation application for the current donor"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can create donation applications")
    
    # Check if donor already has an application
    existing = await db.donation_applications.find_one({"donor_id": current_user["id"]})
    if existing:
        raise HTTPException(status_code=400, detail="You already have a donation application. Please edit or delete it first.")
    
    # Create new application
    app_dict = application.model_dump()
    app_dict["donor_id"] = current_user["id"]
    app_dict["donor_email"] = current_user["email"]
    
    app_obj = DonationApplication(**app_dict)
    await db.donation_applications.insert_one(app_obj.model_dump())
    
    return app_obj

@api_router.get("/donations/me", response_model=DonationApplication | None)
async def get_my_donation_application(
    current_user: dict = Depends(get_current_user)
):
    """Get the current donor's donation application"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can access donation applications")
    
    application = await db.donation_applications.find_one({"donor_id": current_user["id"]})
    if not application:
        return None
    
    return DonationApplication(**application)

@api_router.put("/donations/{application_id}", response_model=DonationApplication)
async def update_donation_application(
    application_id: str,
    updates: DonationApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update donor's donation application"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can update donation applications")
    
    # Check if application exists and belongs to user
    application = await db.donation_applications.find_one({"id": application_id, "donor_id": current_user["id"]})
    if not application:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.donation_applications.update_one(
        {"id": application_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update application")
    
    # Fetch and return updated application
    updated_app = await db.donation_applications.find_one({"id": application_id})
    return DonationApplication(**updated_app)

@api_router.delete("/donations/{application_id}")
async def delete_donation_application(
    application_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete donor's donation application"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can delete donation applications")
    
    # Check if application exists and belongs to user
    application = await db.donation_applications.find_one({"id": application_id, "donor_id": current_user["id"]})
    if not application:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    result = await db.donation_applications.delete_one({"id": application_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete application")
    
    return {"message": "Donation application deleted successfully"}

# Hospital Requirement Routes
@api_router.post("/hospital-requirements", response_model=HospitalRequirement)
async def create_hospital_requirement(
    requirement: HospitalRequirementCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new hospital requirement"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can create requirements")
    
    # Create new requirement
    req_dict = requirement.model_dump()
    req_dict["hospital_id"] = current_user["id"]
    
    req_obj = HospitalRequirement(**req_dict)
    await db.hospital_requirements.insert_one(req_obj.model_dump())
    
    return req_obj

@api_router.get("/hospital-requirements/me", response_model=List[HospitalRequirement])
async def get_my_hospital_requirements(
    current_user: dict = Depends(get_current_user)
):
    """Get all requirements posted by the current hospital"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can access requirements")
    
    requirements = await db.hospital_requirements.find({"hospital_id": current_user["id"]}).to_list(1000)
    return [HospitalRequirement(**req) for req in requirements]

@api_router.put("/hospital-requirements/{requirement_id}", response_model=HospitalRequirement)
async def update_hospital_requirement(
    requirement_id: str,
    updates: HospitalRequirementUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update hospital requirement"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can update requirements")
    
    # Check if requirement exists and belongs to hospital
    requirement = await db.hospital_requirements.find_one({"id": requirement_id, "hospital_id": current_user["id"]})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.hospital_requirements.update_one(
        {"id": requirement_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update requirement")
    
    # Fetch and return updated requirement
    updated_req = await db.hospital_requirements.find_one({"id": requirement_id})
    return HospitalRequirement(**updated_req)

@api_router.delete("/hospital-requirements/{requirement_id}")
async def delete_hospital_requirement(
    requirement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete hospital requirement"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can delete requirements")
    
    # Check if requirement exists and belongs to hospital
    requirement = await db.hospital_requirements.find_one({"id": requirement_id, "hospital_id": current_user["id"]})
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    result = await db.hospital_requirements.delete_one({"id": requirement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete requirement")
    
    return {"message": "Requirement deleted successfully"}

# Donor List Routes for Hospitals
@api_router.get("/donations/all")
async def get_all_donations(
    current_user: dict = Depends(get_current_user),
    organ: Optional[str] = None,
    organs: Optional[str] = None,  # comma-separated list
    blood_groups: Optional[str] = None,  # comma-separated list
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    page: int = 1,
    limit: int = 10
):
    """Get all approved donor applications with advanced filtering and pagination"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can view all donation applications")
    
    # Get all approved donors
    all_applications = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    
    # Calculate age for each donor
    from datetime import datetime
    for app in all_applications:
        if app.get("date_of_birth"):
            dob = datetime.fromisoformat(app["date_of_birth"].replace("Z", "+00:00")) if isinstance(app["date_of_birth"], str) else app["date_of_birth"]
            if isinstance(dob, str):
                dob = datetime.strptime(dob, "%Y-%m-%d")
            today = datetime.now()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            app["age"] = age
    
    # Apply filters
    filtered_applications = all_applications
    
    # Filter by organ (backward compatibility)
    if organ:
        filtered_applications = [
            app for app in filtered_applications 
            if organ in app.get("organs", [])
        ]
    
    # Filter by multiple organs
    if organs:
        organ_list = [o.strip() for o in organs.split(",")]
        filtered_applications = [
            app for app in filtered_applications 
            if any(organ in app.get("organs", []) for organ in organ_list)
        ]
    
    # Filter by blood groups
    if blood_groups:
        blood_group_list = [bg.strip() for bg in blood_groups.split(",")]
        filtered_applications = [
            app for app in filtered_applications 
            if app.get("blood_group") in blood_group_list
        ]
    
    # Filter by age range
    if age_min is not None:
        filtered_applications = [
            app for app in filtered_applications 
            if app.get("age", 0) >= age_min
        ]
    
    if age_max is not None:
        filtered_applications = [
            app for app in filtered_applications 
            if app.get("age", 999) <= age_max
        ]
    
    # Filter by location
    if city:
        filtered_applications = [
            app for app in filtered_applications 
            if app.get("city", "").lower() == city.lower()
        ]
    
    if state:
        filtered_applications = [
            app for app in filtered_applications 
            if app.get("state", "").lower() == state.lower()
        ]
    
    # Calculate pagination
    total = len(filtered_applications)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    
    paginated_applications = filtered_applications[start_idx:end_idx]
    
    return {
        "applications": [DonationApplication(**app) for app in paginated_applications],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }


# Contact History Routes
@api_router.post("/contacts", response_model=ContactHistory)
async def create_contact_history(
    contact_data: ContactHistoryCreate,
    current_user: dict = Depends(get_current_user)
):
    """Record contact with a donor"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can record contacts")
    
    # Get donor details
    donor = await db.donation_applications.find_one({"donor_id": contact_data.donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    # Create contact history
    contact_dict = contact_data.model_dump()
    contact_dict["hospital_id"] = current_user["id"]
    contact_dict["donor_name"] = donor.get("full_name", "")
    contact_dict["donor_email"] = donor.get("email", "")
    
    contact_obj = ContactHistory(**contact_dict)
    await db.contact_history.insert_one(contact_obj.model_dump())
    
    return contact_obj

@api_router.get("/contacts/me", response_model=List[ContactHistory])
async def get_my_contact_history(
    current_user: dict = Depends(get_current_user)
):
    """Get contact history for the current hospital"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can view contact history")
    
    contacts = await db.contact_history.find({"hospital_id": current_user["id"]}).sort("contacted_at", -1).to_list(1000)
    return [ContactHistory(**contact) for contact in contacts]

# Shortlist Routes
@api_router.post("/shortlist", response_model=Shortlist)
async def add_to_shortlist(
    shortlist_data: ShortlistCreate,
    current_user: dict = Depends(get_current_user)
):
    """Add a donor to shortlist"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can manage shortlists")
    
    # Check if already in shortlist
    existing = await db.shortlist.find_one({
        "hospital_id": current_user["id"],
        "donor_id": shortlist_data.donor_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Donor already in shortlist")
    
    # Get donor details
    donor = await db.donation_applications.find_one({"donor_id": shortlist_data.donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    # Create shortlist entry
    shortlist_dict = shortlist_data.model_dump()
    shortlist_dict["hospital_id"] = current_user["id"]
    shortlist_dict["donor_name"] = donor.get("full_name", "")
    shortlist_dict["donor_email"] = donor.get("email", "")
    shortlist_dict["blood_group"] = donor.get("blood_group", "")
    shortlist_dict["organs"] = donor.get("organs", [])
    
    shortlist_obj = Shortlist(**shortlist_dict)
    await db.shortlist.insert_one(shortlist_obj.model_dump())
    
    return shortlist_obj

@api_router.get("/shortlist/me", response_model=List[Shortlist])
async def get_my_shortlist(
    current_user: dict = Depends(get_current_user)
):
    """Get shortlist for the current hospital"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can view shortlists")
    
    shortlist = await db.shortlist.find({"hospital_id": current_user["id"]}).sort("added_at", -1).to_list(1000)
    return [Shortlist(**item) for item in shortlist]

@api_router.delete("/shortlist/{donor_id}")
async def remove_from_shortlist(
    donor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a donor from shortlist"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can manage shortlists")
    
    result = await db.shortlist.delete_one({
        "hospital_id": current_user["id"],
        "donor_id": donor_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Donor not in shortlist")
    
    return {"message": "Removed from shortlist successfully"}

# Export Route
@api_router.get("/donations/export")
async def export_donors(
    current_user: dict = Depends(get_current_user),
    format: str = "csv",
    organ: Optional[str] = None,
    organs: Optional[str] = None,
    blood_groups: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    city: Optional[str] = None,
    state: Optional[str] = None
):
    """Export donor list to CSV"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can export donor data")
    
    # Reuse the filtering logic from get_all_donations
    all_applications = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    
    # Calculate age for each donor
    for app in all_applications:
        if app.get("date_of_birth"):
            dob = datetime.fromisoformat(app["date_of_birth"].replace("Z", "+00:00")) if isinstance(app["date_of_birth"], str) else app["date_of_birth"]
            if isinstance(dob, str):
                dob = datetime.strptime(dob, "%Y-%m-%d")
            today = datetime.now()
            age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
            app["age"] = age
    
    # Apply filters
    filtered_applications = all_applications
    
    if organ:
        filtered_applications = [app for app in filtered_applications if organ in app.get("organs", [])]
    
    if organs:
        organ_list = [o.strip() for o in organs.split(",")]
        filtered_applications = [app for app in filtered_applications if any(organ in app.get("organs", []) for organ in organ_list)]
    
    if blood_groups:
        blood_group_list = [bg.strip() for bg in blood_groups.split(",")]
        filtered_applications = [app for app in filtered_applications if app.get("blood_group") in blood_group_list]
    
    if age_min is not None:
        filtered_applications = [app for app in filtered_applications if app.get("age", 0) >= age_min]
    
    if age_max is not None:
        filtered_applications = [app for app in filtered_applications if app.get("age", 999) <= age_max]
    
    if city:
        filtered_applications = [app for app in filtered_applications if app.get("city", "").lower() == city.lower()]
    
    if state:
        filtered_applications = [app for app in filtered_applications if app.get("state", "").lower() == state.lower()]
    
    # Create CSV
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Name", "Email", "Phone", "Date of Birth", "Age", "Blood Group", 
        "Organs", "City", "State", "Country", "Registered Date"
    ])
    
    # Write data
    for app in filtered_applications:
        writer.writerow([
            app.get("full_name", ""),
            app.get("email", ""),
            app.get("phone", ""),
            app.get("date_of_birth", ""),
            app.get("age", ""),
            app.get("blood_group", ""),
            ", ".join(app.get("organs", [])),
            app.get("city", ""),
            app.get("state", ""),
            app.get("country", ""),
            app.get("created_at", "")
        ])
    
    # Return as streaming response
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=donors_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()