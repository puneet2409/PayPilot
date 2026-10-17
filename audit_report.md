# PayPilot — Audit & Resolution Report

> Full code review of backend, frontend, integrations, docs, CI, and deployment config.
> All findings below have been **resolved** and verified by the automated test suite (20/20 passing) plus a live-server smoke test.

---

## Summary

| Severity | Findings | Status |
| -------- | -------- | ------ |
| Critical (breaks demo / deployment) | 2 | ✅ Fixed |
| High (correctness / data integrity) | 4 | ✅ Fixed |
| Medium (quality / honesty of output) | 5 | ✅ Fixed |
| Low (hygiene) | 4 | ✅ Fixed |

---

## Critical

### C1. Test suite wiped the development database
`backend/tests/conftest.py` dropped and recreated tables on the app's configured database (`paypilot.db`), so every `pytest` run destroyed local quotes, orders, and audit history from demo practice runs.
**Fix:** conftest now forces `DATABASE_URL=sqlite:///./paypilot_test.db` *before* the app is imported; the dev database is never touched. The five tests that built their own `TestClient` now share the standard `client` fixture.

### C2. Render deployment would crash on boot
`render.yaml` provisions PostgreSQL and injects its connection string, but no PostgreSQL driver was installed — `create_engine` would fail at startup on the first deploy.
**Fix:** added `psycopg2-binary` to `backend/requirements.txt`.

---

## High

### H1. The flagship "Test Policy Block" demo could never reach the policy engine
The agent pre-filtered Channel3 discovery by budget, so a "Headset under $50" search returned **zero** candidates. The user just saw "no matching products" — the policy engine's budget rejection (the project's #1 differentiator, per README and demo script) was unreachable through the UI.
**Fix:** discovery is no longer budget-filtered. The ranking engine keeps over-budget candidates, flags them (`within_budget: false`), and demotes them below every affordable option; the agent's reply explicitly warns when all matches exceed the ceiling. The deterministic policy engine remains the sole gate that blocks the purchase at quote time — exactly as documented.

### H2. "built-in microphone" could never verify against `built_in_microphone`
Feature-name normalization (`req.lower().replace(" ", "_")`) turned "built-in microphone" into `built-in_microphone`, which never substring-matches the attribute key `built_in_microphone` (hyphen ≠ underscore). The demo headset with a verified mic attribute was falsely labeled "Unverified", and a direct policy call with that feature would wrongly reject the purchase.
**Fix:** both `ranking.py` and `policy_engine.py` now normalize hyphens and spaces to underscores. Covered by `test_policy_feature_hyphen_normalization`.

### H3. Malformed PayPal response could strand a consumed quote
`checkout/create` read `paypal_res.get("id")` without a guard: a 2xx response without an `id` produced a local order with `paypal_order_id=None` — after the quote was already consumed — and capture would later hit `/orders/None/capture`.
**Fix:** the endpoint now rejects with HTTP 502 *before* the quote is consumed or any order is persisted.

### H4. Quote consumption had a check-then-set race
`consume_quote` read the status, then wrote `CONSUMED` in a separate step; two concurrent checkout requests could both consume the same quote.
**Fix:** consumption is now a single atomic conditional `UPDATE ... WHERE status = 'ACTIVE'`, preserving the one-quote-one-order invariant.

---

## Medium

### M1. Fallback discovery matched nearly everything
Token matching with no stopword or threshold control meant a "wireless mouse" query also returned the USB-C dock (both matched filler words like "with"/"and").
**Fix:** stopword list added, filler punctuation stripped, and a smarter threshold (all keywords must match for short queries, ≥60% for longer ones). A `category` field was added to the local catalogue so "wireless headset" matches headsets, not the mouse. Covered by `test_fallback_discovery_relevance`.

### M2. Local fallback data was labeled `channel3_verified`
When the Channel3 key is unset, results were tagged `channel3_verified`, misrepresenting bundled demo data as live Channel3 evidence — the opposite of the project's "architecture honesty" pillar.
**Fix:** fallback items are now labeled `demo_catalogue`.

### M3. Stale browser tab title and package name
`frontend/index.html` was titled "frontend" (no description meta), and the npm package was named `frontend`.
**Fix:** retitle to "PayPilot — Consent-First Agentic Commerce" with a description meta tag; package renamed `paypilot-frontend` in `package.json` and `package-lock.json`.

### M4. Documentation drift
`docs/API_CONTRACTS.md` showed a health response (`env`/`version`) the API doesn't return, omitted `session_id` from the checkout request, omitted `item_price`/`sku`/`item_title`/`reason` from the policy response, and displayed numeric amounts as strings. The root README's test listing was outdated.
**Fix:** all examples regenerated from actual schemas/responses; README test list updated (20 tests).

### M5. Budget regex dropped partial decimals
`(\d+(?:\.\d{2})?)` parsed "$99.5" as 99 (two-decimal requirement). Now `(\d+(?:\.\d+)?)`.

---

## Low

### L1. Dead `SESSION_SIGNING_SECRET` config
At the time of this audit the setting was unused, so it was removed. The follow-up session-authorization work now uses this setting to sign bearer tokens and requires a 32-character value in production.

### L2. Unused imports
`json` in `orchestrator.py`; `Dict, Any, Optional` in `ranking.py`; `Dict, Any` in `schemas/agent.py`; `pytest`/`TestClient`/`app` imports in `test_api_endpoints.py`. Removed.

### L3. Unused scaffold assets
`frontend/src/assets/react.svg`, `vite.svg`, `hero.png` and `public/icons.svg` were unreferenced Vite-scaffold leftovers. Deleted.

### L4. `frontend/README.md` was the stock Vite template
Replaced with a project-specific guide (setup, env vars, scripts, UI component map).

---

## Verified Behavior (regression coverage added)

- Over-budget candidates are surfaced, flagged, demoted — and still blocked by the policy engine (`test_ranking_flags_and_demotes_over_budget_candidates`, `test_agent_turn_over_budget_top_pick_flagged`).
- Feature normalization handles hyphenated names (`test_policy_feature_hyphen_normalization`).
- Fallback catalogue relevance (`test_fallback_discovery_relevance`).
- Agent turn end-to-end within budget, including verified features and demo-SKU linkage (`test_agent_turn_top_pick_within_budget`).

## AI-Build References

Swept the entire repo (source, docs, configs, commit metadata) for AI-assistance attributions ("generated by/with", tool names, AI-written boilerplate markers). **None found** — the only "AI" references are the product's own Gemini integration config, which is intentional. The frontend `README.md` was the stock Vite template (replaced, L4).

## Follow-up: Session Authorization

Private agent, policy, checkout, order, cancellation, and audit routes now require a signed 12-hour bearer token bound to an anonymous session. Production startup requires `SESSION_SIGNING_SECRET`. Existing integration-test clients obtain a session token before exercising those routes. This is session authorization, not account identity or recovery.

## Hackathon-readiness follow-up (2026-10-17)

- **Bundled discovery no longer invents retailer evidence.** Demo catalogue items identify PayPilot Demo Store as the merchant, omit external retailer links, and use explicit demo-store pricing language.
- **Live searches retain a checkout path.** When Channel3 returns external-only products, up to two matching demo-store items are included separately so the sandbox walkthrough can continue without claiming an external SKU is purchasable.
- **Checkout mode is explicit.** The API reports `sandbox` or `simulated`; mismatched frontend/backend credentials no longer show fake PayPal approval as live. Simulated completions use a distinct provider label and audit event.
- **Policy state follows the selected item.** Search prefers a purchasable demo SKU for automatic policy evaluation. Selecting a comparison-only result clears the old policy result, and stale async evaluations cannot overwrite a newer selection.
- **Audit wording is scoped accurately.** Product copy calls this a session-scoped event timeline. It is not cryptographically tamper-evident.
- **Submission materials added.** `docs/DEMO_SCRIPT.md` includes a timed under-three-minute walkthrough and requirement checklist; `docs/DEVPOST_DESCRIPTION.md` contains draft submission copy and tool disclosures.

### Remaining submission work

- No Git remote is configured in this checkout. Publish the repository publicly and confirm the MIT license is visible at its root.
- Configure Gemini and matching PayPal Sandbox credentials for the judging walkthrough; local simulation is not the PayPal integration demonstration.
- Deploy the hosted demo or verify clean-clone instructions, then record and publish the required YouTube demo under three minutes.

Follow-up verification: the backend suite passes **20/20**, the frontend production build succeeds, and `git diff --check` reports no whitespace errors. Pytest emits one existing Starlette deprecation warning for its `httpx` test-client integration.
