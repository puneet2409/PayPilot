import React, { useState, useMemo } from 'react';
import type { QuoteSummary, CheckoutCreateResponse, CheckoutCaptureResponse } from '../types';
import { api } from '../api/client';
import { ShieldAlert, Lock, Loader2, ArrowRight, ArrowLeft, CheckCircle2, Ban, RotateCcw, X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface ApprovalPanelProps {
  quote: QuoteSummary;
  itemTitle: string;
  sku: string;
  sessionId: string;
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
    <div className="rounded-xl border border-blue-500/30 bg-slate-900/90 p-6 shadow-xl relative">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            P
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-100">PayPal Sandbox Checkout</h4>
            <span className="text-xs text-slate-400">Secure Buyer-Approved Checkout</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 border ${
            isVoidedOrCancelled
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <Lock className="w-3 h-3" />
            {isVoidedOrCancelled ? 'ORDER CANCELLED' : isRealSandboxOrder ? 'Sandbox Mode' : 'Simulated Mode'}
          </span>

          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Back to Product Selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="mt-5 space-y-2 text-sm bg-slate-950/60 p-4 rounded-lg border border-slate-800">
        <div className="flex justify-between text-xs text-slate-400">
          <span>Merchant</span>
          <span className="text-slate-200 font-medium">PayPilot Demo Store</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Item</span>
          <span className="text-slate-200 font-medium truncate max-w-[200px]">{itemTitle}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>SKU</span>
          <span className="text-slate-200 font-mono">{sku}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Item Subtotal</span>
          <span className="text-slate-200 font-medium">
            ${(quote.item_price ?? quote.amount).toFixed(2)} {quote.currency}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Est. Sales Tax (8.25%)</span>
          <span className="text-slate-200 font-medium">
            ${(quote.estimated_tax ?? quote.amount * 0.0825).toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Shipping</span>
          <span className="text-emerald-400 font-medium">
            {(quote.shipping ?? (quote.amount >= 50 ? 0 : 5.99)) === 0
              ? 'FREE ($50+ promo)'
              : `$${(quote.shipping ?? 5.99).toFixed(2)}`}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold text-white">
          <span>Authoritative PayPal Charge</span>
          <span className="text-emerald-400">${quote.amount.toFixed(2)} {quote.currency}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
        Price locked at <strong>${quote.amount.toFixed(2)} {quote.currency}</strong>. Maximum landed ceiling verified with itemized tax & shipping.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Case 1: Order Voided by Guardian or Cancelled by User */}
      {isVoidedOrCancelled ? (
        <div className="mt-6 space-y-4">
          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-rose-300 text-sm">
              <Ban className="w-4 h-4 text-rose-400" />
              <span>
                {autoVoidMessage ? 'Order Auto-Voided by Price Protection' : 'Checkout Order Cancelled'}
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-300">
              {autoVoidMessage || 'This checkout order has been safely cancelled. No funds were captured or transferred from your PayPal account.'}
            </p>
            {createdOrder && (
              <div className="text-[10px] text-slate-400 font-mono pt-1">
                Reference ID: {createdOrder.paypal_order_id} ({createdOrder.order_id})
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store Items</span>
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
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
            className="w-full py-3 px-4 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Preparing PayPal Orders v2 Session...</span>
              </>
            ) : (
              <>
                <span>1. Prepare PayPal Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isProcessing}
            className="w-full py-2 px-3 text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Product Selection</span>
          </button>

          <p className="text-[11px] text-slate-500 text-center">
            Prepares a secure PayPal order with verified pricing.
          </p>
        </div>
      ) : (
        /* Case 3: Step 2 - Buyer Approval via PayPal SDK or Simulated */
        <div className="mt-6 space-y-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                <span className="font-semibold">PayPal Order Created:</span>{' '}
                <code className="text-white font-mono">{createdOrder.paypal_order_id}</code>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              {createdOrder.status}
            </span>
          </div>

          {/* Pre-Capture Price Spike Test Guardian */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> Demo Test: Price-Spike Protection
              </span>
              <button
                type="button"
                onClick={handleSimulatePriceDrift}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold text-[11px] transition-all disabled:opacity-50"
              >
                Simulate Price Spike (Auto-Cancel)
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Simulates what happens if a store hikes prices right before payment. Demonstrates PayPilot auto-cancelling the order to protect your money.
            </p>
          </div>

          {canShowPayPalApproval ? (
            /* Real PayPal Buttons SDK */
            <div className="rounded-lg bg-white p-4">
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
                PayPal JS SDK handles buyer authentication and consent.
              </p>
            </div>
          ) : isRealSandboxOrder ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
              The backend created a real PayPal Sandbox order, but this frontend is missing
              <code className="mx-1 rounded bg-slate-950/70 px-1 py-0.5">VITE_PAYPAL_CLIENT_ID</code>.
              Add the matching Sandbox client ID and rebuild the frontend to show the buyer approval button.
            </div>
          ) : (
            /* Simulated mode for local dev without credentials */
            <>
              <button
                onClick={handleSimulatedCapture}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-[#FFC439] hover:bg-[#F2BA36] text-[#003087] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Capturing Payment on PayPal Server...</span>
                  </>
                ) : (
                  <>
                    <span className="italic font-extrabold text-base">PayPal</span>
                    <span>Approve &amp; Pay ${quote.amount.toFixed(2)}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-amber-400/70 text-center">
                Simulated checkout — configure PayPal Sandbox credentials to demonstrate a real PayPal approval
              </p>
            </>
          )}

          {/* Cancellation Option for User */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={handleUserCancel}
              disabled={isProcessing}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-700/80 hover:border-rose-500/50 bg-slate-800/40 hover:bg-rose-950/20 text-slate-300 hover:text-rose-300 text-xs font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Ban className="w-3.5 h-3.5 text-rose-400" />
              )}
              <span>Cancel This Order &amp; Return</span>
            </button>
          </div>

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            Explicit buyer approval consent is required. No funds move autonomously.
          </p>
        </div>
      )}
    </div>
  );
};
