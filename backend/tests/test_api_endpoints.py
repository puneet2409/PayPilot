import pytest
from fastapi.testclient import TestClient
from app.main import app

def test_health_check():
    with TestClient(app) as client:
        res = client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

def test_discovery_search():
    with TestClient(app) as client:
        res = client.post("/api/v1/discovery/search", json={
            "query": "wireless headset",
            "max_price": 100.0,
            "limit": 5
        })
        assert res.status_code == 200
        data = res.json()
        assert "search_id" in data
        assert len(data["results"]) > 0

def test_policy_evaluation_success_and_quote():
    with TestClient(app) as client:
        res = client.post("/api/v1/policies/evaluate", json={
            "session_id": "test_session_1",
            "demo_sku": "HEADSET-DEMO-01",
            "max_total": 100.0,
            "currency": "USD"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["eligible"] is True
        assert data["quote"] is not None
        assert data["quote"]["amount"] == 89.99

def test_policy_evaluation_budget_exceeded():
    with TestClient(app) as client:
        res = client.post("/api/v1/policies/evaluate", json={
            "session_id": "test_session_2",
            "demo_sku": "HEADSET-DEMO-01",
            "max_total": 50.0, # Below 89.99
            "currency": "USD"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["eligible"] is False
        assert data["quote"] is None

def test_end_to_end_checkout_and_capture():
    with TestClient(app) as client:
        # 1. Evaluate policy and get quote
        eval_res = client.post("/api/v1/policies/evaluate", json={
            "session_id": "test_sess_e2e",
            "demo_sku": "HEADSET-DEMO-01",
            "max_total": 100.0
        })
        assert eval_res.status_code == 200
        quote_id = eval_res.json()["quote"]["id"]

        # 2. Create Order
        create_res = client.post("/api/v1/checkout/create", json={
            "quote_id": quote_id
        })
        assert create_res.status_code == 200
        order_data = create_res.json()
        order_id = order_data["order_id"]
        assert order_data["status"] == "AWAITING_APPROVAL"
        assert "paypal_order_id" in order_data

        # 3. Capture Order
        capture_res = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
        assert capture_res.status_code == 200
        capture_data = capture_res.json()
        assert capture_data["status"] == "PAID"
        assert capture_data["payment"]["provider"] == "paypal_sandbox"

        # 4. Fetch Order and Audit Timeline
        timeline_res = client.get(f"/api/v1/orders/{order_id}/timeline")
        assert timeline_res.status_code == 200
        timeline_data = timeline_res.json()
        event_types = [e["event_type"] for e in timeline_data["events"]]
        assert "PAYPAL_ORDER_CREATED" in event_types
        assert "PAYMENT_CAPTURED" in event_types
