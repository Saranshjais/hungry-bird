"use client";

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'motion/react';
import axios from 'axios';
import { MapPin, Star, Sparkles, ChevronLeft, Clock, Flame, Search, X } from 'lucide-react';
import dynamic from 'next/dynamic';

const CityMap = dynamic(() => import('./CityMap'), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 85, damping: 18 } },
};
const staggerGrid = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

function InteractiveRating({ vendorId, initialRating, initialTotal }) {
  const [rating, setRating] = useState(initialRating || 0);
  const [total, setTotal] = useState(initialTotal || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedStar, setSelectedStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");

  const handleStarClick = (star) => {
    setSelectedStar(star);
    setShowReviewForm(true);
  };

  const submitRating = async () => {
    if (isSubmitting || !selectedStar) return;
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      const res = await axios.post(`${API_URL}/api/vendors/${vendorId}/rate`, { 
        rating: selectedStar,
        review_text: reviewText,
        author_name: authorName
      });
      if (res.data.success) {
        setRating(res.data.avg_rating);
        setTotal(res.data.total_ratings);
        setShowReviewForm(false);
        setSubmittedMessage("Rated!");
        setTimeout(() => setSubmittedMessage(""), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => { e.preventDefault(); handleStarClick(star); }}
              disabled={isSubmitting}
              className={`p-0.5 outline-none transition-transform hover:scale-125 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Star
                size={13}
                className={`transition-colors ${
                  (hoverRating || selectedStar || Math.round(rating)) >= star
                    ? "fill-brand-500 text-brand-500"
                    : "fill-stone-100 text-stone-200"
                }`}
              />
            </button>
          ))}
        </div>
        <span className="text-[11px] font-bold text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded shadow-sm border border-stone-200/50 ml-1">
          {rating > 0 ? rating.toFixed(1) : 'New'}
        </span>
        <span className="text-[10px] text-stone-400 font-medium">({total})</span>
        {submittedMessage && <span className="text-[10px] text-green-500 ml-1 font-bold">{submittedMessage}</span>}
      </div>
      
      <AnimatePresence>
        {showReviewForm && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 flex flex-col gap-2 overflow-hidden"
          >
            <input 
              type="text" 
              placeholder="Your Name (Optional)" 
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              className="w-full text-xs p-2 border border-stone-200 rounded outline-none focus:border-brand-500 transition-colors"
            />
            <textarea 
              placeholder="Write a review... (Optional)" 
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="w-full text-xs p-2 border border-stone-200 rounded outline-none focus:border-brand-500 min-h-[50px] resize-none transition-colors"
            />
            <div className="flex justify-end gap-2 mt-1">
              <button 
                onClick={() => setShowReviewForm(false)} 
                className="text-[10px] font-bold text-stone-500 px-2 py-1 hover:text-stone-700 transition-colors"
              >
                CANCEL
              </button>
              <button 
                onClick={submitRating} 
                disabled={isSubmitting}
                className="text-[10px] font-bold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 rounded shadow-sm transition-colors"
              >
                {isSubmitting ? "..." : "SUBMIT"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VendorCard({ vendor, cityName, recommended }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="card group cursor-pointer flex flex-col"
      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`, '_blank')}
    >
      <div className="relative h-48 overflow-hidden bg-stone-100">
        <img
          src={(!vendor.image_url || vendor.image_url.includes('maps.googleapis')) ? '/vendor-placeholder.png' : vendor.image_url}
          alt={vendor.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />

        {/* Offer */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md">
            {vendor.is_hidden_gem ? '60% OFF ↑ ₹120' : '40% OFF ↑ ₹80'}
          </span>
          {recommended && (
            <span className="bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Sparkles size={8} /> Curated
            </span>
          )}
        </div>
      </div>

      <div className="p-4 bg-white flex flex-col flex-1">
        <h3 className="font-extrabold text-stone-900 text-[15px] leading-tight mb-2 truncate group-hover:text-brand-600 transition-colors">
          {vendor.name}
        </h3>

        <InteractiveRating vendorId={vendor.id} initialRating={vendor.rating} initialTotal={vendor.total_ratings} />

        <div className="flex items-center justify-between border-t border-stone-100 pt-3 mt-auto">
          <p className="text-[11px] font-medium text-stone-400 truncate">
            {vendor.cuisine_type} · {vendor.area || 'Local Market'}
          </p>
          <span className="text-[10px] font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded border border-brand-100">
            {cityName}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

const CATEGORY_IMGS = {
  'All': '/cat-all.png', 'Street Food': '/cat-street.png',
  'North Indian': '/cat-north.png', 'Biryani': '/cat-biryani.png',
  'Momo': '/cat-momo.png', 'Noodles': '/cat-momo.png',
};

export default function CityPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');

  const feedRef  = useRef(null);
  const feedIn   = useInView(feedRef, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!slug) return;
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    axios.get(`${API_URL}/api/city/${slug}`)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50">
      <div className="text-6xl">🔍</div>
      <h2 className="text-2xl font-extrabold text-stone-900">City not found</h2>
      <Link href="/" className="btn-ghost">← Back to Home</Link>
    </div>
  );

  const { city, vendors, recommendations, google_maps_api_key } = data;
  const categories = ['All', ...new Set(vendors.map(v => v.cuisine_type).filter(Boolean))];
  const filtered = vendors.filter(v => {
    const matchCategory = activeCategory === 'All' || v.cuisine_type === activeCategory;
    const matchSearch = !search || v.name.toLowerCase().includes(search.toLowerCase()) || (v.cuisine_type || '').toLowerCase().includes(search.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Hero Banner ── */}
      <section className="relative h-[48vh] min-h-[320px] overflow-hidden">
        <img
          src={`/city-${city.slug}.png`}
          alt={city.name}
          className="w-full h-full object-cover"
          onError={e => { e.target.src = 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1200&auto=format&fit=crop'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/45 to-stone-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(249,115,22,0.1),transparent)]" />

        <div className="absolute inset-0 flex flex-col justify-end max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Link href="/" className="inline-flex items-center gap-1.5 text-white/70 hover:text-white font-semibold text-sm mb-4 transition-colors">
              <ChevronLeft size={15} /> All Cities
            </Link>
            <span className="eyebrow mb-3 block w-fit bg-white/20 text-white border-white/20">
              <Sparkles size={11} /> HungryBird Curated
            </span>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-none">
              {city.name}
            </h1>
          </motion.div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* ── Search & Filter Section ── */}
        <section className="mb-10 space-y-4">
          
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
              onClick={() => alert(`Detecting your location in ${city.name}...`)}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white border-2 border-stone-100 rounded-[1.25rem] text-stone-600 font-bold text-sm hover:border-brand-500 hover:text-brand-500 hover:shadow-md transition-all sm:w-auto w-full group whitespace-nowrap shadow-sm"
            >
              <MapPin size={18} className="text-stone-400 group-hover:text-brand-500 transition-colors" />
              Near Me
            </button>
          </div>

          {/* ── Category Tabs ── */}
          <div className="flex items-center gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {categories.map(cat => {
              const isActive = cat === activeCategory;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="flex flex-col items-center gap-2 flex-shrink-0 outline-none group"
                >
                  <motion.div
                    whileTap={{ scale: 0.93 }}
                    className={`relative rounded-[1.25rem] overflow-hidden transition-all duration-300 ${
                      isActive
                        ? 'ring-2 ring-brand-500 ring-offset-2 scale-[1.03] shadow-lg shadow-brand-500/20'
                        : 'ring-1 ring-stone-200/80 group-hover:shadow-md group-hover:scale-105 group-hover:ring-stone-300'
                    }`}
                    style={{ width: 72, height: 72 }}
                  >
                    <img
                      src={CATEGORY_IMGS[cat] || '/cat-all.png'}
                      alt={cat}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </motion.div>
                  <div className="flex flex-col items-center">
                    <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-[1.2] transition-colors ${
                      isActive ? 'text-brand-500' : 'text-stone-500 group-hover:text-stone-800'
                    }`}>
                      {cat}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="catPill"
                        className="w-1 h-1 rounded-full bg-brand-500 mt-1"
                      />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Quick Filters ── */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100">
            {['All', 'Near & Fast', 'Hidden Gems', 'Gourmet'].map(f => (
              <button 
                key={f} 
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${f === 'All' ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-800 shadow-sm'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

          {/* ── Feed ── */}
          <div className="xl:col-span-2 space-y-14" ref={feedRef}>

            {/* Recommended */}
            {activeCategory === 'All' && recommendations?.length > 0 && (
              <div>
                <h2 className="text-[11px] font-black text-stone-400 tracking-[0.18em] uppercase mb-6 flex items-center gap-2">
                  <Flame size={13} className="text-brand-600" /> Recommended
                </h2>
                <motion.div
                  initial="hidden"
                  animate={feedIn ? 'show' : 'hidden'}
                  variants={staggerGrid}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                >
                  {recommendations.map((name, i) => {
                    const v = vendors.find(x => x.name === name);
                    return v ? <VendorCard key={`r${i}`} vendor={v} cityName={city.name} recommended /> : null;
                  })}
                </motion.div>
              </div>
            )}

            {/* Results */}
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-stone-200">
                <h2 className="text-2xl font-extrabold text-stone-900">
                  {activeCategory === 'All' ? 'All Restaurants' : `${activeCategory}`}
                </h2>
                <span className="text-[11px] font-black text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200">
                  {filtered.length} outlets
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeCategory}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, transition: { duration: 0.15 } }}
                  variants={staggerGrid}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                >
                  {filtered.map(v => <VendorCard key={v.id} vendor={v} cityName={city.name} />)}
                </motion.div>
              </AnimatePresence>

              {filtered.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="panel p-16 text-center mt-4 border-dashed bg-white"
                  style={{ borderColor: '#e7e5e4' }}
                >
                  <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200/80 flex items-center justify-center mx-auto mb-4">
                    <Search size={20} className="text-stone-400" />
                  </div>
                  <h3 className="text-xl font-extrabold text-stone-900 mb-2">Nothing here yet</h3>
                  <p className="text-stone-500 mb-8 text-sm">Be the first to add a {activeCategory} spot in {city.name}!</p>
                  <Link href="/submit-vendor" className="btn-orange">Add a Vendor</Link>
                </motion.div>
              )}
            </div>
          </div>

          {/* ── Map ── */}
          <div className="xl:col-span-1">
            <div className="sticky top-24 panel p-5 overflow-hidden bg-white" style={{ height: 560 }}>
              <h3 className="font-extrabold text-stone-900 mb-4 flex items-center gap-2 text-base">
                <MapPin size={18} className="text-brand-500" /> Map Explorer
              </h3>
              <div className="rounded-2xl overflow-hidden bg-stone-100 h-[calc(100%-56px)] border border-stone-200">
                {city.lat && city.lng ? (
                  <CityMap cityLat={city.lat} cityLng={city.lng} vendors={filtered} />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-stone-400">
                    <MapPin size={36} />
                    <p className="text-sm font-medium text-center px-4">Map not available yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
