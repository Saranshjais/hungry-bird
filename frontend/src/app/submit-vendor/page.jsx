"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  MapPin, Send, CheckCircle2, UtensilsCrossed, ChevronLeft, Loader2,
  AlertCircle, Store, ChefHat, IndianRupee, User, Mail, Info
} from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 20 } },
};
const staggerForm = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

function Field({ label, required, hint, children }) {
  return (
    <motion.div variants={fadeUp} className="flex flex-col gap-2">
      <label className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
        {label}
        {required && <span className="text-brand-500 font-bold">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-stone-400 font-medium flex items-center gap-1 mt-0.5"><Info size={11} className="text-brand-500" /> {hint}</p>}
    </motion.div>
  );
}

export default function SubmitVendorPage() {
  const [cities, setCities] = useState([]);
  const [form, setForm] = useState({
    city_id: '', stall_name: '', cuisine_type: '', description: '',
    google_maps_url: '', approx_address: '', estimated_price: '₹100 for two',
    submitted_by_name: '', submitted_by_email: '',
  });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    axios.get(`${API_URL}/api/cities`).then(r => setCities(r.data.cities || [])).catch(console.error);
  }, []);

  const set = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      await axios.post(`${API_URL}/api/submit-vendor`, form);
      setStatus('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  /* Success */
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 pt-24">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          className="panel p-12 max-w-md w-full text-center bg-white"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.25 }}
            className="w-24 h-24 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce"
          >
            <CheckCircle2 size={48} className="text-emerald-500" strokeWidth={1.5} />
          </motion.div>
          <h2 className="text-3xl font-extrabold text-stone-900 mb-3 tracking-tight">
            Thank you!
          </h2>
          <p className="text-stone-500 font-medium leading-relaxed mb-10 text-sm">
            Your hidden gem is submitted. Once verified, thousands of foodies will discover it on HungryBird.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setStatus('idle'); setForm(f => ({ ...f, stall_name: '', description: '', google_maps_url: '', cuisine_type: '' })); }}
              className="btn-orange w-full justify-center"
            >
              Submit Another Stall
            </button>
            <Link href="/" className="btn-ghost w-full justify-center">← Back to Home</Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-24">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        <Link href="/" className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm font-semibold mb-8 transition-colors group">
          <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 80 }}
          className="panel overflow-hidden bg-white shadow-xl shadow-stone-200/50"
        >
          {/* Header */}
          <div className="relative p-8 md:p-10 overflow-hidden border-b border-stone-100 bg-gradient-to-br from-brand-50/40 via-stone-50/20 to-transparent">
            {/* Soft decorative background aura */}
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-5 relative">
              <div className="p-3 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-2xl shadow-md flex-shrink-0">
                <UtensilsCrossed size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2 tracking-tight">
                  Add a Hidden Stall
                </h1>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  Know a secret street food spot? Share it with India's food community.
                </p>
              </div>
            </div>
          </div>

          {/* Error */}
          <AnimatePresence>
            {status === 'error' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mx-8 mt-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <div className="p-8 md:p-10">
            <motion.form
              onSubmit={handleSubmit}
              variants={staggerForm}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="City" required>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <select name="city_id" required value={form.city_id} onChange={set} className="input-field pl-11">
                      <option value="">Select a city…</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </Field>
                <Field label="Stall Name" required>
                  <div className="relative">
                    <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="text" name="stall_name" required placeholder="e.g. Raju Chaat Bhandar" value={form.stall_name} onChange={set} className="input-field pl-11" />
                  </div>
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Famous For / Cuisine" required>
                  <div className="relative">
                    <ChefHat size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="text" name="cuisine_type" required placeholder="e.g. Aloo Tikki, Panipuri" value={form.cuisine_type} onChange={set} className="input-field pl-11" />
                  </div>
                </Field>
                <Field label="Price for Two">
                  <div className="relative">
                    <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="text" name="estimated_price" placeholder="e.g. ₹150 for two" value={form.estimated_price} onChange={set} className="input-field pl-11" />
                  </div>
                </Field>
              </div>

              <Field label="Google Maps Link" required hint="We extract exact coordinates from this link.">
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input type="url" name="google_maps_url" required placeholder="https://maps.app.goo.gl/…" value={form.google_maps_url} onChange={set} className="input-field pl-11" />
                </div>
              </Field>

              <Field label="Approximate Address">
                <div className="relative">
                  <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input type="text" name="approx_address" placeholder="Near old post office, MG Road" value={form.approx_address} onChange={set} className="input-field pl-11" />
                </div>
              </Field>

              <Field label="Why is this a hidden gem?" required>
                <textarea name="description" required rows={4} placeholder="What makes it special? What should first-timers order?" value={form.description} onChange={set} className="input-field resize-none" />
              </Field>

              <div className="border-t border-stone-100 pt-6" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Field label="Your Name">
                  <div className="relative">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="text" name="submitted_by_name" placeholder="For a shoutout" value={form.submitted_by_name} onChange={set} className="input-field pl-11" />
                  </div>
                </Field>
                <Field label="Your Email">
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                    <input type="email" name="submitted_by_email" placeholder="For updates" value={form.submitted_by_email} onChange={set} className="input-field pl-11" />
                  </div>
                </Field>
              </div>

              <motion.div variants={fadeUp} className="pt-2">
                <button type="submit" disabled={status === 'loading'} className="btn-orange w-full justify-center text-base shadow-lg" style={{ minHeight: 56 }}>
                  {status === 'loading'
                    ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                    : <><Send size={17} /> Submit Hidden Stall</>
                  }
                </button>
              </motion.div>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
