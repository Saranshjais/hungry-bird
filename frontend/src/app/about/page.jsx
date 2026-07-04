"use client";

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { UtensilsCrossed, Heart, ShieldCheck, Users, MapPin, Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const staggerContainer = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 70, damping: 20 } }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-stone-50 overflow-hidden pt-16">
      
      {/* ── Hero Section ── */}
      <section className="relative min-h-[70vh] flex items-center justify-center pt-20 pb-32 px-4">
        {/* Ambient background blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
        
        <motion.div 
          style={{ y: y1, opacity }}
          className="relative z-10 text-center max-w-4xl mx-auto flex flex-col items-center"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="w-16 h-16 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20 mb-8"
          >
            <UtensilsCrossed size={32} className="text-white" strokeWidth={2} />
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-5xl md:text-7xl font-black text-stone-900 tracking-tight leading-[1.1] mb-6"
          >
            Uncovering India's <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">
              Hidden Culinary Gems
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="text-lg md:text-xl text-stone-500 max-w-2xl font-medium leading-relaxed"
          >
            We believe the best food isn't always found in fancy restaurants with air conditioning. It's found on bustling street corners, made by people who have perfected a single dish for generations.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Core Values Section ── */}
      <section className="py-24 px-4 bg-white relative z-20 border-y border-stone-200/50">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {[
              {
                icon: <ShieldCheck size={28} className="text-brand-500" />,
                title: "Curated & Verified",
                desc: "Every stall on HungryBird is verified by our community to ensure quality, hygiene, and authentic taste."
              },
              {
                icon: <Users size={28} className="text-blue-500" />,
                title: "Community Driven",
                desc: "We rely on passionate foodies to discover and submit hidden stalls that deserve the spotlight."
              },
              {
                icon: <Heart size={28} className="text-rose-500" />,
                title: "Support Local",
                desc: "By eating at these stalls, you are directly supporting small businesses and preserving culinary heritage."
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeUp}
                className="bg-stone-50 rounded-[2rem] p-8 border border-stone-100 hover:shadow-xl hover:shadow-stone-200/50 transition-all duration-500 hover:-translate-y-2 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-extrabold text-stone-900 mb-3">{feature.title}</h3>
                <p className="text-stone-500 leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Story Section ── */}
      <section className="py-32 px-4 relative overflow-hidden bg-stone-950 text-white">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-[150px] pointer-events-none" />
        
        <div className="max-w-5xl mx-auto relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
              Why we started <span className="text-brand-500">HungryBird</span>
            </h2>
            <div className="space-y-6 text-stone-300 text-lg leading-relaxed font-medium">
              <p>
                Have you ever wandered into a new city and asked a local, <span className="text-white italic">"Bhaiya, yahan sabse acha kya milta hai?"</span> (Brother, what's the best thing to eat here?). 
              </p>
              <p>
                That simple question is the soul of HungryBird. We realized that while delivery apps show you restaurants with marketing budgets, they miss the legendary 40-year-old chole bhature stall hidden in a narrow alley.
              </p>
              <p>
                We built HungryBird to map out these legends. No fake reviews, no paid promotions—just real food, recommended by real people.
              </p>
            </div>
            
            <Link 
              href="/submit-vendor" 
              className="mt-10 inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-stone-950 px-8 py-4 rounded-full font-extrabold text-lg transition-all hover:scale-105 active:scale-95"
            >
              Add a Hidden Stall <ArrowRight size={20} />
            </Link>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative h-[500px] rounded-[3rem] overflow-hidden shadow-2xl shadow-brand-500/20"
          >
            <img 
              src="https://images.unsplash.com/photo-1589301760014-d929f3979dbc?q=80&w=1000&auto=format&fit=crop" 
              alt="Indian Street Food" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8 right-8">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-2xl">
                <Sparkles size={24} className="text-brand-400 mb-3" />
                <p className="text-white font-bold text-lg leading-snug">"Some of the best meals of your life will be served on a paper plate."</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Join Section ── */}
      <section className="py-32 px-4 bg-brand-500 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto flex flex-col items-center"
        >
          <MapPin size={48} className="text-stone-950 mb-6" />
          <h2 className="text-4xl md:text-5xl font-black text-stone-950 mb-6 leading-tight">
            Ready to start exploring?
          </h2>
          <p className="text-stone-900/80 text-xl font-medium mb-10 max-w-xl">
            Join thousands of foodies who are discovering the authentic taste of India.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/" className="bg-stone-950 hover:bg-stone-900 text-white px-8 py-4 rounded-full font-extrabold text-lg transition-all hover:-translate-y-1 shadow-xl shadow-stone-900/20">
              Explore Cities
            </Link>
            <Link href="/reviews" className="bg-white/20 hover:bg-white/30 text-stone-950 border border-stone-950/20 px-8 py-4 rounded-full font-extrabold text-lg transition-all">
              Read Reviews
            </Link>
          </div>
        </motion.div>
      </section>
      
    </div>
  );
}
