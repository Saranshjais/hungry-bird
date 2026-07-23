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
  const [loading, setLoading] = useState(true);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');
  const [lightboxImage, setLightboxImage] = useState(null);

  const DISCOVER_ITEMS = [
    { id: 1, name: 'Kalkatta Chat Bhandar', category: 'Chaat', price: '₹120', rating: '4.8', img: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=600' },
    { id: 2, name: 'Amritsari Kulcha', category: 'Meals', price: '₹150', rating: '4.7', img: 'https://images.unsplash.com/photo-1626777552726-4c2810a41be7?q=80&w=600' },
    { id: 3, name: 'Mumbai Vada Pav', category: 'Snacks', price: '₹40', rating: '4.9', img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600' },
    { id: 4, name: 'Rabri Jalebi', category: 'Sweets', price: '₹90', rating: '4.6', img: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=600' },
    { id: 5, name: 'Delhi Chole Bhature', category: 'Meals', price: '₹180', rating: '4.9', img: 'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?q=80&w=600' },
    { id: 6, name: 'Pani Puri Shots', category: 'Chaat', price: '₹50', rating: '4.7', img: 'https://images.unsplash.com/photo-1584852077977-9cb267c7423e?q=80&w=600' },
  ];

  const filteredItems = activeCategory === 'All' ? DISCOVER_ITEMS : DISCOVER_ITEMS.filter(item => item.category === activeCategory);

  const GALLERY_IMAGES = [
    { id: 1, src: 'https://images.unsplash.com/photo-1555126634-323283e090fa?q=80&w=800', alt: 'Freshly made momos' },
    { id: 2, src: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=800', alt: 'Spicy Pav Bhaji' },
    { id: 3, src: 'https://images.unsplash.com/photo-1589301760014-d929f39ce9b1?q=80&w=800', alt: 'Sweet Jalebi' },
    { id: 4, src: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800', alt: 'Tangy Chaat' },
  ];

  useEffect(() => {
    let isMounted = true;
    
    async function fetchCities() {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        // Use a timestamp to prevent the browser or Next.js from caching the empty result
        const r = await axios.get(`${API_URL}/api/cities?t=${Date.now()}`, {
          timeout: 5000 // 5 second timeout to prevent infinite loading
        });
        
        if (!isMounted) return;
        
        const list = r.data?.cities || [];
        const jaipurIndex = list.findIndex(c => c.slug === 'jaipur');
        if (jaipurIndex > -1) {
          const jaipur = list.splice(jaipurIndex, 1)[0];
          list.unshift(jaipur);
        }
        setCities(list);
      } catch (err) {
        console.warn('Backend offline - falling back to empty cities array.', err);
        // On error, fallback to an empty array so loading spinner goes away
        if (isMounted) setCities([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCities();

    return () => {
      isMounted = false;
    };
  }, []);



  return (
    <>
      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent">
        {/* Full-vibrancy Background Video with Animated Mesh Fallback */}
        <div className="absolute inset-0 z-[-1] bg-mesh-gradient">
          <video
            key="bg-video-flower"
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            className={`w-full h-full object-cover select-none transition-opacity duration-1000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
            src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.webm"
          />
          {/* Subtle dark vignette overlay to anchor the card */}
          <div className="absolute inset-0 bg-stone-950/40" />
        </div>

        {/* Content Panel — Floating Glass panel container */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 sm:py-16 sm:px-12 text-center rounded-[2.5rem] bg-white border border-slate-100 shadow-[0_24px_64px_-16px_rgba(28,25,23,0.08)] mx-4 sm:mx-6 transition-all duration-500 animate-fadeIn">
          {/* Slogan Eyebrow */}
          <div className="flex justify-center mb-6">
            <span className="eyebrow bg-brand-50/90 border-brand-200/60 shadow-sm">
              <Sparkles size={11} className="text-brand-600" />
              Bhaiya! HungryBird Pe Ho Kya?
            </span>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="text-[44px] sm:text-[56px] md:text-[68px] lg:text-[80px] font-extrabold text-stone-900 leading-[0.95] tracking-[-0.04em]">
              The Streets
              <br />
              <span className="gradient-text">Feed the Soul</span>
            </h1>
          </div>

          {/* Subtext */}
          <p className="text-stone-500 text-[14px] sm:text-[16px] max-w-lg mx-auto mb-10 font-normal leading-[1.65] tracking-[0.01em]">
            Discover hidden gems, legendary street food, and local favourites
            — hand-picked by India's street food community.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link href="#cities" className="btn-orange gap-2 px-8 text-[0.875rem]" style={{ minHeight: 50 }}>
              <Flame size={16} /> Explore Cities
            </Link>
            <Link href="/submit-vendor" className="btn-ghost gap-2 px-8 text-[0.875rem] border-stone-300" style={{ minHeight: 50 }}>
              Add a Hidden Stall <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Scroll hint indicator */}
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center pointer-events-none">
          <div className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm border border-stone-200/50 flex items-center justify-center shadow-sm animate-bounce">
            <ArrowDown size={15} className="text-stone-500" />
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

      {/* ══ INTERACTIVE GALLERY WITH LIGHTBOX ══ */}
      <section className="py-10 sm:py-20 bg-stone-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-10">
            <div>
              <span className="eyebrow mb-3 inline-flex"><Camera size={11} className="mr-1"/> Visual Feast</span>
              <h2 className="text-[32px] sm:text-[40px] font-extrabold text-stone-900 tracking-[-0.03em] leading-tight">
                From the <span className="gradient-text">Streets</span>
              </h2>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GALLERY_IMAGES.map((img) => (
              <div 
                key={img.id} 
                className="relative h-64 rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => setLightboxImage(img)}
              >
                <img src={img.src} alt={img.alt} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-brand-600/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white font-bold text-lg tracking-wide">{img.alt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/95 p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.9 }}
              className="relative max-w-5xl w-full max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute -top-12 right-0 text-white hover:text-brand-400 transition-colors"
                onClick={() => setLightboxImage(null)}
              >
                <X size={32} />
              </button>
              <img src={lightboxImage.src} alt={lightboxImage.alt} className="w-full h-full object-contain rounded-xl shadow-2xl" />
              <div className="text-center mt-4 text-white font-medium text-lg">
                {lightboxImage.alt}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
