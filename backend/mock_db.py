"""
Mock database for development without MongoDB.
This provides an in-memory database that mimics Motor's async API.
"""
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime, timedelta


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
    
    # Create multiple sample donation applications with mixed statuses
    # Active donors = eligible and have reports
    # Approved donors = awaiting eligibility checkup
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_1_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_2_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_3_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_4_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_5_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_6_eligibility_report.pdf",
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
            "status": "active",
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_7_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_8_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_9_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_10_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_11_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_12_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_13_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_14_eligibility_report.pdf",
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
            "checkup_status": "eligible",
            "eligibility_report_url": "/api/uploads/reports/donor_15_eligibility_report.pdf",
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
    
    # Create sample community posts
    sample_posts = [
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_1,
            "author_name": "John Donor",
            "author_image": "🎁",
            "content": "Every 10 minutes, someone is added to the organ transplant waiting list. Register today and give the gift of life! 💚",
            "image": "🏥",
            "post_type": "post",
            "likes": 567,
            "comments_count": 45,
            "shares": 89,
            "is_flagged": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_2,
            "author_name": "Sarah Wilson",
            "author_image": "🇮🇳",
            "content": "Success story: Thanks to our network, a heart transplant was completed in record time, saving a 35-year-old father of two. #OrganDonation",
            "image": "❤️‍🩹",
            "post_type": "post",
            "likes": 892,
            "comments_count": 67,
            "shares": 156,
            "is_flagged": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_3,
            "author_name": "Dr. Sharma",
            "author_image": "🩺",
            "content": "A quick guide to the organ donation process and its life-saving impact.",
            "image": "🫀",
            "post_type": "reel",
            "likes": 1234,
            "comments_count": 89,
            "shares": 234,
            "is_flagged": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_4,
            "author_name": "Priya Kumar",
            "author_image": "👩",
            "content": "Sharing my story of receiving a second chance at life through organ donation.",
            "image": "💚",
            "post_type": "reel",
            "likes": 2341,
            "comments_count": 156,
            "shares": 445,
            "is_flagged": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": donor_id_5,
            "author_name": "David Patel",
            "author_image": "👨",
            "content": "My experience donating a kidney to save my brother's life.",
            "image": "❤️",
            "post_type": "reel",
            "likes": 4567,
            "comments_count": 301,
            "shares": 890,
            "is_flagged": False,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert community posts
    for post in sample_posts:
        post_id = post['id']
        db.community_posts._data[post_id] = post.copy()
    
    # Create sample events
    sample_events = [
        {
            "id": str(uuid.uuid4()),
            "title": "National Organ Donation Day",
            "description": "Join us for a nationwide celebration and awareness campaign for organ donation.",
            "date": "2025-08-13",
            "time": "10:00 AM - 4:00 PM",
            "location": "Pan-India Virtual Event",
            "organizer_id": hospital_id,
            "organizer_name": "City Hospital",
            "attendees_count": 1234,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Awareness Walk - Delhi",
            "description": "Community walk to raise awareness about organ donation in the capital.",
            "date": "2025-09-05",
            "time": "7:00 AM - 9:00 AM",
            "location": "India Gate, New Delhi",
            "organizer_id": hospital_id_2,
            "organizer_name": "Regional Medical Center",
            "attendees_count": 456,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Medical Seminar on Transplants",
            "description": "Educational seminar for medical professionals and interested individuals.",
            "date": "2025-10-12",
            "time": "2:00 PM - 6:00 PM",
            "location": "AIIMS, Mumbai",
            "organizer_id": hospital_id,
            "organizer_name": "City Hospital",
            "attendees_count": 289,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Blood Donation Camp",
            "description": "Special blood donation drive in support of transplant patients.",
            "date": "2025-11-20",
            "time": "9:00 AM - 5:00 PM",
            "location": "Community Center, Bangalore",
            "organizer_id": hospital_id,
            "organizer_name": "City Hospital",
            "attendees_count": 567,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert events
    for event in sample_events:
        event_id = event['id']
        db.events._data[event_id] = event.copy()
    
    # Create sample resources
    sample_resources = [
        {
            "id": str(uuid.uuid4()),
            "title": "The Complete Guide to Organ Donation Process",
            "description": "Step-by-step explanation of how organ donation works from registration to transplant.",
            "content": "Detailed guide content about the organ donation process...",
            "category": "Process",
            "author_id": str(uuid.uuid4()),
            "author_name": "Admin Team",
            "is_published": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Understanding Brain Death vs. Cardiac Death",
            "description": "Medical explanation of different types of death and their relation to organ donation.",
            "content": "Comprehensive medical explanation about brain death and cardiac death...",
            "category": "Medical",
            "author_id": str(uuid.uuid4()),
            "author_name": "Admin Team",
            "is_published": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Legal Framework of Organ Donation in India",
            "description": "Overview of the Transplantation of Human Organs Act and your rights as a donor.",
            "content": "Legal information about organ donation in India...",
            "category": "Legal",
            "author_id": str(uuid.uuid4()),
            "author_name": "Admin Team",
            "is_published": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Myths vs. Facts About Organ Donation",
            "description": "Debunking common misconceptions and providing evidence-based information.",
            "content": "Common myths and facts about organ donation...",
            "category": "Awareness",
            "author_id": str(uuid.uuid4()),
            "author_name": "Admin Team",
            "is_published": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert resources
    for resource in sample_resources:
        resource_id = resource['id']
        db.resources._data[resource_id] = resource.copy()
    

    # Create sample match logs for Phase 3A
    # First, let's capture requirement IDs for reference
    req_ids = [req['id'] for req in sample_requirements]
    
    sample_match_logs = [
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_1,
            "donor_name": "John Donor",
            "requirement_id": req_ids[0] if len(req_ids) > 0 else str(uuid.uuid4()),
            "requirement_details": "Heart for Robert Anderson",
            "hospital_id": hospital_id,
            "hospital_name": "City General Hospital",
            "match_score": 220,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 50,
                "location_proximity": 30,
                "age_suitability": 20,
                "base_score": 200,
                "urgency_multiplier": 1.5,
                "total_score": 220
            },
            "status": "auto_matched",
            "admin_notes": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_2,
            "donor_name": "Sarah Wilson",
            "requirement_id": req_ids[0] if len(req_ids) > 0 else str(uuid.uuid4()),
            "requirement_details": "Heart for Robert Anderson",
            "hospital_id": hospital_id,
            "hospital_name": "City General Hospital",
            "match_score": 195,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 40,
                "location_proximity": 30,
                "age_suitability": 20,
                "base_score": 190,
                "urgency_multiplier": 1.5,
                "total_score": 195
            },
            "status": "manually_approved",
            "admin_notes": "Excellent match, recommended for transplant",
            "approved_by": "admin_123",
            "approved_at": datetime.utcnow(),
            "created_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_3,
            "donor_name": "Michael Chen",
            "requirement_id": req_ids[1] if len(req_ids) > 1 else str(uuid.uuid4()),
            "requirement_details": "Kidney for Lisa Martinez",
            "hospital_id": hospital_id,
            "hospital_name": "City General Hospital",
            "match_score": 175,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 50,
                "location_proximity": 20,
                "age_suitability": 20,
                "base_score": 190,
                "urgency_multiplier": 1.3,
                "total_score": 175
            },
            "status": "auto_matched",
            "admin_notes": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": datetime.utcnow() - timedelta(hours=5)
        },
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_4,
            "donor_name": "Emma Johnson",
            "requirement_id": req_ids[0] if len(req_ids) > 0 else str(uuid.uuid4()),
            "requirement_details": "Heart for Robert Anderson",
            "hospital_id": hospital_id,
            "hospital_name": "City General Hospital",
            "match_score": 160,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 40,
                "location_proximity": 30,
                "age_suitability": 15,
                "base_score": 185,
                "urgency_multiplier": 1.0,
                "total_score": 160
            },
            "status": "manually_rejected",
            "admin_notes": "Patient found better match in another region",
            "approved_by": "admin_123",
            "approved_at": datetime.utcnow() - timedelta(days=2),
            "created_at": datetime.utcnow() - timedelta(days=3)
        },
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_5,
            "donor_name": "David Brown",
            "requirement_id": req_ids[1] if len(req_ids) > 1 else str(uuid.uuid4()),
            "requirement_details": "Kidney for Lisa Martinez",
            "hospital_id": hospital_id_2,
            "hospital_name": "Metro Care Hospital",
            "match_score": 210,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 50,
                "location_proximity": 30,
                "age_suitability": 20,
                "base_score": 200,
                "urgency_multiplier": 1.5,
                "total_score": 210
            },
            "status": "auto_matched",
            "admin_notes": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": datetime.utcnow() - timedelta(hours=12)
        },
        {
            "id": str(uuid.uuid4()),
            "match_type": "donor_to_requirement",
            "donor_id": donor_id_6,
            "donor_name": "Jessica Taylor",
            "requirement_id": req_ids[0] if len(req_ids) > 0 else str(uuid.uuid4()),
            "requirement_details": "Heart for Robert Anderson",
            "hospital_id": hospital_id_2,
            "hospital_name": "Metro Care Hospital",
            "match_score": 155,
            "score_breakdown": {
                "organ_match": 100,
                "blood_compatibility": 40,
                "location_proximity": 20,
                "age_suitability": 20,
                "base_score": 180,
                "urgency_multiplier": 1.0,
                "total_score": 155
            },
            "status": "pending",
            "admin_notes": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": datetime.utcnow() - timedelta(hours=2)
        }
    ]
    
    # Insert match logs
    for match_log in sample_match_logs:
        match_log_id = match_log['id']
        db.match_logs._data[match_log_id] = match_log.copy()
    
    # Create default algorithm configuration
    default_algorithm_config = {
        "id": str(uuid.uuid4()),
        "organ_match_weight": 100,
        "blood_compatibility_weight": 50,
        "location_proximity_weight": 30,
        "age_suitability_weight": 20,
        "critical_urgency_multiplier": 1.5,
        "high_urgency_multiplier": 1.3,
        "medium_urgency_multiplier": 1.0,
        "min_match_score_threshold": 100,
        "updated_by": None,
        "updated_at": datetime.utcnow()
    }
    
    db.algorithm_config._data[default_algorithm_config['id']] = default_algorithm_config.copy()

    # ============================================
    # PHASE 3B - SUPPORT SYSTEM SEED DATA
    # ============================================
    
    # Create sample FAQs
    admin_id = str(uuid.uuid4())
    
    sample_faqs = [
        {
            "id": str(uuid.uuid4()),
            "question": "How do I register as an organ donor?",
            "answer": "To register as an organ donor, click on 'Become a Donor' on our homepage, fill out the registration form with your personal details, select the organs you wish to donate, and submit. You'll receive a confirmation email with your donor card.",
            "category": "Registration",
            "order": 1,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "What organs can I donate?",
            "answer": "You can donate organs including Heart, Lungs, Liver, Kidneys, Pancreas, Intestines, as well as tissues like Corneas, Skin, Heart Valves, Bone, and Blood vessels. The eligibility for each organ depends on various medical factors.",
            "category": "Donation Process",
            "order": 2,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "Is there an age limit for organ donation?",
            "answer": "There is no strict age limit for organ donation. People of all ages can register as donors. Medical professionals will determine at the time of death which organs and tissues are suitable for donation based on health condition.",
            "category": "Eligibility",
            "order": 3,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "Will organ donation affect my medical care?",
            "answer": "No, absolutely not. Your decision to be an organ donor will not affect the quality of medical care you receive. Doctors will do everything possible to save your life first. Organ donation is only considered after all life-saving efforts have failed.",
            "category": "Medical",
            "order": 4,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "Can my family override my decision to donate?",
            "answer": "Legally, your registered consent is binding. However, we always involve families in the process out of respect. It's important to discuss your decision with your family so they understand and support your choice.",
            "category": "Legal",
            "order": 5,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "How are organ recipients chosen?",
            "answer": "Recipients are chosen based on medical compatibility (blood type, tissue type, organ size), urgency of need, time on waiting list, and geographical proximity. The matching process is handled by medical professionals following strict ethical guidelines.",
            "category": "Matching Process",
            "order": 6,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "Is organ donation against any religion?",
            "answer": "Most major religions support organ donation as an act of charity and compassion. However, beliefs vary within religions and families. We encourage you to consult with your religious leaders if you have concerns.",
            "category": "Religious",
            "order": 7,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "Can I change my mind after registering?",
            "answer": "Yes, you can update or cancel your registration at any time. Simply log into your account, go to your donor profile, and make the desired changes. Your wishes will be respected.",
            "category": "Registration",
            "order": 8,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "What happens to my body after organ donation?",
            "answer": "Organ donation is performed with the same care and respect as any other surgery. After donation, your body is released to your family for funeral arrangements. The donation process does not delay funeral plans or change the appearance of the body.",
            "category": "Process",
            "order": 9,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "question": "How can hospitals access donor information?",
            "answer": "Registered hospitals can search for compatible donors through our secure platform. They can view donor profiles, check compatibility, and initiate contact through the system while maintaining donor privacy and following all regulatory guidelines.",
            "category": "For Hospitals",
            "order": 10,
            "is_published": True,
            "created_by": admin_id,
            "created_by_name": "Admin Team",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert FAQs
    for faq in sample_faqs:
        faq_id = faq['id']
        db.faqs._data[faq_id] = faq.copy()
    
    # Create sample help documents
    sample_help_docs = [
        {
            "id": str(uuid.uuid4()),
            "title": "Getting Started as a Donor",
            "content": """
# Getting Started as a Donor

Welcome to the Organ Donation Platform! This guide will help you get started with registering as an organ donor.

## Step 1: Create an Account
1. Click on 'Register' in the top right corner
2. Choose 'Donor' as your role
3. Fill in your email, name, and create a secure password
4. Verify your email address

## Step 2: Complete Your Donor Profile
1. Log in to your account
2. Navigate to 'Donor Registration'
3. Fill out the detailed form including:
   - Personal information (name, DOB, contact details)
   - Medical information (blood group, medical history)
   - Select organs you wish to donate
   - Provide consent

## Step 3: After Registration
- You'll receive a confirmation email with your donor card
- Your profile will be reviewed by our medical team
- Once approved, you'll be added to the donor registry
- Hospitals can view your profile when searching for compatible donors

## Important Tips
- Keep your information updated
- Discuss your decision with your family
- Carry your donor card or note it on your driver's license
- You can change your donation preferences anytime

## Need Help?
If you have questions, check our FAQs or create a support ticket from your dashboard.
            """,
            "category": "Getting Started",
            "tags": ["donor", "registration", "beginner"],
            "is_published": True,
            "author_id": admin_id,
            "author_name": "Admin Team",
            "views": 245,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Hospital Guide: Finding Compatible Donors",
            "content": """
# Hospital Guide: Finding Compatible Donors

This guide explains how hospitals can effectively use the platform to find compatible organ donors.

## Accessing the Donor Database
1. Log in with your hospital credentials
2. Navigate to 'Donor List' or 'Compatible Donors'
3. Use filters to narrow your search:
   - Organ type
   - Blood group
   - Age range
   - Location
   - Availability status

## Advanced Matching System
Our platform uses intelligent algorithms to match donors with recipients based on:
- Medical compatibility (blood type, tissue matching)
- Geographical proximity
- Urgency level of requirement
- Donor preferences

## Creating a Requirement
1. Go to 'Requirements' section
2. Click 'Create New Requirement'
3. Fill in patient details:
   - Patient information
   - Required organ
   - Urgency level
   - Medical history
4. Our system will automatically find and notify compatible donors

## Shortlist Feature
- Add promising donors to your shortlist
- Add notes for your medical team
- Track contact history
- Export data for medical reviews

## Contact and Privacy
- All donor contacts are logged
- Respect donor privacy at all times
- Follow hospital ethics guidelines
- Use the platform's messaging system for initial contact

## Support
For technical issues or matching questions, contact our support team through the admin panel.
            """,
            "category": "For Hospitals",
            "tags": ["hospital", "matching", "search"],
            "is_published": True,
            "author_id": admin_id,
            "author_name": "Admin Team",
            "views": 167,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Understanding the Matching Algorithm",
            "content": """
# Understanding the Matching Algorithm

Our platform uses a sophisticated scoring algorithm to match donors with recipients.

## Scoring Components

### 1. Organ Match (100 points)
- Exact organ match required
- Base score for compatible organ

### 2. Blood Compatibility (0-50 points)
- Perfect match (O to O, A to A, etc.): 50 points
- Compatible match (O to any): 40 points
- Partial compatibility: 30 points

### 3. Location Proximity (0-30 points)
- Same city: 30 points
- Same state: 20 points
- Different state: 10 points
- Reduces organ transport time

### 4. Age Suitability (0-20 points)
- Ideal age range match: 20 points
- Acceptable range: 15 points
- Outside optimal range: 10 points

### 5. Urgency Multiplier
- Critical cases: 1.5x total score
- High priority: 1.3x total score
- Medium priority: 1.0x total score

## Example Calculation
**Scenario**: Heart donor for critical patient
- Organ Match: 100
- Blood Perfect Match: 50
- Same City: 30
- Ideal Age: 20
- **Base Score**: 200
- **With Critical Multiplier** (1.5x): **300 points**

## Minimum Threshold
- Matches must score at least 100 points to appear in results
- Admins can adjust these weights in the algorithm settings

## Transparency
All matches are logged with detailed score breakdowns for audit purposes.
            """,
            "category": "Matching System",
            "tags": ["algorithm", "matching", "technical"],
            "is_published": True,
            "author_id": admin_id,
            "author_name": "Admin Team",
            "views": 89,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Privacy and Data Protection",
            "content": """
# Privacy and Data Protection

Your privacy and data security are our top priorities.

## Data We Collect
- Personal information (name, contact, DOB)
- Medical information (blood group, medical history)
- Organ donation preferences
- Account activity logs

## How We Use Your Data
- Matching donors with recipients
- Platform communication
- Improving our services
- Compliance with legal requirements

## Data Protection Measures
1. **Encryption**: All data is encrypted in transit and at rest
2. **Access Control**: Strict role-based access
3. **Audit Logs**: All data access is logged
4. **Regular Security Audits**

## Your Rights
- View your data anytime
- Update or correct information
- Delete your account and data
- Download your data
- Opt-out of non-essential communications

## Sharing Policy
We **never** sell your data. Your information is only shared with:
- Medical professionals for matching purposes
- Legal authorities when required by law
- Your designated emergency contacts (if configured)

## Reporting Issues
If you suspect a privacy breach or have concerns, immediately contact:
- Email: privacy@organconnect.com
- Support ticket: Mark as "Urgent"

## Compliance
We comply with all relevant data protection regulations including HIPAA and local privacy laws.
            """,
            "category": "Privacy & Security",
            "tags": ["privacy", "security", "data-protection"],
            "is_published": True,
            "author_id": admin_id,
            "author_name": "Admin Team",
            "views": 134,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Troubleshooting Common Issues",
            "content": """
# Troubleshooting Common Issues

Quick solutions to common platform issues.

## Login Problems

### Can't log in?
1. Check your email and password are correct
2. Try the 'Forgot Password' link
3. Clear your browser cache
4. Try a different browser
5. Check if Caps Lock is on

### Email not verified?
- Check your spam folder
- Click 'Resend Verification Email'
- Wait a few minutes and try again

## Profile Issues

### Can't update profile?
- Make sure all required fields are filled
- Check date formats (YYYY-MM-DD)
- Ensure email is valid
- Try refreshing the page

### Profile not showing to hospitals?
- Check if your application status is 'Approved'
- Verify all required information is complete
- Ensure you've selected organs to donate
- Check privacy settings

## Matching Issues

### Not seeing any matches?
- Verify your blood group is entered correctly
- Check organ selection
- Ensure location information is accurate
- Wait for hospitals to post requirements

### Hospital can't find donors?
- Try broader filter criteria
- Check if filters are too restrictive
- Verify blood group compatibility
- Try different location radius

## Technical Issues

### Page not loading?
- Check your internet connection
- Clear browser cache and cookies
- Try incognito/private mode
- Update your browser
- Disable browser extensions

### Getting errors?
- Take a screenshot of the error
- Note what you were doing
- Clear browser cache
- Try again in a few minutes
- Create a support ticket with details

## Still Need Help?
If these solutions don't work:
1. Create a support ticket with:
   - Detailed description of the issue
   - Screenshots if possible
   - Your browser and device info
   - Steps you've already tried
2. Our team will respond within 24 hours

## Emergency?
For urgent medical emergencies, contact your local hospital directly. This platform is for organ matching coordination, not emergency medical services.
            """,
            "category": "Troubleshooting",
            "tags": ["troubleshooting", "help", "issues", "fixes"],
            "is_published": True,
            "author_id": admin_id,
            "author_name": "Admin Team",
            "views": 312,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert help documents
    for doc in sample_help_docs:
        doc_id = doc['id']
        db.help_documents._data[doc_id] = doc.copy()

    # ============================================
    # BRANCH HOSPITALS SEED DATA
    # ============================================
    
    # Get admin ID for reference
    admin_user = next((u for u in test_users if u['role'] == 'admin'), None)
    admin_id_ref = admin_user['id'] if admin_user else str(uuid.uuid4())
    
    # Create ONLY ONE branch hospital (as requested)
    # Use a consistent ID for both user and branch hospital record
    branch_hospital_id_1 = str(uuid.uuid4())
    
    branch_hospital_user = {
        "id": branch_hospital_id_1,
        "email": "branch.downtown@organconnect.com",
        "hashed_password": pwd_context.hash("branch123"),
        "role": "branch_hospital",
        "name": "Downtown Medical Branch",
        "mobile": "+1234567850",
        "age": None,
        "mobile_verified": True,
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert branch hospital user
    db.users._data[branch_hospital_id_1] = branch_hospital_user.copy()
    
    # Create branch hospital record (using SAME ID)
    branch_hospital_record = {
        "id": branch_hospital_id_1,  # Same ID as user for consistency
        "name": "Downtown Medical Branch",
        "email": "branch.downtown@organconnect.com",
        "license_number": "BH-2024-001",
        "address": "123 Medical Plaza, Suite 500",
        "city": "New York",
        "state": "New York",
        "country": "USA",
        "contact_number": "+1234567850",
        "contact_person": "Dr. Sarah Mitchell",
        "auto_generated_password": "branch123",
        "created_by_admin_id": admin_id_ref,
        "created_by_admin_name": "Admin User",
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert branch hospital record
    db.branch_hospitals._data[branch_hospital_id_1] = branch_hospital_record.copy()
    
    # Assign some donors to this branch hospital
    # Update first 5 donors to be assigned to this branch hospital with pending checkup status
    donors_to_assign = list(sample_donations)[:5]
    for idx, donation in enumerate(donors_to_assign):
        donation_id = donation['id']
        # Update the donation in the sample_donations list
        sample_donations[idx]["assigned_branch_hospital_id"] = branch_hospital_id_1
        sample_donations[idx]["assigned_branch_hospital_name"] = "Downtown Medical Branch"
        sample_donations[idx]["checkup_status"] = "pending_checkup"
        sample_donations[idx]["updated_at"] = datetime.utcnow()
        # Also update in the database
        db.donation_applications._data[donation_id]["assigned_branch_hospital_id"] = branch_hospital_id_1
        db.donation_applications._data[donation_id]["assigned_branch_hospital_name"] = "Downtown Medical Branch"
        db.donation_applications._data[donation_id]["checkup_status"] = "pending_checkup"
        db.donation_applications._data[donation_id]["updated_at"] = datetime.utcnow()


    print("Mock database seeded with test users:")
    print("   - donor@organconnect.com / donor123 (with donation application)")
    print("   - hospital@organconnect.com / hospital123 (with requirements)")
    print("   - admin@organconnect.com / admin123")
    print("   - branch.downtown@organconnect.com / branch123 (Branch Hospital - with 5 assigned donors)")
    print(f"   - Created {len(sample_donations)} approved donor applications")
    print(f"   - Created {len(sample_requirements)} hospital requirements")
    print(f"   - Created {len(sample_notifications)} sample notifications")
    print(f"   - Created {len(sample_shortlist)} shortlist entries")
    print(f"   - Created {len(sample_posts)} community posts")
    print(f"   - Created {len(sample_events)} events")
    print(f"   - Created {len(sample_resources)} resources")
    print(f"   - Created {len(sample_match_logs)} match logs (Phase 3A)")
    print(f"   - Created 1 algorithm configuration")
    print(f"   - Created {len(sample_contacts)} contact history entries")
    print(f"   - Created {len(sample_faqs)} FAQs (Phase 3B)")
    print(f"   - Created {len(sample_help_docs)} help documents (Phase 3B)")
    print(f"   - Created 1 branch hospital with 5 assigned donors")
    print("   - Branch Hospital Account:")
    print("     * branch.downtown@organconnect.com / branch123")