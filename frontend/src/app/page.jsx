"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { Sparkles, ChevronRight, MapPin, Star, TrendingUp, Users, Award, ArrowDown, Flame, X, Camera } from 'lucide-react';
import { DestinationCard } from "@/components/ui/card-21";
import ReelsSection from '@/components/ReelsSection';
function Counter({ end, suffix = '', decimals = 0 }) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      const current = easeProgress * end;
      
      setVal(decimals ? parseFloat(current.toFixed(decimals)) : Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [end, decimals]);

  return <span>{val}{suffix}</span>;
}

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
  
  return (
    <div
      className={
        isHero ? 'sm:col-span-2 sm:row-span-2' : 'sm:col-span-1 sm:row-span-1'
      }
    >
      <DestinationCard
        imageUrl={`/city-${city.slug}.png`}
        location={city.name}
        stats={city.desc || 'Legendary Street Food'}
        href={`/city/${city.slug}`}
        themeColor={color}
      />
    </div>
  );
}

export default function HomePage() {
  const [cities, setCities] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    let isMounted = true;
    
    async function fetchData() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        
        const [citiesRes, vendorsRes] = await Promise.all([
          axios.get(`${API_URL}/api/cities?t=${Date.now()}`, { timeout: 5000 }).catch(() => null),
          axios.get(`${API_URL}/api/vendors?city=jaipur&limit=18`, { timeout: 5000 }).catch(() => null)
        ]);

        if (!isMounted) return;

        if (citiesRes?.data?.cities) {
          const list = citiesRes.data.cities;
          const jaipurIndex = list.findIndex(c => c.slug === 'jaipur');
          if (jaipurIndex > -1) {
            const jaipur = list.splice(jaipurIndex, 1)[0];
            list.unshift(jaipur);
          }
          setCities(list);
        }

        if (vendorsRes?.data?.vendors) {
          setVendors(vendorsRes.data.vendors);
        }
      } catch (err) {
        console.warn('Backend offline - falling back to default view state.', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  const mapCategory = (cat) => {
    if (!cat) return 'Snacks';
    const c = cat.toLowerCase();
    if (c.includes('chaat') || c.includes('patashi')) return 'Chaat';
    if (c.includes('sweet') || c.includes('ghewar') || c.includes('kulfi') || c.includes('lassi')) return 'Sweets';
    if (c.includes('eatery') || c.includes('traditional') || c.includes('meal')) return 'Meals';
    if (c.includes('chai') || c.includes('tea') || c.includes('snack') || c.includes('samosa') || c.includes('kachori')) return 'Snacks';
    return 'Snacks';
  };

  const formattedVendors = vendors.length > 0 
    ? vendors.map(v => ({
        id: v.id,
        name: v.name,
        category: mapCategory(v.food_category || v.cuisine_type),
        rawCategory: v.food_category || v.cuisine_type,
        price: v.price_min ? `₹${v.price_min}${v.price_max ? ' - ₹' + v.price_max : ''}` : (v.price_level || '₹'),
        rating: v.avg_rating ? v.avg_rating.toFixed(1) : '4.8',
        img: v.image_url || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600',
        area: v.area || 'Jaipur'
      }))
    : [
        { id: 1, name: 'Rawat Misthan Bhandar', category: 'Snacks', price: '₹30 - ₹40', rating: '4.9', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600', area: 'Sindhi Camp' },
        { id: 2, name: 'Lassiwala (Shop 312)', category: 'Sweets', price: '₹30 - ₹60', rating: '4.9', img: 'https://images.unsplash.com/photo-1571006682862-3cd6145277d1?q=80&w=600', area: 'MI Road' },
        { id: 3, name: 'Laxmi Misthan Bhandar (LMB)', category: 'Sweets', price: '₹50 - ₹150', rating: '4.8', img: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=600', area: 'Johari Bazaar' },
        { id: 4, name: 'Gulab Ji Chai Wale', category: 'Snacks', price: '₹20', rating: '4.8', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600', area: 'MI Road' },
        { id: 5, name: 'Sahu Chaiwala', category: 'Snacks', price: '₹20', rating: '4.7', img: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?q=80&w=600', area: 'Chandpole' },
        { id: 6, name: 'Pandit Kulfi', category: 'Sweets', price: '₹40 - ₹80', rating: '4.8', img: 'https://images.unsplash.com/photo-1560008511-11c63416e52d?q=80&w=600', area: 'Hawa Mahal' }
      ];

  const filteredItems = activeCategory === 'All' ? formattedVendors : formattedVendors.filter(item => item.category === activeCategory);




  return (
    <>
      {/* ══ HERO ══ */}
      <section className="relative w-full overflow-hidden bg-[#FDF8EE] font-jakarta pb-24 lg:min-h-screen flex items-center justify-center">
        {/* Texture / Ambient Background */}
        <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }} />
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
              className="absolute top-0 right-10 md:right-32 w-64 md:w-72 h-[500px] bg-white rounded-[3rem] p-3 shadow-2xl border-[12px] border-stone-800 z-20 overflow-hidden transform rotate-6"
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
              className="absolute bottom-10 left-0 md:-left-10 w-64 h-64 rounded-full border-[6px] border-[#FDF8EE] overflow-hidden shadow-2xl z-30"
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
              Every city hides a thousand flavours. Dive into our curated street food guides and start exploring the ones you love.
            </p>
          </div>

          {loading ? (
            <div className="flex justify-center py-32">
              <div className="w-9 h-9 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 auto-rows-[240px]">
              {cities.map((city, i) => <CityCard key={city.id} city={city} index={i} />)}
            </div>
          )}
        </motion.div>
      </section>

      {/* ══ DIVIDER ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glow-divider" />
      </div>

      {/* ══ INTERACTIVE DISCOVER CATEGORIES ══ */}
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
              Explore the most celebrated street foods across categories. Hand-picked and community-verified.
            </p>

            {/* Filter Buttons */}
            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {['All', 'Chaat', 'Meals', 'Snacks', 'Sweets'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`chip ${activeCategory === cat ? 'active' : ''}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Filterable Grid */}
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
              {filteredItems.map(item => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="card group cursor-pointer"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img src={item.img} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-brand-600 font-bold px-3 py-1 rounded-full text-xs shadow-sm">
                      {item.category}
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-extrabold text-stone-900 text-lg leading-tight">{item.name}</h4>
                      <span className="star-badge">★ {item.rating}</span>
                    </div>
                    <div className="flex justify-between items-center mt-4 pt-3 border-t border-stone-100">
                      <span className="text-stone-500 font-medium text-sm">Avg. Price</span>
                      <span className="text-brand-600 font-bold">{item.price}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      </motion.section>



      <ReelsSection />

      {/* ══ DIVIDER ══ */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="section-divider" />
        <div className="glow-divider" />
      </div>

      {/* ══ CTA ══ */}
      <section className="py-28 px-4 sm:px-6 lg:px-8 bg-stone-50">
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
              <div className="p-12 md:p-16 flex flex-col justify-center">
                <span className="eyebrow mb-5 inline-flex w-fit"><Star size={11} /> Be a Food Hero</span>
                <h2 className="text-[34px] md:text-[42px] font-extrabold text-stone-900 leading-tight tracking-[-0.03em] mb-4">
                  Know a hidden gem?
                  <br />
                  <span className="gradient-text">Share it.</span>
                </h2>
                <p className="text-stone-500 font-normal leading-[1.7] mb-9 max-w-[300px] text-[14px]">
                  Help fellow foodies discover your favourite street stall. Every submission strengthens the community.
                </p>
                <Link href="/submit-vendor" className="btn-orange w-fit gap-2 px-8 text-[0.875rem]" style={{ minHeight: 50 }}>
                  <Award size={15} /> Submit a Vendor
                </Link>
              </div>

              {/* Interactive side with premium overlapping card deck */}
              <div className="relative h-[480px] lg:h-auto overflow-hidden bg-stone-50/50 flex items-center justify-center p-6 sm:p-12 border-t lg:border-t-0 lg:border-l border-stone-200/60">
                {/* Clean background dot grid and soft radial glow */}
                <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(#f97316 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }} />
                <div className="absolute w-64 h-64 bg-brand-100/40 rounded-full blur-[90px] pointer-events-none" />

                {/* Overlapping Card Stack */}
                <div className="relative w-full max-w-[320px] h-[340px] flex items-center justify-center">

                  {/* Card 1: Back Left (Kalkatta Chat) */}
                  <div className="absolute bg-white rounded-2xl border border-stone-200/60 p-4 w-full shadow-md pointer-events-none opacity-60 origin-bottom-left rotate-[-6deg] -translate-x-[30px] -translate-y-[15px] scale-[0.92] hover:rotate-[-8deg] hover:-translate-x-[45px] hover:-translate-y-[25px] hover:scale-[0.95] transition-all duration-300">
                    <div className="h-24 rounded-lg overflow-hidden mb-2 bg-stone-100">
                      <img
                        src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=300&auto=format&fit=crop"
                        alt="Kalkatta Chat"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Sweets & Chaat</span>
                      <span className="text-[10px] text-stone-500 font-bold">★ 4.5</span>
                    </div>
                    <h4 className="font-bold text-stone-800 text-xs truncate">Kalkatta Chat Bhandar</h4>
                  </div>

                  {/* Card 2: Back Right (Jaipur Truckista) */}
                  <div className="absolute bg-white rounded-2xl border border-stone-200/60 p-4 w-full shadow-md pointer-events-none opacity-60 origin-bottom-right rotate-[5deg] translate-x-[30px] translate-y-[15px] scale-[0.92] hover:rotate-[8deg] hover:translate-x-[45px] hover:translate-y-[25px] hover:scale-[0.95] transition-all duration-300">
                    <div className="h-24 rounded-lg overflow-hidden mb-2 bg-stone-100">
                      <img
                        src="https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=300&auto=format&fit=crop"
                        alt="Momos"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Street Snacks</span>
                      <span className="text-[10px] text-stone-500 font-bold">★ 4.7</span>
                    </div>
                    <h4 className="font-bold text-stone-800 text-xs truncate">Jaipur Truckista</h4>
                  </div>

                  {/* Card 3: Main Active Front Card (Raju's Pav Bhaji) */}
                  <div className="relative bg-white rounded-2xl border border-stone-200 p-5 w-full z-10 shadow-[0_20px_48px_-12px_rgba(0,0,0,0.08)] cursor-pointer hover:-translate-y-2 hover:scale-[1.02] transition-all duration-300">
                    <div className="relative h-32 rounded-xl overflow-hidden mb-3.5 bg-stone-100">
                      <img
                        src="https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop"
                        alt="Pav Bhaji"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 left-2.5 bg-stone-900/80 backdrop-blur-md text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <MapPin size={9} className="text-amber-400" /> C-Scheme
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">Chaat / Street Food</span>
                      <span className="star-badge text-[10px] py-0.5">★ 4.8</span>
                    </div>
                    
                    <h4 className="font-extrabold text-stone-900 text-sm mb-1 leading-snug">Raju's Special Pav Bhaji</h4>
                    <p className="text-stone-500 text-[11px] leading-[1.6] line-clamp-2">
                      "The butter pav is perfectly toasted and the bhaji is cooked to order on a massive tawa..."
                    </p>
                    
                    <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] text-stone-400 font-medium">Submitted by Amit K.</span>
                      <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                        ✓ Verified Gem
                      </span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>
    </>
  );
}
