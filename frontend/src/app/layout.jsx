import './globals.css';
import { Plus_Jakarta_Sans, Kalam } from 'next/font/google';
import SiteShell from '../components/SiteShell';
import { AuthProvider } from '../context/AuthContext';
import { ConfigProvider } from '../context/ConfigContext';
import { SITE_URL } from '../lib/api';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

const kalam = Kalam({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-kalam',
  display: 'swap',
});

const TITLE = 'HungryBird — Discover India\'s Best Street Food';
const DESCRIPTION = 'Find hidden gems, legendary street stalls, and local favourites shared by India\'s food community.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  keywords: ['street food', 'indian food', 'hidden gems', 'chaat', 'food community', 'food trails'],
  authors: [{ name: 'HungryBird Team' }],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'HungryBird',
    images: [
      {
        url: '/app-mockup.png',
        width: 1200,
        height: 630,
        alt: 'HungryBird - Street Food Compass',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/app-mockup.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${kalam.variable}`}>
      <body>
        <AuthProvider>
          <ConfigProvider>
            <SiteShell>{children}</SiteShell>
          </ConfigProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
