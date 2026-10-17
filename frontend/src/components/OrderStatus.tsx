import React from 'react';
import type { CheckoutCaptureResponse } from '../types';
import { CheckCircle2, Receipt } from 'lucide-react';

interface OrderStatusProps {
  paymentResult: CheckoutCaptureResponse;
  onReset: () => void;
}

export const OrderStatus: React.FC<OrderStatusProps> = ({
  paymentResult,
  onReset
}) => {
  const isSimulated = paymentResult.payment.provider === 'simulated';
  return (
    <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-6 text-center shadow-xl">
      <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 ring-8 ring-emerald-500/10">
        <CheckCircle2 className="w-6 h-6" />
      </div>

      <h3 className="text-xl font-bold text-white">{isSimulated ? 'Simulated Checkout Complete' : 'Payment Confirmed & Verified'}</h3>
      <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
        {isSimulated
          ? 'This local demo flow did not contact PayPal or move funds.'
          : 'PayPal Sandbox order captured and verified server-side.'}
      </p>

      {/* Receipt Details */}
      <div className="mt-6 bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-left space-y-2.5 text-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <span className="text-slate-400 flex items-center gap-1.5 font-medium">
            <Receipt className="w-3.5 h-3.5 text-blue-400" /> Payment State
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold uppercase tracking-wider">
            {paymentResult.status}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Order Reference</span>
          <span className="text-slate-200 font-mono">{paymentResult.order_id}</span>
        </div>

        <div className="flex justify-between">
            <span className="text-slate-400">{isSimulated ? 'Capture Reference' : 'PayPal Capture ID'}</span>
          <span className="text-slate-200 font-mono font-medium">{paymentResult.payment.capture_id}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-400">Gateway Provider</span>
          <span className="text-slate-200 capitalize">{paymentResult.payment.provider.replace('_', ' ')}</span>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold text-white">
          <span>Captured Total</span>
          <span className="text-emerald-400">
            ${paymentResult.payment.amount.toFixed(2)} {paymentResult.payment.currency}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
        >
          Start New Search
        </button>
      </div>
    </div>
  );
};
