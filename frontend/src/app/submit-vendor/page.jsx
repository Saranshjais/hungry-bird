"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { useCategories, useCities } from '../../lib/hooks';
import { api, errorMessage } from '../../lib/api';
import { nearestCity } from '../../lib/vendors';
import {
  MapPin, Send, CheckCircle2, ChevronLeft, Loader2,
  AlertCircle, Store, ChefHat, Search, Crosshair, Star, Building2, User, Mail
} from 'lucide-react';

// Dynamically import MapComponent so it doesn't break SSR
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">Loading Map...</div>
});

// Centre of India, used only when no city coordinates are available.
const INDIA = { lat: 20.5937, lng: 78.9629 };
// Pins further than this from every city keep whatever city the user picked.
const AUTO_CITY_MAX_KM = 150;

export default function SubmitVendorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const config = useConfig();
  const { cities, loading: citiesLoading } = useCities();
  const { categories } = useCategories();

  // Form State
  const [stallName, setStallName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [rating, setRating] = useState(0);
  const [cityId, setCityId] = useState('');
  const [cityTouched, setCityTouched] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');
  const [mapMsg, setMapMsg] = useState('');

  // Map State
  const [searchQuery, setSearchQuery] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);

  const defaultCity = useMemo(() => {
    if (!cities.length) return null;
    return cities.find(c => c.slug === config.defaultCity) || cities[0];
  }, [cities, config.defaultCity]);

  // Centre the map on the admin's default city once cities + config are known.
  const ready = !citiesLoading && config.loaded;
  useEffect(() => {
    if (!ready || lat !== null) return;
    if (defaultCity && Number.isFinite(defaultCity.lat) && Number.isFinite(defaultCity.lng)) {
      setLat(defaultCity.lat);
      setLng(defaultCity.lng);
    } else {
      setLat(INDIA.lat);
      setLng(INDIA.lng);
    }
    if (defaultCity && !cityId) setCityId(String(defaultCity.id));
  }, [ready, defaultCity]); // eslint-disable-line react-hooks/exhaustive-deps

  // Follow the pin: pick the nearest city unless the user chose one themselves.
  useEffect(() => {
    if (lat === null || cityTouched || !cities.length) return;
    const hit = nearestCity(cities, lat, lng);
    if (hit && hit.km <= AUTO_CITY_MAX_KM) setCityId(String(hit.city.id));
  }, [lat, lng, cities, cityTouched]);

  const handleAutoLocate = () => {
    setMapMsg('');
    if (!navigator.geolocation) {
      setMapMsg('Location is not supported by this browser.');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGettingLocation(false);
      },
      () => {
        setMapMsg('Unable to get your location. Please check browser permissions.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setMapMsg('');
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=1&q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        setMapMsg('Place not found. Try a nearby landmark or drop the pin on the map.');
      }
    } catch (err) {
      setMapMsg('Search is unavailable right now. Drop the pin on the map instead.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stallName.trim()) {
      setErrorMsg('Vendor Name is required.');
      setStatus('error');
      return;
    }
    if (!cityId) {
      setErrorMsg('Please choose the city this stall is in.');
      setStatus('error');
      return;
    }
    if (lat === null || lng === null) {
      setErrorMsg('Please drop a pin on the map.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    // Attempt reverse geocoding to get approx address
    let resolvedAddress = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        // split to make it shorter
        const parts = data.display_name.split(',');
        resolvedAddress = parts.slice(0, 3).join(', ');
      }
    } catch (err) {
      /* keep the coordinates as the address */
    }

    try {
      // Logged-in users are identified by their token; guests may leave a name / email to hear back.
      await api('/api/submit-vendor', {
        method: 'POST',
        body: {
          stall_name: stallName.trim(),
          cuisine_type: cuisineType.trim(),
          approx_address: resolvedAddress,
          lat,
          lng,
          rating: rating || null,
          city_id: Number(cityId),
          ...(user ? {} : {
            submitted_by_name: guestName.trim() || null,
            submitted_by_email: guestEmail.trim() || null,
          }),
        },
        timeout: 30000,
      });

      setStatus('success');
      setTimeout(() => {
        router.push(user ? '/user/submissions' : '/');
      }, 3000);
    } catch (err) {
      setErrorMsg(errorMessage(err, { default: 'Failed to submit. Please try again.' }));
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          className="panel p-8 sm:p-12 max-w-md w-full text-center bg-white shadow-xl shadow-emerald-500/10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.25 }}
            className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"
          >
            <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-stone-900 mb-3 tracking-tight">
            Submitted!
          </h2>
          <p className="text-stone-500 font-medium leading-relaxed mb-10 text-sm">
            Thanks! Our team will review your suggestion before it goes live.{' '}
            {user ? 'Taking you to your submissions…' : 'Redirecting you back to home…'}
          </p>
          <Link href={user ? '/user/submissions' : '/'} className="btn-ghost w-full justify-center">
            {user ? 'My submissions' : '← Back to Home'}
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    // h-dvh: on iOS / Android 100vh includes the strip behind the browser toolbar, which hid the
    // bottom of the form panel. h-screen stays as the fallback for browsers without dvh.
    <div className="h-screen h-dvh w-full relative overflow-hidden bg-stone-100">

      {/* Map Background Wrapper */}
      <div className="absolute top-16 left-0 right-0 bottom-[55vh] supports-[height:100dvh]:bottom-[55dvh] md:bottom-0 z-0">
        {lat !== null ? (
          <MapComponent
            lat={lat}
            lng={lng}
            zoom={defaultCity ? 13 : 5}
            onLocationChange={(newLat, newLng) => {
              setLat(newLat);
              setLng(newLng);
            }}
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">Loading Map...</div>
        )}
        {/* Fixed center pointer simulating map pin if MapComponent doesn't have it natively centered */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 pb-6">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 bg-brand-500 rounded-full border-4 border-white shadow-md shadow-brand-500/40" />
            <div className="w-0.5 h-5 bg-stone-900 mt-0.5 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Unified Floating Panel */}
      <div className="absolute bottom-0 left-0 right-0 h-[55vh] supports-[height:100dvh]:h-[55dvh] md:h-auto md:top-[84px] md:bottom-6 md:left-6 md:right-auto md:w-[400px] z-20 flex flex-col pointer-events-none md:max-h-[calc(100vh-108px)]">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-t-3xl md:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:shadow-2xl border-t border-stone-200 md:border overflow-hidden flex flex-col h-full">

          {/* Header & Search */}
          <div className="p-5 border-b border-stone-100 bg-white">
            <div className="flex items-center justify-between gap-2 mb-4">
              <Link href="/" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">
                <ChevronLeft size={16} /> Back to Home
              </Link>
              <button
                type="button"
                onClick={handleAutoLocate}
                disabled={gettingLocation}
                className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 text-[12px] font-bold flex-shrink-0"
              >
                {gettingLocation ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                Locate Me
              </button>
            </div>

            <form onSubmit={handleSearch} className="flex-1 bg-stone-100 rounded-xl flex items-center px-4 py-3 focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:bg-white border border-transparent focus-within:border-brand-300 transition-all">
              <Search size={18} className="text-stone-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search place or address..."
                aria-label="Search place or address"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0 ml-3 text-[14px] font-medium text-stone-900 bg-transparent outline-none placeholder:text-stone-400"
              />
            </form>
            {mapMsg && <p className="text-xs text-red-500 font-semibold mt-2 mb-0">{mapMsg}</p>}
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto no-scrollbar flex-1 bg-stone-50/50">
            <h3 className="text-lg font-extrabold text-stone-900 mb-1">Add a Vendor</h3>
            <p className="text-sm text-stone-500 font-medium mb-6">Drop a pin and share this hidden gem.</p>

            <AnimatePresence>
              {status === 'error' && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mb-6 bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-sm font-semibold flex items-center gap-2"
                >
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <span>{errorMsg}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="stall-name" className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Vendor Name</label>
                <div className="relative">
                  <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="stall-name"
                    type="text"
                    required
                    maxLength={200}
                    placeholder="e.g. Sharma Ji Chole Bhature"
                    value={stallName}
                    onChange={(e) => setStallName(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl py-3 pl-10 pr-4 text-[15px] text-stone-900 font-medium outline-none transition-all placeholder:text-stone-400 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cuisine" className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Cuisine Type</label>
                <div className="relative">
                  <ChefHat size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    id="cuisine"
                    type="text"
                    required
                    maxLength={200}
                    list="category-suggestions"
                    placeholder="e.g. North Indian, Snacks"
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl py-3 pl-10 pr-4 text-[15px] text-stone-900 font-medium outline-none transition-all placeholder:text-stone-400 shadow-sm"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(c => <option key={c.slug} value={c.name} />)}
                  </datalist>
                </div>
              </div>

              <div>
                <label htmlFor="city" className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">City</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <select
                    id="city"
                    required
                    value={cityId}
                    onChange={(e) => { setCityId(e.target.value); setCityTouched(true); }}
                    className="w-full appearance-none bg-white border border-stone-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl py-3 pl-10 pr-4 text-[15px] text-stone-900 font-medium outline-none transition-all shadow-sm"
                  >
                    <option value="" disabled>{citiesLoading ? 'Loading cities…' : 'Choose a city'}</option>
                    {cities.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                  </select>
                </div>
                <p className="text-[11px] text-stone-400 mt-1.5 mb-0">Picked automatically from the pin — change it if it's wrong.</p>
              </div>

              {!user && (
                <div className="space-y-3 bg-white border border-stone-200 rounded-xl p-4">
                  <p className="text-xs text-stone-500 m-0">
                    <Link href={`/login?next=${encodeURIComponent('/submit-vendor')}`} className="font-bold text-brand-600">Log in</Link> to track your submission, or leave your details (optional) so we can tell you when it&apos;s live.
                  </p>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="text" maxLength={100} placeholder="Your name (optional)" aria-label="Your name (optional)" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-xl py-2.5 pl-9 pr-3 text-[14px] text-stone-900 outline-none" />
                  </div>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input type="email" maxLength={150} placeholder="Your email (optional)" aria-label="Your email (optional)" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="w-full bg-white border border-stone-200 focus:border-brand-500 rounded-xl py-2.5 pl-9 pr-3 text-[14px] text-stone-900 outline-none" />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 mb-4 mt-2">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Your Rating</label>
                <div className="flex items-center gap-1 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-sm" role="radiogroup" aria-label="Your rating">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      role="radio"
                      aria-checked={rating === star}
                      aria-label={`${star} star${star > 1 ? 's' : ''}`}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-110 active:scale-95"
                    >
                      <Star
                        size={20}
                        className={star <= rating ? "text-amber-500" : "text-stone-300"}
                        fill={star <= rating ? "#f59e0b" : "transparent"}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={status === 'loading' || !stallName}
                  className={`w-full py-4 rounded-xl flex justify-center items-center font-bold text-white transition-all ${stallName ? 'bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/30' : 'bg-stone-300 pointer-events-none'}`}
                >
                  {status === 'loading' ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      Submit Vendor
                      <Send size={16} className="ml-2" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
