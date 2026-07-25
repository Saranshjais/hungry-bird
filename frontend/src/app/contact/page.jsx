import { Mail, MapPin, Phone, Send, User, Heart, AtSign, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Contact Us | HungryBird',
  description: 'Get in touch with the HungryBird team.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6] pt-28 pb-20 px-4 relative overflow-hidden">
      
      <div className="max-w-[1100px] mx-auto relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16 relative">
          <p className="font-kalam text-brand-500 text-2xl mb-1 drop-shadow-sm">We'd love to hear from you!</p>
          <div className="flex justify-center items-center gap-6 mb-4 relative inline-flex">
             {/* Decorative marks */}
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[-25deg] hidden sm:block absolute -left-12 -top-2"></div>
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[15deg] hidden sm:block absolute -left-10 top-4"></div>
             
             <h1 className="text-4xl md:text-6xl font-black text-stone-900 tracking-tight drop-shadow-sm">CONTACT US</h1>
             
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[25deg] hidden sm:block absolute -right-12 -top-2"></div>
             <div className="w-8 h-1.5 bg-brand-500 rounded-full rotate-[-15deg] hidden sm:block absolute -right-10 top-4"></div>
          </div>
          <p className="text-stone-500 max-w-lg mx-auto font-medium text-lg mt-2">
            Have a question or feedback?<br/>We're here for you.
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-brand-400 to-amber-400 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Two Columns */}
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
          
          {/* Left Column - Form */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-xl shadow-stone-200/50 border border-stone-100 relative h-max">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-brand-500 rounded-full flex items-center justify-center shadow-lg shadow-brand-500/30 text-white shrink-0">
                <Send size={22} className="-ml-0.5 mt-0.5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-stone-900 mb-1">Send us a message</h2>
                <p className="text-stone-500 text-sm font-medium">We usually reply within <span className="text-brand-500 font-bold">24 hours</span>.</p>
              </div>
            </div>

            <form className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
                    <User size={14} className="text-stone-400" /> Your Name
                  </label>
                  <input type="text" className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 text-sm" placeholder="Enter your full name" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
                    <Mail size={14} className="text-stone-400" /> Email Address
                  </label>
                  <input type="email" className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 text-sm" placeholder="Enter your email" />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
                  <AtSign size={14} className="text-stone-400" /> Subject
                </label>
                <select className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all font-medium text-stone-800 bg-white text-sm">
                  <option value="">Select a subject</option>
                  <option value="support">Support</option>
                  <option value="feedback">Feedback</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-1.5">
                  <Send size={14} className="text-stone-400" /> Message
                </label>
                <textarea rows={4} className="w-full border border-stone-200 rounded-xl p-3 focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all resize-none font-medium text-stone-800 text-sm" placeholder="How can we help you?" />
              </div>

              <button type="button" className="w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 hover:-translate-y-1 mt-2">
                Send Message <Send size={16} />
              </button>
            </form>
          </div>

          {/* Right Column - Contact Info */}
          <div className="flex flex-col space-y-4 pt-2 lg:pt-0">
            <h2 className="font-kalam text-3xl font-bold text-stone-800 mb-1 drop-shadow-sm">Get in touch</h2>
            
            {/* Email */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-50 text-brand-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 mb-0.5">Email</h3>
                  <p className="text-stone-500 text-sm font-medium">hungrybird733@gmail.com</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                 <p className="text-xs text-stone-400 font-medium">We aim to reply</p>
                 <p className="text-sm font-bold text-brand-500">within 24 hours.</p>
              </div>
            </div>


            {/* Phone */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 mb-0.5">Phone</h3>
                  <p className="text-stone-500 text-sm font-medium">+91 98765 43210</p>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                 <p className="text-xs text-stone-400 font-medium">Mon-Fri,</p>
                 <p className="text-sm font-bold text-emerald-500">9am to 6pm IST</p>
              </div>
            </div>

            {/* Follow Us */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex items-center justify-between flex-wrap gap-4 group hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-500 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <AtSign size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 mb-0.5">Follow Us</h3>
                  <p className="text-stone-500 text-sm font-medium">Stay updated on new food spots<br/>and amazing finds!</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a href="#" className="w-10 h-10 bg-pink-50 text-pink-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </a>
                <a href="#" className="w-10 h-10 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
                </a>
              </div>
            </div>



          </div>
        </div>



      </div>
    </div>
  );
}
