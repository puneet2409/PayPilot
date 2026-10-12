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

**The Problem:** Traditional AI shopping bots either generate passive affiliate links (boring) or attempt to execute unconstrained autonomous purchases (terrifying). LLMs hallucinate prices, overlook shipping caps, ignore fine print, and cannot be trusted with an open wallet.

**The Solution:** **PayPilot** implements **Policy-Constrained Agency**:
1. **Intelligent Discovery:** Leverages the **Channel3 API** to retrieve real-time external product candidates, live retailer offers, and verified attributes.
2. **Deterministic Guardrails:** Evaluates candidates against a non-LLM, mathematical **Purchase Policy Engine** (hard budget limits, required attributes, active catalog checks).
3. **Consent-First PayPal Checkout:** Prepares a cryptographically locked quote, creates a server-side **PayPal Sandbox Order**, and requires **explicit buyer approval** before capturing payment.
4. **Auditable Provenance:** Produces an immutable event timeline tracing every recommendation, policy check, and payment capture ID.

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
    PP_Cap --> Audit["Immutable Provenance Audit Trail"]
    Audit --> UI
```

---

## 🛡️ Core Differentiator: The Purchase Policy Engine

PayPilot separates **discovery reasoning** from **financial execution**. Even if an LLM is prompt-injected or hallucinates:
* **Hard Spending Ceiling:** $\text{Price} + \text{Tax} + \text{Shipping} \le \text{Max Total}$. Rejects purchases that exceed the budget by even $\$0.01$.
* **Authoritative Server Pricing:** Item amounts are derived from the server database, never accepted from client payloads.
* **Quote Expiration:** Quotes expire after 10 minutes. Stale price changes trigger re-evaluation.
* **Consent Gate:** Autonomous checkout without human PayPal approval is blocked at the API level.

---

## 🚀 Quickstart Guide

### 1. Prerequisites
* **Python 3.12+**
* **Node.js 20+**
* (Optional) PayPal Developer Sandbox account & Channel3 API key

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
tests/test_api_endpoints.py::test_policy_evaluation_success_and_quote PASSED
tests/test_api_endpoints.py::test_policy_evaluation_budget_exceeded PASSED
tests/test_api_endpoints.py::test_end_to_end_checkout_and_capture PASSED
tests/test_policy_engine.py::test_policy_budget_pass PASSED
tests/test_policy_engine.py::test_policy_budget_exceeded PASSED
tests/test_policy_engine.py::test_policy_inactive_sku PASSED
tests/test_policy_engine.py::test_policy_required_feature_unverified PASSED
```

---

## ⚖️ Disclosure & License
* All transactions are processed strictly in **PayPal Sandbox**. No real funds are moved.
* Released under the [MIT License](LICENSE).
