"use client";

// Public-site frame: navbar, page, footer — or the maintenance page while the admin has switched
// maintenance mode on. /admin is never affected (it has its own layout).

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Wrench } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useConfig } from '../context/ConfigContext';

// Static legal pages stay reachable during maintenance (app stores link to them).
const ALWAYS_OPEN = /^\/(privacy|terms|cookies)(\/|$)/;

function MaintenanceScreen({ message, supportEmail }) {
  return (
    <main className="min-h-screen min-h-dvh bg-[#FDF8EE] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <img src="/logo.png" alt="HungryBird" className="h-24 w-auto mx-auto mb-6 object-contain" />
        <div className="w-14 h-14 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center mx-auto mb-5">
          <Wrench size={26} />
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight mb-3">We'll be right back</h1>
        <p className="text-stone-600 font-medium mb-8 break-words">
          {message || 'HungryBird is down for scheduled maintenance. Please check back shortly.'}
        </p>
        {supportEmail && (
          <a href={`mailto:${supportEmail}`} className="inline-flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 break-all">
            <Mail size={16} className="flex-shrink-0" /> {supportEmail}
          </a>
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold text-stone-500">
          <Link href="/privacy" className="hover:text-stone-800 py-2">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-stone-800 py-2">Terms of Service</Link>
        </div>
      </div>
    </main>
  );
}

export default function SiteShell({ children }) {
  const pathname = usePathname() || '/';
  const config = useConfig();

  if (pathname.startsWith('/admin')) return <main>{children}</main>;

  if (config.maintenance && !ALWAYS_OPEN.test(pathname)) {
    return <MaintenanceScreen message={config.maintenanceMessage} supportEmail={config.supportEmail} />;
  }

  return (
    <>
      <Navbar />
      <main style={{ paddingTop: 'var(--hb-strip-h, 0px)' }}>{children}</main>
      <Footer />
    </>
  );
}
