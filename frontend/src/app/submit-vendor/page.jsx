"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import {
  MapPin, Send, CheckCircle2, ChevronLeft, Loader2,
  AlertCircle, Store, ChefHat, Search, Crosshair, Star
} from 'lucide-react';

// Dynamically import MapComponent so it doesn't break SSR
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100 flex items-center justify-center text-stone-400">Loading Map...</div>
});

export default function SubmitVendorPage() {
  const router = useRouter();
  const { user } = useAuth();
  
  // Form State
  const [stallName, setStallName] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [rating, setRating] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [errorMsg, setErrorMsg] = useState('');

  // Map State
  const [searchQuery, setSearchQuery] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);
  const [lat, setLat] = useState(28.6139); // Default Delhi
  const [lng, setLng] = useState(77.2090);

  const handleAutoLocate = () => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude);
        setLng(position.coords.longitude);
        setGettingLocation(false);
      },
      (error) => {
        console.error("Error fetching location:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setGettingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery) return;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        setLat(parseFloat(data[0].lat));
        setLng(parseFloat(data[0].lon));
      } else {
        alert("Location not found");
      }
    } catch (err) {
      console.error(err);
      alert("Error searching location");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stallName) {
      setErrorMsg('Vendor Name is required.');
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
      console.log("Reverse geocode failed, using lat/lng");
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      await axios.post(`${API_URL}/api/submit-vendor`, {
        stall_name: stallName,
        cuisine_type: cuisineType,
        approx_address: resolvedAddress,
        lat: lat,
        lng: lng,
        estimated_price: "",
        description: "",
        rating: rating,
        city_id: 1, // Defaulting to 1 as per mobile app logic
        submitted_by_name: user?.name || 'Anonymous',
        submitted_by_email: user?.email || 'anonymous@example.com'
      });
      
      setStatus('success');
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err) {
      setErrorMsg('Failed to submit. Please try again.');
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
          className="panel p-12 max-w-md w-full text-center bg-white shadow-xl shadow-emerald-500/10"
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
            Your vendor was submitted successfully. Redirecting you back to home...
          </p>
          <Link href="/" className="btn-ghost w-full justify-center">← Back to Home</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full relative overflow-hidden bg-stone-100">
      
      {/* Map Background Wrapper */}
      <div className="absolute top-16 left-0 right-0 bottom-[55vh] md:bottom-0 z-0">
        <MapComponent 
          lat={lat} 
          lng={lng} 
          onLocationChange={(newLat, newLng) => {
            setLat(newLat);
            setLng(newLng);
          }} 
        />
        {/* Fixed center pointer simulating map pin if MapComponent doesn't have it natively centered */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10 pb-6">
          <div className="flex flex-col items-center">
            <div className="w-5 h-5 bg-brand-500 rounded-full border-4 border-white shadow-md shadow-brand-500/40" />
            <div className="w-0.5 h-5 bg-stone-900 mt-0.5 shadow-sm" />
          </div>
        </div>
      </div>

      {/* Unified Floating Panel */}
      <div className="absolute bottom-0 left-0 right-0 h-[55vh] md:h-auto md:top-[84px] md:bottom-6 md:left-6 md:right-auto md:w-[400px] z-20 flex flex-col pointer-events-none md:max-h-[calc(100vh-108px)]">
        <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-t-3xl md:rounded-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.08)] md:shadow-2xl border-t border-stone-200 md:border overflow-hidden flex flex-col h-full">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-stone-100 bg-white">
            <div className="flex items-center justify-between mb-4">
              <Link href="/" className="inline-flex items-center gap-1.5 text-stone-500 hover:text-stone-900 text-sm font-bold transition-colors">
                <ChevronLeft size={16} /> Back to Home
              </Link>
              <button 
                onClick={handleAutoLocate}
                disabled={gettingLocation}
                className="text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1.5 text-[12px] font-bold"
              >
                {gettingLocation ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                Locate Me
              </button>
            </div>
            
            <form onSubmit={handleSearch} className="flex-1 bg-stone-100 rounded-xl flex items-center px-4 py-3 focus-within:ring-4 focus-within:ring-brand-500/10 focus-within:bg-white border border-transparent focus-within:border-brand-300 transition-all">
              <Search size={18} className="text-stone-400" />
              <input 
                type="text" 
                placeholder="Search place or address..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 ml-3 text-[14px] font-medium text-stone-900 bg-transparent outline-none placeholder:text-stone-400"
              />
            </form>
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
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Vendor Name</label>
                <div className="relative">
                  <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Sharma Ji Chole Bhature" 
                    value={stallName}
                    onChange={(e) => setStallName(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl py-3 pl-10 pr-4 text-[15px] text-stone-900 font-medium outline-none transition-all placeholder:text-stone-400 shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-2">Cuisine Type</label>
                <div className="relative">
                  <ChefHat size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. North Indian, Snacks" 
                    value={cuisineType}
                    onChange={(e) => setCuisineType(e.target.value)}
                    className="w-full bg-white border border-stone-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 rounded-xl py-3 pl-10 pr-4 text-[15px] text-stone-900 font-medium outline-none transition-all placeholder:text-stone-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">Your Rating</label>
                <div className="flex items-center gap-1 bg-white border border-stone-200 px-3 py-1.5 rounded-full shadow-sm">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      type="button"
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
