"use client";

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ArrowRight, Share2, Check, Upload, X } from 'lucide-react';
import Link from 'next/link';

const DUMMY_REELS = [
  {
    id: 1,
    title: "The Ultimate Pav Bhaji Guide",
    author: "StreetFoodKing",
    image: "/banner4.jpg",
    views: "1.2M",
  },
  {
    id: 2,
    title: "Hidden Chole Bhature Spot",
    author: "DelhiDiaries",
    image: "/banner2.jpg",
    views: "850K",
  },
  {
    id: 3,
    title: "Making of Traditional Ghewar",
    author: "SweetTooth",
    image: "/banner6.jpg",
    views: "2.1M",
  },
  {
    id: 4,
    title: "Best Dal Baati in Town",
    author: "FoodieFinds",
    image: "/banner1.jpg",
    views: "500K",
  },
  {
    id: 5,
    title: "Golgappa Challenge!",
    author: "SpicyBites",
    image: "/banner5.jpg",
    views: "3.4M",
  }
];

export default function ReelsSection() {
  const [copiedId, setCopiedId] = useState(null);
  const [reels, setReels] = useState(DUMMY_REELS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/reels")
      .then(res => res.json())
      .then(data => {
        if (data.reels && data.reels.length > 0) {
          setReels([...data.reels, ...DUMMY_REELS]);
        }
      })
      .catch(() => console.warn("Failed to fetch reels from backend, using dummy data."));
  }, []);

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    if (!formData.get("video").name) {
      alert("Please select a video file.");
      return;
    }
    setUploading(true);
    try {
      const res = await fetch("http://127.0.0.1:5000/submit-reel", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        alert("Video submitted successfully! It will appear once verified by an admin.");
        setShowUploadModal(false);
      } else {
        alert(data.error || "Failed to submit video.");
      }
    } catch (err) {
      alert("An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

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
            <div className="hidden md:flex items-center gap-4">
              <button className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors group">
                <span className="text-sm font-semibold">View all videos</span>
                <div className="w-8 h-8 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:bg-brand-50 group-hover:border-brand-200 group-hover:text-brand-600 transition-all shadow-sm">
                  <ArrowRight size={14} />
                </div>
              </button>
              <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-full transition-colors shadow-sm">
                <Upload size={16} />
                <span className="text-sm font-semibold">Upload Video</span>
              </button>
            </div>
          </div>
        </div>

      {/* Horizontal Carousel */}
      <div className="relative z-10 w-full pl-4 sm:pl-6 lg:pl-8 mx-auto max-w-7xl">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-4 hide-scrollbar snap-x snap-mandatory pr-4 sm:pr-8">
          {reels.map((reel, idx) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="relative shrink-0 w-[260px] sm:w-[300px] h-[450px] sm:h-[520px] rounded-[32px] overflow-hidden group cursor-pointer snap-start bg-black border border-stone-200 shadow-md"
            >
              {/* Background Media */}
              {reel.videoUrl ? (
                <video 
                  src={reel.videoUrl} 
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img 
                  src={reel.image} 
                  alt={reel.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              )}
              
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

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowUploadModal(false)}
                className="absolute top-4 right-4 p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 className="text-2xl font-bold text-stone-900 mb-6">Upload Video Reel</h3>
              
              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Your Name / Handle</label>
                  <input required name="author_name" type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="e.g. Foodie123" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Video Title</label>
                  <input required name="title" type="text" className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="e.g. Best Vada Pav!" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1">Video File (MP4/WebM)</label>
                  <input required name="video" type="file" accept="video/mp4,video/webm" className="w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100 transition-colors" />
                </div>
                <button 
                  type="submit" 
                  disabled={uploading}
                  className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Submit for Verification"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
