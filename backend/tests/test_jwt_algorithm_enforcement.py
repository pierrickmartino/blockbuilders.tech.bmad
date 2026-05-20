"""Regression tests for explicit JWT algorithm allowlisting."""
import base64
import json
import os
from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from joserfc.jwt import encode as jwt_encode
from joserfc.jwk import RSAKey
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

# Set test environment before importing app modules.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-testing-only"
os.environ["REDIS_URL"] = "redis://localhost:6379/15"

from app.core.config import settings
from app.core.database import get_session
from app.core.security import create_access_token, decode_access_token, hash_password
from app.main import app
from app.models.user import PlanTier, User, UserTier


RS256_PRIVATE_KEY = """-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDxn/OkbcgNXtKo
gJlPgOPWYEwX+f6DzGD2naVPlZkDCFBYmcUDfNoPfYeobtS7el/Cg06fA/y3E61N
1pX3zGOuedBljAQa+qgxZKpogYfdqK1BuqjQvbfMuWcu09fgb8SZtNKgmuKkeohj
Ejoavcyp8hY97p8pZap0ge7XIwxNOchswwMly30erfou/8FsTg3uIgyA6/ta7H7J
wMsSwKO/D1Y3oYE1klkHNiPWBk4Lv8NOxkrJYIdBJmYyNes7i91UJuvuP8G8kpoJ
EIOpGyrSTZno99Aq8Gk8ia+xAFIdZ/TF3q5DxU/ejUeGBqPlUSXcav0f6vJTahyK
ONadyG31AgMBAAECggEADl6+mnCJAvqOZBpvLmzySpqkNpIrUo1XgEifP0dyDTMe
YYFBAqnB55qbSdIlnBd1ay0XV5pgxPFKT6R2e4FQCwgQSSnK82ElmvfAsWxwDH0Z
U3Jq0yylVMCmDqvnXTVofOJl2yAQYKCE91drKzykgmr1Fa6DusONdVZmQldBm7S5
dz5YrwBv2K9TROryQzymq9xxK5dXec2fOAjFHlAt3U0BovpNrfFkCBRDrV8l4ZiL
f/0uLX8wVcmIq4gO5YU7XkBiYsbi7SfZEy95zAV3qFgOIWd+Ez5x0XZze6aCyJGX
QfKC6IJQTZBPVBUe9RmTwc0NZvZl8p9yGqSD3+WZ9QKBgQD9Q2H39rWNjz/4S2nL
CnCzUfXA+Tf3T1lcYRVeS8IMpwjPv3Zy/mAnoh9E1lNrypjxGFWZw8gL02iM8ds5
z6B+3MxncC2GNLWJ2y4YhqhpNZY8Qb8nE7xDnEf/qmWjyB8UZg4EGKxJtP1BkbGl
qH0vZb75fPq9UlzkFCa7muLxhwKBgQD0PF9+eUvpwCGfylmzKEpjqYVElnKYA3Ij
uSD19Mapplz8kEx3LbCQRace/tAHfXve8QPkXH0PihSPd1i3Z30OJrbjTWf3AGE9
mx5R8kPs6Gu2+Fx9j9ig2S8Jt3AdEJ/IbmlLGw6jFKhrbThPYdCOiE8E+JOgJjNr
r6G24y9zowKBgBIZ2sqqK1euwVexrCIC4QMv/GyKY2GdnjloBuryZzAYUBzpBkI5
xA2RHMMCvnuZw0yX/KY8w/N0bKiGMLD1Efd/OGy8K8THx6HOtIC0Px0l41LzMAJO
+smqRcsUFqeaCf6fPKk2SjoKYX9qNlQssqXMk9WpBRK67ECw4APQkh/JAoGAC3xT
WVVG9qUsb6FKepxocytjswgIN5Hh6kAohqiONyg1s0Lt9aTWatJ7u39sNQ33p1Ja
RoD6+KIbuWt5ZpadUO8NJr9bJkiESitjT6M/AoMjnaUsZFNBcr8D8UcJJLTFbt2S
Yg/RrmWoTfUC8ui8sBdE8AzolF13iZbm2fzxHFUCgYEAhUxcUK4l40AVzV1l2aqz
1FYxLhew1afj1oa/0VOaCb2lNK+q5GlNcyyuW7uwwaU7y8rI96je7VVSW6SrZPdI
zmc80VwdwvEe6DwojldvnPZEy8aqE43742Ozul01SEhp/kNX0IAg5dScwLXLQ+9s
+FBckMUQ1iabWDOGaiLaY/k=
-----END PRIVATE KEY-----"""


@pytest.fixture(name="engine")
def engine_fixture():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    yield engine
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(name="session")
def session_fixture(engine):
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session):
    def get_session_override():
        return session

    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def existing_user(session: Session) -> User:
    user = User(
        id=uuid4(),
        email="jwt-algorithm@example.com",
        password_hash=hash_password("CorrectPassword123!"),
        plan_tier=PlanTier.FREE,
        user_tier=UserTier.STANDARD,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def _claims(user_id: str) -> dict[str, object]:
    expire = datetime.now(timezone.utc) + timedelta(days=1)
    return {"sub": user_id, "exp": int(expire.timestamp())}


def _rs256_token(user_id: str) -> str:
    key = RSAKey.import_key(RS256_PRIVATE_KEY)
    return jwt_encode({"alg": "RS256"}, _claims(user_id), key)


def _unsigned_token(user_id: str) -> str:
    header = {"alg": "none", "typ": "JWT"}
    expire = datetime.now(timezone.utc) + timedelta(days=1)
    claims = {"sub": user_id, "exp": int(expire.timestamp())}
    segments = [
        base64.urlsafe_b64encode(json.dumps(segment).encode()).rstrip(b"=").decode()
        for segment in (header, claims)
    ]
    return f"{segments[0]}.{segments[1]}."


def test_decode_access_token_accepts_valid_hs256_token():
    user_id = str(uuid4())
    token = create_access_token(user_id)

    assert decode_access_token(token) == user_id


def test_decode_access_token_rejects_rs256_token():
    token = _rs256_token(str(uuid4()))

    assert decode_access_token(token) is None


def test_decode_access_token_rejects_unsigned_none_token():
    token = _unsigned_token(str(uuid4()))

    assert decode_access_token(token) is None


def test_auth_protected_endpoint_rejects_non_hs256_token(
    client: TestClient, existing_user: User
):
    token = _rs256_token(str(existing_user.id))

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert settings.jwt_algorithm == "HS256"
    assert response.status_code == 401
