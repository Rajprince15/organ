"""
Phase 3 Service Functions
Matching Algorithm Insights and Support System helpers
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


async def log_match_attempt(
    db,
    donor_id: str,
    donor_name: str,
    requirement_id: str,
    requirement_details: str,
    hospital_id: str,
    hospital_name: str,
    match_score: int,
    score_breakdown: dict,
    match_type: str = "donor_to_requirement"
):
    """Log a match attempt for analytics"""
    from models import MatchLog
    
    match_log = MatchLog(
        match_type=match_type,
        donor_id=donor_id,
        donor_name=donor_name,
        requirement_id=requirement_id,
        requirement_details=requirement_details,
        hospital_id=hospital_id,
        hospital_name=hospital_name,
        match_score=match_score,
        score_breakdown=score_breakdown,
        status="auto_matched"
    )
    
    await db.match_logs.insert_one(match_log.model_dump())
    return match_log


async def get_match_analytics(db, days: int = 30):
    """Get matching algorithm performance analytics"""
    
    # Get matches from last N days
    since_date = datetime.utcnow() - timedelta(days=days)
    
    all_matches = await db.match_logs.find({
        "created_at": {"$gte": since_date}
    }).to_list(10000)
    
    if not all_matches:
        return {
            "total_matches": 0,
            "avg_match_score": 0,
            "matches_by_status": {},
            "matches_by_organ": {},
            "matches_by_blood_group": {},
            "success_rate": 0,
            "top_hospitals": [],
            "score_distribution": []
        }
    
    # Calculate metrics
    total_matches = len(all_matches)
    avg_score = sum(m.get("match_score", 0) for m in all_matches) / total_matches if total_matches > 0 else 0
    
    # Status breakdown
    status_counts = {}
    for match in all_matches:
        status = match.get("status", "auto_matched")
        status_counts[status] = status_counts.get(status, 0) + 1
    
    # Success rate (approved / total)
    approved_count = status_counts.get("manually_approved", 0) + status_counts.get("auto_matched", 0)
    success_rate = (approved_count / total_matches * 100) if total_matches > 0 else 0
    
    # Top hospitals by matches
    hospital_matches = {}
    for match in all_matches:
        hospital_name = match.get("hospital_name", "Unknown")
        hospital_matches[hospital_name] = hospital_matches.get(hospital_name, 0) + 1
    
    top_hospitals = sorted(
        [{"name": k, "matches": v} for k, v in hospital_matches.items()],
        key=lambda x: x["matches"],
        reverse=True
    )[:10]
    
    # Score distribution
    score_ranges = {
        "0-50": 0,
        "51-100": 0,
        "101-150": 0,
        "151-200": 0,
        "201+": 0
    }
    for match in all_matches:
        score = match.get("match_score", 0)
        if score <= 50:
            score_ranges["0-50"] += 1
        elif score <= 100:
            score_ranges["51-100"] += 1
        elif score <= 150:
            score_ranges["101-150"] += 1
        elif score <= 200:
            score_ranges["151-200"] += 1
        else:
            score_ranges["201+"] += 1
    
    return {
        "total_matches": total_matches,
        "avg_match_score": round(avg_score, 2),
        "matches_by_status": status_counts,
        "success_rate": round(success_rate, 2),
        "top_hospitals": top_hospitals,
        "score_distribution": [{"range": k, "count": v} for k, v in score_ranges.items()],
        "period_days": days
    }


async def get_default_algorithm_config(db):
    """Get or create default algorithm configuration"""
    from models import AlgorithmConfig
    
    config = await db.algorithm_config.find_one({})
    
    if not config:
        # Create default config
        default_config = AlgorithmConfig()
        await db.algorithm_config.insert_one(default_config.model_dump())
        return default_config.model_dump()
    
    return config


async def log_activity(db, user_id: str, user_name: str, user_role: str, 
                      activity_type: str, description: str, metadata: dict = None):
    """Log user activity"""
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


async def log_audit(db, admin_id: str, admin_name: str, action: str,
                   target_type: str, target_id: str = None, changes: dict = None,
                   ip_address: str = None):
    """Log admin audit trail"""
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
