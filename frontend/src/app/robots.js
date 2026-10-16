import { SITE_URL } from '../lib/api';

export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/', '/user/', '/verify-email', '/reset-password'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
