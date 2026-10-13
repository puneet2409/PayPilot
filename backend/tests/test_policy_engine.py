import pytest
from app.database import SessionLocal
from app.models.catalogue import DemoProduct
from app.services.policy_engine import PolicyEngine

@pytest.fixture
def test_db():
    db = SessionLocal()
    # Add unique test product if not already there
    p_inactive = db.query(DemoProduct).filter(DemoProduct.sku == "TEST-SKU-INACTIVE").first()
    if not p_inactive:
        p_inactive = DemoProduct(
            sku="TEST-SKU-INACTIVE",
            title="Inactive Headset",
            category="wireless headset",
            fixed_price=49.99,
            currency="USD",
            active=False,
            attributes_json='{}'
        )
        db.add(p_inactive)
        db.commit()

    yield db
    db.close()

def test_policy_budget_pass(test_db):
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=test_db,
        demo_sku="HEADSET-DEMO-01",
        max_total=100.00
    )
    assert passed is True
    assert product.sku == "HEADSET-DEMO-01"
    assert any(c.rule == "budget_limit" and c.passed for c in checks)

def test_policy_budget_exceeded(test_db):
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=test_db,
        demo_sku="HEADSET-DEMO-01",
        max_total=50.00 # Lower than 89.99
    )
    assert passed is False
    assert "exceeds" in reason.lower()
    assert any(c.rule == "budget_limit" and not c.passed for c in checks)

def test_policy_inactive_sku(test_db):
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=test_db,
        demo_sku="TEST-SKU-INACTIVE",
        max_total=100.00
    )
    assert passed is False
    assert "inactive" in reason.lower()

def test_policy_required_feature_unverified(test_db):
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=test_db,
        demo_sku="HEADSET-DEMO-01",
        max_total=100.00,
        required_features=["waterproof_ipx8"]
    )
    assert passed is False
    assert "missing" in reason.lower() or "unverified" in reason.lower()

def test_policy_feature_hyphen_normalization(test_db):
    """'built-in microphone' must match the built_in_microphone attribute."""
    passed, checks, product, reason = PolicyEngine.evaluate(
        db=test_db,
        demo_sku="HEADSET-DEMO-01",
        max_total=100.00,
        required_features=["built-in microphone"]
    )
    assert passed is True, reason
    assert any(
        c.rule == "feature_req_built_in_microphone" and c.passed
        for c in checks
    )
