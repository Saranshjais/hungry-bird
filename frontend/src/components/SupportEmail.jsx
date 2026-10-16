"use client";

// The support address from the admin config; falls back to the contact page when it isn't set.

import Link from 'next/link';
import { useConfig } from '../context/ConfigContext';

export default function SupportEmail({ className = 'font-bold text-brand-600 break-all' }) {
  const { supportEmail } = useConfig();
  if (supportEmail) {
    return <a href={`mailto:${supportEmail}`} className={className}>{supportEmail}</a>;
  }
  return <Link href="/contact" className={className}>our contact page</Link>;
}
