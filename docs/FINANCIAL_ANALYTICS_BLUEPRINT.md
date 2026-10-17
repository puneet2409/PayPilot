# Embedded Financial Analytics Blueprint: Integrating AG Studio with PayPal REST APIs & AI Context Frameworks

> **PayPilot Enterprise Reference Architecture**  
> *Seamlessly uniting PayPal REST API ingestion, AG Studio relational modeling, state-driven application shells, conversational AI agents, and resilient asynchronous webhook synchronization.*

---

## Architecture Flow Overview

```
+-----------------------------------------------------------------------------------+
|                            PAYPAL REST APIS & SANDBOX                             |
|  * /v1/oauth2/token (OAuth 2.0 Client Credentials with In-Memory Caching)          |
|  * /v2/checkout/orders (Orders v2 Lifecycle: CREATED -> APPROVED -> PAID)        |
|  * /api/v1/webhooks/paypal (Asynchronous Event Ingestion & Webhook Reconciliation)|
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                        INGESTION & AGGREGATION LAYER                              |
|  Wrapper: GET /api/v1/analytics/sessions/{session_id}/dashboard (getDashboardAPIData)|
|  * Ingests operational transactional stream into tabular datasets                 |
|  * Calculates relative temporal boundaries: getDatasetDateBounds()                |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                         AG STUDIO RELATIONAL MODELING                             |
|  Configuration Object: buildStudioDataConfig()                                    |
|  1. Sources Array:                                                                |
|     - "orders" (id, quoteId, customerId, sku, title, issued_amount, paid_amount)  |
|     - "transactions" (transaction_id, order_id, gross_amount, fee_amount, net)    |
|     - "customers" (id, given_name, company_name, status)                         |
|  2. Relational Joins:                                                             |
|     - many-to-one (orders.customerId -> customers.id)                            |
|     - many-to-one (transactions.order_id -> orders.id)                           |
|  3. Analytical Expressions:                                                       |
|     - collection_rate = (paid_amount / issued_amount)                             |
|  4. Semantic AI Harness Description: Domain awareness for zero-hallucination     |
+-----------------------------------------------------------------------------------+
                                         │
                                         ▼
+-----------------------------------------------------------------------------------+
|                    APPLICATION SHELL & AGREPORTSTATE SERIALIZATION                |
|  * Interaction Modes: "view" (reporting exploration) vs "blueprint" (design)     |
|  * AGReportState JSON: selectedPageId, widgets (grid, bar, pie), layout (XY grid) |
|  * One-Click Export: CSV Transaction Ledger & AGReportState JSON specification    |
+-----------------------------------------------------------------------------------+
```

---

## 1. Data Ingestion & PayPal REST API Foundation

### 1.1 Sandbox Topology & Authentication Architecture
- **Business (Merchant) Account:** Configured for `US / USD` to match customer currency and prevent artificial FX conversions.
- **Personal (Customer) Account:** Dedicated sandbox buyer account (`US / USD`) used for client-side buyer approval.
- **Dual-Credential Strategy:**
  - `VITE_PAYPAL_CLIENT_ID`: Public client ID used in `@paypal/react-paypal-js` button controls.
  - `PAYPAL_CLIENT_SECRET`: Private server-side secret strictly managed in `backend/.env`.
- **OAuth Token Caching:** In `backend/app/integrations/paypal.py`, the Bearer access token is cached in memory with a 60-second expiration safety margin, preventing redundant token requests and eliminating API rate-limiting bottlenecks.

### 1.2 Data Ingestion Wrapper (`getDashboardAPIData`)
Exposed at `GET /api/v1/analytics/sessions/{session_id}/dashboard`, this endpoint transforms operational database state into three normalized tabular sources:
- `sources.orders`: Complete order records including `issued_amount`, `paid_amount`, and statuses (`PAID`, `AWAITING_APPROVAL`, `CANCELLED`).
- `sources.transactions`: Captured payments with gross volume, processing fee calculations (`amount * 0.029 + 0.30`), and net settled funds.
- `sources.customers`: Session customer metadata.

---

## 2. AG Studio Data Modeling & Relational Schema Architecture

Implemented in [`frontend/src/utils/agStudioConfig.ts`](../frontend/src/utils/agStudioConfig.ts):

### 2.1 Schema Mapping (`buildStudioDataConfig`)
All tabular sources include typed fields (`string`, `number`, `date`, `boolean`) and a global domain description:
```typescript
description: "PayPal Financial Analytics Data Model - Enterprise Invoicing, Subscriptions, and Customer Metrics"
```
This description is injected directly into the AI Agent Harness (`createAIHarness`) to bound conversational querying and prevent field hallucination.

### 2.2 Relational Join Modeling
Foreign key relationships enable multi-table dynamic aggregations without manual client-side merging:
```typescript
relationships: [
  { type: "many-to-one", from: { source: "orders", field: "customerId" }, to: { source: "customers", field: "id" } },
  { type: "many-to-one", from: { source: "transactions", field: "order_id" }, to: { source: "orders", field: "id" } }
]
```

### 2.3 Calculated Expressions
Derived analytical metrics calculated on the fly:
```typescript
expressions: [
  { source: "orders", name: "collection_rate", label: "Collection Rate (%)", dataType: "number", expression: "paid_amount / issued_amount" }
]
```

### 2.4 Relative Temporal Boundaries
Dynamically computed via `getDatasetDateBounds()` across transaction timestamps:
```typescript
calendar: {
  startDate: bounds.startDate,
  endDate: bounds.endDate,
  defaultRange: "thisYear"
}
```

---

## 3. Application Shell & State Management

Implemented in [`frontend/src/components/OrdersLedger.tsx`](../frontend/src/components/OrdersLedger.tsx):

- **Interaction Modes:** Toggle between standard interactive **Table View** and **AG Studio Blueprint Mode**.
- **Serializable AGReportState JSON:** Inspectable via the in-app modal (`generateAGReportState()`), providing the exact XY grid coordinate layouts for grids, bar charts, and KPI cards.
- **One-Click Exports:**
  - **Export CSV:** Downloads complete transaction ledger for financial auditing.
  - **Copy AG Studio Config:** Copies the canonical `buildStudioData` configuration object to the clipboard.

---

## 4. Asynchronous Webhook Synchronization & Resilience

Implemented in [`backend/app/api/webhooks.py`](../backend/app/api/webhooks.py):

- **Webhook Receiver:** `POST /api/v1/webhooks/paypal`
- **Supported Event Types:** `PAYMENT.CAPTURE.COMPLETED`, `CHECKOUT.ORDER.APPROVED`, `PAYMENT.CAPTURE.REFUNDED`.
- **Immediate HTTP 200 OK Response:** Complies with PayPal webhook contracts to prevent exponential backoff retries (up to 25 retries over 3 days).
- **Audit Logging:** Every webhook event is immutably logged into the session's audit trail (`AuditService.record_event`).
