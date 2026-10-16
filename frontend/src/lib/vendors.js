// Display helpers for vendor objects. The API may return null for rating, price, address, hours,
// description and image (CONTRACT §4) — these helpers return null instead of inventing a value.

export const VENDOR_PLACEHOLDER = '/vendor-placeholder.png';

export const isLocked = (v) => !!(v && v.locked);

export function vendorImage(v) {
  const url = v && v.image_url;
  if (!url || typeof url !== 'string' || url.includes('maps.googleapis')) return null;
  return url;
}

export const vendorImageOrPlaceholder = (v) => vendorImage(v) || VENDOR_PLACEHOLDER;

// Real community rating, or null when nobody has rated the stall yet.
export function vendorRating(v) {
  if (!v) return null;
  const total = Number(v.total_ratings || 0);
  const raw = v.avg_rating ?? v.rating;
  const r = typeof raw === 'string' ? parseFloat(raw) : raw;
  if (typeof r !== 'number' || !Number.isFinite(r) || r <= 0 || total <= 0) return null;
  return r;
}

export const ratingCount = (v) => Number((v && v.total_ratings) || 0);

export function formatRating(v) {
  const r = vendorRating(v);
  return r === null ? null : r.toFixed(1);
}

const money = (n) => `₹${Number.isInteger(n) ? n : Number(n).toFixed(0)}`;

// "₹30 – ₹60", "From ₹30", "Up to ₹60", the ₹-level ("₹₹"), or null.
export function vendorPrice(v) {
  if (!v) return null;
  const min = Number.isFinite(v.price_min) && v.price_min > 0 ? v.price_min : null;
  const max = Number.isFinite(v.price_max) && v.price_max > 0 ? v.price_max : null;
  if (min && max) return min === max ? money(min) : `${money(min)} – ${money(max)}`;
  if (min) return `From ${money(min)}`;
  if (max) return `Up to ${money(max)}`;
  return v.price_level || null;
}

export const vendorCategory = (v) => (v && (v.food_category || v.cuisine_type)) || null;
export const vendorCuisine = (v) => (v && (v.cuisine_type || v.food_category)) || null;
export const vendorArea = (v) => (v && (v.area || v.locality || v.market)) || null;
export const vendorAddress = (v) => (v && (v.address_text || v.address)) || null;

export function hasCoords(v) {
  if (!v || v.locked) return false;
  const lat = typeof v.lat === 'string' ? parseFloat(v.lat) : v.lat;
  const lng = typeof v.lng === 'string' ? parseFloat(v.lng) : v.lng;
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

export function directionsUrl(v) {
  if (!hasCoords(v)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${Number(v.lat)},${Number(v.lng)}`;
}

export function websiteUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

export function instagramUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return websiteUrl(s);
  const handle = s.replace(/^@/, '').replace(/[^A-Za-z0-9._]/g, '');
  return handle ? `https://www.instagram.com/${handle}/` : null;
}

export function instagramHandle(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  const handle = m ? m[1] : s.replace(/^@/, '');
  return handle ? `@${handle}` : null;
}

// Haversine distance in km
export function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km) {
  if (typeof km !== 'number' || !Number.isFinite(km)) return null;
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
}

// Nearest city (with coordinates) to a point.
export function nearestCity(cities, lat, lng) {
  let best = null;
  let bestD = Infinity;
  for (const c of cities || []) {
    if (!Number.isFinite(c.lat) || !Number.isFinite(c.lng)) continue;
    const d = distanceKm(lat, lng, c.lat, c.lng);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best ? { city: best, km: bestD } : null;
}

export function formatDate(iso, opts = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', opts);
}
