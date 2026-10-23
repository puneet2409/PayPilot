# PayPilot API Contracts (v1)

Base URL: `/api/v1`

## Session Authorization

`POST /api/v1/sessions` creates an isolated anonymous session and a signed bearer token valid for 12 hours. Send `Authorization: Bearer <access_token>` on agent, policy, checkout, order, cancellation, and audit requests. The API binds the bearer token to the requested session or order via constant-time HMAC comparison. Discovery and catalogue endpoints remain public because they expose no user session data.

Production requires `SESSION_SIGNING_SECRET` with at least 32 characters. Treat issued tokens like credentials.

---

## 1. Discovery & Catalogue

### `GET /api/v1/catalogue`
Lists all active purchasable demonstration products in the PayPilot demo store.
**Response**:
```json
{
  "products": [
    {
      "sku": "HEADSET-DEMO-01",
      "title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
      "brand": "Anker",
      "category": "wireless headset",
      "price": 89.99,
      "currency": "USD",
      "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80"
    }
  ]
}
```

### `POST /api/v1/discovery/search`
Retrieves live multi-retailer products via Channel3 across 25,000+ online stores.
**Request**:
```json
{
  "query": "wireless headset for work",
  "max_price": 100.00,
  "currency": "USD",
  "limit": 10
}
```
**Response**:
```json
{
  "search_id": "srch_12345678",
  "query": "wireless headset for work",
  "results": [
    {
      "product_id": "prod_headset_01",
      "title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
      "brand": "Anker",
      "source": "channel3",
      "offers": [
        {
          "merchant": "Amazon",
          "price": 89.99,
          "currency": "USD",
          "availability": "InStock",
          "buy_url": "https://merchant.example/item",
          "observed_at": "2026-10-23T08:00:00Z"
        }
      ],
      "attributes": {
        "multipoint_bluetooth": true,
        "built_in_microphone": true
      }
    }
  ]
}
```

---

## 2. AI Turn & Recommendations

### `POST /api/v1/agent/sessions/{session_id}/turn`
Extracts shopper intent via Gemini 2.0 Flash structured JSON schemas, triggers multi-retailer discovery, applies deterministic ranking, and returns natural-language recommendations.
**Headers**: `Authorization: Bearer <session_token>`
**Request**:
```json
{
  "message": "Find a work headset under $100 with multipoint Bluetooth",
  "user_budget": 100.00,
  "search_id": null
}
```
**Response**:
```json
{
  "session_id": "sess_abc123",
  "reply_text": "I analyzed 4 candidate options and found the best match: Anker Soundcore Space Q45...",
  "intent": {
    "category": "wireless headset",
    "budget": 100.00,
    "currency": "USD",
    "must_have": ["multipoint Bluetooth"],
    "preferences": ["work"],
    "avoid": []
  },
  "intent_source": "gemini",
  "recommendations": [
    {
      "product_id": "prod_01",
      "sku": "HEADSET-DEMO-01",
      "demo_sku": "HEADSET-DEMO-01",
      "title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
      "price": 89.99,
      "currency": "USD",
      "merchant": "PayPilot Demo Store",
      "source": "demo_catalogue",
      "score": 0.94,
      "within_budget": true,
      "explanation": "Top match meeting budget ceiling and hardware requirements."
    }
  ],
  "requires_clarification": false,
  "suggested_actions": []
}
```

---

## 3. Deterministic Policy Evaluation & Landed Cost Quotes

### `POST /api/v1/policies/evaluate`
Evaluates hard deterministic purchase policies: active inventory, currency matching, true landed cost (`item_price + estimated_tax + shipping <= max_total`), indirect prompt injection shield, excluded terms, and required feature attributes. On success, creates a cryptographically signed HMAC-SHA256 quote with a 10-minute TTL.
**Headers**: `Authorization: Bearer <session_token>`
**Request**:
```json
{
  "session_id": "sess_abc123",
  "demo_sku": "HEADSET-DEMO-01",
  "max_total": 100.00,
  "currency": "USD",
  "required_features": ["multipoint Bluetooth"],
  "excluded_terms": []
}
```
**Response**:
```json
{
  "eligible": true,
  "policy_version": "v1",
  "currency": "USD",
  "max_total": 100.00,
  "item_price": 89.99,
  "estimated_tax": 7.42,
  "shipping": 0.0,
  "shipping_cost": 0.0,
  "landed_cost": 97.41,
  "merchant": "Anker",
  "sku": "HEADSET-DEMO-01",
  "item_title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
  "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
  "checks": [
    { "rule": "demo_catalogue_active", "passed": true, "detail": "Product is active and in-stock" },
    { "rule": "currency_match", "passed": true, "detail": "Currency matches (USD)" },
    { "rule": "budget_limit", "passed": true, "detail": "Landed cost $97.41 (Item: $89.99 + Tax: $7.42 + Shipping: $0.00) is within budget ceiling of $100.00" },
    { "rule": "prompt_injection_shield", "passed": true, "detail": "Retail catalog payload sanitized — zero adversarial prompt injection patterns detected." },
    { "rule": "feature_req_multipoint_bluetooth", "passed": true, "detail": "Verified attribute: multipoint Bluetooth" },
    { "rule": "buyer_approval_required", "passed": true, "detail": "Explicit human PayPal authorization gate enforced" }
  ],
  "quote": {
    "id": "quote_7e20b3a912",
    "amount": 89.99,
    "currency": "USD",
    "expires_at": "2026-10-23T09:10:00+00:00",
    "item_price": 89.99,
    "estimated_tax": 7.42,
    "shipping": 0.0,
    "shipping_cost": 0.0,
    "landed_cost": 97.41,
    "merchant": "Anker",
    "image_url": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80",
    "quote_signature": "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"
  },
  "reason": "All purchase policies passed"
}
```

---

## 4. PayPal Orders v2 Checkout Lifecycle

### `POST /api/v1/checkout/create`
Atomically consumes the valid quote and creates a PayPal Orders v2 record (`intent: CAPTURE`) with itemized amount breakdown (`item_total`, `tax_total`, `shipping`) and cryptographic signature binding in `purchase_units[0].custom_id` and `invoice_id`.
**Headers**: `Authorization: Bearer <session_token>`
**Request**:
```json
{
  "quote_id": "quote_7e20b3a912",
  "session_id": "sess_abc123",
  "idempotency_key": "idemp_checkout_123"
}
```
**Response**:
```json
{
  "order_id": "order_a1b2c3d4e5",
  "paypal_order_id": "9B12345678901234",
  "status": "AWAITING_APPROVAL",
  "amount": 89.99,
  "currency": "USD",
  "paypal_mode": "sandbox"
}
```

### `POST /api/v1/checkout/{order_id}/capture`
Captures authorized buyer payment with pre-capture re-verification:
1. Re-verifies quote has not expired.
2. Re-verifies HMAC-SHA256 signature integrity.
3. Re-verifies live merchant price hasn't spiked above quote.
4. Executes PayPal capture and persists payment record.
Supports optional `simulate_price_drift: true` flag for hackathon demo testing.
**Headers**: `Authorization: Bearer <session_token>`
**Request**:
```json
{
  "idempotency_key": "idemp_cap_123",
  "simulate_price_drift": false
}
```
**Response**:
```json
{
  "order_id": "order_a1b2c3d4e5",
  "status": "PAID",
  "payment": {
    "provider": "paypal_sandbox",
    "capture_id": "CAP_987654321",
    "amount": 89.99,
    "currency": "USD"
  }
}
```

### `POST /api/v1/orders/{order_id}/cancel`
Cancels a pending order in `AWAITING_APPROVAL` status before payment capture.
**Headers**: `Authorization: Bearer <session_token>`
**Response**:
```json
{
  "order_id": "order_a1b2c3d4e5",
  "status": "CANCELLED"
}
```

---

## 5. PayPal Webhook Reconciliation

### `POST /api/v1/webhooks/paypal`
Asynchronous webhook receiver for PayPal event streams (`PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.DENIED`). Cryptographically verifies transmission signature headers, reconciles order and quote status, records an immutable audit log entry, and returns HTTP 200 OK.
**Headers**: `paypal-auth-algo`, `paypal-transmission-id`, `paypal-cert-url`, `paypal-transmission-sig`, `paypal-transmission-time`
**Response**:
```json
{
  "status": "received",
  "event_id": "WH-9AB123456",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "matched_order_id": "order_a1b2c3d4e5"
}
```

---

## 6. Financial Ledger & AG Studio Analytics

### `GET /api/v1/analytics/sessions/{session_id}/dashboard`
Returns the consolidated Embedded Financial Analytics data model for AG Studio ingestion: tabular sources (`orders`, `transactions`, `customers`), relational joins, calculated KPI expressions (`collection_rate`), and aggregate financial metrics.
**Headers**: `Authorization: Bearer <session_token>`
**Response**:
```json
{
  "description": "PayPal Financial Analytics Data Model - Enterprise Invoicing, Orders, and Customer Metrics",
  "sources": {
    "orders": [...],
    "transactions": [...],
    "customers": [...]
  },
  "relationships": [...],
  "metrics": {
    "total_issued_amount": 89.99,
    "total_paid_amount": 89.99,
    "collection_rate_percent": 100.0,
    "total_orders": 1,
    "paid_orders": 1,
    "average_order_value": 89.99,
    "currency": "USD"
  }
}
```

### `GET /api/v1/sessions/{session_id}/timeline`
Returns the cryptographically hash-chained immutable audit event timeline for the session.
**Headers**: `Authorization: Bearer <session_token>`
**Response**:
```json
{
  "session_id": "sess_abc123",
  "events": [
    {
      "id": "audit_123456",
      "event_type": "PAYPAL_ORDER_CREATED",
      "details": { "paypal_order_id": "9B12345678901234", "amount": 89.99 },
      "created_at": "2026-10-23T08:05:00Z",
      "prev_hash": "0000000000000000000000000000000000000000000000000000000000000000",
      "entry_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ]
}
```

---

## 7. Service Health

### `GET /health`
Returns service readiness and integration status:
```json
{
  "status": "ok",
  "app_env": "development",
  "paypal_env": "sandbox",
  "paypal_configured": true,
  "channel3_configured": true,
  "ai_provider": "gemini",
  "gemini_model": "gemini-2.0-flash"
}
```
