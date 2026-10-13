# PayPilot Frontend

React 19 + Vite + Tailwind CSS 4 dashboard for **PayPilot**, the consent-first AI commerce agent. It renders agent recommendations from Channel3 discovery, the deterministic purchase-policy checklist, the PayPal Sandbox approval flow, and the auditable provenance trail.

## Prerequisites

- Node.js 20+
- The PayPilot backend running on `http://localhost:8000` (see the root README)

## Setup

```bash
npm install
cp .env.example .env   # optional: set VITE_API_BASE_URL / VITE_PAYPAL_CLIENT_ID
npm run dev
```

Open `http://localhost:5173`. The Vite dev server proxies `/api` and `/health` to `http://localhost:8000`, so no CORS setup is needed locally.

## Environment Variables

| Variable                | Default | Purpose                                                                 |
| ----------------------- | ------- | ----------------------------------------------------------------------- |
| `VITE_API_BASE_URL`     | `''`    | Backend base URL. Leave empty in dev (proxy handles it).                |
| `VITE_PAYPAL_CLIENT_ID` | `''`    | PayPal Sandbox client ID. When set, real PayPal Buttons render; when empty, the approval step runs in clearly-labeled simulated mode. |

## Scripts

| Command           | What it does                          |
| ----------------- | ------------------------------------- |
| `npm run dev`     | Start the Vite dev server on :5173    |
| `npm run build`   | Type-check (`tsc -b`) and build `dist/` |
| `npm run lint`    | Lint with Oxlint                      |
| `npm run preview` | Serve the production build locally    |

## UI Map

- **ChatPanel** — natural-language shopping intent with budget input and preset demo scenarios (including the deliberate over-budget "Test Policy Block").
- **ProductCard** — ranked Channel3 candidates with verified/unverified feature badges and an "Over budget" flag.
- **PolicyPanel** — the deterministic policy checklist and locked quote (10-minute TTL).
- **ApprovalPanel** — server-created PayPal order plus explicit buyer approval (PayPal Buttons SDK or simulated mode).
- **OrderStatus** — capture receipt with the verified PayPal capture ID.
- **AuditTimeline** — live provenance trail of every search, policy check, and payment event.
