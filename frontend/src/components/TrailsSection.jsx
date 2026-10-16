"use client";

// Food trails for a city (GET /api/trails?city=<slug>, CONTRACT §5). Premium trails arrive locked
// (no stops) for viewers without Premium. The section is hidden when a city has no trails.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Route, Lock, Crown, Clock, IndianRupee, MapPin, ChevronDown } from 'lucide-react';
import { api } from '../lib/api';
import { useConfig } from '../context/ConfigContext';

const PLACEHOLDER = '/city-placeholder.svg';

function normStops(stops) {
  return (Array.isArray(stops) ? stops : [])
    .map((s) => (typeof s === 'string' ? { name: s } : s))
    .filter((s) => s && (s.name || s.vendor_id));
}

function TrailCard({ trail }) {
  const premiumOn = useConfig().premium.enabled;
  const [open, setOpen] = useState(false);
  const locked = !!trail.locked;
  const stops = normStops(trail.stops);
  const stopCount = trail.stop_count ?? trail.stops_count ?? stops.length;
  const duration = trail.duration_text || trail.duration || null;
  const price = trail.price_text || trail.budget || null;
  const img = trail.image_url || PLACEHOLDER;

  return (
    <div className="card flex flex-col h-full">
      <div className="relative h-40 overflow-hidden bg-stone-200">
        <img src={img} alt="" className={`w-full h-full object-cover ${locked ? 'blur-md scale-110' : ''}`} onError={(e) => { e.currentTarget.src = PLACEHOLDER; }} />
        <div className={`absolute inset-0 ${locked ? 'bg-stone-900/40' : 'bg-gradient-to-t from-stone-900/50 to-transparent'}`} />
        {locked ? (
          <>
            <span className="absolute top-3 left-3 bg-amber-400 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Crown size={10} /> Premium trail
            </span>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-11 h-11 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                <Lock size={18} className="text-stone-800" />
              </div>
            </div>
          </>
        ) : (
          premiumOn && trail.is_premium && (
            <span className="absolute top-3 left-3 bg-amber-400 text-stone-900 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Crown size={10} /> Premium
            </span>
          )
        )}
      </div>

      <div className="p-4 bg-white flex flex-col flex-1 gap-2">
        <h3 className="font-extrabold text-stone-900 text-[15px] leading-tight break-words">{trail.title}</h3>
        {trail.description && <p className="text-[13px] text-stone-500 m-0 line-clamp-3 break-words">{trail.description}</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold text-stone-500">
          {duration && <span className="inline-flex items-center gap-1"><Clock size={11} className="text-brand-500" /> {duration}</span>}
          {price && <span className="inline-flex items-center gap-1"><IndianRupee size={11} className="text-brand-500" /> {price}</span>}
          {stopCount > 0 && <span className="inline-flex items-center gap-1"><MapPin size={11} className="text-brand-500" /> {stopCount} stops</span>}
        </div>

        <div className="mt-auto pt-2">
          {locked ? (
            <Link href="/premium" className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-full bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 transition-colors">
              <Lock size={12} /> Unlock with Premium
            </Link>
          ) : stops.length > 0 ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="w-full inline-flex items-center justify-center gap-1.5 min-h-[40px] rounded-full border border-stone-200 text-stone-700 text-xs font-bold hover:bg-stone-50 transition-colors"
              >
                {open ? 'Hide stops' : `See the ${stops.length} stops`} <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && (
                <ol className="mt-3 space-y-2">
                  {stops.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span className="w-5 h-5 rounded-full bg-brand-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <span className="min-w-0">
                        {s.vendor_id ? (
                          <Link href={`/vendor/${s.vendor_id}`} className="font-bold text-stone-800 hover:text-brand-600 break-words">{s.name || 'View stall'}</Link>
                        ) : (
                          <span className="font-bold text-stone-800 break-words">{s.name}</span>
                        )}
                        {s.note && <span className="block text-xs text-stone-500 break-words">{s.note}</span>}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function TrailsSection({ citySlug, cityId, cityName }) {
  const [trails, setTrails] = useState([]);

  useEffect(() => {
    if (!citySlug) return undefined;
    let alive = true;
    api(`/api/trails?city=${encodeURIComponent(citySlug)}`)
      .then((d) => {
        if (!alive) return;
        const list = (Array.isArray(d) ? d : d.trails || []).filter(
          (t) => t && t.title && t.is_active !== false && (cityId == null || t.city_id == null || t.city_id === cityId)
        );
        setTrails(list);
      })
      .catch(() => alive && setTrails([]));
    return () => {
      alive = false;
    };
  }, [citySlug, cityId]);

  if (!trails.length) return null;

  return (
    <div>
      <h2 className="text-[11px] font-black text-stone-400 tracking-[0.18em] uppercase mb-6 flex items-center gap-2">
        <Route size={13} className="text-brand-600" /> Food trails{cityName ? ` in ${cityName}` : ''}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {trails.map((t) => <TrailCard key={t.id} trail={t} />)}
      </div>
    </div>
  );
}
