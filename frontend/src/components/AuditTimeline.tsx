import React, { useRef, useEffect } from 'react';
import type { AuditTimelineEvent } from '../types';
import { Activity, CheckCircle, AlertTriangle, ArrowRight, ShieldCheck, CreditCard } from 'lucide-react';

interface AuditTimelineProps {
  events: AuditTimelineEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ events }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-xs text-slate-500">
        No audit events recorded for this session yet.
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'SEARCH_REQUESTED':
        return <Activity className="w-3.5 h-3.5 text-blue-400" />;
      case 'POLICY_EVALUATED':
        return <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />;
      case 'REJECTED_BY_POLICY':
        return <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />;
      case 'PAYPAL_ORDER_CREATED':
        return <CreditCard className="w-3.5 h-3.5 text-purple-400" />;
      case 'PAYMENT_CAPTURED':
      case 'SIMULATED_CHECKOUT_COMPLETED':
        return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      default:
        return <ArrowRight className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-3">
      {events.map((ev, idx) => (
        <div
          key={ev.id || idx}
          className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs"
        >
          <div className="p-1.5 rounded-md bg-slate-800/80 shrink-0 mt-0.5">
            {getEventIcon(ev.event_type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                {ev.event_type.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(ev.created_at).toLocaleTimeString()}
              </span>
            </div>
            <pre className="mt-1 text-[11px] text-slate-400 overflow-x-auto whitespace-pre-wrap font-mono bg-slate-950/40 p-1.5 rounded border border-slate-900">
              {JSON.stringify(ev.details, null, 2)}
            </pre>
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
};
