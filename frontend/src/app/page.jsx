"use client";

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { ChevronRight, MapPin, Star, TrendingUp, Award, Flame, ArrowRight, Store, RefreshCw, MapPinned, MessageSquarePlus, ShieldCheck, Crown } from 'lucide-react';
import { DestinationCard } from "@/components/ui/card-21";
import ReelsSection from '@/components/ReelsSection';
import LockedVendorCard from '@/components/vendors/LockedVendorCard';
import { useConfig } from '@/context/ConfigContext';
import { useAuth } from '@/context/AuthContext';
import { useCategories, useCities } from '@/lib/hooks';
import { api, errorMessage } from '@/lib/api';
import { cityImage } from '@/lib/site';
import { formatRating, isLocked, vendorArea, vendorCategory, vendorImageOrPlaceholder, vendorPrice } from '@/lib/vendors';

const THEME_COLORS = [
  "22 100% 50%", // Orange
  "150 50% 25%", // Green
  "250 50% 30%", // Purple
  "350 70% 40%", // Red
  "45 100% 45%", // Yellow
  "200 80% 40%", // Blue
];

function CityCard({ city, index }) {
  const isHero = index === 0;
  const color = THEME_COLORS[index % THEME_COLORS.length];
  const count = Number(city.vendor_count) || 0;
  const stats = city.description || city.desc || (count > 0 ? `${count} ${count === 1 ? 'stall' : 'stalls'} to explore` : 'Street food guide');

  return (
    <div
      className={
        isHero ? 'sm:col-span-2 sm:row-span-2' : 'sm:col-span-1 sm:row-span-1'
      }
    >
      <DestinationCard
        imageUrl={cityImage(city)}
        location={city.name}
        stats={stats}
        href={`/city/${city.slug}`}
        themeColor={color}
      />
    </div>
  );
}

function SpecialtyCard({ vendor }) {
  const premiumOn = useConfig().premium.enabled;
  if (isLocked(vendor)) return <LockedVendorCard vendor={vendor} />;
  const category = vendorCategory(vendor);
  const rating = formatRating(vendor);
  const price = vendorPrice(vendor);
  const area = vendorArea(vendor);

  return (
    <Link href={`/vendor/${vendor.id}`} className="card group cursor-pointer flex flex-col h-full">
      <div className="relative h-48 overflow-hidden bg-stone-100">
        <img src={vendorImageOrPlaceholder(vendor)} alt={vendor.name || ''} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        {category && (
          <div className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate bg-white/90 backdrop-blur-sm text-brand-600 font-bold px-3 py-1 rounded-full text-xs shadow-sm">
            {category}
          </div>
        )}
        {premiumOn && vendor.is_premium && (
          <div className="absolute top-3 right-3 bg-amber-400 text-stone-900 font-black px-2 py-0.5 rounded-full text-[10px] shadow-sm flex items-center gap-1">
            <Crown size={10} /> Premium
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start gap-3 mb-1">
          <h4 className="font-extrabold text-stone-900 text-lg leading-tight min-w-0 break-words group-hover:text-brand-600 transition-colors">{vendor.name}</h4>
          {rating ? <span className="star-badge flex-shrink-0">★ {rating}</span> : <span className="text-[10px] font-bold text-stone-400 bg-stone-100 px-2 py-0.5 rounded-md flex-shrink-0">New</span>}
        </div>
        {area && <p className="text-sm text-stone-500 m-0 flex items-center gap-1"><MapPin size={12} className="text-brand-500 flex-shrink-0" /> <span className="truncate">{area}</span></p>}
        {price && (
          <div className="flex justify-between items-center gap-3 mt-auto pt-3 border-t border-stone-100" style={{ marginTop: 'auto' }}>
            <span className="text-stone-500 font-medium text-sm">Price</span>
            <span className="text-brand-600 font-bold text-right">{price}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

function StateBox({ icon: Icon, title, text, action }) {
  return (
    <div className="panel bg-white p-10 text-center max-w-xl mx-auto">
      <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200 flex items-center justify-center mx-auto mb-4">
        <Icon size={20} className="text-stone-400" />
      </div>
      <h3 className="text-lg font-extrabold text-stone-900 mb-2">{title}</h3>
      {text && <p className="text-sm text-stone-500 mb-6">{text}</p>}
      {action}
    </div>
  );
}

const HOW_IT_WORKS = [
  { Icon: MapPinned, title: 'Drop a pin', text: 'Mark the stall on the map, or use your current location.' },
  { Icon: MessageSquarePlus, title: "Tell us what's good", text: 'Add its name, what it serves and your rating.' },
  { Icon: ShieldCheck, title: 'We take a look', text: 'Our team reviews every suggestion before it goes live.' },
];

export default function HomePage() {
  const config = useConfig();
  const { user } = useAuth();
  const { cities, loading: citiesLoading, error: citiesError, reload: reloadCities } = useCities();
  const { categories } = useCategories();
  const [activeCategory, setActiveCategory] = useState(null); // category slug or null = All
  const [feed, setFeed] = useState({ loading: true, error: null, vendors: [] });
  const [feedKey, setFeedKey] = useState(0);

  // Admin's default city first (falls back to the first active city).
  const orderedCities = useMemo(() => {
    const list = [...cities];
    const i = list.findIndex(c => c.slug === config.defaultCity);
    if (i > 0) list.unshift(list.splice(i, 1)[0]);
    return list;
  }, [cities, config.defaultCity]);

  const homeCity = config.loaded && !citiesLoading ? (orderedCities[0] || null) : null;
  const waitingForCity = !config.loaded || citiesLoading;

  useEffect(() => {
    if (!homeCity) return undefined;
    let alive = true;
    setFeed(f => ({ ...f, loading: true, error: null }));
    const cat = activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : '';
    api(`/api/vendors?city=${encodeURIComponent(homeCity.slug)}&limit=18${cat}`, { timeout: 30000 })
      .then(d => alive && setFeed({ loading: false, error: null, vendors: d.vendors || [] }))
      .catch(err => alive && setFeed({ loading: false, error: err, vendors: [] }));
    return () => { alive = false; };
  }, [homeCity?.slug, activeCategory, feedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const feedLoading = waitingForCity || (homeCity && feed.loading);
  const activeCategoryName = activeCategory ? categories.find(c => c.slug === activeCategory)?.name : null;

  return (
    <>
      {/* ══ HERO ══ */}
      <section className="relative w-full overflow-hidden bg-[#FDF8EE] font-jakarta pb-24 lg:min-h-screen flex items-center justify-center">
        {/* Ambient Background */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Decorative Dotted Path & Pins */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30 stroke-brand-500 hidden md:block" viewBox="0 0 1440 800" fill="none">
          <path d="M 400 600 C 600 600, 500 300, 700 300 C 900 300, 800 500, 1000 500" strokeWidth="3" strokeDasharray="12 12" />
        </svg>

        <div className="relative w-full max-w-7xl mx-auto px-4 pt-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center z-10">
          
          {/* Left Column: Text & Signposts */}
          <div className="flex flex-col items-start pt-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="font-kalam font-bold text-6xl md:text-8xl leading-[1.1] text-[#2C2825] mb-6">
                Discover. <br/>
                <span className="text-brand-500">Explore.</span> <br/>
                Eat Local.
              </h1>
              
              <p className="text-xl md:text-2xl text-stone-700 font-medium mb-2">
                Find hidden street food gems around you.
              </p>
              <p className="text-xl md:text-2xl text-stone-700 font-medium mb-12">
                <span className="text-brand-500 font-bold">Real</span> food. <span className="text-brand-500 font-bold">Real</span> people. <span className="text-brand-500 font-bold">Real</span> stories.
              </p>
            </motion.div>

            {/* Signpost Badges */}
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col gap-4 relative"
            >
              <div className="absolute left-6 top-0 bottom-[-40px] w-4 bg-[#C1A27A] rounded border-x border-[#8A6A4B]" />
              <div className="flex items-center gap-2 relative z-10 translate-x-4">
                <div className="bg-[#EAE0D0] border-2 border-[#8A6A4B] text-[#5C452C] font-bold px-6 py-2 rounded-sm shadow-md flex items-center justify-between min-w-[200px]">
                  LOCAL FLAVORS <ChevronRight size={16} />
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10 -translate-x-2">
                <div className="bg-[#EAE0D0] border-2 border-[#8A6A4B] text-[#5C452C] font-bold px-6 py-2 rounded-sm shadow-md flex items-center justify-between min-w-[200px]">
                  <ChevronRight size={16} className="rotate-180" /> HIDDEN GEMS
                </div>
              </div>
              <div className="flex items-center gap-2 relative z-10 translate-x-8">
                <div className="bg-[#EAE0D0] border-2 border-[#8A6A4B] text-[#5C452C] font-bold px-6 py-2 rounded-sm shadow-md flex items-center justify-between min-w-[200px]">
                  GOOD VIBES <ChevronRight size={16} />
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Collage */}
          <div className="relative h-[550px] w-full mt-12 lg:mt-0">
            
            {/* Phone Mockup */}
            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="absolute top-0 right-4 min-[360px]:right-10 md:right-32 w-56 min-[360px]:w-64 md:w-72 h-[500px] bg-white rounded-[3rem] p-3 shadow-2xl border-[12px] border-stone-800 z-20 overflow-hidden transform rotate-6"
            >
              {/* Phone Screen content - Map image */}
              <div className="w-full h-full rounded-[2rem] overflow-hidden relative">
                <img src="https://images.unsplash.com/photo-1524661135-423995f22d0b?q=80&w=400&auto=format&fit=crop" className="w-full h-full object-cover" alt="Map" />
                {/* Overlay map pins */}
                <MapPin className="absolute top-1/4 left-1/4 text-brand-500 fill-brand-500 drop-shadow-md" size={32} />
                <MapPin className="absolute top-1/2 left-2/3 text-brand-500 fill-brand-500 drop-shadow-md" size={32} />
                <MapPin className="absolute bottom-1/3 left-1/3 text-brand-500 fill-brand-500 drop-shadow-md" size={32} />
              </div>
            </motion.div>

            {/* Food Platter 1: Panipuri */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="absolute bottom-10 left-0 lg:-left-10 w-64 h-64 rounded-full border-[6px] border-[#FDF8EE] overflow-hidden shadow-2xl z-30"
            >
              <img src="https://images.unsplash.com/photo-1626777552726-4c2810a41be7?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Pani Puri" />
            </motion.div>

            {/* Food Platter 2: Samosa */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="absolute bottom-0 right-0 w-56 h-56 rounded-full border-[6px] border-[#FDF8EE] overflow-hidden shadow-2xl z-40 transform rotate-12"
            >
              <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Samosa" />
            </motion.div>

            {/* Large Map Pin graphic */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-10 left-20 z-10"
            >
               <MapPin className="text-brand-500 fill-brand-500 drop-shadow-xl" size={100} />
            </motion.div>
            
          </div>
        </div>
      </section>

      {/* ══ CITIES BENTO ══ */}
      <section id="cities" className="py-10 sm:py-20 px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <motion.div
          className="max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="eyebrow mb-4 inline-flex">
              <TrendingUp size={12} className="mr-1.5" /> Trending Destinations
            </span>
            <h2 className="text-[38px] sm:text-[48px] font-extrabold text-stone-900 tracking-tight leading-tight mb-4">
              Pick Your City
            </h2>
            <p className="text-stone-500 font-medium text-[15px] sm:text-[16px] leading-[1.7]">
              Every city hides a thousand flavours. Dive into our street food guides and start exploring the ones you love.
            </p>
          </div>

          {citiesLoading ? (
            <div className="flex justify-center py-32">
              <div className="w-9 h-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : citiesError ? (
            <StateBox
              icon={RefreshCw}
              title="We couldn't load the cities"
              text={errorMessage(citiesError)}
              action={<button type="button" onClick={reloadCities} className="btn-primary"><RefreshCw size={15} /> Try again</button>}
            />
          ) : orderedCities.length === 0 ? (
            <StateBox icon={MapPin} title="Cities are coming soon" text="We're mapping our first city right now. Know a great stall? Tell us about it." action={<Link href="/submit-vendor" className="btn-orange">Suggest a stall</Link>} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 auto-rows-[240px]">
              {orderedCities.map((city, i) => <CityCard key={city.id ?? city.slug} city={city} index={i} />)}
            </div>
          )}
        </motion.div>
      </section>

      {/* ══ DIVIDER ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glow-divider" />
      </div>

      {/* ══ INTERACTIVE DISCOVER CATEGORIES ══ */}
      {(waitingForCity || homeCity) && (
      <motion.section
        className="py-10 sm:py-20 bg-white"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="eyebrow mb-4 inline-flex"><Flame size={11} className="mr-1" /> Discover the Best</span>
            <h2 className="text-[36px] sm:text-[46px] font-extrabold text-stone-900 tracking-[-0.03em] leading-tight mb-2">
              <span className="gradient-text">Legendary</span> Specialties
            </h2>
            <p className="text-stone-500 text-sm max-w-md mx-auto mb-8">
              {homeCity ? `Top-rated stalls in ${homeCity.name}, rated by the HungryBird community.` : 'Top-rated stalls, rated by the HungryBird community.'}
            </p>

            {/* Filter Buttons (admin-managed categories) */}
            {categories.length > 0 && (
              <div className="flex sm:flex-wrap sm:justify-center gap-3 mb-10 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
                <button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  aria-pressed={!activeCategory}
                  className={`chip flex-shrink-0 ${!activeCategory ? 'active' : ''}`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id ?? cat.slug}
                    type="button"
                    onClick={() => setActiveCategory(cat.slug)}
                    aria-pressed={activeCategory === cat.slug}
                    className={`chip flex-shrink-0 ${activeCategory === cat.slug ? 'active' : ''}`}
                  >
                    {cat.icon && <span aria-hidden="true">{cat.icon}</span>} {cat.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {feedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true" aria-label="Loading stalls">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="h-48 bg-stone-100 animate-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-4 bg-stone-100 rounded w-2/3 animate-pulse" />
                    <div className="h-3 bg-stone-100 rounded w-1/3 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : feed.error ? (
            <StateBox
              icon={RefreshCw}
              title="We couldn't load the stalls"
              text={errorMessage(feed.error)}
              action={<button type="button" onClick={() => setFeedKey(k => k + 1)} className="btn-primary"><RefreshCw size={15} /> Try again</button>}
            />
          ) : feed.vendors.length === 0 ? (
            <StateBox
              icon={Store}
              title={activeCategoryName ? `No ${activeCategoryName} stalls yet` : 'No stalls listed yet'}
              text="Know a great one? Add it and help the community discover it."
              action={<Link href="/submit-vendor" className="btn-orange">Add a stall</Link>}
            />
          ) : (
            <>
              <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {feed.vendors.map(v => (
                    <motion.div
                      key={v.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                    >
                      <SpecialtyCard vendor={v} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
              {homeCity && (
                <div className="text-center mt-10">
                  <Link href={`/city/${homeCity.slug}`} className="btn-primary">
                    See all stalls in {homeCity.name} <ArrowRight size={15} />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </motion.section>
      )}

      <ReelsSection />

      {/* ══ DIVIDER ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-divider" />
        <div className="glow-divider" />
      </div>

      {/* ══ CTA ══ */}
      <section className="py-16 sm:py-28 px-4 sm:px-6 lg:px-8 bg-stone-50">
        <motion.div
          className="max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false, margin: "-50px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <div className="relative rounded-[2rem] overflow-hidden bg-white border border-stone-200">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-50/30 to-transparent pointer-events-none" />

            <div className="relative grid grid-cols-1 lg:grid-cols-2">
              {/* Text */}
              <div className="p-8 sm:p-12 md:p-16 flex flex-col justify-center">
                <span className="eyebrow mb-5 inline-flex w-fit"><Star size={11} /> Be a Food Hero</span>
                <h2 className="text-[34px] md:text-[42px] font-extrabold text-stone-900 leading-tight tracking-[-0.03em] mb-4">
                  Know a hidden gem?
                  <br />
                  <span className="gradient-text">Share it.</span>
                </h2>
                <p className="text-stone-500 font-normal leading-[1.7] mb-9 max-w-[300px] text-[14px]">
                  Help fellow foodies discover your favourite street stall. Every submission strengthens the community.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href="/submit-vendor" className="btn-orange w-fit gap-2 px-8 text-[0.875rem]" style={{ minHeight: 50 }}>
                    <Award size={15} /> Submit a Vendor
                  </Link>
                  {user && (
                    <Link href="/user/submissions" className="btn-ghost w-fit" style={{ minHeight: 50 }}>
                      My submissions
                    </Link>
                  )}
                </div>
              </div>

              {/* How it works */}
              <div className="relative overflow-hidden bg-stone-50/50 flex items-center justify-center p-6 sm:p-12 border-t lg:border-t-0 lg:border-l border-stone-200/60">
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#f97316 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
                <div className="absolute w-64 h-64 bg-brand-100/40 rounded-full blur-[90px] pointer-events-none" />

                <ol className="relative w-full max-w-[360px] space-y-4">
                  {HOW_IT_WORKS.map(({ Icon, title, text }, i) => (
                    <li key={title} className="flex items-start gap-4 bg-white rounded-2xl border border-stone-200/70 p-4 shadow-sm">
                      <div className="w-11 h-11 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center flex-shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-black text-brand-600 uppercase tracking-widest m-0">Step {i + 1}</p>
                        <h4 className="font-extrabold text-stone-900 text-sm leading-snug">{title}</h4>
                        <p className="text-stone-500 text-[12px] leading-[1.6] m-0">{text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
