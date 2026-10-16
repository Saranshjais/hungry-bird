"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Search, Star, UtensilsCrossed, RefreshCw, Crown } from 'lucide-react';
import { motion } from 'motion/react';
import { api, errorMessage } from '../../lib/api';
import { formatRating, isLocked, vendorArea, vendorCuisine, vendorImage } from '../../lib/vendors';
import LockedVendorCard from '../../components/vendors/LockedVendorCard';
import { useConfig } from '../../context/ConfigContext';

function ResultCard({ vendor }) {
  const premiumOn = useConfig().premium.enabled;
  if (isLocked(vendor)) return <LockedVendorCard vendor={vendor} />;
  const img = vendorImage(vendor);
  const rating = formatRating(vendor);
  const where = [vendorArea(vendor), vendor.city_name || vendor.city?.name].filter(Boolean).join(', ');
  const cuisine = vendorCuisine(vendor);

  return (
    <Link href={`/vendor/${vendor.id}`} className="block group h-full">
      <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-300 h-full flex flex-col">
        <div className="h-48 bg-stone-200 relative overflow-hidden">
          {img ? (
            <img
              src={img}
              alt={vendor.name || ''}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
              <UtensilsCrossed className="w-10 h-10 text-stone-300" />
            </div>
          )}

          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
            <Star size={12} className="fill-brand-500 text-brand-500" />
            {rating || 'New'}
          </div>

          <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5">
            {premiumOn && vendor.is_premium && (
              <div className="bg-amber-400 text-stone-900 px-3 py-1 rounded-full text-xs font-bold shadow-sm flex items-center gap-1">
                <Crown size={11} /> Premium
              </div>
            )}
            {vendor.is_hidden_gem && (
              <div className="bg-brand-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                Hidden Gem
              </div>
            )}
          </div>
        </div>

        <div className="p-6 flex-1">
          <h3 className="text-xl font-bold text-stone-900 mb-1 group-hover:text-brand-500 transition-colors break-words">
            {vendor.name}
          </h3>
          {where && (
            <div className="flex items-center gap-2 text-stone-500 text-sm mb-4">
              <MapPin size={14} className="text-brand-500 flex-shrink-0" />
              <span className="truncate">{where}</span>
            </div>
          )}
          {cuisine && (
            <div className="bg-stone-50 text-stone-600 px-3 py-1.5 rounded-xl text-sm font-medium inline-block max-w-full truncate">
              {cuisine}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = (searchParams.get('q') || '').trim();
  const [input, setInput] = useState(query);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(!!query);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => setInput(query), [query]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      setLoading(false);
      return undefined;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    api(`/api/search?q=${encodeURIComponent(query)}`, { timeout: 30000 })
      .then(data => alive && setResults(data.results || []))
      .catch(err => alive && setError(err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [query, attempt]);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen bg-stone-50 pt-28 pb-20 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2">
          Search Results
        </h1>
        {query && (
          <p className="text-stone-500 font-medium mb-6 break-words">
            Showing results for <span className="text-brand-500 font-bold">"{query}"</span>
          </p>
        )}

        <form onSubmit={submit} role="search" className="relative mb-10 max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search stalls, dishes, areas..."
            aria-label="Search"
            className="w-full bg-white border-2 border-stone-100 rounded-2xl py-3 pl-11 pr-24 text-[15px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-500 shadow-sm"
          />
          <button type="submit" className="absolute right-1.5 top-1/2 -translate-y-1/2 btn-orange" style={{ minHeight: 40, padding: '0 1rem' }}>
            Search
          </button>
        </form>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-sm px-4">
            <h3 className="text-xl font-bold text-stone-900 mb-2">Search isn't working right now</h3>
            <p className="text-stone-500 mb-6">{errorMessage(error)}</p>
            <button type="button" onClick={() => setAttempt(a => a + 1)} className="btn-primary"><RefreshCw size={15} /> Try again</button>
          </div>
        ) : !query ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-100 shadow-sm px-4">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">What are you craving?</h3>
            <p className="text-stone-500">Search for a stall, a dish like "kachori", or an area.</p>
          </div>
        ) : results.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((vendor, index) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index, 10) * 0.06 }}
                key={vendor.id}
              >
                <ResultCard vendor={vendor} />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm px-4">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-stone-900 mb-2">No results found</h3>
            <p className="text-stone-500 break-words">We couldn't find anything matching "{query}". Try searching for another dish, area or stall name.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-stone-50 flex justify-center py-40"><div className="w-10 h-10 border-4 border-stone-200 border-t-brand-500 rounded-full animate-spin" /></div>}>
      <SearchResults />
    </Suspense>
  );
}
