# PayPilot API Contracts (v1)

Base URL: `/api/v1`

## Session authorization

`POST /api/v1/sessions` creates an isolated anonymous session and a signed bearer token valid for 12 hours. Send `Authorization: Bearer <access_token>` on agent, policy, checkout, order, cancellation, and audit requests. The API binds the bearer token to the requested session or order. Discovery and catalogue endpoints remain public because they expose no session data.

Production requires `SESSION_SIGNING_SECRET` with at least 32 characters. Treat issued tokens like passwords. This demo provides session authorization, not account identity, recovery, or token revocation.

## 1. Discovery
### `POST /api/v1/discovery/search`
Retrieves live Channel3 products when configured. Search results may also include clearly labelled `demo_catalogue` items so the PayPal Sandbox purchase flow remains available without mapping an external retailer SKU to PayPilot inventory. Demo items do not contain retailer purchase links.
**Request**:
```json
{
  "query": "wireless headset for work",
  "max_price": 100.00,
  "currency": "USD",
  "requirements": ["multipoint Bluetooth", "built-in microphone"],
  "limit": 10
}
```
**Response**:
```json
{
  "search_id": "srch_123456",
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
          "price": 99.99,
          "currency": "USD",
          "availability": "InStock",
          "buy_url": "https://merchant.example/item",
          "observed_at": "2026-10-12T12:00:00Z"
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

## 2. AI Turn & Recommendations
### `POST /api/v1/agent/sessions/{session_id}/turn`
Processes natural language user requests, triggers search if needed, ranks options, and returns evidence-backed recommendations.
**Request**:
```json
{
  "message": "Find a work headset under $100 with multipoint Bluetooth",
  "search_id": null
}
```

## 3. Policy Evaluation & Quotes
### `POST /api/v1/policies/evaluate`
Executes deterministic validation rules and creates an authoritative quote.
**Request**:
```json
{
  "session_id": "sess_default",
  "demo_sku": "HEADSET-DEMO-01",
  "max_total": 100.00,
  "currency": "USD"
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
  "sku": "HEADSET-DEMO-01",
  "item_title": "Anker Soundcore Space Q45 Wireless Noise Cancelling Headphones",
  "checks": [
    { "rule": "demo_catalogue_active", "passed": true, "detail": "Product is active and in-stock" },
    { "rule": "currency_match", "passed": true, "detail": "Currency matches (USD)" },
    { "rule": "budget_limit", "passed": true, "detail": "Price $89.99 is within ceiling $100.00" },
    { "rule": "buyer_approval_required", "passed": true, "detail": "Explicit human PayPal authorization gate enforced" }
  ],
  "quote": {
    "id": "quote_abc123",
    "amount": 89.99,
    "currency": "USD",
    "expires_at": "2026-10-12T12:10:00Z"
  },
  "reason": "All purchase policies passed"
}
```

## 4. PayPal Checkout Lifecycle
### `POST /api/v1/checkout/create`
Creates an order matching the authoritative quote. The quote must belong to `session_id` and is atomically claimed once. `paypal_mode` reports `sandbox` for a real PayPal Sandbox order and `simulated` for the local no-credential flow. The quote must belong to `session_id`; repeating the same request with the same idempotency key returns or resumes that order; reusing the key for a different checkout returns `409`.
**Request**:
```json
{
  "quote_id": "quote_abc123",
  "session_id": "sess_default",
  "idempotency_key": "idemp_order_123"
}
```
**Response**:
```json
{
  "order_id": "order_local_123",
  "paypal_order_id": "9B12345678901234",
  "status": "AWAITING_APPROVAL",
  "amount": 89.99,
  "currency": "USD",
  "paypal_mode": "sandbox"
}
```

### `POST /api/v1/checkout/{order_id}/capture`
Captures a buyer-approved order once, then verifies PayPal's completed capture ID, amount, and currency against the quote. Ambiguous provider responses move the order to reconciliation instead of being treated as success.
**Request**:
```json
{
  "idempotency_key": "idemp_cap_123"
}
```
**Response**:
```json
{
  "order_id": "order_local_123",
  "status": "PAID",
  "payment": {
    "provider": "paypal_sandbox",
    "capture_id": "CAP_123456789",
    "amount": 89.99,
    "currency": "USD"
  }
}
```

## 5. Health Check
### `GET /health`
Returns service readiness:
```json
{
  "status": "ok",
  "app_env": "development",
  "paypal_env": "sandbox",
  "paypal_configured": true,
  "ai_provider": "gemini"
}
```
