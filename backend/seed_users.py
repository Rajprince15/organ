"""Seed demo users for testing."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os
import sys

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

from models import User
from auth_utils import get_password_hash

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

async def seed_demo_users():
    """Seed demo users into database."""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    demo_users = [
        {
            "email": "donor@organconnect.com",
            "password": "donor123",
            "role": "donor",
            "name": "Demo Donor",
            "mobile": "9876543210",
            "age": 30
        },
        {
            "email": "hospital@organconnect.com",
            "password": "hospital123",
            "role": "hospital",
            "name": "Demo Hospital",
            "mobile": "9876543211",
            "age": None
        },
        {
            "email": "admin@organconnect.com",
            "password": "admin123",
            "role": "admin",
            "name": "Admin User",
            "mobile": "9876543212",
            "age": None
        }
    ]
    
    for user_data in demo_users:
        # Check if user already exists
        existing = await db.users.find_one({"email": user_data["email"]})
        if existing:
            print(f"User {user_data['email']} already exists, skipping...")
            continue
        
        # Create user
        user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            role=user_data["role"],
            name=user_data["name"],
            mobile=user_data["mobile"],
            age=user_data["age"],
            mobile_verified=True
        )
        
        await db.users.insert_one(user.dict())
        print(f"Created demo user: {user_data['email']} (role: {user_data['role']})")
    
    client.close()
    print("\nDemo users seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_demo_users())
