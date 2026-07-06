"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, ArrowRight, Share2, Check } from 'lucide-react';
import Link from 'next/link';

const DUMMY_REELS = [
  {
    id: 1,
    title: "The Ultimate Pav Bhaji Guide",
    author: "StreetFoodKing",
    image: "/banner7.png",
    views: "1.2M",
  },
  {
    id: 2,
    title: "Hidden Chole Bhature Spot",
    author: "DelhiDiaries",
    image: "/banner4.png",
    views: "850K",
  },
  {
    id: 3,
    title: "Making of Traditional Ghewar",
    author: "SweetTooth",
    image: "/banner6.png",
    views: "2.1M",
  },
  {
    id: 4,
    title: "Best Kebabs in Town",
    author: "MeatLovers",
    image: "/banner8.png",
    views: "500K",
  },
  {
    id: 5,
    title: "Golgappa Challenge!",
    author: "SpicyBites",
    image: "/banner5.png",
    views: "3.4M",
  }
];

export default function ReelsSection() {
  const [copiedId, setCopiedId] = useState(null);

  const handleShare = (e, id) => {
    e.stopPropagation(); // prevent clicking the card
    if (navigator.share) {
      navigator.share({
        title: 'Check out this street food video!',
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <section className="py-24 bg-stone-50 overflow-hidden relative selection:bg-brand-500/30">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-400/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase mb-4 shadow-sm">
              <Play size={12} className="text-brand-500 fill-brand-500" /> Shorts & Reels
            </span>
            <h2 className="text-[36px] sm:text-[46px] font-extrabold text-stone-900 tracking-tight leading-tight">
              Watch & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">Drool</span>
            </h2>
            <p className="text-stone-500 text-[15px] sm:text-[16px] max-w-md mt-3">
              Get up close with India's most mouth-watering street food through our curated shorts and reels.
            </p>
          </div>
          <button className="hidden md:flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors group">
            <span className="text-sm font-semibold">View all videos</span>
            <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-200 group-hover:text-brand-600 transition-all shadow-sm">
              <ArrowRight size={14} />
            </div>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative z-10 w-full pl-4 sm:pl-6 lg:pl-8 mx-auto max-w-7xl">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-4 hide-scrollbar snap-x snap-mandatory pr-4 sm:pr-8">
          {DUMMY_REELS.map((reel, idx) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="relative shrink-0 w-[260px] sm:w-[300px] h-[450px] sm:h-[520px] rounded-[32px] overflow-hidden group cursor-pointer snap-start bg-white border border-stone-200 shadow-md"
            >
              {/* Background Image */}
              <img 
                src={reel.image} 
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 transition-opacity duration-300 group-hover:opacity-90" />
              <div className="absolute inset-0 bg-brand-900/20 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Play Button Overlay (Centered) */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-90">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center shadow-2xl">
                  <Play size={24} className="text-white fill-white ml-1" />
                </div>
              </div>

              {/* Content Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col justify-end transform transition-transform duration-300 group-hover:translate-y-[-8px]">
                <div className="flex items-center justify-between mb-3 w-full">
                  <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/90 text-xs font-medium">
                    {reel.views} views
                  </div>
                  <button 
                    onClick={(e) => handleShare(e, reel.id)}
                    className="p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-white/30 transition-colors z-20"
                    title="Share Video"
                  >
                    {copiedId === reel.id ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                  </button>
                </div>
                <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2 drop-shadow-md">
                  {reel.title}
                </h3>
                <p className="text-white/70 text-sm font-medium flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-500 to-amber-400 p-[1px]">
                    <span className="block w-full h-full rounded-full bg-stone-800" />
                  </span>
                  @{reel.author}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Mobile View All Button */}
        <div className="md:hidden mt-4 flex justify-center pb-8 pr-4">
          <button className="flex items-center gap-2 text-stone-600 hover:text-stone-900 px-6 py-3 rounded-full border border-stone-200 bg-white shadow-sm">
            <span className="text-sm font-semibold">View all videos</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
      
      {/* CSS to hide scrollbar but allow scroll */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </section>
  );
}
