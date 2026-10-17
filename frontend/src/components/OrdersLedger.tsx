import React, { useState, useMemo } from 'react';
import type { OrderSummaryItem } from '../types';
import {
  CreditCard,
  Download,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Ban,
  LayoutGrid,
  FileCode,
  Copy,
  Check,
  TrendingUp,
  GitBranch,
  X
} from 'lucide-react';
import {
  buildStudioDataConfig,
  generateAGReportState
} from '../utils/agStudioConfig';

interface OrdersLedgerProps {
  orders: OrderSummaryItem[];
  sessionId?: string;
  onCancelOrder?: (orderId: string) => Promise<void>;
  onRefresh?: () => void;
}

export const OrdersLedger: React.FC<OrdersLedgerProps> = ({
  orders,
  sessionId = 'current_session',
  onCancelOrder,
  onRefresh
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'blueprint'>('table');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [copiedConfig, setCopiedConfig] = useState<boolean>(false);

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

  // Aggregate Metrics for Blueprint View
  const totalIssued = useMemo(
    () => orders.reduce((sum, o) => sum + o.amount, 0),
    [orders]
  );
  const totalPaid = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'PAID')
        .reduce((sum, o) => sum + o.amount, 0),
    [orders]
  );
  const collectionRate = useMemo(
    () => (totalIssued > 0 ? (totalPaid / totalIssued) * 100 : 100),
    [totalIssued, totalPaid]
  );
  const paidCount = useMemo(
    () => orders.filter((o) => o.status === 'PAID').length,
    [orders]
  );

  const studioConfig = useMemo(
    () => buildStudioDataConfig(orders, sessionId),
    [orders, sessionId]
  );
  const reportState = useMemo(() => generateAGReportState(), []);

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

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(studioConfig, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
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
      {/* View Switcher: Table vs AG Studio Blueprint */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3 h-3" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('blueprint')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              viewMode === 'blueprint'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-3 h-3 text-emerald-300" />
            <span>AG Studio Blueprint</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === 'blueprint' && (
            <button
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-1 px-2 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-medium transition-colors"
              title="Inspect serializable AGReportState JSON"
            >
              <FileCode className="w-3 h-3" />
              <span>AGReportState</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg border border-slate-700 transition-colors text-[11px] font-medium"
            title="Export payments ledger as CSV"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {/* Controls Bar: Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
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
              <div className="max-h-[320px] overflow-y-auto divide-y divide-slate-800/60">
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
                          ${order.amount.toFixed(2)}{' '}
                          <span className="text-[10px] text-slate-400">{order.currency}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {order.created_at
                            ? new Date(order.created_at).toLocaleTimeString()
                            : ''}
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
        </>
      ) : (
        /* AG Studio Blueprint Mode (Embedded Analytics Architecture) */
        <div className="space-y-3">
          {/* Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Invoiced</span>
              <div className="text-sm font-bold text-white mt-0.5">${totalIssued.toFixed(2)}</div>
              <span className="text-[9px] text-slate-500">{orders.length} order requests</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">Settled Volume</span>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">${totalPaid.toFixed(2)}</div>
              <span className="text-[9px] text-emerald-400/70">{paidCount} captures confirmed</span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" /> Collection Rate
              </span>
              <div className="text-sm font-bold text-sky-400 mt-0.5">
                {collectionRate.toFixed(1)}%
              </div>
              <span className="text-[9px] text-slate-500">paid_amount / issued_amount</span>
            </div>
          </div>

          {/* AG Studio In-Memory Sources & Relationships Card */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
                <span>AG Studio In-Memory Tabular Sources</span>
              </div>
              <button
                onClick={handleCopyConfig}
                className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-medium"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div className="font-mono text-emerald-400 font-bold">{studioConfig.sources[0]?.data.length || 0}</div>
                <div className="text-slate-400 text-[10px]">orders</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div className="font-mono text-sky-400 font-bold">{studioConfig.sources[1]?.data.length || 0}</div>
                <div className="text-slate-400 text-[10px]">transactions</div>
              </div>
              <div className="bg-slate-900/60 p-2 rounded border border-slate-800/80">
                <div className="font-mono text-purple-400 font-bold">{studioConfig.sources[2]?.data.length || 0}</div>
                <div className="text-slate-400 text-[10px]">customers</div>
              </div>
            </div>

            <div className="pt-1.5 border-t border-slate-900 text-[10px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1">
                <GitBranch className="w-3 h-3 text-indigo-400" />
                <span>Relational Join: <code className="text-slate-300 font-mono">transactions.order_id ➔ orders.id</code></span>
              </div>
              <div>
                <span>Expression Engine: <code className="text-slate-300 font-mono">collection_rate = paid_amount / issued_amount</code></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Footer Summary */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1 border-t border-slate-800/80">
          <span>
            Total Settled:{' '}
            <strong className="text-emerald-400">
              ${totalPaid.toFixed(2)} USD
            </strong>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {orders.length} orders recorded
          </span>
        </div>
      )}

      {/* Modal: AGReportState JSON Inspector */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-semibold text-white">
                  AGReportState Serialization Specification
                </h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              This serializable JSON represents the layout, widgets, and XY grid coordinates of the PayPal Payments Overview dashboard (Section 3.2).
            </div>

            <div className="mt-3 flex-1 overflow-y-auto rounded-lg bg-slate-950 p-3 border border-slate-800 font-mono text-[11px] text-indigo-200">
              <pre>{JSON.stringify(reportState, null, 2)}</pre>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-[11px] text-slate-500">
                Ready for <code className="text-slate-300">api.setState(reportState)</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(reportState, null, 2));
                  setShowJsonModal(false);
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                Copy JSON & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
