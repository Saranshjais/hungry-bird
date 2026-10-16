"use client";

// Contact details from the admin config. Anything not set is not shown.

import { Mail, Phone, AtSign } from 'lucide-react';
import { useConfig } from '../../context/ConfigContext';
import SocialLinks, { useSocialLinks } from '../../components/SocialLinks';

export default function ContactDetails() {
  const { loaded, supportEmail, supportPhone } = useConfig();
  const socials = useSocialLinks();

  if (!loaded) {
    return (
      <div className="flex flex-col space-y-4 pt-2 lg:pt-0" aria-hidden="true">
        <div className="h-9 w-40 bg-stone-200/60 rounded-lg animate-pulse" />
        <div className="h-[88px] bg-white rounded-2xl border border-stone-100 animate-pulse" />
      </div>
    );
  }

  const nothing = !supportEmail && !supportPhone && socials.length === 0;

  return (
    <div className="flex flex-col space-y-4 pt-2 lg:pt-0">
      <h2 className="font-kalam text-3xl font-bold text-stone-800 mb-1 drop-shadow-sm">Get in touch</h2>

      {nothing && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100">
          <p className="text-stone-600 text-sm font-medium m-0">The quickest way to reach us is the form — every message goes straight to our team.</p>
        </div>
      )}

      {/* Email */}
      {supportEmail && (
        <a href={`mailto:${supportEmail}`} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-orange-50 text-brand-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Mail size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 mb-0.5">Email</h3>
              <p className="text-stone-500 text-sm font-medium break-all m-0">{supportEmail}</p>
            </div>
          </div>
        </a>
      )}

      {/* Phone */}
      {supportPhone && (
        <a href={`tel:${supportPhone.replace(/[^+\d]/g, '')}`} className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Phone size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 mb-0.5">Phone</h3>
              <p className="text-stone-500 text-sm font-medium m-0 break-words">{supportPhone}</p>
            </div>
          </div>
        </a>
      )}

      {/* Follow Us */}
      {socials.length > 0 && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between flex-wrap gap-4 group hover:shadow-md transition-shadow">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <AtSign size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 mb-0.5">Follow Us</h3>
              <p className="text-stone-500 text-sm font-medium m-0">New food spots and finds.</p>
            </div>
          </div>
          <SocialLinks />
        </div>
      )}
    </div>
  );
}
