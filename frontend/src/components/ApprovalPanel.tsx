import React, { useState, useMemo } from 'react';
import type { QuoteSummary, CheckoutCreateResponse, CheckoutCaptureResponse } from '../types';
import { api } from '../api/client';
import { ShieldAlert, Lock, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

interface ApprovalPanelProps {
  quote: QuoteSummary;
  itemTitle: string;
  sku: string;
  sessionId: string;
  onPaymentSuccess: (res: CheckoutCaptureResponse) => void;
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
  onPaymentSuccess
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CheckoutCreateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoVoidMessage, setAutoVoidMessage] = useState<string | null>(null);
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
      const message = err instanceof Error ? err.message : 'Pre-capture guardian triggered: Merchant price spike detected. Order auto-voided!';
      setAutoVoidMessage(message);
    } finally {
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
      onPaymentSuccess(captureResult);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment capture failed';
      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="rounded-xl border border-blue-500/30 bg-slate-900/90 p-6 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            P
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-100">PayPal Sandbox Checkout</h4>
            <span className="text-xs text-slate-400">Consent-First Payment Gateway</span>
          </div>
        </div>

        <span className="px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-semibold flex items-center gap-1">
          <Lock className="w-3 h-3" /> {isRealSandboxOrder ? 'Sandbox Mode' : 'Simulated Mode'}
        </span>
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
          <span className="text-slate-200 font-medium">${(quote.item_price ?? quote.amount).toFixed(2)} {quote.currency}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Est. Sales Tax (8.25%)</span>
          <span className="text-slate-200 font-medium">${(quote.estimated_tax ?? quote.amount * 0.0825).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-400">
          <span>Shipping</span>
          <span className="text-emerald-400 font-medium">
            {(quote.shipping ?? (quote.amount >= 50 ? 0 : 5.99)) === 0 ? 'FREE ($50+ promo)' : `$${(quote.shipping ?? 5.99).toFixed(2)}`}
          </span>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold text-white">
          <span>Authoritative Total</span>
          <span className="text-emerald-400">${(quote.landed_cost ?? quote.amount).toFixed(2)} {quote.currency}</span>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        This sandbox order binds a cryptographic HMAC quote ({quote.id}) directly to PayPal Orders v2 with itemized landed cost breakdown.
      </p>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Create Order */}
      {!createdOrder && (
        <div className="mt-6">
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
                <span>1. Generate PayPal Sandbox Order</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            Server creates order directly with PayPal API using verified quote amount.
          </p>
        </div>
      )}

      {/* Step 2: Buyer Approval via PayPal SDK or Simulated */}
      {createdOrder && (
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
                <ShieldAlert className="w-3.5 h-3.5" /> Judge Test: Pre-Capture Price Spike
              </span>
              <button
                type="button"
                onClick={handleSimulatePriceDrift}
                disabled={isProcessing}
                className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-semibold text-[11px] transition-all disabled:opacity-50"
              >
                Simulate Price Spike (Auto-Void)
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Simulates a sudden merchant price hike ($89.99 → $121.49) before capture. Demonstrates PayPilot auto-voiding the order to protect buyer funds.
            </p>
          </div>

          {autoVoidMessage && (
            <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{autoVoidMessage}</span>
            </div>
          )}

          {canShowPayPalApproval ? (
            /* Real PayPal Buttons SDK */
            <div className="rounded-lg bg-white p-4">
              <PayPalScriptProvider options={paypalInitOptions}>
                <PayPalButtons
                  style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal' }}
                  createOrder={() => {
                    // Return the already-created server-side order ID
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

          <p className="text-[11px] text-slate-400 text-center flex items-center justify-center gap-1">
            <Lock className="w-3 h-3 text-emerald-400" />
            Explicit buyer approval consent is required. No funds move autonomously.
          </p>
        </div>
      )}
    </div>
  );
};
