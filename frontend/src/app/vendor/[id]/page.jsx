import VendorDetailClient from './VendorDetailClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

export async function generateMetadata({ params }) {
  const { id } = await params;
  try {
    const res = await fetch(`${API_URL}/api/vendors/${id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error('not found');
    const data = await res.json();
    const v = data.vendor;

    const title = `${v.name} — ${v.cuisine_type || 'Street Food'} in ${v.city?.name || 'India'} | Hungry Bird`;
    const description = v.description
      ? v.description.slice(0, 155)
      : `Discover ${v.name}, a ${v.is_hidden_gem ? 'hidden gem' : 'local favourite'} for ${v.cuisine_type || 'street food'} in ${v.area || v.city?.name || 'your city'}. Rated ${v.rating || 'N/A'} by the Hungry Bird community.`;
    const image = (!v.image_url || v.image_url.includes('maps.googleapis'))
      ? '/vendor-placeholder.png'
      : v.image_url;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
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
  } catch (e) {
    return {
      title: 'Vendor | Hungry Bird',
      description: 'Discover hidden street food gems near you on Hungry Bird.',
    };
  }
}

export default function VendorDetailPage() {
  return <VendorDetailClient />;
}
