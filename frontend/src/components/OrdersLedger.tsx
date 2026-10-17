import React, { useState, useMemo } from 'react';
import type { OrderSummaryItem } from '../types';
import { CreditCard, Download, Search, CheckCircle2, Clock, XCircle, AlertCircle, Ban } from 'lucide-react';

interface OrdersLedgerProps {
  orders: OrderSummaryItem[];
  onCancelOrder?: (orderId: string) => Promise<void>;
  onRefresh?: () => void;
}

export const OrdersLedger: React.FC<OrdersLedgerProps> = ({
  orders,
  onCancelOrder,
  onRefresh
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === 'ALL' || order.status.toUpperCase() === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        order.order_id.toLowerCase().includes(q) ||
        (order.sku && order.sku.toLowerCase().includes(q)) ||
        (order.item_title && order.item_title.toLowerCase().includes(q)) ||
        (order.paypal_order_id && order.paypal_order_id.toLowerCase().includes(q)) ||
        (order.capture_id && order.capture_id.toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    });
  }, [orders, statusFilter, searchQuery]);

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    const headers = [
      'Order ID',
      'Quote ID',
      'SKU',
      'Item Title',
      'Amount',
      'Currency',
      'Status',
      'PayPal Order ID',
      'PayPal Capture ID',
      'Created At'
    ];
    const rows = orders.map((o) => [
      `"${o.order_id}"`,
      `"${o.quote_id}"`,
      `"${o.sku}"`,
      `"${(o.item_title || '').replace(/"/g, '""')}"`,
      o.amount.toFixed(2),
      o.currency,
      o.status,
      `"${o.paypal_order_id || ''}"`,
      `"${o.capture_id || ''}"`,
      `"${o.created_at}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paypilot-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCancel = async (orderId: string) => {
    if (!onCancelOrder) return;
    setCancellingId(orderId);
    try {
      await onCancelOrder(orderId);
      if (onRefresh) onRefresh();
    } finally {
      setCancellingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> PAID
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3" /> AWAITING APPROVAL
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Ban className="w-3 h-3" /> CANCELLED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <AlertCircle className="w-3 h-3" /> {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Controls Bar: Filter, Search, Export */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-lg border border-slate-800">
          {['ALL', 'PAID', 'AWAITING_APPROVAL', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {st === 'AWAITING_APPROVAL' ? 'PENDING' : st}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
            <input
              type="text"
              placeholder="Filter orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-6 pr-2 py-1 bg-slate-950/60 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 text-[11px] focus:outline-none focus:border-blue-500 w-28 sm:w-36"
            />
          </div>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700 transition-colors text-[11px] font-medium"
            title="Export payments ledger as CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Ledger Table Container */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/50 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CreditCard className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            <p className="text-xs">
              {orders.length === 0
                ? 'No checkout orders created yet in this session.'
                : 'No orders match your filter criteria.'}
            </p>
            {orders.length === 0 && (
              <p className="text-[10px] text-slate-600 mt-1">
                When you initiate PayPal Sandbox checkout, each order is tracked with full payment metadata.
              </p>
            )}
          </div>
        ) : (
          <div className="max-h-[340px] overflow-y-auto divide-y divide-slate-800/60">
            {filteredOrders.map((order) => (
              <div
                key={order.order_id}
                className="p-3 hover:bg-slate-900/60 transition-colors flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-200 text-xs truncate max-w-[200px]">
                        {order.item_title || order.sku}
                      </span>
                      {getStatusBadge(order.status)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Order: {order.order_id.substring(0, 16)}…
                    </span>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-bold text-xs text-emerald-400">
                      ${order.amount.toFixed(2)} <span className="text-[10px] text-slate-400">{order.currency}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {order.created_at ? new Date(order.created_at).toLocaleTimeString() : ''}
                    </div>
                  </div>
                </div>

                {/* PayPal Identifiers and Metadata */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] pt-1 border-t border-slate-900 text-slate-400">
                  <div className="flex flex-wrap items-center gap-2 font-mono">
                    {order.paypal_order_id && (
                      <span className="text-sky-400/90" title="PayPal Orders v2 ID">
                        PP: {order.paypal_order_id}
                      </span>
                    )}
                    {order.capture_id && (
                      <span className="text-emerald-400/90" title="PayPal Capture ID">
                        Cap: {order.capture_id}
                      </span>
                    )}
                  </div>

                  {order.status === 'AWAITING_APPROVAL' && onCancelOrder && (
                    <button
                      onClick={() => handleCancel(order.order_id)}
                      disabled={cancellingId === order.order_id}
                      className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] transition-colors"
                    >
                      {cancellingId === order.order_id ? 'Cancelling…' : 'Cancel Order'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ledger Footer Summary */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
          <span>
            Total Settled:{' '}
            <strong className="text-emerald-400">
              $
              {orders
                .filter((o) => o.status === 'PAID')
                .reduce((sum, o) => sum + o.amount, 0)
                .toFixed(2)}{' '}
              USD
            </strong>
          </span>
          <span className="text-[10px] text-slate-500">
            {orders.length} total orders recorded
          </span>
        </div>
      )}
    </div>
  );
};
