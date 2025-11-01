"""
Notification Service
Handles creating and managing in-app notifications for users.
"""
from typing import Optional, List
from datetime import datetime
import logging
from models import Notification, NotificationCreate

logger = logging.getLogger(__name__)


async def create_notification(
    db,
    user_id: str,
    notification_type: str,
    title: str,
    message: str,
    link: Optional[str] = None,
    metadata: Optional[dict] = None
) -> Notification:
    """
    Create a new notification for a user.
    
    Args:
        db: Database instance
        user_id: User ID to send notification to
        notification_type: Type of notification
        title: Notification title
        message: Notification message
        link: Optional link to relevant page
        metadata: Optional additional data
    
    Returns:
        Created notification object
    """
    notification = Notification(
        user_id=user_id,
        type=notification_type,
        title=title,
        message=message,
        link=link,
        metadata=metadata or {}
    )
    
    await db.notifications.insert_one(notification.model_dump())
    logger.info(f"Notification created for user {user_id}: {title}")
    
    return notification


async def create_match_notification_for_hospital(
    db,
    hospital_id: str,
    requirement_id: str,
    match_count: int,
    requirement_details: dict
):
    """Create notification when new matches are found for a hospital requirement."""
    title = f"🎯 {match_count} Compatible Donor{'s' if match_count > 1 else ''} Found!"
    message = (
        f"Found {match_count} compatible donor{'s' if match_count > 1 else ''} for "
        f"{requirement_details.get('organ_required', 'organ')} requirement "
        f"({requirement_details.get('blood_group', '')} blood group)."
    )
    
    await create_notification(
        db=db,
        user_id=hospital_id,
        notification_type="match_found",
        title=title,
        message=message,
        link=f"/hospital-dashboard?requirement={requirement_id}",
        metadata={
            "requirement_id": requirement_id,
            "match_count": match_count,
            "organ": requirement_details.get("organ_required"),
            "blood_group": requirement_details.get("blood_group"),
        }
    )


async def create_match_notification_for_donor(
    db,
    donor_id: str,
    match_count: int,
    donor_organs: List[str]
):
    """Create notification when new matching requirements are found for a donor."""
    organs_str = ", ".join(donor_organs[:2]) if len(donor_organs) <= 2 else f"{donor_organs[0]} and others"
    
    title = f"❤️ {match_count} New Matching Requirement{'s' if match_count > 1 else ''}!"
    message = (
        f"Found {match_count} hospital{'s' if match_count > 1 else ''} looking for "
        f"{organs_str} donation. Your profile matches their requirements!"
    )
    
    await create_notification(
        db=db,
        user_id=donor_id,
        notification_type="match_found",
        title=title,
        message=message,
        link="/donor-dashboard",
        metadata={
            "match_count": match_count,
            "organs": donor_organs,
        }
    )


async def create_status_change_notification(
    db,
    user_id: str,
    status_type: str,
    old_status: str,
    new_status: str,
    item_name: str
):
    """Create notification when application or requirement status changes."""
    title = f"📋 {status_type} Status Updated"
    message = f"Your {item_name} status has been changed from '{old_status}' to '{new_status}'."
    
    await create_notification(
        db=db,
        user_id=user_id,
        notification_type="status_change",
        title=title,
        message=message,
        metadata={
            "status_type": status_type,
            "old_status": old_status,
            "new_status": new_status,
        }
    )


async def create_contact_notification_for_donor(
    db,
    donor_id: str,
    hospital_name: str,
    contact_method: str
):
    """Create notification when a hospital contacts a donor."""
    title = f"📞 Hospital Contact Received"
    message = f"{hospital_name} has contacted you via {contact_method}. Check your contact history for details."
    
    await create_notification(
        db=db,
        user_id=donor_id,
        notification_type="contact_received",
        title=title,
        message=message,
        link="/donor-dashboard",
        metadata={
            "hospital_name": hospital_name,
            "contact_method": contact_method,
        }
    )


async def create_new_requirement_notification(
    db,
    donor_id: str,
    requirement_details: dict
):
    """Create notification when a new requirement matches donor's profile."""
    title = f"🆕 New Urgent Requirement"
    message = (
        f"A new {requirement_details.get('urgency_level', 'medium')} priority requirement for "
        f"{requirement_details.get('organ_required', 'organ')} has been posted and matches your profile!"
    )
    
    await create_notification(
        db=db,
        user_id=donor_id,
        notification_type="new_requirement",
        title=title,
        message=message,
        link="/donor-dashboard",
        metadata={
            "requirement_id": requirement_details.get("id"),
            "organ": requirement_details.get("organ_required"),
            "urgency": requirement_details.get("urgency_level"),
        }
    )


async def mark_notification_as_read(db, notification_id: str, user_id: str) -> bool:
    """Mark a notification as read."""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user_id},
        {"$set": {"read": True}}
    )
    return result.modified_count > 0


async def mark_all_notifications_as_read(db, user_id: str) -> int:
    """Mark all notifications for a user as read."""
    result = await db.notifications.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return result.modified_count


async def get_user_notifications(
    db,
    user_id: str,
    unread_only: bool = False,
    limit: int = 50
) -> List[Notification]:
    """Get notifications for a user."""
    query = {"user_id": user_id}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(limit)
    return [Notification(**notif) for notif in notifications]


async def get_unread_count(db, user_id: str) -> int:
    """Get count of unread notifications for a user."""
    notifications = await db.notifications.find({"user_id": user_id, "read": False}).to_list(1000)
    return len(notifications)


async def delete_notification(db, notification_id: str, user_id: str) -> bool:
    """Delete a notification."""
    result = await db.notifications.delete_one({"id": notification_id, "user_id": user_id})
    return result.deleted_count > 0
