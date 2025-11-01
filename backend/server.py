from fastapi import FastAPI, APIRouter, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List
import uuid
from datetime import datetime
from auth_routes import router as auth_router
from models import (
    DonationApplication, DonationApplicationCreate, DonationApplicationUpdate,
    HospitalRequirement, HospitalRequirementCreate, HospitalRequirementUpdate
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
    organ: str = None,
    page: int = 1,
    limit: int = 10
):
    """Get all approved donor applications with pagination and filtering"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can view all donation applications")
    
    # Get all approved donors
    all_applications = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    
    # Filter by organ if specified
    if organ:
        filtered_applications = [
            app for app in all_applications 
            if organ in app.get("organs", [])
        ]
    else:
        filtered_applications = all_applications
    
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