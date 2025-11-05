"""
Activity Logging Service for Critical Actions
Logs: report uploads, eligibility changes, admin donor status updates
"""
import logging
from datetime import datetime
from typing import Optional, Dict, Any
import uuid

logger = logging.getLogger(__name__)


async def log_activity(
    db,
    user_id: str,
    user_name: str,
    user_role: str,
    activity_type: str,
    description: str,
    metadata: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log a critical activity to the database.
    
    Args:
        db: Database instance
        user_id: ID of user performing the action
        user_name: Name of user performing the action
        user_role: Role of user (branch_hospital, admin, etc.)
        activity_type: Type of activity (report_upload, eligibility_change, status_update)
        description: Human-readable description
        metadata: Additional contextual data
        
    Returns:
        bool: True if logged successfully
    """
    try:
        activity_log = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_name": user_name,
            "user_role": user_role,
            "activity_type": activity_type,
            "description": description,
            "metadata": metadata or {},
            "created_at": datetime.utcnow()
        }
        
        await db.activity_logs.insert_one(activity_log)
        logger.info(f"✅ Activity logged: {activity_type} by {user_name} ({user_role})")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to log activity: {str(e)}")
        return False


async def get_activity_logs(
    db,
    limit: int = 100,
    activity_type: Optional[str] = None,
    user_id: Optional[str] = None
):
    """
    Retrieve activity logs with optional filtering.
    
    Args:
        db: Database instance
        limit: Maximum number of logs to return
        activity_type: Filter by activity type
        user_id: Filter by user ID
        
    Returns:
        list: Activity logs
    """
    try:
        filter_dict = {}
        
        if activity_type:
            filter_dict["activity_type"] = activity_type
        
        if user_id:
            filter_dict["user_id"] = user_id
        
        logs = await db.activity_logs.find(filter_dict).sort("created_at", -1).to_list(limit)
        return logs
        
    except Exception as e:
        logger.error(f"❌ Failed to retrieve activity logs: {str(e)}")
        return []


async def log_report_upload(
    db,
    branch_hospital_id: str,
    branch_hospital_name: str,
    donor_id: str,
    donor_name: str,
    report_filename: str
) -> bool:
    """Log when a branch hospital uploads a donor's eligibility report"""
    return await log_activity(
        db=db,
        user_id=branch_hospital_id,
        user_name=branch_hospital_name,
        user_role="branch_hospital",
        activity_type="report_upload",
        description=f"Uploaded eligibility report for donor {donor_name}",
        metadata={
            "donor_id": donor_id,
            "donor_name": donor_name,
            "report_filename": report_filename
        }
    )


async def log_eligibility_change(
    db,
    branch_hospital_id: str,
    branch_hospital_name: str,
    donor_id: str,
    donor_name: str,
    old_status: str,
    new_status: str
) -> bool:
    """Log when eligibility status changes"""
    return await log_activity(
        db=db,
        user_id=branch_hospital_id,
        user_name=branch_hospital_name,
        user_role="branch_hospital",
        activity_type="eligibility_change",
        description=f"Changed eligibility status for {donor_name} from '{old_status}' to '{new_status}'",
        metadata={
            "donor_id": donor_id,
            "donor_name": donor_name,
            "old_status": old_status,
            "new_status": new_status
        }
    )


async def log_admin_status_update(
    db,
    admin_id: str,
    admin_name: str,
    donor_id: str,
    donor_name: str,
    old_status: str,
    new_status: str,
    action: str = "status_update"
) -> bool:
    """Log when admin updates donor status"""
    return await log_activity(
        db=db,
        user_id=admin_id,
        user_name=admin_name,
        user_role="admin",
        activity_type="admin_status_update",
        description=f"Admin {action}: Changed {donor_name}'s status from '{old_status}' to '{new_status}'",
        metadata={
            "donor_id": donor_id,
            "donor_name": donor_name,
            "old_status": old_status,
            "new_status": new_status,
            "action": action
        }
    )
