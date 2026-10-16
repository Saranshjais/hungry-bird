"use client";

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Loader2, MapPin, Star, ArrowLeft } from 'lucide-react';
import RequireAuth from '../../../components/RequireAuth';
import LockedVendorCard from '../../../components/vendors/LockedVendorCard';
import { api, errorMessage } from '../../../lib/api';
import { formatRating, isLocked, vendorArea, vendorCuisine, vendorImageOrPlaceholder } from '../../../lib/vendors';

function SavedCard({ vendor, onRemove }) {
  const [busy, setBusy] = useState(false);
  if (isLocked(vendor)) return <LockedVendorCard vendor={vendor} />;
  const rating = formatRating(vendor);
  const meta = [vendorCuisine(vendor), vendorArea(vendor) || vendor.city_name].filter(Boolean).join(' · ');

  const remove = async () => {
    setBusy(true);
    try {
      await api('/api/favorites/toggle', { method: 'POST', body: { vendor_id: vendor.id } });
      onRemove(vendor.id);
    } catch {
      setBusy(false);
    }
  };

  return (
    <div className="card flex flex-col h-full">
      <Link href={`/vendor/${vendor.id}`} className="relative h-40 overflow-hidden bg-stone-100 block">
        <img src={vendorImageOrPlaceholder(vendor)} alt={vendor.name || ''} loading="lazy" className="w-full h-full object-cover" />
      </Link>
      <div className="p-4 flex flex-col flex-1 gap-1">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/vendor/${vendor.id}`} className="font-extrabold text-stone-900 text-[15px] leading-tight hover:text-brand-600 break-words min-w-0">
            {vendor.name}
          </Link>
          {rating && <span className="star-badge flex-shrink-0"><Star size={10} className="inline fill-amber-500 text-amber-500 -mt-0.5" /> {rating}</span>}
        </div>
        {meta && <p className="text-xs text-stone-500 m-0 flex items-center gap-1"><MapPin size={11} className="text-brand-500 flex-shrink-0" /> <span className="truncate">{meta}</span></p>}
        <button
          type="button"
          onClick={remove}
          disabled={busy}
          className="mt-auto pt-3 inline-flex items-center gap-1.5 text-xs font-bold text-rose-500 hover:text-rose-600 py-2 w-fit"
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Heart size={13} className="fill-rose-500" />} Remove
        </button>
      </div>
    </div>
  );
}

function Favorites() {
  const [state, setState] = useState({ loading: true, error: '', list: [] });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    api('/api/favorites')
      .then((d) => setState({ loading: false, error: '', list: d.favorites || [] }))
      .catch((err) => setState({ loading: false, error: errorMessage(err), list: [] }));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-[#fdfbf9] pt-24 sm:pt-28 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/account" className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-stone-900 mb-4 py-1">
          <ArrowLeft size={15} /> Account
        </Link>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-1">Saved stalls</h1>
        <p className="text-sm text-stone-500 font-medium mb-8">Stalls you saved on the website or in the app.</p>

        {state.loading ? (
          <div className="flex justify-center py-20"><div className="w-9 h-9 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : state.error ? (
          <div className="panel bg-white p-8 text-center">
            <p className="text-red-500 text-sm mb-4">{state.error}</p>
            <button type="button" onClick={load} className="btn-primary">Try again</button>
          </div>
        ) : state.list.length === 0 ? (
          <div className="panel bg-white p-10 sm:p-16 text-center border-dashed">
            <Heart size={32} className="text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-extrabold text-stone-900 mb-2">Nothing saved yet</h3>
            <p className="text-stone-500 text-sm mb-6">Tap "Save stall" on any stall page to keep it here.</p>
            <Link href="/" className="btn-orange">Explore stalls</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {state.list.map((v) => (
              <SavedCard key={v.id} vendor={v} onRemove={(id) => setState((s) => ({ ...s, list: s.list.filter((x) => x.id !== id) }))} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function FavoritesPage() {
  return <RequireAuth><Favorites /></RequireAuth>;
}
