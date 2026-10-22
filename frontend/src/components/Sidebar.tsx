import React from 'react';
import {
  ShoppingBag,
  ShieldCheck,
  CreditCard,
  History,
  Layers,
  FileCode,
  X
} from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';

export type NavView = 'shop' | 'policies' | 'orders' | 'audit' | 'merchant';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  auditCount?: number;
  ordersCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  auditCount = 0,
  ordersCount = 0,
}) => {
  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'shop',
      label: 'Shop & Discover',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      id: 'policies',
      label: 'Purchase Guardrails',
      icon: <ShieldCheck className="w-4 h-4" />
    },
    {
      id: 'orders',
      label: 'Orders & Receipts',
      icon: <CreditCard className="w-4 h-4" />,
      badge: ordersCount > 0 ? ordersCount : undefined
    },
    {
      id: 'audit',
      label: 'Activity & Audit Log',
      icon: <History className="w-4 h-4" />,
      badge: auditCount > 0 ? auditCount : undefined
    },
    {
      id: 'merchant',
      label: 'Merchant Analytics',
      icon: <Layers className="w-4 h-4" />
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Logo & Close Button (mobile) */}
          <div className="flex items-center justify-between pb-3">
            <div
              onClick={() => {
                onSelectView('shop');
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="PayPilot — Consent-First Agentic Commerce"
            >
              <PayPalLogo className="w-7 h-8 group-hover:scale-105 transition-transform" />
              <div>
                <span className="text-xl font-extrabold tracking-tight text-[#001C3D] block leading-none">
                  PayPilot
                </span>
                <span className="text-[10px] font-bold text-[#0057FF] tracking-wide uppercase">
                  Agentic Commerce
                </span>
              </div>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Environment Status Pill */}
          <div className="mt-1 mb-6 flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 w-fit">
            <span className="px-3 py-1 rounded-full bg-[#003087] text-white text-[11px] font-bold shadow-2xs">
              Sandbox
            </span>
            <span className="px-3 py-1 text-slate-500 text-[11px] font-semibold">
              Live
            </span>
          </div>

          {/* PayPilot Feature Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#DCEBFE] text-[#003087]'
                      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#0057FF]' : 'text-slate-500'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                        isActive
                          ? 'bg-blue-200/80 text-[#003087]'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer: OpenAPI Docs & Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-2">
          <a
            href={`${import.meta.env.VITE_API_BASE_URL || ''}/docs`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-[#0057FF] transition-colors"
          >
            <FileCode className="w-4 h-4 text-[#0057FF]" />
            <span>OpenAPI 3.1 Spec</span>
          </a>
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 text-[11px] text-slate-500 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PayPal Orders v2 Connected</span>
          </div>
        </div>
      </aside>
    </>
  );
};
