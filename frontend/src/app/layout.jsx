import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import Link from 'next/link';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
  display: 'swap',
});

export const metadata = {
  title: 'HungryBird — Discover India\'s Best Street Food',
  description: 'Find hidden gems, legendary street stalls, and local favourites hand-picked by India\'s food community.',
  keywords: ['street food', 'indian food', 'food delivery', 'hidden gems', 'chaat', 'food community'],
  authors: [{ name: 'HungryBird Team' }],
  openGraph: {
    title: 'HungryBird — Discover India\'s Best Street Food',
    description: 'Find hidden gems, legendary street stalls, and local favourites hand-picked by India\'s food community.',
    url: 'https://hungrybird.com',
    siteName: 'HungryBird',
    images: [
      {
        url: '/app-mockup.png', 
        width: 1200,
        height: 630,
        alt: 'HungryBird - Street Food Compass',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HungryBird — Discover India\'s Best Street Food',
    description: 'Find hidden gems, legendary street stalls, and local favourites hand-picked by India\'s food community.',
    images: ['/app-mockup.png'],
  },
};

import { AuthProvider } from '../context/AuthContext';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
