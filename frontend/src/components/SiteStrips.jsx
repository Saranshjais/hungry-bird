"use client";

// Thin strips at the very top of the fixed header: the admin announcement and, for logged-in users
// who haven't verified their email, a reminder. Both can be dismissed. Their height is published as
// --hb-strip-h so <main> starts below them and nothing on the page hides under the header.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Megaphone, MailWarning, X } from 'lucide-react';
import { useConfig } from '../context/ConfigContext';
import { useAuth, isEmailUnverified } from '../context/AuthContext';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function hash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return String(h);
}

function readFlag(storage, key) {
  try {
    return window[storage].getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(storage, key) {
  try {
    window[storage].setItem(key, '1');
  } catch {
    /* ignore */
  }
}

export default function SiteStrips({ collapsed = false }) {
  const { announcement } = useConfig();
  const { user } = useAuth();
  const pathname = usePathname() || '/';
  const ref = useRef(null);

  const annKey = announcement ? `hb_ann_${hash(announcement)}` : null;
  const [annDismissed, setAnnDismissed] = useState(true);
  const [verifyDismissed, setVerifyDismissed] = useState(true);

  useEffect(() => {
    setAnnDismissed(annKey ? readFlag('localStorage', annKey) : true);
  }, [annKey]);
  useEffect(() => {
    setVerifyDismissed(readFlag('sessionStorage', 'hb_verify_banner_dismissed'));
  }, [user?.id]);

  const showAnn = !!announcement && !annDismissed;
  const onAuthFlow = /^\/(verify-email|register|reset-password|forgot-password)/.test(pathname);
  const showVerify = isEmailUnverified(user) && !verifyDismissed && !onAuthFlow;
  const visible = (showAnn || showVerify) && !collapsed;

  // Publish the strip height for <main>. While collapsed (scrolled / menu open) keep the last value so
  // the page doesn't jump; when nothing is shown at all, reset to 0.
  useIsoLayoutEffect(() => {
    const root = document.documentElement;
    if (!showAnn && !showVerify) {
      root.style.setProperty('--hb-strip-h', '0px');
      return;
    }
    if (collapsed || !ref.current) return;
    const el = ref.current;
    const apply = () => root.style.setProperty('--hb-strip-h', `${Math.round(el.getBoundingClientRect().height)}px`);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [showAnn, showVerify, collapsed]);

  useEffect(() => () => document.documentElement.style.setProperty('--hb-strip-h', '0px'), []);

  if (!visible) return null;

  const next = encodeURIComponent(pathname);

  return (
    <div ref={ref} className="w-full flex flex-col">
      {showAnn && (
        <div className="relative w-full bg-stone-900 text-white">
          <div className="max-w-5xl mx-auto flex items-start sm:items-center justify-center gap-2 pl-4 pr-12 py-2 text-xs sm:text-[13px] font-semibold leading-snug">
            <Megaphone size={14} className="flex-shrink-0 mt-0.5 sm:mt-0 text-brand-400" />
            <p className="text-white m-0 line-clamp-3 break-words" style={{ color: 'inherit', lineHeight: 1.4 }}>{announcement}</p>
          </div>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => {
              writeFlag('localStorage', annKey);
              setAnnDismissed(true);
            }}
            className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-white/70 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {showVerify && (
        <div className="relative w-full bg-amber-100 text-amber-900 border-b border-amber-200">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pl-4 pr-12 py-2 text-xs sm:text-[13px] font-semibold leading-snug">
            <span className="inline-flex items-center gap-1.5 min-w-0">
              <MailWarning size={14} className="flex-shrink-0" />
              <span className="break-words">Please verify your email address.</span>
            </span>
            <Link href={`/verify-email?next=${next}`} className="underline font-bold whitespace-nowrap py-1">
              Verify now
            </Link>
          </div>
          <button
            type="button"
            aria-label="Dismiss reminder"
            onClick={() => {
              writeFlag('sessionStorage', 'hb_verify_banner_dismissed');
              setVerifyDismissed(true);
            }}
            className="absolute right-0 top-0 h-full w-11 flex items-center justify-center text-amber-800/70 hover:text-amber-900"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
