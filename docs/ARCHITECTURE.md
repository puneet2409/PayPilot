# PayPilot Architecture Documentation

## Overview
**PayPilot** is an AI commerce agent with enforceable purchase policies and verifiable payments built for the PayPal AI Hackathon.
It demonstrates **Policy-Constrained Agency**: allowing an AI to research, compare, and assemble an order while preventing any LLM from bypassing financial limits or triggering unauthorized fund movements.

## Core Architectural Pillars
1. **Separation of External Discovery vs Demo Merchant Checkout**:
   - Channel3 is integrated for real-time product discovery across web retailers, returning structured product data, retailer offers, live prices, and links.
   - PayPilot demo-store inventory provides purchasable demo-store SKUs processed via PayPal Sandbox.
   - Transparent boundaries: External retailer offers provide market intelligence; demo-store items provide the verified checkout lifecycle.
2. **Deterministic Purchase Policy Engine**:
   - Zero LLM trust for money and safety invariants.
   - Evaluates hard budget ceiling ($\text{Price} + \text{Tax} + \text{Shipping} \le \text{Max Total}$).
   - Validates required specifications and exclusions.
   - Enforces cryptographic/session-bound quote integrity and freshness.
3. **Consent-First PayPal Sandbox Lifecycle**:
   - Server-side creation of PayPal Orders (`/v2/checkout/orders`) with idempotency headers (`PayPal-Request-Id`).
   - Explicit buyer approval via PayPal JavaScript SDK.
   - Server-side capture and verification (`/v2/checkout/orders/{id}/capture`).
   - Immutable audit trail recording each state transition.

## System Sequence Flow
```
Shopper -> Frontend: "Find work headset under $100 with multipoint BT"
Frontend -> FastAPI (/turn): Forward message
FastAPI -> AI Orchestrator: Parse shopping intent & parameters
AI Orchestrator -> Channel3 (/search): Fetch structured offers & specs
Channel3 -> AI Orchestrator: Normalized product catalog & prices
AI Orchestrator -> Policy Engine: Pre-screen candidate matches
Policy Engine -> AI Orchestrator: Verified passing candidates
AI Orchestrator -> Frontend: Formulate recommendation & trade-off explanation
Shopper -> Frontend: Selects candidate & clicks "Proceed to Policy Check"
Frontend -> FastAPI (/policies/evaluate): Submit policy check for Demo SKU
FastAPI -> Policy Engine: Authoritative check against Demo Catalogue
Policy Engine -> Quote Service: Generate immutable quote (10m TTL)
Frontend -> PayPal SDK: Render approval button for Quote ID
Shopper -> PayPal Modal: Approves payment in PayPal Sandbox
Frontend -> FastAPI (/checkout/capture): Submit capture request with Quote & Order ID
FastAPI -> PayPal REST API: POST /v2/checkout/orders/{id}/capture
PayPal REST API -> FastAPI: Status = COMPLETED, Capture ID
FastAPI -> Audit Service: Record verified payment state & immutable provenance log
FastAPI -> Frontend: Render Order Confirmation & Audit Log
```
