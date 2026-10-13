import React, { useState } from 'react';
import { Send, Sparkles, DollarSign, Loader2, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface ChatPanelProps {
  onSendMessage: (msg: string, budget?: number) => void;
  isLoading: boolean;
  agentReply: string | null;
}

const PRESET_GOALS = [
  {
    label: "Headset under $100",
    query: "Find a wireless headset under $100 with multipoint Bluetooth and a good mic",
    budget: 100
  },
  {
    label: "Headset under $50 (Test Policy Block)",
    query: "Find a wireless headset under $50 with active noise cancelling",
    budget: 50
  },
  {
    label: "Mouse under $110",
    query: "Find a quiet wireless mouse under $110 for productivity",
    budget: 110
  },
  {
    label: "USB-C Dock under $150",
    query: "Find a USB-C docking station under $150 with triple display",
    budget: 150
  }
];

export const ChatPanel: React.FC<ChatPanelProps> = ({
  onSendMessage,
  isLoading,
  agentReply
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [budgetInput, setBudgetInput] = useState<string>('100');
  const [lastMessage, setLastMessage] = useState<{msg: string, budget?: number} | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;
    const numBudget = budgetInput ? parseFloat(budgetInput) : undefined;
    setLastMessage({ msg: inputMessage.trim(), budget: numBudget });
    onSendMessage(inputMessage.trim(), numBudget);
  };

  const handleSelectPreset = (preset: typeof PRESET_GOALS[0]) => {
    setInputMessage(preset.query);
    setBudgetInput(preset.budget.toString());
    setLastMessage({ msg: preset.query, budget: preset.budget });
    onSendMessage(preset.query, preset.budget);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Shopper Intent Assistant</h3>
            <p className="text-[11px] text-slate-400">Describe what you need, set your budget limit.</p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
            Quick Scenarios
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_GOALS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className="text-xs px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all text-left"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Agent Reply Box */}
        {agentReply && (
          <div className="mb-4 p-3.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-slate-200 leading-relaxed">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-blue-400">PayPilot Agent:</span>
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
          </div>
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="mt-2 space-y-2">
        <div className="flex gap-2">
          <div className="relative w-28 shrink-0">
            <DollarSign className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="number"
              placeholder="Budget"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="w-full pl-7 pr-2 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <input
            type="text"
            placeholder="e.g. Wireless headset under $100 with multipoint Bluetooth..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Search</span>
          </button>
        </div>
      </form>
    </div>
  );
};
