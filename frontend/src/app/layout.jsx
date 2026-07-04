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
