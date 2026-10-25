import React, { useState, useMemo, useCallback, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule, type ColDef, type GridReadyEvent } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PAID
          </span>
        );
      case 'AWAITING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> AWAITING APPROVAL
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
            <Ban className="w-3 h-3 text-slate-500" /> CANCELLED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" /> FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <AlertCircle className="w-3 h-3 text-blue-600" /> {status}
          </span>
        );
    }
  };

  const gridRef = useRef<any>(null);

  const defaultColDef = useMemo<ColDef>(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  const columnDefs: ColDef<OrderSummaryItem>[] = useMemo(() => [
    {
      field: 'order_id',
      headerName: 'Order ID',
      pinned: 'left',
      width: 160,
      cellRenderer: (params: any) => (
        <span className="font-mono text-[11px] text-[#003087] font-bold">
          {params.value}
        </span>
      ),
    },
    {
      field: 'item_title',
      headerName: 'Purchased Item',
      minWidth: 200,
      flex: 1,
      cellRenderer: (params: any) => (
        <div className="flex flex-col justify-center py-1">
          <span className="font-bold text-slate-900 text-xs truncate">
            {params.value || params.data?.sku}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            SKU: {params.data?.sku}
          </span>
        </div>
      ),
    },
    {
      field: 'amount',
      headerName: 'Landed Total',
      width: 130,
      sortable: true,
      cellRenderer: (params: any) => (
        <span className="font-bold text-xs text-[#003087]">
          ${params.value?.toFixed(2)} {params.data?.currency || 'USD'}
        </span>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 170,
      sortable: true,
      cellRenderer: (params: any) => getStatusBadge(params.value),
    },
    {
      field: 'paypal_order_id',
      headerName: 'PayPal Order ID',
      width: 180,
      cellRenderer: (params: any) => (
        <span className="font-mono text-[10px] text-slate-600">
          {params.value || '—'}
        </span>
      ),
    },
    {
      field: 'capture_id',
      headerName: 'PayPal Capture ID',
      width: 165,
      cellRenderer: (params: any) => (
        <span className="font-mono text-[10px] text-emerald-700 font-medium">
          {params.value || '—'}
        </span>
      ),
    },
    {
      field: 'created_at',
      headerName: 'Created At',
      width: 140,
      sortable: true,
      cellRenderer: (params: any) => (
        <span className="text-[11px] text-slate-500">
          {params.value ? new Date((params.value.endsWith('Z') || params.value.includes('+')) ? params.value : `${params.value}Z`).toLocaleTimeString() : '—'}
        </span>
      ),
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellRenderer: (params: any) => {
        const order = params.data;
        if (order?.status === 'AWAITING_APPROVAL' && onCancelOrder) {
          return (
            <button
              onClick={() => handleCancel(order.order_id)}
              disabled={cancellingId === order.order_id}
              className="px-2 py-0.5 text-[10px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded transition-colors flex items-center gap-1 my-1.5"
            >
              <Ban className="w-3 h-3" />
              <span>{cancellingId === order.order_id ? 'Voiding...' : 'Void'}</span>
            </button>
          );
        }
        return null;
      },
    },
  ], [cancellingId, onCancelOrder]);

  const onGridReady = useCallback((params: GridReadyEvent) => {
    params.api.sizeColumnsToFit();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* View Switcher: Table vs AG Studio Blueprint */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs text-xs">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-[#003087] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CreditCard className="w-3 h-3 text-[#0057FF]" />
            <span>Table View</span>
          </button>
          <button
            onClick={() => setViewMode('blueprint')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
              viewMode === 'blueprint'
                ? 'bg-white text-[#003087] shadow-xs border border-slate-200/80'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3 h-3 text-[#0057FF]" />
            <span>AG Studio Blueprint</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {viewMode === 'blueprint' && (
            <button
              onClick={() => setShowJsonModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-[#0057FF] border border-blue-200 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs"
              title="Inspect serializable AGReportState JSON"
            >
              <FileCode className="w-3 h-3" />
              <span>AGReportState</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 hover:text-slate-900 rounded-lg border border-slate-200 transition-colors text-[11px] font-semibold shadow-2xs"
            title="Export payments ledger as CSV"
          >
            <Download className="w-3 h-3 text-[#0057FF]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
          {/* Controls Bar: Filter & Search */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
              {['ALL', 'PAID', 'AWAITING_APPROVAL', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    statusFilter === st
                      ? 'bg-[#003087] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'AWAITING_APPROVAL' ? 'PENDING' : st}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 text-[11px] focus:outline-none focus:border-[#0057FF] focus:ring-1 focus:ring-[#0057FF] shadow-2xs w-32 sm:w-40"
              />
            </div>
          </div>

          {/* AG Grid Ledger Table Container ($5,000 AG Grid Sponsor Prize) */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
            {filteredOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p className="text-xs font-medium">
                  {orders.length === 0
                    ? 'No checkout orders created yet in this session.'
                    : 'No orders match your filter criteria.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  When you initiate PayPal Sandbox checkout, each order is tracked with full payment metadata in the AG Grid reconciliation engine.
                </p>
              </div>
            ) : (
              <div className="ag-theme-quartz w-full" style={{ height: 340 }}>
                <AgGridReact
                  ref={gridRef}
                  rowData={filteredOrders}
                  columnDefs={columnDefs}
                  defaultColDef={defaultColDef}
                  onGridReady={onGridReady}
                  pagination={true}
                  paginationPageSize={10}
                  paginationPageSizeSelector={[5, 10, 20]}
                  animateRows={true}
                  rowSelection={{ mode: 'singleRow' }}
                />
              </div>
            )}
          </div>
        </>
      ) : (
                /* AG Studio Blueprint Mode (Embedded Analytics Architecture) */
        <div className="space-y-3">
          {/* Executive KPI Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Total Invoiced</span>
              <div className="text-base font-bold text-[#001C3D] mt-0.5">${totalIssued.toFixed(2)}</div>
              <span className="text-[10px] text-slate-400">{orders.length} order requests</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Settled Volume</span>
              <div className="text-base font-bold text-emerald-700 mt-0.5">${totalPaid.toFixed(2)}</div>
              <span className="text-[10px] text-emerald-600 font-medium">{paidCount} captures confirmed</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#0057FF]" /> Collection Rate
              </span>
              <div className="text-base font-bold text-[#0057FF] mt-0.5">
                {collectionRate.toFixed(1)}%
              </div>
              <span className="text-[10px] text-slate-400 font-mono">paid / issued</span>
            </div>
          </div>

          {/* AG Studio In-Memory Sources & Relationships Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5 shadow-2xs">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <LayoutGrid className="w-3.5 h-3.5 text-[#0057FF]" />
                <span>AG Studio In-Memory Tabular Sources</span>
              </div>
              <button
                onClick={handleCopyConfig}
                className="flex items-center gap-1 text-[11px] text-[#0057FF] hover:underline font-semibold"
              >
                {copiedConfig ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Config</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-mono text-[#003087] font-bold text-sm">{studioConfig.sources[0]?.data.length || 0}</div>
                <div className="text-slate-500 text-[10px] font-medium">orders</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-mono text-[#0057FF] font-bold text-sm">{studioConfig.sources[1]?.data.length || 0}</div>
                <div className="text-slate-500 text-[10px] font-medium">transactions</div>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                <div className="font-mono text-indigo-700 font-bold text-sm">{studioConfig.sources[2]?.data.length || 0}</div>
                <div className="text-slate-500 text-[10px] font-medium">customers</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-1">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-[#0057FF]" />
                <span>Relational Join: <code className="text-slate-800 font-mono bg-slate-200/60 px-1 py-0.5 rounded">transactions.order_id ➔ orders.id</code></span>
              </div>
              <div>
                <span>Expression Engine: <code className="text-slate-800 font-mono bg-slate-200/60 px-1 py-0.5 rounded">collection_rate = paid_amount / issued_amount</code></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ledger Footer Summary */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1 border-t border-slate-200/80">
          <span>
            Total Settled:{' '}
            <strong className="text-emerald-700 font-bold">
              ${totalPaid.toFixed(2)} USD
            </strong>
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {orders.length} orders recorded
          </span>
        </div>
      )}

      {/* Modal: AGReportState JSON Inspector */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#0057FF]" />
                <h3 className="text-sm font-bold text-[#001C3D]">
                  AGReportState Serialization Specification
                </h3>
              </div>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 text-xs text-slate-600">
              This serializable JSON represents the layout, widgets, and XY grid coordinates of the PayPal Payments Overview dashboard (Section 3.2).
            </div>

            <div className="mt-3 flex-1 overflow-y-auto rounded-xl bg-[#001C3D] p-4 border border-blue-900 font-mono text-[11px] text-blue-100">
              <pre>{JSON.stringify(reportState, null, 2)}</pre>
            </div>

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Ready for <code className="text-slate-800 font-mono bg-slate-100 px-1 py-0.5 rounded">api.setState(reportState)</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(reportState, null, 2));
                  setShowJsonModal(false);
                }}
                className="px-4 py-2 bg-[#0057FF] hover:bg-[#0047D4] text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
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
