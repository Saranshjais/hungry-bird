"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useScroll, useMotionValueEvent } from 'motion/react';
import { UtensilsCrossed, MapPin, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', v => setScrolled(v > 40));

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/80 backdrop-blur-md border-b border-stone-200/80 shadow-sm'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[64px]">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group outline-none">
            <div className="relative w-8 h-8 flex-shrink-0">
              <div className="absolute inset-0 bg-brand-500 rounded-xl blur-md opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-600 rounded-xl flex items-center justify-center shadow-md">
                <UtensilsCrossed size={15} className="text-white" strokeWidth={2.5} />
              </div>
            </div>
            <span className="text-[17px] font-extrabold text-stone-900 tracking-tight leading-none">
              Hungry<span className="gradient-text">Bird</span>
            </span>
          </Link>

          {/* Desktop */}
          <div className="hidden md:flex items-center">
            <Link
              href="/submit-vendor"
              className="btn-primary gap-2"
              style={{ minHeight: '40px', padding: '0 1.25rem', fontSize: '0.8125rem' }}
            >
              <MapPin size={13} />
              Add a Hidden Stall
            </Link>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(o => !o)}
            className="md:hidden p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-50 transition-all"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-stone-200 p-4 shadow-lg">
          <Link
            href="/submit-vendor"
            className="btn-primary w-full justify-center"
            onClick={() => setMobileOpen(false)}
          >
            <MapPin size={14} /> Add a Hidden Stall
          </Link>
        </div>
      )}
    </header>
  );
}
