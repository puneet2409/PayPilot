# PayPilot API Contracts (v1)

Base URL: `/api/v1`

## 1. Discovery
### `POST /api/v1/discovery/search`
Retrieves products from Channel3 with normalized schema.
**Request**:
```json
{
  "query": "wireless headset for work",
  "max_price": "100.00",
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
          "price": "99.99",
          "currency": "USD",
          "availability": "InStock",
          "buy_url": "https://amazon.com/example",
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
  "max_total": "100.00",
  "currency": "USD"
}
```
**Response**:
```json
{
  "eligible": true,
  "policy_version": "v1",
  "currency": "USD",
  "max_total": "100.00",
  "checks": [
    { "rule": "budget_limit", "passed": true, "detail": "Price 89.99 <= Budget 100.00" },
    { "rule": "demo_catalogue_active", "passed": true, "detail": "SKU active" },
    { "rule": "buyer_approval_required", "passed": true, "detail": "Consent gate active" }
  ],
  "quote": {
    "id": "quote_abc123",
    "amount": "89.99",
    "currency": "USD",
    "expires_at": "2026-10-12T12:10:00Z"
  }
}
```

## 4. PayPal Checkout Lifecycle
### `POST /api/v1/checkout/create`
Creates a PayPal Sandbox order matching the authoritative quote.
**Request**:
```json
{
  "quote_id": "quote_abc123",
  "idempotency_key": "idemp_order_123"
}
```
**Response**:
```json
{
  "order_id": "order_local_123",
  "paypal_order_id": "9B12345678901234",
  "status": "AWAITING_APPROVAL",
  "amount": "89.99",
  "currency": "USD"
}
```

### `POST /api/v1/checkout/{order_id}/capture`
Captures buyer-approved order with PayPal and verifies result.
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
    "amount": "89.99",
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
  "env": "development",
  "version": "1.0.0"
}
```
