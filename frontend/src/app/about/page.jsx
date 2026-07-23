"use client";

import { useState, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Star, MapPin, Heart, ArrowRight, Sun, MessageSquareQuote, Smile, ThumbsUp } from 'lucide-react';
import Link from 'next/link';

const TEAM = [
  {
    name: "Saransh Jaiswal",
    role: "Founder & Developer",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop",
    favorites: [
      { label: "Go-to Spot", value: "Jaipur, Rajasthan" },
      { label: "Favorite Food", value: "Aloo Tikki, Dal baati" },
      { label: "Spice Tolerance", value: "Extreme 🌶️🌶️🌶️" }
    ]
  },
  {
    name: "Priya Patel",
    role: "Head of Discovery",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop",
    favorites: [
      { label: "Go-to Spot", value: "Manek Chowk, Ahmedabad" },
      { label: "Favorite Chaat", value: "Pani Puri (Sooji)" },
      { label: "Spice Tolerance", value: "Moderate 🌶️" }
    ]
  },
  {
    name: "Amit Kumar",
    role: "Top Reviewer",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop",
    favorites: [
      { label: "Go-to Spot", value: "Bada Bazar, Kolkata" },
      { label: "Favorite Chaat", value: "Jhalmuri" },
      { label: "Spice Tolerance", value: "High 🌶️🌶️" }
    ]
  }
];

const TESTIMONIALS = [
  {
    text: "“I never leave reviews, but I’ve been using HungryBird weekly for almost a year now... it is truly stellar. The recommendations are perfect and it feels so authentic.”",
    name: "Vikram S."
  },
  {
    text: "“Ok I LOVED this app! I found a 40-year-old chole bhature spot right in my neighborhood that I never knew existed. You can really tell the community puts thought into it.”",
    name: "Aarti M."
  },
  {
    text: "“Hands down my favorite food discovery platform. Everyone here is genuinely so passionate about street food.”",
    name: "Karan D."
  },
  {
    text: "“Best street food guide! Very reliable with multiple options. I love the clean interface and the fact that it highlights small vendors.”",
    name: "Neha R."
  }
];

export default function AboutPage() {
  const containerRef = useRef(null);
  const [activePic, setActivePic] = useState('markets');
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div ref={containerRef} className="min-h-screen bg-stone-50 overflow-hidden pt-16">
      
      {/* ── 1. Dynamic Collage Hero (Hello Sunbeam Inspired) ── */}
      <section className="relative min-h-[85vh] flex flex-col items-center pt-20 pb-16 px-4">
        {/* Ambient background blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          <motion.div style={{ y: y1, opacity }} className="max-w-xl">
            <h1 className="text-6xl md:text-7xl font-black text-stone-900 tracking-tight leading-[1.05] mb-6">
              Hello, <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">
                HungryBird!
              </span>
            </h1>
            <p className="text-xl text-stone-600 font-medium leading-relaxed mb-8">
              HungryBird isn't just a food app. It's a feeling. That electric energy of a bustling market, the smell of roasted spices, the sizzle of a hot tawa, and easy conversation over a paper plate: that's what we're capturing, every single day.
            </p>
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-stone-200 shadow-sm">
              <Star className="text-brand-500 fill-brand-500" size={24} />
              <span className="font-bold text-stone-800 tracking-tight">"The happiest way to explore!"</span>
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
              <img src="https://images.unsplash.com/photo-1626777552726-4c2810a41be7?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Chaat" />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="absolute bottom-10 left-32 w-[26rem] h-60 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white z-30"
            >
              <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?q=80&w=800&auto=format&fit=crop" className="w-full h-full object-cover" alt="Sweets" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── 2. The Creator (The Guy Behind the Bagels Inspired) ── */}
      <section className="py-32 bg-brand-50 relative overflow-hidden flex items-center justify-center min-h-[80vh] border-y border-stone-200">
        
        {/* Tilted Image - Absolute Positioned on the left */}
        <motion.div 
          initial={{ opacity: 0, rotate: -15, x: -100 }}
          whileInView={{ opacity: 1, rotate: -6, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, type: "spring" }}
          className="hidden lg:block absolute left-[5%] xl:left-[10%] top-1/2 -translate-y-1/2 z-20"
        >
          <div className="w-[280px] h-[400px] rounded-3xl overflow-hidden shadow-2xl border-[8px] border-white/50 bg-white">
            <img 
              src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop" 
              alt="Saransh Jaiswal" 
              className="w-full h-full object-cover"
            />
          </div>
        </motion.div>

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
                >
                  bustling markets
                </span>, finding the best <span 
                  className={`highlight-pic-card ${activePic === 'carts' ? 'active' : ''}`}
                  onMouseEnter={() => setActivePic('carts')}
                >
                  late-night carts
                </span>, or uncovering <span 
                  className={`highlight-pic-card ${activePic === 'alleys' ? 'active' : ''}`}
                  onMouseEnter={() => setActivePic('alleys')}
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
                src="https://images.unsplash.com/photo-1626777552726-4c2810a41be7?q=80&w=1000&auto=format&fit=crop" 
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

      {/* ── 4. Testimonials Marquee (What People Are Saying) ── */}
      <section className="py-24 bg-brand-50 overflow-hidden">
        <div className="text-center mb-16">
          <div className="text-brand-600 font-bold uppercase tracking-widest text-sm mb-2">Kind Words from Wonderful People</div>
          <h2 className="text-4xl md:text-5xl font-black text-stone-900">What People are Saying.</h2>
        </div>

        <div className="relative flex overflow-x-hidden group py-8">
          <div className="animate-marquee flex gap-8 px-4 whitespace-nowrap items-center group-hover:pause-animate">
            {TESTIMONIALS.concat(TESTIMONIALS).map((item, i) => {
              const isEven = i % 2 === 0;
              const rotationClass = isEven ? 'rotate-2' : '-rotate-[3deg]';
              return (
              <div 
                key={i} 
                className={`w-[320px] sm:w-[350px] shrink-0 bg-white rounded-3xl p-8 border border-stone-300 shadow-sm whitespace-normal flex flex-col justify-between transition-transform duration-300 hover:scale-105 hover:z-10 ${rotationClass}`}
              >
                <p className="text-stone-800 font-semibold leading-relaxed mb-8 text-sm">
                  {item.text}
                </p>
                <div className="flex items-end justify-between mt-auto">
                  <div className="font-black text-stone-900 text-xs uppercase tracking-widest">{item.name}</div>
                  <div className="text-brand-500 bg-brand-50 p-2 rounded-full">
                    {i % 4 === 0 ? <Smile size={24} strokeWidth={1.5} /> : i % 4 === 1 ? <Star size={24} strokeWidth={1.5} /> : i % 4 === 2 ? <ThumbsUp size={24} strokeWidth={1.5} /> : <Heart size={24} strokeWidth={1.5} />}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
      </section>

      {/* ── Call to Action ── */}
      <section className="py-24 px-4 bg-brand-500 text-center">
        <div className="max-w-3xl mx-auto flex flex-col items-center">
          <MapPin size={48} className="text-stone-950 mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-stone-950 mb-6 leading-tight">
            Ready to start exploring?
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <Link href="/" className="bg-stone-950 hover:bg-stone-900 text-white px-8 py-4 rounded-full font-extrabold text-lg transition-all hover:-translate-y-1 shadow-xl shadow-stone-900/20">
              Explore Cities
            </Link>
          </div>
        </div>
      </section>
      
    </div>
  );
}
