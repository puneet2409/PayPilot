import React, { useState } from 'react';
import { Send, Sparkles, DollarSign, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { SuggestedAction } from '../types';

interface ChatPanelProps {
  onSendMessage: (msg: string, budget?: number) => void;
  isLoading: boolean;
  isDisabled?: boolean;
  agentReply: string | null;
  suggestedActions?: SuggestedAction[];
  onReset?: () => void;
}

const PRESET_GOALS = [
  {
    label: "🎧 Headset < $100",
    query: "Find a wireless headset under $100 with multipoint Bluetooth and a good mic",
    budget: 100
  },
  {
    label: "🛑 Test Budget Block ($50)",
    query: "Find a wireless headset under $50 with active noise cancelling",
    budget: 50
  },
  {
    label: "🖱️ Mouse < $110",
    query: "Find a quiet wireless mouse under $110 for productivity",
    budget: 110
  },
  {
    label: "🔌 USB-C Dock < $150",
    query: "Find a USB-C docking station under $150 with triple display",
    budget: 150
  }
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  isLoading,
  isDisabled = false,
  agentReply,
  suggestedActions = [],
  onReset
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [budgetInput, setBudgetInput] = useState<string>('');
  const [lastMessage, setLastMessage] = useState<{msg: string, budget?: number} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    const numBudget = budgetInput.trim() ? parseFloat(budgetInput) : undefined;
    setLastMessage({ msg: inputMessage.trim(), budget: numBudget });
    onSendMessage(inputMessage.trim(), numBudget);
  };

  const handleSelectPreset = (preset: typeof PRESET_GOALS[0]) => {
    setInputMessage(preset.query);
    setBudgetInput(preset.budget.toString());
    setLastMessage({ msg: preset.query, budget: preset.budget });
    onSendMessage(preset.query, preset.budget);
  };

  const handleReset = () => {
    setInputMessage('');
    setBudgetInput('');
    setLastMessage(null);
    onReset?.();
  };

  const hasActiveContent = Boolean(inputMessage || budgetInput || agentReply);

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-6 flex flex-col justify-between shadow-xs min-h-[310px]">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-[#0057FF] border border-blue-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#001C3D] tracking-tight">Smart Shopping Assistant</h3>
              <p className="text-xs text-slate-500">Describe your product need or set a maximum spending limit.</p>
            </div>
          </div>

          {hasActiveContent && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 transition-colors font-medium"
              title="Clear search and start fresh"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0057FF]" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Quick Scenarios
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESET_GOALS.map((preset, idx) => {
              const isThisActive = isLoading && lastMessage?.msg === preset.query;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isDisabled || isLoading}
                  className={`text-xs py-2 px-3 rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 font-semibold ${
                    isThisActive
                      ? 'bg-blue-50 text-[#0057FF] border-[#0057FF] shadow-xs'
                      : 'bg-slate-50 hover:bg-blue-50/70 text-slate-700 hover:text-[#003087] border-slate-200/90 hover:border-blue-300 shadow-2xs'
                  }`}
                >
                  {isThisActive && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057FF]" />}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent Reply Box */}
        {agentReply && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-800 leading-relaxed shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[#003087]">PayPilot Shopping Agent:</span>
              <div className="flex items-center gap-1.5">
                {agentReply.startsWith('Search error:') && lastMessage && (
                  <button
                    type="button"
                    onClick={() => onSendMessage(lastMessage.msg, lastMessage.budget)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-[#0057FF]" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
            <ReactMarkdown
              components={{
                strong: ({children}) => <span className="font-bold text-[#001C3D]">{children}</span>,
                em: ({children}) => <span className="italic text-slate-700">{children}</span>,
                p: ({children}) => <span>{children}</span>,
              }}
            >
              {agentReply}
            </ReactMarkdown>

            {/* Quick Action / Clarification Chips */}
            {((suggestedActions && suggestedActions.length > 0) ||
              agentReply.includes('adjust your budget') ||
              agentReply.includes('relax the budget') ||
              agentReply.includes('ceiling')) && (
              <div className="mt-3.5 pt-3 border-t border-blue-200">
                <span className="text-[11px] uppercase font-bold text-[#003087] tracking-wider block mb-1.5">
                  Suggested Responses / Actions:
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestedActions && suggestedActions.length > 0 ? (
                    suggestedActions.map((action, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (action.budget !== undefined) setBudgetInput(action.budget ? action.budget.toString() : '');
                          setInputMessage(action.query);
                          onSendMessage(action.query, action.budget);
                        }}
                        disabled={isLoading || isDisabled}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0057FF] border border-blue-200 text-xs font-semibold flex items-center gap-1 transition-all shadow-xs disabled:opacity-50"
                      >
                        <span>⚡ {action.label}</span>
                      </button>
                    ))
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          const newB = (parseFloat(budgetInput) || 50) + 25;
                          setBudgetInput(newB.toString());
                          onSendMessage(inputMessage || 'Find products', newB);
                        }}
                        disabled={isLoading || isDisabled}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0057FF] border border-blue-200 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                      >
                        ⚡ Increase Budget +$25
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const newB = (parseFloat(budgetInput) || 50) + 50;
                          setBudgetInput(newB.toString());
                          onSendMessage(inputMessage || 'Find products', newB);
                        }}
                        disabled={isLoading || isDisabled}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-[#0057FF] border border-blue-200 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
                      >
                        ⚡ Increase Budget +$50
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBudgetInput('');
                          onSendMessage(inputMessage || 'Find products', undefined);
                        }}
                        disabled={isLoading || isDisabled}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold transition-all disabled:opacity-50"
                      >
                        ⚡ Clear Budget Limit
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Active Search & Multi-Retailer Discovery Progress */}
        {isLoading && (
          <div className="mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200 text-xs text-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0057FF]"></span>
                </span>
                <span className="font-bold text-[#001C3D]">Finding Best Deals & Checking Your Budget...</span>
              </div>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-100 text-[#0057FF] border border-blue-200 font-semibold flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-[#0057FF]" /> Searching
              </span>
            </div>
            <p className="text-slate-600 text-xs mb-3">
              Scanning live retailer offers for <span className="text-slate-900 font-bold">"{inputMessage || lastMessage?.msg || 'Product query'}"</span> across 25,000+ stores.
            </p>
            {/* Step Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="px-3 py-2 rounded-xl bg-white border border-emerald-300 text-emerald-800 flex items-center gap-2 shadow-2xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <span>1. Parse Request</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-white border-2 border-[#0057FF] text-[#0057FF] flex items-center gap-2 shadow-xs font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0057FF] shrink-0" />
                <span>2. Search 25k+ Stores</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-500 flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                <span>3. Check Budget</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative w-full sm:w-36 shrink-0">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Max Budget"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              disabled={isDisabled || isLoading}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-semibold placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0057FF] focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <input
            type="text"
            placeholder="e.g. Wireless headset under $100 with noise cancelling..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isDisabled || isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 font-medium placeholder-slate-400 focus:bg-white focus:outline-none focus:border-[#0057FF] focus:ring-2 focus:ring-blue-500/20 transition-all"
          />

          {hasActiveContent && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shrink-0"
              title="Clear input and reset results"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0057FF]" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isDisabled || isLoading || !inputMessage.trim()}
            className="px-6 py-2.5 bg-[#0057FF] hover:bg-[#0043CE] active:bg-[#003087] disabled:opacity-50 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-md shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Search</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-slate-500 mt-1.5">
          💡 <span className="text-slate-700 font-medium">To reply to the assistant:</span> adjust the <code className="text-blue-700 px-1 py-0.5 rounded bg-blue-50 border border-blue-200 font-semibold">Max $</code> box, type a follow-up, or click any suggested response chip above.
        </p>
      </form>
    </div>
  );
};
