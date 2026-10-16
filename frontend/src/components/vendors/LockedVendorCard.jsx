"use client";

// Preview of a premium vendor for viewers without Premium (CONTRACT §4): the API sends no name,
// address or coordinates — only area, category, rating, price level and a photo.

import Link from 'next/link';
import { Lock, Star, Crown } from 'lucide-react';
import { formatRating, ratingCount, vendorArea, vendorCategory, vendorImageOrPlaceholder } from '../../lib/vendors';

export function lockedMeta(v) {
  return [vendorArea(v), vendorCategory(v)].filter(Boolean).join(' · ');
}

export function LockedRating({ vendor, className = '' }) {
  const r = formatRating(vendor);
  if (!r) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md ${className}`}>
      <Star size={11} className="fill-amber-500 text-amber-500" /> {r}
      <span className="font-semibold text-amber-600/80">({ratingCount(vendor)})</span>
    </span>
  );
}

export default function LockedVendorCard({ vendor, variant = 'grid', className = '' }) {
  const meta = lockedMeta(vendor);

  if (variant === 'row') {
    return (
      <Link
        href="/premium"
        className={`flex items-center gap-3 bg-white panel p-3 hover:-translate-y-0.5 transition-transform ${className}`}
        aria-label={`Premium hidden gem${meta ? ` — ${meta}` : ''}. Unlock with Premium`}
      >
        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-stone-200 flex-shrink-0">
          <img src={vendorImageOrPlaceholder(vendor)} alt="" className="w-full h-full object-cover blur-md scale-110" />
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/30">
            <Lock size={16} className="text-white" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="font-bold text-stone-900 text-sm truncate flex items-center gap-1">
            <Crown size={12} className="text-amber-500 flex-shrink-0" /> Premium hidden gem
          </p>
          {meta && <p className="text-stone-400 text-xs truncate">{meta}</p>}
          <p className="text-brand-600 text-[11px] font-bold">Unlock with Premium</p>
        </div>
      </Link>
    );
  }

  return (
    <div className={`card group flex flex-col h-full ${className}`}>
      <Link href="/premium" className="relative h-48 overflow-hidden bg-stone-200 block" tabIndex={-1} aria-hidden="true">
        <img src={vendorImageOrPlaceholder(vendor)} alt="" className="w-full h-full object-cover blur-lg scale-110" />
        <div className="absolute inset-0 bg-stone-900/35" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
            <Lock size={20} className="text-stone-800" />
          </div>
        </div>
        <span className="absolute top-3 left-3 bg-amber-400 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
          <Crown size={10} /> Premium
        </span>
        {vendor.price_level && (
          <span className="absolute bottom-3 left-3 bg-white/90 text-stone-800 text-[10px] font-black px-2 py-0.5 rounded-md">{vendor.price_level}</span>
        )}
      </Link>
      <div className="p-4 bg-white flex flex-col flex-1 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-extrabold text-stone-900 text-[15px] leading-tight">Premium hidden gem</h3>
          <LockedRating vendor={vendor} className="flex-shrink-0" />
        </div>
        {meta && <p className="text-[12px] font-medium text-stone-500 m-0 break-words">{meta}</p>}
        <Link
          href="/premium"
          className="mt-auto inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-full bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors"
        >
          <Lock size={12} /> Unlock with Premium
        </Link>
      </div>
    </div>
  );
}
