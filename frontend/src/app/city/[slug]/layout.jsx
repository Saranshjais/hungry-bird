export async function generateStaticParams() {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    const res = await fetch(`${API_URL}/api/cities`);
    if (!res.ok) throw new Error('Failed to fetch cities');
    const data = await res.json();
    return data.cities.map((city) => ({
      slug: city.slug,
    }));
  } catch (error) {
    console.error("Failed to fetch static params", error);
    // Return some common defaults if API is unreachable during build
    return [{ slug: "jaipur" }, { slug: "delhi" }, { slug: "mumbai" }];
  }
}

export default function CityLayout({ children }) {
  return children;
}
