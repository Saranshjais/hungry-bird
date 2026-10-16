import { serverGet } from '../../../lib/server-api';
import { cityImage } from '../../../lib/site';

async function activeCities(timeout = 8000) {
  const data = await serverGet('/api/cities', { revalidate: 3600, timeout });
  return ((data && data.cities) || []).filter((c) => c && c.slug && c.is_active !== false);
}

// Pre-render the active cities when the API is reachable at build time; any other slug is rendered
// on demand (and shows "City not found" if it doesn't exist).
export async function generateStaticParams() {
  // Build time only: allow for the API waking up from a cold start.
  const cities = await activeCities(25000);
  return cities.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const city = (await activeCities()).find((c) => c.slug === slug);
  if (!city) return { title: 'City | HungryBird' };
  const title = `Best street food in ${city.name} — hidden gems & local favourites | HungryBird`;
  const description = city.description || `Discover street food stalls, hidden gems and food trails in ${city.name}, shared by the HungryBird community.`;
  const image = cityImage(city);
  return {
    title,
    description,
    alternates: { canonical: `/city/${city.slug}` },
    openGraph: { title, description, url: `/city/${city.slug}`, images: [{ url: image }], type: 'website' },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default function CityLayout({ children }) {
  return children;
}
