import React from 'react';
import {
  Home,
  Layers,
  BookOpen,
  FileText,
  Code,
  FlaskConical,
  HelpCircle,
  ChevronRight,
  Video,
  Wrench,
  X
} from 'lucide-react';
import { PayPalLogo } from './PayPalLogo';

export type NavView = 'home' | 'credentials' | 'policies' | 'logs' | 'analytics' | 'docs';

interface SidebarProps {
  currentView: NavView;
  onSelectView: (view: NavView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  auditCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  isOpenMobile,
  onCloseMobile,
  auditCount = 0
}) => {
  const navItems: { id: NavView; label: string; icon: React.ReactNode; hasChevron?: boolean; badge?: string | number }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'credentials', label: 'Apps & Credentials', icon: <Layers className="w-4 h-4" /> },
    { id: 'policies', label: 'Testing Tools', icon: <FlaskConical className="w-4 h-4" />, hasChevron: true },
    { id: 'logs', label: 'Event Logs', icon: <BookOpen className="w-4 h-4" />, hasChevron: true, badge: auditCount > 0 ? auditCount : undefined },
  ];

  const secondaryNavItems: { id: NavView; label: string; icon: React.ReactNode; hasChevron?: boolean }[] = [
    { id: 'docs', label: 'Docs', icon: <FileText className="w-4 h-4" />, hasChevron: true },
    { id: 'analytics', label: 'CFO & APIs', icon: <Code className="w-4 h-4" />, hasChevron: true },
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
            <div className="flex items-center gap-2">
              <PayPalLogo className="w-7 h-8" />
              <span className="text-xl font-extrabold tracking-tight text-[#001C3D]">PayPal</span>
            </div>
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sandbox / Live Toggle Pill (Exact PayPal Design) */}
          <div className="mt-1 mb-6 flex items-center bg-slate-100 p-0.5 rounded-full border border-slate-200 w-fit">
            <span className="px-3.5 py-1 rounded-full bg-[#001435] text-white text-[11px] font-bold shadow-2xs">
              Sandbox
            </span>
            <span className="px-3.5 py-1 text-slate-500 text-[11px] font-semibold">
              Live
            </span>
          </div>

          {/* Main Navigation List */}
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
                  <div className="flex items-center gap-1.5">
                    {item.badge && (
                      <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-[#003087] font-mono text-[10px] font-bold">
                        {item.badge}
                      </span>
                    )}
                    {item.hasChevron && (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}

            <div className="pt-3 pb-1 border-t border-slate-100 my-2" />

            {secondaryNavItems.map((item) => {
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
                  {item.hasChevron && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </button>
              );
            })}

            {/* Additional Developer Portal Links */}
            <div className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 text-slate-400" />
                <span>Tools</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>

            <div className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <Video className="w-4 h-4 text-slate-400" />
                <span>Video Library</span>
              </div>
            </div>

            <div className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-slate-600 hover:bg-slate-50 rounded-xl cursor-pointer">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-4 h-4 text-slate-400" />
                <span>Help & Guide</span>
              </div>
            </div>
          </nav>
        </div>

        {/* Sidebar Footer: Architecture Badge */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-slate-700">Orders v2 Connected</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Deterministic AI Guardrails Active
          </p>
        </div>
      </aside>
    </>
  );
};
