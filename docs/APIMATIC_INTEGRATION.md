# APIMatic Context Plugin & OpenAPI 3.1 Integration

> **PayPal AI Hackathon 2026 — Partner Sponsor Track: APIMatic**
> *Eliminating AI API Hallucination through Deterministic OpenAPI 3.1 Schemas & Verified Context*

---

## Overview

In autonomous and agentic commerce workflows, LLMs frequently hallucinate nonexistent API parameters, outdated endpoints, or invalid payload structures when calling payment APIs. PayPilot resolves this vulnerability by combining:
1. **APIMatic-Compliant OpenAPI 3.1 Specification**: Formally defining all PayPilot routes, schemas, and PayPal Orders v2 contract boundaries.
2. **Deterministic Contract Encodings**: Strict Pydantic models in FastAPI served live at `/openapi.json` and bundled at `docs/openapi.json`.
3. **APIMatic Context Plugin Support**: Allowing AI IDEs (Cursor, VS Code, GitHub Copilot) to load verified endpoint definitions directly into the agent context window.

---

## 1. OpenAPI 3.1 Specification Details

The full OpenAPI schema is published at:
- **Live Local Swagger UI:** `http://localhost:8000/docs`
- **Live ReDoc:** `http://localhost:8000/redoc`
- **Raw OpenAPI 3.1 JSON:** `http://localhost:8000/openapi.json`
- **Committed Spec File:** [`docs/openapi.json`](./openapi.json)

### Key Endpoints Defined in the Specification

| Endpoint | Method | Description | Guardrail / Protection |
|---|---|---|---|
| `/api/v1/sessions` | `POST` | Issues signed bearer session token | Prevents cross-session tampering |
| `/api/v1/agent/sessions/{session_id}/turn` | `POST` | Gemini structured intent extraction & multi-retailer search | Dual-source discovery (Channel3 + catalogue) |
| `/api/v1/policies/evaluate` | `POST` | Evaluates deterministic purchase rules & issues quote | Code-enforced budget ceiling & 10-minute TTL quote |
| `/api/v1/checkout/create` | `POST` | Creates PayPal Orders v2 transaction (`intent: CAPTURE`) | Atomic quote consumption; validates session ownership |
| `/api/v1/checkout/{order_id}/capture` | `POST` | Captures authorized payment from PayPal | Server-side verification & idempotency key |
| `/api/v1/sessions/{session_id}/orders` | `GET` | Lists all session orders & payment captures | Real-time financial ledger & AG Grid feed |
| `/api/v1/orders/{order_id}/cancel` | `POST` | Cancels pending order in `AWAITING_APPROVAL` state | Deterministic status transition |
| `/api/v1/sessions/{session_id}/timeline` | `GET` | Returns immutable audit trail of state transitions | Auditable provenance log |

---

## 2. Using with APIMatic Context Plugin

APIMatic's Context Plugin enables developers to integrate API definitions into AI coding tools without prompt drift.

### Step 1: Import Schema into APIMatic
1. Log into your [APIMatic Dashboard](https://www.apimatic.io).
2. Select **Import API** and upload [`docs/openapi.json`](./openapi.json) (or provide the live URL `http://localhost:8000/openapi.json`).
3. APIMatic automatically validates and lints the OpenAPI 3.1 document against REST standards.

### Step 2: Configure AI Context Plugin
1. Install the **APIMatic Context Plugin** in VS Code or Cursor.
2. Select the imported **PayPilot API** workspace.
3. The plugin provides grounded context to the model, ensuring every API call matches exact types, status codes (200, 400, 403, 404, 409), and field names.

### Step 3: Multi-Language SDK Generation
Using APIMatic's code generation engine, developers can generate type-safe SDKs for PayPilot in:
- **TypeScript / Node.js**
- **Python**
- **C# / .NET**
- **Java**
- **Go**

---

## 3. Compliance Highlights for Hackathon Judges

- **Zero API Hallucination**: Every request body and query parameter is strictly validated with Pydantic v2 and OpenAPI 3.1 schemas.
- **Explicit Error Contracts**: All HTTP exception responses include standardized JSON error details (e.g. 403 for cross-session quote reuse, 409 for invalid state transitions).
- **Interactive UI Link**: The frontend header features a dedicated **OpenAPI 3.1** pill button that directly links to `/docs`.
