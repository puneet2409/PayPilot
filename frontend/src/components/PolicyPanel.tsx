import React from 'react';
import type { PolicyEvaluateResponse } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, Loader2, ExternalLink } from 'lucide-react';

interface PolicyPanelProps {
  policyResult: PolicyEvaluateResponse | null;
  isLoading: boolean;
  isSearching?: boolean;
  onProceedToCheckout?: () => void;
}

const getRejectionTitle = (reason?: string): string => {
  if (!reason) return 'Purchase Policy Blocked';
  const lower = reason.toLowerCase();
  if (lower.includes('missing required attribute') || lower.includes('attribute') || lower.includes('feature')) {
    return 'Feature Mismatch Alert (Missing Feature)';
  }
  if (lower.includes('prompt injection') || lower.includes('adversarial')) {
    return 'Security Alert (Blocked by Shield)';
  }
  if (lower.includes('currency')) {
    return 'Currency Mismatch Alert';
  }
  if (lower.includes('price') || lower.includes('budget') || lower.includes('ceiling') || lower.includes('exceeds')) {
    return 'Spending Alert (Over Budget)';
  }
  return 'Purchase Policy Blocked';
};

const formatRuleName = (rule: string): string => {
  const lower = rule.toLowerCase();
  if (lower.startsWith('feature_req_')) {
    const feat = lower.replace('feature_req_', '').replace(/_/g, ' ');
    return `Required Feature (${feat})`;
  }
  const map: Record<string, string> = {
    budget_cap: 'Budget Limit',
    budget_limit: 'Budget Limit',
    demo_catalogue_active: 'Product In-Stock',
    store_inventory_active: 'Product In-Stock',
    active_status: 'Product In-Stock',
    currency_match: 'Currency Match (USD)',
    feature_verification: 'Verified Features',
    prompt_injection_shield: 'Price & Safety Shield',
    buyer_approval_required: 'Buyer Approval Gate',
  };
  return map[lower] || rule.replace(/_/g, ' ');
};

export const PolicyPanel: React.FC<PolicyPanelProps> = ({
  policyResult,
  isLoading,
  isSearching = false,
  onProceedToCheckout
}) => {
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-blue-500/30 bg-slate-900/70 p-6 flex flex-col justify-between min-h-[310px] shadow-xl animate-pulse">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-blue-400 animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Checking Budget & Safety</h4>
              <p className="text-xs text-slate-400">Evaluating product against your rules</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30">
            Checking...
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <ShieldCheck className="w-10 h-10 text-blue-400 mx-auto mb-2.5 animate-bounce" />
          <h5 className="text-sm font-semibold text-slate-200">Verifying Candidate Compliance</h5>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Executing deterministic spending ceilings, landed cost calculations, and prompt protection...
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-800 text-xs text-slate-400 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-emerald-400 font-semibold block">In-Stock</span>
            <span className="text-[11px]">Availability</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-blue-400 font-semibold block">Budget Cap</span>
            <span className="text-[11px]">Spending limit</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-purple-400 font-semibold block">Price Shield</span>
            <span className="text-[11px]">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 flex flex-col justify-between min-h-[310px] shadow-xl">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Budget Guard Ready</h4>
              <p className="text-xs text-slate-400">Automated spending limits primed</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium border border-blue-500/30 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-blue-300" /> Ready
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <div className="relative w-12 h-12 mx-auto mb-2.5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping"></div>
            <div className="w-10 h-10 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 relative shadow-md shadow-blue-500/10">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <h5 className="text-sm font-semibold text-slate-200">Standing By for Deals</h5>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            Ready to calculate exact taxes, shipping, budget compliance, and price-drift protection the instant products load.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-800 text-xs text-slate-400 text-center">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-emerald-400 font-semibold block">In-Stock</span>
            <span className="text-[11px]">Availability</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-blue-400 font-semibold block">Budget Cap</span>
            <span className="text-[11px]">Spending limit</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-purple-400 font-semibold block">Price Shield</span>
            <span className="text-[11px]">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  if (!policyResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800/90 bg-slate-900/40 p-6 flex flex-col justify-between min-h-[310px] shadow-sm">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">Automated Spending Guardrails</h4>
              <p className="text-xs text-slate-400">Policy verification engine standing by</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 text-xs font-mono border border-slate-700/50">
            Awaiting Item
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mx-auto mb-2.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-semibold text-slate-300">Select an Item to Check Budget</h5>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Click any product on the left to verify your spending limit, calculate tax & shipping, and unlock PayPal checkout.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-800/80 text-xs text-slate-400 text-center">
          <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-emerald-400 font-semibold block">In-Stock</span>
            <span className="text-[11px]">Availability</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-blue-400 font-semibold block">Budget Cap</span>
            <span className="text-[11px]">Spending limit</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-950/50 border border-slate-800/60">
            <span className="text-purple-400 font-semibold block">Price Shield</span>
            <span className="text-[11px]">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-6 transition-all min-h-[310px] flex flex-col justify-between shadow-xl ${
        policyResult.eligible
          ? 'border-emerald-500/40 bg-emerald-950/20'
          : 'border-rose-500/40 bg-rose-950/20'
      }`}
    >
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          {policyResult.eligible ? (
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          )}
          <div>
            <h4 className="text-base font-semibold text-slate-100">
              {policyResult.eligible ? 'Safe to Buy (Within Budget)' : getRejectionTitle(policyResult.rejection_reason || policyResult.reason)}
            </h4>
            <span className="text-xs text-slate-400">
              Automated Spending Guardrails • {policyResult.policy_version}
            </span>
          </div>
        </div>

        <div className="text-right">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              policyResult.eligible
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
            }`}
          >
            {policyResult.eligible ? 'ELIGIBLE' : 'REJECTED'}
          </span>
        </div>
      </div>

      {policyResult.is_external_retailer ? (
        <div className="mt-4 rounded-lg border border-sky-500/30 bg-sky-950/20 px-3 py-2.5 text-xs text-sky-200 flex items-center justify-between">
          <span>
            Verified live merchant offer from <strong>{policyResult.merchant || 'retail partner'}</strong>. External store purchases are completed directly on the merchant's checkout domain.
          </span>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-2.5 text-xs text-indigo-100/90">
          This check uses PayPilot demo-store inventory at <strong>${policyResult.item_price.toFixed(2)} {policyResult.currency}</strong> with instant PayPal sandbox checkout.
        </div>
      )}

      {/* Rules Checklist */}
      <div className="mt-4 space-y-2.5">
        {policyResult.checks.map((chk, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80"
          >
            {chk.passed ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <span className="font-semibold text-slate-200">
                {formatRuleName(chk.rule)}:
              </span>{' '}
              <span className={chk.passed ? 'text-slate-300' : 'text-rose-300 font-medium'}>
                {chk.detail}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quote summary if eligible */}
      {policyResult.eligible && policyResult.quote && (
        <div className="mt-5 p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Guaranteed Total (Tax + Shipping)</div>
              <div className="text-lg font-bold text-white">
                ${(policyResult.landed_cost ?? policyResult.quote.amount).toFixed(2)} {policyResult.quote.currency}
              </div>
            </div>

            {policyResult.is_external_retailer ? (
              policyResult.buy_url ? (
                <a
                  href={policyResult.buy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Buy on {policyResult.merchant || 'Store'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                  Direct Store Fulfillment
                </span>
              )
            ) : onProceedToCheckout ? (
              <button
                onClick={onProceedToCheckout}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
              >
                Proceed to PayPal Checkout
              </button>
            ) : null}
          </div>

          <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-[11px] text-slate-400">
            <div>Item: <span className="text-white font-medium">${policyResult.item_price.toFixed(2)}</span></div>
            <div>Est. Tax (8.25%): <span className="text-white font-medium">${(policyResult.estimated_tax ?? policyResult.item_price * 0.0825).toFixed(2)}</span></div>
            <div>Shipping: <span className="text-emerald-400 font-medium">{(policyResult.shipping ?? 0) === 0 ? 'FREE' : `$${(policyResult.shipping ?? 5.99).toFixed(2)}`}</span></div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono flex items-center justify-between pt-1 border-t border-slate-800/60">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> ID: {policyResult.quote.id}</span>
            {policyResult.quote.quote_signature && (
              <span className="text-indigo-400">HMAC-SHA256: {policyResult.quote.quote_signature.slice(0, 16)}...</span>
            )}
          </div>
        </div>
      )}

      {/* Rejection message */}
      {!policyResult.eligible && policyResult.reason && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          <strong>Rejection Invariant:</strong> {policyResult.reason}
        </div>
      )}
    </div>
  );
};
