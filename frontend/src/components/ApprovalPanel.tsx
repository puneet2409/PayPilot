import React, { useState, useMemo } from 'react';
import type { QuoteSummary, CheckoutCreateResponse, CheckoutCaptureResponse } from '../types';
import { api } from '../api/client';
import { ShieldAlert, Lock, Loader2, ArrowRight, ArrowLeft, CheckCircle2, Ban, RotateCcw, X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { PayPalLogo } from './PayPalLogo';

interface ApprovalPanelProps {
  quote: QuoteSummary;
  itemTitle: string;
  sku: string;
  sessionId: string;
  imageUrl?: string;
  onPaymentSuccess: (res: CheckoutCaptureResponse) => void;
  onCancelOrder?: (orderId: string) => Promise<void> | void;
  onBack: () => void;
  onReset?: () => void;
}

const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || '';
const IS_PAYPAL_CLIENT_CONFIGURED = Boolean(
  PAYPAL_CLIENT_ID && PAYPAL_CLIENT_ID !== 'your_paypal_sandbox_client_id_here'
);

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
  quote,
  itemTitle,
  sku,
  sessionId,
  imageUrl,
  onPaymentSuccess,
  onCancelOrder,
  onBack,
  onReset
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CheckoutCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoVoidMessage, setAutoVoidMessage] = useState<string | null>(null);
  const [userCancelled, setUserCancelled] = useState(false);

  const isVoidedOrCancelled = Boolean(
    autoVoidMessage || userCancelled || createdOrder?.status === 'CANCELLED'
  );

  const isRealSandboxOrder = Boolean(createdOrder && (
    createdOrder.paypal_mode === 'sandbox' ||
    (!createdOrder.paypal_mode && !createdOrder.paypal_order_id.startsWith('SANDBOX_ORDER_'))
  ));
  const canShowPayPalApproval = isRealSandboxOrder && IS_PAYPAL_CLIENT_CONFIGURED;

  const paypalInitOptions = useMemo(() => ({
    clientId: PAYPAL_CLIENT_ID,
    currency: quote.currency || 'USD',
    intent: 'capture' as const,
  }), [quote.currency]);

  const handleInitiatePayPalOrder = async () => {
    setIsProcessing(true);
    setError(null);
    setAutoVoidMessage(null);
    setUserCancelled(false);
    try {
      const order = await api.createCheckout(quote.id, sessionId);
      setCreatedOrder(order);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create PayPal order';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSimulatePriceDrift = async () => {
    if (!createdOrder) return;
    setIsProcessing(true);
    setError(null);
    setAutoVoidMessage(null);
    try {
      await api.captureCheckout(createdOrder.order_id, undefined, true);
    } catch (err: unknown) {
      const message = err instanceof Error
        ? err.message
        : 'Pre-capture guardian triggered: Merchant price spike detected. Order auto-voided!';
      setAutoVoidMessage(message);
      setCreatedOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      if (onCancelOrder && createdOrder) {
        try {
          await onCancelOrder(createdOrder.order_id);
        } catch {
          // ignore
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUserCancel = async () => {
    if (!createdOrder) {
      onBack();
      return;
    }
    setIsProcessing(true);
    setError(null);
    try {
      await api.cancelOrder(createdOrder.order_id);
    } catch {
      // Even if order state already shifted, reflect cancelled in UI
    } finally {
      setUserCancelled(true);
      setCreatedOrder((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
      if (onCancelOrder && createdOrder) {
        try {
          await onCancelOrder(createdOrder.order_id);
        } catch {
          // ignore
        }
      }
      setIsProcessing(false);
    }
  };

  // Simulated capture for dev mode (no PayPal credentials)
  const handleSimulatedCapture = async () => {
    if (!createdOrder) return;
    setIsProcessing(true);
    setError(null);
    try {
      const captureResult = await api.captureCheckout(createdOrder.order_id);
      const simulatedOrder = createdOrder.paypal_mode === 'simulated'
        || createdOrder.paypal_order_id.startsWith('SANDBOX_ORDER_');
      onPaymentSuccess(simulatedOrder && captureResult.payment.provider !== 'simulated'
        ? { ...captureResult, payment: { ...captureResult.payment, provider: 'simulated' } }
        : captureResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment capture failed';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-200/90 bg-white p-6 shadow-xs relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center p-1.5 shadow-2xs">
            <PayPalLogo className="w-6 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-[#001C3D]">PayPal Sandbox Checkout</h4>
            <span className="text-xs text-slate-500 font-medium">Consent-First Payment Gateway</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
            isVoidedOrCancelled
              ? 'bg-rose-50 text-rose-700 border-rose-300'
              : 'bg-blue-50 text-[#0057FF] border-blue-200'
          }`}>
            <Lock className="w-3 h-3" />
            {isVoidedOrCancelled ? 'ORDER CANCELLED' : isRealSandboxOrder ? 'Sandbox Live' : 'Simulated Mode'}
          </span>

          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title="Back to Product Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="mt-5 space-y-2.5 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
        {(imageUrl || quote.image_url) && (
          <div className="flex items-center gap-3 pb-3 border-b border-slate-200/80">
            <div className="w-14 h-14 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs">
              <img
                src={imageUrl || quote.image_url}
                alt={itemTitle}
                className="max-h-full max-w-full object-contain"
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-slate-900 truncate">{itemTitle}</h5>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">SKU: {sku}</div>
            </div>
          </div>
        )}
        <div className="flex justify-between text-xs text-slate-500">
          <span>Merchant</span>
          <span className="text-slate-800 font-bold">PayPilot Demo Store</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Item</span>
          <span className="text-slate-800 font-semibold truncate max-w-[200px]">{itemTitle}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>SKU</span>
          <span className="text-slate-700 font-mono">{sku}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Item Subtotal</span>
          <span className="text-slate-800 font-semibold">
            ${(quote.item_price ?? (quote.amount - (quote.estimated_tax ?? 0) - (quote.shipping_cost ?? quote.shipping ?? 0))).toFixed(2)} {quote.currency}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Est. Sales Tax (8.25%)</span>
          <span className="text-slate-800 font-semibold">
            ${(quote.estimated_tax ?? 0).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-500">
          <span>Shipping</span>
          <span className="text-emerald-700 font-bold">
            {(quote.shipping_cost ?? quote.shipping ?? 0) === 0
              ? 'FREE ($50+ promo)'
              : `$${(quote.shipping_cost ?? quote.shipping ?? 5.99).toFixed(2)}`}
          </span>
        </div>
        <div className="pt-2.5 border-t border-slate-200 flex justify-between text-base font-extrabold text-[#001C3D]">
          <span>Authoritative Total Charge (Landed Cost)</span>
          <span className="text-[#003087] text-lg font-black">${quote.amount.toFixed(2)} {quote.currency}</span>
        </div>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
        Price locked at <strong>${quote.amount.toFixed(2)} {quote.currency}</strong>. Guaranteed with verified itemized landed cost ceiling.
      </p>

      {error && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Case 1: Order Voided by Guardian or Cancelled by User */}
      {isVoidedOrCancelled ? (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-800 text-sm">
              <Ban className="w-4 h-4 text-rose-600" />
              <span>
                {autoVoidMessage ? 'Order Auto-Voided by Price Protection' : 'Checkout Order Cancelled'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-rose-700">
              {autoVoidMessage || 'This checkout order has been safely cancelled. No funds were captured or transferred from your PayPal account.'}
            </p>
            {createdOrder && (
              <div className="text-[10px] text-slate-500 font-mono pt-1">
                Reference ID: {createdOrder.paypal_order_id} ({createdOrder.order_id})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-[#0057FF] hover:bg-[#0043CE] text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store Items</span>
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#0057FF]" />
                <span>Start New Search</span>
              </button>
            )}
          </div>
        </div>
      ) : !createdOrder ? (
        /* Case 2: Step 1 - Create Order */
        <div className="mt-6 space-y-3">
          <button
            onClick={handleInitiatePayPalOrder}
            disabled={isProcessing}
            className="w-full py-3.5 px-4 rounded-xl font-extrabold text-sm bg-[#0057FF] hover:bg-[#0043CE] active:bg-[#003087] text-white transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Preparing PayPal Orders v2 Session...</span>
              </>
            ) : (
              <>
                <span>1. Generate PayPal Sandbox Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isProcessing}
            className="w-full py-2 px-3 text-xs text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center gap-1.5 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Product Selection</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Creates verified PayPal order via PayPal Orders v2 REST API.
          </p>
        </div>
      ) : (
        /* Case 3: Step 2 - Buyer Approval via PayPal SDK or Simulated */
        <div className="mt-6 space-y-4">
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                <span className="font-bold">PayPal Order Created:</span>{' '}
                <code className="text-emerald-950 font-mono font-semibold">{createdOrder.paypal_order_id}</code>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px] font-bold">
              {createdOrder.status}
            </span>
          </div>

          {/* Pre-Capture Price Spike Test Guardian */}
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" /> Price-Spike Protection
              </span>
              <button
                type="button"
                onClick={handleSimulatePriceDrift}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-[11px] transition-all disabled:opacity-50"
              >
                Test Price Spike (Auto-Cancel)
              </button>
            </div>
            <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
              Demonstrates what happens if a store unexpectedly hikes prices right before payment capture. PayPilot auto-voids the order to safeguard buyer funds.
            </p>
          </div>

          {canShowPayPalApproval ? (
            /* Real PayPal Buttons SDK */
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <PayPalScriptProvider options={paypalInitOptions}>
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                  createOrder={() => {
                    return Promise.resolve(createdOrder.paypal_order_id);
                  }}
                  onApprove={async () => {
                    setIsProcessing(true);
                    setError(null);
                    try {
                      const captureResult = await api.captureCheckout(createdOrder.order_id);
                      const simulatedOrder = createdOrder.paypal_mode === 'simulated'
                        || createdOrder.paypal_order_id.startsWith('SANDBOX_ORDER_');
                      onPaymentSuccess(simulatedOrder && captureResult.payment.provider !== 'simulated'
                        ? { ...captureResult, payment: { ...captureResult.payment, provider: 'simulated' } }
                        : captureResult);
                    } catch (err: unknown) {
                      const message = err instanceof Error ? err.message : 'Payment capture failed';
                      setError(message);
                    } finally {
                      setIsProcessing(false);
                    }
                  }}
                  onError={(err) => {
                    setError(`PayPal error: ${err}`);
                  }}
                />
              </PayPalScriptProvider>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Official PayPal JS SDK handles buyer authentication and consent.
              </p>
            </div>
          ) : isRealSandboxOrder ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              The backend created a real PayPal Sandbox order, but this frontend is missing
              <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-bold">VITE_PAYPAL_CLIENT_ID</code>.
              Add the matching Sandbox client ID to show the buyer approval button.
            </div>
          ) : (
            /* Simulated mode for local dev without credentials */
            <div className="space-y-2">
              <button
                onClick={handleSimulatedCapture}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-[#FFC439] hover:bg-[#F2BA36] active:bg-[#E5A822] text-[#003087] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#003087]" />
                    <span>Capturing Payment on PayPal Server...</span>
                  </>
                ) : (
                  <>
                    <span className="italic font-black text-base tracking-tighter">PayPal</span>
                    <span>Approve &amp; Pay ${quote.amount.toFixed(2)}</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-slate-500 text-center">
                Simulated checkout mode — set <code className="text-[#0057FF] font-semibold">VITE_PAYPAL_CLIENT_ID</code> to enable live PayPal buttons.
              </p>
            </div>
          )}

          {/* Cancellation Option for User */}
          <div className="pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleUserCancel}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-300 hover:border-rose-400 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Ban className="w-3.5 h-3.5 text-rose-500" />
              )}
              <span>Cancel This Order &amp; Return</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            Explicit buyer approval consent is required. No funds move autonomously.
          </p>
        </div>
      )}
    </div>
  );
};
