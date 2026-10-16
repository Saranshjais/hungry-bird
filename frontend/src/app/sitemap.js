import { SITE_URL } from '../lib/api';
import { serverGet } from '../lib/server-api';

// Regenerated at most hourly, so a sitemap built while the API was asleep (Render cold start) heals quickly.
export const revalidate = 3600;

// The API can take ~15-30 s to wake up on the free Render plan.
const SLOW = 25000;

const STATIC_PAGES = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/search', changeFrequency: 'daily', priority: 0.6 },
  { path: '/submit-vendor', changeFrequency: 'weekly', priority: 0.7 },
  { path: '/reviews', changeFrequency: 'weekly', priority: 0.6 },
  { path: '/download', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'monthly', priority: 0.5 },
  { path: '/account/delete', changeFrequency: 'yearly', priority: 0.2 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/cookies', changeFrequency: 'yearly', priority: 0.2 },
];

const VENDOR_PAGE_SIZE = 500;
const MAX_VENDOR_PAGES_PER_CITY = 4;

async function cityVendors(slug) {
  const out = [];
  for (let page = 0; page < MAX_VENDOR_PAGES_PER_CITY; page++) {
    const data = await serverGet(`/api/vendors?city=${encodeURIComponent(slug)}&limit=${VENDOR_PAGE_SIZE}&offset=${page * VENDOR_PAGE_SIZE}&sort=newest`, { revalidate, timeout: SLOW });
    const list = (data && data.vendors) || [];
    out.push(...list);
    if (list.length < VENDOR_PAGE_SIZE) break;
  }
  return out;
}

export default async function sitemap() {
  const now = new Date();
  const entries = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));

  const [citiesData, config] = await Promise.all([
    serverGet('/api/cities', { revalidate, timeout: SLOW }),
    serverGet('/api/app/config', { revalidate, timeout: SLOW }),
  ]);

  const premium = (config && (config.premium || (config.settings && config.settings.premium))) || {};
  if (premium.enabled === true) {
    entries.push({ url: `${SITE_URL}/premium`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 });
  }

  const cities = ((citiesData && citiesData.cities) || []).filter((c) => c && c.slug && c.is_active !== false);
  for (const c of cities) {
    entries.push({ url: `${SITE_URL}/city/${c.slug}`, lastModified: now, changeFrequency: 'daily', priority: 0.9 });
  }

  const vendorLists = await Promise.all(cities.map((c) => cityVendors(c.slug)));
  const seen = new Set();
  for (const list of vendorLists) {
    for (const v of list) {
      // Locked (premium) vendors show a paywall, not content worth indexing.
      if (!v || v.locked || !v.id || seen.has(v.id)) continue;
      seen.add(v.id);
      entries.push({
        url: `${SITE_URL}/vendor/${v.id}`,
        lastModified: v.updated_at ? new Date(v.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      });
    }
  }
  return entries;
}
