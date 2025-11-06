"""
File Upload Service
Handles file uploads with support for local storage and cloud storage (S3)
Configurable to easily switch between storage providers
"""
import os
import uuid
import logging
from pathlib import Path
from typing import Optional, Tuple
from fastapi import UploadFile, HTTPException

logger = logging.getLogger(__name__)

# Configuration
UPLOAD_DIR = Path("/app/backend/uploads")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png"
}

# Storage type (can be changed to 's3' in the future)
STORAGE_TYPE = os.environ.get("STORAGE_TYPE", "local")


class FileUploadService:
    """Service for handling file uploads"""
    
    def __init__(self):
        self.storage_type = STORAGE_TYPE
        self.upload_dir = UPLOAD_DIR
        
        # Create upload directory if it doesn't exist
        if self.storage_type == "local":
            self.upload_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"✅ Upload directory created/verified: {self.upload_dir}")
    
    def validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        """
        Validate uploaded file
        
        Returns:
            Tuple[bool, str]: (is_valid, error_message)
        """
        # Check file extension
        file_ext = Path(file.filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            return False, f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        
        # Check MIME type
        if file.content_type not in ALLOWED_MIME_TYPES:
            return False, f"Invalid MIME type. Allowed types: {', '.join(ALLOWED_MIME_TYPES)}"
        
        return True, ""
    
    async def upload_file(
        self,
        file: UploadFile,
        folder: str = "reports"
    ) -> Tuple[str, str]:
        """
        Upload file to storage
        
        Args:
            file: UploadFile object from FastAPI
            folder: Subfolder to store the file in
            
        Returns:
            Tuple[str, str]: (file_url, file_path)
            
        Raises:
            HTTPException: If validation fails or upload fails
        """
        # Validate file
        is_valid, error_msg = self.validate_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Check file size
        file.file.seek(0, 2)  # Seek to end
        file_size = file.file.tell()
        file.file.seek(0)  # Reset to beginning
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / (1024 * 1024):.1f} MB"
            )
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        
        if self.storage_type == "local":
            return await self._upload_local(file, folder, unique_filename)
        elif self.storage_type == "s3":
            # Placeholder for S3 upload implementation
            return await self._upload_s3(file, folder, unique_filename)
        else:
            raise HTTPException(status_code=500, detail="Invalid storage type configured")
    
    async def _upload_local(
        self,
        file: UploadFile,
        folder: str,
        filename: str
    ) -> Tuple[str, str]:
        """Upload file to local storage"""
        try:
            # Create folder if it doesn't exist
            folder_path = self.upload_dir / folder
            folder_path.mkdir(parents=True, exist_ok=True)
            
            # Full file path
            file_path = folder_path / filename
            
            # Save file
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            
            # Generate URL (relative path for serving with /api prefix)
            file_url = f"/api/uploads/{folder}/{filename}"
            
            logger.info(f"✅ File uploaded successfully: {file_path}")
            
            return file_url, str(file_path)
            
        except Exception as e:
            logger.error(f"❌ Error uploading file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")
    
    async def _upload_s3(
        self,
        file: UploadFile,
        folder: str,
        filename: str
    ) -> Tuple[str, str]:
        """
        Upload file to S3 (placeholder for future implementation)
        
        To implement:
        1. pip install boto3
        2. Configure AWS credentials
        3. Use boto3 to upload to S3
        4. Return S3 URL
        """
        raise HTTPException(
            status_code=501,
            detail="S3 upload not implemented yet. Use local storage."
        )
    
    async def delete_file(self, file_path: str) -> bool:
        """
        Delete file from storage
        
        Args:
            file_path: Path to the file
            
        Returns:
            bool: True if deleted successfully
        """
        if self.storage_type == "local":
            try:
                path = Path(file_path)
                if path.exists():
                    path.unlink()
                    logger.info(f"✅ File deleted: {file_path}")
                    return True
                return False
            except Exception as e:
                logger.error(f"❌ Error deleting file: {str(e)}")
                return False
        elif self.storage_type == "s3":
            # Placeholder for S3 deletion
            pass
        
        return False
    
    def get_file_info(self, file_url: str) -> dict:
        """Get file information"""
        if self.storage_type == "local":
            # Extract path from URL
            file_path = file_url.replace("/uploads/", str(self.upload_dir) + "/")
            path = Path(file_path)
            
            if path.exists():
                return {
                    "exists": True,
                    "size": path.stat().st_size,
                    "filename": path.name,
                    "extension": path.suffix
                }
        
        return {"exists": False}


# Singleton instance
file_upload_service = FileUploadService()
