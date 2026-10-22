import type {
  AgentTurnResponse,
  PolicyEvaluateResponse,
  CheckoutCreateResponse,
  CheckoutCaptureResponse,
  AuditTimelineEvent,
  AuthSession,
  OrderSummaryItem
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

async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  let session = await api.getOrCreateSession();
  let headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
    Authorization: `Bearer ${session.access_token}`,
  };
  const signal = options.signal || AbortSignal.timeout(15_000);

  let res = await fetch(url, { ...options, headers, signal });
  if (res.status === 401) {
    // Stale or invalidated token. Clear and retry once with a brand new session.
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    session = await api.getOrCreateSession(true);
    headers = {
      ...((options.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${session.access_token}`,
    };
    const updatedUrl = url.replace(/sessions\/sess_[a-f0-9]+/, `sessions/${session.session_id}`);
    res = await fetch(updatedUrl, { ...options, headers, signal });
  }
  return res;
}

export const api = {
  async getHealth(): Promise<{ paypal_configured?: boolean; channel3_configured?: boolean; ai_provider?: string }> {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getOrCreateSession(forceNew = false): Promise<AuthSession> {
    if (!forceNew) {
      const saved = getSavedSession();
      if (saved) return saved;
    }
    if (pendingSession) return pendingSession;

    pendingSession = (async () => {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
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
    const res = await fetchWithAuth(`${API_BASE}/api/v1/agent/sessions/${sessionId}/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetchWithAuth(`${API_BASE}/api/v1/policies/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetchWithAuth(`${API_BASE}/api/v1/checkout/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    idempotencyKey?: string,
    simulatePriceDrift = false
  ): Promise<CheckoutCaptureResponse> {
    const res = await fetchWithAuth(`${API_BASE}/api/v1/checkout/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotency_key: idempotencyKey, simulate_price_drift: simulatePriceDrift })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Checkout capture failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getSessionTimeline(sessionId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetchWithAuth(`${API_BASE}/api/v1/sessions/${sessionId}/timeline`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  },

  async getOrderTimeline(orderId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetchWithAuth(`${API_BASE}/api/v1/orders/${orderId}/timeline`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  },

  async getSessionOrders(sessionId: string): Promise<OrderSummaryItem[]> {
    const res = await fetchWithAuth(`${API_BASE}/api/v1/sessions/${sessionId}/orders`);
    if (!res.ok) return [];
    return res.json();
  },

  async cancelOrder(orderId: string): Promise<{ order_id: string; status: string }> {
    const res = await fetchWithAuth(`${API_BASE}/api/v1/orders/${orderId}/cancel`, {
      method: 'POST'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Order cancellation failed: ${res.statusText}`);
    }
    return res.json();
  }
};
