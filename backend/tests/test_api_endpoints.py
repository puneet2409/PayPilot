from datetime import datetime, timezone, timedelta
from unittest.mock import patch, PropertyMock

def test_health_check(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"

def test_discovery_search(client):
    res = client.post("/api/v1/discovery/search", json={
        "query": "wireless headset",
        "max_price": 100.0,
        "limit": 5
    })
    assert res.status_code == 200
    data = res.json()
    assert "search_id" in data
    assert len(data["results"]) > 0

def test_fallback_discovery_relevance(client):
    """Fallback catalogue must not leak unrelated items into narrow queries."""
    with patch("app.integrations.channel3.Channel3Client.is_configured", new_callable=PropertyMock, return_value=False):
        res = client.post("/api/v1/discovery/search", json={
            "query": "quiet wireless mouse",
            "limit": 10
        })
        assert res.status_code == 200
        titles = [r["title"] for r in res.json()["results"]]
        assert titles, "expected at least one mouse match"
        assert all("Mouse" in t for t in titles)

        res2 = client.post("/api/v1/discovery/search", json={
            "query": "wireless headset",
            "limit": 10
        })
        titles2 = [r["title"] for r in res2.json()["results"]]
        assert len(titles2) == 2
        assert all("Mouse" not in t and "Dock" not in t for t in titles2)

def test_agent_turn_top_pick_within_budget(client):
    with patch("app.integrations.channel3.Channel3Client.is_configured", new_callable=PropertyMock, return_value=False):
        res = client.post(f"/api/v1/agent/sessions/{client.test_session_id}/turn", json={
            "message": "Find a wireless headset under $100 with multipoint Bluetooth and a good mic",
            "user_budget": 100.0
        })
        assert res.status_code == 200
        data = res.json()
        assert data["recommendations"], "expected recommendations"
        top = data["recommendations"][0]
        assert top["within_budget"] is True
        assert top["demo_sku"] == "HEADSET-DEMO-01"
        feats = [f.lower() for f in top["verified_features"]]
        assert any("multipoint" in f for f in feats)
        assert any("microphone" in f for f in feats)

def test_agent_turn_over_budget_top_pick_flagged(client):
    """Discovery surfaces candidates above budget; the policy engine blocks them."""
    with patch("app.integrations.channel3.Channel3Client.is_configured", new_callable=PropertyMock, return_value=False):
        res = client.post(f"/api/v1/agent/sessions/{client.test_session_id}/turn", json={
            "message": "Find a wireless headset under $50 with active noise cancelling",
            "user_budget": 50.0
        })
        assert res.status_code == 200
        data = res.json()
        assert data["recommendations"], "over-budget candidates should still be visible"
        assert data["recommendations"][0]["within_budget"] is False
        assert "budget" in data["reply_text"].lower()

def test_policy_evaluation_success_and_quote(client):
    res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0,
        "currency": "USD"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is True
    assert data["quote"] is not None
    assert data["quote"]["amount"] == 89.99

def test_policy_evaluation_budget_exceeded(client):
    res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 50.0, # Below 89.99
        "currency": "USD"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["eligible"] is False
    assert data["quote"] is None

def test_end_to_end_checkout_and_capture(client):
    # 1. Evaluate policy and get quote
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]

    # 2. Create Order
    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
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
    expected_provider = "simulated" if order_data["paypal_order_id"].startswith("SANDBOX_ORDER_") else "paypal_sandbox"
    assert capture_data["payment"]["provider"] == expected_provider

    # 4. Fetch Order and Audit Timeline
    timeline_res = client.get(f"/api/v1/orders/{order_id}/timeline")
    assert timeline_res.status_code == 200
    timeline_data = timeline_res.json()
    event_types = [e["event_type"] for e in timeline_data["events"]]
    assert "PAYPAL_ORDER_CREATED" in event_types
    expected_event = "SIMULATED_CHECKOUT_COMPLETED" if expected_provider == "simulated" else "PAYMENT_CAPTURED"
    assert expected_event in event_types


def test_checkout_quote_ownership_validation(client, db_session):
    """Verify that a session cannot use another session's quote."""
    # Evaluate policy to create a quote for session_A
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]

    # Try to create checkout with session_B using session_A's quote
    checkout_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": "session_B"
    })
    assert checkout_res.status_code == 403


def test_checkout_expired_quote(client, db_session):
    """Verify that an expired quote is rejected."""
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]

    # Manually expire the quote in the database
    from app.models.quote import Quote
    quote = db_session.query(Quote).filter(Quote.id == quote_id).first()
    quote.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db_session.commit()

    # Try to create checkout with expired quote
    checkout_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    assert checkout_res.status_code == 400


def test_capture_idempotency(client, db_session):
    """Verify that capturing an already-paid order returns the existing payment."""
    # Create a full checkout flow first
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    quote_id = eval_res.json()["quote"]["id"]

    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    order_id = create_res.json()["order_id"]

    # First capture
    cap1 = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
    assert cap1.status_code == 200
    assert cap1.json()["status"] == "PAID"

    # Second capture (idempotent)
    cap2 = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
    assert cap2.status_code == 200
    assert cap2.json()["status"] == "PAID"



def test_catalogue_listing(client):
    """Verify that demo-store catalogue products can be listed."""
    res = client.get("/api/v1/catalogue")
    assert res.status_code == 200
    data = res.json()
    assert "products" in data
    assert len(data["products"]) >= 4
    skus = [p["sku"] for p in data["products"]]
    assert "HEADSET-DEMO-01" in skus


def test_order_cancellation(client):
    """Verify that an unpaid order can be cancelled."""
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    quote_id = eval_res.json()["quote"]["id"]

    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    order_id = create_res.json()["order_id"]

    cancel_res = client.post(f"/api/v1/orders/{order_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

    # Cannot cancel again
    cancel_res2 = client.post(f"/api/v1/orders/{order_id}/cancel")
    assert cancel_res2.status_code == 409


def test_channel3_sku_matching():
    """Verify that Channel3 results matching store products automatically link to demo SKUs."""
    from app.integrations.channel3 import Channel3Client
    assert Channel3Client._match_demo_sku("Anker Soundcore Space Q45 Wireless", "Anker") == "HEADSET-DEMO-01"
    assert Channel3Client._match_demo_sku("JBL Tune 760NC Noise Cancelling", "JBL") == "HEADSET-DEMO-02"
    assert Channel3Client._match_demo_sku("Logitech MX Master 3S Wireless Mouse", "Logitech") == "MOUSE-DEMO-01"
    assert Channel3Client._match_demo_sku("Anker 575 USB-C Docking Station", "Anker") == "DOCK-DEMO-01"
    assert Channel3Client._match_demo_sku("Sony WH-1000XM5 Wireless Headphones", "Sony") is None


def test_session_orders_listing(client, db_session):
    """Verify that listing session orders returns created and captured orders with product details."""
    session_id = client.test_session_id
    # Create order 1
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]
    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": session_id
    })
    assert create_res.status_code == 200
    order_id = create_res.json()["order_id"]

    # Check orders listing before capture
    orders_res = client.get(f"/api/v1/sessions/{session_id}/orders")
    assert orders_res.status_code == 200
    orders = orders_res.json()
    assert len(orders) == 1
    assert orders[0]["order_id"] == order_id
    assert orders[0]["status"] == "AWAITING_APPROVAL"
    assert orders[0]["sku"] == "HEADSET-DEMO-01"
    assert "Anker Soundcore Space Q45" in orders[0]["item_title"]
    assert orders[0]["amount"] == 89.99

    # Capture the order
    cap_res = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
    assert cap_res.status_code == 200

    # Check orders listing after capture
    orders_res2 = client.get(f"/api/v1/sessions/{session_id}/orders")
    assert orders_res2.status_code == 200
    orders2 = orders_res2.json()
    assert len(orders2) == 1
    assert orders2[0]["status"] == "PAID"
    assert orders2[0]["capture_id"] is not None


def test_paypal_webhook_reconciliation(client, db_session):
    """Verify asynchronous PayPal webhook processes capture events and updates order state."""
    session_id = client.test_session_id
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": session_id,
        "demo_sku": "HEADSET-DEMO-02",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]
    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": session_id
    })
    assert create_res.status_code == 200
    order_data = create_res.json()
    order_id = order_data["order_id"]
    paypal_order_id = order_data["paypal_order_id"]

    # Post asynchronous webhook
    wh_payload = {
        "id": "WH-TEST-EVENT-001",
        "event_type": "PAYMENT.CAPTURE.COMPLETED",
        "resource_type": "capture",
        "resource": {
            "id": "CAP-WH-TEST-999",
            "status": "COMPLETED",
            "amount": {"value": "79.95", "currency_code": "USD"},
            "supplementary_data": {
                "related_ids": {"order_id": paypal_order_id}
            }
        }
    }
    wh_res = client.post("/api/v1/webhooks/paypal", json=wh_payload)
    assert wh_res.status_code == 200
    res_json = wh_res.json()
    assert res_json["status"] == "received"
    assert res_json["matched_order_id"] == order_id

    # Verify order state transitioned to PAID
    order_res = client.get(f"/api/v1/orders/{order_id}")
    assert order_res.status_code == 200
    assert order_res.json()["status"] == "PAID"
    assert order_res.json()["payment"]["capture_id"] == "CAP-WH-TEST-999"


def test_analytics_dashboard_endpoint(client, db_session):
    """Verify analytics endpoint generates AG Studio data model sources, metrics, and relationships."""
    session_id = client.test_session_id
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    quote_id = eval_res.json()["quote"]["id"]
    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": session_id
    })
    order_id = create_res.json()["order_id"]
    client.post(f"/api/v1/checkout/{order_id}/capture", json={})

    # Fetch AG Studio dashboard data
    dash_res = client.get(f"/api/v1/analytics/sessions/{session_id}/dashboard")
    assert dash_res.status_code == 200
    data = dash_res.json()

    assert "description" in data
    assert "sources" in data
    assert "orders" in data["sources"]
    assert "transactions" in data["sources"]
    assert "customers" in data["sources"]
    assert len(data["sources"]["orders"]) == 1
    assert len(data["sources"]["transactions"]) == 1

    # Check metrics
    metrics = data["metrics"]
    assert metrics["total_issued_amount"] == 89.99
    assert metrics["total_paid_amount"] == 89.99
    assert metrics["collection_rate_percent"] == 100.0
    assert metrics["paid_orders"] == 1

    # Check relationships & expressions
    assert len(data["relationships"]) == 2
    assert len(data["expressions"]) == 1
    assert data["expressions"][0]["name"] == "collection_rate"


def test_pre_capture_price_drift_auto_void(client, db_session):
    """Simulated price drift before capture must block payment and auto-void order."""
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    assert eval_res.status_code == 200
    quote_id = eval_res.json()["quote"]["id"]

    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    assert create_res.status_code == 200
    order_id = create_res.json()["order_id"]

    # Capture with simulate_price_drift=True
    cap_res = client.post(f"/api/v1/checkout/{order_id}/capture", json={
        "simulate_price_drift": True
    })
    assert cap_res.status_code == 409
    assert "price spiked" in cap_res.json()["detail"].lower() or "guardian blocked" in cap_res.json()["detail"].lower()

    # Verify order was voided in database
    from app.models.order import Order
    order = db_session.query(Order).filter(Order.id == order_id).first()
    assert order.status == "CANCELLED"


def test_audit_hash_chaining_integrity(client, db_session):
    """Verify that consecutive audit events form an unbroken SHA-256 hash chain."""
    from app.services.audit_service import AuditService

    ev1 = AuditService.record_event(
        db=db_session,
        event_type="CHAIN_TEST_1",
        session_id=client.test_session_id,
        details={"step": 1}
    )
    assert ev1.entry_hash is not None
    assert len(ev1.entry_hash) == 64

    ev2 = AuditService.record_event(
        db=db_session,
        event_type="CHAIN_TEST_2",
        session_id=client.test_session_id,
        details={"step": 2}
    )
    assert ev2.entry_hash is not None
    assert len(ev2.entry_hash) == 64
    assert ev2.prev_hash == ev1.entry_hash


def test_pre_capture_tampered_quote_rejected(client, db_session):
    """Verify that tampering with quote signature causes pre-capture guard to abort payment."""
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    quote_id = eval_res.json()["quote"]["id"]

    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    order_id = create_res.json()["order_id"]

    # Tamper with quote signature in database
    from app.models.quote import Quote
    quote = db_session.query(Quote).filter(Quote.id == quote_id).first()
    quote.quote_signature = "bad_tampered_signature_hex"
    db_session.commit()

    cap_res = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
    assert cap_res.status_code == 400
    assert "signature verification failed" in cap_res.json()["detail"].lower()


def test_pre_capture_expired_quote_rejected(client, db_session):
    """Verify that if a quote expires between order creation and buyer capture, capture is blocked."""
    eval_res = client.post("/api/v1/policies/evaluate", json={
        "session_id": client.test_session_id,
        "demo_sku": "HEADSET-DEMO-01",
        "max_total": 100.0
    })
    quote_id = eval_res.json()["quote"]["id"]

    create_res = client.post("/api/v1/checkout/create", json={
        "quote_id": quote_id,
        "session_id": client.test_session_id
    })
    order_id = create_res.json()["order_id"]

    # Expire quote in database
    from app.models.quote import Quote
    quote = db_session.query(Quote).filter(Quote.id == quote_id).first()
    quote.expires_at = datetime.now(timezone.utc) - timedelta(minutes=5)
    db_session.commit()

    cap_res = client.post(f"/api/v1/checkout/{order_id}/capture", json={})
    assert cap_res.status_code == 400
    assert "quote expired before payment capture" in cap_res.json()["detail"].lower()




