import bcrypt

# The hash from the database
stored_hash = "$2b$12$OfByd1N/PFiUq4Fm8RCShe45iysLi0dy2Yev8BomLqC0h/S.HWHBu"

# Test password
test_password = "admin123"

# Verify
is_valid = bcrypt.checkpw(test_password.encode('utf-8'), stored_hash.encode('utf-8'))

print(f"Password 'admin123' matches stored hash: {is_valid}")

# Also test with some variations
test_passwords = ["admin123", "Admin123", "ADMIN123", "admin", "admin@123"]
for pwd in test_passwords:
    is_valid = bcrypt.checkpw(pwd.encode('utf-8'), stored_hash.encode('utf-8'))
    print(f"  - '{pwd}': {is_valid}")
