"""
Mock database for development without MongoDB.
This provides an in-memory database that mimics Motor's async API.
"""
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime


class MockCollection:
    """Mock MongoDB collection with async API."""
    
    def __init__(self, name: str):
        self.name = name
        self._data: Dict[str, Dict] = {}
    
    async def find_one(self, filter_dict: Dict) -> Optional[Dict]:
        """Find one document matching the filter."""
        for doc_id, doc in self._data.items():
            match = True
            for key, value in filter_dict.items():
                if doc.get(key) != value:
                    match = False
                    break
            if match:
                return doc.copy()
        return None
    
    async def insert_one(self, document: Dict) -> Any:
        """Insert a document."""
        if 'id' not in document:
            document['id'] = str(uuid.uuid4())
        
        doc_id = document.get('id', str(uuid.uuid4()))
        self._data[doc_id] = document.copy()
        
        class InsertResult:
            def __init__(self, inserted_id):
                self.inserted_id = inserted_id
        
        return InsertResult(doc_id)
    
    async def update_one(self, filter_dict: Dict, update_dict: Dict) -> Any:
        """Update one document."""
        for doc_id, doc in self._data.items():
            match = True
            for key, value in filter_dict.items():
                if doc.get(key) != value:
                    match = False
                    break
            if match:
                if '$set' in update_dict:
                    doc.update(update_dict['$set'])
                else:
                    doc.update(update_dict)
                doc['updated_at'] = datetime.utcnow()
                
                class UpdateResult:
                    def __init__(self):
                        self.modified_count = 1
                
                return UpdateResult()
        
        class UpdateResult:
            def __init__(self):
                self.modified_count = 0
        
        return UpdateResult()
    
    async def delete_one(self, filter_dict: Dict) -> Any:
        """Delete one document."""
        for doc_id, doc in list(self._data.items()):
            match = True
            for key, value in filter_dict.items():
                if doc.get(key) != value:
                    match = False
                    break
            if match:
                del self._data[doc_id]
                
                class DeleteResult:
                    def __init__(self):
                        self.deleted_count = 1
                
                return DeleteResult()
        
        class DeleteResult:
            def __init__(self):
                self.deleted_count = 0
        
        return DeleteResult()
    
    def find(self, filter_dict: Dict = None):
        """Find documents matching the filter."""
        if filter_dict is None:
            filter_dict = {}
        
        results = []
        for doc_id, doc in self._data.items():
            if not filter_dict:
                results.append(doc.copy())
            else:
                match = True
                for key, value in filter_dict.items():
                    if doc.get(key) != value:
                        match = False
                        break
                if match:
                    results.append(doc.copy())
        
        class MockCursor:
            def __init__(self, results):
                self.results = results
            
            async def to_list(self, length: int) -> List[Dict]:
                return self.results[:length] if length else self.results
        
        return MockCursor(results)


class MockDatabase:
    """Mock MongoDB database."""
    
    def __init__(self, name: str):
        self.name = name
        self._collections: Dict[str, MockCollection] = {}
    
    def __getattr__(self, name: str) -> MockCollection:
        """Get or create a collection."""
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]
    
    def __getitem__(self, name: str) -> MockCollection:
        """Get or create a collection using dict notation."""
        if name not in self._collections:
            self._collections[name] = MockCollection(name)
        return self._collections[name]


class MockMongoClient:
    """Mock MongoDB client."""
    
    def __init__(self, url: str):
        self.url = url
        self._databases: Dict[str, MockDatabase] = {}
    
    def __getitem__(self, name: str) -> MockDatabase:
        """Get or create a database."""
        if name not in self._databases:
            self._databases[name] = MockDatabase(name)
        return self._databases[name]
    
    def close(self):
        """Close connection (no-op for mock)."""
        pass


def seed_mock_data(db: MockDatabase):
    """Seed the mock database with test data (synchronous version)."""
    from passlib.context import CryptContext
    
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    
    # Create test users with fixed IDs for reference
    donor_id_1 = str(uuid.uuid4())
    donor_id_2 = str(uuid.uuid4())
    donor_id_3 = str(uuid.uuid4())
    donor_id_4 = str(uuid.uuid4())
    donor_id_5 = str(uuid.uuid4())
    hospital_id = str(uuid.uuid4())
    
    test_users = [
        {
            "id": donor_id_1,
            "email": "donor@organconnect.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "John Donor",
            "mobile": "+1234567890",
            "age": 30,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_2,
            "email": "sarah.wilson@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Sarah Wilson",
            "mobile": "+1234567893",
            "age": 28,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_3,
            "email": "michael.chen@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Michael Chen",
            "mobile": "+1234567894",
            "age": 35,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_4,
            "email": "emma.johnson@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Emma Johnson",
            "mobile": "+1234567895",
            "age": 42,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_5,
            "email": "david.patel@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "David Patel",
            "mobile": "+1234567896",
            "age": 31,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": hospital_id,
            "email": "hospital@organconnect.com",
            "hashed_password": pwd_context.hash("hospital123"),
            "role": "hospital",
            "name": "City Hospital",
            "mobile": "+1234567891",
            "age": None,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "email": "admin@organconnect.com",
            "hashed_password": pwd_context.hash("admin123"),
            "role": "admin",
            "name": "Admin User",
            "mobile": "+1234567892",
            "age": 35,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert users synchronously (directly into the mock collection)
    for user in test_users:
        if 'id' not in user:
            user['id'] = str(uuid.uuid4())
        doc_id = user['id']
        db.users._data[doc_id] = user.copy()
    
    # Create multiple sample donation applications with approved status
    sample_donations = [
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_1,
            "donor_email": "donor@organconnect.com",
            "full_name": "John Donor",
            "email": "donor@organconnect.com",
            "phone": "+1234567890",
            "date_of_birth": "1994-01-15",
            "blood_group": "O+",
            "organs": ["Heart", "Kidneys", "Liver", "Corneas"],
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_2,
            "donor_email": "sarah.wilson@email.com",
            "full_name": "Sarah Wilson",
            "email": "sarah.wilson@email.com",
            "phone": "+1234567893",
            "date_of_birth": "1996-05-22",
            "blood_group": "A+",
            "organs": ["Kidneys", "Liver", "Pancreas"],
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_3,
            "donor_email": "michael.chen@email.com",
            "full_name": "Michael Chen",
            "email": "michael.chen@email.com",
            "phone": "+1234567894",
            "date_of_birth": "1989-08-10",
            "blood_group": "B+",
            "organs": ["Heart", "Lungs", "Corneas"],
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_4,
            "donor_email": "emma.johnson@email.com",
            "full_name": "Emma Johnson",
            "email": "emma.johnson@email.com",
            "phone": "+1234567895",
            "date_of_birth": "1982-11-30",
            "blood_group": "AB+",
            "organs": ["Liver", "Kidneys", "Heart Valves", "Skin"],
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_5,
            "donor_email": "david.patel@email.com",
            "full_name": "David Patel",
            "email": "david.patel@email.com",
            "phone": "+1234567896",
            "date_of_birth": "1993-03-18",
            "blood_group": "O-",
            "organs": ["Heart", "Kidneys", "Lungs", "Liver", "Corneas", "Pancreas"],
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert donation applications
    for donation in sample_donations:
        donation_id = donation['id']
        db.donation_applications._data[donation_id] = donation.copy()
    
    # Create sample hospital requirements
    sample_requirements = [
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "hospital_name": "City Hospital",
            "patient_name": "Robert Anderson",
            "age": 45,
            "blood_group": "O+",
            "organ_required": "Heart",
            "urgency_level": "critical",
            "doctor_name": "Dr. Emily Stevens",
            "contact_number": "+1234567897",
            "email": "emergency@cityhospital.com",
            "medical_history": "Severe heart failure, previous MI, requires urgent transplant",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "hospital_name": "City Hospital",
            "patient_name": "Lisa Martinez",
            "age": 38,
            "blood_group": "A+",
            "organ_required": "Kidneys",
            "urgency_level": "high",
            "doctor_name": "Dr. James Wilson",
            "contact_number": "+1234567898",
            "email": "nephrology@cityhospital.com",
            "medical_history": "End-stage renal disease, on dialysis for 2 years",
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert hospital requirements
    for requirement in sample_requirements:
        req_id = requirement['id']
        db.hospital_requirements._data[req_id] = requirement.copy()
    
    print("Mock database seeded with test users:")
    print("   - donor@organconnect.com / donor123 (with donation application)")
    print("   - hospital@organconnect.com / hospital123 (with requirements)")
    print("   - admin@organconnect.com / admin123")
    print(f"   - Created {len(sample_donations)} approved donor applications")
    print(f"   - Created {len(sample_requirements)} hospital requirements")