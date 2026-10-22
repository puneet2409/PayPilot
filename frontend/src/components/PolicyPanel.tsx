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
      <div className="rounded-2xl border border-blue-200 bg-white p-6 flex flex-col justify-between min-h-[310px] shadow-xs animate-pulse">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0057FF] border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-[#0057FF] animate-spin" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#001C3D]">Checking Budget & Safety</h4>
              <p className="text-xs text-slate-500">Evaluating product against your rules</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0057FF] text-xs font-semibold border border-blue-200">
            Checking...
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <ShieldCheck className="w-10 h-10 text-[#0057FF] mx-auto mb-2.5 animate-bounce" />
          <h5 className="text-sm font-bold text-slate-900">Verifying Candidate Compliance</h5>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Executing deterministic spending ceilings, landed cost calculations, and prompt protection...
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-100 text-xs text-slate-500 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-emerald-700 font-bold block">In-Stock</span>
            <span className="text-[11px] text-slate-500">Availability</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[#0057FF] font-bold block">Budget Cap</span>
            <span className="text-[11px] text-slate-500">Spending limit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-purple-700 font-bold block">Price Shield</span>
            <span className="text-[11px] text-slate-500">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  if (isSearching) {
    return (
      <div className="rounded-2xl border border-slate-200/90 bg-white p-6 flex flex-col justify-between min-h-[310px] shadow-xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0057FF] border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-[#0057FF]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#001C3D]">Budget Guard Ready</h4>
              <p className="text-xs text-slate-500">Automated spending limits primed</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#0057FF] text-xs font-semibold border border-blue-200 flex items-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-[#0057FF]" /> Ready
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <div className="relative w-12 h-12 mx-auto mb-2.5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping"></div>
            <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-[#0057FF] relative shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <h5 className="text-sm font-bold text-slate-900">Standing By for Deals</h5>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Ready to calculate exact taxes, shipping, budget compliance, and price-drift protection the instant products load.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-100 text-xs text-slate-500 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-emerald-700 font-bold block">In-Stock</span>
            <span className="text-[11px] text-slate-500">Availability</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[#0057FF] font-bold block">Budget Cap</span>
            <span className="text-[11px] text-slate-500">Spending limit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-purple-700 font-bold block">Price Shield</span>
            <span className="text-[11px] text-slate-500">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  if (!policyResult) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 flex flex-col justify-between min-h-[310px] shadow-2xs">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0057FF] border border-blue-100">
              <ShieldCheck className="w-5 h-5 text-[#0057FF]" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#001C3D]">Automated Spending Guardrails</h4>
              <p className="text-xs text-slate-500">Policy verification engine standing by</p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200">
            Awaiting Item
          </span>
        </div>

        <div className="my-auto py-5 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-2.5">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h5 className="text-sm font-bold text-slate-800">Select an Item to Check Budget</h5>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Click any product on the left to verify your spending limit, calculate tax & shipping, and unlock PayPal checkout.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2.5 pt-3.5 border-t border-slate-100 text-xs text-slate-500 text-center">
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-emerald-700 font-bold block">In-Stock</span>
            <span className="text-[11px] text-slate-500">Availability</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-[#0057FF] font-bold block">Budget Cap</span>
            <span className="text-[11px] text-slate-500">Spending limit</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-purple-700 font-bold block">Price Shield</span>
            <span className="text-[11px] text-slate-500">Anti-scam check</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-6 transition-all min-h-[310px] flex flex-col justify-between shadow-xs bg-white ${
        policyResult.eligible
          ? 'border-emerald-300'
          : 'border-rose-300'
      }`}
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {policyResult.eligible ? (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div>
              <h4 className="text-base font-bold text-slate-900">
                {policyResult.eligible ? 'Safe to Buy (Within Budget)' : getRejectionTitle(policyResult.rejection_reason || policyResult.reason)}
              </h4>
              <span className="text-xs text-slate-500">
                Automated Spending Guardrails • {policyResult.policy_version}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                policyResult.eligible
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-rose-50 text-rose-700 border-rose-300'
              }`}
            >
              {policyResult.eligible ? 'ELIGIBLE' : 'REJECTED'}
            </span>
          </div>
        </div>

        {/* Evaluated Product Preview with Thumbnail */}
        <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-3">
          {policyResult.image_url ? (
            <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              <img
                src={policyResult.image_url}
                alt={policyResult.item_title}
                className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-400">
              <ShieldCheck className="w-6 h-6 text-slate-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-slate-500 truncate">{policyResult.sku}</span>
              <span className="text-xs font-bold text-[#003087] shrink-0">
                ${policyResult.item_price.toFixed(2)} {policyResult.currency}
              </span>
            </div>
            <div className="text-sm font-bold text-slate-900 truncate mt-0.5">
              {policyResult.item_title}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {policyResult.is_external_retailer ? (policyResult.merchant || 'Retail partner offer') : 'PayPilot Demo Store'}
            </div>
          </div>
        </div>

        {policyResult.is_external_retailer ? (
          <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 flex items-center justify-between font-medium">
            <span>
              Verified live merchant offer from <strong>{policyResult.merchant || 'retail partner'}</strong>. External store purchases are completed on the merchant's domain.
            </span>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900 font-medium">
            Verified PayPilot inventory at <strong>${policyResult.item_price.toFixed(2)} {policyResult.currency}</strong> with instant PayPal sandbox checkout.
          </div>
        )}

        {/* Rules Checklist */}
        <div className="mt-4 space-y-2">
          {policyResult.checks.map((chk, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80"
            >
              {chk.passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 text-xs">
                <span className="font-bold text-slate-900">
                  {formatRuleName(chk.rule)}:
                </span>{' '}
                <span className={chk.passed ? 'text-slate-600' : 'text-rose-700 font-semibold'}>
                  {chk.detail}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quote summary if eligible */}
      {policyResult.eligible && policyResult.quote && (
        <div className="mt-5 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">Guaranteed Total (Tax + Shipping)</div>
              <div className="text-xl font-black text-[#003087]">
                ${(policyResult.landed_cost ?? policyResult.quote.amount).toFixed(2)} {policyResult.quote.currency}
              </div>
            </div>

            {policyResult.is_external_retailer ? (
              policyResult.buy_url ? (
                <a
                  href={policyResult.buy_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-[#0057FF] hover:bg-[#0043CE] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                >
                  <span>Buy on {policyResult.merchant || 'Store'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-700 text-xs font-semibold">
                  Direct Store Fulfillment
                </span>
              )
            ) : onProceedToCheckout ? (
              <button
                onClick={onProceedToCheckout}
                className="px-5 py-2.5 bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5A822] text-[#003087] text-xs font-black rounded-xl shadow-xs transition-all flex items-center gap-1.5"
              >
                <span>Proceed to PayPal Checkout</span>
              </button>
            ) : null}
          </div>

          <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2 text-xs text-slate-500">
            <div>Item: <span className="text-slate-900 font-bold">${policyResult.item_price.toFixed(2)}</span></div>
            <div>Est. Tax (8.25%): <span className="text-slate-900 font-bold">${(policyResult.estimated_tax ?? policyResult.item_price * 0.0825).toFixed(2)}</span></div>
            <div>Shipping: <span className="text-emerald-700 font-bold">{(policyResult.shipping ?? 0) === 0 ? 'FREE' : `$${(policyResult.shipping ?? 5.99).toFixed(2)}`}</span></div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" /> ID: {policyResult.quote.id}</span>
            {policyResult.quote.quote_signature && (
              <span className="text-blue-700 font-semibold">HMAC-SHA256: {policyResult.quote.quote_signature.slice(0, 16)}...</span>
            )}
          </div>
        </div>
      )}

      {/* Rejection message */}
      {!policyResult.eligible && policyResult.reason && (
        <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium">
          <strong>Rejection Invariant:</strong> {policyResult.reason}
        </div>
      )}
    </div>
  );
};
