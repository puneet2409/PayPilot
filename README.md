# PayPilot (paypilot-ai-commerce)

> **An AI Commerce Agent that Shops, Decides, and Pays Within Your Rules**  
> *Built for the PayPal AI Hackathon 2026*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![PayPal Sandbox](https://img.shields.io/badge/PayPal-Orders%20v2%20REST-003087.svg)](https://developer.paypal.com/api/rest/integration/orders-api)
[![Channel3](https://img.shields.io/badge/Channel3-Discovery%20API-black.svg)](https://trychannel3.com/)

---

## 🎯 Executive Summary & Problem Statement

**The Problem:** Traditional AI shopping bots either generate passive affiliate links or attempt unconstrained autonomous purchases. LLMs can hallucinate prices and product details, so purchase limits and payment authorization need deterministic enforcement.

**The Solution:** **PayPilot** implements **Policy-Constrained Agency**:
1. **AI Intent Understanding:** Gemini turns natural-language needs into structured category, budget, required-feature, preference, and exclusion fields. The UI shows the parsed brief and whether Gemini or the rules fallback produced it.
2. **Intelligent Discovery:** Uses **Channel3** for live external products, retailer offers, and product attributes. Live searches also include up to two explicitly labelled PayPilot demo-store items so judges can complete the sandbox flow even when external results cannot map to a purchasable demo SKU.
3. **Deterministic Guardrails:** Evaluates PayPilot demo-store items against the buyer's budget and required attributes. The model cannot set prices or approve a purchase.
4. **Consent-First PayPal Checkout:** Prepares a server-side quote, creates a **PayPal Sandbox Order**, and requires **explicit buyer approval** before capturing payment.
5. **Auditable Provenance:** Produces an event timeline tracing policy checks and payment capture status.

Private commerce and audit endpoints require a signed, 12-hour bearer token bound to an anonymous session. This isolates session data; it does not provide account identity or recovery. Production deployments must set `SESSION_SIGNING_SECRET` to a random value of at least 32 characters.

---

## 🏗️ Architecture

```mermaid
flowchart TD
    User["Shopper: 'Find wireless headset under $100'"] --> UI["React + Tailwind Frontend"]
    UI --> API["FastAPI Orchestrator"]
    API --> C3["Channel3 API: Live Discovery"]
    C3 --> Rank["Deterministic Ranking Engine"]
    Rank --> Pol["Purchase Policy Engine (Zero-LLM Trust)"]
    Pol --> Q["Authoritative Quote (Price Locked)"]
    Q --> PP_Create["PayPal Orders v2 API: /orders"]
    PP_Create --> Modal["PayPal Checkout Modal (Buyer Approval)"]
    Modal --> PP_Cap["PayPal Capture API: /orders/{id}/capture"]
    PP_Cap --> Audit["Session-Scoped Audit Timeline"]
    Audit --> UI
```

---

## 🛡️ Core Differentiator: The Purchase Policy Engine

PayPilot separates **discovery reasoning** from **financial execution**. Even if an LLM is prompt-injected or hallucinates:
* **Hard Spending Ceiling:** The catalogue's fixed item price must be at or below the buyer's maximum. Taxes and shipping are not separately modeled in this demo.
* **Authoritative Server Pricing:** Item amounts are derived from the server database, never accepted from client payloads.
* **Quote Expiration:** Quotes expire after 10 minutes. Stale price changes trigger re-evaluation.
* **Consent Gate:** Autonomous checkout without human PayPal approval is blocked at the API level.
* **Honest Discovery:** Over-budget candidates stay visible as market intelligence (clearly flagged), but only the deterministic policy engine decides whether a quote can be issued — try the *"Headset under \$50 (Test Policy Block)"* preset in the UI.

---

## 🚀 Quickstart Guide

Hackathon walkthrough, submission checklist, and draft project description: [demo script and checklist](docs/DEMO_SCRIPT.md), [Devpost copy](docs/DEVPOST_DESCRIPTION.md), and [API contracts](docs/API_CONTRACTS.md).

### 1. Prerequisites
* **Python 3.12+**
* **Node.js 20+**
* (Optional) PayPal Developer Sandbox account & Channel3 API key

Set `GEMINI_API_KEY` in `backend/.env` to demonstrate Gemini's structured intent parsing. Without a key, the interface labels the deterministic rules fallback. Configure `CHANNEL3_API_KEY` for live retailer results. For the hackathon video, configure both PayPal Sandbox REST credentials in `backend/.env` and the matching `VITE_PAYPAL_CLIENT_ID` in `frontend/.env`; local simulated checkout is clearly labelled and does not demonstrate a real PayPal transaction.

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env
```

Run test suite:
```bash
pytest -v
```

Start backend development server:
```bash
uvicorn app.main:app --reload --port 8000
```
API Documentation will be live at `http://localhost:8000/docs`.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 📦 Production Deployment (Render)

PayPilot includes a production blueprint `render.yaml` supporting:
* **Web Service:** FastAPI with Uvicorn (`/health` check configured).
* **Static Site:** React + Vite distribution.
* **PostgreSQL:** Managed database instance with persistent session/audit logs.

---

## 🧪 Automated Test Suite (100% Pass)
```
tests/test_api_endpoints.py::test_health_check PASSED
tests/test_api_endpoints.py::test_discovery_search PASSED
tests/test_api_endpoints.py::test_fallback_discovery_relevance PASSED
tests/test_api_endpoints.py::test_agent_turn_top_pick_within_budget PASSED
tests/test_api_endpoints.py::test_agent_turn_over_budget_top_pick_flagged PASSED
tests/test_api_endpoints.py::test_policy_evaluation_success_and_quote PASSED
tests/test_api_endpoints.py::test_policy_evaluation_budget_exceeded PASSED
tests/test_api_endpoints.py::test_end_to_end_checkout_and_capture PASSED
tests/test_api_endpoints.py::test_checkout_quote_ownership_validation PASSED
tests/test_api_endpoints.py::test_checkout_expired_quote PASSED
tests/test_api_endpoints.py::test_capture_idempotency PASSED
tests/test_api_endpoints.py::test_catalogue_listing PASSED
tests/test_api_endpoints.py::test_order_cancellation PASSED
tests/test_policy_engine.py::test_policy_budget_pass PASSED
tests/test_policy_engine.py::test_policy_budget_exceeded PASSED
tests/test_policy_engine.py::test_policy_inactive_sku PASSED
tests/test_policy_engine.py::test_policy_required_feature_unverified PASSED
tests/test_policy_engine.py::test_policy_feature_hyphen_normalization PASSED
tests/test_ranking.py::test_ranking_flags_and_demotes_over_budget_candidates PASSED
tests/test_ranking.py::test_ranking_within_budget_default_true PASSED
```

---

## ⚖️ Disclosure & License
* All transactions are processed strictly in **PayPal Sandbox**. No real funds are moved.
* Released under the [MIT License](LICENSE).
