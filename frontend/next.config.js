/** @type {import('next').NextConfig} */

// Basic security headers. There is deliberately no script-src CSP: Leaflet tiles, the Razorpay
// checkout script (https://checkout.razorpay.com) and its iframes, OpenStreetMap search and the API
// all load from other origins, and Next.js injects inline scripts.
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Only our own pages may frame the site (stops click-jacking). Razorpay opens its own iframe
  // inside our page, which these headers don't affect.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  // Location is used by "Near me"; camera / microphone are never needed.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
];

const adminHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    unoptimized: true
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Later entries win for the same header key.
      { source: '/admin', headers: adminHeaders },
      { source: '/admin/:path*', headers: adminHeaders },
    ];
  },
};

export default nextConfig;
