# PayPilot Architecture Documentation

## Overview
**PayPilot** is an AI commerce agent with enforceable purchase policies and verifiable payments built for the PayPal AI Hackathon.
It demonstrates **Policy-Constrained Agency**: allowing an AI to research, compare, and assemble an order while preventing any LLM from bypassing financial limits or triggering unauthorized fund movements.

## Core Architectural Pillars
1. **Separation of External Discovery vs Demo Merchant Checkout**:
   - Channel3 is integrated for real-time product discovery across web retailers, returning structured product data, retailer offers, live prices, and links.
   - PayPilot demo-store inventory provides purchasable demo-store SKUs processed via PayPal Sandbox.
   - Transparent boundaries: External retailer offers provide market intelligence; demo-store items provide the checkout lifecycle. The UI labels the source and states that PayPal checkout uses the PayPilot demo-store price.
2. **AI Intent Parsing with Deterministic Enforcement**:
   - Gemini converts the shopper's natural-language request into structured category, budget, required-feature, preference, and exclusion fields.
   - Those fields drive search, ranking, and policy checks; the UI shows the parsed intent and whether Gemini or the rules fallback produced it.
   - The model does not set prices, determine eligibility, or initiate payment.
3. **Deterministic Purchase Policy Engine**:
   - Zero LLM trust for money and safety invariants.
   - Checks the PayPilot demo-store item price against the buyer's maximum. Tax and shipping are not separately modeled in this prototype.
   - Validates required specifications and exclusions.
   - Enforces signed session-token authorization, catalogue freshness, and one-time quote use.
4. **Consent-First PayPal Sandbox Lifecycle**:
   - Server-side creation of PayPal Orders (`/v2/checkout/orders`) with idempotency headers (`PayPal-Request-Id`).
   - Explicit buyer approval via PayPal JavaScript SDK.
   - Server-side capture and verification (`/v2/checkout/orders/{id}/capture`).
   - Session-scoped audit events record each state transition. The current prototype exposes an application-level timeline; it does not provide cryptographic tamper evidence.

## System Sequence Flow
```
Shopper -> Frontend: "Find work headset under $100 with multipoint BT"
Frontend -> FastAPI (/turn): Message + signed session token
FastAPI -> AI Orchestrator: Parse shopping intent into validated fields with Gemini or rules fallback
AI Orchestrator -> Channel3 (/search): Search parsed category; keep market offers visible above budget
Channel3 -> AI Orchestrator: Normalized live market results
AI Orchestrator -> Demo Catalogue: Add clearly labelled purchasable samples
AI Orchestrator -> Ranking Engine: Rank both sources by evidence, match, and budget fit
AI Orchestrator -> Frontend: Candidates with source, evidence, and parsed intent
Shopper -> Frontend: Selects candidate & clicks "Proceed to Policy Check"
Frontend -> FastAPI (/policies/evaluate): Demo SKU + all required features/exclusions + signed token
FastAPI -> Policy Engine: Authoritative check against Demo Catalogue
Policy Engine -> Quote Service: Generate server-side quote (10m TTL)
Frontend -> PayPal SDK: Render approval button for PayPilot Demo Store quote
Shopper -> PayPal Modal: Approves payment in PayPal Sandbox
Frontend -> FastAPI (/checkout/capture): Submit capture request with Quote & Order ID
FastAPI -> PayPal REST API: POST /v2/checkout/orders/{id}/capture
PayPal REST API -> FastAPI: Status = COMPLETED, Capture ID
FastAPI -> Audit Service: Record verified payment state in session-scoped event timeline
FastAPI -> Frontend: Render Order Confirmation & Audit Log
```
