# PayPilot — Devpost Submission Draft

## Short description

PayPilot turns a natural-language shopping request into evidence-ranked product options, checks a server-priced demo-store item against deterministic purchase rules, and routes an eligible quote through buyer-approved PayPal Sandbox checkout.

## What it does

People can delegate product research to AI, but they still need clear control over price, required features, and payment approval. PayPilot makes those boundaries visible: Gemini extracts the shopping intent, Channel3 supplies live retailer comparisons when configured, and deterministic server code decides whether a PayPilot demo-store item can receive a quote. The buyer then approves the PayPal Sandbox order before capture. The model cannot set the checkout price, waive a rule, or authorize payment.

The interface shows the parsed shopping brief, evidence and source for each result, policy checks, quote amount, checkout mode, and a session-scoped event timeline. Live retailer offers are labelled as comparisons; PayPilot demo-store items are separately labelled because they are the products purchasable in this prototype. If PayPal credentials are absent, the app clearly labels its local simulation and does not claim that PayPal moved funds.

## Tools and how they are used

- **Google Gemini** extracts category, budget, required features, preferences, and exclusions from a shopper's message. A deterministic parser is shown as a fallback.
- **Channel3** provides live external product and retailer-offer discovery when an API key is configured. A bundled PayPilot demo catalogue keeps the local checkout walkthrough available when live results cannot map to a demo SKU.
- **PayPal Developer Platform** uses Orders v2 REST APIs and the PayPal JavaScript SDK for server-created Sandbox orders, buyer approval, capture, and verification.
- **FastAPI, React, and Render** provide the API, interactive product experience, and deployment blueprint.

## Demo and source links

- Public source repository: _Add the public repository URL before submission._
- Hosted demo: _Add the hosted demo URL, or link to the repository's clean-clone setup instructions._
- Demo video: _Add a public YouTube link to a video under 3 minutes._

The repository includes the MIT license, setup guide, demo walkthrough, and API contracts. The judging walkthrough should use real PayPal Sandbox credentials and a configured Gemini key; local simulation and the rules fallback are for development and resilience.
