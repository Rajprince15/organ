"""
Branch Hospital Assignment Service
Automatically assigns donors to nearest branch hospitals based on location
"""
import logging
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


async def find_nearest_branch_hospital(db, city: str, state: str, country: str = "USA") -> Optional[Dict[str, Any]]:
    """
    Find the nearest active branch hospital based on donor's location.
    
    Priority:
    1. Exact match: Same city and state
    2. State match: Same state, different city
    3. Country match: Same country (fallback)
    4. Any active branch hospital (last resort)
    
    Args:
        db: Database instance
        city: Donor's city
        state: Donor's state
        country: Donor's country (default: USA)
        
    Returns:
        Branch hospital dict or None if no active branches found
    """
    
    try:
        # Normalize location data
        city_normalized = city.strip().lower() if city else ""
        state_normalized = state.strip().lower() if state else ""
        country_normalized = country.strip().lower() if country else "usa"
        
        # Priority 1: Exact match (same city and state)
        if city_normalized and state_normalized:
            exact_match = await db.branch_hospitals.find_one({
                "is_active": True,
                "city": {"$regex": f"^{city_normalized}$", "$options": "i"},
                "state": {"$regex": f"^{state_normalized}$", "$options": "i"}
            })
            
            if exact_match:
                logger.info(f"✅ Exact match found for {city}, {state}: {exact_match['name']}")
                return exact_match
        
        # Priority 2: State match (same state, different city)
        if state_normalized:
            state_match = await db.branch_hospitals.find_one({
                "is_active": True,
                "state": {"$regex": f"^{state_normalized}$", "$options": "i"}
            })
            
            if state_match:
                logger.info(f"✅ State match found for {state}: {state_match['name']}")
                return state_match
        
        # Priority 3: Country match (fallback)
        if country_normalized:
            country_match = await db.branch_hospitals.find_one({
                "is_active": True,
                "country": {"$regex": f"^{country_normalized}$", "$options": "i"}
            })
            
            if country_match:
                logger.info(f"✅ Country match found for {country}: {country_match['name']}")
                return country_match
        
        # Priority 4: Any active branch hospital (last resort)
        any_active = await db.branch_hospitals.find_one({"is_active": True})
        
        if any_active:
            logger.warning(f"⚠️  No location match found, assigning to any active branch: {any_active['name']}")
            return any_active
        
        logger.error("❌ No active branch hospitals found in the system")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error finding nearest branch hospital: {str(e)}")
        return None


async def assign_branch_to_donor(
    db,
    donation_application_id: str,
    branch_hospital_id: str,
    branch_hospital_name: str
) -> bool:
    """
    Assign a branch hospital to a donor's application.
    
    Args:
        db: Database instance
        donation_application_id: Donor application ID
        branch_hospital_id: Branch hospital ID to assign
        branch_hospital_name: Branch hospital name
        
    Returns:
        True if assignment successful, False otherwise
    """
    
    try:
        from datetime import datetime
        
        result = await db.donation_applications.update_one(
            {"id": donation_application_id},
            {"$set": {
                "assigned_branch_hospital_id": branch_hospital_id,
                "assigned_branch_hospital_name": branch_hospital_name,
                "checkup_status": "pending_checkup",
                "updated_at": datetime.utcnow()
            }}
        )
        
        if result.modified_count > 0:
            logger.info(f"✅ Assigned branch hospital '{branch_hospital_name}' to donor application {donation_application_id}")
            return True
        else:
            logger.error(f"❌ Failed to assign branch hospital to donor application {donation_application_id}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Error assigning branch to donor: {str(e)}")
        return False
