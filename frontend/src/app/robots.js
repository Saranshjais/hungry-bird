export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/user/'],
    },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://hungrybird.com'}/sitemap.xml`,
  }
}
