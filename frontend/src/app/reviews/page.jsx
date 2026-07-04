"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { Star, MessageSquare, MapPin, Search } from 'lucide-react';
import Link from 'next/link';

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 85, damping: 18 } },
};

const staggerGrid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};

function ReviewCard({ review, type }) {
  const isVendor = type === 'vendor';
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -5 }}
      className="panel p-5 bg-white border border-stone-200/60 shadow-sm relative overflow-hidden group flex flex-col h-full"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.08),transparent)] pointer-events-none" />
      
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div>
          <h3 className="font-extrabold text-stone-900 text-sm">{review.author_name}</h3>
          <span className="text-[10px] text-stone-400 font-medium">
            {new Date(review.created_at).toLocaleDateString()}
          </span>
        </div>
        <span className="star-badge flex items-center gap-1 shadow-sm px-2 py-1">
          <Star size={11} className="fill-brand-500 text-brand-500" />
          {review.rating_value.toFixed(1)}
        </span>
      </div>

      <p className="text-stone-600 text-sm leading-relaxed mb-5 flex-1 relative z-10">
        <span className="text-xl text-stone-200 font-serif leading-none absolute -top-1 -left-2">"</span>
        {review.review_text}
      </p>

      {isVendor && (
        <div className="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-1.5 overflow-hidden">
            <MapPin size={13} className="text-brand-500 flex-shrink-0" />
            <span className="text-xs font-bold text-stone-800 truncate">{review.vendor_name}</span>
          </div>
          {review.city_name && (
            <Link 
              href={`/city/${review.city_slug}`} 
              className="text-[10px] font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded-full whitespace-nowrap hover:bg-brand-100 transition-colors"
            >
              {review.city_name}
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState('vendor'); // 'vendor' or 'site'
  const [vendorReviews, setVendorReviews] = useState([]);
  const [siteReviews, setSiteReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Site review form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formText, setFormText] = useState("");
  const [formRating, setFormRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMsg, setFormMsg] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      setLoading(true);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
        const [vRes, sRes] = await Promise.all([
          axios.get(`${API_URL}/api/vendor-reviews`),
          axios.get(`${API_URL}/api/site-reviews`)
        ]);
        setVendorReviews(vRes.data.reviews || []);
        setSiteReviews(sRes.data.site_reviews || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  const submitSiteReview = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
      await axios.post(`${API_URL}/api/site-reviews`, {
        author_name: formName,
        review_text: formText,
        rating_value: formRating
      });
      setFormMsg("Thank you! Your review has been submitted.");
      setFormName("");
      setFormText("");
      setFormRating(5);
      
      // Refresh site reviews
      const res = await axios.get(`${API_URL}/api/site-reviews`);
      setSiteReviews(res.data.site_reviews || []);
      
      setTimeout(() => {
        setFormMsg("");
        setShowForm(false);
      }, 3000);
    } catch (e) {
      console.error(e);
      setFormMsg("Failed to submit review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentReviews = activeTab === 'vendor' ? vendorReviews : siteReviews;

  return (
    <div className="min-h-screen bg-stone-50 pt-24 pb-20">
      
      {/* Header section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="eyebrow mb-4 inline-block bg-white border border-stone-200/60 shadow-sm text-stone-600">
            <MessageSquare size={12} className="inline mr-1 -mt-0.5 text-brand-500" /> Community Voices
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-stone-900 leading-tight mb-4 tracking-tight">
            What people are <span className="text-brand-500">saying</span>
          </h1>
          <p className="text-stone-500 text-sm max-w-lg mx-auto leading-relaxed">
            Discover real experiences from food lovers across India. 
            From hidden street stalls to our platform itself.
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Tabs & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
          <div className="flex bg-stone-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('vendor')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'vendor' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Vendor Reviews
            </button>
            <button
              onClick={() => setActiveTab('site')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'site' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Platform Feedback
            </button>
          </div>

          {activeTab === 'site' && !showForm && (
            <button 
              onClick={() => setShowForm(true)}
              className="btn-primary whitespace-nowrap text-sm h-[44px] w-full sm:w-auto justify-center"
            >
              Leave a Review
            </button>
          )}
        </div>

        {/* Leave Site Review Form */}
        <AnimatePresence>
          {showForm && activeTab === 'site' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-10 overflow-hidden"
            >
              <form onSubmit={submitSiteReview} className="panel p-6 sm:p-8 bg-white border-brand-100 ring-4 ring-brand-50/50 max-w-2xl mx-auto">
                <h3 className="text-lg font-extrabold text-stone-900 mb-5">Rate HungryBird</h3>
                
                {formMsg && (
                  <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm font-bold border border-green-200">
                    {formMsg}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-stone-700">Your Rating:</span>
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormRating(star)}
                          className="p-1 outline-none hover:scale-110 transition-transform"
                        >
                          <Star size={20} className={`transition-colors ${formRating >= star ? 'fill-brand-500 text-brand-500' : 'fill-stone-100 text-stone-200'}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <input
                    required
                    type="text"
                    placeholder="Your Name"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                  
                  <textarea
                    required
                    placeholder="Tell us what you love (or hate) about the platform..."
                    value={formText}
                    onChange={e => setFormText(e.target.value)}
                    className="w-full min-h-[100px] resize-none bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all"
                  />
                  
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold text-stone-500 hover:bg-stone-100 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting} className="btn-primary text-sm h-[44px]">
                      {isSubmitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {currentReviews.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="panel p-16 text-center border-dashed bg-white max-w-2xl mx-auto"
              >
                <div className="w-12 h-12 rounded-full bg-stone-50 border border-stone-200/85 flex items-center justify-center mx-auto mb-4">
                  <Search size={20} className="text-stone-400" />
                </div>
                <h3 className="font-extrabold text-stone-900 text-lg mb-2">No reviews yet</h3>
                <p className="text-stone-400 text-sm">
                  {activeTab === 'vendor' ? "Looks like no one has left a text review for a vendor yet." : "Be the first to review HungryBird!"}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial="hidden"
                animate="show"
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
                variants={staggerGrid}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {currentReviews.map(rev => (
                  <ReviewCard key={rev.id} review={rev} type={activeTab} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
