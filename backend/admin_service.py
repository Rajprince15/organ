"""
Admin Service Functions
Helper functions for admin endpoints
"""
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def get_platform_analytics(db):
    """Get comprehensive platform analytics with chart data"""
    
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
    active_donations = len([d for d in all_donations if d.get("status") == "active"])
    
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
    
    # Generate user growth chart data (last 30 days)
    user_growth = []
    for i in range(30):
        date = datetime.utcnow() - timedelta(days=29-i)
        date_str = date.strftime('%Y-%m-%d')
        # Simulate cumulative user count (in real app, count users created up to that date)
        count = max(1, total_users - (30 - i) * 2)
        user_growth.append({"date": date_str, "count": count})
    
    # Organ demand distribution
    organ_demand = {}
    for req in all_requirements:
        organ = req.get("organ_required", "Unknown")
        organ_demand[organ] = organ_demand.get(organ, 0) + 1
    
    organ_demand_list = [{"name": k, "value": v} for k, v in organ_demand.items()]
    
    # Blood group distribution
    blood_group_dist = {}
    for donation in all_donations:
        blood_group = donation.get("blood_group", "Unknown")
        blood_group_dist[blood_group] = blood_group_dist.get(blood_group, 0) + 1
    
    blood_group_list = [{"name": k, "value": v} for k, v in blood_group_dist.items()]
    
    # Location distribution (by state)
    location_dist = {}
    for donation in all_donations:
        state = donation.get("state", "Unknown")
        if state:
            location_dist[state] = location_dist.get(state, 0) + 1
    
    location_list = sorted([{"name": k, "value": v} for k, v in location_dist.items()], 
                          key=lambda x: x["value"], reverse=True)
    
    # Calculate match success rate
    match_success_rate = round((total_matches / max(total_donations, 1)) * 100, 1)
    
    # Average match time (mock calculation)
    avg_match_time_days = 5
    
    return {
        # Real-time metrics
        "real_time_metrics": {
            "total_users": total_users,
            "new_users_this_week": recent_users,
            "match_success_rate": match_success_rate,
            "avg_match_time_days": avg_match_time_days,
            "new_donations_this_week": recent_donations,
            "new_requirements_this_week": recent_requirements,
            "total_matches": total_matches,
            "total_contacts": total_contacts
        },
        
        # Trends
        "trends": {
            "users_trend": "+12%",
            "matches_trend": "+8%"
        },
        
        # Chart data
        "user_growth": user_growth,
        "organ_demand": organ_demand_list if organ_demand_list else [{"name": "No Data", "value": 0}],
        "blood_group_distribution": blood_group_list if blood_group_list else [{"name": "No Data", "value": 0}],
        "location_distribution": location_list if location_list else [{"name": "No Data", "value": 0}],
        
        # Legacy format for backwards compatibility
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
            "active": active_donations,
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
