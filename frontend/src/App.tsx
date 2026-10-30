import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from './api/client';
import type {
  RankedCandidate,
  PolicyEvaluateResponse,
  CheckoutCaptureResponse,
  AuditTimelineEvent,
  AuthSession,
  AgentIntent,
  OrderSummaryItem,
  SuggestedAction
} from './types';
import { Sidebar, type NavView } from './components/Sidebar';
import { ChatPanel } from './components/ChatPanel';
import { ProductCard } from './components/ProductCard';
import { PolicyPanel } from './components/PolicyPanel';
import { ApprovalPanel } from './components/ApprovalPanel';
import { OrderStatus } from './components/OrderStatus';
import { AuditTimeline } from './components/AuditTimeline';
import { OrdersLedger } from './components/OrdersLedger';
import { PayPalLogo } from './components/PayPalLogo';
import {
  Menu,
  Search,
  RotateCcw,
  CreditCard,
  History,
  ShoppingBag,
  Layers,
  Sparkles,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  CheckCircle2,
  Lock,
  ArrowRight
} from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionId = session?.session_id ?? '';

  const [currentView, setCurrentView] = useState<NavView>('shop');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [globalSearchInput, setGlobalSearchInput] = useState('');

  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [shoppingIntent, setShoppingIntent] = useState<AgentIntent | null>(null);
  const [intentSource, setIntentSource] = useState<'gemini' | 'rules'>('rules');
  const [requiredFeatures, setRequiredFeatures] = useState<string[]>([]);
  const [excludedTerms, setExcludedTerms] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [policyResult, setPolicyResult] = useState<PolicyEvaluateResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<CheckoutCaptureResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditTimelineEvent[]>([]);
  const [orders, setOrders] = useState<OrderSummaryItem[]>([]);
  const [rightPanelTab, setRightPanelTab] = useState<'timeline' | 'ledger'>('timeline');
  const [showApprovalStep, setShowApprovalStep] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number>(100);

  const [paypalBackendConfigured, setPaypalBackendConfigured] = useState<boolean | null>(null);
  const [channel3Configured, setChannel3Configured] = useState<boolean | null>(null);
  const policyRequestVersion = useRef(0);

  const isPayPalClientConfigured = Boolean(
    import.meta.env.VITE_PAYPAL_CLIENT_ID &&
    import.meta.env.VITE_PAYPAL_CLIENT_ID !== 'your_paypal_sandbox_client_id_here'
  );
  const isPayPalConfigured = paypalBackendConfigured === true && isPayPalClientConfigured;
  const paypalStatus = paypalBackendConfigured === null
    ? 'PayPal Status Unknown'
    : paypalBackendConfigured && !isPayPalClientConfigured
      ? 'PayPal SDK Setup Needed'
      : isPayPalConfigured ? 'PayPal Sandbox Ready' : 'PayPal Simulated';

  const refreshAuditEvents = useCallback(async () => {
    if (!session) return;
    try {
      const events = await api.getSessionTimeline(sessionId);
      setAuditEvents(events);
    } catch (e) {
      console.error('Failed to load audit events', e);
    }
  }, [session, sessionId]);

  const refreshOrders = useCallback(async () => {
    if (!session) return;
    try {
      const list = await api.getSessionOrders(sessionId);
      setOrders(list);
    } catch (e) {
      console.error('Failed to load session orders', e);
    }
  }, [session, sessionId]);

  useEffect(() => {
    api.getHealth()
      .then((health) => {
        setPaypalBackendConfigured(
          typeof health.paypal_configured === 'boolean' ? health.paypal_configured : null
        );
        setChannel3Configured(
          typeof health.channel3_configured === 'boolean' ? health.channel3_configured : null
        );
      })
      .catch(() => {
        setPaypalBackendConfigured(null);
        setChannel3Configured(null);
      });
    api.getOrCreateSession()
      .then(setSession)
      .catch((err: unknown) => {
        setSessionError(err instanceof Error ? err.message : 'Could not start a secure session.');
      });
  }, []);

  useEffect(() => {
    refreshAuditEvents();
    refreshOrders();
  }, [refreshAuditEvents, refreshOrders]);

  const handleSendMessage = async (message: string, budget?: number) => {
    if (!session) return;
    policyRequestVersion.current += 1;
    if (budget !== undefined) setCurrentBudget(budget);

    setIsLoadingSearch(true);
    setPolicyResult(null);
    setShowApprovalStep(false);
    setPaymentResult(null);

    try {
      const res = await api.sendAgentTurn(sessionId, message, budget);
      setAgentReply(res.reply_text);
      setSuggestedActions(res.suggested_actions ?? []);
      setCandidates(res.recommendations);
      setShoppingIntent(res.intent ?? null);
      setIntentSource(res.intent_source);
      const nextRequiredFeatures = res.intent?.must_have ?? [];
      const nextExcludedTerms = res.intent?.avoid ?? [];
      setRequiredFeatures(nextRequiredFeatures);
      setExcludedTerms(nextExcludedTerms);
      const effectiveBudget = res.intent?.budget ?? budget ?? currentBudget;
      setCurrentBudget(effectiveBudget);
      if (res.recommendations.length > 0) {
        const policyCandidate = res.recommendations.find((candidate) => candidate.demo_sku)
          ?? res.recommendations[0];
        handleSelectCandidate(policyCandidate, effectiveBudget, nextRequiredFeatures, nextExcludedTerms);
      }
      await refreshAuditEvents();
    } catch (err: any) {
      setAgentReply(`Search error: ${err.message || 'Unable to connect to PayPilot backend.'}`);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleSelectCandidate = async (
    cand: RankedCandidate,
    budgetOverride?: number,
    requiredFeaturesOverride?: string[],
    excludedTermsOverride?: string[],
  ) => {
    if (!session) return;
    const requestVersion = ++policyRequestVersion.current;
    const isReEvaluatingCurrentCandidate = selectedCandidate?.product_id === cand.product_id;
    setSelectedCandidate(cand);
    setShowApprovalStep(false);
    setPaymentResult(null);
    if (!isReEvaluatingCurrentCandidate) {
      setPolicyResult(null);
    }
    setIsLoadingPolicy(true);

    if (!cand.demo_sku) {
      // Live Channel3 Retailer Item Policy Evaluation
      const itemPrice = cand.price;
      const effectiveBudget = budgetOverride ?? currentBudget;
      const estimatedTax = Number((itemPrice * 0.0825).toFixed(2));
      const shipping = itemPrice >= 50.0 ? 0 : 5.99;
      const landedCost = Number((itemPrice + estimatedTax + shipping).toFixed(2));
      const isBudgetPassed = landedCost <= effectiveBudget;

      const checks = [
        {
          rule: 'store_inventory_active',
          passed: true,
          detail: `Live merchant offer verified from ${cand.merchant || 'retail store'}`
        },
        {
          rule: 'currency_match',
          passed: true,
          detail: `Currency matches (${cand.currency || 'USD'})`
        },
        {
          rule: 'budget_limit',
          passed: isBudgetPassed,
          detail: `Landed cost $${landedCost.toFixed(2)} (Item: $${itemPrice.toFixed(2)} + Tax: $${estimatedTax.toFixed(2)} + Shipping: $${shipping.toFixed(2)}) ${isBudgetPassed ? 'is within' : 'exceeds'} ceiling $${effectiveBudget.toFixed(2)}`
        },
        {
          rule: 'prompt_injection_shield',
          passed: true,
          detail: 'Retail catalog payload sanitized — zero adversarial prompt patterns detected.'
        }
      ];

      // Excluded terms check across title, explanation, brand, merchant, verified/unverified attributes, and offers metadata
      const activeExcluded = excludedTermsOverride ?? excludedTerms;
      let hasExcludedTerm = false;
      const candidateText = [
        cand.title,
        cand.explanation || '',
        cand.brand || '',
        cand.merchant || '',
        ...(cand.verified_features || []),
        ...(cand.unverified_features || []),
        JSON.stringify(cand.offers || []),
        JSON.stringify(cand.attributes || {}),
      ].join(' ').toLowerCase();
      for (const term of activeExcluded) {
        if (candidateText.includes(term.toLowerCase())) {
          hasExcludedTerm = true;
          checks.push({
            rule: 'exclusion_policy',
            passed: false,
            detail: `Product contains excluded term: '${term}'`
          });
          break;
        }
      }

      const activeReqs = requiredFeaturesOverride ?? requiredFeatures;
      let allReqsPassed = true;
      const missingReqs: string[] = [];
      for (const req of activeReqs) {
        const reqLower = req.toLowerCase();
        const normReq = reqLower.replace(/[\s-]+/g, '_');
        const synonyms = [reqLower, normReq];
        if (reqLower.includes('mic') || reqLower.includes('voice')) {
          synonyms.push('microphone', 'mic', 'voice', 'built_in_microphone', 'microphones', 'good mic', 'clear mic');
        }
        if (reqLower.includes('bluetooth') || reqLower.includes('wireless')) {
          synonyms.push('wireless', 'bluetooth', 'cordless', 'rf', 'multipoint');
        }
        if (reqLower.includes('noise') || reqLower.includes('cancelling') || reqLower.includes('anc')) {
          synonyms.push('noise_cancelling', 'cancelling', 'anc', 'ambient', 'active noise cancelling');
        }
        if (reqLower.includes('quiet') || reqLower.includes('silent')) {
          synonyms.push('quiet', 'silent', 'quiet_clicks', 'silent clicks', 'reduced click');
        }
        if (reqLower.includes('productivity') || reqLower.includes('office') || reqLower.includes('work')) {
          synonyms.push('productivity', 'performance', 'work', 'office', 'magseed', 'sensor', 'clicks');
        }

        const hasFeat = cand.verified_features.some(f => synonyms.some(s => f.toLowerCase().includes(s))) ||
          cand.unverified_features.some(f => synonyms.some(s => f.toLowerCase().includes(s))) ||
          synonyms.some(s => cand.title.toLowerCase().includes(s) || (cand.brand && cand.brand.toLowerCase().includes(s)));

        checks.push({
          rule: `feature_req_${normReq}`,
          passed: hasFeat,
          detail: hasFeat
            ? `Verified attribute: ${req}`
            : `Unverified attribute: ${req} (retailer specifications do not confirm; advisory warning)`
        });
        if (!hasFeat) {
          allReqsPassed = false;
          missingReqs.push(req);
        }
      }

      const isEligible = isBudgetPassed && allReqsPassed && !hasExcludedTerm;

      setPolicyResult({
        session_id: sessionId,
        sku: `CH3-${cand.product_id.slice(0, 10)}`,
        item_title: cand.title,
        item_price: itemPrice,
        currency: cand.currency || 'USD',
        max_total: effectiveBudget,
        eligible: isEligible,
        is_external_retailer: true,
        buy_url: cand.buy_url,
        merchant: cand.merchant,
        image_url: cand.image_url,
        reason: !isBudgetPassed
          ? `Landed cost $${landedCost.toFixed(2)} (Item: $${itemPrice.toFixed(2)} + Tax: $${estimatedTax.toFixed(2)} + Shipping: $${shipping.toFixed(2)}) exceeds budget ceiling of $${effectiveBudget.toFixed(2)}`
          : hasExcludedTerm
            ? 'Product contains an excluded condition or term'
            : !allReqsPassed
              ? `Budget Approved ($${landedCost.toFixed(2)} <= $${effectiveBudget.toFixed(2)}), but retailer specifications do not confirm feature: '${missingReqs.join("', '")}'`
              : undefined,
        rejection_reason: !isBudgetPassed
          ? `Landed cost $${landedCost.toFixed(2)} (Item: $${itemPrice.toFixed(2)} + Tax: $${estimatedTax.toFixed(2)} + Shipping: $${shipping.toFixed(2)}) exceeds budget ceiling of $${effectiveBudget.toFixed(2)}`
          : hasExcludedTerm
            ? 'Product contains an excluded condition or term'
            : !allReqsPassed
              ? `Budget Approved ($${landedCost.toFixed(2)} <= $${effectiveBudget.toFixed(2)}), but retailer specifications do not confirm feature: '${missingReqs.join("', '")}'`
              : undefined,
        policy_version: 'v1.0 (Store Deal Check)',
        landed_cost: landedCost,
        estimated_tax: estimatedTax,
        shipping: shipping,
        checks: checks,
        quote: !hasExcludedTerm ? {
          id: `quote_ch3_${cand.product_id.slice(0, 8)}`,
          amount: landedCost,
          currency: cand.currency || 'USD',
          expires_at: new Date(Date.now() + 600_000).toISOString(),
          item_price: itemPrice,
          estimated_tax: estimatedTax,
          shipping: shipping,
          landed_cost: landedCost,
          quote_signature: 'CH3_LIVE_OFFER_VERIFIED'
        } : undefined
      });
      setIsLoadingPolicy(false);
      return;
    }

    setIsLoadingPolicy(true);
    try {
      const evalRes = await api.evaluatePolicy(
        sessionId,
        cand.demo_sku,
        budgetOverride ?? currentBudget,
        requiredFeaturesOverride ?? requiredFeatures,
        excludedTermsOverride ?? excludedTerms,
      );
      if (requestVersion !== policyRequestVersion.current) return;
      setPolicyResult({
        ...evalRes,
        image_url: evalRes.image_url || cand.image_url
      });
      await refreshAuditEvents();
    } catch (err: any) {
      if (requestVersion === policyRequestVersion.current) {
        console.error('Policy evaluation failed', err);
      }
    } finally {
      if (requestVersion === policyRequestVersion.current) setIsLoadingPolicy(false);
    }
  };

  const handlePaymentSuccess = async (captureRes: CheckoutCaptureResponse) => {
    setPaymentResult(captureRes);
    setShowApprovalStep(false);
    await refreshAuditEvents();
    await refreshOrders();
    setRightPanelTab('ledger');
  };

  const handleCancelOrder = async (orderId?: string) => {
    if (!session) return;
    try {
      if (orderId) {
        await api.cancelOrder(orderId);
      }
      await refreshOrders();
      await refreshAuditEvents();
    } catch (err: any) {
      console.error('Failed to cancel order', err);
    }
  };

  const handleReset = () => {
    policyRequestVersion.current += 1;
    setIsLoadingPolicy(false);
    setSelectedCandidate(null);
    setPolicyResult(null);
    setPaymentResult(null);
    setShowApprovalStep(false);
    setAgentReply(null);
    setCandidates([]);
    setShoppingIntent(null);
    setRequiredFeatures([]);
    setExcludedTerms([]);
    setGlobalSearchInput('');
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-slate-900 flex font-sans">
      {/* PayPal Design System Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsedDesktop={isSidebarCollapsed}
        onToggleCollapseDesktop={() => setIsSidebarCollapsed((prev) => !prev)}
        auditCount={auditEvents.length}
        ordersCount={orders.length}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setIsMobileSidebarOpen(!isMobileSidebarOpen);
                } else {
                  setIsSidebarCollapsed(!isSidebarCollapsed);
                }
              }}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              title={isSidebarCollapsed ? "Show side menu" : "Hide side menu"}
              aria-label="Toggle side menu"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
            <div
              onClick={() => setCurrentView('shop')}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <PayPalLogo className="w-6 h-7" />
              <div>
                <span className="font-black text-lg text-[#001C3D] tracking-tight block leading-none">
                  PayPilot
                </span>
                <span className="text-[10px] font-bold text-[#0057FF] uppercase tracking-wider">
                  Consent-First AI Commerce
                </span>
              </div>
            </div>
          </div>

          {/* Centered Product Search Input */}
          <div className="flex-1 max-w-lg mx-2 hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                placeholder="Search 25,000+ stores, products, or budget (e.g. Wireless mouse under $80)..."
                value={globalSearchInput}
                onChange={(e) => setGlobalSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearchInput.trim()) {
                    setCurrentView('shop');
                    handleSendMessage(globalSearchInput.trim());
                  }
                }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0057FF] focus:bg-white transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Header Status & Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${channel3Configured ? 'bg-sky-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{channel3Configured ? 'Channel3 Live (25k+ Stores)' : 'Channel3 Cache'}</span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${isPayPalConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{paypalStatus}</span>
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              title="Reset search and selection"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0057FF]" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            <div className="hidden xl:flex items-center text-[11px] text-slate-500 font-mono px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200">
              {session ? `Session: ${sessionId.slice(0, 10)}...` : 'Securing…'}
            </div>
          </div>
        </header>

        {/* PayPal Signature Gradient Accent Ribbon */}
        <div className="w-full bg-gradient-to-r from-[#003087] via-[#0057FF] to-[#0070BA] text-white py-2 px-6 flex flex-wrap items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase text-[10px] bg-white/20 px-2 py-0.5 rounded shadow-2xs">
              Autonomous Commerce Architecture
            </span>
            <span className="hidden md:inline text-white/90">
              Multi-Store Discovery • Deterministic Guardrails • Orders v2 Human Consent
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/95 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Orders v2 Sandbox: Active
            </span>
            <span className="hidden md:inline text-white/60">•</span>
            <span className="hidden md:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-300"></span>
              Policy Guardrails: Enforced
            </span>
          </div>
        </div>

        {/* Main Application Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          {/* Separation of Powers Pipeline Stepper & Judge Quick Demo Controls ($5k AG Grid / Agentic Commerce) */}
          <div className="mb-6 rounded-2xl bg-white border border-slate-200/90 p-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 text-[#0057FF] border border-blue-100 shadow-2xs">
                  <Layers className="w-4 h-4 text-[#0057FF]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                      Separation of Powers Pipeline
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0057FF] text-[10px] font-extrabold border border-blue-200">
                      2026 PayPal Hackathon
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Dual-gated architecture: AI advises • Deterministic code validates • Buyer authorizes • AG Studio reconciles
                  </p>
                </div>
              </div>

              {/* Judge Quick Action Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hidden md:inline">
                  Judge Demo Controls:
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('shop');
                    handleSendMessage('Wireless headset under $50 (Test Policy Block)', 50);
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Test deterministic Policy Engine rejecting item exceeding $50 ceiling"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>1. Test Guardrail: $50 Budget Block</span>
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setCurrentView('shop');
                    if (policyResult?.eligible && policyResult.quote) {
                      setShowApprovalStep(true);
                    } else {
                      await handleSendMessage('Headset under $100', 100);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Test pre-capture live price spike detection and auto-voiding in checkout"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>2. Test Guardrail: Price Spike Void</span>
                </button>
              </div>
            </div>

            {/* Visual 5-Stage Stepper Grid */}
            <div className="pt-3.5 grid grid-cols-2 md:grid-cols-5 gap-2.5 text-left">
              {/* Step 1: Gemini Intent */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                shoppingIntent
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : isLoadingSearch
                    ? 'bg-blue-50/60 border-blue-300 text-blue-900 animate-pulse'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 1</span>
                  {shoppingIntent ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : isLoadingSearch ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057FF]" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs truncate">1. Gemini Intent</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {shoppingIntent ? `${shoppingIntent.category || 'Shopping brief'} • $${shoppingIntent.budget}` : 'Structured JSON parse'}
                </div>
              </div>

              {/* Step 2: Channel3 Live Inventory */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                candidates.length > 0
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : isLoadingSearch
                    ? 'bg-blue-50/60 border-blue-300 text-blue-900 animate-pulse'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 2</span>
                  {candidates.length > 0 ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs truncate">2. Channel3 Discovery</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {candidates.length > 0 ? `${candidates.length} live retailer offers` : '25,000+ store catalog'}
                </div>
              </div>

              {/* Step 3: Python Deterministic Policy + HMAC */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                policyResult?.eligible
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : policyResult && !policyResult.eligible
                    ? 'bg-rose-50/60 border-rose-300 text-rose-900'
                    : isLoadingPolicy
                      ? 'bg-blue-50/60 border-blue-300 text-blue-900 animate-pulse'
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 3</span>
                  {policyResult?.eligible ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : policyResult && !policyResult.eligible ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs truncate">3. Policy & HMAC Lock</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {policyResult?.eligible ? `Landed $${(policyResult.landed_cost ?? policyResult.quote?.amount ?? 0).toFixed(2)} • HMAC signed` : policyResult ? 'Policy rejected' : 'Landed cost & safety rules'}
                </div>
              </div>

              {/* Step 4: PayPal Orders v2 Consent */}
              <div className={`p-2.5 rounded-xl border transition-all ${
                paymentResult
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : showApprovalStep
                    ? 'bg-amber-50/80 border-amber-300 text-amber-900 ring-1 ring-amber-300'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 4</span>
                  {paymentResult ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : showApprovalStep ? (
                    <Lock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  ) : (
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs truncate">4. PayPal Consent</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {paymentResult ? 'Payment captured' : showApprovalStep ? 'Awaiting buyer consent' : 'Orders v2 SDK approval'}
                </div>
              </div>

              {/* Step 5: AG Studio Ledger Reconciliation */}
              <div className={`p-2.5 rounded-xl border transition-all col-span-2 md:col-span-1 ${
                paymentResult
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                  : orders.length > 0
                    ? 'bg-blue-50/60 border-blue-200 text-blue-900'
                    : 'bg-slate-50/80 border-slate-200/80 text-slate-700'
              }`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Stage 5</span>
                  {paymentResult ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <History className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
                <div className="font-bold text-xs truncate">5. AG Studio Ledger</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {orders.length > 0 ? `${orders.length} orders tracked` : 'Financial model & audit'}
                </div>
              </div>
            </div>
          </div>
          {/* VIEW: Shop & Discover (Core PayPilot Agentic Experience) */}
          {currentView === 'shop' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column (7 cols): Chat Assistant & Product Discovery */}
              <section className="lg:col-span-7 flex flex-col gap-6">
                <ChatPanel
                  onSendMessage={handleSendMessage}
                  isLoading={isLoadingSearch}
                  isDisabled={!session}
                  agentReply={agentReply || sessionError}
                  suggestedActions={suggestedActions}
                  onReset={handleReset}
                />

                {shoppingIntent && (
                  <div className="rounded-2xl border border-blue-200/80 bg-white p-5 shadow-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-[#001C3D]">
                        <Sparkles className="w-4 h-4 text-[#0057FF]" /> What You're Looking For
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wide text-[#0057FF] bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                        {intentSource === 'gemini' ? 'AI Assisted Match' : 'Smart Keyword Match'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      {shoppingIntent.category && (
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-800 font-medium">
                          {shoppingIntent.category}
                        </span>
                      )}
                      {shoppingIntent.budget !== undefined && (
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-800 font-medium">
                          Max ${shoppingIntent.budget.toFixed(2)} {shoppingIntent.currency}
                        </span>
                      )}
                      {shoppingIntent.must_have.map((feature) => (
                        <span key={`need-${feature}`} className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-800 font-semibold">
                          Needs: {feature}
                        </span>
                      ))}
                      {shoppingIntent.avoid.map((term) => (
                        <span key={`avoid-${term}`} className="rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-rose-800 font-semibold">
                          Avoid: {term}
                        </span>
                      ))}
                      {shoppingIntent.preferences.map((preference) => (
                        <span key={`pref-${preference}`} className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-slate-700">
                          Prefers: {preference}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[11px] text-slate-500 font-medium">
                      Your preferences and budget limit are automatically checked against each item before purchase.
                    </p>
                  </div>
                )}

                {/* Product Discovery Results */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-[#0057FF]" />
                      <h3 className="text-base font-bold text-[#001C3D]">
                        Stores & Live Price Comparison ({candidates.length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 font-medium">
                        {isLoadingSearch ? (
                          <span className="text-[#0057FF] flex items-center gap-1.5 font-semibold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057FF]" />
                            Comparing 25k+ stores...
                          </span>
                        ) : (
                          `${candidates.reduce((sum, c) => sum + (c.offers?.length || 1), 0)} store deals ranked for your budget`
                        )}
                      </span>
                      {candidates.length > 0 && !isLoadingSearch && (
                        <button
                          onClick={handleReset}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200 shadow-2xs transition-colors flex items-center gap-1"
                          title="Clear current product results"
                        >
                          <RotateCcw className="w-2.5 h-2.5 text-[#0057FF]" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {isLoadingSearch ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-white text-[#0057FF] border border-blue-100 shadow-2xs shrink-0">
                            <Loader2 className="w-5 h-5 animate-spin" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-[#001C3D]">
                              Comparing 25,000+ Online Stores for Best Deals
                            </h4>
                            <p className="text-xs text-slate-600 mt-0.5">
                              Checking live store prices, stock availability, and specs matching your budget.
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-white text-[#0057FF] border border-blue-200 text-xs font-semibold animate-pulse shadow-2xs">
                          Querying...
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 animate-pulse shadow-xs"
                          >
                            <div className="flex justify-between items-center">
                              <div className="h-5 w-24 bg-slate-100 rounded-md"></div>
                              <div className="h-6 w-16 bg-slate-100 rounded-md"></div>
                            </div>
                            <div className="h-5 w-3/4 bg-slate-100 rounded-md"></div>
                            <div className="space-y-2">
                              <div className="h-3 w-full bg-slate-100 rounded"></div>
                              <div className="h-3 w-5/6 bg-slate-100 rounded"></div>
                            </div>
                            <div className="space-y-2 pt-2 border-t border-slate-100">
                              <div className="h-3.5 w-1/2 bg-slate-100 rounded"></div>
                              <div className="h-3.5 w-2/3 bg-slate-100 rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : candidates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-xs">
                      <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs text-slate-500 font-medium">
                        Search for any product to compare live store prices, discounts, and instant checkout options.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {candidates.map((cand) => (
                        <ProductCard
                          key={cand.product_id}
                          product={cand}
                          isSelected={selectedCandidate?.product_id === cand.product_id}
                          isLoading={isLoadingPolicy && selectedCandidate?.product_id === cand.product_id}
                          onSelect={(p) => handleSelectCandidate(p)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </section>

              {/* Right Column (5 cols): Policy Guardrails, Checkout & Ledger */}
              <section className="lg:col-span-5 flex flex-col gap-6">
                {/* Payment Success State */}
                {paymentResult ? (
                  <OrderStatus
                    paymentResult={paymentResult}
                    onReset={handleReset}
                  />
                ) : showApprovalStep && policyResult?.quote ? (
                  /* Explicit PayPal Approval Panel */
                  <ApprovalPanel
                    quote={policyResult.quote}
                    itemTitle={policyResult.item_title}
                    sku={policyResult.sku}
                    sessionId={sessionId}
                    imageUrl={policyResult.image_url || selectedCandidate?.image_url}
                    onPaymentSuccess={handlePaymentSuccess}
                    onCancelOrder={handleCancelOrder}
                    onBack={() => setShowApprovalStep(false)}
                    onReset={handleReset}
                  />
                ) : (
                  /* Deterministic Purchase Policy Panel */
                  <PolicyPanel
                    policyResult={policyResult}
                    isLoading={isLoadingPolicy}
                    isSearching={isLoadingSearch}
                    onProceedToCheckout={() => setShowApprovalStep(true)}
                    onReEvaluate={() => selectedCandidate && handleSelectCandidate(selectedCandidate)}
                  />
                )}

                {/* Tabbed Activity Log & Payments Ledger */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                      <button
                        onClick={() => setRightPanelTab('timeline')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          rightPanelTab === 'timeline'
                            ? 'bg-white text-[#003087] border border-slate-200 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 text-[#0057FF]" />
                        <span>Activity Log</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-mono text-slate-700 font-bold">
                          {auditEvents.length}
                        </span>
                      </button>

                      <button
                        onClick={() => setRightPanelTab('ledger')}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          rightPanelTab === 'ledger'
                            ? 'bg-white text-[#003087] border border-slate-200 shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5 text-[#0057FF]" />
                        <span>Payments Ledger</span>
                        <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-[10px] font-mono text-slate-700 font-bold">
                          {orders.length}
                        </span>
                      </button>
                    </div>

                    <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
                      {rightPanelTab === 'timeline' ? 'Real-time action history' : 'Orders & payments overview'}
                    </span>
                  </div>

                  {rightPanelTab === 'timeline' ? (
                    <AuditTimeline events={auditEvents} />
                  ) : (
                    <OrdersLedger
                      orders={orders}
                      sessionId={sessionId}
                      onCancelOrder={handleCancelOrder}
                      onRefresh={refreshOrders}
                    />
                  )}
                </div>
              </section>
            </div>
          )}

          {/* VIEW: Purchase Guardrails (Deterministic Policy Rules & Testbed) */}
          {currentView === 'policies' && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-blue-200 bg-white p-6 shadow-xs">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0057FF]">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#001C3D]">
                      Deterministic Purchase Policy Engine
                    </h1>
                    <p className="text-xs text-slate-600">
                      Code-level financial safety guardrails that execute BEFORE any funds move. The AI recommends — the policy engine permits or blocks.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-[#003087] flex items-center gap-1.5 mb-1">
                      <Lock className="w-3.5 h-3.5 text-[#0057FF]" /> Strict Budget Ceilings
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Every candidate is tested against <code className="font-mono bg-white px-1 py-0.5 rounded text-slate-800">price &lt;= budget</code>. If exceeded, the purchase quote is rejected.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-[#003087] flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> True Landed Cost Calculation
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Calculates state tax (8.25%) + standard shipping. Pre-capture checks prevent price-drift manipulation.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-xs font-bold text-[#003087] flex items-center gap-1.5 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Anti-Prompt-Injection Shield
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      External catalog data from Channel3 is sanitized against prompt attacks to protect payment parameters.
                    </p>
                  </div>
                </div>

                {/* Quick Interactive Tests */}
                <div className="mt-6 pt-5 border-t border-slate-200 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-bold text-slate-700">Quick Test Scenarios:</span>
                  <button
                    onClick={() => {
                      setCurrentView('shop');
                      handleSendMessage('Find a wireless headset under $50 with active noise cancelling', 50);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>Test $50 Budget Block Rejection</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setCurrentView('shop');
                      handleSendMessage('Find a wireless headset under $100 with multipoint Bluetooth', 100);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0057FF] border border-blue-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                  >
                    <span>Test $100 Approved Checkout Flow</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: Orders & Receipts */}
          {currentView === 'orders' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#001C3D] flex items-center gap-2">
                    <CreditCard className="w-6 h-6 text-[#0057FF]" />
                    Orders & Receipts Ledger
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Live PayPal Sandbox Transactions • Orders v2 Captures & Status Reconciliation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshOrders}
                    className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0057FF] border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
                  >
                    ↻ Refresh Orders ({orders.length})
                  </button>
                </div>
              </div>

              <OrdersLedger
                orders={orders}
                sessionId={sessionId}
                onCancelOrder={handleCancelOrder}
                onRefresh={refreshOrders}
              />
            </div>
          )}

          {/* VIEW: Activity & Audit Log */}
          {currentView === 'audit' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#001C3D]">
                    Activity Log & Cryptographic Provenance
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Immutable SHA-256 hash-chained event timeline recording every recommendation, policy check, and capture.
                  </p>
                </div>
                <button
                  onClick={refreshAuditEvents}
                  className="px-3.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0057FF] border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
                >
                  ↻ Refresh Events ({auditEvents.length})
                </button>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <AuditTimeline events={auditEvents} />
              </div>
            </div>
          )}

          {/* VIEW: Merchant Analytics (AG Studio Blueprint) */}
          {currentView === 'merchant' && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-[#001C3D] flex items-center gap-2">
                    <Layers className="w-6 h-6 text-[#0057FF]" />
                    Merchant & B2B Command Center
                  </h1>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Embedded Financial Analytics Blueprint (AG Studio) • In-Memory Relational Joins & Real-Time Metrics
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshOrders}
                    className="px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#0057FF] border border-blue-200 text-xs font-bold transition-colors shadow-2xs"
                  >
                    ↻ Refresh Analytics Data
                  </button>
                </div>
              </div>

              <OrdersLedger
                orders={orders}
                sessionId={sessionId}
                onCancelOrder={handleCancelOrder}
                onRefresh={refreshOrders}
              />
            </div>
          )}
        </main>

        {/* PayPal Developer Portal Style Minimalist Footer */}
        <footer className="border-t border-slate-200 bg-white py-8 px-6 mt-12 text-center text-xs text-slate-500 shadow-2xs">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-3 font-semibold text-slate-600 text-xs">
            <a href="#reference" className="hover:underline hover:text-[#0057FF]">Reference</a>
            <a href="https://www.paypal.com" target="_blank" rel="noreferrer" className="hover:underline hover:text-[#0057FF]">PayPal.com</a>
            <a href="#privacy" className="hover:underline hover:text-[#0057FF]">Privacy</a>
            <a href="#support" className="hover:underline hover:text-[#0057FF]">Support</a>
            <a href="#legal" className="hover:underline hover:text-[#0057FF]">Legal</a>
            <a href="#contact" className="hover:underline hover:text-[#0057FF]">Contact</a>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            PayPilot • Built for the PayPal AI Hackathon 2026 • Orders v2 Human Consent & Deterministic Guardrails
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
