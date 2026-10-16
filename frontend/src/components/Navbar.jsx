"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { MapPin, Menu, X, Search, ChevronDown, LogOut, Smartphone, UserRound, ClipboardList, Crown, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useConfig } from '../context/ConfigContext';
import { useCities } from '../lib/hooks';
import { nearestCity } from '../lib/vendors';
import SiteStrips from './SiteStrips';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Dropdowns state
  const [showCities, setShowCities] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [locateError, setLocateError] = useState('');

  const { cities, loading: citiesLoading } = useCities();
  const config = useConfig();
  const premiumOn = config.premium.enabled;

  const { scrollY } = useScroll();
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const searchInputRef = useRef(null);
  const profileRef = useRef(null);

  // Focus search input when shown
  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  // Close every menu on navigation
  useEffect(() => {
    setShowProfile(false);
    setShowSearch(false);
    setShowCities(false);
    setMobileOpen(false);
  }, [pathname]);

  // Close the account menu on outside click / Escape
  useEffect(() => {
    if (!showProfile && !showSearch) return;
    const onDown = (e) => {
      if (showProfile && profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setShowProfile(false);
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showProfile, showSearch]);

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

  const isDarkHeaderPage = pathname?.startsWith('/city/');
  const isDarkText = scrolled || showSearch || !isDarkHeaderPage;

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearch(false);
      setMobileOpen(false);
      setSearchQuery('');
    }
  };

  const handleDetectLocation = () => {
    setLocateError('');
    if (!navigator.geolocation) {
      setLocateError('Location is not supported by this browser.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const hit = nearestCity(cities, latitude, longitude);
        setDetecting(false);
        if (!hit) {
          setLocateError('No city found near you yet.');
          return;
        }
        setShowCities(false);
        setMobileOpen(false);
        router.push(`/city/${hit.city.slug}`);
      },
      () => {
        setLocateError('Could not detect your location. Please allow location access.');
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  const firstName = (user?.name || user?.email || '?').split(' ')[0];
  const initial = (user?.name || user?.email || '?').charAt(0).toUpperCase();

  const accountLinks = [
    { href: '/account', label: 'Account', Icon: UserRound },
    { href: '/user/submissions', label: 'My Submissions', Icon: ClipboardList },
    { href: '/account/favorites', label: 'Saved stalls', Icon: Heart },
    ...(premiumOn ? [{ href: '/premium', label: user?.is_premium ? 'Premium (active)' : 'Premium', Icon: Crown }] : []),
  ];

  const navLink = `py-2.5 text-[13px] font-bold transition-colors ${isDarkText ? 'text-stone-600 hover:text-brand-500' : 'text-white/80 hover:text-white'}`;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex flex-col items-center"
    >
      <SiteStrips collapsed={scrolled || mobileOpen} />

      <div className="w-full flex flex-col items-center px-4 sm:pt-4 transition-all duration-300">
      <div className={`w-full max-w-5xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ${
        scrolled || showSearch || mobileOpen
          ? 'bg-white/95 backdrop-blur-md border border-stone-200/80 shadow-md rounded-[2rem]'
          : 'bg-transparent'
      }`}>
        <div className="flex items-center justify-between h-[76px]">

          {/* Left Side: Logo & Main Nav */}
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            {/* Logo */}
            <Link href="/" className="flex items-center outline-none z-10 group flex-shrink-0">
              <img src="/logo.png" alt="HungryBird Logo" className="h-12 sm:h-16 w-auto object-contain drop-shadow-md transition-transform group-hover:scale-105" />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6 z-10">
              {/* Home Link */}
              <Link href="/" className={navLink}>
                Home
              </Link>

              {/* Cities Dropdown: hover on desktop, tap / click on touch screens and keyboards */}
              <div className="relative group">
                <button
                  type="button"
                  className={`flex items-center gap-1 ${navLink}`}
                  onMouseEnter={() => setShowCities(true)}
                  onMouseLeave={() => setShowCities(false)}
                  onClick={() => setShowCities(true)}
                  aria-haspopup="true"
                  aria-expanded={showCities}
                >
                  Cities <ChevronDown size={14} />
                </button>

                {showCities && (
                  <div
                    className="absolute top-full left-0 pt-1.5 w-52"
                    onMouseEnter={() => setShowCities(true)}
                    onMouseLeave={() => setShowCities(false)}
                  >
                    <div className="bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden py-2 max-h-[70vh] overflow-y-auto">
                      <button
                        onClick={handleDetectLocation}
                        disabled={detecting}
                        className="w-full text-left px-4 py-2.5 text-sm font-bold text-brand-500 hover:bg-brand-50 transition-colors border-b border-stone-100 mb-1 flex items-center gap-2"
                      >
                        <MapPin size={14} />
                        {detecting ? 'Detecting...' : 'Detect Location'}
                      </button>
                      {locateError && <p className="px-4 py-1.5 text-xs text-red-500">{locateError}</p>}
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
                        <div className="px-4 py-2 text-sm text-stone-400">{citiesLoading ? 'Loading...' : 'No cities yet'}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <Link href="/about" className={navLink}>
                About Us
              </Link>
              <Link href="/contact" className={navLink}>
                Contact
              </Link>
              <Link href="/download" className={`py-2.5 text-[13px] font-bold transition-colors ${isDarkText ? 'text-brand-500 hover:text-brand-600' : 'text-brand-300 hover:text-brand-200'} flex items-center gap-1`}>
                <Smartphone size={14} /> Get App
              </Link>
            </div>
          </div>

          {/* Right Side: Search, Auth & Actions */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4 z-10">
              <button
                type="button"
                onClick={() => setShowSearch(s => !s)}
                aria-label={showSearch ? 'Close search' : 'Search'}
                aria-expanded={showSearch}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${isDarkText ? 'text-stone-600 hover:bg-stone-100 hover:text-brand-500' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
              >
                {showSearch ? <X size={17} /> : <Search size={17} />}
              </button>

              {/* User Profile / Login */}
              {user ? (
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-colors ${isDarkText ? 'border-stone-200 hover:bg-stone-50' : 'border-white/20 hover:bg-white/10'}`}
                    onClick={() => setShowProfile(!showProfile)}
                    aria-haspopup="menu"
                    aria-expanded={showProfile}
                  >
                    <div className="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-xs font-bold">
                      {initial}
                    </div>
                    <span className={`text-xs font-bold max-w-[7rem] truncate ${isDarkText ? 'text-stone-700' : 'text-white'}`}>
                      {firstName}
                    </span>
                    {premiumOn && user.is_premium && <Crown size={13} className="text-amber-500" aria-label="Premium" />}
                  </button>

                  {showProfile && (
                    <div role="menu" className="absolute top-full mt-2 right-0 w-56 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden py-2 z-50">
                      <div className="px-4 py-3 border-b border-stone-100 mb-1">
                        <p className="text-sm font-bold text-stone-900 truncate">{user.name}</p>
                        <p className="text-xs text-stone-500 truncate">{user.email}</p>
                      </div>
                      {accountLinks.map(({ href, label, Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          role="menuitem"
                          onClick={() => setShowProfile(false)}
                          className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 hover:text-brand-500 transition-colors"
                        >
                          <Icon size={15} className="text-stone-400" /> {label}
                        </Link>
                      ))}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { logout(); setShowProfile(false); }}
                        className="w-full text-left flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors border-t border-stone-100 mt-1"
                      >
                        <LogOut size={15} /> Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className={navLink}>
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

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className={`md:hidden w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-xl border transition-all ${isDarkText || showSearch || mobileOpen ? 'border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50' : 'border-white/20 text-white hover:bg-white/10'}`}
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>

        {/* Desktop search row */}
        {showSearch && (
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2 pb-4" role="search">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search stalls, dishes, areas..."
                aria-label="Search"
                className="w-full bg-stone-100 text-stone-900 text-sm border-none rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 outline-none"
              />
            </div>
            <button type="submit" className="btn-orange" style={{ minHeight: 40, padding: '0 1.25rem' }}>
              Search
            </button>
          </form>
        )}
      </div>

      {/* Mobile drawer: stacked under the bar, scrolls when taller than the visible screen */}
      {mobileOpen && (
        <div className="md:hidden w-full max-w-5xl mt-2 bg-white/95 backdrop-blur-md border border-stone-200 rounded-[1.5rem] p-4 shadow-lg flex flex-col gap-3 max-h-[calc(100vh-6rem)] supports-[height:100dvh]:max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative mb-2" role="search">
            <Search size={18} className="absolute left-3 top-3 text-stone-400" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search food, vendors..."
              aria-label="Search"
              className="w-full bg-stone-100 text-stone-900 text-base border-none rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-brand-500 outline-none"
            />
          </form>

          {/* Mobile Auth */}
          {user ? (
            <div className="bg-stone-50 p-4 rounded-2xl mb-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-stone-900 truncate flex items-center gap-1.5">
                    {user.name}
                    {premiumOn && user.is_premium && <Crown size={14} className="text-amber-500 flex-shrink-0" aria-label="Premium" />}
                  </p>
                  <p className="text-xs text-stone-500 truncate">{user.email}</p>
                </div>
                <button
                  onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-red-100 text-red-600 rounded-xl"
                  aria-label="Log out"
                >
                  <LogOut size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 min-[340px]:grid-cols-2 gap-2 mt-3">
                {accountLinks.map(({ href, label, Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white border border-stone-200 text-sm font-bold text-stone-700 hover:text-brand-600 min-w-0"
                  >
                    <Icon size={15} className="text-brand-500 flex-shrink-0" /> <span className="truncate">{label}</span>
                  </Link>
                ))}
              </div>
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
              href="/reviews"
              className="w-full text-center py-2.5 rounded-xl border border-stone-200 text-stone-700 font-bold hover:bg-stone-50 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              Reviews
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
                className="text-brand-500 hover:text-brand-600 flex items-center gap-1 normal-case py-2 -my-2"
              >
                <MapPin size={12} />
                {detecting ? 'Detecting...' : 'Detect'}
              </button>
            </h4>
            {locateError && <p className="px-2 pb-2 text-xs text-red-500">{locateError}</p>}
            <div className="grid grid-cols-2 gap-2">
              {cities.map(c => (
                 <Link
                   key={c.id}
                   href={`/city/${c.slug}`}
                   className="w-full text-center py-2.5 rounded-xl bg-stone-50 text-stone-700 text-sm font-medium hover:bg-brand-50 hover:text-brand-600 transition-colors"
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
      </div>
    </header>
  );
}
