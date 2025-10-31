#!/usr/bin/env python3
"""
Backend API Testing for JWT Authentication System
Tests all authentication endpoints for OrganConnect app
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Backend URL from frontend/.env
BACKEND_URL = "https://lifelink-org.preview.emergentagent.com/api"

# Demo credentials from test_result.md
DEMO_CREDENTIALS = {
    "donor": {"email": "donor@organconnect.com", "password": "donor123"},
    "hospital": {"email": "hospital@organconnect.com", "password": "hospital123"},
    "admin": {"email": "admin@organconnect.com", "password": "admin123"}
}

class AuthTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        self.tokens = {}
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
    
    def make_request(self, method: str, endpoint: str, data: Dict = None, headers: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BACKEND_URL}{endpoint}"
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, json=data, headers=headers)
            else:
                return False, f"Unsupported method: {method}", 0
            
            try:
                response_data = response.json()
            except:
                response_data = response.text
            
            return response.status_code < 400, response_data, response.status_code
            
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", 0
    
    def test_registration(self):
        """Test user registration endpoint"""
        print("\n=== Testing User Registration ===")
        
        # Test 1: Valid donor registration
        donor_data = {
            "email": "john.donor@example.com",
            "password": "securepass123",
            "confirm_password": "securepass123",
            "role": "donor",
            "name": "John Donor",
            "mobile": "+1234567890",
            "age": 28
        }
        
        success, response, status = self.make_request("POST", "/auth/register", donor_data)
        if success and "access_token" in response:
            self.log_test("Donor Registration", True, "Successfully registered donor and received JWT token")
        else:
            self.log_test("Donor Registration", False, f"Status: {status}, Response: {response}")
        
        # Test 2: Valid hospital registration
        hospital_data = {
            "email": "mercy.hospital@example.com",
            "password": "hospitalpass123",
            "confirm_password": "hospitalpass123",
            "role": "hospital",
            "name": "Mercy General Hospital",
            "mobile": "+1987654321",
            "age": None
        }
        
        success, response, status = self.make_request("POST", "/auth/register", hospital_data)
        if success and "access_token" in response:
            self.log_test("Hospital Registration", True, "Successfully registered hospital and received JWT token")
        else:
            self.log_test("Hospital Registration", False, f"Status: {status}, Response: {response}")
        
        # Test 3: Admin role rejection (should fail)
        admin_data = {
            "email": "admin.test@example.com",
            "password": "adminpass123",
            "confirm_password": "adminpass123",
            "role": "admin",
            "name": "Test Admin",
            "mobile": "+1555666777"
        }
        
        success, response, status = self.make_request("POST", "/auth/register", admin_data)
        if not success and status == 422:  # Validation error expected
            self.log_test("Admin Role Rejection", True, "Correctly rejected admin role in registration")
        else:
            self.log_test("Admin Role Rejection", False, f"Should reject admin role. Status: {status}, Response: {response}")
        
        # Test 4: Duplicate email validation
        duplicate_email_data = {
            "email": "john.donor@example.com",  # Same as first test
            "password": "anotherpass123",
            "confirm_password": "anotherpass123",
            "role": "hospital",
            "name": "Another User",
            "mobile": "+1111222333"
        }
        
        success, response, status = self.make_request("POST", "/auth/register", duplicate_email_data)
        if not success and "already registered" in str(response).lower():
            self.log_test("Duplicate Email Validation", True, "Correctly rejected duplicate email")
        else:
            self.log_test("Duplicate Email Validation", False, f"Should reject duplicate email. Status: {status}, Response: {response}")
        
        # Test 5: Duplicate mobile validation
        duplicate_mobile_data = {
            "email": "unique.email@example.com",
            "password": "uniquepass123",
            "confirm_password": "uniquepass123",
            "role": "donor",
            "name": "Unique User",
            "mobile": "+1234567890"  # Same as first test
        }
        
        success, response, status = self.make_request("POST", "/auth/register", duplicate_mobile_data)
        if not success and "already registered" in str(response).lower():
            self.log_test("Duplicate Mobile Validation", True, "Correctly rejected duplicate mobile")
        else:
            self.log_test("Duplicate Mobile Validation", False, f"Should reject duplicate mobile. Status: {status}, Response: {response}")
        
        # Test 6: Password mismatch validation
        mismatch_data = {
            "email": "mismatch.user@example.com",
            "password": "password123",
            "confirm_password": "different123",
            "role": "donor",
            "name": "Mismatch User",
            "mobile": "+1999888777"
        }
        
        success, response, status = self.make_request("POST", "/auth/register", mismatch_data)
        if not success and "do not match" in str(response).lower():
            self.log_test("Password Mismatch Validation", True, "Correctly rejected password mismatch")
        else:
            self.log_test("Password Mismatch Validation", False, f"Should reject password mismatch. Status: {status}, Response: {response}")
    
    def test_login(self):
        """Test user login endpoint"""
        print("\n=== Testing User Login ===")
        
        # Test 1: Login with donor credentials
        success, response, status = self.make_request("POST", "/auth/login", DEMO_CREDENTIALS["donor"])
        if success and "access_token" in response:
            self.tokens["donor"] = response["access_token"]
            self.log_test("Donor Login", True, "Successfully logged in donor and received JWT token")
        else:
            self.log_test("Donor Login", False, f"Status: {status}, Response: {response}")
        
        # Test 2: Login with hospital credentials
        success, response, status = self.make_request("POST", "/auth/login", DEMO_CREDENTIALS["hospital"])
        if success and "access_token" in response:
            self.tokens["hospital"] = response["access_token"]
            self.log_test("Hospital Login", True, "Successfully logged in hospital and received JWT token")
        else:
            self.log_test("Hospital Login", False, f"Status: {status}, Response: {response}")
        
        # Test 3: Login with admin credentials
        success, response, status = self.make_request("POST", "/auth/login", DEMO_CREDENTIALS["admin"])
        if success and "access_token" in response:
            self.tokens["admin"] = response["access_token"]
            self.log_test("Admin Login", True, "Successfully logged in admin and received JWT token")
        else:
            self.log_test("Admin Login", False, f"Status: {status}, Response: {response}")
        
        # Test 4: Login with invalid credentials
        invalid_creds = {"email": "invalid@example.com", "password": "wrongpass"}
        success, response, status = self.make_request("POST", "/auth/login", invalid_creds)
        if not success and status == 401:
            self.log_test("Invalid Credentials", True, "Correctly rejected invalid credentials")
        else:
            self.log_test("Invalid Credentials", False, f"Should reject invalid credentials. Status: {status}, Response: {response}")
        
        # Test 5: Login with non-existent user
        nonexistent_creds = {"email": "nonexistent@example.com", "password": "anypass123"}
        success, response, status = self.make_request("POST", "/auth/login", nonexistent_creds)
        if not success and status == 401:
            self.log_test("Non-existent User", True, "Correctly rejected non-existent user")
        else:
            self.log_test("Non-existent User", False, f"Should reject non-existent user. Status: {status}, Response: {response}")
    
    def test_get_current_user(self):
        """Test getting current user endpoint"""
        print("\n=== Testing Get Current User ===")
        
        # Test 1: Valid token (using donor token if available)
        if "donor" in self.tokens:
            headers = {"Authorization": f"Bearer {self.tokens['donor']}"}
            success, response, status = self.make_request("GET", "/auth/me", headers=headers)
            if success and "email" in response and response["email"] == DEMO_CREDENTIALS["donor"]["email"]:
                self.log_test("Valid Token - Get User", True, f"Successfully retrieved user info for {response['email']}")
            else:
                self.log_test("Valid Token - Get User", False, f"Status: {status}, Response: {response}")
        else:
            self.log_test("Valid Token - Get User", False, "No valid token available from login tests")
        
        # Test 2: Invalid token
        headers = {"Authorization": "Bearer invalid_token_here"}
        success, response, status = self.make_request("GET", "/auth/me", headers=headers)
        if not success and status == 401:
            self.log_test("Invalid Token", True, "Correctly rejected invalid token")
        else:
            self.log_test("Invalid Token", False, f"Should reject invalid token. Status: {status}, Response: {response}")
        
        # Test 3: No token
        success, response, status = self.make_request("GET", "/auth/me")
        if not success and status == 401:
            self.log_test("No Token", True, "Correctly rejected request without token")
        else:
            self.log_test("No Token", False, f"Should reject request without token. Status: {status}, Response: {response}")
    
    def test_otp_system(self):
        """Test OTP request and verification (mocked)"""
        print("\n=== Testing OTP System (Mocked) ===")
        
        # Test 1: Request OTP
        otp_request_data = {"mobile": "+1234567890"}
        success, response, status = self.make_request("POST", "/auth/request-otp", otp_request_data)
        
        generated_otp = None
        if success and "otp" in response:
            generated_otp = response["otp"]
            self.log_test("OTP Request", True, f"Successfully generated OTP: {generated_otp}")
        else:
            self.log_test("OTP Request", False, f"Status: {status}, Response: {response}")
        
        # Test 2: Verify OTP with correct OTP
        if generated_otp:
            verify_data = {"mobile": "+1234567890", "otp": generated_otp}
            success, response, status = self.make_request("POST", "/auth/verify-otp", verify_data)
            if success and response.get("verified") == True:
                self.log_test("OTP Verification - Correct", True, "Successfully verified correct OTP")
            else:
                self.log_test("OTP Verification - Correct", False, f"Status: {status}, Response: {response}")
        
        # Test 3: Verify OTP with any 6-digit OTP (demo mode)
        demo_otp_data = {"mobile": "+1987654321", "otp": "123456"}
        success, response, status = self.make_request("POST", "/auth/verify-otp", demo_otp_data)
        if success and response.get("verified") == True:
            self.log_test("OTP Verification - Demo Mode", True, "Successfully verified any 6-digit OTP in demo mode")
        else:
            self.log_test("OTP Verification - Demo Mode", False, f"Status: {status}, Response: {response}")
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 Starting JWT Authentication System Tests")
        print(f"Backend URL: {BACKEND_URL}")
        
        self.test_registration()
        self.test_login()
        self.test_get_current_user()
        self.test_otp_system()
        
        # Summary
        print("\n" + "="*50)
        print("📊 TEST SUMMARY")
        print("="*50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = AuthTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)