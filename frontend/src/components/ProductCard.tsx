import React from 'react';
import type { RankedCandidate } from '../types';
import { CheckCircle2, AlertCircle, ExternalLink, ShieldCheck, Tag, Loader2, Package } from 'lucide-react';

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
      onClick={() => onSelect(product)}
      className={`rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between cursor-pointer select-none ${
        isSelected
          ? isLoading
            ? 'border-blue-400 bg-slate-900/95 shadow-xl shadow-blue-500/20 ring-2 ring-blue-400 animate-pulse'
            : 'border-blue-500 bg-slate-900/95 shadow-xl shadow-blue-500/20 ring-2 ring-blue-500'
          : 'border-slate-800 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900/75'
      }`}
    >
      <div>
        {/* Card Header: Badges & Price (Responsive, No Overlap) */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
              #{product.rank} Best Match
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
              product.source === 'channel3'
                ? 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                : 'bg-violet-500/10 text-violet-300 border-violet-500/20'
            }`}>
              {product.source === 'channel3' ? 'Live Store Deal' : 'Featured Item'}
            </span>
            {product.demo_sku && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Instant Checkout
              </span>
            )}
            {product.within_budget === false && (
              <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Over budget
              </span>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-xl font-bold text-emerald-400 tracking-tight">
              {product.currency} {product.price.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-start sm:justify-end mt-0.5">
              <Tag className="w-3 h-3 text-slate-500" />
              <span>{product.source === 'demo_catalogue' ? 'PayPilot store price' : (product.merchant || 'Live store offer')}</span>
            </div>
          </div>
        </div>

        {/* Product Image Container */}
        <div className="mt-3.5 relative w-full h-44 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-center overflow-hidden p-3 group/img">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              loading="lazy"
              className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover/img:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
                const parent = e.currentTarget.parentElement;
                const fallback = parent?.querySelector('.img-fallback') as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <div
            className={`img-fallback ${product.image_url ? 'hidden' : 'flex'} flex-col items-center justify-center text-slate-500 gap-1.5`}
          >
            <Package className="w-10 h-10 text-slate-600 stroke-[1.5]" />
            <span className="text-[11px] font-medium text-slate-500">{product.brand || 'Product Item'}</span>
          </div>

          {/* Quick source badge on bottom left of image */}
          <div className="absolute bottom-2 left-2 pointer-events-none">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-900/80 text-slate-300 backdrop-blur-sm border border-slate-700/50">
              {product.brand ? product.brand : product.source === 'channel3' ? (product.merchant || 'Channel3 Retailer') : 'PayPilot Store'}
            </span>
          </div>
        </div>

        <h3 className="text-base font-semibold text-slate-100 mt-3.5 line-clamp-2 leading-snug">
          {product.title}
        </h3>

        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
          {product.source === 'demo_catalogue'
            ? 'PayPilot verified store inventory. Guaranteed fixed price with PayPal sandbox checkout support.'
            : product.explanation}
        </p>
        {product.source === 'demo_catalogue' && product.demo_sku ? (
          <p className="mt-2 text-[11px] leading-relaxed text-indigo-300/80">
            ✓ Eligible for instant PayPal sandbox checkout.
          </p>
        ) : product.demo_sku ? (
          <p className="mt-2 text-[11px] leading-relaxed text-indigo-300/80">
            ✓ Store price verified with instant PayPal sandbox checkout.
          </p>
        ) : null}

        {/* Features badges */}
        <div className="mt-3.5 space-y-1.5">
          {product.verified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Verified: {feat}</span>
            </div>
          ))}
          {product.unverified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-400/90">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Unverified: {feat}</span>
            </div>
          ))}
        </div>

        {/* Multi-retailer offers from Channel3 */}
        {product.offers && product.offers.length > 1 && (
          <div className="mt-3.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
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

      {/* Card Action Footer */}
      <div className="mt-5 pt-3.5 border-t border-slate-800/80 flex items-center justify-between gap-2.5">
        {product.source === 'channel3' && product.buy_url ? (
          <a
            href={product.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition-colors"
          >
            <span>Visit {product.merchant || 'Store'}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </a>
        ) : (
          <div />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          disabled={isLoading && isSelected}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shrink-0 ${
            isSelected
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 ring-1 ring-blue-400'
              : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700/60'
          }`}
        >
          {isLoading && isSelected ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Verifying Budget...</span>
            </>
          ) : isSelected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selected Item</span>
            </>
          ) : product.demo_sku ? (
            'Select for PayPal Checkout'
          ) : (
            'Check Budget & Rules'
          )}
        </button>
      </div>
    </div>
  );
};
