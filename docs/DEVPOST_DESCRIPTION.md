# PayPilot — Devpost Submission Draft

> **Project Name:** PayPilot  
> **Tagline:** Consent-First Agentic Commerce: Natural-language discovery across 25k+ retailers, deterministic code-enforced guardrails, and buyer-approved PayPal Sandbox checkout.  
> **Target Tracks:**
> - 🏆 **Main Category:** Best Agentic Commerce Experience / Overall Hackathon
> - 🛍️ **Sponsor Prize 1: Channel3** — Real-Time Agentic Product Discovery across 25,000+ Retailers
> - 📊 **Sponsor Prize 2: AG Grid** — Real-Time Financial Ledger & Payments Dashboard View
> - 🔌 **Sponsor Prize 3: APIMatic** — Hallucination-Free OpenAPI 3.1 Schemas & Context Plugin
> - 🚀 **Sponsor Prize 4: Render** — Production Cloud Deployment with PostgreSQL & Automated Healthchecks

---

## 1. Short Description

PayPilot bridges the trust gap in AI commerce: it turns natural-language shopping goals into evidence-ranked multi-retailer products via Channel3, validates purchases against deterministic Python guardrails (budget ceilings, required features, negative exclusions), and routes quotes through buyer-approved PayPal Sandbox checkout with a complete financial ledger and audit trail.

---

## 2. The Problem: The Agentic Commerce Dilemma

Autonomous AI agents that can spend money represent the next frontier of e-commerce, but they present severe real-world dangers:
1. **Hallucinated Prices & Specs:** LLMs invent discounts, misread specifications, or miss critical buyer requirements.
2. **Autonomous Overspending:** Unchecked agents can trigger unintended transactions with no human in the loop.
3. **Black-Box Transactions:** When an agent makes a purchase, the shopper has zero auditable record of *why* the product was selected or *how* the price was calculated.

---

## 3. The Solution: How PayPilot Works

PayPilot introduces a **four-stage consent-gated pipeline** where AI advises, but code and human consent control the money:

```
[Shopper Brief]
      │
      ▼
[1. Google Gemini 3.8 Flash] ─── Extracts Category, Budget, Must-Have Features, Avoid Terms
      │
      ▼
[2. Channel3 Agentic Engine] ─── Live Search Across 25,000+ Merchants (Best Buy, Walmart, B&H)
      │
      ▼
[3. Deterministic Policy Engine] ─── Landed Cost Breakdown, Prompt Injection Shield, 10-Min HMAC Quote Lock
      │
      ▼
[4. PayPal Orders v2 Gateway] ─── Itemized Breakdown, Pre-Capture Price Re-Verification, Buyer SDK Approval
      │
      ▼
[5. Transparency & Ledger] ─── Session Audit Timeline + AG Studio CFO Command Center + Payments Ledger
```

### Key Capabilities & Architectural Pillars

- **Real-Time Discovery across 25k+ Retailers (Channel3):** Unlike toy demos with static mock data, PayPilot queries the live Channel3 catalog in `agentic` mode to retrieve real-time merchant offers, pricing, availability, and direct retailer links.
- **Deterministic Policy Guardrails (Zero AI Hallucination):** The LLM is never permitted to authorize spending or override rules. A pure Python rule engine evaluates budget ceilings, required features, and excluded terms against verified product attributes before issuing a cryptographically signed (HMAC-SHA256) 10-minute quote lock.
- **Landed Cost & Prompt Injection Shield:** Evaluates total purchase price including estimated sales tax (8.25%) and shipping ($0 for orders ≥$50, else $5.99). Deterministically sanitizes untrusted retail catalog text against adversarial prompt injections before quote creation.
- **Consent-First PayPal Checkout (`@paypal/react-paypal-js`):** PayPilot adheres to the PayPal AI-Toolkit / Agentic Commerce paradigm. Funds never move autonomously. The backend initiates a PayPal Orders v2 transaction with itemized breakdown and cryptographic `custom_id` binding.
- **Pre-Capture Price Spike & Auto-Void Protection:** Re-verifies live merchant price and stock before capture. If a retailer hikes the price while the buyer is on checkout, payment is blocked and the order is automatically voided.
- **Dual-Lens Persona View:** Seamless top-level switcher between **🛒 Shopper Experience (B2C)** and **📊 Merchant & CFO Command Center (B2B)** with AG Studio financial blueprint metrics and hash-chained audit logs.
- **APIMatic-Verified OpenAPI 3.1:** All endpoints and payloads are strictly typed with Pydantic v2 and documented via OpenAPI 3.1 (`docs/openapi.json`), enabling instant integration into APIMatic Context Plugins.

---

## 4. Sponsor Tools & How They Are Used

| Sponsor / Technology | Concrete Role in PayPilot |
|---|---|
| **PayPal Developer Platform** | Powers the core payment lifecycle using Orders v2 REST APIs (`/v2/checkout/orders`), `@paypal/react-paypal-js` SDK buttons, idempotent server captures (`PayPal-Request-Id`), and Sandbox verification. |
| **Channel3 API** | Acts as the primary agentic discovery engine, querying over 25,000 merchant stores with query rewriting, SKU matching, and live multi-offer pricing comparisons. |
| **Google Gemini 2.0 Flash** | Parses unstructured shopping requests into structured JSON briefs containing category, numeric budget, mandatory feature tags, and negative exclusion terms. |
| **AG Grid Integration** | Inspires the Payments & Orders Ledger table, providing high-performance transaction sorting, quick status filters (`PAID`, `AWAITING_APPROVAL`, `CANCELLED`), and financial CSV export. |
| **APIMatic** | Validates PayPilot's OpenAPI 3.1 specification (`docs/openapi.json`), powering zero-hallucination IDE context plugins and multi-language SDK generation. |
| **Render** | Hosts the production deployment blueprint (`render.yaml`) featuring auto-provisioned PostgreSQL and automated zero-downtime healthcheck probes. |

---

## 5. Differentiators & Why PayPilot Wins

1. **No Autonomous Spending:** AI assists and negotiates; code enforces policy; the human clicks PayPal Approve.
2. **Honest Architecture:** We clearly distinguish between external market comparison offers (via Channel3) and purchasable demonstration inventory.
3. **Resilience & Fallbacks:** If external API keys are not supplied during initial setup, PayPilot gracefully falls back to deterministic rule-based parsing and sandbox simulation without crashing.
4. **Comprehensive Test Suite:** 22/22 unit and integration tests passing in CI (`pytest`), with isolated SQLite test databases and TypeScript compilation (`tsc -b && vite build`).

---

## 6. Demo Video & Submission Links

- **Repository:** *[GitHub Public URL]*
- **Hosted Demo:** *[Render / Cloud Hosted Demo URL]*
- **Demo Video (YouTube, < 3 Minutes):** *[YouTube Video Link]*
- **Interactive OpenAPI 3.1 Swagger Docs:** `http://localhost:8000/docs`
- **APIMatic Spec:** [`docs/openapi.json`](./openapi.json)
- **Demo Walkthrough Script:** [`docs/DEMO_SCRIPT.md`](./DEMO_SCRIPT.md)
