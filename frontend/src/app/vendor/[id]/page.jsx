import VendorDetailClient from './VendorDetailClient';
import { serverGet } from '../../../lib/server-api';
import { vendorImage, vendorRating } from '../../../lib/vendors';

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await serverGet(`/api/vendors/${encodeURIComponent(id)}`, { revalidate: 300, timeout: 5000 });
  const v = data && (data.vendor || (data.id ? data : null));
  if (!v) {
    return {
      title: 'Vendor | HungryBird',
      description: 'Discover hidden street food gems near you on HungryBird.',
    };
  }

  const cityName = (v.city && v.city.name) || v.city_name || null;
  const where = v.area || cityName || 'India';
  const cuisine = v.cuisine_type || v.food_category || null;

  if (v.locked) {
    const title = `Premium hidden gem${cuisine ? ` · ${cuisine}` : ''} in ${where} | HungryBird`;
    return {
      title,
      description: `A HungryBird Premium pick${cuisine ? ` for ${cuisine}` : ''} in ${where}. Unlock it with HungryBird Premium.`,
      robots: { index: false, follow: true },
    };
  }

  const title = `${v.name}${cuisine ? ` — ${cuisine}` : ''}${cityName ? ` in ${cityName}` : ''} | HungryBird`;
  const rating = vendorRating(v);
  const description = v.description
    ? String(v.description).slice(0, 155)
    : `${v.name}${cuisine ? `, ${cuisine}` : ''} in ${where} on HungryBird${rating ? ` — rated ${rating.toFixed(1)} by the community` : ''}.`;
  const image = vendorImage(v) || '/vendor-placeholder.png';
  const canonical = `/vendor/${v.id}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default function VendorDetailPage() {
  return <VendorDetailClient />;
}
