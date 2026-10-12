import React, { useState, useEffect } from 'react';
import { api } from './api/client';
import type { RankedCandidate, PolicyEvaluateResponse, CheckoutCaptureResponse, AuditTimelineEvent } from './types';
import { ChatPanel } from './components/ChatPanel';
import { ProductCard } from './components/ProductCard';
import { PolicyPanel } from './components/PolicyPanel';
import { ApprovalPanel } from './components/ApprovalPanel';
import { OrderStatus } from './components/OrderStatus';
import { AuditTimeline } from './components/AuditTimeline';
import { History, ShoppingBag, Layers } from 'lucide-react';

export const App: React.FC = () => {
  const [sessionId] = useState<string>(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [agentReply, setAgentReply] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<RankedCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<RankedCandidate | null>(null);
  const [policyResult, setPolicyResult] = useState<PolicyEvaluateResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<CheckoutCaptureResponse | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditTimelineEvent[]>([]);
  const [showApprovalStep, setShowApprovalStep] = useState(false);
  const [currentBudget, setCurrentBudget] = useState<number>(100);

  // Refresh audit events whenever session changes or actions occur
  const refreshAuditEvents = async () => {
    try {
      const events = await api.getSessionTimeline(sessionId);
      setAuditEvents(events);
    } catch (e) {
      console.error('Failed to load audit events', e);
    }
  };

  useEffect(() => {
    refreshAuditEvents();
  }, [sessionId]);

  const handleSendMessage = async (message: string, budget?: number) => {
    const activeBudget = budget || currentBudget;
    if (budget) setCurrentBudget(budget);

    setIsLoadingSearch(true);
    setPolicyResult(null);
    setShowApprovalStep(false);
    setPaymentResult(null);

    try {
      const res = await api.sendAgentTurn(sessionId, message, activeBudget);
      setAgentReply(res.reply_text);
      setCandidates(res.recommendations);
      if (res.recommendations.length > 0) {
        // Auto-select top recommendation
        handleSelectCandidate(res.recommendations[0], activeBudget);
      }
      await refreshAuditEvents();
    } catch (err: any) {
      setAgentReply(`Search error: ${err.message || 'Unable to connect to PayPilot backend.'}`);
    } finally {
      setIsLoadingSearch(false);
    }
  };

  const handleSelectCandidate = async (cand: RankedCandidate, budgetOverride?: number) => {
    setSelectedCandidate(cand);
    setShowApprovalStep(false);
    setPaymentResult(null);

    if (!cand.demo_sku) return;

    setIsLoadingPolicy(true);
    try {
      const evalRes = await api.evaluatePolicy(
        sessionId,
        cand.demo_sku,
        budgetOverride || currentBudget,
        cand.verified_features
      );
      setPolicyResult(evalRes);
      await refreshAuditEvents();
    } catch (err: any) {
      console.error('Policy evaluation failed', err);
    } finally {
      setIsLoadingPolicy(false);
    }
  };

  const handlePaymentSuccess = async (captureRes: CheckoutCaptureResponse) => {
    setPaymentResult(captureRes);
    setShowApprovalStep(false);
    await refreshAuditEvents();
  };

  const handleReset = () => {
    setSelectedCandidate(null);
    setPolicyResult(null);
    setPaymentResult(null);
    setShowApprovalStep(false);
    setAgentReply(null);
    setCandidates([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">PayPilot</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Agentic Commerce
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Consent-First AI Shopping & Purchase Policy Guardrails
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-300 font-medium">PayPal Sandbox Live</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono hidden md:block">
            Session: <span className="text-slate-200">{sessionId}</span>
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Chat & Candidates (7 cols) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          <ChatPanel
            onSendMessage={handleSendMessage}
            isLoading={isLoadingSearch}
            agentReply={agentReply}
          />

          {/* Product Discovery Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">
                  Channel3 Discovery Candidates ({candidates.length})
                </h3>
              </div>
              <span className="text-xs text-slate-400">
                Sorted by Evidence & Policy Fit
              </span>
            </div>

            {candidates.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">
                  Search or click a scenario above to retrieve real product candidates from Channel3.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidates.map((cand) => (
                  <ProductCard
                    key={cand.product_id}
                    product={cand}
                    isSelected={selectedCandidate?.product_id === cand.product_id}
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
              onPaymentSuccess={handlePaymentSuccess}
            />
          ) : (
            /* Deterministic Purchase Policy Panel */
            <PolicyPanel
              policyResult={policyResult}
              isLoading={isLoadingPolicy}
              onProceedToCheckout={() => setShowApprovalStep(true)}
            />
          )}

          {/* Immutable Audit Log */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-purple-400" />
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                  Auditable Provenance Trail
                </h4>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {auditEvents.length} events
              </span>
            </div>

            <AuditTimeline events={auditEvents} />
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 px-6 text-center text-xs text-slate-500">
        PayPilot • Built for the PayPal AI Hackathon 2026 • Deterministic Guardrails & PayPal Sandbox Integration
      </footer>
    </div>
  );
};

export default App;
