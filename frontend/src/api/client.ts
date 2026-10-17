import type {
  AgentTurnResponse,
  PolicyEvaluateResponse,
  CheckoutCreateResponse,
  CheckoutCaptureResponse,
  AuditTimelineEvent,
  AuthSession
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SESSION_STORAGE_KEY = 'paypilot.auth-session.v1';
let pendingSession: Promise<AuthSession> | null = null;

function getSavedSession(): AuthSession | null {
  try {
    const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!saved) return null;
    const session = JSON.parse(saved) as AuthSession;
    return session.expires_at * 1000 > Date.now() + 30_000 ? session : null;
  } catch {
    return null;
  }
}

function authHeaders(json = false): Record<string, string> {
  const session = getSavedSession();
  if (!session) throw new Error('Your secure session expired. Reload the page to start a new session.');
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    Authorization: `Bearer ${session.access_token}`,
  };
}

export const api = {
  async getHealth(): Promise<{ paypal_configured?: boolean }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getOrCreateSession(): Promise<AuthSession> {
    const saved = getSavedSession();
    if (saved) return saved;
    if (pendingSession) return pendingSession;

    pendingSession = (async () => {
      const res = await fetch(`${API_BASE}/api/v1/sessions`, { method: 'POST' });
      if (!res.ok) throw new Error(`Could not create a secure session: ${res.statusText}`);
      const session = (await res.json()) as AuthSession;
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
      return session;
    })();

    try {
      return await pendingSession;
    } finally {
      pendingSession = null;
    }
  },

  async sendAgentTurn(
    sessionId: string,
    message: string,
    userBudget?: number
  ): Promise<AgentTurnResponse> {
    const res = await fetch(`${API_BASE}/api/v1/agent/sessions/${sessionId}/turn`, {
      method: 'POST',
      headers: { ...authHeaders(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user_budget: userBudget })
    });
    if (!res.ok) throw new Error(`Agent request failed: ${res.statusText}`);
    return res.json();
  },

  async evaluatePolicy(
    sessionId: string,
    demoSku: string,
    maxTotal: number,
    requiredFeatures: string[] = [],
    excludedTerms: string[] = []
  ): Promise<PolicyEvaluateResponse> {
    const res = await fetch(`${API_BASE}/api/v1/policies/evaluate`, {
      method: 'POST',
      headers: { ...authHeaders(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        demo_sku: demoSku,
        max_total: maxTotal,
        required_features: requiredFeatures,
        excluded_terms: excludedTerms
      })
    });
    if (!res.ok) throw new Error(`Policy evaluation failed: ${res.statusText}`);
    return res.json();
  },

  async createCheckout(
    quoteId: string,
    sessionId: string,
    idempotencyKey?: string
  ): Promise<CheckoutCreateResponse> {
    const res = await fetch(`${API_BASE}/api/v1/checkout/create`, {
      method: 'POST',
      headers: { ...authHeaders(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({ quote_id: quoteId, session_id: sessionId, idempotency_key: idempotencyKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Checkout creation failed: ${res.statusText}`);
    }
    return res.json();
  },

  async captureCheckout(
    orderId: string,
    idempotencyKey?: string
  ): Promise<CheckoutCaptureResponse> {
    const res = await fetch(`${API_BASE}/api/v1/checkout/${orderId}/capture`, {
      method: 'POST',
      headers: { ...authHeaders(true), 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotency_key: idempotencyKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Checkout capture failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getSessionTimeline(sessionId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/timeline`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  },

  async getOrderTimeline(orderId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetch(`${API_BASE}/api/v1/orders/${orderId}/timeline`, { headers: authHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  }
};
