"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence, useInView } from 'motion/react';
import { MapPin, Star, Sparkles, ChevronLeft, Flame, Search, X, Loader2, Crown, LogIn } from 'lucide-react';
import dynamic from 'next/dynamic';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import { useCategories, useCities } from '../../../lib/hooks';
import { cityImage, CITY_PLACEHOLDER } from '../../../lib/site';
import {
  directionsUrl, distanceKm, formatDistance, hasCoords, isLocked, ratingCount, vendorArea, vendorCuisine,
  vendorImageOrPlaceholder, vendorRating,
} from '../../../lib/vendors';
import LockedVendorCard from '../../../components/vendors/LockedVendorCard';
import TrailsSection from '../../../components/TrailsSection';
import { loginHref } from '../../../components/RequireAuth';

const CityMap = dynamic(() => import('./CityMap'), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 85, damping: 18 } },
};
const staggerGrid = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

function InteractiveRating({ vendor }) {
  const { user } = useAuth();
  const { allowGuestReviews } = useConfig();
  const [rating, setRating] = useState(vendorRating(vendor) || 0);
  const [total, setTotal] = useState(ratingCount(vendor));
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [selectedStar, setSelectedStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [submittedMessage, setSubmittedMessage] = useState("");
  const [error, setError] = useState(null);
  const needsLogin = !user && !allowGuestReviews;

  const handleStarClick = (star) => {
    setSelectedStar(star);
    setShowReviewForm(true);
    setError(null);
  };

  const submitRating = async () => {
    if (isSubmitting || !selectedStar) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const data = await api(`/api/vendors/${vendor.id}/rate`, {
        method: 'POST',
        body: {
          rating: selectedStar,
          review_text: reviewText.trim(),
          ...(user ? {} : { author_name: authorName.trim() }),
        },
      });
      if (typeof data.avg_rating === 'number') setRating(data.avg_rating);
      if (typeof data.total_ratings === 'number') setTotal(data.total_ratings);
      setShowReviewForm(false);
      setSubmittedMessage(data.updated ? "Updated!" : "Rated!");
      setTimeout(() => setSubmittedMessage(""), 3000);
    } catch (e) {
      setError(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-3" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={(e) => { e.preventDefault(); handleStarClick(star); }}
              disabled={isSubmitting}
              className={`p-0.5 [@media(pointer:coarse)]:p-1.5 [@media(pointer:coarse)]:-my-1 outline-none transition-transform hover:scale-125 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
          {rating > 0 && total > 0 ? rating.toFixed(1) : 'New'}
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
            {needsLogin ? (
              <div className="flex items-center justify-between gap-2 bg-stone-50 border border-stone-200 rounded p-2">
                <span className="text-[11px] text-stone-600 font-medium">Log in to rate stalls.</span>
                <Link href={loginHref(`/vendor/${vendor.id}`)} className="text-[10px] font-bold bg-stone-900 text-white px-2.5 py-1 rounded inline-flex items-center gap-1">
                  <LogIn size={10} /> LOG IN
                </Link>
              </div>
            ) : (
              <>
                {!user && (
                  <input
                    type="text"
                    placeholder="Your Name (Optional)"
                    maxLength={100}
                    value={authorName}
                    onChange={e => setAuthorName(e.target.value)}
                    className="w-full text-xs p-2 border border-stone-200 rounded outline-none focus:border-brand-500 transition-colors"
                  />
                )}
                <textarea
                  placeholder="Write a review... (Optional)"
                  maxLength={1000}
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  className="w-full text-xs p-2 border border-stone-200 rounded outline-none focus:border-brand-500 min-h-[50px] resize-none transition-colors"
                />
                {error && (
                  <p className="text-[11px] text-red-500 font-semibold">
                    {error.status === 401 ? (
                      <>Please <Link href={loginHref(`/vendor/${vendor.id}`)} className="underline">log in</Link> to rate.</>
                    ) : errorMessage(error, { default: "Couldn't save your rating." })}
                  </p>
                )}
              </>
            )}
            <div className="flex justify-end gap-2 mt-1">
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="text-[10px] font-bold text-stone-500 px-2 py-1 hover:text-stone-700 transition-colors"
              >
                CANCEL
              </button>
              {!needsLogin && (
                <button
                  type="button"
                  onClick={submitRating}
                  disabled={isSubmitting}
                  className="text-[10px] font-bold bg-brand-500 hover:bg-brand-600 text-white px-3 py-1 rounded shadow-sm transition-colors"
                >
                  {isSubmitting ? "..." : "SUBMIT"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function VendorCard({ vendor, recommended }) {
  const premiumOn = useConfig().premium.enabled;
  if (isLocked(vendor)) {
    return (
      <motion.div variants={fadeUp} className="flex flex-col">
        <LockedVendorCard vendor={vendor} />
      </motion.div>
    );
  }

  const directions = directionsUrl(vendor);
  const meta = [vendorCuisine(vendor), vendorArea(vendor)].filter(Boolean).join(' · ');

  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -5, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="card group flex flex-col"
    >
      <Link href={`/vendor/${vendor.id}`} className="relative h-48 overflow-hidden bg-stone-100 block cursor-pointer">
        <img
          src={vendorImageOrPlaceholder(vendor)}
          alt={vendor.name || ''}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {premiumOn && vendor.is_premium && (
              <span className="bg-amber-400 text-stone-900 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                <Crown size={8} /> Premium
              </span>
            )}
            {vendor.is_hidden_gem && (
              <span className="bg-violet-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                <Sparkles size={8} /> Hidden Gem
              </span>
            )}
            {vendor.price_level && (
              <span className="bg-white/90 backdrop-blur-sm text-stone-800 text-[10px] font-black px-2 py-0.5 rounded-md">
                {vendor.price_level}
              </span>
            )}
          </div>
          {recommended && (
            <span className="bg-white/90 backdrop-blur-sm text-stone-800 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
              <Flame size={8} className="text-brand-500" /> Curated
            </span>
          )}
        </div>
      </Link>

      <div className="p-4 bg-white flex flex-col flex-1">
        <Link href={`/vendor/${vendor.id}`} className="cursor-pointer">
          <h3 className="font-extrabold text-stone-900 text-[15px] leading-tight mb-2 truncate group-hover:text-brand-600 transition-colors">
            {vendor.name}
          </h3>
        </Link>

        <InteractiveRating vendor={vendor} />

        <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3 mt-auto">
          <p className="text-[11px] font-medium text-stone-400 truncate m-0">
            {meta}
            {typeof vendor.distanceKm === 'number' && (
              <span className="text-brand-500 font-bold">{meta ? ' · ' : ''}{formatDistance(vendor.distanceKm)}</span>
            )}
          </p>
          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded border border-brand-100 hover:bg-brand-100 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              <MapPin size={10} /> Directions
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function CategoryTile({ label, image, icon, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex flex-col items-center gap-2 flex-shrink-0 outline-none group w-[76px]"
    >
      <motion.div
        whileTap={{ scale: 0.93 }}
        className={`relative rounded-[1.25rem] overflow-hidden transition-all duration-300 flex items-center justify-center bg-brand-50 ${
          active
            ? 'ring-2 ring-brand-500 ring-offset-2 scale-[1.03] shadow-lg shadow-brand-500/20'
            : 'ring-1 ring-stone-200/80 group-hover:shadow-md group-hover:scale-105 group-hover:ring-stone-300'
        }`}
        style={{ width: 72, height: 72 }}
      >
        {image ? (
          <img src={image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <span className="text-3xl" aria-hidden="true">{icon || '🍽️'}</span>
        )}
      </motion.div>
      <div className="flex flex-col items-center">
        <span className={`text-[10px] sm:text-[11px] font-bold text-center leading-[1.2] transition-colors line-clamp-2 ${
          active ? 'text-brand-500' : 'text-stone-500 group-hover:text-stone-800'
        }`}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="catPill"
            className="w-1 h-1 rounded-full bg-brand-500 mt-1"
          />
        )}
      </div>
    </button>
  );
}

function recommendedVendors(recommendations, vendors) {
  const out = [];
  const seen = new Set();
  for (const rec of recommendations || []) {
    let v = null;
    if (rec && typeof rec === 'object' && rec.id != null) v = vendors.find(x => x.id === rec.id);
    if (!v) {
      const name = typeof rec === 'string' ? rec : rec && rec.name;
      if (name) v = vendors.find(x => x.name === name);
    }
    if (v && !seen.has(v.id)) {
      seen.add(v.id);
      out.push(v);
    }
  }
  return out;
}

export default function CityPage() {
  const { slug } = useParams();
  const config = useConfig();
  const { cities } = useCities();
  const { categories } = useCategories();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null); // category object or null = All
  const [categoryVendors, setCategoryVendors] = useState({ slug: null, list: [], loading: false, error: null });
  const [quick, setQuick] = useState('all');
  const [search, setSearch] = useState('');
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  const feedRef  = useRef(null);
  const feedIn   = useInView(feedRef, { once: true, margin: '-60px' });

  const handleNearMe = () => {
    if (userLocation) {
      // Toggle off if already active
      setUserLocation(null);
      return;
    }
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationError('Unable to get your location. Check browser permissions.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const load = useCallback(() => {
    if (!slug) return;
    setLoading(true);
    setLoadError(null);
    api(`/api/city/${encodeURIComponent(slug)}`, { timeout: 30000 })
      .then(r => setData(r))
      .catch(err => { setData(null); setLoadError(err); })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  // Category chips are admin-managed; filtering happens server-side (same as the app).
  useEffect(() => {
    if (!activeCategory || !slug) return undefined;
    let alive = true;
    setCategoryVendors({ slug: activeCategory.slug, list: [], loading: true, error: null });
    api(`/api/vendors?city=${encodeURIComponent(slug)}&category=${encodeURIComponent(activeCategory.slug)}&limit=500`, { timeout: 30000 })
      .then(r => alive && setCategoryVendors({ slug: activeCategory.slug, list: r.vendors || [], loading: false, error: null }))
      .catch(err => alive && setCategoryVendors({ slug: activeCategory.slug, list: [], loading: false, error: err }));
    return () => { alive = false; };
  }, [activeCategory, slug]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full"
      />
    </div>
  );

  if (!data) {
    const missing = !loadError || loadError.status === 404;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 py-24 px-4 text-center">
        <div className="text-6xl">🔍</div>
        <h2 className="text-2xl font-extrabold text-stone-900">{missing ? 'City not found' : "We couldn't load this city"}</h2>
        {!missing && <p className="text-stone-500 text-sm max-w-sm">{errorMessage(loadError)}</p>}
        <div className="flex flex-wrap justify-center gap-3">
          {!missing && <button type="button" onClick={load} className="btn-primary">Try again</button>}
          <Link href="/" className="btn-ghost">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const cityMeta = cities.find(c => c.slug === slug) || {};
  const city = { ...cityMeta, ...(data.city || {}) };
  const description = city.description || cityMeta.description || '';
  const vendors = data.vendors || [];
  const recommendations = recommendedVendors(data.recommendations, vendors);
  const categoryActive = !!activeCategory;
  const baseList = categoryActive ? categoryVendors.list : vendors;

  const quickFilters = [
    { id: 'all', label: 'All' },
    { id: 'gems', label: 'Hidden Gems' },
    { id: 'top', label: 'Top Rated' },
    ...(config.premium.enabled ? [{ id: 'premium', label: 'Premium Picks' }] : []),
  ];

  const q = search.trim().toLowerCase();
  let filtered = baseList.filter(v => {
    if (quick === 'gems' && !v.is_hidden_gem) return false;
    if (quick === 'top' && !((vendorRating(v) || 0) >= 4)) return false;
    if (quick === 'premium' && !v.is_premium) return false;
    if (!q) return true;
    return [v.name, vendorCuisine(v), vendorArea(v), v.specialty_dish].some(f => (f || '').toLowerCase().includes(q));
  });

  if (userLocation) {
    filtered = filtered
      .map(v => ({ ...v, distanceKm: hasCoords(v) ? distanceKm(userLocation.lat, userLocation.lng, Number(v.lat), Number(v.lng)) : null }))
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  } else if (quick === 'top') {
    filtered = [...filtered].sort((a, b) => (vendorRating(b) || 0) - (vendorRating(a) || 0) || ratingCount(b) - ratingCount(a));
  }

  const plain = !categoryActive && quick === 'all' && !q;
  const listLoading = categoryActive && categoryVendors.loading;
  const quickLabel = quickFilters.find(f => f.id === quick)?.label;
  const heading = categoryActive ? activeCategory.name : quick === 'all' ? 'All Stalls' : quickLabel;

  return (
    <div className="min-h-screen bg-stone-50">

      {/* ── Hero Banner ── */}
      {/* Height follows the content (never less than the old fixed height) so wrapped text on narrow
          phones is pushed down instead of sliding up under the fixed navbar. */}
      <section className="relative min-h-[max(48vh,320px)] flex flex-col justify-end overflow-hidden bg-stone-800">
        <img
          src={cityImage(city)}
          alt={city.name}
          className="absolute inset-0 w-full h-full object-cover"
          onError={e => { if (!e.currentTarget.src.endsWith(CITY_PLACEHOLDER)) e.currentTarget.src = CITY_PLACEHOLDER; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/45 to-stone-950/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,rgba(249,115,22,0.1),transparent)]" />

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-8">
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
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-none break-words">
              {city.name}
            </h1>
            {description && (
              <p className="mt-3 mb-0 max-w-2xl text-sm sm:text-base font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{description}</p>
            )}
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
                aria-label={`Search stalls in ${city.name}`}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border-2 border-stone-100 rounded-[1.25rem] py-3.5 pl-12 pr-12 text-[15px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all shadow-sm hover:shadow-md"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                  className="absolute inset-y-0 right-4 flex items-center text-stone-300 hover:text-stone-500 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleNearMe}
              disabled={locating}
              className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-[1.25rem] font-bold text-sm transition-all sm:w-auto w-full group whitespace-nowrap shadow-sm border-2 ${
                userLocation
                  ? 'bg-brand-500 border-brand-500 text-white'
                  : 'bg-white border-stone-100 text-stone-600 hover:border-brand-500 hover:text-brand-500 hover:shadow-md'
              }`}
            >
              {locating ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <MapPin size={18} className={userLocation ? 'text-white' : 'text-stone-400 group-hover:text-brand-500 transition-colors'} />
              )}
              {userLocation ? 'Sorted by Distance' : 'Near Me'}
            </button>
          </div>

          {locationError && (
            <p className="text-[11px] font-semibold text-red-500 -mt-2">{locationError}</p>
          )}

          {/* ── Category Tabs (admin-managed) ── */}
          {categories.length > 0 && (
            <div className="flex items-start gap-4 overflow-x-auto pb-4 custom-scrollbar">
              <CategoryTile label="All" image="/cat-all.png" active={!activeCategory} onClick={() => setActiveCategory(null)} />
              {categories.map(cat => (
                <CategoryTile
                  key={cat.id ?? cat.slug}
                  label={cat.name}
                  image={cat.image_url}
                  icon={cat.icon}
                  active={activeCategory?.slug === cat.slug}
                  onClick={() => setActiveCategory(cat)}
                />
              ))}
            </div>
          )}

          {/* ── Quick Filters ── */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-2 border-t border-stone-100">
            {quickFilters.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setQuick(f.id)}
                aria-pressed={quick === f.id}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${quick === f.id ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-800 shadow-sm'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">

          {/* ── Feed ── */}
          <div className="xl:col-span-2 space-y-14 min-w-0" ref={feedRef}>

            {/* Recommended */}
            {plain && recommendations.length > 0 && (
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
                  {recommendations.map((v) => <VendorCard key={`r${v.id}`} vendor={v} recommended />)}
                </motion.div>
              </div>
            )}

            {/* Food trails */}
            {plain && <TrailsSection citySlug={city.slug || slug} cityId={city.id} cityName={city.name} />}

            {/* Results */}
            <div>
              <div className="flex items-center justify-between gap-3 mb-6 pb-4 border-b border-stone-200">
                <h2 className="text-2xl font-extrabold text-stone-900 min-w-0 break-words">
                  {heading}
                </h2>
                <span className="text-[11px] font-black text-stone-500 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-200 whitespace-nowrap">
                  {listLoading ? '…' : `${filtered.length} ${filtered.length === 1 ? 'stall' : 'stalls'}`}
                </span>
              </div>

              {listLoading ? (
                <div className="flex justify-center py-16">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : categoryActive && categoryVendors.error ? (
                <div className="panel p-10 text-center bg-white">
                  <p className="text-stone-500 text-sm mb-4">{errorMessage(categoryVendors.error)}</p>
                  <button type="button" onClick={() => setActiveCategory({ ...activeCategory })} className="btn-primary">Try again</button>
                </div>
              ) : (
                <>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${activeCategory?.slug || 'all'}-${quick}`}
                      initial="hidden"
                      animate="show"
                      exit={{ opacity: 0, transition: { duration: 0.15 } }}
                      variants={staggerGrid}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-5"
                    >
                      {filtered.map(v => <VendorCard key={v.id} vendor={v} />)}
                    </motion.div>
                  </AnimatePresence>

                  {filtered.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="panel p-10 sm:p-16 text-center mt-4 border-dashed bg-white"
                      style={{ borderColor: '#e7e5e4' }}
                    >
                      <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200/80 flex items-center justify-center mx-auto mb-4">
                        <Search size={20} className="text-stone-400" />
                      </div>
                      <h3 className="text-xl font-extrabold text-stone-900 mb-2">Nothing here yet</h3>
                      <p className="text-stone-500 mb-8 text-sm">
                        {q || quick !== 'all' ? 'No stalls match these filters.' : `Be the first to add a ${categoryActive ? activeCategory.name : ''} spot in ${city.name}!`}
                      </p>
                      <Link href="/submit-vendor" className="btn-orange">Add a Vendor</Link>
                    </motion.div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Map ── */}
          {/* Capped at 75vh until it sits beside the feed (xl): a full-height map on a landscape phone
              would turn every one-finger scroll into a map pan. */}
          <div className="xl:col-span-1">
            <div className="sticky top-24 panel p-5 overflow-hidden bg-white h-[min(560px,75vh)] xl:h-[560px]">
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
