import React, { useState, useMemo, useEffect } from 'react';
import type { AuditTimelineEvent } from '../types';
import {
  Activity,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  CreditCard,
  ArrowRight,
  Code2,
  Lock,
  XCircle,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface AuditTimelineProps {
  events: AuditTimelineEvent[];
}

interface EventMetadata {
  title: string;
  badge: string;
  badgeColor: string;
  summary: string;
  pills: { label: string; value: string | number }[];
}

const ITEMS_PER_PAGE = 3;

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [developerMode, setDeveloperMode] = useState(false);

  // Newest events first so current actions immediately show on Page 1
  const sortedEvents = useMemo(() => {
    return [...events].reverse();
  }, [events]);

  const totalPages = Math.max(1, Math.ceil(sortedEvents.length / ITEMS_PER_PAGE));

  // Reset to page 1 if currently out of range
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-400">
        No activity recorded for this session yet.
      </div>
    );
  }

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentEvents = sortedEvents.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, '...', totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'AGENT_TURN_PROCESSED':
      case 'SEARCH_REQUESTED':
        return <Activity className="w-4 h-4 text-[#0057FF]" />;
      case 'POLICY_EVALUATED':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      case 'REJECTED_BY_POLICY':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'PAYPAL_ORDER_CREATED':
        return <CreditCard className="w-4 h-4 text-[#003087]" />;
      case 'PAYMENT_CAPTURED':
      case 'SIMULATED_CHECKOUT_COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'ORDER_CANCELLED':
      case 'PRE_CAPTURE_PRICE_DRIFT_VOIDED':
        return <XCircle className="w-4 h-4 text-amber-600" />;
      default:
        return <ArrowRight className="w-4 h-4 text-slate-400" />;
    }
  };

  const parseEventDetails = (type: string, details: Record<string, any>): EventMetadata => {
    switch (type) {
      case 'AGENT_TURN_PROCESSED': {
        const count = details.recommendations_count ?? 0;
        const msg = details.user_message || 'product search';
        const budget = details.budget ? `$${details.budget}` : 'None';
        return {
          title: 'Product Deals Discovered',
          badge: 'Search',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          summary: `Found ${count} live store option${count === 1 ? '' : 's'} matching "${msg}".`,
          pills: [
            ...(details.budget ? [{ label: 'Budget Cap', value: budget }] : []),
            ...(details.category ? [{ label: 'Category', value: details.category }] : []),
            { label: 'Deals Found', value: count },
          ]
        };
      }
      case 'POLICY_EVALUATED': {
        const landed = details.landed_cost ?? details.amount ?? 0;
        const sku = details.sku || 'Item';
        return {
          title: 'Purchase Approved (Within Budget)',
          badge: 'Eligible',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          summary: `Passed all spending limits and attribute checks for ${sku}. Total locked at $${Number(landed).toFixed(2)}.`,
          pills: [
            { label: 'SKU', value: sku },
            { label: 'Landed Total', value: `$${Number(landed).toFixed(2)}` },
            ...(details.estimated_tax !== undefined ? [{ label: 'Tax', value: `$${Number(details.estimated_tax).toFixed(2)}` }] : []),
            ...(details.shipping !== undefined ? [{ label: 'Shipping', value: details.shipping === 0 ? 'FREE' : `$${Number(details.shipping).toFixed(2)}` }] : []),
          ]
        };
      }
      case 'REJECTED_BY_POLICY': {
        const sku = details.sku || 'Item';
        const reason = details.reason || 'Did not meet spending ceiling or required features.';
        return {
          title: 'Purchase Blocked by Safety Guardrail',
          badge: 'Blocked',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          summary: `Safety guardrail blocked purchase of ${sku}: ${reason}`,
          pills: [
            { label: 'SKU', value: sku },
            ...(details.item_price ? [{ label: 'Price', value: `$${Number(details.item_price).toFixed(2)}` }] : []),
            ...(details.max_total ? [{ label: 'Budget Limit', value: `$${Number(details.max_total).toFixed(2)}` }] : []),
          ]
        };
      }
      case 'PAYPAL_ORDER_CREATED': {
        const orderId = details.paypal_order_id || details.order_id || 'Order';
        const amount = details.amount ? `$${Number(details.amount).toFixed(2)}` : '';
        return {
          title: 'PayPal Checkout Session Prepared',
          badge: 'Checkout',
          badgeColor: 'bg-blue-50 text-[#003087] border-blue-200',
          summary: `Created secure order on PayPal gateway for ${amount}. Awaiting buyer approval.`,
          pills: [
            { label: 'Order ID', value: String(orderId).slice(0, 16) },
            ...(details.amount ? [{ label: 'Amount', value: amount }] : []),
            ...(details.currency ? [{ label: 'Currency', value: details.currency }] : []),
          ]
        };
      }
      case 'PAYMENT_CAPTURED': {
        const capId = details.capture_id || details.order_id || 'ID';
        const amount = details.amount ? `$${Number(details.amount).toFixed(2)}` : '';
        return {
          title: 'Payment Confirmed & Captured',
          badge: 'Captured',
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          summary: `Payment ${amount} captured and verified on PayPal server. Transaction complete.`,
          pills: [
            { label: 'Capture ID', value: String(capId).slice(0, 16) },
            ...(details.amount ? [{ label: 'Amount', value: amount }] : []),
            ...(details.provider ? [{ label: 'Gateway', value: details.provider }] : []),
          ]
        };
      }
      case 'SIMULATED_CHECKOUT_COMPLETED': {
        return {
          title: 'Simulated Payment Completed',
          badge: 'Simulated',
          badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
          summary: `Test payment of $${Number(details.amount || 0).toFixed(2)} simulated successfully. No actual funds moved.`,
          pills: [
            { label: 'Mode', value: 'Local Simulation' },
            ...(details.amount ? [{ label: 'Amount', value: `$${Number(details.amount).toFixed(2)}` }] : []),
          ]
        };
      }
      case 'ORDER_CANCELLED': {
        return {
          title: 'Order Cancelled',
          badge: 'Cancelled',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          summary: 'The order was cancelled by shopper or expired. No charges were made.',
          pills: [
            ...(details.order_id ? [{ label: 'Order ID', value: String(details.order_id).slice(0, 14) }] : [])
          ]
        };
      }
      case 'PRE_CAPTURE_PRICE_DRIFT_VOIDED': {
        return {
          title: 'Price Spike Detected — Auto-Voided',
          badge: 'Price Shield',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          summary: 'Merchant price spiked before final capture. Pre-capture shield automatically voided checkout.',
          pills: [
            ...(details.attempted_price ? [{ label: 'Detected Price', value: `$${details.attempted_price}` }] : []),
            ...(details.locked_price ? [{ label: 'Locked Quote', value: `$${details.locked_price}` }] : [])
          ]
        };
      }
      default: {
        return {
          title: type.replace(/_/g, ' '),
          badge: 'Action',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          summary: 'Action recorded in secure provenance log.',
          pills: []
        };
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Header Bar with Count & Developer View Toggle */}
      <div className="flex items-center justify-between pb-1 text-xs">
        <span className="text-slate-500 text-[11px] flex items-center gap-1 font-medium">
          <Lock className="w-3 h-3 text-[#0057FF]" />
          <span>Page {currentPage} of {totalPages} ({sortedEvents.length} total)</span>
        </span>
        <button
          type="button"
          onClick={() => setDeveloperMode(!developerMode)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 border ${
            developerMode
              ? 'bg-blue-50 text-[#0057FF] border-blue-200'
              : 'bg-slate-100 text-slate-600 hover:text-slate-900 border-slate-200'
          }`}
          title="Toggle technical JSON and cryptographic SHA-256 view"
        >
          {developerMode ? (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Hide Raw Data</span>
            </>
          ) : (
            <>
              <Code2 className="w-3 h-3" />
              <span>Developer View</span>
            </>
          )}
        </button>
      </div>

      {/* Paged Activities List */}
      <div className="space-y-3">
        {currentEvents.map((ev, idx) => {
          const meta = parseEventDetails(ev.event_type, ev.details || {});
          return (
            <div
              key={ev.id || idx}
              className="p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs transition-all hover:border-slate-300 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5">
                  {getEventIcon(ev.event_type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900">
                        {meta.title}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[10px] font-semibold border ${meta.badgeColor}`}>
                        {meta.badge}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* Friendly Layman Summary */}
                  <p className="mt-1 text-slate-600 text-xs leading-relaxed">
                    {meta.summary}
                  </p>

                  {/* Metric / Information Pills */}
                  {meta.pills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {meta.pills.map((pill, pidx) => (
                        <span
                          key={pidx}
                          className="px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[11px] text-slate-700 font-medium"
                        >
                          <span className="text-slate-400 mr-1">{pill.label}:</span>
                          <span className="text-slate-900 font-semibold">{pill.value}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expandable Technical Details (JSON & Cryptographic Hashes) */}
                  {(developerMode || ev.entry_hash) && (
                    <details
                      className="mt-2.5 pt-2 border-t border-slate-100 group"
                      open={developerMode}
                    >
                      <summary className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer flex items-center justify-between select-none font-medium">
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3 h-3 text-slate-400 group-open:text-[#0057FF]" />
                          <span>Technical Details & Hashes</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono group-open:hidden">
                          click to view
                        </span>
                      </summary>

                      <div className="mt-2 space-y-2">
                        {ev.entry_hash && (
                          <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-700 font-semibold">
                              SHA-256: {ev.entry_hash.slice(0, 16)}…
                            </span>
                            {ev.prev_hash && (
                              <span className="text-slate-500">
                                prev: {ev.prev_hash.slice(0, 12)}…
                              </span>
                            )}
                          </div>
                        )}

                        <pre className="text-[10px] text-slate-300 overflow-x-auto whitespace-pre-wrap font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                          {JSON.stringify(ev.details, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar: < 1 2 3 4 > */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 text-xs">
          <span className="text-[11px] text-slate-500">
            Showing <strong className="text-slate-800">{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, sortedEvents.length)}</strong> of <strong className="text-slate-800">{sortedEvents.length}</strong>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Previous page"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {getPageNumbers().map((pageItem, pidx) => {
              if (pageItem === '...') {
                return (
                  <span key={`ellipsis-${pidx}`} className="px-1 text-slate-400 font-mono text-xs">
                    …
                  </span>
                );
              }
              const pageNum = Number(pageItem);
              return (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                    currentPage === pageNum
                      ? 'bg-[#0057FF] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700 transition-colors"
              title="Next page"
              aria-label="Next page"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
