# PayPilot — Demo Script

> Use this 3-minute walkthrough to demonstrate all three pillars of PayPilot.

## Prerequisites
- Backend running on `http://localhost:8000`
- Frontend running on `http://localhost:5173`
- PayPal Sandbox REST credentials and the matching frontend Client ID for the judging demo; simulated mode is local-only and does not satisfy the PayPal integration demonstration
- (Optional) Channel3 API key for live product discovery
- Gemini API key to demonstrate structured AI intent parsing (the rules fallback supports local setup, but configure Gemini for the hackathon video)

## Demo Flow (target: 2 minutes 45 seconds)

### 1. Product Discovery (about 45 seconds)
1. Open the app at `http://localhost:5173`
2. Search: **"Find a work headset under $100 with multipoint Bluetooth and a built-in microphone. Avoid refurbished."**
3. Show **Parsed shopping intent**: category, budget, required features, exclusion, and Gemini/rules source
4. If Channel3 is configured, show both a **Channel3 result** (live retailer offer) and a **PayPilot demo-store item**; without a key, show the bundled demo-store items
5. Point out that only live Channel3 results show retailer links; the demo-store price is clearly identified and is what the sandbox purchase uses
6. Note the **Auditable Provenance Trail** on the right — first event logged

### 2. Deterministic Policy Engine (about 45 seconds)
1. A purchasable PayPilot demo-store candidate is auto-selected when available and policy-evaluated; live retailer-only results remain comparison-only
2. Show that extracted requirements and exclusions are passed to the policy engine
3. Explain the checked price is PayPilot demo-store inventory; a retailer offer is market comparison, not this checkout price
4. A quote is generated with a 10-minute TTL only when all deterministic checks pass
5. Now try the preset **"Headset under $50 (Test Policy Block)"**
6. Observe: candidates remain visible, over-budget options are flagged, and the policy panel shows **REJECTED** using the PayPilot demo-store price
7. Point out: No quote is created. Gemini parsed the request; deterministic code made the purchase decision.

### 3. Consent-First PayPal Checkout (about 60 seconds)
1. Go back to "Headset under $100" and select the PayPilot demo-store item if the live Channel3 result is comparison-only
2. Click **"Proceed to PayPal Checkout"** to enter the approval panel
3. Click **"Generate PayPal Sandbox Order"** — server creates the order via PayPal Orders v2 API
4. The PayPal Approve button appears (real PayPal SDK or simulated)
5. Click to approve and capture
6. Observe: Payment is confirmed, capture ID is displayed, audit trail shows the full lifecycle

### Key Differentiators to Highlight
- **No autonomous spending**: The AI recommends but never pays without explicit consent
- **Deterministic guardrails**: Budget, features, and exclusions are enforced by code — not LLM promises
- **Auditable event timeline**: Key actions are logged with timestamps and session-scoped provenance
- **Meaningful AI use**: Gemini extracts structured intent that drives search, ranking, and policy checks
- **Real APIs**: Channel3 for discovery and PayPal Sandbox Orders for buyer-approved checkout
- **Architecture honesty**: Demo-store vs. external offers are clearly distinguished

## Before Submission
- [ ] Publish the source repository publicly and confirm the MIT `LICENSE` is visible at the repository root
- [ ] Keep source, assets, and complete setup/run instructions in that repository
- [ ] Add the hosted demo URL, or confirm the README setup works from a clean clone
- [ ] Record a public YouTube demo under 3 minutes that shows the app running end to end
- [ ] In the submission form, name Gemini, PayPal Sandbox, and Channel3 and explain each tool's role
- [ ] Use only media and music that the team has permission to include
