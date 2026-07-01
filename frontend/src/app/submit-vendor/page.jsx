"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  MapPin, Send, CheckCircle2, UtensilsCrossed, ChevronLeft, Loader2,
  AlertCircle, Store, ChefHat, IndianRupee, User, Mail, Info, ArrowRight, ArrowLeft, Navigation
} from 'lucide-react';

// Dynamically import MapComponent so it doesn't break SSR
const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-stone-100 animate-pulse rounded-xl flex items-center justify-center text-stone-400">Loading Map...</div>
});

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

function CustomSelect({ options, value, onChange, placeholder, icon: Icon }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="relative">
      {Icon && <Icon size={16} className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 transition-colors pointer-events-none ${isOpen ? 'text-brand-500' : 'text-stone-400'}`} />}
      <div 
        className={`input-field cursor-pointer flex items-center justify-between transition-all duration-300 ${Icon ? 'pl-11' : 'pl-4'} pr-4 ${isOpen ? 'border-brand-500 ring-4 ring-brand-500/10' : 'border-stone-200'} ${!value ? 'text-stone-400' : 'text-stone-900'}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
        <div className={`transition-transform duration-300 text-[10px] text-stone-400 ${isOpen ? 'rotate-180' : ''}`}>▼</div>
      </div>
      
      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-stone-100 rounded-xl shadow-2xl overflow-hidden"
            >
              {options.map(opt => (
                <div 
                  key={opt.value}
                  className="px-4 py-3.5 hover:bg-brand-50/80 hover:text-brand-700 cursor-pointer transition-colors text-sm font-semibold text-stone-600 border-b border-stone-50 last:border-0"
                  onClick={() => {
                    onChange({ target: { name: 'city_id', value: opt.value } });
                    setIsOpen(false);
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SubmitVendorPage() {
  const [step, setStep] = useState(1);
  const [cities, setCities] = useState([]);
  const [activeCity, setActiveCity] = useState(null); // Full city object for map zoom
  const [form, setForm] = useState({
    city_id: '', stall_name: '', cuisine_type: '', description: '',
    google_maps_url: '', approx_address: '', estimated_price: '₹100 for two',
    submitted_by_name: '', submitted_by_email: '', lat: null, lng: null
  });
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
    axios.get(`${API_URL}/api/cities`).then(r => setCities(r.data.cities || [])).catch(console.error);
  }, []);

  const setField = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (e.target.name === 'city_id') {
      const city = cities.find(c => c.id.toString() === e.target.value);
      setActiveCity(city || null);
    }
  };

  const setLocation = (lat, lng) => setForm(f => ({ ...f, lat, lng }));

  const [detectingLoc, setDetectingLoc] = useState(false);
  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords.latitude, position.coords.longitude);
        setDetectingLoc(false);
      },
      (error) => {
        console.error(error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setDetectingLoc(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setStatus('loading');
    setErrorMsg('');
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      // If we got lat/lng directly from the map, we generate a fake gmaps url so backend doesn't crash if it expects it
      // but backend now accepts lat/lng directly!
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
              onClick={() => { setStatus('idle'); setStep(1); setForm(f => ({ ...f, stall_name: '', description: '', google_maps_url: '', cuisine_type: '', lat: null, lng: null })); }}
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
    <div className="min-h-screen bg-stone-50 pt-24 pb-24 relative overflow-hidden">
      {/* Decorative premium background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-400/10 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-400/5 blur-[80px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-rose-400/5 blur-[80px]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgwLDAsMCwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-60" />
      </div>
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 text-stone-400 hover:text-stone-700 text-sm font-semibold mb-8 transition-colors group">
          <ChevronLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" /> Back to Home
        </Link>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between mb-10 relative px-2">
          <div className="absolute left-4 right-4 top-1/2 h-1.5 bg-stone-200/60 -z-10 rounded-full -translate-y-1/2" />
          <div className="absolute left-4 top-1/2 h-1.5 bg-gradient-to-r from-brand-400 to-brand-600 -z-10 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(249,115,22,0.4)] -translate-y-1/2" style={{ width: `calc(${((step - 1) / 2) * 100}% - 2rem)` }} />
          
          {[1, 2, 3].map(num => (
            <div key={num} className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-[15px] transition-all duration-500 shadow-sm ${step >= num ? 'bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-brand-500/40 ring-4 ring-brand-500/20 scale-110' : 'bg-white text-stone-400 border-2 border-stone-100'}`}>
              {step > num ? <CheckCircle2 size={20} strokeWidth={3} /> : num}
            </div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 80 }}
          className="panel overflow-hidden bg-white shadow-xl shadow-stone-200/50"
        >
          {/* Header */}
          <div className="relative p-8 md:p-10 overflow-hidden border-b border-stone-100 bg-gradient-to-br from-brand-50/40 via-stone-50/20 to-transparent">
            <div className="absolute -right-16 -top-16 w-56 h-56 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="flex items-start gap-5 relative">
              <div className="p-3 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-2xl shadow-md flex-shrink-0">
                <UtensilsCrossed size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2 tracking-tight">
                  {step === 1 && "Pin the Location"}
                  {step === 2 && "Stall Details"}
                  {step === 3 && "Final Step"}
                </h1>
                <p className="text-stone-500 text-sm font-medium leading-relaxed">
                  {step === 1 && "Select the city and drop a pin exactly where the stall is located."}
                  {step === 2 && "Tell us what makes this street food vendor amazing."}
                  {step === 3 && "Leave your name so we can give you a shoutout!"}
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
              
              {/* STEP 1: LOCATION */}
              {step === 1 && (
                <motion.div variants={fadeUp} className="space-y-6">
                  <Field label="City" required>
                    <CustomSelect 
                      options={cities.map(c => ({ label: c.name, value: c.id.toString() }))}
                      value={form.city_id}
                      onChange={setField}
                      placeholder="Select a city…"
                      icon={MapPin}
                    />
                  </Field>

                  {form.city_id && (
                    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-inner bg-stone-50">
                      <div className="p-3 bg-white border-b border-stone-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-bold text-stone-500 flex items-center gap-1 uppercase tracking-wider">
                            <Navigation size={12} className="text-brand-500" /> Drag map to set pin
                          </span>
                          <button 
                            type="button"
                            onClick={detectLocation}
                            disabled={detectingLoc}
                            className="text-[11px] font-bold bg-brand-50 text-brand-600 hover:bg-brand-100 px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors disabled:opacity-50 border border-brand-200/50"
                          >
                            {detectingLoc ? <Loader2 size={12} className="animate-spin" /> : <MapPin size={12} />}
                            {detectingLoc ? 'Detecting...' : 'Locate Me'}
                          </button>
                        </div>
                        {form.lat && <span className="text-xs font-mono text-stone-400 bg-stone-100 px-2 py-1 rounded shadow-sm">Lat: {form.lat.toFixed(4)}, Lng: {form.lng.toFixed(4)}</span>}
                      </div>
                      <div className="h-[350px] w-full">
                        <MapComponent 
                          cityLat={activeCity?.lat} 
                          cityLng={activeCity?.lng} 
                          lat={form.lat} 
                          lng={form.lng} 
                          onLocationChange={setLocation} 
                        />
                      </div>
                    </div>
                  )}

                  <Field label="Approximate Address (Optional)">
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input type="text" name="approx_address" placeholder="Near old post office, MG Road" value={form.approx_address} onChange={setField} className="input-field pl-11" />
                    </div>
                  </Field>
                </motion.div>
              )}

              {/* STEP 2: STALL DETAILS */}
              {step === 2 && (
                <motion.div variants={fadeUp} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label="Stall Name" required>
                      <div className="relative">
                        <Store size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input type="text" name="stall_name" required placeholder="e.g. Raju Chaat Bhandar" value={form.stall_name} onChange={setField} className="input-field pl-11" />
                      </div>
                    </Field>
                    
                    <Field label="Famous For / Cuisine" required>
                      <div className="relative">
                        <ChefHat size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input type="text" name="cuisine_type" required placeholder="e.g. Aloo Tikki, Panipuri" value={form.cuisine_type} onChange={setField} className="input-field pl-11" />
                      </div>
                    </Field>
                  </div>

                  <Field label="Price for Two">
                    <div className="relative">
                      <IndianRupee size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                      <input type="text" name="estimated_price" placeholder="e.g. ₹150 for two" value={form.estimated_price} onChange={setField} className="input-field pl-11" />
                    </div>
                  </Field>

                  <Field label="Why is this a hidden gem?" required>
                    <textarea name="description" required rows={4} placeholder="What makes it special? What should first-timers order?" value={form.description} onChange={setField} className="input-field resize-none" />
                  </Field>
                </motion.div>
              )}

              {/* STEP 3: CONTACT */}
              {step === 3 && (
                <motion.div variants={fadeUp} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <Field label="Your Name">
                      <div className="relative">
                        <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input type="text" name="submitted_by_name" placeholder="For a shoutout" value={form.submitted_by_name} onChange={setField} className="input-field pl-11" />
                      </div>
                    </Field>
                    <Field label="Your Email">
                      <div className="relative">
                        <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                        <input type="email" name="submitted_by_email" placeholder="For updates" value={form.submitted_by_email} onChange={setField} className="input-field pl-11" />
                      </div>
                    </Field>
                  </div>
                  
                  <div className="bg-brand-50 p-4 rounded-xl border border-brand-100 flex gap-3 text-brand-800 text-sm mt-4">
                    <Info size={18} className="flex-shrink-0 text-brand-500 mt-0.5" />
                    <p>By submitting this form, you help us bring authentic local food to everyone. Your suggestion will be verified by our team before appearing on the map.</p>
                  </div>
                </motion.div>
              )}

              <div className="border-t border-stone-100 pt-6 mt-8 flex items-center justify-between">
                {step > 1 ? (
                  <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost" style={{ minHeight: 48 }}>
                    <ArrowLeft size={16} /> Back
                  </button>
                ) : <div />}

                {step < 3 ? (
                  <button 
                    type="button" 
                    disabled={step === 1 && !form.city_id} 
                    onClick={() => setStep(step + 1)} 
                    className="btn-primary" 
                    style={{ minHeight: 48 }}
                  >
                    Next Step <ArrowRight size={16} />
                  </button>
                ) : (
                  <button type="submit" disabled={status === 'loading'} className="btn-orange shadow-lg" style={{ minHeight: 48 }}>
                    {status === 'loading'
                      ? <><Loader2 size={18} className="animate-spin" /> Submitting…</>
                      : <><Send size={17} /> Submit Hidden Stall</>
                    }
                  </button>
                )}
              </div>
            </motion.form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
