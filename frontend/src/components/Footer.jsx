"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Mail, Smartphone } from 'lucide-react';
import { useCities } from '../lib/hooks';
import { useConfig } from '../context/ConfigContext';
import { LEGAL_NAME } from '../lib/site';
import SocialLinks, { useSocialLinks } from './SocialLinks';

const MAX_FOOTER_CITIES = 6;

export default function Footer() {
  const pathname = usePathname();
  const { cities } = useCities();
  const config = useConfig();
  const socials = useSocialLinks();

  if (pathname && pathname.startsWith('/admin')) {
    return null;
  }

  const linkCls = 'hover:text-brand-400 hover:translate-x-1 inline-block transition-all py-0.5';

  return (
    <footer className="bg-stone-950 text-stone-300 pt-12 md:pt-16 pb-10 relative overflow-hidden border-t border-stone-800">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 relative z-10">

        <div className="grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 mb-16">

          {/* Brand & Slogan (4 cols) */}
          <div className="min-[420px]:col-span-2 lg:col-span-4 pr-4">
            <Link href="/" className="inline-block mb-2 hover:scale-105 transition-transform">
              <img src="/logo.png" alt="HungryBird Logo" className="h-36 md:h-48 w-auto object-contain drop-shadow-lg -mt-12 md:-mt-20 -mb-10 md:-mb-16" />
            </Link>
            <p className="text-stone-400 text-sm leading-[1.7] mb-6 max-w-sm">
              Connecting street food lovers with India's best hidden culinary gems. Shared by the community, one stall at a time.
            </p>
            <p className="text-brand-500 font-bold text-sm tracking-wide">Bhaiya! Hungry Bird Pe Ho Kya?</p>
          </div>

          {/* Explore Links (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Explore</h4>
            <ul className="space-y-3 text-sm font-medium text-stone-400">
              {cities.slice(0, MAX_FOOTER_CITIES).map((c) => (
                <li key={c.id}><Link href={`/city/${c.slug}`} className={linkCls}>{c.name}</Link></li>
              ))}
              <li><Link href="/reviews" className={linkCls}>Community Reviews</Link></li>
              {config.premium.enabled && <li><Link href="/premium" className={linkCls}>HungryBird Premium</Link></li>}
              <li><Link href="/submit-vendor" className={`${linkCls} mt-2 text-brand-500`}>Add a Hidden Stall</Link></li>
            </ul>
          </div>

          {/* Legal Links (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Company</h4>
            <ul className="space-y-3 text-sm font-medium text-stone-400">
              <li><Link href="/about" className="hover:text-white inline-block transition-colors text-brand-500 font-bold py-0.5">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-white inline-block transition-colors py-0.5">Contact Us</Link></li>
              <li><Link href="/terms" className="hover:text-white inline-block transition-colors py-0.5">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-white inline-block transition-colors py-0.5">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-white inline-block transition-colors py-0.5">Cookie Policy</Link></li>
              <li><Link href="/account/delete" className="hover:text-white inline-block transition-colors py-0.5">Delete your account</Link></li>
            </ul>
          </div>

          {/* App & social (3 cols) */}
          <div className="min-[420px]:col-span-2 lg:col-span-3">
            <h4 className="text-white font-bold mb-5 text-sm tracking-widest uppercase">Stay in touch</h4>
            <div className="space-y-4 text-sm text-stone-400">
              <Link href="/download" className="inline-flex items-center gap-2 font-bold text-stone-200 hover:text-brand-400 transition-colors py-0.5">
                <Smartphone size={16} className="text-brand-500" /> Get the HungryBird app
              </Link>
              {config.supportEmail && (
                <a href={`mailto:${config.supportEmail}`} className="flex items-center gap-2 font-medium hover:text-white transition-colors break-all py-0.5">
                  <Mail size={16} className="text-brand-500 flex-shrink-0" /> {config.supportEmail}
                </a>
              )}
              {socials.length > 0 && <SocialLinks variant="dark" />}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-stone-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-center">
          <p className="text-[13px] text-stone-500 font-medium">
            © {new Date().getFullYear()} {LEGAL_NAME}. All rights reserved.
          </p>
          <p className="text-[13px] text-stone-500 font-medium flex items-center gap-1.5">
            Crafted with <Heart size={12} className="text-brand-500 fill-brand-500" /> in India
          </p>
        </div>

      </div>
    </footer>
  );
}
