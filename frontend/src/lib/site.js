// Fixed site facts. Anything the admin panel can change lives in /api/app/config (see ConfigContext).

// Shown as "Last updated" on the legal pages. Change it whenever the policy text changes.
export const LEGAL_LAST_UPDATED = '16 October 2026';

// Name in the footer copyright line. Set NEXT_PUBLIC_LEGAL_NAME to the registered company name
// (e.g. "HungryBird Infotech Private Limited") once it is confirmed.
export const LEGAL_NAME = process.env.NEXT_PUBLIC_LEGAL_NAME || 'HungryBird';

export const BRAND_COLOR = '#f97316';

// City artwork bundled in /public. Other cities use city.image_url from the API or a neutral placeholder.
const BUNDLED_CITY_ART = ['delhi', 'jaipur', 'mumbai'];
export const CITY_PLACEHOLDER = '/city-placeholder.svg';

export function cityImage(city) {
  if (!city) return CITY_PLACEHOLDER;
  if (city.image_url) return city.image_url;
  if (BUNDLED_CITY_ART.includes(city.slug)) return `/city-${city.slug}.png`;
  return CITY_PLACEHOLDER;
}
