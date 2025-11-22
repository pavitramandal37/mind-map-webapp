from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

long_password = "a" * 75
print(f"Password length: {len(long_password)}")

try:
    hash1 = pwd_context.hash(long_password)
    print("Hash successful")
    
    # Verify
    if pwd_context.verify(long_password, hash1):
        print("Verification successful")
    else:
        print("Verification failed")
        
    # Verify with truncated
    truncated = long_password[:72]
    if pwd_context.verify(truncated, hash1):
        print("Verification successful with truncated password (THIS IS THE ISSUE)")
    else:
        print("Verification failed with truncated password")

except Exception as e:
    print(f"Error: {e}")
