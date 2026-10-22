import React from 'react';
import type { RankedCandidate } from '../types';
import { CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Tag, Loader2 } from 'lucide-react';

interface ProductCardProps {
  product: RankedCandidate;
  isSelected: boolean;
  isLoading?: boolean;
  onSelect: (product: RankedCandidate) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isSelected,
  isLoading = false,
  onSelect
}) => {
  return (
    <div
      className={`rounded-xl border transition-all duration-200 p-5 flex flex-col justify-between ${
        isSelected
          ? isLoading
            ? 'border-blue-400 bg-slate-900/90 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400 animate-pulse'
            : 'border-blue-500 bg-slate-900/90 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              #{product.rank} Best Match
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${product.source === 'channel3' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' : 'bg-violet-500/10 text-violet-300 border-violet-500/20'}`}>
              {product.source === 'channel3' ? 'Live Store Deal' : 'Featured Store Item'}
            </span>
            {product.demo_sku && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Instant Checkout
              </span>
            )}
            {product.within_budget === false && (
              <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Over budget
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-white">{product.currency} {product.price.toFixed(2)}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1 justify-end">
              <Tag className="w-3 h-3" /> {product.source === 'demo_catalogue' ? 'Demo-store price' : (product.merchant || 'Retailer offer')}
            </div>
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-100 mt-3 line-clamp-2">
          {product.title}
        </h3>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {product.source === 'demo_catalogue'
            ? 'Bundled PayPilot demo-store sample. The server checks the current catalogue price before creating a quote.'
            : product.explanation}
        </p>
        {product.source === 'demo_catalogue' && product.demo_sku ? (
          <p className="mt-2 text-[10px] leading-relaxed text-indigo-200/80">
            Bundled PayPilot sample product. This demo-store price is used for the policy check and PayPal sandbox order.
          </p>
        ) : product.demo_sku ? (
          <p className="mt-2 text-[10px] leading-relaxed text-indigo-200/80">
            Retailer offer for comparison. Policy and PayPal checkout use the PayPilot demo-store price shown after selection.
          </p>
        ) : null}

        {/* Features badges */}
        <div className="mt-4 space-y-1.5">
          {product.verified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Verified: {feat}</span>
            </div>
          ))}
          {product.unverified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Unverified: {feat}</span>
            </div>
          ))}
        </div>

        {/* Multi-retailer offers from Channel3 */}
        {product.offers && product.offers.length > 1 && (
          <div className="mt-3.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
            <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>Store Price Comparison</span>
              <span className="text-[10px] text-sky-400 font-mono font-medium">{product.offers.length} live offers</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.offers.map((off, oidx) => (
                <div key={oidx} className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                  <span className="text-slate-400 font-medium">{off.merchant}:</span>
                  <span className="font-semibold text-emerald-400">${off.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
        {product.source === 'channel3' && product.buy_url && (
          <a
            href={product.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
          >
            <span>Retailer link</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}

        {product.demo_sku ? (
          <button
            onClick={() => onSelect(product)}
            disabled={isLoading && isSelected}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {isLoading && isSelected ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Verifying Budget...</span>
              </>
            ) : isSelected ? (
              'Selected for Purchase'
            ) : (
              'Select to Verify & Buy'
            )}
          </button>
        ) : product.buy_url ? (
          <a
            href={product.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 transition-all flex items-center gap-1.5"
          >
            <span>Buy on {product.merchant || 'Retailer'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <span className="text-xs text-slate-500 italic py-1">Retailer comparison</span>
        )}
      </div>
    </div>
  );
};
