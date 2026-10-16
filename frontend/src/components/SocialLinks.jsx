"use client";

// Social profile links from the admin config. A network whose URL is empty is not shown at all.

import { useConfig } from '../context/ConfigContext';

const ICONS = {
  instagram: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
  ),
  facebook: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
  ),
  x: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
  ),
  youtube: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" /><path d="m10 15 5-3-5-3z" /></svg>
  ),
};

const NETWORKS = [
  { key: 'instagram', label: 'Instagram', tone: 'bg-pink-50 text-pink-500' },
  { key: 'facebook', label: 'Facebook', tone: 'bg-blue-50 text-blue-600' },
  { key: 'x', label: 'X (Twitter)', tone: 'bg-stone-100 text-stone-800' },
  { key: 'youtube', label: 'YouTube', tone: 'bg-red-50 text-red-600' },
];

export function useSocialLinks() {
  const { socials } = useConfig();
  return NETWORKS.filter((n) => /^https?:\/\//i.test(socials[n.key] || '')).map((n) => ({ ...n, url: socials[n.key] }));
}

export default function SocialLinks({ variant = 'light', className = '' }) {
  const links = useSocialLinks();
  if (!links.length) return null;
  return (
    <div className={`flex items-center flex-wrap gap-3 ${className}`}>
      {links.map((n) => (
        <a
          key={n.key}
          href={n.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`HungryBird on ${n.label}`}
          title={n.label}
          className={`w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-transform ${
            variant === 'dark' ? 'bg-stone-800 text-stone-300 hover:text-white' : n.tone
          }`}
        >
          {ICONS[n.key]}
        </a>
      ))}
    </div>
  );
}
