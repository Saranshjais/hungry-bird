"use client";

import Link from 'next/link';
import { Send, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-stone-950 text-stone-300 pt-20 pb-10 relative overflow-hidden border-t border-stone-800">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">
          
          {/* Brand & Slogan (4 cols) */}
          <div className="lg:col-span-4 pr-4">
            <h3 className="text-[28px] font-extrabold text-white tracking-tight leading-none mb-3">
              Hungry<span className="text-brand-500">Bird</span>
            </h3>
            <p className="text-stone-400 text-sm leading-[1.7] mb-6 max-w-sm">
              Connecting street food lovers with India's best hidden culinary gems. Hand-picked, verified, and community-driven.
            </p>
            <p className="text-brand-500 font-bold text-sm tracking-wide">Bhaiya! Hungry Bird Pe Ho Kya?</p>
          </div>

          {/* Explore Links (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Explore</h4>
            <ul className="space-y-3.5 text-sm font-medium text-stone-400">
              <li><Link href="/city/jaipur" className="hover:text-brand-400 hover:translate-x-1 inline-block transition-all">Jaipur Guides</Link></li>
              <li><Link href="/city/delhi" className="hover:text-brand-400 hover:translate-x-1 inline-block transition-all">Delhi Guides</Link></li>
              <li><Link href="/city/mumbai" className="hover:text-brand-400 hover:translate-x-1 inline-block transition-all">Mumbai Guides</Link></li>
              <li><Link href="/submit-vendor" className="hover:text-brand-400 hover:translate-x-1 inline-block transition-all mt-2 text-brand-500">Add a Hidden Stall</Link></li>
            </ul>
          </div>

          {/* Legal Links (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Legal</h4>
            <ul className="space-y-3.5 text-sm font-medium text-stone-400">
              <li><Link href="#" className="hover:text-white inline-block transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-white inline-block transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-white inline-block transition-colors">Cookie Policy</Link></li>
              <li><a href="mailto:app.hungrybird@gmail.com" className="hover:text-white inline-block transition-colors mt-2">Contact Us</a></li>
            </ul>
          </div>

          {/* Newsletter (4 cols) */}
          <div className="lg:col-span-4">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Stay Updated</h4>
            <p className="text-sm text-stone-400 leading-[1.7] mb-5">
              Get the latest street food discoveries and hidden gems delivered directly to your inbox.
            </p>
            
            <form className="relative group" onSubmit={(e) => e.preventDefault()}>
              <input 
                type="email" 
                placeholder="Enter your email address" 
                required 
                className="w-full bg-stone-900/50 border border-stone-700/80 text-white text-sm rounded-full px-5 py-3.5 pr-14 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all placeholder:text-stone-500"
              />
              <button 
                type="submit" 
                className="absolute right-1.5 top-1.5 bottom-1.5 bg-brand-500 hover:bg-brand-600 text-stone-950 rounded-full w-10 flex items-center justify-center transition-colors"
                aria-label="Subscribe"
              >
                <Send size={14} className="-ml-0.5" />
              </button>
            </form>


          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-[13px] text-stone-500 font-medium">
            © {new Date().getFullYear()} HungryBird Infotech Private Limited. All rights reserved.
          </p>
          <p className="text-[13px] text-stone-500 font-medium flex items-center gap-1.5">
            Crafted with <Heart size={12} className="text-brand-500 fill-brand-500" /> in India
          </p>
        </div>

      </div>
    </footer>
  );
}
