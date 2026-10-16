"use client";

import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Star, Heart, ArrowRight, Smile, ThumbsUp, Smartphone, MapPin } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

// Approved platform reviews from /api/site-reviews (moderated in the admin panel).
function useSiteReviews() {
  const [reviews, setReviews] = useState([]);
  useEffect(() => {
    api('/api/site-reviews', { auth: false })
      .then((d) => setReviews((d.site_reviews || []).filter((r) => r && r.review_text && r.author_name)))
      .catch(() => setReviews([]));
  }, []);
  return reviews;
}

function TestimonialCard({ item, i, className = '' }) {
  const isEven = i % 2 === 0;
  const rotationClass = isEven ? 'rotate-2' : '-rotate-[3deg]';
  return (
    <div
      className={`w-[min(320px,calc(100vw-3rem))] sm:w-[350px] shrink-0 bg-white rounded-3xl p-8 border border-stone-300 shadow-sm whitespace-normal flex flex-col justify-between transition-transform duration-300 hover:scale-105 hover:z-10 ${rotationClass} ${className}`}
    >
      <p className="text-stone-800 font-semibold leading-relaxed mb-8 text-sm break-words">
        &ldquo;{item.review_text}&rdquo;
      </p>
      <div className="flex items-end justify-between mt-auto gap-3">
        <div className="min-w-0">
          <div className="font-black text-stone-900 text-xs uppercase tracking-widest break-words">{item.author_name}</div>
          {Number(item.rating_value) > 0 && (
            <div className="flex items-center gap-0.5 mt-1" aria-label={`${Number(item.rating_value)} out of 5`}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} size={11} className={Math.round(item.rating_value) >= s ? 'fill-brand-500 text-brand-500' : 'fill-stone-100 text-stone-200'} />
              ))}
            </div>
          )}
        </div>
        <div className="text-brand-500 bg-brand-50 p-2 rounded-full flex-shrink-0">
          {i % 4 === 0 ? <Smile size={24} strokeWidth={1.5} /> : i % 4 === 1 ? <Star size={24} strokeWidth={1.5} /> : i % 4 === 2 ? <ThumbsUp size={24} strokeWidth={1.5} /> : <Heart size={24} strokeWidth={1.5} />}
        </div>
      </div>
    </div>
  );
}

export default function AboutPage() {
  const containerRef = useRef(null);
  const [activePic, setActivePic] = useState('markets');
  const testimonials = useSiteReviews();
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-amber-200 overflow-hidden pt-16 relative">
      {/* Colorful Mesh Gradient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-brand-400/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[800px] h-[800px] bg-amber-400/50 rounded-full blur-[120px] pointer-events-none" />
      
      {/* ── 1. Dynamic Collage Hero (Hello Sunbeam Inspired) ── */}
      <section className="relative min-h-[85vh] flex flex-col items-center pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          <motion.div style={{ y: y1, opacity }} className="max-w-xl">
            {/* clamp() shrinks the heading below ~400px so "HungryBird!" fits on narrow phones */}
            <h1 className="text-[clamp(2.5rem,15vw,3.75rem)] md:text-7xl font-black text-stone-900 tracking-tight leading-[1.05] mb-6">
              Hello, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">
                HungryBird!
              </span>
            </h1>
            <p className="text-xl text-stone-600 font-medium leading-relaxed mb-8">
              HungryBird isn't just a food app. It's a feeling. That electric energy of a bustling market, the smell of roasted spices, the sizzle of a hot tawa, and easy conversation over a paper plate: that's what we're capturing, every single day.
            </p>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <MapPin className="text-brand-500 flex-shrink-0" size={24} />
              <span className="font-bold text-stone-800 tracking-tight">Bhaiya! Hungry Bird Pe Ho Kya?</span>
            </div>
          </motion.div>

          {/* Collage Images */}
          <div className="relative h-[600px] w-full hidden md:block">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="absolute top-0 left-0 w-64 h-80 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-20"
            >
              <img src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Street Food" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9, rotate: 5 }}
              animate={{ opacity: 1, scale: 1, rotate: 3 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="absolute top-20 right-0 w-[22rem] h-64 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-10"
            >
              <img src="https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Chaat" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute bottom-10 left-32 lg:left-12 xl:left-32 w-[26rem] h-60 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-30"
            >
              <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Sweets" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. The Creator (The Guy Behind the Bagels Inspired) ── */}
      <section className="py-32 bg-brand-50 relative overflow-hidden flex items-center justify-center min-h-[80vh] border-y border-stone-200">
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center">
          <div className="text-brand-500 text-2xl md:text-3xl mb-4 italic font-bold" style={{ fontFamily: 'cursive' }}>
            Building Spaces Foodies Love
          </div>
          <h2 className="text-5xl md:text-7xl font-black text-stone-900 mb-10 leading-[1.1] tracking-tight">
            The Guy Behind <br />the App.
          </h2>
          
          <div className="space-y-8 text-stone-800 font-bold text-sm sm:text-base leading-loose max-w-2xl mx-auto px-4">
            <p>
              Saransh Jaiswal has been building digital spaces people love for a while now. Based in Jaipur, Rajasthan, he's obsessed with creating platforms that feel good to use and connect people over shared passions.
            </p>
            <p>
              HungryBird started with a simple idea: The street food scene deserved a platform with real craft behind it. A place where you can find authentic Aloo Tikki, legendary Dal Baati, and food worth traveling for—all wrapped in an app that makes the discovery feel a little better.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Interactive Text-to-Image (Ways to Explore) ── */}
      <section className="py-32 bg-stone-950 text-white relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            {/* Interactive Text */}
            <div className="max-w-xl">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-8">
                There's Room to Explore.
              </h2>
              <p className="text-xl text-stone-400 leading-relaxed font-medium mb-6">
                We wanted an app great for discovering quick bites, or long food walks with friends, or intense weekend cravings. With three different vibes to choose from, navigating the <span 
                  className={`highlight-pic-card ${activePic === 'markets' ? 'active' : ''}`}
                  onMouseEnter={() => setActivePic('markets')}
                  onClick={() => setActivePic('markets')}
                >
                  bustling markets
                </span>, finding the best <span 
                  className={`highlight-pic-card ${activePic === 'carts' ? 'active' : ''}`}
                  onMouseEnter={() => setActivePic('carts')}
                  onClick={() => setActivePic('carts')}
                >
                  late-night carts
                </span>, or uncovering <span 
                  className={`highlight-pic-card ${activePic === 'alleys' ? 'active' : ''}`}
                  onMouseEnter={() => setActivePic('alleys')}
                  onClick={() => setActivePic('alleys')}
                >
                  hidden alleys
                </span>, you’re very likely to have everything you need.
              </p>
              <p className="text-xl text-stone-400 leading-relaxed font-medium">
                The name? It's not just poetic. The "Hungry Bird" catches the early morning specials and the late-night leftovers. Once you've tasted the food, you get it.
              </p>
            </div>

            {/* Absolute Positioned Images container */}
            <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden bg-stone-900 border border-stone-800 shadow-2xl">
              {/* Image 1: Markets */}
              <img 
                data-pic-name="markets" 
                className={activePic === 'markets' ? 'active' : ''}
                src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=1000&auto=format&fit=crop" 
                alt="Bustling Markets" 
              />
              {/* Image 2: Carts */}
              <img 
                data-pic-name="carts" 
                className={activePic === 'carts' ? 'active' : ''}
                src="https://images.unsplash.com/photo-1601050690597-df0568f70950?q=80&w=1000&auto=format&fit=crop" 
                alt="Late-night Carts" 
              />
              {/* Image 3: Alleys */}
              <img 
                data-pic-name="alleys" 
                className={activePic === 'alleys' ? 'active' : ''}
                src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=1000&auto=format&fit=crop" 
                alt="Hidden Alleys" 
              />
            </div>
            
          </div>
        </div>
      </section>

      {/* ── 4. Testimonials (approved reviews of HungryBird; hidden until there are some) ── */}
      {testimonials.length > 0 && (
        <section className="py-24 bg-brand-50 overflow-hidden">
          <div className="text-center mb-16 px-4">
            <div className="text-brand-600 font-bold uppercase tracking-widest text-sm mb-2">Kind Words from Wonderful People</div>
            <h2 className="text-4xl md:text-5xl font-black text-stone-900">What People are Saying.</h2>
            <Link href="/reviews" className="inline-flex items-center gap-1.5 mt-5 text-sm font-bold text-brand-600 hover:text-brand-700 py-2">
              Read all reviews <ArrowRight size={14} />
            </Link>
          </div>

          {testimonials.length >= 4 ? (
            <div className="relative flex overflow-x-hidden group py-8">
              <div className="animate-marquee flex gap-8 px-4 whitespace-nowrap items-center group-hover:pause-animate">
                {testimonials.concat(testimonials).map((item, i) => (
                  <TestimonialCard key={`${item.id}-${i}`} item={item} i={i} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8 px-4 py-8">
              {testimonials.map((item, i) => <TestimonialCard key={item.id} item={item} i={i} />)}
            </div>
          )}
        </section>
      )}

      {/* ── Call to Action ── */}
      <section className="relative overflow-hidden bg-stone-950 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <img src="/logo.png" alt="HungryBird" className="h-24 w-auto object-contain mx-auto lg:mx-0 mb-6 drop-shadow-lg" />
            <h2 className="text-4xl md:text-5xl font-black text-white leading-tight tracking-tight mb-5">
              Ready to explore your <br className="hidden sm:block" />
              <span className="text-brand-500">city&apos;s street food?</span>
            </h2>
            <p className="text-lg mb-8 max-w-xl mx-auto lg:mx-0" style={{ color: '#a8a29e' }}>
              Find stalls near you, save your favourites and share the hidden gems only locals know about.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/download" className="btn-orange">
                <Smartphone size={16} /> Get the app
              </Link>
              <Link href="/#cities" className="btn-ghost">
                Explore cities <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="relative max-w-xl w-full mx-auto">
            <img src="/3-phones-1.png" alt="The HungryBird app on three phones" className="w-full h-auto drop-shadow-2xl" loading="lazy" />
          </div>
        </div>
      </section>
    </div>
  );
}
