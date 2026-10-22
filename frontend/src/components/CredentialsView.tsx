import React, { useState } from 'react';
import { AlertCircle, Info, Copy, Eye, EyeOff, Check, Plus, Settings, MoreVertical, KeyRound } from 'lucide-react';

interface CredentialsViewProps {
  paypalConfigured?: boolean;
  channel3Configured?: boolean;
}

export const CredentialsView: React.FC<CredentialsViewProps> = ({
  paypalConfigured = true,
  channel3Configured = true,
}) => {
  const [showSecretPayPilot, setShowSecretPayPilot] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'BAAwdjOB6fcbajX4XzFaBP9k8w_SANDBOX_ID';
  const maskedSecret = '••••••••••••••••••••••••••••••••••••••••';
  const realSecretDemo = 'EK5_q82m049xLo_PAYPILOT_SANDBOX_SECRET_KEY';

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold text-[#001C3D]">API Credentials</h1>
        <button className="px-4 py-2 rounded-full bg-[#001435] hover:bg-[#002568] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          <span>Create App</span>
        </button>
      </div>

      {/* Yellow Warning Banner (Matching PayPal Developer Dashboard) */}
      <div className="rounded-lg bg-[#FFF0D4] border border-[#F5C26B] p-3.5 flex items-center gap-3 text-xs text-[#6B4700]">
        <AlertCircle className="w-4 h-4 shrink-0 text-[#B87A00]" />
        <span>
          Viewing sandbox API credentials.{' '}
          <button className="font-bold underline hover:text-black">View live credentials.</button>
        </span>
      </div>

      {/* REST API apps Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-[#001C3D]">REST API apps</h2>

        {/* Info Callout */}
        <div className="rounded-lg bg-slate-100 p-3.5 flex items-center gap-3 text-xs text-slate-700">
          <Info className="w-4 h-4 shrink-0 text-slate-500" />
          <span>Important: Store credentials safely, and never share client IDs or secrets publicly.</span>
        </div>

        {/* Credentials Table */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">App name ↑</th>
                <th className="py-3 px-4">Client ID</th>
                <th className="py-3 px-4">Secret</th>
                <th className="py-3 px-4">Date and time ↓</th>
                <th className="py-3 px-4 text-right">
                  <Settings className="w-3.5 h-3.5 inline text-slate-400" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* PayPilot App Row */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#0057FF] hover:underline cursor-pointer">
                  PayPilot
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>{clientId.slice(0, 18)}...</span>
                    <button
                      onClick={() => copyToClipboard(clientId, 'client_id')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      title="Copy Client ID"
                    >
                      {copiedField === 'client_id' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>{showSecretPayPilot ? realSecretDemo.slice(0, 16) + '...' : maskedSecret}</span>
                    <button
                      onClick={() => setShowSecretPayPilot(!showSecretPayPilot)}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      title={showSecretPayPilot ? 'Hide Secret' : 'Show Secret'}
                    >
                      {showSecretPayPilot ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(realSecretDemo, 'secret')}
                      className="p-1 rounded hover:bg-slate-200 text-slate-500"
                      title="Copy Secret"
                    >
                      {copiedField === 'secret' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-500">22/10/26, 1:10 a.m.</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                    <MoreVertical className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>

              {/* Default Application Row */}
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#0057FF] hover:underline cursor-pointer">
                  Default Application
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>AXw_Wqoa0YiXK-WYj4...</span>
                    <button className="p-1 rounded hover:bg-slate-200 text-slate-500">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-700">
                  <div className="flex items-center gap-2">
                    <span>{maskedSecret}</span>
                    <button className="p-1 rounded hover:bg-slate-200 text-slate-500">
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button className="p-1 rounded hover:bg-slate-200 text-slate-500">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="py-3.5 px-4 text-slate-500">22/10/26, 12:47 a.m.</td>
                <td className="py-3.5 px-4 text-right">
                  <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700">
                    <MoreVertical className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Partner Integrations Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-[#001C3D] flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#0057FF]" />
          Connected Integrations Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-slate-800">PayPal Orders v2 API</div>
              <div className="text-[11px] text-slate-500">Sandbox Environment</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {paypalConfigured ? 'Connected' : 'Simulated'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-slate-800">Channel3 Discovery API</div>
              <div className="text-[11px] text-slate-500">25,000+ Stores Indexed</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
              {channel3Configured ? 'Live' : 'Cached'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="font-semibold text-xs text-slate-800">Gemini 2.0 Flash AI</div>
              <div className="text-[11px] text-slate-500">Intent & Synthesis Engine</div>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#003087]">
              Active
            </span>
          </div>
        </div>
      </div>

      {/* NVP/SOAP API apps */}
      <div className="space-y-1 text-xs text-slate-500">
        <h3 className="font-bold text-slate-700">NVP/SOAP API apps</h3>
        <p>Use the Live environment toggle to access this feature.</p>
      </div>
    </div>
  );
};
