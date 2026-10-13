# PayPilot — Demo Script

> Use this 3-minute walkthrough to demonstrate all three pillars of PayPilot.

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`
- (Optional) PayPal Sandbox credentials for live checkout
- (Optional) Channel3 API key for live product discovery
- (Optional) Gemini API key for AI-powered synthesis

## Demo Flow

### 1. Product Discovery (Channel3 Integration)
1. Open the app at `http://localhost:5173`
2. Click the preset **"Headset under $100"**
3. Observe: Agent searches Channel3 for wireless headsets
4. Point out: 2-4 product candidates appear with real prices, merchants, and buy links
5. Note the **Auditable Provenance Trail** on the right — first event logged

### 2. Deterministic Policy Engine (AI Guardrails)
1. The top candidate is auto-selected and policy-evaluated
2. Show the **Purchase Policy Checklist**: active status ✓, currency match ✓, budget limit ✓, feature verification ✓
3. A **locked quote** is generated with a 10-minute TTL
4. Now try the preset **"Headset under $50 (Test Policy Block)"**
5. Observe: candidates still appear — the top one carries an **"Over budget"** badge and the agent warns you in its reply
6. The auto-selected candidate is policy-evaluated and the Policy panel shows **REJECTED** — price exceeds the $50 ceiling
7. Point out: The quote is NOT created. The AI cannot bypass the deterministic rules.

### 3. Consent-First PayPal Checkout
1. Go back to "Headset under $100"
2. Click **"Proceed to PayPal Checkout"** to enter the approval panel
3. Click **"Generate PayPal Sandbox Order"** — server creates the order via PayPal Orders v2 API
4. The PayPal Approve button appears (real PayPal SDK or simulated)
5. Click to approve and capture
6. Observe: Payment is confirmed, capture ID is displayed, audit trail shows the full lifecycle

### Key Differentiators to Highlight
- **No autonomous spending**: The AI recommends but never pays without explicit consent
- **Deterministic guardrails**: Budget, features, and exclusions are enforced by code — not LLM promises
- **Immutable audit trail**: Every action is logged with timestamps and provenance
- **Real APIs**: Channel3 for discovery, PayPal for payments, Gemini for AI synthesis
- **Architecture honesty**: Demo-store vs. external offers are clearly distinguished
