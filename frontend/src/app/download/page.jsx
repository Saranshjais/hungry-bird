"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Apple, Play, Smartphone, CheckCircle2, Clock } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';

const isUrl = (u) => /^https?:\/\//i.test(u || '');

export default function DownloadPage() {
  const config = useConfig();
  const appStore = isUrl(config.appStoreUrl) ? config.appStoreUrl : '';
  const playStore = isUrl(config.playStoreUrl) ? config.playStoreUrl : '';
  const noStores = config.loaded && !appStore && !playStore;

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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-100 text-brand-600 font-bold text-sm w-max max-w-full mb-4">
              <Smartphone size={16} className="flex-shrink-0" />
              <span>Street food, wherever you are</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-stone-900 leading-tight">
              Get <span className="gradient-text">HungryBird</span> <br /> on your phone
            </h1>
            
            <p className="text-lg text-stone-600 leading-relaxed max-w-lg">
              Discover hidden gems, legendary street stalls, and local favourites hand-picked by India's food community. Your ultimate street food companion.
            </p>

            {(appStore || playStore) && (
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                {appStore && (
                  <a href={appStore} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-stone-900 hover:bg-stone-800 text-white px-6 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
                    <Apple size={28} />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs text-stone-300 font-medium leading-none mb-1">Download on the</span>
                      <span className="text-lg font-bold leading-none">App Store</span>
                    </div>
                  </a>
                )}

                {playStore && (
                  <a href={playStore} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-3 bg-brand-500 hover:bg-brand-600 text-white px-6 py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 shadow-brand-500/20">
                    <Play size={28} fill="currentColor" className="text-white" />
                    <div className="flex flex-col items-start text-left">
                      <span className="text-xs text-white/80 font-medium leading-none mb-1">GET IT ON</span>
                      <span className="text-lg font-bold leading-none">Google Play</span>
                    </div>
                  </a>
                )}
              </div>
            )}

            {noStores && (
              <div className="mt-4 flex items-start gap-3 bg-white border border-stone-200 rounded-2xl p-4 max-w-lg">
                <Clock size={20} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-stone-600 m-0">
                  The app is coming soon to Android and iOS. Until then, everything works right here on the website —{' '}
                  <Link href="/#cities" className="font-bold text-brand-600 hover:text-brand-700">start exploring</Link>.
                </p>
              </div>
            )}

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

          {/* Right Image Sequence */}
          <div className="relative lg:h-[700px] flex items-center justify-center w-full mt-12 lg:mt-0">
            {/* Background decorative elements */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-100 to-orange-50 rounded-[3rem] -rotate-3 scale-95 opacity-50"></div>
            <div className="absolute inset-0 bg-gradient-to-bl from-brand-200 to-transparent rounded-[3rem] rotate-3 scale-95 opacity-30"></div>
            
            <div className="relative z-10 w-full max-w-2xl mx-auto px-4 sm:px-0">
              <div className="relative w-full overflow-hidden flex drop-shadow-2xl rounded-3xl">
                {/* Hidden image to dictate correct aspect ratio dynamically */}
                <img src="/3-phones-1.png" className="w-full h-auto opacity-0 invisible" aria-hidden="true" />
                
                {/* 3 Grid overlay for sliced animation */}
                <div className="absolute inset-0 grid grid-cols-3">
                  {/* Phone 1 (Left) */}
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.2, type: "spring", bounce: 0.3 }}
                    className="relative overflow-hidden w-full h-full"
                  >
                    <img src="/3-phones-1.png" className="absolute top-0 left-0 w-[300%] max-w-[300%] h-full object-cover" alt="App Screen 1" />
                  </motion.div>

                  {/* Phone 2 (Middle) */}
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4, type: "spring", bounce: 0.3 }}
                    className="relative overflow-hidden w-full h-full"
                  >
                    <img src="/3-phones-1.png" className="absolute top-0 left-[-100%] w-[300%] max-w-[300%] h-full object-cover" alt="App Screen 2" />
                  </motion.div>

                  {/* Phone 3 (Right) */}
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.6, type: "spring", bounce: 0.3 }}
                    className="relative overflow-hidden w-full h-full"
                  >
                    <img src="/3-phones-1.png" className="absolute top-0 left-[-200%] w-[300%] max-w-[300%] h-full object-cover" alt="App Screen 3" />
                  </motion.div>
                </div>
              </div>
            </div>
            
          </div>
          
        </div>
      </div>
    </div>
  );
}
