"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  motion, AnimatePresence, useInView
} from 'motion/react';
import axios from 'axios';
import {
  MapPin, Star, Sparkles, ChevronLeft, Clock, Flame, Search,
  ChevronRight, UtensilsCrossed, Navigation, X
} from 'lucide-react';

/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 85, damping: 18 } },
};
const staggerGrid = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

/* ── Vendor Card ── */
function VendorCard({ vendor, onSelect, isSelected }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      onClick={() => onSelect(vendor)}
      className={`card group cursor-pointer relative transition-all duration-200 ${
        isSelected ? 'ring-2 ring-brand-500/60 border-transparent' : ''
      }`}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={vendor.image_url}
          alt={vendor.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={e => {
            e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=400&auto=format&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />

        {/* Rating badge */}
        <div className="absolute top-3 right-3">
          <span className="star-badge text-[11px] px-2 py-0.5">
            ★ {vendor.rating ? vendor.rating.toFixed(1) : '4.0'}
          </span>
        </div>

        {/* Hidden gem */}
        {vendor.is_hidden_gem && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] font-black bg-brand-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <Sparkles size={8} /> Hidden Gem
            </span>
          </div>
        )}

        {/* Location pin bottom */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] text-white/90 flex items-center gap-1 font-semibold">
            <MapPin size={10} className="text-amber-400" />
            {vendor.area || 'Jaipur'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-extrabold text-stone-900 text-[15px] leading-tight mb-2.5 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {vendor.name}
        </h3>

        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-stone-500 bg-stone-100 px-2.5 py-1 rounded-full">
            {vendor.cuisine_type || 'Street Food'}
          </span>
          <span className="text-[10px] text-stone-400 flex items-center gap-1">
            <Clock size={10} /> 20–30 min
          </span>
        </div>
      </div>

      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute inset-0 rounded-[1.25rem] ring-2 ring-brand-500/60 pointer-events-none" />
      )}
    </motion.div>
  );
}

/* ── Vendor Detail Panel ── */
function VendorDetail({ vendor, onClose, apiKey }) {
  if (!vendor) return null;

  const mapSrc = apiKey && vendor.lat && vendor.lng
    ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${vendor.lat},${vendor.lng}&zoom=16`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      className="panel overflow-hidden flex flex-col bg-white"
    >
      {/* Image */}
      <div className="relative h-52 flex-shrink-0 overflow-hidden rounded-t-[1.5rem]">
        <img
          src={vendor.image_url}
          alt={vendor.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/70 to-transparent" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X size={15} />
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="font-extrabold text-white text-xl leading-tight line-clamp-2">
            {vendor.name}
          </h2>
        </div>
      </div>

      {/* Details */}
      <div className="p-5 flex flex-col gap-4 flex-1 overflow-y-auto">
        {/* Meta row */}
        <div className="flex flex-wrap gap-2">
          <span className="star-badge">★ {vendor.rating?.toFixed(1) || '4.0'}</span>
          {vendor.cuisine_type && (
            <span className="text-[11px] font-bold bg-brand-50 text-brand-600 px-2.5 py-1 rounded-full border border-brand-100">
              {vendor.cuisine_type}
            </span>
          )}
          {vendor.price_level && (
            <span className="text-[11px] font-bold bg-stone-100 text-stone-500 px-2.5 py-1 rounded-full">
              {vendor.price_level}
            </span>
          )}
        </div>

        {/* Address */}
        {vendor.address && (
          <div className="flex items-start gap-2 text-stone-500 text-xs">
            <MapPin size={13} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed">{vendor.address}</span>
          </div>
        )}

        {/* Description */}
        {vendor.description && (
          <p className="text-stone-500 text-xs leading-relaxed border-t border-stone-100 pt-4">
            {vendor.description}
          </p>
        )}

        {/* Mini map */}
        {mapSrc ? (
          <div className="rounded-xl overflow-hidden flex-shrink-0" style={{ height: 180 }}>
            <iframe
              width="100%" height="100%"
              style={{ border: 0 }}
              referrerPolicy="no-referrer-when-downgrade"
              src={mapSrc}
              allowFullScreen
            />
          </div>
        ) : (
          <div className="rounded-xl bg-stone-50 flex items-center justify-center text-stone-400 text-xs border border-stone-200" style={{ height: 120 }}>
            No map data
          </div>
        )}

        {/* CTA */}
        {vendor.lat && vendor.lng && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${vendor.lat},${vendor.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary justify-center gap-2 text-sm"
            style={{ minHeight: 44 }}
          >
            <Navigation size={15} />
            Get Directions
          </a>
        )}
      </div>
    </motion.div>
  );
}

const CUISINE_FILTERS = [
  { name: 'All', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=150&auto=format&fit=crop' },
  { name: 'Street Food', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=150&auto=format&fit=crop' },
  { name: 'Sweets', image: 'https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=150&auto=format&fit=crop' },
  { name: 'Biryani', image: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=150&auto=format&fit=crop' },
  { name: 'Momos', image: 'https://images.unsplash.com/photo-1626779848574-e84b2cd4ea0e?q=80&w=150&auto=format&fit=crop' },
  { name: 'Chaat', image: 'https://images.unsplash.com/photo-1605333396914-2314d2009ffa?q=80&w=150&auto=format&fit=crop' },
  { name: 'Pav Bhaji', image: 'https://images.unsplash.com/photo-1606491956689-2ea8869920cc?q=80&w=150&auto=format&fit=crop' },
  { name: 'Beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?q=80&w=150&auto=format&fit=crop' }
];

const SECONDARY_FILTERS = ['All', 'Near & Fast', 'Hidden Gems', 'Gourmet'];

export default function JaipurPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);

  const feedRef = useRef(null);
  const feedIn  = useInView(feedRef, { once: true, margin: '-60px' });

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    axios.get(`${API_URL}/api/city/jaipur`)
      .then(r => {
        setData(r.data);
        setSelectedVendor(r.data.vendors?.[0] || null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-4"
        />
        <p className="text-stone-400 text-sm font-medium">Loading Jaipur's hidden gems…</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">🔍</div>
      <h2 className="text-xl font-black text-stone-900">Could not load Jaipur data</h2>
      <Link href="/" className="btn-ghost">← Back to Home</Link>
    </div>
  );

  const { city, vendors, recommendations, google_maps_api_key } = data;

  /* ── Filter & Search ── */
  const filtered = vendors.filter(v => {
    const matchFilter = activeFilter === 'All' || (v.cuisine_type || '').toLowerCase().includes(activeFilter.toLowerCase());
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.cuisine_type || '').toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  /* ── Full map embed URL (all vendors cluster) ── */
  const fullMapSrc = google_maps_api_key
    ? `https://www.google.com/maps/embed/v1/place?key=${google_maps_api_key}&q=Jaipur,Rajasthan&zoom=12`
    : null;

  return (
    <div className="min-h-screen bg-stone-50 pt-16">

      {/* ── Hero ── */}
      <section className="relative h-[48vh] min-h-[320px] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1599661046289-e31897846e41?q=80&w=1600&auto=format&fit=crop"
          alt="Jaipur Pink City"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/45 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(249,115,22,0.1),transparent)]" />

        <div className="absolute inset-0 flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white font-semibold text-sm mb-4 transition-colors">
              <ChevronLeft size={14} /> All Cities
            </Link>

            <div className="flex flex-wrap items-end gap-6 justify-between">
              <div>
                <span className="eyebrow mb-3 inline-flex bg-white/20 text-white border-white/20">
                  <Sparkles size={11} /> Rajasthan · India
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-none">
                  Jaipur
                  <span className="gradient-text"> Street Food</span>
                </h1>
                <p className="text-white/80 mt-2.5 font-medium text-sm">
                  {vendors.length} verified spots · Dal Baati · Pyaaz Kachori · Ghewar
                </p>
              </div>

              {/* Stat pills */}
              <div className="flex gap-2">
                <div className="bg-white/10 backdrop-blur-md border border-white/25 px-4 py-2 text-center rounded-xl">
                  <div className="text-lg font-black text-white">{vendors.length}</div>
                  <div className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Stalls</div>
                </div>
                <div className="bg-white/10 backdrop-blur-md border border-white/25 px-4 py-2 text-center rounded-xl">
                  <div className="text-lg font-black text-amber-400">4.3★</div>
                  <div className="text-[9px] text-white/70 font-bold uppercase tracking-widest">Avg Rating</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Main Content ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* ── LEFT: Vendor Feed ── */}
          <div className="xl:col-span-2 space-y-8" ref={feedRef}>

            {/* Search + Filters */}
            <div className="space-y-4">
              {/* Enhanced Search & Location Bar */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 group">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-stone-400 group-focus-within:text-brand-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search for stalls, dishes, or cravings..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full bg-white border-2 border-stone-100 rounded-[1.25rem] py-3.5 pl-12 pr-12 text-[15px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm hover:shadow-md"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute inset-y-0 right-4 flex items-center text-stone-300 hover:text-stone-500 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => alert("Detecting your location in Jaipur...")}
                  className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-stone-100 rounded-[1.25rem] text-stone-600 font-bold text-sm hover:border-brand-500 hover:text-brand-500 hover:shadow-md transition-all sm:w-auto w-full group whitespace-nowrap shadow-sm"
                >
                  <MapPin size={18} className="text-stone-400 group-hover:text-brand-500 transition-colors" />
                  Near Me
                </button>
              </div>

              {/* Visual Categories Slider */}
              <div className="flex items-start gap-4 sm:gap-6 overflow-x-auto no-scrollbar pb-3 pt-2">
                {CUISINE_FILTERS.map(f => {
                  const isActive = activeFilter === f.name;
                  return (
                    <button
                      key={f.name}
                      onClick={() => setActiveFilter(f.name)}
                      className="flex flex-col items-center gap-2.5 flex-shrink-0 group transition-all duration-300 w-16 sm:w-20"
                    >
                      <div className={`w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-[1.25rem] overflow-hidden transition-all duration-300 ${isActive ? 'ring-2 ring-brand-500 ring-offset-2 scale-[1.03] shadow-lg shadow-brand-500/20' : 'ring-1 ring-stone-200/80 group-hover:shadow-md group-hover:scale-105 group-hover:ring-stone-300'}`}>
                        <img src={f.image} alt={f.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-[1.2] transition-colors ${isActive ? 'text-brand-500' : 'text-stone-500 group-hover:text-stone-800'}`}>
                          {f.name}
                        </span>
                        {isActive && <div className="w-1 h-1 bg-brand-500 rounded-full mt-1" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Secondary Filter chips */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100">
                {SECONDARY_FILTERS.map(f => (
                  <button
                    key={f}
                    className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${f === 'All' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-800 shadow-sm'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center justify-between border-b border-stone-200 pb-4">
              <h2 className="text-xl font-extrabold text-stone-900">
                {activeFilter === 'All' && !search
                  ? 'All Jaipur Spots'
                  : `${filtered.length} results`}
              </h2>
              <span className="text-[11px] font-bold text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full">
                {filtered.length} outlets
              </span>
            </div>

            {/* Recommended row */}
            {activeFilter === 'All' && !search && recommendations?.length > 0 && (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-stone-400 tracking-[0.18em] uppercase flex items-center gap-1.5">
                  <Flame size={12} className="text-brand-600" /> Top Picks
                </p>
                <div className="overflow-hidden relative w-full group py-1">
                  <div className="flex gap-4 w-max animate-marquee group-hover:pause-animate">
                    {[...recommendations.slice(0, 6), ...recommendations.slice(0, 6)].map((rec, i) => {
                      const v = vendors.find(x => x.name === rec.name);
                      if (!v) return null;
                      return (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (i % 6) * 0.07 }}
                          onClick={() => { setSelectedVendor(v); }}
                          className="flex-shrink-0 card overflow-hidden text-left group/card hover:ring-2 hover:ring-brand-500/40 transition-all bg-white"
                          style={{ width: 180 }}
                        >
                          <div className="h-24 overflow-hidden relative">
                            <img
                              src={v.image_url}
                              alt={v.name}
                              className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                              onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=300&auto=format&fit=crop'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-stone-900/65 to-transparent" />
                            <span className="absolute bottom-2 left-2 star-badge">★ {rec.rating?.toFixed(1)}</span>
                          </div>
                          <div className="p-3">
                            <p className="text-stone-800 text-xs font-bold line-clamp-2 leading-tight group-hover/card:text-brand-600 transition-colors">
                              {v.name}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Main grid */}
            <AnimatePresence mode="wait">
              {filtered.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="panel p-16 text-center border-dashed bg-white"
                >
                  <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200/85 flex items-center justify-center mx-auto mb-4">
                    <Search size={20} className="text-stone-400" />
                  </div>
                  <h3 className="font-extrabold text-stone-900 text-lg mb-2">No results</h3>
                  <p className="text-stone-400 text-sm">Try a different search or filter.</p>
                </motion.div>
              ) : (
                <motion.div
                  key={activeFilter + search}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  variants={staggerGrid}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                >
                  {filtered.map(v => (
                    <VendorCard
                      key={v.id}
                      vendor={v}
                      onSelect={setSelectedVendor}
                      isSelected={selectedVendor?.id === v.id}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── RIGHT: Sticky Map + Detail ── */}
          <div className="xl:col-span-1">
            <div className="sticky top-24 flex flex-col gap-5 max-h-[calc(100vh-8rem)] overflow-y-auto no-scrollbar pb-4">

              {/* Full city map */}
              <div className="panel overflow-hidden bg-white" style={{ height: 280 }}>
                <div className="flex items-center justify-between p-4 pb-3 border-b border-stone-100">
                  <h3 className="font-extrabold text-stone-900 text-sm flex items-center gap-2">
                    <MapPin size={16} className="text-brand-500" />
                    Jaipur Map
                  </h3>
                  <span className="text-[10px] text-stone-400 font-semibold">{vendors.length} locations</span>
                </div>
                <div style={{ height: 220 }}>
                  {fullMapSrc ? (
                    <iframe
                      width="100%" height="100%"
                      style={{ border: 0 }}
                      referrerPolicy="no-referrer-when-downgrade"
                      src={fullMapSrc}
                      allowFullScreen
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-stone-400 text-xs">Map unavailable</div>
                  )}
                </div>
              </div>

              {/* Selected vendor detail */}
              <AnimatePresence mode="wait">
                {selectedVendor && (
                  <VendorDetail
                    key={selectedVendor.id}
                    vendor={selectedVendor}
                    onClose={() => setSelectedVendor(null)}
                    apiKey={google_maps_api_key}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
