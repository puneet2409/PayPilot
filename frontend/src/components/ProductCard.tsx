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
            ? 'border-2 border-[#0057FF] bg-blue-50/30 shadow-md ring-2 ring-blue-500/20 animate-pulse'
            : 'border-2 border-[#0057FF] bg-blue-50/20 shadow-md ring-2 ring-blue-500/15'
          : 'border-slate-200/90 bg-white hover:border-[#0057FF]/60 hover:shadow-md shadow-xs'
      }`}
    >
      <div>
        {/* Card Header: Badges & Price */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
            <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-blue-50 text-[#0057FF] border border-blue-200">
              #{product.rank} Best Match
            </span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${
              product.source === 'channel3'
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-purple-50 text-purple-700 border-purple-200'
            }`}>
              {product.source === 'channel3' ? 'Live Store Deal' : 'Featured Item'}
            </span>
            {product.demo_sku && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Instant Checkout
              </span>
            )}
            {product.within_budget === false && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Over budget
              </span>
            )}
          </div>

          <div className="text-left sm:text-right shrink-0">
            <div className="text-2xl font-black text-[#003087] tracking-tight">
              {product.currency} {product.price.toFixed(2)}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-start sm:justify-end mt-0.5 font-medium">
              <Tag className="w-3 h-3 text-slate-400" />
              <span>{product.source === 'demo_catalogue' ? 'PayPilot store price' : (product.merchant || 'Live store offer')}</span>
            </div>
          </div>
        </div>

        {/* Product Image Showcase */}
        <div className="mt-3.5 relative w-full h-44 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-3 group/img">
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
            className={`img-fallback ${product.image_url ? 'hidden' : 'flex'} flex-col items-center justify-center text-slate-400 gap-1.5`}
          >
            <Package className="w-10 h-10 text-slate-400 stroke-[1.5]" />
            <span className="text-[11px] font-medium text-slate-500">{product.brand || 'Product Item'}</span>
          </div>

          {/* Source badge overlay on image */}
          <div className="absolute top-2 left-2 pointer-events-none">
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/90 text-slate-700 backdrop-blur-xs border border-slate-200/80 shadow-2xs">
              {product.brand ? product.brand : product.source === 'channel3' ? (product.merchant || 'Channel3 Retailer') : 'PayPilot Store'}
            </span>
          </div>
        </div>

        <h3 className="text-base font-bold text-slate-900 mt-3 line-clamp-2 leading-snug">
          {product.title}
        </h3>

        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          {product.source === 'demo_catalogue'
            ? 'PayPilot verified store inventory. Guaranteed fixed price with PayPal sandbox checkout support.'
            : product.explanation}
        </p>
        {product.source === 'demo_catalogue' && product.demo_sku ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-blue-700 font-medium">
            ✓ Eligible for instant PayPal sandbox checkout.
          </p>
        ) : product.demo_sku ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-blue-700 font-medium">
            ✓ Store price verified with instant PayPal sandbox checkout.
          </p>
        ) : null}

        {/* Features badges */}
        <div className="mt-3 space-y-1">
          {product.verified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>Verified: {feat}</span>
            </div>
          ))}
          {product.unverified_features.map((feat, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
              <span>Unverified: {feat}</span>
            </div>
          ))}
        </div>

        {/* Multi-retailer offers from Channel3 */}
        {product.offers && product.offers.length > 1 && (
          <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
              <span>Store Price Comparison</span>
              <span className="text-[10px] text-[#0057FF] font-semibold">{product.offers.length} live offers</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {product.offers.map((off, oidx) => (
                <div key={oidx} className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-[11px] shadow-2xs">
                  <span className="text-slate-600 font-medium">{off.merchant}:</span>
                  <span className="font-bold text-[#003087]">${off.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Card Action Footer */}
      <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(product);
          }}
          disabled={isLoading && isSelected}
          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            isSelected
              ? 'bg-[#0057FF] text-white shadow-sm ring-1 ring-blue-400'
              : product.demo_sku
                ? 'bg-[#003087] hover:bg-[#002266] text-white shadow-2xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
          }`}
        >
          {isLoading && isSelected ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>Verifying Budget...</span>
            </>
          ) : isSelected ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              <span>Selected Item</span>
            </>
          ) : product.demo_sku ? (
            'Select for PayPal Checkout'
          ) : (
            'Check Budget & Rules'
          )}
        </button>

        {product.source === 'channel3' && product.buy_url && (
          <a
            href={product.buy_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors font-medium shrink-0"
            title={`Visit ${product.merchant || 'retail store'} to purchase`}
          >
            <span>Visit Store</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>
        )}
      </div>
    </div>
  );
};
