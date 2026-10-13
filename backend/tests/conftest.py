import os

# Point the suite at a dedicated scratch database before any app module
# (and therefore the engine) is imported, so tests never touch the dev DB.
os.environ["DATABASE_URL"] = "sqlite:///./paypilot_test.db"

import pytest
from fastapi.testclient import TestClient
import app.models  # noqa
from app.database import engine, Base, SessionLocal
from app.main import app, seed_initial_demo_catalogue

@pytest.fixture(scope="function", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_initial_demo_catalogue()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client():
    with TestClient(app) as test_client:
        yield test_client
