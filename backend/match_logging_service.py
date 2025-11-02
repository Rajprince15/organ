"""
Match Logging Service
Auto-logs all matches created by the matching algorithm for admin insights.
"""
from typing import Dict, Any, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


async def log_match(
    db,
    match_type: str,
    donor: Dict[str, Any],
    requirement: Dict[str, Any],
    match_score: int,
    score_breakdown: Dict[str, Any],
    status: str = "auto_matched"
) -> str:
    """
    Log a match to the database for admin tracking.
    
    Args:
        db: Database connection
        match_type: "donor_to_requirement" or "requirement_to_donor"
        donor: Donor application dict
        requirement: Hospital requirement dict
        match_score: Total match score
        score_breakdown: Detailed score breakdown
        status: Match status (auto_matched, manually_approved, manually_rejected, pending)
    
    Returns:
        Match log ID
    """
    try:
        from models import MatchLog
        
        # Create match log entry
        match_log = MatchLog(
            match_type=match_type,
            donor_id=donor.get("donor_id", ""),
            donor_name=donor.get("full_name", ""),
            requirement_id=requirement.get("id", ""),
            requirement_details=f"{requirement.get('organ_required', '')} for {requirement.get('patient_name', '')}",
            hospital_id=requirement.get("hospital_id", ""),
            hospital_name=requirement.get("hospital_name", ""),
            match_score=match_score,
            score_breakdown=score_breakdown,
            status=status
        )
        
        await db.match_logs.insert_one(match_log.model_dump())
        
        logger.info(f"Match logged: {match_log.id} - Score: {match_score}")
        return match_log.id
        
    except Exception as e:
        logger.error(f"Error logging match: {e}")
        return ""


async def get_match_logs(
    db,
    filters: Dict[str, Any] = None,
    page: int = 1,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Get match logs with optional filters.
    
    Args:
        db: Database connection
        filters: Optional filters (status, date range, hospital_id, etc.)
        page: Page number
        limit: Items per page
    
    Returns:
        Dict with logs, total count, and pagination info
    """
    try:
        query = filters if filters else {}
        
        # Get all matching logs
        all_logs = await db.match_logs.find(query).sort("created_at", -1).to_list(10000)
        
        # Pagination
        total = len(all_logs)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_logs = all_logs[start_idx:end_idx]
        
        return {
            "logs": paginated_logs,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
        
    except Exception as e:
        logger.error(f"Error getting match logs: {e}")
        return {
            "logs": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0
        }


async def update_match_status(
    db,
    match_log_id: str,
    new_status: str,
    admin_id: str,
    admin_notes: str = None
) -> bool:
    """
    Update match log status (approve/reject).
    
    Args:
        db: Database connection
        match_log_id: Match log ID
        new_status: New status (manually_approved, manually_rejected)
        admin_id: Admin user ID
        admin_notes: Optional admin notes
    
    Returns:
        True if successful, False otherwise
    """
    try:
        update_dict = {
            "status": new_status,
            "approved_by": admin_id,
            "approved_at": datetime.utcnow()
        }
        
        if admin_notes:
            update_dict["admin_notes"] = admin_notes
        
        result = await db.match_logs.update_one(
            {"id": match_log_id},
            {"$set": update_dict}
        )
        
        return result.modified_count > 0
        
    except Exception as e:
        logger.error(f"Error updating match status: {e}")
        return False


async def get_match_analytics(db) -> Dict[str, Any]:
    """
    Calculate match analytics and performance metrics.
    
    Returns:
        Dict with analytics data
    """
    try:
        # Get all match logs
        all_logs = await db.match_logs.find({}).to_list(10000)
        
        if not all_logs:
            return {
                "total_matches": 0,
                "avg_match_score": 0,
                "status_distribution": {},
                "top_hospitals": [],
                "match_score_distribution": {
                    "excellent": 0,
                    "good": 0,
                    "fair": 0,
                    "poor": 0
                },
                "recent_matches": []
            }
        
        # Calculate metrics
        total_matches = len(all_logs)
        total_score = sum(log.get("match_score", 0) for log in all_logs)
        avg_score = total_score / total_matches if total_matches > 0 else 0
        
        # Status distribution
        status_counts = {}
        for log in all_logs:
            status = log.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Match score distribution
        score_distribution = {
            "excellent": 0,  # 200+
            "good": 0,       # 150-199
            "fair": 0,       # 100-149
            "poor": 0        # <100
        }
        
        for log in all_logs:
            score = log.get("match_score", 0)
            if score >= 200:
                score_distribution["excellent"] += 1
            elif score >= 150:
                score_distribution["good"] += 1
            elif score >= 100:
                score_distribution["fair"] += 1
            else:
                score_distribution["poor"] += 1
        
        # Top hospitals by match count
        hospital_counts = {}
        for log in all_logs:
            hospital_name = log.get("hospital_name", "Unknown")
            hospital_counts[hospital_name] = hospital_counts.get(hospital_name, 0) + 1
        
        top_hospitals = sorted(
            [{"name": k, "match_count": v} for k, v in hospital_counts.items()],
            key=lambda x: x["match_count"],
            reverse=True
        )[:5]
        
        # Recent matches (last 10)
        recent_matches = sorted(
            all_logs,
            key=lambda x: x.get("created_at", datetime.min),
            reverse=True
        )[:10]
        
        return {
            "total_matches": total_matches,
            "avg_match_score": round(avg_score, 2),
            "status_distribution": status_counts,
            "top_hospitals": top_hospitals,
            "match_score_distribution": score_distribution,
            "recent_matches": recent_matches
        }
        
    except Exception as e:
        logger.error(f"Error calculating match analytics: {e}")
        return {
            "total_matches": 0,
            "avg_match_score": 0,
            "status_distribution": {},
            "top_hospitals": [],
            "match_score_distribution": {
                "excellent": 0,
                "good": 0,
                "fair": 0,
                "poor": 0
            },
            "recent_matches": []
        }


async def get_algorithm_config(db) -> Dict[str, Any]:
    """
    Get current algorithm configuration.
    
    Returns:
        Algorithm config dict or default values
    """
    try:
        config = await db.algorithm_config.find_one({})
        
        if not config:
            # Return default config
            from models import AlgorithmConfig
            default_config = AlgorithmConfig()
            return default_config.model_dump()
        
        return config
        
    except Exception as e:
        logger.error(f"Error getting algorithm config: {e}")
        from models import AlgorithmConfig
        return AlgorithmConfig().model_dump()


async def update_algorithm_config(
    db,
    updates: Dict[str, Any],
    admin_id: str
) -> Dict[str, Any]:
    """
    Update algorithm configuration.
    
    Args:
        db: Database connection
        updates: Config updates
        admin_id: Admin user ID
    
    Returns:
        Updated config dict
    """
    try:
        updates["updated_by"] = admin_id
        updates["updated_at"] = datetime.utcnow()
        
        # Check if config exists
        existing_config = await db.algorithm_config.find_one({})
        
        if existing_config:
            # Update existing
            await db.algorithm_config.update_one(
                {"id": existing_config["id"]},
                {"$set": updates}
            )
            updated_config = await db.algorithm_config.find_one({"id": existing_config["id"]})
        else:
            # Create new
            from models import AlgorithmConfig
            new_config = AlgorithmConfig(**updates)
            await db.algorithm_config.insert_one(new_config.model_dump())
            updated_config = new_config.model_dump()
        
        logger.info(f"Algorithm config updated by admin: {admin_id}")
        return updated_config
        
    except Exception as e:
        logger.error(f"Error updating algorithm config: {e}")
        return {}
