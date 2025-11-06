from fastapi import FastAPI, APIRouter, Request, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
import uuid
from datetime import datetime
import io
import csv
from auth_routes import router as auth_router
from models import (
    DonationApplication, DonationApplicationCreate, DonationApplicationUpdate,
    HospitalRequirement, HospitalRequirementCreate, HospitalRequirementUpdate,
    ContactHistory, ContactHistoryCreate, Shortlist, ShortlistCreate,
    Notification, NotificationCreate,
    CommunityPost, CommunityPostCreate, CommunityPostUpdate,
    Event, EventCreate, EventUpdate,
    Resource, ResourceCreate, ResourceUpdate,
    MatchLog, AlgorithmConfig, AlgorithmConfigUpdate,
    BranchHospital, BranchHospitalCreate, BranchHospitalUpdate, BranchHospitalResponse,
    User
)
from auth_utils import get_current_user
from fastapi import Depends, HTTPException
from matching_service import (
    match_donors_for_requirement,
    match_requirements_for_donor
)
from notification_service import (
    create_notification,
    create_match_notification_for_hospital,
    create_match_notification_for_donor,
    create_status_change_notification,
    create_contact_notification_for_donor,
    create_new_requirement_notification,
    mark_notification_as_read,
    mark_all_notifications_as_read,
    get_user_notifications,
    get_unread_count,
    delete_notification
)
from match_logging_service import (
    log_match,
    get_match_logs,
    update_match_status,
    get_match_analytics,
    get_algorithm_config,
    update_algorithm_config
)
from activity_logging_service import (
    log_report_upload,
    log_eligibility_change,
    log_admin_status_update,
    get_activity_logs
)


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

# File serving route
from fastapi.responses import FileResponse

@api_router.get("/uploads/{folder}/{filename}")
async def serve_uploaded_file(folder: str, filename: str):
    """Serve uploaded files"""
    file_path = Path(f"/app/backend/uploads/{folder}/{filename}")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)

# Donation Application Routes
@api_router.post("/donations", response_model=DonationApplication)
async def create_donation_application(
    application: DonationApplicationCreate,
    current_user: dict = Depends(get_current_user),
    request: Request = None
):
    """Create a new donation application for the current donor with auto-assignment to branch hospital"""
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
    
    # Auto-assign branch hospital based on location
    from branch_assignment_service import find_nearest_branch_hospital
    
    branch_hospital = await find_nearest_branch_hospital(
        db=db,
        city=application.city or "",
        state=application.state or "",
        country=application.country or "USA"
    )
    
    if branch_hospital:
        # Assign branch hospital to donor
        await db.donation_applications.update_one(
            {"id": app_obj.id},
            {"$set": {
                "assigned_branch_hospital_id": branch_hospital["id"],
                "assigned_branch_hospital_name": branch_hospital["name"],
                "checkup_status": "pending_checkup",
                "updated_at": datetime.utcnow()
            }}
        )
        
        # Send email notification to donor
        from email_service import email_service
        email_sent = await email_service.send_donor_checkup_notification(
            donor_name=application.full_name,
            to_email=application.email,
            branch_hospital_name=branch_hospital["name"],
            branch_address=branch_hospital["address"],
            branch_city=branch_hospital["city"],
            branch_state=branch_hospital["state"],
            branch_phone=branch_hospital["contact_number"],
            branch_email=branch_hospital["email"]
        )
        
        # Send SMS notification to donor
        from sms_service import sms_service
        sms_sent = await sms_service.send_donor_checkup_sms(
            donor_name=application.full_name,
            to_phone=application.phone,
            branch_hospital_name=branch_hospital["name"],
            branch_address=f"{branch_hospital['address']}, {branch_hospital['city']}, {branch_hospital['state']}",
            branch_phone=branch_hospital["contact_number"]
        )
        
        logger.info(f"✅ Donor {application.full_name} assigned to branch hospital {branch_hospital['name']} (Email: {email_sent}, SMS: {sms_sent})")
        
        # Fetch updated application to return
        updated_app = await db.donation_applications.find_one({"id": app_obj.id})
        return DonationApplication(**updated_app)
    else:
        logger.warning(f"⚠️ No branch hospital available to assign to donor {application.full_name}")
        # Return application even if no branch hospital found
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

@api_router.get("/donations/me/branch-hospital")
async def get_my_assigned_branch_hospital(
    current_user: dict = Depends(get_current_user)
):
    """Get the branch hospital assigned to current donor"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can access this endpoint")
    
    # Get donor's application
    application = await db.donation_applications.find_one({"donor_id": current_user["id"]})
    if not application:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    # Check if branch hospital is assigned
    if not application.get("assigned_branch_hospital_id"):
        return {
            "assigned": False,
            "message": "No branch hospital assigned yet"
        }
    
    # Get branch hospital details
    branch_hospital = await db.branch_hospitals.find_one({"id": application["assigned_branch_hospital_id"]})
    
    if not branch_hospital:
        return {
            "assigned": False,
            "message": "Assigned branch hospital not found"
        }
    
    # Remove sensitive data
    branch_hospital.pop("auto_generated_password", None)
    
    return {
        "assigned": True,
        "branch_hospital": branch_hospital,
        "checkup_status": application.get("checkup_status", "none"),
        "checkup_date": application.get("checkup_date"),
        "eligibility_report_url": application.get("eligibility_report_url")
    }

@api_router.get("/donations/me/report")
async def download_my_eligibility_report(
    current_user: dict = Depends(get_current_user)
):
    """Download donor's eligibility report"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can download their reports")
    
    # Get donor's application
    application = await db.donation_applications.find_one({"donor_id": current_user["id"]})
    if not application:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    # Check if report exists
    report_url = application.get("eligibility_report_url")
    if not report_url:
        raise HTTPException(status_code=404, detail="No eligibility report available yet")
    
    # Extract filename from URL (format: /api/uploads/reports/filename.pdf)
    # Report URL is typically stored as relative path
    if report_url.startswith("/api/uploads/"):
        # Extract the path after /api/uploads/
        file_path_parts = report_url.replace("/api/uploads/", "").split("/")
        if len(file_path_parts) >= 2:
            folder = file_path_parts[0]
            filename = file_path_parts[1]
            file_path = Path(f"/app/backend/uploads/{folder}/{filename}")
        else:
            raise HTTPException(status_code=404, detail="Invalid report URL format")
    else:
        raise HTTPException(status_code=404, detail="Invalid report URL")
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Report file not found on server")
    
    # Return file for download
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/pdf"
    )

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
    
    old_status = application.get("status")
    
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
    
    # Send notification if status changed
    new_status = update_dict.get("status")
    if new_status and new_status != old_status:
        await create_status_change_notification(
            db=db,
            user_id=current_user["id"],
            status_type="Donation Application",
            old_status=old_status,
            new_status=new_status,
            item_name="donation application"
        )
    
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
    
    # Auto-match donors and send notifications
    all_donors = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    matches = match_donors_for_requirement(req_obj.model_dump(), all_donors)
    
    if len(matches) > 0:
        # Notify hospital about matches
        await create_match_notification_for_hospital(
            db=db,
            hospital_id=current_user["id"],
            requirement_id=req_obj.id,
            match_count=len(matches),
            requirement_details=req_obj.model_dump()
        )
        
        # Log matches and notify top matching donors
        for donor, score, breakdown in matches[:5]:  # Notify top 5 matches
            # Auto-log this match
            await log_match(
                db=db,
                match_type="donor_to_requirement",
                donor=donor,
                requirement=req_obj.model_dump(),
                match_score=score,
                score_breakdown=breakdown,
                status="auto_matched"
            )
            
            await create_new_requirement_notification(
                db=db,
                donor_id=donor["donor_id"],
                requirement_details=req_obj.model_dump()
            )
    
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
    
    # Get hospital name
    hospital = await db.users.find_one({"id": current_user["id"]})
    hospital_name = hospital.get("name", "A hospital") if hospital else "A hospital"
    
    # Create contact history
    contact_dict = contact_data.model_dump()
    contact_dict["hospital_id"] = current_user["id"]
    contact_dict["donor_name"] = donor.get("full_name", "")
    contact_dict["donor_email"] = donor.get("email", "")
    
    contact_obj = ContactHistory(**contact_dict)
    await db.contact_history.insert_one(contact_obj.model_dump())
    
    # Notify donor about contact
    await create_contact_notification_for_donor(
        db=db,
        donor_id=contact_data.donor_id,
        hospital_name=hospital_name,
        contact_method=contact_data.contact_method
    )
    
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

# Notification Routes
@api_router.get("/notifications/me", response_model=List[Notification])
async def get_my_notifications(
    current_user: dict = Depends(get_current_user),
    unread_only: bool = False,
    limit: int = 50
):
    """Get notifications for the current user"""
    notifications = await get_user_notifications(db, current_user["id"], unread_only, limit)
    return notifications

@api_router.get("/notifications/unread-count")
async def get_unread_notification_count(
    current_user: dict = Depends(get_current_user)
):
    """Get count of unread notifications"""
    count = await get_unread_count(db, current_user["id"])
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark a notification as read"""
    success = await mark_notification_as_read(db, notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

@api_router.put("/notifications/mark-all-read")
async def mark_all_read(
    current_user: dict = Depends(get_current_user)
):
    """Mark all notifications as read"""
    count = await mark_all_notifications_as_read(db, current_user["id"])
    return {"message": f"Marked {count} notifications as read"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification_endpoint(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a notification"""
    success = await delete_notification(db, notification_id, current_user["id"])
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification deleted"}

# Smart Matching Routes
@api_router.get("/matches/donors/all")
async def get_all_matched_donors(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get all matched donors across all hospital requirements (aggregated)"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can access donor matches")
    
    # Get all hospital's active requirements
    requirements = await db.hospital_requirements.find({
        "hospital_id": current_user["id"],
        "status": "active"
    }).to_list(1000)
    
    if not requirements:
        return {
            "matches": [],
            "total_matches": 0,
            "message": "No active requirements found"
        }
    
    # Get all approved donors
    all_donors = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    
    # Aggregate matches from all requirements
    donor_matches = {}  # donor_id -> {donor, best_score, requirements}
    
    for requirement in requirements:
        matches = match_donors_for_requirement(requirement, all_donors)
        
        for donor, score, breakdown in matches:
            donor_id = donor["donor_id"]
            
            if donor_id not in donor_matches:
                donor_matches[donor_id] = {
                    "donor": donor,
                    "best_score": score,
                    "matching_requirements": []
                }
            else:
                # Update best score if this is better
                if score > donor_matches[donor_id]["best_score"]:
                    donor_matches[donor_id]["best_score"] = score
            
            # Add requirement to matching list
            donor_matches[donor_id]["matching_requirements"].append({
                "requirement_id": requirement["id"],
                "patient_name": requirement["patient_name"],
                "organ_required": requirement["organ_required"],
                "blood_group": requirement["blood_group"],
                "urgency_level": requirement["urgency_level"],
                "match_score": score,
                "score_breakdown": breakdown
            })
    
    # Convert to list and sort by best score
    result = []
    for donor_data in donor_matches.values():
        result.append({
            "donor": DonationApplication(**donor_data["donor"]),
            "match_score": donor_data["best_score"],
            "matching_requirements": donor_data["matching_requirements"]
        })
    
    # Sort by match score descending
    result.sort(key=lambda x: x["match_score"], reverse=True)
    
    # Limit results
    result = result[:limit]
    
    return {
        "matches": result,
        "total_matches": len(result)
    }

@api_router.get("/matches/donors/{requirement_id}")
async def get_matched_donors(
    requirement_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get matched donors for a specific hospital requirement"""
    if current_user.get("role") != "hospital":
        raise HTTPException(status_code=403, detail="Only hospitals can access donor matches")
    
    # Get the requirement
    requirement = await db.hospital_requirements.find_one({
        "id": requirement_id,
        "hospital_id": current_user["id"]
    })
    
    if not requirement:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    # Get all approved donors
    all_donors = await db.donation_applications.find({"status": "approved"}).to_list(10000)
    
    # Match and score donors
    matches = match_donors_for_requirement(requirement, all_donors)
    
    # Limit results
    matches = matches[:limit]
    
    # Format response
    result = []
    for donor, score, breakdown in matches:
        result.append({
            "donor": DonationApplication(**donor),
            "match_score": score,
            "score_breakdown": breakdown
        })
    
    return {
        "requirement_id": requirement_id,
        "matches": result,
        "total_matches": len(result)
    }

@api_router.get("/matches/requirements/me")
async def get_matched_requirements(
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get matched hospital requirements for current donor"""
    if current_user.get("role") != "donor":
        raise HTTPException(status_code=403, detail="Only donors can access requirement matches")
    
    # Get donor's application
    donor_app = await db.donation_applications.find_one({"donor_id": current_user["id"]})
    
    if not donor_app:
        return {
            "matches": [],
            "total_matches": 0,
            "message": "Please complete your donation application first"
        }
    
    # Only match if application is approved
    if donor_app.get("status") != "approved":
        return {
            "matches": [],
            "total_matches": 0,
            "message": "Your application is pending approval"
        }
    
    # Get all active requirements
    all_requirements = await db.hospital_requirements.find({"status": "active"}).to_list(10000)
    
    # Match and score requirements
    matches = match_requirements_for_donor(donor_app, all_requirements)
    
    # Limit results
    matches = matches[:limit]
    
    # Format response
    result = []
    for requirement, score, breakdown in matches:
        result.append({
            "requirement": HospitalRequirement(**requirement),
            "match_score": score,
            "score_breakdown": breakdown
        })
    
    return {
        "matches": result,
        "total_matches": len(result)
    }

@api_router.post("/matches/refresh")
async def refresh_matches(
    current_user: dict = Depends(get_current_user)
):
    """Manually trigger match refresh and send notifications if new matches found"""
    
    if current_user.get("role") == "hospital":
        # Get all hospital's active requirements
        requirements = await db.hospital_requirements.find({
            "hospital_id": current_user["id"],
            "status": "active"
        }).to_list(1000)
        
        if not requirements:
            return {"message": "No active requirements to match", "new_matches": 0}
        
        # Get all approved donors
        all_donors = await db.donation_applications.find({"status": "approved"}).to_list(10000)
        
        total_new_matches = 0
        for requirement in requirements:
            matches = match_donors_for_requirement(requirement, all_donors)
            
            if len(matches) > 0:
                # Create notification for new matches
                await create_match_notification_for_hospital(
                    db=db,
                    hospital_id=current_user["id"],
                    requirement_id=requirement["id"],
                    match_count=len(matches),
                    requirement_details=requirement
                )
                total_new_matches += len(matches)
        
        return {
            "message": "Match refresh completed",
            "requirements_checked": len(requirements),
            "new_matches": total_new_matches
        }
    
    elif current_user.get("role") == "donor":
        # Get donor's application
        donor_app = await db.donation_applications.find_one({"donor_id": current_user["id"]})
        
        if not donor_app:
            raise HTTPException(status_code=404, detail="Please complete your donation application first")
        
        if donor_app.get("status") != "approved":
            raise HTTPException(status_code=400, detail="Your application is pending approval")
        
        # Get all active requirements
        all_requirements = await db.hospital_requirements.find({"status": "active"}).to_list(10000)
        
        # Match requirements
        matches = match_requirements_for_donor(donor_app, all_requirements)
        
        if len(matches) > 0:
            # Create notification for new matches
            await create_match_notification_for_donor(
                db=db,
                donor_id=current_user["id"],
                match_count=len(matches),
                donor_organs=donor_app.get("organs", [])
            )
        
        return {
            "message": "Match refresh completed",
            "new_matches": len(matches)
        }
    
    else:
        raise HTTPException(status_code=403, detail="Invalid user role")

# Admin Routes
@api_router.get("/admin/stats")
async def get_admin_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get admin dashboard statistics"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Count users by role
    all_users = await db.users.find({}).to_list(10000)
    total_users = len(all_users)
    donors_count = len([u for u in all_users if u.get("role") == "donor"])
    hospitals_count = len([u for u in all_users if u.get("role") == "hospital"])
    admins_count = len([u for u in all_users if u.get("role") == "admin"])
    
    # Count donation applications by status
    all_donations = await db.donation_applications.find({}).to_list(10000)
    total_donations = len(all_donations)
    pending_donations = len([d for d in all_donations if d.get("status") == "pending"])
    approved_donations = len([d for d in all_donations if d.get("status") == "approved"])
    active_donations = len([d for d in all_donations if d.get("status") == "active"])
    inactive_donations = len([d for d in all_donations if d.get("status") == "inactive"])
    cancelled_donations = len([d for d in all_donations if d.get("status") == "cancelled"])
    
    # Count by checkup status
    pending_checkup = len([d for d in all_donations if d.get("checkup_status") == "pending_checkup"])
    eligible_donors = len([d for d in all_donations if d.get("checkup_status") == "eligible"])
    not_eligible_donors = len([d for d in all_donations if d.get("checkup_status") == "not_eligible"])
    
    # Count hospital requirements by status
    all_requirements = await db.hospital_requirements.find({}).to_list(10000)
    total_requirements = len(all_requirements)
    active_requirements = len([r for r in all_requirements if r.get("status") == "active"])
    fulfilled_requirements = len([r for r in all_requirements if r.get("status") == "fulfilled"])
    cancelled_requirements = len([r for r in all_requirements if r.get("status") == "cancelled"])
    
    # Count matches (shortlist and contact history)
    all_shortlists = await db.shortlist.find({}).to_list(10000)
    all_contacts = await db.contact_history.find({}).to_list(10000)
    total_matches = len(all_shortlists)
    total_contacts = len(all_contacts)
    
    # Count community posts
    all_posts = await db.community_posts.find({}).to_list(10000)
    total_posts = len(all_posts)
    active_posts = len([p for p in all_posts if p.get("is_active")])
    flagged_posts = len([p for p in all_posts if p.get("is_flagged")])
    reels_count = len([p for p in all_posts if p.get("post_type") == "reel"])
    
    # Count events
    all_events = await db.events.find({}).to_list(10000)
    total_events = len(all_events)
    active_events = len([e for e in all_events if e.get("is_active")])
    
    # Count resources
    all_resources = await db.resources.find({}).to_list(10000)
    total_resources = len(all_resources)
    published_resources = len([r for r in all_resources if r.get("is_published")])
    
    return {
        "users": {
            "total": total_users,
            "donors": donors_count,
            "hospitals": hospitals_count,
            "admins": admins_count
        },
        "donations": {
            "total": total_donations,
            "pending": pending_donations,
            "approved": approved_donations,
            "active": active_donations,
            "inactive": inactive_donations,
            "cancelled": cancelled_donations,
            "pending_checkup": pending_checkup,
            "eligible_donors": eligible_donors,
            "not_eligible_donors": not_eligible_donors
        },
        "requirements": {
            "total": total_requirements,
            "active": active_requirements,
            "fulfilled": fulfilled_requirements,
            "cancelled": cancelled_requirements
        },
        "matches": {
            "total_shortlisted": total_matches,
            "total_contacts": total_contacts
        },
        "community": {
            "total_posts": total_posts,
            "active_posts": active_posts,
            "flagged_posts": flagged_posts,
            "reels_count": reels_count
        },
        "events": {
            "total_events": total_events,
            "active_events": active_events
        },
        "resources": {
            "total_resources": total_resources,
            "published_resources": published_resources
        }
    }

@api_router.get("/admin/users")
async def get_all_users_admin(
    current_user: dict = Depends(get_current_user),
    role: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all users with filtering (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build filter
    filter_dict = {}
    if role:
        filter_dict["role"] = role
    
    # Get all users
    all_users = await db.users.find(filter_dict).to_list(10000)
    
    # Remove hashed passwords from response
    for user in all_users:
        user.pop("hashed_password", None)
    
    # Pagination
    total = len(all_users)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_users = all_users[start_idx:end_idx]
    
    return {
        "users": paginated_users,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.put("/admin/users/{user_id}")
async def update_user_admin(
    user_id: str,
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update any user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Don't allow updating password this way
    updates.pop("hashed_password", None)
    updates.pop("password", None)
    updates["updated_at"] = datetime.utcnow()
    
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": updates}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id})
    updated_user.pop("hashed_password", None)
    
    return {"message": "User updated successfully", "user": updated_user}

@api_router.delete("/admin/users/{user_id}")
async def delete_user_admin(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any user (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.get("/admin/donations")
async def get_all_donations_admin(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all donation applications (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build filter
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    
    # Get all donations
    all_donations = await db.donation_applications.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_donations)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_donations = all_donations[start_idx:end_idx]
    
    return {
        "donations": [DonationApplication(**d) for d in paginated_donations],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.put("/admin/donations/{donation_id}")
async def update_donation_admin(
    donation_id: str,
    updates: DonationApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update any donation application (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    donation = await db.donation_applications.find_one({"id": donation_id})
    if not donation:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    old_status = donation.get("status")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.donation_applications.update_one(
        {"id": donation_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update application")
    
    # Fetch updated donation
    updated_donation = await db.donation_applications.find_one({"id": donation_id})
    
    # Send notification if status changed
    new_status = update_dict.get("status")
    if new_status and new_status != old_status:
        await create_status_change_notification(
            db=db,
            user_id=donation.get("donor_id"),
            status_type="Donation Application",
            old_status=old_status,
            new_status=new_status,
            item_name="donation application"
        )
    
    return {"message": "Donation application updated successfully", "donation": DonationApplication(**updated_donation)}

@api_router.delete("/admin/donations/{donation_id}")
async def delete_donation_admin(
    donation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any donation application (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.donation_applications.delete_one({"id": donation_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Donation application not found")
    
    return {"message": "Donation application deleted successfully"}

@api_router.get("/admin/donation-applications")
async def get_donation_applications_for_admin(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 50
):
    """Get all donation applications for admin review"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get ALL donation applications (not just pending)
    all_applications = await db.donation_applications.find({}).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_applications)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_applications = all_applications[start_idx:end_idx]
    
    return {
        "applications": [DonationApplication(**app) for app in paginated_applications],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/donors/{donor_id}")
async def get_donor_details_admin(
    donor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed donor information (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get donor application
    donor = await db.donation_applications.find_one({"donor_id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    # Get donor user info
    user = await db.users.find_one({"id": donor_id})
    
    # Get branch hospital info if assigned
    branch_hospital = None
    if donor.get("assigned_branch_hospital_id"):
        branch_hospital = await db.branch_hospitals.find_one({"id": donor["assigned_branch_hospital_id"]})
        if branch_hospital:
            branch_hospital.pop("auto_generated_password", None)
    
    return {
        "donor": DonationApplication(**donor),
        "user": user,
        "branch_hospital": branch_hospital
    }

@api_router.put("/admin/donors/{donor_id}")
async def update_donor_admin(
    donor_id: str,
    updates: DonationApplicationUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update donor information (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    donor = await db.donation_applications.find_one({"donor_id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    old_status = donor.get("status")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.donation_applications.update_one(
        {"donor_id": donor_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update donor")
    
    # Fetch updated donor
    updated_donor = await db.donation_applications.find_one({"donor_id": donor_id})
    
    # Send notification if status changed
    new_status = update_dict.get("status")
    if new_status and new_status != old_status:
        await create_status_change_notification(
            db=db,
            user_id=donor_id,
            status_type="Donor Application",
            old_status=old_status,
            new_status=new_status,
            item_name="donor application"
        )
    
    return {"message": "Donor updated successfully", "donor": DonationApplication(**updated_donor)}

@api_router.put("/admin/donors/{donor_id}/status")
async def update_donor_status_admin(
    donor_id: str,
    status_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update donor status manually (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    new_status = status_data.get("status")
    if new_status not in ["pending", "approved", "active", "inactive", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    donor = await db.donation_applications.find_one({"donor_id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    old_status = donor.get("status")
    
    result = await db.donation_applications.update_one(
        {"donor_id": donor_id},
        {"$set": {
            "status": new_status,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update status")
    
    # Log activity (critical action)
    await log_admin_status_update(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        donor_id=donor_id,
        donor_name=donor.get("full_name", "Unknown"),
        old_status=old_status,
        new_status=new_status,
        action="status_update"
    )
    
    # Notify donor
    await create_status_change_notification(
        db=db,
        user_id=donor_id,
        status_type="Donor Status",
        old_status=old_status,
        new_status=new_status,
        item_name="donor status"
    )
    
    return {"message": f"Donor status updated to {new_status}", "status": new_status}

@api_router.delete("/admin/donors/{donor_id}")
async def remove_donor_admin(
    donor_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove/deactivate donor (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    donor = await db.donation_applications.find_one({"donor_id": donor_id})
    if not donor:
        raise HTTPException(status_code=404, detail="Donor not found")
    
    # Instead of hard delete, mark as inactive/cancelled
    result = await db.donation_applications.update_one(
        {"donor_id": donor_id},
        {"$set": {
            "status": "inactive",
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to remove donor")
    
    return {"message": "Donor removed from active database (marked as inactive)"}

@api_router.get("/admin/requirements")
async def get_all_requirements_admin(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all hospital requirements (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build filter
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    
    # Get all requirements
    all_requirements = await db.hospital_requirements.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_requirements)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_requirements = all_requirements[start_idx:end_idx]
    
    return {
        "requirements": [HospitalRequirement(**r) for r in paginated_requirements],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.put("/admin/requirements/{requirement_id}")
async def update_requirement_admin(
    requirement_id: str,
    updates: HospitalRequirementUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update any hospital requirement (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    requirement = await db.hospital_requirements.find_one({"id": requirement_id})
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
    
    # Fetch updated requirement
    updated_requirement = await db.hospital_requirements.find_one({"id": requirement_id})
    
    return {"message": "Requirement updated successfully", "requirement": HospitalRequirement(**updated_requirement)}

@api_router.delete("/admin/requirements/{requirement_id}")
async def delete_requirement_admin(
    requirement_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any hospital requirement (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.hospital_requirements.delete_one({"id": requirement_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Requirement not found")
    
    return {"message": "Requirement deleted successfully"}

@api_router.get("/admin/analytics")
async def get_admin_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Get match analytics (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get all shortlists
    all_shortlists = await db.shortlist.find({}).sort("added_at", -1).to_list(100)
    
    # Get all contact history
    all_contacts = await db.contact_history.find({}).sort("contacted_at", -1).to_list(100)
    
    # Get recent activity from notifications
    recent_notifications = await db.notifications.find({}).sort("created_at", -1).to_list(50)
    
    return {
        "shortlists": [Shortlist(**s) for s in all_shortlists],
        "contacts": [ContactHistory(**c) for c in all_contacts],
        "recent_activity": [Notification(**n) for n in recent_notifications]
    }

@api_router.get("/admin/activity")
async def get_recent_activity(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """Get recent activity feed (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Collect recent items from different collections
    recent_donations = await db.donation_applications.find({}).sort("created_at", -1).to_list(20)
    recent_requirements = await db.hospital_requirements.find({}).sort("created_at", -1).to_list(20)
    recent_contacts = await db.contact_history.find({}).sort("contacted_at", -1).to_list(20)
    
    # Format activity items
    activity = []
    
    for donation in recent_donations:
        activity.append({
            "type": "donation",
            "action": f"New donation application: {donation.get('full_name')}",
            "status": donation.get("status"),
            "timestamp": donation.get("created_at"),
            "id": donation.get("id")
        })
    
    for req in recent_requirements:
        activity.append({
            "type": "requirement",
            "action": f"New requirement: {req.get('organ_required')} for {req.get('patient_name')}",
            "status": req.get("status"),
            "timestamp": req.get("created_at"),
            "id": req.get("id")
        })
    
    for contact in recent_contacts:
        activity.append({
            "type": "contact",
            "action": f"Hospital contacted donor: {contact.get('donor_name')}",
            "status": "completed",
            "timestamp": contact.get("contacted_at"),
            "id": contact.get("id")
        })
    
    # Sort by timestamp and limit
    activity.sort(key=lambda x: x.get("timestamp", datetime.min), reverse=True)
    activity = activity[:limit]
    
    return {"activity": activity}

@api_router.get("/admin/activity-logs")
async def get_admin_activity_logs(
    current_user: dict = Depends(get_current_user),
    activity_type: Optional[str] = None,
    limit: int = 100
):
    """Get critical activity logs (report uploads, eligibility changes, admin updates)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await get_activity_logs(db, limit=limit, activity_type=activity_type)
    
    return {
        "logs": logs,
        "total": len(logs)
    }

# ============================================
# COMMUNITY POSTS ROUTES
# ============================================

@api_router.get("/community-posts")
async def get_community_posts(
    post_type: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all community posts (public access)"""
    filter_dict = {"is_active": True}
    if post_type:
        filter_dict["post_type"] = post_type
    
    all_posts = await db.community_posts.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_posts)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_posts = all_posts[start_idx:end_idx]
    
    return {
        "posts": [CommunityPost(**post) for post in paginated_posts],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/community-posts", response_model=CommunityPost)
async def create_community_post(
    post_data: CommunityPostCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new community post"""
    post_dict = post_data.model_dump()
    post_dict["user_id"] = current_user["id"]
    post_dict["author_name"] = current_user["name"]
    
    post_obj = CommunityPost(**post_dict)
    await db.community_posts.insert_one(post_obj.model_dump())
    
    return post_obj

@api_router.put("/community-posts/{post_id}/like")
async def like_community_post(post_id: str):
    """Like a community post (public access for now)"""
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    result = await db.community_posts.update_one(
        {"id": post_id},
        {"$set": {"likes": post.get("likes", 0) + 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to like post")
    
    return {"message": "Post liked successfully"}

@api_router.delete("/community-posts/{post_id}")
async def delete_community_post(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete own community post"""
    post = await db.community_posts.find_one({"id": post_id, "user_id": current_user["id"]})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found or unauthorized")
    
    result = await db.community_posts.delete_one({"id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete post")
    
    return {"message": "Post deleted successfully"}

# Admin Community Post Routes
@api_router.get("/admin/community-posts")
async def get_all_community_posts_admin(
    current_user: dict = Depends(get_current_user),
    post_type: Optional[str] = None,
    is_flagged: Optional[bool] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all community posts (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filter_dict = {}
    if post_type:
        filter_dict["post_type"] = post_type
    if is_flagged is not None:
        filter_dict["is_flagged"] = is_flagged
    
    all_posts = await db.community_posts.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_posts)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_posts = all_posts[start_idx:end_idx]
    
    return {
        "posts": [CommunityPost(**post) for post in paginated_posts],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.put("/admin/community-posts/{post_id}")
async def update_community_post_admin(
    post_id: str,
    updates: CommunityPostUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update any community post (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    post = await db.community_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.community_posts.update_one(
        {"id": post_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update post")
    
    updated_post = await db.community_posts.find_one({"id": post_id})
    return {"message": "Post updated successfully", "post": CommunityPost(**updated_post)}

@api_router.delete("/admin/community-posts/{post_id}")
async def delete_community_post_admin(
    post_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any community post (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.community_posts.delete_one({"id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted successfully"}

# ============================================
# EVENTS ROUTES
# ============================================

@api_router.get("/events")
async def get_events(
    page: int = 1,
    limit: int = 50
):
    """Get all active events (public access)"""
    all_events = await db.events.find({"is_active": True}).sort("date", 1).to_list(10000)
    
    # Pagination
    total = len(all_events)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_events = all_events[start_idx:end_idx]
    
    return {
        "events": [Event(**event) for event in paginated_events],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/events", response_model=Event)
async def create_event(
    event_data: EventCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new event"""
    event_dict = event_data.model_dump()
    event_dict["organizer_id"] = current_user["id"]
    event_dict["organizer_name"] = current_user["name"]
    
    event_obj = Event(**event_dict)
    await db.events.insert_one(event_obj.model_dump())
    
    return event_obj

@api_router.put("/events/{event_id}/attend")
async def attend_event(event_id: str):
    """Register attendance for an event (public access for now)"""
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": {"attendees_count": event.get("attendees_count", 0) + 1}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to register attendance")
    
    return {"message": "Attendance registered successfully"}

@api_router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete own event"""
    event = await db.events.find_one({"id": event_id, "organizer_id": current_user["id"]})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found or unauthorized")
    
    result = await db.events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete event")
    
    return {"message": "Event deleted successfully"}

# Admin Event Routes
@api_router.get("/admin/events")
async def get_all_events_admin(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 50
):
    """Get all events (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_events = await db.events.find({}).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_events)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_events = all_events[start_idx:end_idx]
    
    return {
        "events": [Event(**event) for event in paginated_events],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/admin/events", response_model=Event)
async def create_event_admin(
    event_data: EventCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new event (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    event_dict = event_data.model_dump()
    event_dict["organizer_id"] = current_user["id"]
    event_dict["organizer_name"] = current_user["name"]
    
    event_obj = Event(**event_dict)
    await db.events.insert_one(event_obj.model_dump())
    
    return event_obj

@api_router.put("/admin/events/{event_id}")
async def update_event_admin(
    event_id: str,
    updates: EventUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update any event (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    event = await db.events.find_one({"id": event_id})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.events.update_one(
        {"id": event_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update event")
    
    updated_event = await db.events.find_one({"id": event_id})
    return {"message": "Event updated successfully", "event": Event(**updated_event)}

@api_router.delete("/admin/events/{event_id}")
async def delete_event_admin(
    event_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any event (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.events.delete_one({"id": event_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    
    return {"message": "Event deleted successfully"}

# ============================================
# RESOURCES/ARTICLES ROUTES
# ============================================

@api_router.get("/resources")
async def get_resources(
    category: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all published resources (public access)"""
    filter_dict = {"is_published": True}
    if category:
        filter_dict["category"] = category
    
    all_resources = await db.resources.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_resources)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_resources = all_resources[start_idx:end_idx]
    
    return {
        "resources": [Resource(**resource) for resource in paginated_resources],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

# Admin Resource Routes
@api_router.get("/admin/resources")
async def get_all_resources_admin(
    current_user: dict = Depends(get_current_user),
    page: int = 1,
    limit: int = 50
):
    """Get all resources (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    all_resources = await db.resources.find({}).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_resources)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_resources = all_resources[start_idx:end_idx]
    
    return {
        "resources": [Resource(**resource) for resource in paginated_resources],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.post("/admin/resources", response_model=Resource)
async def create_resource_admin(
    resource_data: ResourceCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new resource (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    resource_dict = resource_data.model_dump()
    resource_dict["author_id"] = current_user["id"]
    resource_dict["author_name"] = current_user["name"]
    
    resource_obj = Resource(**resource_dict)
    await db.resources.insert_one(resource_obj.model_dump())
    
    return resource_obj

@api_router.put("/admin/resources/{resource_id}")
async def update_resource_admin(
    resource_id: str,
    updates: ResourceUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update any resource (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    resource = await db.resources.find_one({"id": resource_id})
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.resources.update_one(
        {"id": resource_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update resource")
    
    updated_resource = await db.resources.find_one({"id": resource_id})
    return {"message": "Resource updated successfully", "resource": Resource(**updated_resource)}

@api_router.delete("/admin/resources/{resource_id}")
async def delete_resource_admin(
    resource_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete any resource (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.resources.delete_one({"id": resource_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    return {"message": "Resource deleted successfully"}


# ============================================
# BRANCH HOSPITAL MANAGEMENT ROUTES (Admin Only)
# ============================================

@api_router.post("/admin/branch-hospitals", response_model=dict)
async def create_branch_hospital(
    branch_data: BranchHospitalCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new branch hospital (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if email already exists
    existing_user = await db.users.find_one({"email": branch_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if license number already exists
    existing_branch = await db.branch_hospitals.find_one({"license_number": branch_data.license_number})
    if existing_branch:
        raise HTTPException(status_code=400, detail="License number already exists")
    
    # Generate random secure password
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    auto_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    # Create user account for branch hospital
    from auth_utils import get_password_hash
    branch_user = User(
        email=branch_data.email,
        hashed_password=get_password_hash(auto_password),
        role="branch_hospital",
        name=branch_data.name,
        mobile=branch_data.contact_number,
        mobile_verified=True,
        is_active=True
    )
    await db.users.insert_one(branch_user.model_dump())
    
    # Create branch hospital record with SAME ID as user for consistency
    from models import BranchHospital
    branch_hospital = BranchHospital(
        id=branch_user.id,  # Use same ID as the user account
        name=branch_data.name,
        email=branch_data.email,
        license_number=branch_data.license_number,
        address=branch_data.address,
        city=branch_data.city,
        state=branch_data.state,
        country=branch_data.country,
        contact_number=branch_data.contact_number,
        contact_person=branch_data.contact_person,
        auto_generated_password=auto_password,  # Store temporarily
        created_by_admin_id=current_user["id"],
        created_by_admin_name=current_user.get("name", "Admin")
    )
    
    await db.branch_hospitals.insert_one(branch_hospital.model_dump())
    
    # Send credentials via email
    from email_service import email_service
    email_sent = await email_service.send_branch_hospital_credentials(
        branch_hospital_name=branch_data.name,
        to_email=branch_data.email,
        login_email=branch_data.email,
        password=auto_password,
        license_number=branch_data.license_number
    )
    
    logger.info(f"Branch hospital created: {branch_data.name} by admin {current_user.get('name')}")
    
    # Return branch hospital with credentials (only this once)
    return {
        "message": "Branch hospital created successfully",
        "branch_hospital": {
            "id": branch_hospital.id,
            "name": branch_hospital.name,
            "email": branch_hospital.email,
            "license_number": branch_hospital.license_number,
            "address": branch_hospital.address,
            "city": branch_hospital.city,
            "state": branch_hospital.state,
            "country": branch_hospital.country,
            "contact_number": branch_hospital.contact_number,
            "contact_person": branch_hospital.contact_person,
            "is_active": branch_hospital.is_active,
            "created_at": branch_hospital.created_at
        },
        "credentials": {
            "email": branch_data.email,
            "password": auto_password
        },
        "email_sent": email_sent
    }

@api_router.get("/admin/branch-hospitals")
async def get_all_branch_hospitals(
    current_user: dict = Depends(get_current_user),
    is_active: Optional[bool] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all branch hospitals (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build filter
    filter_dict = {}
    if is_active is not None:
        filter_dict["is_active"] = is_active
    
    # Get all branch hospitals
    all_branches = await db.branch_hospitals.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Remove passwords from response
    for branch in all_branches:
        branch.pop("auto_generated_password", None)
    
    # Pagination
    total = len(all_branches)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_branches = all_branches[start_idx:end_idx]
    
    from models import BranchHospitalResponse
    return {
        "branch_hospitals": [BranchHospitalResponse(**branch) for branch in paginated_branches],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit
    }

@api_router.get("/admin/branch-hospitals/{branch_id}")
async def get_branch_hospital(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific branch hospital details (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    branch = await db.branch_hospitals.find_one({"id": branch_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch hospital not found")
    
    # Remove password from response
    branch.pop("auto_generated_password", None)
    
    from models import BranchHospitalResponse
    return BranchHospitalResponse(**branch)

@api_router.put("/admin/branch-hospitals/{branch_id}")
async def update_branch_hospital(
    branch_id: str,
    updates: BranchHospitalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update branch hospital details (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    branch = await db.branch_hospitals.find_one({"id": branch_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch hospital not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.branch_hospitals.update_one(
        {"id": branch_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update branch hospital")
    
    # If name or contact is updated, also update the user account
    if "name" in update_dict or "contact_number" in update_dict:
        user_updates = {}
        if "name" in update_dict:
            user_updates["name"] = update_dict["name"]
        if "contact_number" in update_dict:
            user_updates["mobile"] = update_dict["contact_number"]
        
        if user_updates:
            await db.users.update_one(
                {"email": branch["email"]},
                {"$set": user_updates}
            )
    
    # Fetch updated branch hospital
    updated_branch = await db.branch_hospitals.find_one({"id": branch_id})
    updated_branch.pop("auto_generated_password", None)
    
    from models import BranchHospitalResponse
    return {
        "message": "Branch hospital updated successfully",
        "branch_hospital": BranchHospitalResponse(**updated_branch)
    }

@api_router.delete("/admin/branch-hospitals/{branch_id}")
async def delete_branch_hospital(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete branch hospital (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    branch = await db.branch_hospitals.find_one({"id": branch_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch hospital not found")
    
    # Delete branch hospital record
    result = await db.branch_hospitals.delete_one({"id": branch_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Failed to delete branch hospital")
    
    # Also delete the associated user account
    await db.users.delete_one({"email": branch["email"]})
    
    logger.info(f"Branch hospital deleted: {branch['name']} by admin {current_user.get('name')}")
    
    return {"message": "Branch hospital deleted successfully"}

@api_router.post("/admin/branch-hospitals/{branch_id}/reset-password")
async def reset_branch_hospital_password(
    branch_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Reset branch hospital password and send new credentials (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    branch = await db.branch_hospitals.find_one({"id": branch_id})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch hospital not found")
    
    # Generate new password
    import secrets
    import string
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    new_password = ''.join(secrets.choice(alphabet) for i in range(12))
    
    # Update user password
    from auth_utils import get_password_hash
    await db.users.update_one(
        {"email": branch["email"]},
        {"$set": {"hashed_password": get_password_hash(new_password)}}
    )
    
    # Update branch hospital record
    await db.branch_hospitals.update_one(
        {"id": branch_id},
        {"$set": {
            "auto_generated_password": new_password,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Send new credentials via email
    from email_service import email_service
    email_sent = await email_service.send_branch_hospital_credentials(
        branch_hospital_name=branch["name"],
        to_email=branch["email"],
        login_email=branch["email"],
        password=new_password,
        license_number=branch["license_number"]
    )
    
    logger.info(f"Password reset for branch hospital: {branch['name']} by admin {current_user.get('name')}")
    
    return {
        "message": "Password reset successfully",
        "credentials": {
            "email": branch["email"],
            "password": new_password
        },
        "email_sent": email_sent
    }

# ============================================
# BRANCH HOSPITAL DASHBOARD ROUTES
# ============================================

@api_router.get("/branch-hospital/assigned-donors")
async def get_assigned_donors(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all donors assigned to the current branch hospital"""
    if current_user.get("role") != "branch_hospital":
        raise HTTPException(status_code=403, detail="Branch hospital access required")
    
    # Get branch hospital record to find its ID
    branch_hospital = await db.branch_hospitals.find_one({"email": current_user["email"]})
    if not branch_hospital:
        raise HTTPException(status_code=404, detail="Branch hospital record not found")
    
    # Build filter
    filter_dict = {"assigned_branch_hospital_id": branch_hospital["id"]}
    
    # Filter by checkup status if provided
    if status:
        filter_dict["checkup_status"] = status
    
    # Get all assigned donors
    all_donors = await db.donation_applications.find(filter_dict).sort("created_at", -1).to_list(10000)
    
    # Pagination
    total = len(all_donors)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_donors = all_donors[start_idx:end_idx]
    
    return {
        "donors": [DonationApplication(**donor) for donor in paginated_donors],
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "branch_hospital_name": branch_hospital["name"]
    }

@api_router.post("/branch-hospital/donors/{donor_id}/upload-report")
async def upload_eligibility_report(
    donor_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload eligibility report for a donor"""
    if current_user.get("role") != "branch_hospital":
        raise HTTPException(status_code=403, detail="Branch hospital access required")
    
    # Get branch hospital record
    branch_hospital = await db.branch_hospitals.find_one({"email": current_user["email"]})
    if not branch_hospital:
        raise HTTPException(status_code=404, detail="Branch hospital record not found")
    
    # Verify donor is assigned to this branch hospital
    donor = await db.donation_applications.find_one({
        "donor_id": donor_id,
        "assigned_branch_hospital_id": branch_hospital["id"]
    })
    
    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found or not assigned to your branch hospital"
        )
    
    # Upload file
    from file_upload_service import file_upload_service
    
    try:
        file_url, file_path = await file_upload_service.upload_file(file, folder="reports")
        
        # Update donor record with report URL
        await db.donation_applications.update_one(
            {"donor_id": donor_id},
            {"$set": {
                "eligibility_report_url": file_url,
                "checkup_status": "completed",
                "checkup_date": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }}
        )
        
        logger.info(f"✅ Eligibility report uploaded for donor {donor_id} by {branch_hospital['name']}")
        
        # Log activity (critical action)
        await log_report_upload(
            db=db,
            branch_hospital_id=branch_hospital["id"],
            branch_hospital_name=branch_hospital["name"],
            donor_id=donor_id,
            donor_name=donor["full_name"],
            report_filename=file.filename
        )
        
        # Notify donor
        await create_notification(
            db=db,
            user_id=donor["donor_id"],
            notification_type="general",
            title="Eligibility Report Uploaded",
            message=f"Your eligibility report has been uploaded by {branch_hospital['name']}. We're reviewing it now.",
            link="/donor-dashboard"
        )
        
        return {
            "message": "Report uploaded successfully",
            "file_url": file_url,
            "donor_id": donor_id
        }
        
    except HTTPException as e:
        raise e
    except Exception as e:
        logger.error(f"❌ Error uploading report: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to upload report: {str(e)}")

@api_router.put("/branch-hospital/donors/{donor_id}/mark-eligibility")
async def mark_donor_eligibility(
    donor_id: str,
    eligibility_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Mark donor as eligible or not eligible"""
    if current_user.get("role") != "branch_hospital":
        raise HTTPException(status_code=403, detail="Branch hospital access required")
    
    # Validate input
    eligibility_status = eligibility_data.get("eligibility_status")
    if eligibility_status not in ["eligible", "not_eligible"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid eligibility status. Must be 'eligible' or 'not_eligible'"
        )
    
    notes = eligibility_data.get("notes", "")
    
    # Get branch hospital record
    branch_hospital = await db.branch_hospitals.find_one({"email": current_user["email"]})
    if not branch_hospital:
        raise HTTPException(status_code=404, detail="Branch hospital record not found")
    
    # Verify donor is assigned to this branch hospital
    donor = await db.donation_applications.find_one({
        "donor_id": donor_id,
        "assigned_branch_hospital_id": branch_hospital["id"]
    })
    
    if not donor:
        raise HTTPException(
            status_code=404,
            detail="Donor not found or not assigned to your branch hospital"
        )
    
    # Store old status for activity logging
    old_checkup_status = donor.get("checkup_status", "none")
    
    # Update donor record
    update_data = {
        "checkup_status": eligibility_status,
        "updated_at": datetime.utcnow()
    }
    
    # Update status based on eligibility
    if eligibility_status == "eligible":
        update_data["status"] = "active"  # Active donors are eligible
    else:
        update_data["status"] = "inactive"  # Inactive donors are not eligible
    
    await db.donation_applications.update_one(
        {"donor_id": donor_id},
        {"$set": update_data}
    )
    
    logger.info(f"✅ Donor {donor_id} marked as {eligibility_status} by {branch_hospital['name']}")
    
    # Log activity (critical action)
    await log_eligibility_change(
        db=db,
        branch_hospital_id=branch_hospital["id"],
        branch_hospital_name=branch_hospital["name"],
        donor_id=donor_id,
        donor_name=donor["full_name"],
        old_status=old_checkup_status,
        new_status=eligibility_status
    )
    
    # Send email notification to donor
    from email_service import email_service
    email_sent = await email_service.send_donor_eligibility_notification(
        donor_name=donor["full_name"],
        to_email=donor["email"],
        eligibility_status=eligibility_status,
        branch_hospital_name=branch_hospital["name"],
        report_url=donor.get("eligibility_report_url")
    )
    
    # Create in-app notification for donor
    if eligibility_status == "eligible":
        notification_title = "Congratulations! You're Eligible"
        notification_message = f"Your eligibility has been confirmed by {branch_hospital['name']}. Your profile is now active in our donor database!"
    else:
        notification_title = "Eligibility Update"
        notification_message = f"Your eligibility assessment has been completed by {branch_hospital['name']}. Please check your email for details."
    
    await create_notification(
        db=db,
        user_id=donor["donor_id"],
        notification_type="status_change",
        title=notification_title,
        message=notification_message,
        link="/donor-dashboard"
    )
    
    # Notify admins about eligibility status change
    admins = await db.users.find({"role": "admin"}).to_list(100)
    for admin in admins:
        if eligibility_status == "not_eligible":
            await create_notification(
                db=db,
                user_id=admin["id"],
                notification_type="general",
                title="Donor Marked Not Eligible",
                message=f"Donor {donor['full_name']} has been marked as not eligible by {branch_hospital['name']}.",
                link="/admin/donations"
            )
        else:
            await create_notification(
                db=db,
                user_id=admin["id"],
                notification_type="general",
                title="Donor Marked Eligible",
                message=f"Donor {donor['full_name']} has been marked as eligible by {branch_hospital['name']} and is now active.",
                link="/admin/donations"
            )
    
    return {
        "message": f"Donor marked as {eligibility_status} successfully",
        "donor_id": donor_id,
        "eligibility_status": eligibility_status,
        "email_sent": email_sent
    }

@api_router.get("/branch-hospital/dashboard-stats")
async def get_branch_hospital_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard statistics for branch hospital"""
    if current_user.get("role") != "branch_hospital":
        raise HTTPException(status_code=403, detail="Branch hospital access required")
    
    # Get branch hospital record
    branch_hospital = await db.branch_hospitals.find_one({"email": current_user["email"]})
    if not branch_hospital:
        raise HTTPException(status_code=404, detail="Branch hospital record not found")
    
    # Get all assigned donors
    all_assigned = await db.donation_applications.find({
        "assigned_branch_hospital_id": branch_hospital["id"]
    }).to_list(10000)
    
    # Calculate statistics
    total_assigned = len(all_assigned)
    pending_checkup = len([d for d in all_assigned if d.get("checkup_status") == "pending_checkup"])
    completed = len([d for d in all_assigned if d.get("checkup_status") == "completed"])
    eligible = len([d for d in all_assigned if d.get("checkup_status") == "eligible"])
    not_eligible = len([d for d in all_assigned if d.get("checkup_status") == "not_eligible"])
    
    return {
        "branch_hospital_name": branch_hospital["name"],
        "total_assigned_donors": total_assigned,
        "pending_checkup": pending_checkup,
        "checkup_completed": completed,
        "eligible_donors": eligible,
        "not_eligible_donors": not_eligible
    }

# ============================================
# PHASE 3A - MATCHING INSIGHTS ROUTES
# ============================================

@api_router.get("/admin/match-logs")
async def get_match_logs_endpoint(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    hospital_id: Optional[str] = None,
    page: int = 1,
    limit: int = 50
):
    """Get all match logs with filtering (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Build filters
    filters = {}
    if status:
        filters["status"] = status
    if hospital_id:
        filters["hospital_id"] = hospital_id
    
    result = await get_match_logs(db, filters, page, limit)
    
    from models import MatchLog
    result["logs"] = [MatchLog(**log) for log in result["logs"]]
    
    return result

@api_router.put("/admin/match-logs/{match_log_id}/approve")
async def approve_match(
    match_log_id: str,
    current_user: dict = Depends(get_current_user),
    admin_notes: Optional[str] = None
):
    """Manually approve a match (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await update_match_status(
        db=db,
        match_log_id=match_log_id,
        new_status="manually_approved",
        admin_id=current_user["id"],
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Match log not found")
    
    return {"message": "Match approved successfully"}

@api_router.put("/admin/match-logs/{match_log_id}/reject")
async def reject_match(
    match_log_id: str,
    current_user: dict = Depends(get_current_user),
    admin_notes: Optional[str] = None
):
    """Manually reject a match (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    success = await update_match_status(
        db=db,
        match_log_id=match_log_id,
        new_status="manually_rejected",
        admin_id=current_user["id"],
        admin_notes=admin_notes
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Match log not found")
    
    return {"message": "Match rejected successfully"}

@api_router.get("/admin/match-analytics")
async def get_match_analytics_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get match performance analytics (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics = await get_match_analytics(db)
    return analytics

@api_router.get("/admin/algorithm-config")
async def get_algorithm_config_endpoint(
    current_user: dict = Depends(get_current_user)
):
    """Get current algorithm configuration (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await get_algorithm_config(db)
    return config

@api_router.put("/admin/algorithm-config")
async def update_algorithm_config_endpoint(
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update algorithm configuration (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await update_algorithm_config(db, updates, current_user["id"])
    
    if not config:
        raise HTTPException(status_code=500, detail="Failed to update algorithm configuration")
    
    return {"message": "Algorithm configuration updated successfully", "config": config}


# ============================================
# ENHANCED ADMIN ENDPOINTS
# ============================================

from admin_service import (
    get_platform_analytics,
    get_activity_logs,
    get_audit_logs,
    create_audit_log,
    bulk_approve_donations,
    bulk_reject_donations,
    get_user_activity_timeline,
    create_activity_log
)

# Advanced Analytics Endpoint
@api_router.get("/admin/analytics/detailed")
async def get_detailed_analytics(
    current_user: dict = Depends(get_current_user)
):
    """Get comprehensive platform analytics with charts data"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics = await get_platform_analytics(db)
    return analytics

# Activity Logs Endpoint
@api_router.get("/admin/activity-logs")
async def get_activity_logs_endpoint(
    current_user: dict = Depends(get_current_user),
    limit: int = 50,
    activity_type: Optional[str] = None,
    user_role: Optional[str] = None,
    days: Optional[int] = None
):
    """Get activity logs with filtering"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await get_activity_logs(
        db=db,
        limit=limit,
        activity_type=activity_type,
        user_role=user_role,
        days=days
    )
    
    return {"logs": logs, "total": len(logs)}

# Audit Logs Endpoint
@api_router.get("/admin/audit-logs")
async def get_audit_logs_endpoint(
    current_user: dict = Depends(get_current_user),
    limit: int = 100,
    action: Optional[str] = None,
    target_type: Optional[str] = None
):
    """Get audit logs with filtering"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await get_audit_logs(
        db=db,
        limit=limit,
        action=action,
        target_type=target_type
    )
    
    return {"logs": logs, "total": len(logs)}

# Bulk Approve Donations
@api_router.post("/admin/donations/bulk-approve")
async def bulk_approve_donations_endpoint(
    donation_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Bulk approve donation applications"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await bulk_approve_donations(
        db=db,
        donation_ids=donation_ids,
        admin_id=current_user["id"],
        admin_name=current_user["name"]
    )
    
    return result

# Bulk Reject Donations
@api_router.post("/admin/donations/bulk-reject")
async def bulk_reject_donations_endpoint(
    donation_ids: List[str],
    reason: str,
    current_user: dict = Depends(get_current_user)
):
    """Bulk reject donation applications"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await bulk_reject_donations(
        db=db,
        donation_ids=donation_ids,
        reason=reason,
        admin_id=current_user["id"],
        admin_name=current_user["name"]
    )
    
    return result

# User Activity Timeline
@api_router.get("/admin/users/{user_id}/activity")
async def get_user_activity_endpoint(
    user_id: str,
    current_user: dict = Depends(get_current_user),
    limit: int = 20
):
    """Get activity timeline for a specific user"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    activities = await get_user_activity_timeline(
        db=db,
        user_id=user_id,
        limit=limit
    )
    
    return {"activities": activities}

# Broadcast Request Model
class BroadcastRequest(BaseModel):
    title: str
    message: str
    target_role: Optional[str] = None

# Send Broadcast Notification
@api_router.post("/admin/broadcast-notification")
async def broadcast_notification(
    request: BroadcastRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send notification to all users or specific role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get admin user details
    admin_user = await db.users.find_one({"id": current_user["id"]})
    admin_name = admin_user.get("name", "Admin") if admin_user else "Admin"
    
    # Get target users
    query = {"role": request.target_role} if request.target_role else {}
    target_users = await db.users.find(query).to_list(10000)
    
    # Create notifications for each user
    notifications_created = 0
    for user in target_users:
        notification = Notification(
            user_id=user["id"],
            type="general",
            title=request.title,
            message=request.message
        )
        await db.notifications.insert_one(notification.model_dump())
        notifications_created += 1
    
    # Log audit
    await create_audit_log(
        db=db,
        admin_id=current_user["id"],
        admin_name=admin_name,
        action="broadcast_notification",
        target_type="notification",
        changes={"title": request.title, "target_role": request.target_role, "recipients": notifications_created}
    )
    
    return {
        "message": "Broadcast notification sent successfully",
        "sent_count": notifications_created
    }

# Platform Settings
@api_router.get("/admin/settings")
async def get_platform_settings(
    current_user: dict = Depends(get_current_user)
):
    """Get platform settings"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings = await db.platform_settings.find_one({})
    if not settings:
        # Return default settings
        from models import PlatformSettings
        settings = PlatformSettings().model_dump()
    
    return settings

@api_router.put("/admin/settings")
async def update_platform_settings(
    settings: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update platform settings"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings["updated_by"] = current_user["id"]
    settings["updated_at"] = datetime.utcnow()
    
    # Upsert settings
    await db.platform_settings.update_one(
        {},
        {"$set": settings},
        upsert=True
    )
    
    # Log audit
    await create_audit_log(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="settings",
        changes=settings
    )
    
    return {"message": "Settings updated successfully", "settings": settings}

# ============================================
# PHASE 3 ROUTES - MATCHING INSIGHTS & SUPPORT
# ============================================

from phase3_service import (
    log_match_attempt,
    get_match_analytics,
    get_default_algorithm_config,
    log_activity,
    log_audit
)

# Import Phase 3 models
from models import (
    MatchLog, AlgorithmConfig, AlgorithmConfigUpdate,
    SupportTicket, SupportTicketCreate, SupportTicketUpdate,
    FAQ, FAQCreate, FAQUpdate,
    HelpDocument, HelpDocumentCreate, HelpDocumentUpdate
)

# ============================================
# MATCHING INSIGHTS ROUTES
# ============================================

@api_router.get("/admin/matching/analytics")
async def get_matching_analytics(
    current_user: dict = Depends(get_current_user),
    days: int = 30
):
    """Get matching algorithm performance analytics (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    analytics = await get_match_analytics(db, days)
    return analytics

@api_router.get("/admin/matching/logs")
async def get_match_logs(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    limit: int = 100
):
    """Get match logs with filtering (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    
    logs = await db.match_logs.find(filter_dict).sort("created_at", -1).to_list(limit)
    return {
        "logs": [MatchLog(**log) for log in logs],
        "total": len(logs)
    }

@api_router.put("/admin/matching/logs/{log_id}/override")
async def manual_match_override(
    log_id: str,
    action: Literal["approve", "reject"],
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Manually approve or reject a match (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    log = await db.match_logs.find_one({"id": log_id})
    if not log:
        raise HTTPException(status_code=404, detail="Match log not found")
    
    new_status = "manually_approved" if action == "approve" else "manually_rejected"
    
    result = await db.match_logs.update_one(
        {"id": log_id},
        {"$set": {
            "status": new_status,
            "admin_notes": notes,
            "approved_by": current_user["id"],
            "approved_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update match log")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="match_override",
        target_id=log_id,
        changes={"action": action, "notes": notes}
    )
    
    return {"message": f"Match {action}d successfully"}

@api_router.get("/admin/matching/config")
async def get_algorithm_config(
    current_user: dict = Depends(get_current_user)
):
    """Get algorithm configuration (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await get_default_algorithm_config(db)
    return AlgorithmConfig(**config)

@api_router.put("/admin/matching/config")
async def update_algorithm_config(
    updates: AlgorithmConfigUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update algorithm configuration (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await get_default_algorithm_config(db)
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_by"] = current_user["id"]
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.algorithm_config.update_one(
        {"id": config["id"]},
        {"$set": update_dict}
    )
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="algorithm_config",
        changes=update_dict
    )
    
    updated_config = await db.algorithm_config.find_one({"id": config["id"]})
    return {"message": "Algorithm configuration updated successfully", "config": AlgorithmConfig(**updated_config)}

# ============================================
# SUPPORT TICKETS ROUTES
# ============================================

@api_router.post("/support/tickets", response_model=SupportTicket)
async def create_support_ticket(
    ticket_data: SupportTicketCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a support ticket"""
    ticket_dict = ticket_data.model_dump()
    ticket_dict["user_id"] = current_user["id"]
    ticket_dict["user_name"] = current_user["name"]
    ticket_dict["user_email"] = current_user["email"]
    ticket_dict["user_role"] = current_user["role"]
    
    ticket_obj = SupportTicket(**ticket_dict)
    await db.support_tickets.insert_one(ticket_obj.model_dump())
    
    # Notify all admins about new support ticket
    admin_users = await db.users.find({"role": "admin"}).to_list(1000)
    for admin in admin_users:
        notification = Notification(
            user_id=admin["id"],
            type="general",
            title=f"🎫 New Support Ticket: {ticket_data.subject}",
            message=f"{current_user['name']} ({current_user['role']}) created a {ticket_data.category} ticket with {ticket_data.priority} priority.",
            link="/admin-dashboard",
            metadata={"ticket_id": ticket_obj.id, "category": ticket_data.category, "priority": ticket_data.priority}
        )
        await db.notifications.insert_one(notification.model_dump())
    
    # Log activity
    await log_activity(
        db=db,
        user_id=current_user["id"],
        user_name=current_user["name"],
        user_role=current_user["role"],
        activity_type="support_ticket_created",
        description=f"Created support ticket: {ticket_data.subject}"
    )
    
    return ticket_obj

@api_router.get("/support/tickets/me")
async def get_my_tickets(
    current_user: dict = Depends(get_current_user)
):
    """Get current user's support tickets"""
    tickets = await db.support_tickets.find({"user_id": current_user["id"]}).sort("created_at", -1).to_list(100)
    return {
        "tickets": [SupportTicket(**t) for t in tickets],
        "total": len(tickets)
    }

@api_router.get("/admin/support/tickets")
async def get_all_tickets(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 100
):
    """Get all support tickets (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    filter_dict = {}
    if status:
        filter_dict["status"] = status
    if priority:
        filter_dict["priority"] = priority
    if category:
        filter_dict["category"] = category
    
    tickets = await db.support_tickets.find(filter_dict).sort("created_at", -1).to_list(limit)
    
    # Get stats
    all_tickets = await db.support_tickets.find({}).to_list(10000)
    stats = {
        "total": len(all_tickets),
        "open": len([t for t in all_tickets if t.get("status") == "open"]),
        "in_progress": len([t for t in all_tickets if t.get("status") == "in_progress"]),
        "resolved": len([t for t in all_tickets if t.get("status") == "resolved"]),
        "closed": len([t for t in all_tickets if t.get("status") == "closed"])
    }
    
    return {
        "tickets": [SupportTicket(**t) for t in tickets],
        "total": len(tickets),
        "stats": stats
    }

@api_router.put("/admin/support/tickets/{ticket_id}")
async def update_support_ticket(
    ticket_id: str,
    updates: SupportTicketUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update support ticket (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ticket = await db.support_tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    # If status changed to resolved, set resolved_at
    if updates.status == "resolved":
        update_dict["resolved_at"] = datetime.utcnow()
    
    # If assigned, add admin name
    if updates.assigned_to:
        admin = await db.users.find_one({"id": updates.assigned_to})
        if admin:
            update_dict["assigned_to_name"] = admin.get("name", "Unknown")
    
    result = await db.support_tickets.update_one(
        {"id": ticket_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update ticket")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="support_ticket",
        target_id=ticket_id,
        changes=update_dict
    )
    
    updated_ticket = await db.support_tickets.find_one({"id": ticket_id})
    return {"message": "Ticket updated successfully", "ticket": SupportTicket(**updated_ticket)}

# ============================================
# FAQ ROUTES
# ============================================

@api_router.get("/faqs")
async def get_faqs(category: Optional[str] = None):
    """Get published FAQs (public access)"""
    filter_dict = {"is_published": True}
    if category:
        filter_dict["category"] = category
    
    faqs = await db.faqs.find(filter_dict).sort("order", 1).to_list(1000)
    return {
        "faqs": [FAQ(**faq) for faq in faqs],
        "total": len(faqs)
    }

@api_router.get("/admin/faqs")
async def get_all_faqs(
    current_user: dict = Depends(get_current_user)
):
    """Get all FAQs including unpublished (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    faqs = await db.faqs.find({}).sort("order", 1).to_list(1000)
    return {
        "faqs": [FAQ(**faq) for faq in faqs],
        "total": len(faqs)
    }

@api_router.post("/admin/faqs", response_model=FAQ)
async def create_faq(
    faq_data: FAQCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new FAQ (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    faq_dict = faq_data.model_dump()
    faq_dict["created_by"] = current_user["id"]
    faq_dict["created_by_name"] = current_user["name"]
    
    faq_obj = FAQ(**faq_dict)
    await db.faqs.insert_one(faq_obj.model_dump())
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="create",
        target_type="faq",
        target_id=faq_obj.id
    )
    
    return faq_obj

@api_router.put("/admin/faqs/{faq_id}")
async def update_faq(
    faq_id: str,
    updates: FAQUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update FAQ (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    faq = await db.faqs.find_one({"id": faq_id})
    if not faq:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.faqs.update_one(
        {"id": faq_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update FAQ")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="faq",
        target_id=faq_id,
        changes=update_dict
    )
    
    updated_faq = await db.faqs.find_one({"id": faq_id})
    return {"message": "FAQ updated successfully", "faq": FAQ(**updated_faq)}

@api_router.delete("/admin/faqs/{faq_id}")
async def delete_faq(
    faq_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete FAQ (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.faqs.delete_one({"id": faq_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="FAQ not found")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="delete",
        target_type="faq",
        target_id=faq_id
    )
    
    return {"message": "FAQ deleted successfully"}

# ============================================
# HELP DOCUMENTATION ROUTES
# ============================================

@api_router.get("/help/documents")
async def get_help_documents(category: Optional[str] = None):
    """Get published help documents (public access)"""
    filter_dict = {"is_published": True}
    if category:
        filter_dict["category"] = category
    
    docs = await db.help_documents.find(filter_dict).sort("created_at", -1).to_list(1000)
    return {
        "documents": [HelpDocument(**doc) for doc in docs],
        "total": len(docs)
    }

@api_router.get("/help/documents/{doc_id}")
async def get_help_document(doc_id: str):
    """Get a specific help document and increment views"""
    doc = await db.help_documents.find_one({"id": doc_id, "is_published": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Increment view count
    await db.help_documents.update_one(
        {"id": doc_id},
        {"$inc": {"views": 1}}
    )
    
    doc["views"] += 1
    return HelpDocument(**doc)

@api_router.get("/admin/help/documents")
async def get_all_help_documents(
    current_user: dict = Depends(get_current_user)
):
    """Get all help documents including unpublished (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    docs = await db.help_documents.find({}).sort("created_at", -1).to_list(1000)
    return {
        "documents": [HelpDocument(**doc) for doc in docs],
        "total": len(docs)
    }

@api_router.post("/admin/help/documents", response_model=HelpDocument)
async def create_help_document(
    doc_data: HelpDocumentCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new help document (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    doc_dict = doc_data.model_dump()
    doc_dict["author_id"] = current_user["id"]
    doc_dict["author_name"] = current_user["name"]
    
    doc_obj = HelpDocument(**doc_dict)
    await db.help_documents.insert_one(doc_obj.model_dump())
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="create",
        target_type="help_document",
        target_id=doc_obj.id
    )
    
    return doc_obj

@api_router.put("/admin/help/documents/{doc_id}")
async def update_help_document(
    doc_id: str,
    updates: HelpDocumentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update help document (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    doc = await db.help_documents.find_one({"id": doc_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Update only provided fields
    update_dict = {k: v for k, v in updates.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.utcnow()
    
    result = await db.help_documents.update_one(
        {"id": doc_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Failed to update document")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="update",
        target_type="help_document",
        target_id=doc_id,
        changes=update_dict
    )
    
    updated_doc = await db.help_documents.find_one({"id": doc_id})
    return {"message": "Help document updated successfully", "document": HelpDocument(**updated_doc)}

@api_router.delete("/admin/help/documents/{doc_id}")
async def delete_help_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete help document (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.help_documents.delete_one({"id": doc_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Log audit
    await log_audit(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="delete",
        target_type="help_document",
        target_id=doc_id
    )
    
    return {"message": "Help document deleted successfully"}

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