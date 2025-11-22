from app.auth import get_password_hash, verify_password

long_password = "a" * 75
print(f"Password length: {len(long_password)}")

try:
    hash1 = get_password_hash(long_password)
    print("Hash successful")
    
    # Verify
    if verify_password(long_password, hash1):
        print("Verification successful")
    else:
        print("Verification failed")
        
    # Verify with wrong password
    if not verify_password("wrong", hash1):
        print("Verification correctly failed for wrong password")

except Exception as e:
    print(f"Error: {e}")
