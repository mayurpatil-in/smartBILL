from app.models.user import User
from app.core.security import get_password_hash
from app.database.session import get_db

def test_login_success(client, db_session):
    # 1. Create a dummy user directly in the test DB using the fixture
    try:
        # Create a user
        password = "testpassword"
        user = User(
            email="test@example.com",
            password_hash=get_password_hash(password),
            name="Test User",
            is_active=True,
            legacy_role="admin" 
        )
        db_session.add(user)
        db_session.commit()
    except Exception as e:
        print(f"Error creating user: {e}")
        db_session.rollback()
        raise

    # 2. Attempt login via API
    response = client.post("/auth/login", json={
        "email": "test@example.com",
        "password": "testpassword",
        "remember": True
    })

    # 3. Verify response
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"

def test_login_invalid_credentials(client):
    response = client.post("/auth/login", json={
        "email": "wrong@example.com",
        "password": "wrongpassword",
        "remember": True
    })
    
    # Expect 401 Unauthorized
    assert response.status_code == 401
