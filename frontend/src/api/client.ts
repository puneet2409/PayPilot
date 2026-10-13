import type {
  AgentTurnResponse,
  PolicyEvaluateResponse,
  CheckoutCreateResponse,
  CheckoutCaptureResponse,
  AuditTimelineEvent
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export const api = {
  async sendAgentTurn(
    sessionId: string,
    message: string,
    userBudget?: number
  ): Promise<AgentTurnResponse> {
    const res = await fetch(`${API_BASE}/api/v1/agent/sessions/${sessionId}/turn`, {
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
    const res = await fetch(`${API_BASE}/api/v1/policies/evaluate`, {
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
    const res = await fetch(`${API_BASE}/api/v1/checkout/create`, {
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
    idempotencyKey?: string
  ): Promise<CheckoutCaptureResponse> {
    const res = await fetch(`${API_BASE}/api/v1/checkout/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idempotency_key: idempotencyKey })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || `Checkout capture failed: ${res.statusText}`);
    }
    return res.json();
  },

  async getSessionTimeline(sessionId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetch(`${API_BASE}/api/v1/sessions/${sessionId}/timeline`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  },

  async getOrderTimeline(orderId: string): Promise<AuditTimelineEvent[]> {
    const res = await fetch(`${API_BASE}/api/v1/orders/${orderId}/timeline`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.events || [];
  }
};
