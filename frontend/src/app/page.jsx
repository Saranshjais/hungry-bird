"use client";

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import axios from 'axios';
import { Sparkles, ChevronRight, MapPin, Star, TrendingUp, Users, Award, ArrowDown, Flame } from 'lucide-react';

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

import { DestinationCard } from "@/components/ui/card-21";
import ReelsSection from '@/components/ReelsSection';
import StreetFoodCravings from '@/components/StreetFoodCravings';

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

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    axios.get(`${API_URL}/api/cities`)
      .then(r => {
        const list = r.data.cities || [];
        const jaipurIndex = list.findIndex(c => c.slug === 'jaipur');
        if (jaipurIndex > -1) {
          const jaipur = list.splice(jaipurIndex, 1)[0];
          list.unshift(jaipur);
        }
        setCities(list);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);



  return (
    <>
      {/* ══ HERO ══ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-transparent">
        {/* Full-vibrancy Background Video */}
        <div className="absolute inset-0 z-[-1]">
          <video
            key="bg-video-flower"
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover select-none"
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


      {/* ══ STREET FOOD CRAVINGS ══ */}
      <StreetFoodCravings />

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

      {/* ══ INTERACTIVE FOOD BANNERS CAROUSEL ══ */}
      <motion.section 
        className="py-10 sm:py-20 overflow-hidden"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false, margin: "-50px" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          <span className="eyebrow mb-4 inline-flex"><Sparkles size={11} /> Visual Feast</span>
          <h2 className="text-[36px] sm:text-[46px] font-extrabold text-stone-900 tracking-[-0.03em] leading-tight mb-2">
            Legendary Specialties
          </h2>
          <p className="text-stone-500 text-sm max-w-sm">
            Explore some of the most celebrated street foods in our guides.
          </p>
        </div>

        {/* Scrolling Carousel Track */}
        <div className="relative">
          {/* Subtle edge fades - reduced opacity so they don't look stark white */}
          <div className="absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[#fdfbf9]/90 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#fdfbf9]/90 to-transparent z-10 pointer-events-none" />
          
          <div className="overflow-hidden relative w-full group py-4">
            <div className="flex gap-4 w-max animate-marquee group-hover:pause-animate">
              {[
                { id: 1, title: 'Signature Dal Baati', desc: 'Served with rich warm ghee and sweet churma.' },
                { id: 2, title: 'Old Delhi Chole Bhature', desc: 'Fluffy fried bread with rich spicy chickpeas.' },
                { id: 3, title: 'Crispy Kachoris', desc: 'Flaky golden pastry filled with a spiced onion filling.' },
                { id: 4, title: 'Tawa Pav Bhaji', desc: 'Spiced vegetable mash cooked on heavy griddles.' },
                { id: 5, title: 'Tangy Golgappa Shots', desc: 'Crispy hollow puris filled with spicy mint water.' },
                { id: 6, title: 'Traditional Rabri Ghewar', desc: 'Fragrant sweet disc soaked in saffron sugar syrup.' },
                { id: 1, title: 'Signature Dal Baati', desc: 'Served with rich warm ghee and sweet churma.' },
                { id: 2, title: 'Old Delhi Chole Bhature', desc: 'Fluffy fried bread with rich spicy chickpeas.' },
                { id: 3, title: 'Crispy Kachoris', desc: 'Flaky golden pastry filled with a spiced onion filling.' },
                { id: 4, title: 'Tawa Pav Bhaji', desc: 'Spiced vegetable mash cooked on heavy griddles.' },
                { id: 5, title: 'Tangy Golgappa Shots', desc: 'Crispy hollow puris filled with spicy mint water.' },
                { id: 6, title: 'Traditional Rabri Ghewar', desc: 'Fragrant sweet disc soaked in saffron sugar syrup.' }
              ].map((b, i) => (
                <div
                  key={`${b.id}-${i}`}
                  className="card bg-[#fffcf7] w-72 flex flex-col h-full overflow-hidden shadow-sm flex-shrink-0 transition-transform duration-300 group/card hover:-translate-y-1"
                >
                  <div className="h-44 overflow-hidden relative shrink-0">
                    <img
                      src={`/banner${b.id}.jpg`}
                      alt={b.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/card:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
                    <span className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm text-stone-800 text-[9px] font-bold px-2 py-0.5 rounded-full">
                      Specialty 0{b.id}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col">
                    <h4 className="font-extrabold text-stone-900 text-[15px] mb-1.5 leading-tight">{b.title}</h4>
                    <p className="text-stone-400 text-xs leading-relaxed mt-auto">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
