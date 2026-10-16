"use client";

// Admin-managed app settings from GET /api/app/config, fetched once per page load and shared.
// A short-lived sessionStorage copy lets the announcement strip / maintenance page render without a flash
// on the next navigation; the live value always replaces it.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { api } from '../lib/api';

const CACHE_KEY = 'hb_app_config';
const CACHE_TTL_MS = 5 * 60 * 1000;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const list = (v) => (Array.isArray(v) ? v : []);

export function normalizeConfig(raw) {
  // Existing keys live under `settings`; new contract keys (§3) may be top-level or under settings.
  const s = { ...((raw && raw.settings) || {}), ...(raw || {}) };
  const p = (raw && raw.premium) || (raw && raw.settings && raw.settings.premium) || {};
  const plans = list(p.plans)
    .filter((pl) => pl && pl.id != null)
    .map((pl) => ({
      id: pl.id,
      name: str(pl.name) || 'Premium pass',
      description: str(pl.description),
      price_paise: Number(pl.price_paise) || 0,
      price_display: str(pl.price_display) || (pl.price_paise ? `₹${Math.round(Number(pl.price_paise) / 100)}` : ''),
      duration_days: Number(pl.duration_days) || 0,
    }));
  return {
    loaded: true,
    failed: false,
    maintenance: s.maintenance_mode === true,
    maintenanceMessage: str(s.maintenance_message),
    announcement: str(s.announcement),
    supportEmail: str(s.support_email),
    supportPhone: str(s.support_phone),
    websiteUrl: str(s.website_url),
    playStoreUrl: str(s.play_store_url),
    appStoreUrl: str(s.app_store_url),
    defaultCity: str(s.default_city).toLowerCase(),
    allowGuestReviews: s.allow_guest_reviews !== false,
    socials: {
      instagram: str(s.instagram_url),
      facebook: str(s.facebook_url),
      x: str(s.x_url),
      youtube: str(s.youtube_url),
    },
    premium: {
      enabled: p.enabled === true || (p.enabled === undefined && s.premium_enabled === true),
      paymentsAvailable: p.payments_available === true,
      paymentMethods: list(p.payment_methods),
      plans,
      benefits: list(p.benefits).map(str).filter(Boolean),
    },
    banners: list(raw && raw.banners),
    categories: list(raw && raw.categories),
  };
}

export const EMPTY_CONFIG = { ...normalizeConfig({}), loaded: false };

const ConfigContext = createContext({ ...EMPTY_CONFIG, reload: () => {} });

function readCache() {
  try {
    const hit = JSON.parse(sessionStorage.getItem(CACHE_KEY) || 'null');
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.raw;
  } catch {
    /* ignore */
  }
  return null;
}

function writeCache(raw) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), raw }));
  } catch {
    /* ignore */
  }
}

let inflight = null;
function fetchConfig() {
  if (!inflight) {
    inflight = api('/api/app/config', { auth: false, timeout: 15000 }).finally(() => {
      setTimeout(() => {
        inflight = null;
      }, 0);
    });
  }
  return inflight;
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(EMPTY_CONFIG);
  // The admin panel shares the root layout but has its own settings screens; it never needs this.
  const isAdmin = (usePathname() || '').startsWith('/admin');

  const load = useCallback(async () => {
    try {
      const raw = await fetchConfig();
      writeCache(raw);
      setConfig(normalizeConfig(raw));
    } catch {
      // Keep whatever we have; flag that the live config could not be loaded.
      setConfig((c) => (c.loaded ? c : { ...EMPTY_CONFIG, loaded: true, failed: true }));
    }
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    const cached = readCache();
    if (cached) setConfig(normalizeConfig(cached));
    load();
  }, [load, isAdmin]);

  return <ConfigContext.Provider value={{ ...config, reload: load }}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
