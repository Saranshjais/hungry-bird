"use client";

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Star, Sparkles, ChevronLeft, Clock, Navigation, ShieldCheck, Flame, Loader2, MessageCircle,
  Heart, Flag, Phone, Globe, AtSign, CalendarX, Landmark, IndianRupee, Lock, Crown, Check, RefreshCw, LogIn,
} from 'lucide-react';
import { api, errorMessage } from '../../../lib/api';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import {
  directionsUrl, formatDistance, formatRating, hasCoords, instagramHandle, instagramUrl, isLocked, ratingCount,
  vendorAddress, vendorArea, vendorCategory, vendorCuisine, vendorImageOrPlaceholder, vendorPrice, vendorRating, websiteUrl,
} from '../../../lib/vendors';
import { loginHref } from '../../../components/RequireAuth';
import LockedVendorCard, { lockedMeta, LockedRating } from '../../../components/vendors/LockedVendorCard';
import ReportDialog from '../../../components/ReportDialog';

const VendorMap = dynamic(() => import('./VendorMap'), { ssr: false });

function StarRow({ value = 0, size = 14 }) {
  return (
    <div className="flex items-center" aria-hidden="true">
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

function ReviewForm({ vendorId, myReview, onSubmitted }) {
  const { user } = useAuth();
  const { allowGuestReviews } = useConfig();
  const [selectedStar, setSelectedStar] = useState(myReview ? Math.round(myReview.rating_value) : 0);
  const [reviewText, setReviewText] = useState(myReview?.review_text || "");
  const [authorName, setAuthorName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const next = `/vendor/${vendorId}`;

  if (!user && !allowGuestReviews) {
    return (
      <div className="panel bg-white p-5 sm:p-6 text-center">
        <h3 className="font-extrabold text-stone-900 text-base mb-2 flex items-center justify-center gap-2">
          <MessageCircle size={18} className="text-brand-500" /> Rate this stall
        </h3>
        <p className="text-sm text-stone-500 mb-4">Log in to rate and review stalls.</p>
        <Link href={loginHref(next)} className="btn-primary"><LogIn size={15} /> Log in to review</Link>
      </div>
    );
  }

  const submit = async () => {
    if (!selectedStar || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const data = await api(`/api/vendors/${vendorId}/rate`, {
        method: 'POST',
        body: {
          rating: selectedStar,
          review_text: reviewText.trim(),
          ...(user ? {} : { author_name: authorName.trim() }),
        },
      });
      onSubmitted({
        avg_rating: data.avg_rating,
        total_ratings: data.total_ratings,
        review: data.review || {
          id: `local-${Date.now()}`,
          rating_value: selectedStar,
          review_text: reviewText.trim(),
          author_name: user ? user.name : authorName.trim() || 'Anonymous',
          is_mine: !!user,
          created_at: new Date().toISOString(),
        },
      });
      setSaved(true);
      if (!user) {
        setSelectedStar(0);
        setReviewText("");
        setAuthorName("");
      }
    } catch (e) {
      setError(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="panel bg-white p-5 sm:p-6">
      <h3 className="font-extrabold text-stone-900 text-base mb-1 flex items-center gap-2">
        <MessageCircle size={18} className="text-brand-500" /> {myReview ? 'Update your review' : 'Rate this stall'}
      </h3>
      {myReview && <p className="text-xs text-stone-500 mb-3">You've reviewed this stall — posting again updates your review.</p>}
      <div className="flex items-center gap-1.5 mb-4 mt-3" role="radiogroup" aria-label="Your rating">
        {[1, 2, 3, 4, 5].map(star => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={selectedStar === star}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
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
            {!user && (
              <input
                type="text"
                placeholder="Your name (optional)"
                maxLength={100}
                value={authorName}
                onChange={e => setAuthorName(e.target.value)}
                className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500 transition-colors"
              />
            )}
            <textarea
              placeholder="What did you order? How was it?"
              maxLength={1000}
              value={reviewText}
              onChange={e => setReviewText(e.target.value)}
              className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500 min-h-[80px] resize-none transition-colors"
            />
            {error && (
              <p className="text-xs text-red-500 font-semibold">
                {error.status === 401 ? (
                  <>Please <Link href={loginHref(next)} className="underline">log in</Link> to post a review.</>
                ) : (
                  errorMessage(error, { default: "Couldn't submit your review. Please try again." })
                )}
              </p>
            )}
            {saved && <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1"><Check size={13} /> Thanks — your review is posted.</p>}
            {!user && (
              <p className="text-[11px] text-stone-400">
                Posting as a guest. <Link href={loginHref(next)} className="font-bold text-stone-600 underline">Log in</Link> to post under your name.
              </p>
            )}
            <button
              onClick={submit}
              disabled={isSubmitting}
              className="btn-orange justify-center mt-1"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : myReview ? 'Update Review' : 'Submit Review'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FavoriteButton({ vendorId, initial }) {
  const { user } = useAuth();
  const [fav, setFav] = useState(!!initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => setFav(!!initial), [initial]);

  if (!user) {
    return (
      <Link href={loginHref(`/vendor/${vendorId}`)} className="btn-ghost w-full justify-center gap-2">
        <Heart size={16} /> Save stall
      </Link>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setErr('');
    try {
      const data = await api('/api/favorites/toggle', { method: 'POST', body: { vendor_id: vendorId } });
      setFav(data.status ? data.status === 'added' : !fav);
    } catch (e) {
      setErr(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={fav}
        className={`btn-ghost w-full justify-center gap-2 ${fav ? '!border-rose-200 !bg-rose-50 text-rose-600' : ''}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} className={fav ? 'fill-rose-500 text-rose-500' : ''} />}
        {fav ? 'Saved' : 'Save stall'}
      </button>
      {err && <p className="text-xs text-red-500 mt-1 text-center">{err}</p>}
    </div>
  );
}

function Fact({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2 text-stone-600 text-sm font-medium min-w-0">
      <Icon size={16} className="text-brand-500 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

function cityOf(v) {
  if (v.city && v.city.slug) return v.city;
  if (v.city_slug) return { slug: v.city_slug, name: v.city_name || 'the city' };
  return null;
}

function LockedVendorView({ vendor }) {
  const config = useConfig();
  const { user } = useAuth();
  const city = cityOf(vendor);
  const meta = lockedMeta(vendor);
  const benefits = config.premium.benefits.length
    ? config.premium.benefits
    : ['The stall name, exact address and directions', 'Opening hours and contact details', 'Reviews from the community'];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Light hero: the navbar uses dark text on /vendor pages. */}
      <section className="relative min-h-[max(42vh,300px)] flex flex-col justify-end overflow-hidden bg-[#FDF8EE]">
        <img src={vendorImageOrPlaceholder(vendor)} alt="" className="absolute inset-0 w-full h-full object-cover blur-2xl scale-125 opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#FDF8EE] via-[#FDF8EE]/70 to-[#FDF8EE]/40" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-7 w-full">
          {city && (
            <Link href={`/city/${city.slug}`} className="inline-flex items-center gap-1.5 text-stone-600 hover:text-stone-900 font-semibold text-sm mb-4 transition-colors">
              <ChevronLeft size={15} /> Back to {city.name}
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
              <Crown size={10} /> Premium
            </span>
            {vendor.price_level && (
              <span className="bg-white text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-full border border-stone-200">{vendor.price_level}</span>
            )}
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 leading-tight tracking-tight flex items-center gap-3">
            <Lock className="flex-shrink-0 w-7 h-7 sm:w-9 sm:h-9 text-brand-500" /> Premium hidden gem
          </h1>
          {meta && <p className="text-stone-600 font-semibold mt-3 mb-0">{meta}</p>}
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="panel bg-white p-6 sm:p-8 text-center">
          <div className="flex justify-center mb-4"><LockedRating vendor={vendor} /></div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 mb-2">This stall is a Premium pick</h2>
          <p className="text-stone-500 text-sm mb-6">Unlock HungryBird Premium to see everything about it.</p>
          <ul className="text-left max-w-sm mx-auto space-y-3 mb-8">
            {benefits.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-stone-700 font-medium">
                <Check size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" /> <span>{b}</span>
              </li>
            ))}
          </ul>
          {user && user.is_premium ? (
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              <RefreshCw size={15} /> Refresh to unlock
            </button>
          ) : (
            <Link href="/premium" className="btn-orange">
              <Lock size={15} /> Unlock with Premium
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VendorDetailPage() {
  const { id } = useParams();
  const premiumOn = useConfig().premium.enabled;
  const [vendor, setVendor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [nearby, setNearby] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [report, setReport] = useState(null); // { type, id, title }

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    api(`/api/vendors/${id}`)
      .then(data => {
        const v = data.vendor || (data.id ? data : null);
        setVendor(v);
        setReviews(data.reviews || []);
        setNearby(data.nearby || []);
        setIsFavorite(!!data.is_favorite);
        if (!v) setLoadError({ status: 404 });
      })
      .catch(err => setLoadError(err))
      .finally(() => setLoading(false));
  }, [id]);

  // The stored token is sent with the request, so Premium members get the unlocked stall.
  useEffect(() => { load(); }, [load]);

  const handleReviewSubmitted = ({ avg_rating, total_ratings, review }) => {
    setVendor(v => ({
      ...v,
      rating: avg_rating ?? v.rating,
      avg_rating: avg_rating ?? v.avg_rating,
      total_ratings: total_ratings ?? v.total_ratings,
    }));
    setReviews(list => {
      const i = list.findIndex(r => r.id === review.id || (review.is_mine && r.is_mine));
      if (i === -1) return [review, ...list];
      const copy = list.slice();
      copy[i] = review;
      return copy;
    });
  };

  if (loading && !vendor) {
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

  if (loadError || !vendor) {
    const missing = !loadError || loadError.status === 404;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 pt-16 px-4 text-center">
        <div className="text-6xl">🍢</div>
        <h2 className="text-2xl font-extrabold text-stone-900">{missing ? 'Vendor not found' : "We couldn't load this stall"}</h2>
        <p className="text-stone-500 text-sm">
          {missing ? 'This stall may have been removed or the link is broken.' : errorMessage(loadError)}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!missing && <button type="button" onClick={load} className="btn-primary">Try again</button>}
          <Link href="/" className="btn-ghost">← Back to Home</Link>
        </div>
      </div>
    );
  }

  if (isLocked(vendor)) return <LockedVendorView vendor={vendor} />;

  const city = cityOf(vendor);
  const heroImage = vendorImageOrPlaceholder(vendor);
  const directions = directionsUrl(vendor);
  const rating = vendorRating(vendor);
  const total = ratingCount(vendor);
  const cuisine = vendorCuisine(vendor);
  const area = vendorArea(vendor);
  const address = vendorAddress(vendor);
  const price = vendorPrice(vendor);
  const site = websiteUrl(vendor.website);
  const insta = instagramUrl(vendor.instagram);
  const phone = vendor.phone && String(vendor.phone).trim();
  const myReview = reviews.find(r => r.is_mine);
  const hasContact = phone || site || insta;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ── Hero ── */}
      {/* Height follows the content (never less than 42vh / 300px) so long stall names on narrow
          phones push the hero down instead of sliding up under the fixed navbar. */}
      <section className="relative min-h-[max(42vh,300px)] flex flex-col justify-end overflow-hidden">
        <img src={heroImage} alt={vendor.name || ''} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-stone-950/10" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-7 w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            {city && (
              <Link
                href={`/city/${city.slug}`}
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white font-semibold text-sm mb-4 transition-colors"
              >
                <ChevronLeft size={15} /> Back to {city.name}
              </Link>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {premiumOn && vendor.is_premium && (
                <span className="bg-amber-400 text-stone-900 text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Crown size={10} /> Premium pick
                </span>
              )}
              {vendor.is_hidden_gem && (
                <span className="bg-violet-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <Sparkles size={10} /> Hidden Gem
                </span>
              )}
              {vendor.is_verified === true && (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                  <ShieldCheck size={10} /> Verified by HungryBird
                </span>
              )}
              {vendor.price_level && (
                <span className="bg-white/90 backdrop-blur-sm text-stone-800 text-[10px] font-black px-2.5 py-1 rounded-full">
                  {vendor.price_level}
                </span>
              )}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight break-words">
              {vendor.name}
            </h1>
          </motion.div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-8 min-w-0">
          {/* Rating + quick facts */}
          <div className="panel bg-white p-5 sm:p-6 flex flex-wrap items-center gap-x-8 gap-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <StarRow value={rating || 0} size={18} />
              <span className="font-extrabold text-stone-900 text-lg">
                {rating ? rating.toFixed(1) : 'New'}
              </span>
              <span className="text-stone-400 text-sm font-medium">
                {total > 0 ? `(${total} ${total === 1 ? 'rating' : 'ratings'})` : 'No ratings yet'}
              </span>
            </div>
            {cuisine && (
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                <Flame size={16} className="text-brand-500" />
                {cuisine}
              </div>
            )}
            {area && (
              <div className="flex items-center gap-2 text-stone-500 text-sm font-medium">
                <MapPin size={16} className="text-brand-500" /> {area}
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
            {vendor.description ? (
              <p className="text-stone-500 text-sm leading-relaxed whitespace-pre-line break-words">{vendor.description}</p>
            ) : (
              <p className="text-stone-400 text-sm leading-relaxed">No description has been added for this stall yet. Been here? Leave a review below.</p>
            )}
            {(price || vendor.closed_days || vendor.landmark) && (
              <div className="mt-5 pt-5 border-t border-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {price && <Fact icon={IndianRupee}>Price: {price}</Fact>}
                {vendor.closed_days && <Fact icon={CalendarX}>Closed: {vendor.closed_days}</Fact>}
                {vendor.landmark && <Fact icon={Landmark}>Near {vendor.landmark}</Fact>}
              </div>
            )}
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
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="font-bold text-stone-900 text-sm min-w-0 truncate">
                      {r.author_name || 'Anonymous'}{r.is_mine && <span className="ml-1.5 text-[10px] font-bold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">You</span>}
                    </span>
                    <StarRow value={r.rating_value} size={13} />
                  </div>
                  {r.review_text && <p className="text-stone-500 text-sm leading-relaxed break-words">{r.review_text}</p>}
                  {!r.is_mine && typeof r.id === 'number' && (
                    <button
                      type="button"
                      onClick={() => setReport({ type: 'review', id: r.id, title: 'Report this review' })}
                      className="mt-1 -mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-stone-400 hover:text-red-500 py-1.5"
                    >
                      <Flag size={11} /> Report
                    </button>
                  )}
                </div>
              ))}
            </div>

            <ReviewForm vendorId={vendor.id} myReview={myReview} onSubmitted={handleReviewSubmitted} />
          </div>
        </div>

        {/* ── Side column ── */}
        <div className="space-y-6 min-w-0">
          {hasCoords(vendor) && (
            <div className="panel bg-white p-4 overflow-hidden" style={{ height: 260 }}>
              <div className="rounded-2xl overflow-hidden bg-stone-100 h-full border border-stone-200">
                <VendorMap lat={Number(vendor.lat)} lng={Number(vendor.lng)} name={vendor.name} />
              </div>
            </div>
          )}

          {directions && (
            <a
              href={directions}
              target="_blank"
              rel="noreferrer"
              className="btn-orange w-full justify-center gap-2"
            >
              <Navigation size={16} /> Get Directions
            </a>
          )}

          {address && (
            <p className="text-xs text-stone-500 text-center px-2 leading-relaxed break-words">
              <MapPin size={12} className="inline -mt-0.5 mr-1 text-brand-500" />{address}
            </p>
          )}

          <FavoriteButton vendorId={vendor.id} initial={isFavorite} />

          {hasContact && (
            <div className="panel bg-white p-4 space-y-3">
              <h4 className="text-[11px] font-black text-stone-400 uppercase tracking-wider">Contact</h4>
              {phone && (
                <a href={`tel:${phone.replace(/[^+\d]/g, '')}`} className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-brand-600 py-1">
                  <Phone size={15} className="text-brand-500 flex-shrink-0" /> <span className="break-all">{phone}</span>
                </a>
              )}
              {site && (
                <a href={site} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-brand-600 py-1 min-w-0">
                  <Globe size={15} className="text-brand-500 flex-shrink-0" /> <span className="truncate">{site.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}</span>
                </a>
              )}
              {insta && (
                <a href={insta} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 text-sm font-bold text-stone-700 hover:text-brand-600 py-1 min-w-0">
                  <AtSign size={15} className="text-brand-500 flex-shrink-0" /> <span className="truncate">{instagramHandle(vendor.instagram)}</span>
                </a>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setReport({ type: 'vendor', id: vendor.id, title: 'Report a problem' })}
            className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold text-stone-400 hover:text-red-500 py-2"
          >
            <Flag size={13} /> Report a problem with this listing
          </button>

          {/* Nearby vendors */}
          {nearby.length > 0 && (
            <div>
              <h4 className="font-extrabold text-stone-900 text-sm mb-3 uppercase tracking-wider text-[11px] text-stone-400">
                Nearby you might like
              </h4>
              <div className="space-y-3">
                {nearby.map(n => isLocked(n) ? (
                  <LockedVendorCard key={n.id} vendor={n} variant="row" />
                ) : (
                  <Link
                    key={n.id}
                    href={`/vendor/${n.id}`}
                    className="flex items-center gap-3 bg-white panel p-3 hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                      <img
                        src={vendorImageOrPlaceholder(n)}
                        alt={n.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-stone-900 text-sm truncate">{n.name}</p>
                      <p className="text-stone-400 text-xs truncate">
                        {[vendorCategory(n), vendorArea(n), formatDistance(n.distance_km)].filter(Boolean).join(' · ')}
                      </p>
                      {formatRating(n) && (
                        <p className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
                          <Star size={10} className="fill-brand-500 text-brand-500" /> {formatRating(n)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {report && (
        <ReportDialog targetType={report.type} targetId={report.id} title={report.title} onClose={() => setReport(null)} />
      )}
    </div>
  );
}
