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
            
            def sort(self, field: str, direction: int = 1):
                """Sort results by field."""
                reverse = (direction == -1)
                try:
                    self.results = sorted(
                        self.results, 
                        key=lambda x: x.get(field, ""), 
                        reverse=reverse
                    )
                except Exception:
                    pass
                return self
            
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
    donor_id_6 = str(uuid.uuid4())
    donor_id_7 = str(uuid.uuid4())
    donor_id_8 = str(uuid.uuid4())
    donor_id_9 = str(uuid.uuid4())
    donor_id_10 = str(uuid.uuid4())
    donor_id_11 = str(uuid.uuid4())
    donor_id_12 = str(uuid.uuid4())
    donor_id_13 = str(uuid.uuid4())
    donor_id_14 = str(uuid.uuid4())
    donor_id_15 = str(uuid.uuid4())
    hospital_id = str(uuid.uuid4())
    hospital_id_2 = str(uuid.uuid4())
    
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
            "id": donor_id_6,
            "email": "jessica.brown@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Jessica Brown",
            "mobile": "+1234567897",
            "age": 26,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_7,
            "email": "robert.garcia@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Robert Garcia",
            "mobile": "+1234567898",
            "age": 45,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_8,
            "email": "lisa.anderson@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Lisa Anderson",
            "mobile": "+1234567899",
            "age": 33,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_9,
            "email": "james.martinez@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "James Martinez",
            "mobile": "+1234567810",
            "age": 29,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_10,
            "email": "maria.rodriguez@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Maria Rodriguez",
            "mobile": "+1234567811",
            "age": 38,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_11,
            "email": "william.taylor@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "William Taylor",
            "mobile": "+1234567812",
            "age": 52,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_12,
            "email": "jennifer.lee@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Jennifer Lee",
            "mobile": "+1234567813",
            "age": 27,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_13,
            "email": "thomas.white@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Thomas White",
            "mobile": "+1234567814",
            "age": 41,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_14,
            "email": "patricia.harris@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Patricia Harris",
            "mobile": "+1234567815",
            "age": 36,
            "mobile_verified": True,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": donor_id_15,
            "email": "charles.clark@email.com",
            "hashed_password": pwd_context.hash("donor123"),
            "role": "donor",
            "name": "Charles Clark",
            "mobile": "+1234567816",
            "age": 48,
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
            "id": hospital_id_2,
            "email": "metro.hospital@email.com",
            "hashed_password": pwd_context.hash("hospital123"),
            "role": "hospital",
            "name": "Metro General Hospital",
            "mobile": "+1234567892",
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
            "mobile": "+1234567820",
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
            "city": "New York",
            "state": "New York",
            "country": "USA",
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
            "city": "Los Angeles",
            "state": "California",
            "country": "USA",
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
            "city": "Chicago",
            "state": "Illinois",
            "country": "USA",
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
            "city": "Houston",
            "state": "Texas",
            "country": "USA",
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
            "city": "Phoenix",
            "state": "Arizona",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_6,
            "donor_email": "jessica.brown@email.com",
            "full_name": "Jessica Brown",
            "email": "jessica.brown@email.com",
            "phone": "+1234567897",
            "date_of_birth": "1998-07-14",
            "blood_group": "A-",
            "organs": ["Kidneys", "Liver", "Corneas", "Bone"],
            "city": "Philadelphia",
            "state": "Pennsylvania",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_7,
            "donor_email": "robert.garcia@email.com",
            "full_name": "Robert Garcia",
            "email": "robert.garcia@email.com",
            "phone": "+1234567898",
            "date_of_birth": "1979-02-25",
            "blood_group": "B-",
            "organs": ["Heart", "Liver", "Pancreas", "Intestines"],
            "city": "San Antonio",
            "state": "Texas",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_8,
            "donor_email": "lisa.anderson@email.com",
            "full_name": "Lisa Anderson",
            "email": "lisa.anderson@email.com",
            "phone": "+1234567899",
            "date_of_birth": "1991-09-08",
            "blood_group": "AB-",
            "organs": ["Lungs", "Kidneys", "Corneas", "Skin"],
            "city": "San Diego",
            "state": "California",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_9,
            "donor_email": "james.martinez@email.com",
            "full_name": "James Martinez",
            "email": "james.martinez@email.com",
            "phone": "+1234567810",
            "date_of_birth": "1995-12-03",
            "blood_group": "O+",
            "organs": ["Heart", "Kidneys", "Liver", "Heart Valves"],
            "city": "Dallas",
            "state": "Texas",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_10,
            "donor_email": "maria.rodriguez@email.com",
            "full_name": "Maria Rodriguez",
            "email": "maria.rodriguez@email.com",
            "phone": "+1234567811",
            "date_of_birth": "1986-04-20",
            "blood_group": "A+",
            "organs": ["Liver", "Pancreas", "Intestines", "Corneas"],
            "city": "San Jose",
            "state": "California",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_11,
            "donor_email": "william.taylor@email.com",
            "full_name": "William Taylor",
            "email": "william.taylor@email.com",
            "phone": "+1234567812",
            "date_of_birth": "1972-06-17",
            "blood_group": "B+",
            "organs": ["Kidneys", "Liver", "Corneas"],
            "city": "Austin",
            "state": "Texas",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_12,
            "donor_email": "jennifer.lee@email.com",
            "full_name": "Jennifer Lee",
            "email": "jennifer.lee@email.com",
            "phone": "+1234567813",
            "date_of_birth": "1997-10-11",
            "blood_group": "O-",
            "organs": ["Heart", "Lungs", "Kidneys", "Liver", "Pancreas"],
            "city": "Jacksonville",
            "state": "Florida",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_13,
            "donor_email": "thomas.white@email.com",
            "full_name": "Thomas White",
            "email": "thomas.white@email.com",
            "phone": "+1234567814",
            "date_of_birth": "1983-01-28",
            "blood_group": "A-",
            "organs": ["Liver", "Kidneys", "Bone", "Skin"],
            "city": "Columbus",
            "state": "Ohio",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_14,
            "donor_email": "patricia.harris@email.com",
            "full_name": "Patricia Harris",
            "email": "patricia.harris@email.com",
            "phone": "+1234567815",
            "date_of_birth": "1988-08-05",
            "blood_group": "AB+",
            "organs": ["Heart", "Lungs", "Liver", "Corneas", "Heart Valves"],
            "city": "Fort Worth",
            "state": "Texas",
            "country": "USA",
            "consent": True,
            "status": "approved",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "donor_id": donor_id_15,
            "donor_email": "charles.clark@email.com",
            "full_name": "Charles Clark",
            "email": "charles.clark@email.com",
            "phone": "+1234567816",
            "date_of_birth": "1976-03-22",
            "blood_group": "B-",
            "organs": ["Kidneys", "Pancreas", "Intestines", "Bone"],
            "city": "Charlotte",
            "state": "North Carolina",
            "country": "USA",
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
    
    # Create sample notifications
    sample_notifications = [
        {
            "id": str(uuid.uuid4()),
            "user_id": hospital_id,
            "type": "match_found",
            "title": "🎯 5 Compatible Donors Found!",
            "message": "Found 5 compatible donors for Heart requirement (O+ blood group).",
            "link": "/hospital-dashboard",
            "read": False,
            "created_at": datetime.utcnow(),
            "metadata": {"match_count": 5, "organ": "Heart", "blood_group": "O+"}
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_1,
            "type": "match_found",
            "title": "❤️ 2 New Matching Requirements!",
            "message": "Found 2 hospitals looking for Heart, Kidneys donation. Your profile matches their requirements!",
            "link": "/donor-dashboard",
            "read": False,
            "created_at": datetime.utcnow(),
            "metadata": {"match_count": 2, "organs": ["Heart", "Kidneys"]}
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_1,
            "type": "status_change",
            "title": "📋 Donation Application Status Updated",
            "message": "Your donation application status has been changed from 'pending' to 'approved'.",
            "link": "/donor-dashboard",
            "read": True,
            "created_at": datetime.utcnow(),
            "metadata": {"status_type": "Donation Application", "old_status": "pending", "new_status": "approved"}
        }
    ]
    
    # Insert notifications
    for notification in sample_notifications:
        notif_id = notification['id']
        db.notifications._data[notif_id] = notification.copy()
    
    # Create sample shortlist entries
    sample_shortlist = [
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_1,
            "donor_name": "John Donor",
            "donor_email": "donor@organconnect.com",
            "blood_group": "O+",
            "organs": ["Heart", "Kidneys", "Liver", "Corneas"],
            "notes": "Strong match for heart requirement, contacted and confirmed availability",
            "added_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_5,
            "donor_name": "David Patel",
            "donor_email": "david.patel@email.com",
            "blood_group": "O-",
            "organs": ["Heart", "Kidneys", "Lungs", "Liver", "Corneas", "Pancreas"],
            "notes": "Universal donor, excellent health profile",
            "added_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_2,
            "donor_name": "Sarah Wilson",
            "donor_email": "sarah.wilson@email.com",
            "blood_group": "A+",
            "organs": ["Kidneys", "Liver", "Pancreas"],
            "notes": "Perfect match for kidney requirement",
            "added_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_9,
            "donor_name": "James Martinez",
            "donor_email": "james.martinez@email.com",
            "blood_group": "O+",
            "organs": ["Heart", "Kidneys", "Liver", "Heart Valves"],
            "notes": "Backup option for heart transplant",
            "added_at": datetime.utcnow()
        }
    ]
    
    # Insert shortlist entries
    for shortlist_item in sample_shortlist:
        item_id = shortlist_item['id']
        db.shortlist._data[item_id] = shortlist_item.copy()
    
    # Create sample contact history
    sample_contacts = [
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_1,
            "donor_name": "John Donor",
            "donor_email": "donor@organconnect.com",
            "contact_method": "phone",
            "notes": "Initial contact made, donor confirmed interest in heart donation",
            "contacted_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "hospital_id": hospital_id,
            "donor_id": donor_id_5,
            "donor_name": "David Patel",
            "donor_email": "david.patel@email.com",
            "contact_method": "email",
            "notes": "Sent detailed information about the transplant process",
            "contacted_at": datetime.utcnow()
        }
    ]
    
    # Insert contact history
    for contact in sample_contacts:
        contact_id = contact['id']
        db.contact_history._data[contact_id] = contact.copy()
    
    print("Mock database seeded with test users:")
    print("   - donor@organconnect.com / donor123 (with donation application)")
    print("   - hospital@organconnect.com / hospital123 (with requirements)")
    print("   - admin@organconnect.com / admin123")
    print(f"   - Created {len(sample_donations)} approved donor applications")
    print(f"   - Created {len(sample_requirements)} hospital requirements")
    print(f"   - Created {len(sample_notifications)} sample notifications")
    print(f"   - Created {len(sample_shortlist)} shortlist entries")
    print(f"   - Created {len(sample_contacts)} contact history entries")