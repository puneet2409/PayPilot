# PayPilot — Demo Script

> **Target Video Length:** 2 minutes 40 seconds (Strict cutoff: Under 3 minutes!)  
> **Structure:** 4 concise segments showing all hackathon sponsor integrations.

---

## Prerequisites Before Recording
1. **Backend:** Running on `http://localhost:8000` (`python -m uvicorn app.main:app --port 8000`)
2. **Frontend:** Running on `http://localhost:5173` (`npm run dev`)
3. **Environment (.env):**
   - `PAYPAL_CLIENT_ID` & `PAYPAL_CLIENT_SECRET` (from `developer.paypal.com` Sandbox)
   - `VITE_PAYPAL_CLIENT_ID` (matching client ID in `frontend/.env`)
   - `CHANNEL3_API_KEY` (from `trychannel3.com` with promo code `PAYPAL-HACKATHON-2026`)
   - `GEMINI_API_KEY` (from `aistudio.google.com`)
4. **Header Status Check:** Confirm all three badges are active:
   - `Channel3 Live (25k+ Retailers)` 🟢
   - `PayPal Sandbox Ready` 🟢
   - `OpenAPI 3.1` 🟣

---

## Demo Walkthrough (Total: 2m 40s)

### Act 1: AI Intent Parsing & Channel3 Discovery (~40s)
1. **Hook:** "Autonomous AI agents that spend money can hallucinate prices, overlook required specs, or overspend. PayPilot solves this with consent-first agentic commerce."
2. Click the preset: **"Headset under $100"** (or type: *"Find a wireless headset under $100 with multipoint Bluetooth and a built-in microphone. Avoid refurbished."*).
3. **Point out Parsed Shopping Intent:** Show how Gemini extracted:
   - Category: `wireless headset`
   - Budget: `$100.00 USD`
   - Must-have tags: `multipoint`, `built-in microphone`
   - Exclusions: `refurbished`
4. **Point out Channel3 Multi-Retailer Results:**
   - Live external comparison results from major retailers (Best Buy, Walmart, B&H) with direct retailer links.
   - Verified feature badges (green) vs unverified (gray).
   - PayPilot demo-store item ready for purchase.

### Act 2: Deterministic Purchase Policy Engine (~45s)
1. Select the top candidate: The **Purchase Policy Checklist** evaluates in real-time.
2. Show all 4 deterministic code checks passing:
   - SKU active status ✓
   - Currency match ✓
   - Budget ceiling check ✓
   - Feature specification verification ✓
3. Point out: A cryptographically signed **Quote** is issued with a locked 10-minute TTL.
4. **Demonstrate Policy Enforcement:** Click the preset **"Headset under $50 (Test Policy Block)"**.
5. Show what happens:
   - Products remain visible with an **Over Budget** warning badge.
   - The Policy Engine **REJECTS** the transaction (Price $89.99 > $50.00 ceiling).
   - Emphasize: *No quote is created. The LLM cannot bypass the deterministic rules.*

### Act 3: Consent-First PayPal Sandbox Checkout (~45s)
1. Switch back to "Headset under $100" and click **"Proceed to PayPal Checkout"**.
2. Click **"1. Generate PayPal Sandbox Order"**:
   - The server calls PayPal Orders v2 API with `intent: CAPTURE` and an idempotency key.
   - The verified PayPal Order ID appears.
3. The official **PayPal JS SDK Button** (`@paypal/react-paypal-js`) renders.
4. Click the PayPal button, log in with your Sandbox Personal buyer account, and click **Pay Now / Complete Purchase**.
5. **Capture Confirmation:** Server captures and verifies payment. Order status turns to **PAID** with the official PayPal Capture ID displayed.

### Act 4: Financial Ledger, Audit Trail & OpenAPI 3.1 (~30s)
1. Switch to the **Payments Ledger** tab in the right-hand panel (inspired by the AG Grid payments workshop).
2. Show the real-time financial ledger:
   - Order ID, Item, Amount ($89.99), Status (`PAID`), PayPal Order ID, Capture ID, and timestamp.
   - Click **Export CSV** to demonstrate clean financial reporting.
3. Switch to the **Audit Trail** tab to show the immutable session provenance log.
4. Click **OpenAPI 3.1** in the header to show the APIMatic-compliant interactive API documentation.
5. **Closing:** "PayPilot delivers agentic commerce with deterministic safety: AI advises, code protects, and the buyer approves. Thank you!"

---

## Submission Checklist
- [ ] Video duration is strictly under 3 minutes (target: 2m 40s).
- [ ] Video uploaded to YouTube as Public or Unlisted.
- [ ] GitHub repository is public with `LICENSE` (MIT).
- [ ] Devpost submission lists all sponsor categories (Channel3, AG Grid, APIMatic, Render, Overall).
