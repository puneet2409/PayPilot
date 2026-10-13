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
const IS_PAYPAL_CONFIGURED = Boolean(
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

  const paypalInitOptions = useMemo(() => ({
    clientId: PAYPAL_CLIENT_ID,
    currency: quote.currency || 'USD',
    intent: 'capture' as const,
  }), [quote.currency]);

  const handleInitiatePayPalOrder = async () => {
    setIsProcessing(true);
    setError(null);
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
          <Lock className="w-3 h-3" /> {IS_PAYPAL_CONFIGURED ? 'Sandbox Mode' : 'Simulated Mode'}
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
        <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold text-white">
          <span>Authoritative Total</span>
          <span className="text-emerald-400">${quote.amount.toFixed(2)} {quote.currency}</span>
        </div>
      </div>

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

          {IS_PAYPAL_CONFIGURED ? (
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
                      onPaymentSuccess(captureResult);
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
                ⚠ Simulated mode — set VITE_PAYPAL_CLIENT_ID for real PayPal buttons
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
