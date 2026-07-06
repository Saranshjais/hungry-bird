"use client";

import { motion } from 'framer-motion';
import Image from 'next/image';
import { Apple, Play, Download, Star, CheckCircle2 } from 'lucide-react';

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-16 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center min-h-[calc(100vh-8rem)]">
          
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6 lg:pr-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-600 font-bold text-sm w-max mb-4">
              <Star size={16} fill="currentColor" />
              <span>Rated 4.9/5 by Foodies</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 leading-tight">
              Get <span className="gradient-text">HungryBird</span> <br /> on your phone
            </h1>
            
            <p className="text-lg text-stone-600 leading-relaxed max-w-lg">
              Discover hidden gems, legendary street stalls, and local favourites hand-picked by India's food community. Your ultimate street food companion.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button className="flex items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 text-white px-6 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                <Apple size={28} />
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs text-stone-300 font-medium leading-none mb-1">Download on the</span>
                  <span className="text-lg font-bold leading-none">App Store</span>
                </div>
              </button>
              
              <button className="flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 text-white px-6 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 shadow-brand-500/20">
                <Play size={28} fill="currentColor" className="text-white" />
                <div className="flex flex-col items-start text-left">
                  <span className="text-xs text-white/80 font-medium leading-none mb-1">GET IT ON</span>
                  <span className="text-lg font-bold leading-none">Google Play</span>
                </div>
              </button>
            </div>
            
            <div className="mt-8 space-y-3">
              {[
                "Find street food near your exact location",
                "Read trusted reviews from the community",
                "Save your favorite stalls for later"
              ].map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + (i * 0.1) }}
                  key={i} 
                  className="flex items-center gap-3 text-stone-700 font-medium"
                >
                  <CheckCircle2 size={20} className="text-brand-500 flex-shrink-0" />
                  <span>{feature}</span>
                </motion.div>
              ))}
            </div>

          </motion.div>

          {/* Right Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:h-[700px] flex items-center justify-center"
          >
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-100 to-orange-50 rounded-[3rem] -rotate-3 scale-95 opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-brand-200 to-transparent rounded-[3rem] rotate-3 scale-95 opacity-30"></div>
            
            <motion.div
              animate={{ 
                y: [-10, 10, -10],
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 w-full max-w-sm mx-auto"
            >
              <Image 
                src="/app-mockup.png" 
                alt="HungryBird Mobile App" 
                width={800} 
                height={1600} 
                className="w-full h-auto drop-shadow-2xl rounded-[2.5rem] border-8 border-white/50"
                priority
              />
            </motion.div>
            
            {/* Floating badges */}
            <motion.div 
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute top-1/4 -left-8 bg-white p-4 rounded-2xl shadow-xl flex items-center gap-3 z-20"
            >
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <Download size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-stone-900">100K+</p>
                <p className="text-xs text-stone-500 font-medium">Downloads</p>
              </div>
            </motion.div>
            
          </motion.div>
          
        </div>
      </div>
    </div>
  );
}
