import React from 'react';
import {
  ShoppingBag,
  CreditCard,
  History,
  KeyRound,
  FileText,
  X
} from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';

export type NavView = 'home' | 'orders' | 'logs' | 'credentials' | 'docs';

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
      id: 'home',
      label: 'Shopping Assistant',
      icon: <ShoppingBag className="w-4 h-4" />
    },
    {
      id: 'orders',
      label: 'Orders & Payments',
      icon: <CreditCard className="w-4 h-4" />,
      badge: ordersCount > 0 ? ordersCount : undefined
    },
    {
      id: 'logs',
      label: 'Activity Log',
      icon: <History className="w-4 h-4" />,
      badge: auditCount > 0 ? auditCount : undefined
    },
    {
      id: 'credentials',
      label: 'API Credentials',
      icon: <KeyRound className="w-4 h-4" />
    },
    {
      id: 'docs',
      label: 'API Documentation',
      icon: <FileText className="w-4 h-4" />
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
          <div className="flex items-center justify-between pb-4">
            <div
              onClick={() => {
                onSelectView('home');
                onCloseMobile();
              }}
              className="flex items-center gap-2.5 cursor-pointer group"
              title="PayPilot Home"
            >
              <PayPalLogo className="w-7 h-8 group-hover:scale-105 transition-transform" />
              <div>
                <span className="text-xl font-extrabold tracking-tight text-[#001C3D] block leading-none">
                  PayPal
                </span>
                <span className="text-[10px] font-bold text-[#0057FF] tracking-wider uppercase">
                  PayPilot AI
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

          {/* Sandbox / Live Toggle Pill (Authentic PayPal Developer Design) */}
          <div className="mt-1 mb-6 flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 w-fit">
            <span className="px-3.5 py-1 rounded-full bg-[#001435] text-white text-[11px] font-bold shadow-2xs">
              Sandbox
            </span>
            <span className="px-3.5 py-1 text-slate-500 text-[11px] font-semibold">
              Live
            </span>
          </div>

          {/* Navigation Items (Real features only) */}
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

        {/* Sidebar Footer: Orders v2 Protocol Status */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-800">Orders v2 Sandbox</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Deterministic Spending Policies Active
          </p>
        </div>
      </aside>
    </>
  );
};
