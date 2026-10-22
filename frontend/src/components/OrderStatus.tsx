import React from 'react';
import type { CheckoutCaptureResponse } from '../types';
import { CheckCircle2, Receipt, ArrowRight } from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';

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
    <div className="rounded-2xl border border-emerald-300 bg-white p-6 text-center shadow-xs">
      <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto mb-3.5 ring-8 ring-emerald-50/50">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      <div className="flex items-center justify-center gap-2 mb-1">
        <PayPalLogo className="w-5 h-6" />
        <h3 className="text-xl font-extrabold text-[#001C3D]">
          {isSimulated ? 'Simulated Checkout Complete' : 'Payment Confirmed & Verified'}
        </h3>
      </div>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
        {isSimulated
          ? 'This local demo flow simulated checkout without debiting live funds.'
          : 'PayPal Sandbox order captured and cryptographically recorded on server ledger.'}
      </p>

      {/* Receipt Details */}
      <div className="mt-5 bg-slate-50 border border-slate-200 rounded-xl p-4 text-left space-y-2.5 text-xs">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
          <span className="text-slate-500 flex items-center gap-1.5 font-semibold">
            <Receipt className="w-4 h-4 text-[#0057FF]" /> Payment Status
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-extrabold uppercase tracking-wider text-[11px]">
            {paymentResult.status}
          </span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Order Reference</span>
          <span className="text-slate-900 font-mono font-bold">{paymentResult.order_id}</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>{isSimulated ? 'Capture Reference' : 'PayPal Capture ID'}</span>
          <span className="text-slate-900 font-mono font-semibold">{paymentResult.payment.capture_id}</span>
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Gateway Provider</span>
          <span className="text-slate-900 font-bold capitalize">{paymentResult.payment.provider.replace('_', ' ')}</span>
        </div>

        <div className="pt-2.5 border-t border-slate-200 flex justify-between items-center text-sm font-extrabold text-[#001C3D]">
          <span>Captured Total</span>
          <span className="text-[#003087] text-xl font-black">
            ${paymentResult.payment.amount.toFixed(2)} {paymentResult.payment.currency}
          </span>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <button
          onClick={onReset}
          className="flex-1 py-3 px-4 rounded-xl bg-[#0057FF] hover:bg-[#0043CE] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
        >
          <span>Start New Search</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
