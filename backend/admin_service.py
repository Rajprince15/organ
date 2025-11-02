"""
Admin Service - Comprehensive admin functionality
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from models import ActivityLog, AuditLog


async def create_activity_log(
    db,
    user_id: str,
    user_name: str,
    user_role: str,
    activity_type: str,
    description: str,
    metadata: Optional[dict] = None
):
    """Create an activity log entry"""
    activity = ActivityLog(
        user_id=user_id,
        user_name=user_name,
        user_role=user_role,
        activity_type=activity_type,
        description=description,
        metadata=metadata or {}
    )
    await db.activity_logs.insert_one(activity.model_dump())
    return activity


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
    """Create an audit log entry"""
    audit = AuditLog(
        admin_id=admin_id,
        admin_name=admin_name,
        action=action,
        target_type=target_type,
        target_id=target_id,
        changes=changes or {},
        ip_address=ip_address
    )
    await db.audit_logs.insert_one(audit.model_dump())
    return audit


async def get_activity_logs(
    db,
    limit: int = 50,
    activity_type: Optional[str] = None,
    user_role: Optional[str] = None,
    days: Optional[int] = None
) -> List[Dict[str, Any]]:
    """Get activity logs with filtering"""
    query = {}
    
    if activity_type:
        query["activity_type"] = activity_type
    
    if user_role:
        query["user_role"] = user_role
    
    if days:
        since = datetime.utcnow() - timedelta(days=days)
        query["created_at"] = {"$gte": since}
    
    activities = await db.activity_logs.find(query).sort("created_at", -1).to_list(limit)
    return activities


async def get_audit_logs(
    db,
    limit: int = 100,
    admin_id: Optional[str] = None,
    action: Optional[str] = None,
    target_type: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get audit logs with filtering"""
    query = {}
    
    if admin_id:
        query["admin_id"] = admin_id
    
    if action:
        query["action"] = action
    
    if target_type:
        query["target_type"] = target_type
    
    audits = await db.audit_logs.find(query).sort("created_at", -1).to_list(limit)
    return audits


async def get_platform_analytics(db) -> Dict[str, Any]:
    """Get comprehensive platform analytics"""
    
    # Time periods
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Get all data
    all_users = await db.users.find({}).to_list(10000)
    all_donations = await db.donation_applications.find({}).to_list(10000)
    all_requirements = await db.hospital_requirements.find({}).to_list(10000)
    all_matches = await db.shortlist.find({}).to_list(10000)
    all_contacts = await db.contact_history.find({}).to_list(10000)
    
    # User growth data
    user_growth = {}
    for user in all_users:
        date = user.get("created_at", now).strftime("%Y-%m-%d") if isinstance(user.get("created_at"), datetime) else now.strftime("%Y-%m-%d")
        user_growth[date] = user_growth.get(date, 0) + 1
    
    # Organ demand data
    organ_demand = {}
    for req in all_requirements:
        organ = req.get("organ_required", "Unknown")
        organ_demand[organ] = organ_demand.get(organ, 0) + 1
    
    # Blood group distribution
    blood_group_dist = {}
    for donation in all_donations:
        if donation.get("status") == "approved":
            bg = donation.get("blood_group", "Unknown")
            blood_group_dist[bg] = blood_group_dist.get(bg, 0) + 1
    
    # Geographic distribution
    location_dist = {}
    for donation in all_donations:
        if donation.get("status") == "approved":
            state = donation.get("state", "Unknown")
            if state:
                location_dist[state] = location_dist.get(state, 0) + 1
    
    # Recent activity counts
    recent_users = len([u for u in all_users if u.get("created_at", now) >= week_ago])
    recent_donations = len([d for d in all_donations if d.get("created_at", now) >= week_ago])
    recent_requirements = len([r for r in all_requirements if r.get("created_at", now) >= week_ago])
    
    # Match success rate (contacts made / total matches)
    match_success_rate = (len(all_contacts) / len(all_matches) * 100) if all_matches else 0
    
    # Average match time (days between requirement posting and first contact)
    match_times = []
    for contact in all_contacts:
        # This is simplified - in production you'd match contact to requirement
        contact_date = contact.get("contacted_at", now)
        # Assuming requirement was posted earlier
        match_times.append(1)  # Placeholder
    
    avg_match_time = sum(match_times) / len(match_times) if match_times else 0
    
    return {
        "user_growth": [{"date": k, "count": v} for k, v in sorted(user_growth.items())],
        "organ_demand": [{"name": k, "value": v} for k, v in organ_demand.items()],
        "blood_group_distribution": [{"name": k, "value": v} for k, v in blood_group_dist.items()],
        "location_distribution": [{"name": k, "value": v} for k, v in sorted(location_dist.items())],
        "real_time_metrics": {
            "total_users": len(all_users),
            "new_users_this_week": recent_users,
            "new_donations_this_week": recent_donations,
            "new_requirements_this_week": recent_requirements,
            "match_success_rate": round(match_success_rate, 2),
            "avg_match_time_days": round(avg_match_time, 1),
            "total_matches": len(all_matches),
            "total_contacts": len(all_contacts)
        },
        "trends": {
            "users_trend": "+15%",  # Placeholder - calculate actual trend
            "donations_trend": "+8%",
            "requirements_trend": "+12%",
            "matches_trend": "+20%"
        }
    }


async def bulk_approve_donations(db, donation_ids: List[str], admin_id: str, admin_name: str) -> Dict[str, Any]:
    """Bulk approve donation applications"""
    approved_count = 0
    failed_ids = []
    
    for donation_id in donation_ids:
        try:
            result = await db.donation_applications.update_one(
                {"id": donation_id, "status": "pending"},
                {"$set": {"status": "approved", "updated_at": datetime.utcnow()}}
            )
            if result.modified_count > 0:
                approved_count += 1
                # Create audit log
                await create_audit_log(
                    db=db,
                    admin_id=admin_id,
                    admin_name=admin_name,
                    action="bulk_approve",
                    target_type="donation",
                    target_id=donation_id
                )
        except Exception as e:
            failed_ids.append(donation_id)
    
    return {
        "approved_count": approved_count,
        "failed_count": len(failed_ids),
        "failed_ids": failed_ids
    }


async def bulk_reject_donations(db, donation_ids: List[str], reason: str, admin_id: str, admin_name: str) -> Dict[str, Any]:
    """Bulk reject donation applications"""
    rejected_count = 0
    failed_ids = []
    
    for donation_id in donation_ids:
        try:
            result = await db.donation_applications.update_one(
                {"id": donation_id, "status": "pending"},
                {"$set": {
                    "status": "cancelled",
                    "rejection_reason": reason,
                    "updated_at": datetime.utcnow()
                }}
            )
            if result.modified_count > 0:
                rejected_count += 1
                # Create audit log
                await create_audit_log(
                    db=db,
                    admin_id=admin_id,
                    admin_name=admin_name,
                    action="bulk_reject",
                    target_type="donation",
                    target_id=donation_id,
                    changes={"reason": reason}
                )
        except Exception as e:
            failed_ids.append(donation_id)
    
    return {
        "rejected_count": rejected_count,
        "failed_count": len(failed_ids),
        "failed_ids": failed_ids
    }


async def get_user_activity_timeline(db, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Get activity timeline for a specific user"""
    activities = await db.activity_logs.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(limit)
    
    return activities
