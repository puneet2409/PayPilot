import React from 'react';
import type { PolicyEvaluateResponse } from '../types';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

interface PolicyPanelProps {
  policyResult: PolicyEvaluateResponse | null;
  isLoading: boolean;
  isSearching?: boolean;
  onProceedToCheckout?: () => void;
}

export const PolicyPanel: React.FC<PolicyPanelProps> = ({
  policyResult,
  isLoading,
  isSearching = false,
  onProceedToCheckout
}) => {
  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center animate-pulse">
        <ShieldCheck className="w-8 h-8 text-blue-400 mb-2 animate-bounce" />
        <h4 className="text-sm font-semibold text-slate-200">Evaluating Purchase Policy</h4>
        <p className="text-xs text-slate-400 mt-1">
          Executing deterministic budget and attribute constraints...
        </p>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 flex flex-col items-center justify-center text-center">
        <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 mb-3 relative">
          <ShieldCheck className="w-8 h-8 text-blue-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 absolute top-2 right-2 animate-ping" />
        </div>
        <h4 className="text-sm font-semibold text-slate-200">Policy Engine Ready & Primed</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Standing by to evaluate candidate items against deterministic budget ceilings, prompt-injection shields, and landed costs once results arrive.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[11px] text-blue-300 bg-blue-950/40 px-3 py-1.5 rounded-lg border border-blue-500/20">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
          <span>Awaiting discovery candidate...</span>
        </div>
      </div>
    );
  }

  if (!policyResult) {
    return (
      <div className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-6 text-center">
        <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-300">Policy Engine Awaiting Candidate</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Select any recommended product to evaluate hard spending limits and store compliance before checkout.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border p-6 transition-all ${
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
              {policyResult.eligible ? 'Policy Checks Passed' : 'Policy Blocked Purchase'}
            </h4>
            <span className="text-xs text-slate-400">
              Deterministic Policy Engine • {policyResult.policy_version}
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

      <div className="mt-4 rounded-lg border border-indigo-500/20 bg-indigo-950/20 px-3 py-2.5 text-xs text-indigo-100/90">
        This check uses PayPilot demo-store inventory at <strong>${policyResult.item_price.toFixed(2)} {policyResult.currency}</strong>. A Channel3 retailer offer is separate and is not the price charged by this demo checkout.
      </div>

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
              <span className="font-semibold text-slate-200 capitalize">
                {chk.rule.replace(/_/g, ' ')}:
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
              <div className="text-xs text-slate-400">Deterministic Landed Cost Quote</div>
              <div className="text-lg font-bold text-white">
                ${(policyResult.landed_cost ?? policyResult.quote.amount).toFixed(2)} {policyResult.quote.currency}
              </div>
            </div>

            {onProceedToCheckout && (
              <button
                onClick={onProceedToCheckout}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md transition-all"
              >
                Proceed to Approval
              </button>
            )}
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
