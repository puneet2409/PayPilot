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
    <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-6 flex flex-col justify-between shadow-xl min-h-[310px]">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Smart Shopping Assistant</h3>
              <p className="text-[11px] text-slate-400">Tell me what you need, or set a maximum spending limit.</p>
            </div>
          </div>

          {hasActiveContent && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 transition-colors"
              title="Clear search and start fresh"
            >
              <RotateCcw className="w-3 h-3 text-blue-400" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
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
                  className={`text-xs py-2 px-2.5 rounded-xl border transition-all text-center flex items-center justify-center gap-1.5 font-medium ${
                    isThisActive
                      ? 'bg-blue-600/30 text-blue-200 border border-blue-400/50 shadow-sm shadow-blue-500/20'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                  }`}
                >
                  {isThisActive && <Loader2 className="w-3 h-3 animate-spin text-blue-300" />}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Agent Reply Box */}
        {agentReply && (
          <div className="mb-4 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-400">PayPilot Agent:</span>
              <div className="flex items-center gap-1.5">
                {agentReply.startsWith('Search error:') && lastMessage && (
                  <button
                    type="button"
                    onClick={() => onSendMessage(lastMessage.msg, lastMessage.budget)}
                    disabled={isLoading}
                    className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-medium flex items-center gap-1 transition-all disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 text-[10px] flex items-center gap-1 transition-colors"
                  title="Clear conversation"
                >
                  <RotateCcw className="w-2.5 h-2.5 text-blue-400" />
                  <span>Clear</span>
                </button>
              </div>
            </div>
            <ReactMarkdown
              components={{
                strong: ({children}) => <span className="font-semibold text-blue-300">{children}</span>,
                em: ({children}) => <span className="italic text-slate-300">{children}</span>,
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
              <div className="mt-3 pt-2.5 border-t border-blue-500/20">
                <span className="text-[10px] uppercase font-semibold text-blue-300 tracking-wider block mb-1.5">
                  Suggested Responses / Actions:
                </span>
                <div className="flex flex-wrap gap-1.5">
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
                        className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-medium flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
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
                        className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-medium transition-all disabled:opacity-50"
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
                        className="px-2.5 py-1 rounded bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-400/30 text-xs font-medium transition-all disabled:opacity-50"
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
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all disabled:opacity-50"
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
          <div className="mb-4 p-3.5 rounded-xl bg-blue-950/40 border border-blue-500/40 text-xs text-slate-200 shadow-lg shadow-blue-500/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
                </span>
                <span className="font-semibold text-blue-300">Finding Best Deals & Checking Your Budget...</span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono flex items-center gap-1">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-300" /> Searching
              </span>
            </div>
            <p className="text-slate-300 text-[11px] mb-2.5">
              Finding the best prices for <span className="text-white font-medium">"{inputMessage || lastMessage?.msg || 'Product query'}"</span> across 25,000+ stores.
            </p>
            {/* Step Indicators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="px-3 py-2 rounded-xl bg-blue-900/40 border border-blue-500/40 text-blue-200 flex items-center gap-2 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                <span className="font-medium">1. Understanding Request</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-sky-900/40 border border-sky-500/50 text-sky-200 flex items-center gap-2 shadow-sm animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-300 shrink-0" />
                <span className="font-medium">2. Searching 25k+ Stores</span>
              </div>
              <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-600 shrink-0"></span>
                <span className="font-medium">3. Checking Budget</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-2 space-y-2">
        <div className="flex gap-2.5">
          <div className="relative w-36 shrink-0">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Max Budget"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              disabled={isDisabled || isLoading}
              className="w-full pl-8 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
          <input
            type="text"
            placeholder="e.g. Wireless headset under $100 with noise cancelling..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isDisabled || isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
          />

          {hasActiveContent && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isLoading}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/70 text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0"
              title="Clear input and reset results"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isDisabled || isLoading || !inputMessage.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-lg shadow-blue-600/25 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-blue-200" />
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
        <p className="text-[11px] text-slate-400 mt-1">
          💡 <span className="text-slate-300 font-medium">To reply to the agent:</span> adjust the <code className="text-blue-300 px-1 py-0.5 rounded bg-slate-800">Max $</code> box, type a follow-up, or click any suggested response chip above.
        </p>
      </form>
    </div>
  );
};
