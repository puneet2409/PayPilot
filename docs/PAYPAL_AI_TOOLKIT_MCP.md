# PayPal AI Toolkit & Sandbox MCP Server Setup

> **Developer Context & Model Context Protocol (MCP) Integration**  
> *Connecting AI Coding Agents (Claude Code, Cursor, VS Code) directly to PayPal Sandbox APIs*

---

## 1. Overview

The **PayPal AI Toolkit** (`github.com/paypal/ai-toolkit`) exposes a Model Context Protocol (MCP) server that empowers LLM environments to interact with PayPal Sandbox APIs directly. Rather than relying on static prompt guidelines, coding agents use real-time tool calling to verify API schemas, manage sandbox accounts, inspect errors, and trigger test transactions.

---

## 2. Multi-Step MCP Credentials Provisioning Pipeline

To configure the PayPal Sandbox MCP Server in your coding agent environment (e.g., Claude Code, Cursor, or VS Code):

### Step 1: Generate Access Token
Execute an OAuth 2.0 client credentials request against `/v1/oauth2/token` using your Sandbox Client ID and Secret:
```bash
curl -v -X POST "https://api-m.sandbox.paypal.com/v1/oauth2/token" \
  -u "<PAYPAL_CLIENT_ID>:<PAYPAL_CLIENT_SECRET>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials"
```
Copy the returned `access_token` string.

### Step 2: Inject Token into Agent Configuration
Open your agent's configuration file (e.g., `.cursor/settings.json`, Claude Code settings, or global MCP settings) and insert the token under the exact key `PayPal sandbox access token`:
```json
{
  "env": {
    "PayPal sandbox access token": "A21AAI_ExampleBearerTokenString_q9X2kL8mP0vW"
  }
}
```

### Step 3: Perform Full Application Restart
> ⚠️ **Developer Gotcha:** Issuing a `/clear` command within the agent terminal only clears local chat history; it **does not** reload environment variables. A complete application restart is strictly required to initialize the MCP server connection.

### Step 4: Token Expiration Lifecycle
Sandbox Bearer access tokens have a standard valid lifetime of **9 hours (32,400 seconds)**. When a token expires, the MCP server returns HTTP `401 Unauthorized`. To refresh without manually editing configuration files, run `/paypal setup refresh`.

---

## 3. Operational Slash Commands Reference

The PayPal AI Toolkit provides specialized slash commands to accelerate integration workflows:

| Slash Command | Operational Purpose |
|---|---|
| `/paypal setup` | Configures MCP plugin parameters, verifies environment credentials, and establishes tool connections. |
| `/paypal setup refresh` | Re-executes the client credentials exchange and updates the active access token when the 9-hour lifetime expires. |
| `/paypal sandbox` | Automates localized sandbox testing scenarios across billing operations, webhooks, and payment flows. |
| `/paypal doctor` | Scans developer codebases for integration anti-patterns, misconfigured API schemas, or missing error handles, offering automated refactoring. |
| `/paypal test-accounts` | Generates and manages sandbox merchant, customer, and credit card test profiles. |
| `/paypal explain-error` | Interprets raw PayPal API error response codes, failure payloads, and HTTP status messages, returning human-readable developer diagnostic summaries and corrective code fixes. |

---

## 4. APIMatic Context Plugins Integration

Benchmarking demonstrates that pairing the PayPal AI Toolkit with **APIMatic Context Plugins** produces production-grade integration code up to **50x cheaper** than unguided state-of-the-art LLMs by:
1. Injecting verified OpenAPI 3.1 schema rules into the prompt context.
2. Eliminating context window bloat and syntax errors.
3. Automatically generating mandatory retry logic and idempotency headers (`PayPal-Request-Id`).
