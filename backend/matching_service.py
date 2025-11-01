"""
Smart Matching Algorithm Service
Matches donors with hospital requirements based on blood group compatibility, 
location, age, and other factors with weighted scoring.
"""
from typing import List, Dict, Any, Tuple
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


# Blood group compatibility matrix
BLOOD_GROUP_COMPATIBILITY = {
    "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],  # Universal donor
    "O+": ["O+", "A+", "B+", "AB+"],
    "A-": ["A-", "A+", "AB-", "AB+"],
    "A+": ["A+", "AB+"],
    "B-": ["B-", "B+", "AB-", "AB+"],
    "B+": ["B+", "AB+"],
    "AB-": ["AB-", "AB+"],
    "AB+": ["AB+"],  # Universal recipient (can receive from all)
}

# Reverse compatibility - who can donate to a blood group
BLOOD_GROUP_DONORS = {
    "O-": ["O-"],
    "O+": ["O-", "O+"],
    "A-": ["O-", "A-"],
    "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"],
    "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],  # Can receive from all
}


def is_blood_group_compatible(donor_blood_group: str, recipient_blood_group: str) -> bool:
    """
    Check if donor blood group is compatible with recipient.
    
    Args:
        donor_blood_group: Donor's blood group
        recipient_blood_group: Recipient's blood group
    
    Returns:
        True if compatible, False otherwise
    """
    if donor_blood_group not in BLOOD_GROUP_COMPATIBILITY:
        return False
    
    return recipient_blood_group in BLOOD_GROUP_COMPATIBILITY[donor_blood_group]


def calculate_blood_group_score(donor_blood_group: str, recipient_blood_group: str) -> int:
    """
    Calculate blood group compatibility score.
    
    Scoring:
    - Exact match: 50 points
    - Universal donor (O-): 45 points
    - Compatible: 40 points
    - Incompatible: 0 points
    """
    if not is_blood_group_compatible(donor_blood_group, recipient_blood_group):
        return 0
    
    if donor_blood_group == recipient_blood_group:
        return 50  # Exact match
    elif donor_blood_group == "O-":
        return 45  # Universal donor
    else:
        return 40  # Compatible but not exact


def calculate_location_score(donor_city: str, donor_state: str, 
                            recipient_city: str, recipient_state: str) -> int:
    """
    Calculate location proximity score.
    
    Scoring:
    - Same city: 30 points
    - Same state: 20 points
    - Different state: 10 points
    """
    if not donor_city or not donor_state or not recipient_city or not recipient_state:
        return 10
    
    donor_city_lower = donor_city.lower().strip()
    donor_state_lower = donor_state.lower().strip()
    recipient_city_lower = recipient_city.lower().strip()
    recipient_state_lower = recipient_state.lower().strip()
    
    if donor_city_lower == recipient_city_lower and donor_state_lower == recipient_state_lower:
        return 30  # Same city
    elif donor_state_lower == recipient_state_lower:
        return 20  # Same state
    else:
        return 10  # Different state


def calculate_age_score(donor_age: int, optimal_min: int = 18, optimal_max: int = 50) -> int:
    """
    Calculate age-based score for donors.
    
    Scoring:
    - Optimal age range (18-50): 20 points
    - Acceptable range (51-60): 15 points
    - Outside optimal but acceptable (17 or 61-65): 10 points
    - Outside acceptable: 5 points
    """
    if optimal_min <= donor_age <= optimal_max:
        return 20  # Optimal age
    elif 51 <= donor_age <= 60:
        return 15  # Still good
    elif donor_age == 17 or (61 <= donor_age <= 65):
        return 10  # Acceptable
    else:
        return 5  # Outside ideal range but might still qualify


def calculate_organ_match_score(donor_organs: List[str], required_organ: str) -> int:
    """
    Calculate organ availability score.
    
    Returns:
    - 100 points if donor has the required organ
    - 0 points if not available
    """
    # Normalize organ names for comparison
    donor_organs_lower = [organ.lower().strip() for organ in donor_organs]
    required_organ_lower = required_organ.lower().strip()
    
    # Check for exact match or plural/singular variations
    if required_organ_lower in donor_organs_lower:
        return 100
    
    # Handle common variations (kidney/kidneys, etc.)
    singular_plural_map = {
        "kidney": "kidneys",
        "kidneys": "kidney",
        "lung": "lungs",
        "lungs": "lung",
        "cornea": "corneas",
        "corneas": "cornea",
    }
    
    variant = singular_plural_map.get(required_organ_lower)
    if variant and variant in donor_organs_lower:
        return 100
    
    return 0


def calculate_urgency_multiplier(urgency_level: str) -> float:
    """
    Calculate urgency multiplier for requirement.
    
    Multipliers:
    - critical: 1.5x
    - high: 1.3x
    - medium: 1.0x
    """
    urgency_multipliers = {
        "critical": 1.5,
        "high": 1.3,
        "medium": 1.0,
    }
    return urgency_multipliers.get(urgency_level, 1.0)


def calculate_donor_age_from_dob(date_of_birth: str) -> int:
    """Calculate age from date of birth string."""
    try:
        if isinstance(date_of_birth, str):
            # Handle different date formats
            if "T" in date_of_birth or "Z" in date_of_birth:
                dob = datetime.fromisoformat(date_of_birth.replace("Z", "+00:00"))
            else:
                dob = datetime.strptime(date_of_birth, "%Y-%m-%d")
        else:
            dob = date_of_birth
        
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
    except Exception as e:
        logger.warning(f"Error calculating age from DOB: {e}")
        return 30  # Default age if calculation fails


def match_donors_for_requirement(
    requirement: Dict[str, Any],
    donors: List[Dict[str, Any]]
) -> List[Tuple[Dict[str, Any], int, Dict[str, Any]]]:
    """
    Match and score donors for a hospital requirement.
    
    Args:
        requirement: Hospital requirement dict
        donors: List of donor application dicts
    
    Returns:
        List of tuples (donor, total_score, score_breakdown) sorted by score descending
    """
    matches = []
    
    for donor in donors:
        # Calculate donor age
        donor_age = donor.get("age")
        if not donor_age and donor.get("date_of_birth"):
            donor_age = calculate_donor_age_from_dob(donor["date_of_birth"])
        
        # Calculate individual scores
        organ_score = calculate_organ_match_score(
            donor.get("organs", []),
            requirement.get("organ_required", "")
        )
        
        # Skip if organ doesn't match
        if organ_score == 0:
            continue
        
        blood_score = calculate_blood_group_score(
            donor.get("blood_group", ""),
            requirement.get("blood_group", "")
        )
        
        # Skip if blood group incompatible
        if blood_score == 0:
            continue
        
        location_score = calculate_location_score(
            donor.get("city", ""),
            donor.get("state", ""),
            requirement.get("hospital_name", ""),  # Using hospital_name as proxy
            requirement.get("hospital_name", "")
        )
        
        age_score = calculate_age_score(donor_age) if donor_age else 10
        
        # Calculate base score
        base_score = organ_score + blood_score + location_score + age_score
        
        # Apply urgency multiplier
        urgency_multiplier = calculate_urgency_multiplier(
            requirement.get("urgency_level", "medium")
        )
        total_score = int(base_score * urgency_multiplier)
        
        # Create score breakdown for transparency
        score_breakdown = {
            "organ_match": organ_score,
            "blood_compatibility": blood_score,
            "location_proximity": location_score,
            "age_suitability": age_score,
            "base_score": base_score,
            "urgency_multiplier": urgency_multiplier,
            "total_score": total_score,
        }
        
        matches.append((donor, total_score, score_breakdown))
    
    # Sort by score descending
    matches.sort(key=lambda x: x[1], reverse=True)
    
    return matches


def match_requirements_for_donor(
    donor: Dict[str, Any],
    requirements: List[Dict[str, Any]]
) -> List[Tuple[Dict[str, Any], int, Dict[str, Any]]]:
    """
    Match and score hospital requirements for a donor.
    
    Args:
        donor: Donor application dict
        requirements: List of hospital requirement dicts
    
    Returns:
        List of tuples (requirement, total_score, score_breakdown) sorted by score descending
    """
    matches = []
    
    # Calculate donor age
    donor_age = donor.get("age")
    if not donor_age and donor.get("date_of_birth"):
        donor_age = calculate_donor_age_from_dob(donor["date_of_birth"])
    
    for requirement in requirements:
        # Only match active requirements
        if requirement.get("status") != "active":
            continue
        
        # Calculate individual scores
        organ_score = calculate_organ_match_score(
            donor.get("organs", []),
            requirement.get("organ_required", "")
        )
        
        # Skip if organ doesn't match
        if organ_score == 0:
            continue
        
        blood_score = calculate_blood_group_score(
            donor.get("blood_group", ""),
            requirement.get("blood_group", "")
        )
        
        # Skip if blood group incompatible
        if blood_score == 0:
            continue
        
        location_score = calculate_location_score(
            donor.get("city", ""),
            donor.get("state", ""),
            requirement.get("hospital_name", ""),  # Using hospital_name as proxy
            requirement.get("hospital_name", "")
        )
        
        age_score = calculate_age_score(donor_age) if donor_age else 10
        
        # Calculate base score
        base_score = organ_score + blood_score + location_score + age_score
        
        # Apply urgency multiplier (higher urgency = more important match for donor to see)
        urgency_multiplier = calculate_urgency_multiplier(
            requirement.get("urgency_level", "medium")
        )
        total_score = int(base_score * urgency_multiplier)
        
        # Create score breakdown for transparency
        score_breakdown = {
            "organ_match": organ_score,
            "blood_compatibility": blood_score,
            "location_proximity": location_score,
            "age_suitability": age_score,
            "base_score": base_score,
            "urgency_multiplier": urgency_multiplier,
            "total_score": total_score,
        }
        
        matches.append((requirement, total_score, score_breakdown))
    
    # Sort by score descending (highest urgency and best matches first)
    matches.sort(key=lambda x: x[1], reverse=True)
    
    return matches
