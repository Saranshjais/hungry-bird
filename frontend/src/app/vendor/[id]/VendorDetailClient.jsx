"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import {
  MapPin, Star, Sparkles, ChevronLeft, Clock, Navigation,
  ShieldCheck, Flame, Loader2, MessageCircle
} from 'lucide-react';

const VendorMap = dynamic(() => import('./VendorMap'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';

function StarRow({ value = 0, size = 14 }) {
  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          size={size}
          className={Math.round(value) >= star ? "fill-brand-500 text-brand-500" : "fill-stone-100 text-stone-200"}
        />
      ))}
    </div>
  );
}

function ReviewForm({ vendorId, onSubmitted }) {
  const [selectedStar, setSelectedStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!selectedStar || isSubmitting) return;
    setIsSubmitting(true);
    setError("");
    try {
      const res = await axios.post(`${API_URL}/api/vendors/${vendorId}/rate`, {
        rating: selectedStar,
        review_text: reviewText,
        author_name: authorName,
      });
      if (res.data.success) {
        onSubmitted({
          avg_rating: res.data.avg_rating,
          total_ratings: res.data.total_ratings,
          newReview: {
            id: `local-${Date.now()}`,
            rating_value: selectedStar,
            review_text: reviewText,
            author_name: authorName || 'Anonymous',
            created_at: new Date().toISOString(),
          },
        });
        setSelectedStar(0);
        setReviewText("");
        setAuthorName("");
      }
    } catch (e) {
      setError("Couldn't submit your review. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="panel bg-white p-5 sm:p-6">
      <h3 className="font-extrabold text-stone-900 text-base mb-4 flex items-center gap-2">
        <MessageCircle size={18} className="text-brand-500" /> Rate this stall
      </h3>
      <div className="flex items-center gap-1.5 mb-4">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            onClick={() => setSelectedStar(star)}
            className="p-1 transition-transform hover:scale-110 active:scale-95"
          >
            <Star
              size={26}
              className={star <= selectedStar ? "text-amber-500" : "text-stone-300"}
              fill={star <= selectedStar ? "#f59e0b" : "transparent"}
            />
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selectedStar > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex flex-col gap-2.5"
          >
            <input
              type="text"
              placeholder="Your name (optional)"
              value={authorName}
              onChange={e => setAuthorName(e.target.value)}
              className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500 transition-colors"
            />
            <textarea
              placeholder="What did you order? How was it?"
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500 min-h-[80px] resize-none transition-colors"
            />
            {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
            <button
              onClick={submit}
              disabled={isSubmitting}
              className="btn-orange justify-center mt-1"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Submit Review'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    axios.get(`${API_URL}/api/vendors/${id}`)
      .then(r => {
        setVendor(r.data.vendor);
        setReviews(r.data.reviews || []);
        setNearby(r.data.nearby || []);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReviewSubmitted = ({ avg_rating, total_ratings, newReview }) => {
    setVendor(v => ({ ...v, rating: avg_rating, total_ratings }));
    setReviews(r => [newReview, ...r]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (notFound || !vendor) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 pt-16">
        <div className="text-6xl">🍢</div>
        <h2 className="text-2xl font-extrabold text-stone-900">Vendor not found</h2>
        <p className="text-stone-500 text-sm">This stall may have been removed or the link is broken.</p>
        <Link href="/" className="btn-ghost">← Back to Home</Link>
      </div>
    );
  }

  const heroImage = (!vendor.image_url || vendor.image_url.includes('maps.googleapis'))
    ? '/vendor-placeholder.png'
    : vendor.image_url;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${vendor.lat},${vendor.lng}`;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Hero ── */}
      <section className="relative h-[42vh] min-h-[300px] overflow-hidden">
        <img src={heroImage} alt={vendor.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-stone-950/10" />

        <div className="absolute inset-0 flex flex-col justify-end max-w-5xl mx-auto px-4 sm:px-6 pb-7 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {vendor.city && (
              <Link
                href={`/city/${vendor.city.slug}`}
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white font-semibold text-sm mb-4 transition-colors"
              >
                <ChevronLeft size={15} /> Back to {vendor.city.name}
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {vendor.is_hidden_gem && (
                <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles size={10} /> Hidden Gem
                </span>
              )}
              {vendor.verified_status === 'verified' && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <ShieldCheck size={10} /> Verified
                </span>
              )}
              {vendor.price_level && (
                <span className="bg-white/90 backdrop-blur-sm text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {vendor.price_level}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
              {vendor.name}
            </h1>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-8">
          {/* Rating + quick facts */}
          <div className="panel bg-white p-5 sm:p-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3">
              <StarRow value={vendor.rating || 0} size={18} />
              <span className="font-extrabold text-stone-900 text-lg">
                {vendor.rating ? vendor.rating.toFixed(1) : 'New'}
              </span>
              <span className="text-stone-400 text-sm font-medium">({vendor.total_ratings || 0} reviews)</span>
            </div>
            <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
              <Flame size={16} className="text-brand-500" />
              {vendor.cuisine_type || 'Street Food'}
            </div>
            {vendor.area && (
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                <MapPin size={16} className="text-brand-500" /> {vendor.area}
              </div>
            )}
            {vendor.opening_hours && (
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                <Clock size={16} className="text-brand-500" /> {vendor.opening_hours}
              </div>
            )}
          </div>

          {/* Story / description */}
          <div className="panel bg-white p-5 sm:p-6">
            <h3 className="font-extrabold text-stone-900 text-base mb-3">About this stall</h3>
            {vendor.specialty_dish && (
              <p className="text-sm font-bold text-brand-600 mb-2">
                Specialty: {vendor.specialty_dish}
              </p>
            )}
            <p className="text-stone-500 text-sm leading-relaxed">
              {vendor.description || `${vendor.name} is one of the local favourites for ${vendor.cuisine_type || 'street food'} in ${vendor.area || (vendor.city?.name || 'the area')}. No backstory has been added for this stall yet — know something about it? Leave a review below.`}
            </p>
          </div>

          {/* Reviews */}
          <div className="space-y-4">
            <h3 className="font-extrabold text-stone-900 text-lg">
              Reviews {reviews.length > 0 && <span className="text-stone-400 font-medium text-base">({reviews.length})</span>}
            </h3>

            {reviews.length === 0 && (
              <div className="panel bg-white p-8 text-center border-dashed">
                <p className="text-stone-400 text-sm">No reviews yet — be the first to rate this stall.</p>
              </div>
            )}

            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="panel bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-stone-900 text-sm">{r.author_name}</span>
                    <StarRow value={r.rating_value} size={13} />
                  </div>
                  {r.review_text && <p className="text-stone-500 text-sm leading-relaxed">{r.review_text}</p>}
                </div>
              ))}
            </div>

            <ReviewForm vendorId={vendor.id} onSubmitted={handleReviewSubmitted} />
          </div>
        </div>

        {/* ── Side column ── */}
        <div className="space-y-6">
          <div className="panel bg-white p-4 overflow-hidden" style={{ height: 260 }}>
            <div className="rounded-2xl overflow-hidden bg-stone-100 h-full border border-stone-200">
              {vendor.lat && vendor.lng ? (
                <VendorMap lat={vendor.lat} lng={vendor.lng} name={vendor.name} />
              ) : (
                <div className="h-full flex items-center justify-center text-stone-400 text-sm">
                  Map not available
                </div>
              )}
            </div>
          </div>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-orange w-full justify-center gap-2"
          >
            <Navigation size={16} /> Get Directions
          </a>

          {vendor.address && (
            <p className="text-xs text-stone-400 text-center px-2 leading-relaxed">{vendor.address}</p>
          )}

          {/* Nearby vendors */}
          {nearby.length > 0 && (
            <div>
              <h4 className="font-extrabold text-stone-900 text-sm mb-3 uppercase tracking-wider text-[11px] text-stone-400">
                Nearby you might like
              </h4>
              <div className="space-y-3">
                {nearby.map(n => (
                  <Link
                    key={n.id}
                    href={`/vendor/${n.id}`}
                    className="flex items-center gap-3 bg-white panel p-3 hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                      <img
                        src={(!n.image_url || n.image_url.includes('maps.googleapis')) ? '/vendor-placeholder.png' : n.image_url}
                        alt={n.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-sm truncate">{n.name}</p>
                      <p className="text-stone-400 text-xs truncate">{n.cuisine_type} · {n.area || 'Local Market'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
