"""
Admin Service Functions
Helper functions for admin endpoints
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def get_platform_analytics(db):
    """Get comprehensive platform analytics"""
    
    # Get all data
    all_users = await db.users.find({}).to_list(10000)
    all_donations = await db.donation_applications.find({}).to_list(10000)
    all_requirements = await db.hospital_requirements.find({}).to_list(10000)
    all_matches = await db.shortlist.find({}).to_list(10000)
    all_contacts = await db.contact_history.find({}).to_list(10000)
    
    # User stats
    total_users = len(all_users)
    donors = len([u for u in all_users if u.get("role") == "donor"])
    hospitals = len([u for u in all_users if u.get("role") == "hospital"])
    admins = len([u for u in all_users if u.get("role") == "admin"])
    
    # Donation stats
    total_donations = len(all_donations)
    pending_donations = len([d for d in all_donations if d.get("status") == "pending"])
    approved_donations = len([d for d in all_donations if d.get("status") == "approved"])
    
    # Requirement stats
    total_requirements = len(all_requirements)
    active_requirements = len([r for r in all_requirements if r.get("status") == "active"])
    
    # Matching stats
    total_matches = len(all_matches)
    total_contacts = len(all_contacts)
    
    # Time-based trends (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_users = len([u for u in all_users if u.get("created_at", datetime.min) >= seven_days_ago])
    recent_donations = len([d for d in all_donations if d.get("created_at", datetime.min) >= seven_days_ago])
    recent_requirements = len([r for r in all_requirements if r.get("created_at", datetime.min) >= seven_days_ago])
    
    return {
        "users": {
            "total": total_users,
            "donors": donors,
            "hospitals": hospitals,
            "admins": admins,
            "recent_7_days": recent_users
        },
        "donations": {
            "total": total_donations,
            "pending": pending_donations,
            "approved": approved_donations,
            "recent_7_days": recent_donations
        },
        "requirements": {
            "total": total_requirements,
            "active": active_requirements,
            "recent_7_days": recent_requirements
        },
        "matching": {
            "total_matches": total_matches,
            "total_contacts": total_contacts
        }
    }


async def get_activity_logs(
    db,
    activity_type: Optional[str] = None,
    user_role: Optional[str] = None,
    limit: int = 100
):
    """Get activity logs with filtering"""
    filter_dict = {}
    if activity_type:
        filter_dict["activity_type"] = activity_type
    if user_role:
        filter_dict["user_role"] = user_role
    
    logs = await db.activity_logs.find(filter_dict).sort("created_at", -1).to_list(limit)
    return logs


async def get_audit_logs(
    db,
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    limit: int = 100
):
    """Get audit logs with filtering"""
    filter_dict = {}
    if action:
        filter_dict["action"] = action
    if target_type:
        filter_dict["target_type"] = target_type
    
    logs = await db.audit_logs.find(filter_dict).sort("created_at", -1).to_list(limit)
    return logs


async def create_audit_log(
    db,
    admin_id: str,
    admin_name: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    changes: Optional[dict] = None,
    ip_address: Optional[str] = None
):
    """Create audit log entry"""
    from models import AuditLog
    
    audit_log = AuditLog(
        admin_id=admin_id,
        admin_name=admin_name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        changes=changes,
        ip_address=ip_address
    )
    
    await db.audit_logs.insert_one(audit_log.model_dump())
    return audit_log


async def create_activity_log(
    db,
    user_id: str,
    user_name: str,
    user_role: str,
    activity_type: str,
    description: str,
    metadata: Optional[dict] = None
):
    """Create activity log entry"""
    from models import ActivityLog
    
    activity_log = ActivityLog(
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        activity_type=activity_type,
        description=description,
        metadata=metadata or {}
    )
    
    await db.activity_logs.insert_one(activity_log.model_dump())
    return activity_log


async def bulk_approve_donations(db, donation_ids: List[str]):
    """Bulk approve donation applications"""
    
    updated_count = 0
    for donation_id in donation_ids:
        result = await db.donation_applications.update_one(
            {"id": donation_id},
            {"$set": {"status": "approved", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            updated_count += 1
    
    return {
        "success": True,
        "updated_count": updated_count,
        "total_requested": len(donation_ids)
    }


async def bulk_reject_donations(db, donation_ids: List[str]):
    """Bulk reject donation applications"""
    
    updated_count = 0
    for donation_id in donation_ids:
        result = await db.donation_applications.update_one(
            {"id": donation_id},
            {"$set": {"status": "cancelled", "updated_at": datetime.utcnow()}}
        )
        if result.modified_count > 0:
            updated_count += 1
    
    return {
        "success": True,
        "updated_count": updated_count,
        "total_requested": len(donation_ids)
    }


async def get_user_activity_timeline(db, user_id: str, limit: int = 50):
    """Get activity timeline for a specific user"""
    
    activities = await db.activity_logs.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(limit)
    
    return activities
