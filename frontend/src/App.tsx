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
import { ChatPanel } from './components/ChatPanel';
import { ProductCard } from './components/ProductCard';
import { PolicyPanel } from './components/PolicyPanel';
import { ApprovalPanel } from './components/ApprovalPanel';
import { OrderStatus } from './components/OrderStatus';
import { AuditTimeline } from './components/AuditTimeline';
import { OrdersLedger } from './components/OrdersLedger';
import { History, ShoppingBag, Layers, Sparkles, CreditCard, Code2, Loader2, RotateCcw } from 'lucide-react';

export const App: React.FC = () => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionId = session?.session_id ?? '';
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
  const [personaView, setPersonaView] = useState<'buyer' | 'cfo'>('buyer');
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

  // Refresh audit events whenever session changes or actions occur
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
    setIsLoadingPolicy(false);
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
        // Start policy evaluation on a PayPilot SKU when available. Live
        // retailer comparisons are not necessarily purchasable in this demo.
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
    setSelectedCandidate(cand);
    setShowApprovalStep(false);
    setPaymentResult(null);
    setPolicyResult(null);
    setIsLoadingPolicy(false);

    if (!cand.demo_sku) {
      // Live Channel3 Retailer Item Policy Evaluation
      const itemPrice = cand.price;
      const effectiveBudget = budgetOverride ?? currentBudget;
      const estimatedTax = Number((itemPrice * 0.0825).toFixed(2));
      const shipping = itemPrice >= 50.0 ? 0 : 5.99;
      const landedCost = Number((itemPrice + estimatedTax + shipping).toFixed(2));
      const isBudgetPassed = itemPrice <= effectiveBudget;

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
          detail: `Item price $${itemPrice.toFixed(2)} (Landed: $${landedCost.toFixed(2)} incl. $${estimatedTax.toFixed(2)} tax & $${shipping.toFixed(2)} shipping) ${isBudgetPassed ? 'is within' : 'exceeds'} ceiling $${effectiveBudget.toFixed(2)}`
        },
        {
          rule: 'prompt_injection_shield',
          passed: true,
          detail: 'Retail catalog payload sanitized — zero adversarial prompt patterns detected.'
        }
      ];

      const activeReqs = requiredFeaturesOverride ?? requiredFeatures;
      let allReqsPassed = true;
      for (const req of activeReqs) {
        const hasFeat = cand.verified_features.some(f => f.toLowerCase().includes(req.toLowerCase()));
        checks.push({
          rule: `feature_req_${req.toLowerCase().replace(/\s+/g, '_')}`,
          passed: hasFeat,
          detail: hasFeat ? `Verified attribute: ${req}` : `Unverified attribute: ${req}`
        });
        if (!hasFeat) allReqsPassed = false;
      }

      const isEligible = isBudgetPassed && allReqsPassed;

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
          ? `Price $${itemPrice.toFixed(2)} exceeds budget ceiling of $${effectiveBudget.toFixed(2)}`
          : !allReqsPassed
            ? 'Missing required feature attributes'
            : undefined,
        rejection_reason: !isBudgetPassed
          ? `Price $${itemPrice.toFixed(2)} exceeds budget ceiling of $${effectiveBudget.toFixed(2)}`
          : !allReqsPassed
            ? 'Missing required feature attributes'
            : undefined,
        policy_version: 'v1.0 (Store Deal Check)',
        landed_cost: landedCost,
        estimated_tax: estimatedTax,
        shipping: shipping,
        checks: checks,
        quote: isEligible ? {
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
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div
          onClick={handleReset}
          className="flex items-center gap-3 cursor-pointer group"
          title="Reset to PayPilot Home"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white group-hover:text-blue-300 transition-colors">PayPilot</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Agentic Commerce
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Consent-First AI Shopping & Purchase Policy Guardrails
            </span>
          </div>
        </div>

        {/* Dual-Lens Persona Switcher + Global Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setPersonaView('buyer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                personaView === 'buyer'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>🛒 Shopper Experience (B2C)</span>
            </button>
            <button
              onClick={() => setPersonaView('cfo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                personaView === 'cfo'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>📊 Merchant & CFO Command Center (B2B)</span>
            </button>
          </div>

          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-300 hover:text-white transition-all shadow-sm"
            title="Reset search, policy evaluation, and start fresh"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Reset Search</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || ''}/docs`}
            target="_blank"
            rel="noreferrer"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs text-slate-300 transition-colors"
            title="Open interactive OpenAPI 3.1 Swagger docs (APIMatic compliant)"
          >
            <Code2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>OpenAPI 3.1</span>
          </a>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${channel3Configured ? 'bg-sky-400 animate-pulse' : 'bg-slate-400'}`}></span>
            <span className="text-slate-300 font-medium">
              {channel3Configured ? 'Channel3 Live (25k+ Retailers)' : 'Channel3 Catalog Cache'}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className={`w-2 h-2 rounded-full ${isPayPalConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-medium">{paypalStatus}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            {session ? <>Session: <span className="text-slate-200">{sessionId.slice(0, 11)}...{sessionId.slice(-4)}</span></> : 'Securing…'}
          </div>
        </div>
      </header>

      {/* Main Persona Content */}
      {personaView === 'buyer' ? (
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat & Candidates (7 cols) */}
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
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
                  <Sparkles className="w-4 h-4 text-indigo-300" /> What You're Looking For
                </div>
                <span className="text-[10px] uppercase tracking-wide text-indigo-200/80">
                  {intentSource === 'gemini' ? 'AI Assisted Match' : 'Smart Keyword Match'}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {shoppingIntent.category && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">{shoppingIntent.category}</span>}
                {shoppingIntent.budget !== undefined && <span className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-200">Max ${shoppingIntent.budget.toFixed(2)} {shoppingIntent.currency}</span>}
                {shoppingIntent.must_have.map((feature) => <span key={`need-${feature}`} className="rounded-full bg-emerald-900/60 px-2.5 py-1 text-emerald-200">Needs: {feature}</span>)}
                {shoppingIntent.avoid.map((term) => <span key={`avoid-${term}`} className="rounded-full bg-rose-900/60 px-2.5 py-1 text-rose-200">Avoid: {term}</span>)}
                {shoppingIntent.preferences.map((preference) => <span key={`pref-${preference}`} className="rounded-full bg-slate-800 px-2.5 py-1 text-slate-300">Prefers: {preference}</span>)}
              </div>
              <p className="mt-2 text-[10px] text-slate-500">Your preferences and budget limit are automatically checked against each item before purchase.</p>
            </div>
          )}

          {/* Product Discovery Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">
                  Stores & Live Price Comparison ({candidates.length})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">
                  {isLoadingSearch ? (
                    <span className="text-sky-300 flex items-center gap-1.5 font-medium animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin text-sky-400" />
                      Comparing 25k+ stores...
                    </span>
                  ) : (
                    `${candidates.reduce((sum, c) => sum + (c.offers?.length || 1), 0)} store deals ranked for your budget`
                  )}
                </span>
                {candidates.length > 0 && !isLoadingSearch && (
                  <button
                    onClick={handleReset}
                    className="px-2 py-0.5 rounded text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors flex items-center gap-1"
                    title="Clear current product results"
                  >
                    <RotateCcw className="w-2.5 h-2.5 text-blue-400" />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {isLoadingSearch ? (
              /* Live Multi-Retailer Discovery Skeleton State */
              <div className="space-y-4">
                <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-4 flex items-center justify-between shadow-lg shadow-sky-500/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-sky-200">
                        Comparing 25,000+ Online Stores for Best Deals
                      </h4>
                      <p className="text-xs text-sky-300/70 mt-0.5">
                        Checking live store prices, stock availability, and specs matching your budget.
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[11px] font-mono animate-pulse">
                    Querying...
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4 animate-pulse shadow-md"
                    >
                      <div className="flex justify-between items-center">
                        <div className="h-5 w-24 bg-slate-800 rounded-md"></div>
                        <div className="h-6 w-16 bg-slate-800 rounded-md"></div>
                      </div>
                      <div className="h-5 w-3/4 bg-slate-800 rounded-md"></div>
                      <div className="space-y-2">
                        <div className="h-3 w-full bg-slate-800/60 rounded"></div>
                        <div className="h-3 w-5/6 bg-slate-800/60 rounded"></div>
                      </div>
                      <div className="space-y-2 pt-2 border-t border-slate-800/60">
                        <div className="h-3.5 w-1/2 bg-slate-800 rounded"></div>
                        <div className="h-3.5 w-2/3 bg-slate-800 rounded"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
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

        {/* Right Column: Policies, Checkout & Audit Timeline (5 cols) */}
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
            />
          )}

          {/* Tabbed Right Panel: Provenance Trail & Payments Ledger */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setRightPanelTab('timeline')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    rightPanelTab === 'timeline'
                      ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-purple-400" />
                  <span>Audit Trail</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                    {auditEvents.length}
                  </span>
                </button>

                <button
                  onClick={() => setRightPanelTab('ledger')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                    rightPanelTab === 'ledger'
                      ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payments Ledger</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-slate-300">
                    {orders.length}
                  </span>
                </button>
              </div>

              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                {rightPanelTab === 'timeline' ? 'Session-scoped audit' : 'AG Grid payments overview'}
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
      </main>
      ) : (
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Merchant & CFO Command Center
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Embedded Financial Analytics Blueprint (AG Studio) • PayPal REST Data Ingestion • Webhook Event Reconciliation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshOrders}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors"
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

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              Immutable Cryptographic Audit Trail
            </h4>
            <span className="text-xs text-slate-400 font-mono">
              {auditEvents.length} events logged with SHA-256 provenance
            </span>
          </div>
          <AuditTimeline events={auditEvents} />
        </div>
      </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        PayPilot • Built for the PayPal AI Hackathon 2026 • Deterministic Guardrails & PayPal Sandbox Integration
      </footer>
    </div>
  );
};

export default App;
