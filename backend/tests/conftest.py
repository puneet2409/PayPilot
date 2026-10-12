import pytest
from app.database import engine, Base, SessionLocal
from app.main import seed_initial_demo_catalogue

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.create_all(bind=engine)
    seed_initial_demo_catalogue()
    yield
