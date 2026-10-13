export interface OfferItem {
  merchant: string;
  price: number;
  currency: string;
  availability: string;
  buy_url: string;
  observed_at: string;
}

export interface ProductItem {
  product_id: string;
  title: string;
  brand?: string;
  source: string;
  offers: OfferItem[];
  attributes: Record<string, any>;
  image_url?: string;
  demo_sku?: string;
}

export interface RankedCandidate {
  product_id: string;
  title: string;
  brand?: string;
  price: number;
  currency: string;
  rank: number;
  score: number;
  explanation: string;
  verified_features: string[];
  unverified_features: string[];
  within_budget?: boolean;
  buy_url?: string;
  merchant?: string;
  image_url?: string;
  demo_sku?: string;
}

export interface AgentIntent {
  category?: string;
  budget?: number;
  currency: string;
  must_have: string[];
  preferences: string[];
  avoid: string[];
}

export interface AgentTurnResponse {
  session_id: string;
  reply_text: string;
  intent?: AgentIntent;
  recommendations: RankedCandidate[];
  requires_clarification: boolean;
  clarification_question?: string;
}

export interface PolicyCheckItem {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface QuoteSummary {
  id: string;
  amount: number;
  currency: string;
  expires_at: string;
}

export interface PolicyEvaluateResponse {
  eligible: boolean;
  policy_version: string;
  currency: string;
  max_total: number;
  item_price: number;
  sku: string;
  item_title: string;
  checks: PolicyCheckItem[];
  quote?: QuoteSummary;
  reason?: string;
}

export interface CheckoutCreateResponse {
  order_id: string;
  paypal_order_id: string;
  status: string;
  amount: number;
  currency: string;
}

export interface CheckoutCaptureResponse {
  order_id: string;
  status: string;
  payment: {
    provider: string;
    capture_id: string;
    amount: number;
    currency: string;
  };
}

export interface AuditTimelineEvent {
  id: string;
  event_type: string;
  details: Record<string, any>;
  created_at: string;
}
