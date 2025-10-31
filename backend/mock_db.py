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
    
    # Create test users
    test_users = [
        {
            "id": str(uuid.uuid4()),
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
            "id": str(uuid.uuid4()),
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
    
    print("Mock database seeded with test users:")
    print("   - donor@organconnect.com / donor123")
    print("   - hospital@organconnect.com / hospital123")
    print("   - admin@organconnect.com / admin123")