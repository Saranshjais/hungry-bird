"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { UtensilsCrossed, MapPin, Menu, X, Search, ChevronDown, User, LogOut, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Dropdowns state
  const [showCities, setShowCities] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detecting, setDetecting] = useState(false);
  
  const [cities, setCities] = useState([]);
  
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  
  const searchInputRef = useRef(null);

  useEffect(() => {
    // Fetch cities for dropdown
    const fetchCities = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
        const res = await fetch(`${backendUrl}/api/cities`);
        const data = await res.json();
        setCities(data.cities || []);
      } catch (err) {
        console.error("Failed to fetch cities", err);
      }
    };
    fetchCities();
  }, []);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Prevent background scrolling when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  useMotionValueEvent(scrollY, 'change', v => setScrolled(v > 40));

  const isDarkHeaderPage = pathname === '/' || pathname?.startsWith('/city/');
  const isDarkText = scrolled || !isDarkHeaderPage;

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery('');
    }
  };

  const getDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
    const R = 6371; 
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c; 
  };

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (cities.length === 0) {
          setDetecting(false);
          return;
        }
        let closestCity = cities[0];
        let minDistance = getDistance(latitude, longitude, cities[0].lat, cities[0].lng);
        
        for (let i = 1; i < cities.length; i++) {
          const d = getDistance(latitude, longitude, cities[i].lat, cities[i].lng);
          if (d < minDistance) {
            minDistance = d;
            closestCity = cities[i];
          }
        }
        
        setDetecting(false);
        setShowCities(false);
        setMobileOpen(false);
        router.push(`/city/${closestCity.slug}`);
      },
      (error) => {
        console.error("Error detecting location:", error);
        alert("Could not detect location. Please allow location permissions.");
        setDetecting(false);
      }
    );
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || showSearch
          ? 'bg-white/95 backdrop-blur-md border-b border-stone-200/80 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[64px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group outline-none z-10">
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="absolute inset-0 bg-brand-500 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
                <UtensilsCrossed size={15} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className={`text-[17px] font-extrabold tracking-tight leading-none ${isDarkText || showSearch ? 'text-stone-900' : 'text-white'}`}>
              Hungry<span className="gradient-text">Bird</span>
            </span>
          </Link>

          {/* Search Bar Expansion */}
          {showSearch && (
            <div className="absolute inset-0 flex items-center justify-center px-4 bg-white/95 backdrop-blur-md z-0">
              <form onSubmit={handleSearch} className="w-full max-w-2xl relative flex items-center">
                <Search size={20} className="absolute left-4 text-stone-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for Chole Bhature, Momos, or your favorite stall..."
                  className="w-full bg-stone-100 text-stone-900 border-none rounded-full py-2.5 pl-12 pr-12 focus:ring-2 focus:ring-brand-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSearch(false)}
                  className="absolute right-4 p-1 rounded-full text-stone-400 hover:text-stone-600 hover:bg-stone-200"
                >
                  <X size={20} />
                </button>
              </form>
            </div>
          )}

          {/* Desktop Navigation */}
          {!showSearch && (
            <div className="hidden md:flex items-center gap-6">
              <button 
                onClick={() => setShowSearch(true)}
                className={`p-2 rounded-full transition-colors ${isDarkText ? 'text-stone-600 hover:bg-stone-100' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                aria-label="Search"
              >
                <Search size={18} />
              </button>

              {/* Home Link */}
              <Link href="/" className={`text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`}>
                Home
              </Link>

              {/* Cities Dropdown */}
              <div className="relative group">
                <button 
                  className={`flex items-center gap-1 text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`}
                  onMouseEnter={() => setShowCities(true)}
                  onMouseLeave={() => setShowCities(false)}
                >
                  Cities <ChevronDown size={14} />
                </button>
                
                {showCities && (
                  <div 
                    className="absolute top-full left-0 pt-4 w-48"
                    onMouseEnter={() => setShowCities(true)}
                    onMouseLeave={() => setShowCities(false)}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden py-2">
                      <button 
                        onClick={handleDetectLocation}
                        disabled={detecting}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-500 hover:bg-brand-50 transition-colors border-b border-stone-100 mb-1 flex items-center gap-2"
                      >
                        <MapPin size={14} />
                        {detecting ? 'Detecting...' : 'Detect Location'}
                      </button>
                      {cities.length > 0 ? (
                        cities.map(c => (
                          <Link 
                            key={c.id} 
                            href={`/city/${c.slug}`}
                            className="block px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-brand-500 transition-colors"
                          >
                            {c.name}
                          </Link>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-sm text-stone-400">Loading...</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/about" className={`text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`}>
                About Us
              </Link>
              <Link href="/contact" className={`text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`}>
                Contact
              </Link>
              <Link href="/download" className={`text-[13px] font-bold transition-colors ${isDarkText ? 'text-brand-500 hover:text-brand-600' : 'text-brand-300 hover:text-brand-200'} flex items-center gap-1`}>
                <Smartphone size={14} /> Get App
              </Link>

              {/* User Profile / Login */}
              {user ? (
                <div className="relative">
                  <button 
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-colors ${isDarkText ? 'border-stone-200 hover:bg-stone-50' : 'border-white/20 hover:bg-white/10'}`}
                    onClick={() => setShowProfile(!showProfile)}
                  >
                    <div className="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className={`text-xs font-bold ${isDarkText ? 'text-stone-700' : 'text-white'}`}>
                      {user.name.split(' ')[0]}
                    </span>
                  </button>

                  {showProfile && (
                    <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden py-2 z-50">
                      <div className="px-4 py-3 border-b border-stone-100 mb-1">
                        <p className="text-sm font-bold text-stone-900">{user.name}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email}</p>
                      </div>
                      <Link 
                        href="/user/submissions"
                        onClick={() => setShowProfile(false)}
                        className="block w-full text-left px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-brand-500 transition-colors"
                      >
                        My Submissions
                      </Link>
                      <button 
                        onClick={() => { logout(); setShowProfile(false); }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className={`text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`}>
                  Sign In
                </Link>
              )}

              <Link
                href="/submit-vendor"
                className="btn-primary gap-2"
                style={{ minHeight: '36px', padding: '0 1rem', fontSize: '0.8125rem' }}
              >
                <MapPin size={13} />
                Add Stall
              </Link>
            </div>
          )}

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className={`md:hidden p-2 rounded-xl border transition-all ${isDarkText || showSearch ? 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-stone-200 p-4 shadow-lg flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-2">
            <Search size={18} className="absolute left-3 top-3 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, vendors..."
              className="w-full bg-stone-100 text-stone-900 border-none rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </form>

          {/* Mobile Auth */}
          {user ? (
            <div className="bg-stone-50 p-4 rounded-2xl mb-2 flex items-center justify-between">
              <div>
                <p className="font-bold text-stone-900">{user.name}</p>
                <p className="text-xs text-stone-500">{user.email}</p>
                <Link 
                  href="/user/submissions"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 text-sm font-bold text-brand-500 hover:text-brand-600 block"
                >
                  My Submissions
                </Link>
              </div>
              <button 
                onClick={() => { logout(); setMobileOpen(false); }}
                className="p-2 bg-red-100 text-red-600 rounded-xl"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full text-center py-2.5 rounded-xl bg-stone-900 text-white font-bold hover:bg-stone-800 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Sign In / Register
            </Link>
          )}

          {/* Mobile Links */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <Link
              href="/"
              className="w-full text-center py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Home
            </Link>
            <Link
              href="/about"
              className="w-full text-center py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              About Us
            </Link>
            <Link
              href="/contact"
              className="w-full text-center py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Contact
            </Link>
            <Link
              href="/download"
              className="col-span-2 w-full text-center py-2.5 rounded-xl bg-brand-50 border border-brand-100 text-brand-600 font-bold hover:bg-brand-100 transition-colors flex items-center justify-center gap-2"
              onClick={() => setMobileOpen(false)}
            >
              <Smartphone size={16} /> Get the App
            </Link>
          </div>

          <div className="mt-2">
            <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-3 px-2 flex justify-between items-center">
              Cities
              <button 
                onClick={handleDetectLocation}
                disabled={detecting}
                className="text-brand-500 hover:text-brand-600 flex items-center gap-1 normal-case"
              >
                <MapPin size={12} />
                {detecting ? 'Detecting...' : 'Detect'}
              </button>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {cities.map(c => (
                 <Link
                   key={c.id}
                   href={`/city/${c.slug}`}
                   className="w-full text-center py-2 rounded-xl bg-stone-50 text-stone-700 text-sm font-medium hover:bg-brand-50 hover:text-brand-600 transition-colors"
                   onClick={() => setMobileOpen(false)}
                 >
                   {c.name}
                 </Link>
              ))}
            </div>
          </div>

          <Link
            href="/submit-vendor"
            className="btn-primary w-full justify-center mt-4"
            onClick={() => setMobileOpen(false)}
          >
            <MapPin size={14} /> Add a Hidden Stall
          </Link>
        </div>
      )}
    </header>
  );
}
