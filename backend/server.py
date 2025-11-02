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
    ContactHistory, ContactHistoryCreate, Shortlist, ShortlistCreate,
    Notification, NotificationCreate,
    CommunityPost, CommunityPostCreate, CommunityPostUpdate,
    Event, EventCreate, EventUpdate,
    Resource, ResourceCreate, ResourceUpdate
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
        
        # Notify top matching donors about new requirement
        for donor, score, breakdown in matches[:5]:  # Notify top 5 matches
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
    cancelled_donations = len([d for d in all_donations if d.get("status") == "cancelled"])
    
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
            "cancelled": cancelled_donations
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
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None
):
    """Get audit logs with filtering"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    logs = await get_audit_logs(
        db=db,
        limit=limit,
        admin_id=admin_id,
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

# Send Broadcast Notification
@api_router.post("/admin/broadcast-notification")
async def broadcast_notification(
    title: str,
    message: str,
    target_role: Optional[str] = None,  # donor, hospital, or None for all
    current_user: dict = Depends(get_current_user)
):
    """Send notification to all users or specific role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get target users
    query = {"role": target_role} if target_role else {}
    target_users = await db.users.find(query).to_list(10000)
    
    # Create notifications for each user
    notifications_created = 0
    for user in target_users:
        notification = Notification(
            user_id=user["id"],
            type="general",
            title=title,
            message=message
        )
        await db.notifications.insert_one(notification.model_dump())
        notifications_created += 1
    
    # Log audit
    await create_audit_log(
        db=db,
        admin_id=current_user["id"],
        admin_name=current_user["name"],
        action="broadcast_notification",
        target_type="notification",
        changes={"title": title, "target_role": target_role, "recipients": notifications_created}
    )
    
    return {
        "message": "Broadcast notification sent successfully",
        "recipients": notifications_created
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