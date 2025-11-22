import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_auth_flow():
    # 1. Signup
    email = "testuser_long@example.com"
    password = "a" * 75 # Long password
    
    print(f"Testing signup with email: {email} and password length: {len(password)}")
    
    signup_response = requests.post(f"{BASE_URL}/auth/signup", json={
        "email": email,
        "password": password
    })
    
    if signup_response.status_code == 200:
        print("Signup successful")
    elif signup_response.status_code == 400 and "Email already registered" in signup_response.text:
        print("User already exists, proceeding to login")
    else:
        print(f"Signup failed: {signup_response.status_code} {signup_response.text}")
        return

    # 2. Login
    print("Testing login...")
    login_response = requests.post(f"{BASE_URL}/auth/token", data={
        "username": email,
        "password": password
    })
    
    if login_response.status_code == 200:
        token = login_response.json()["access_token"]
        print("Login successful, token received")
        
        # 3. Verify Token Access
        print("Verifying access to protected route...")
        headers = {"Authorization": f"Bearer {token}"}
        maps_response = requests.get(f"{BASE_URL}/api/maps/", headers=headers)
        
        if maps_response.status_code == 200:
            print("Access to protected route successful")
        else:
            print(f"Access failed: {maps_response.status_code}")
            
    else:
        print(f"Login failed: {login_response.status_code} {login_response.text}")

if __name__ == "__main__":
    try:
        test_auth_flow()
    except Exception as e:
        print(f"Connection error: {e}. Make sure the server is running.")
