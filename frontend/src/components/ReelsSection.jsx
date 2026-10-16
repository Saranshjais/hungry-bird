"use client";

// Approved community reels from /api/reels. The whole section is hidden when there are none.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Share2, Check, Upload, X, Flag } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { loginHref } from './RequireAuth';
import { Alert } from './ui/forms';
import ReportDialog from './ReportDialog';

const MAX_VIDEO_MB = 50;
const VIDEO_TYPES = ['video/mp4', 'video/webm'];

function formatViews(n) {
  const v = Number(n) || 0;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(v);
}

export default function ReelsSection() {
  const { user } = useAuth();
  const router = useRouter();
  const [copiedId, setCopiedId] = useState(null);
  const [reels, setReels] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState({ tone: '', text: '' });
  const [reportId, setReportId] = useState(null);

  useEffect(() => {
    api('/api/reels', { auth: false })
      .then(data => setReels((data.reels || []).filter(r => r && r.videoUrl)))
      .catch(() => setReels([]));
  }, []);

  const openUpload = () => {
    if (!user) {
      router.push(loginHref('/#reels'));
      return;
    }
    setUploadMsg({ tone: '', text: '' });
    setShowUploadModal(true);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const file = formData.get("video");
    if (!file || !file.name) {
      setUploadMsg({ tone: 'error', text: 'Please choose a video file.' });
      return;
    }
    if (file.type && !VIDEO_TYPES.includes(file.type)) {
      setUploadMsg({ tone: 'error', text: 'Please upload an MP4 or WebM video.' });
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setUploadMsg({ tone: 'error', text: `Videos can be up to ${MAX_VIDEO_MB} MB.` });
      return;
    }
    setUploading(true);
    setUploadMsg({ tone: '', text: '' });
    try {
      await api('/api/submit-reel', { method: 'POST', body: formData, timeout: 120000 });
      setUploadMsg({ tone: 'success', text: 'Thanks! Your video will appear here once our team has reviewed it.' });
      e.target.reset();
    } catch (err) {
      setUploadMsg({ tone: 'error', text: errorMessage(err, { default: 'Upload failed. Please try again.' }) });
    } finally {
      setUploading(false);
    }
  };

  const handleShare = (e, reel) => {
    e.stopPropagation(); // prevent clicking the card
    const url = reel.videoUrl || window.location.href;
    if (navigator.share) {
      navigator.share({
        title: reel.title || 'Check out this street food video!',
        url,
      }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopiedId(reel.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  if (reels.length === 0) return null;

  return (
    <section id="reels" className="py-24 bg-stone-50 overflow-hidden relative selection:bg-brand-500/30 scroll-mt-24">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-brand-400/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-amber-400/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-stone-200 text-stone-600 text-xs font-semibold tracking-wide uppercase mb-4 shadow-sm">
              <Play size={12} className="text-brand-500 fill-brand-500" /> Shorts & Reels
            </span>
            <h2 className="text-[36px] sm:text-[46px] font-extrabold text-stone-900 tracking-tight leading-tight">
              Watch & <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-amber-500">Drool</span>
            </h2>
            <p className="text-stone-500 text-[15px] sm:text-[16px] max-w-md mt-3">
              Get up close with India's most mouth-watering street food, filmed by the community.
            </p>
          </div>
          <button type="button" onClick={openUpload} className="flex items-center gap-2 text-white bg-brand-500 hover:bg-brand-600 px-5 py-2.5 rounded-full transition-colors shadow-sm w-fit">
            <Upload size={16} />
            <span className="text-sm font-semibold">Upload Video</span>
          </button>
        </div>
      </div>

      {/* Horizontal Carousel */}
      <div className="relative z-10 w-full pl-4 sm:pl-6 lg:pl-8 mx-auto max-w-7xl">
        <div className="flex gap-4 sm:gap-6 overflow-x-auto pb-8 pt-4 hide-scrollbar snap-x snap-mandatory pr-4 sm:pr-8">
          {reels.map((reel, idx) => (
            <motion.div
              key={reel.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
              className="relative shrink-0 w-[min(260px,calc(100vw-3rem))] sm:w-[300px] h-[450px] sm:h-[520px] rounded-[32px] overflow-hidden group cursor-pointer snap-start bg-black border border-stone-200 shadow-md"
            >
              <video
                src={reel.videoUrl}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
              />

              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/90 transition-opacity duration-300 group-hover:opacity-90 pointer-events-none" />

              {/* Content Bottom */}
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 flex flex-col justify-end transform transition-transform duration-300 group-hover:translate-y-[-8px]">
                <div className="flex items-center justify-between mb-3 w-full gap-2">
                  {Number(reel.views) > 0 ? (
                    <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/90 text-xs font-medium">
                      {formatViews(reel.views)} views
                    </div>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setReportId(reel.id); }}
                      className="relative p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-white/30 transition-colors z-20 before:absolute before:-inset-1.5 before:content-['']"
                      title="Report video"
                      aria-label="Report video"
                    >
                      <Flag size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShare(e, reel)}
                      className="relative p-2 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-white/30 transition-colors z-20 before:absolute before:-inset-1.5 before:content-['']"
                      title="Share Video"
                      aria-label="Share video"
                    >
                      {copiedId === reel.id ? <Check size={14} className="text-green-400" /> : <Share2 size={14} />}
                    </button>
                  </div>
                </div>
                <h3 className="text-white font-bold text-xl sm:text-2xl leading-tight mb-2 drop-shadow-md break-words">
                  {reel.title}
                </h3>
                {reel.author && (
                  <p className="text-white/70 text-sm font-medium flex items-center gap-2 m-0" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    <span className="w-5 h-5 rounded-full bg-gradient-to-tr from-brand-500 to-amber-400 p-[1px] flex-shrink-0">
                      <span className="block w-full h-full rounded-full bg-stone-800" />
                    </span>
                    <span className="truncate">@{reel.author}</span>
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CSS to hide scrollbar but allow scroll */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md max-h-full overflow-y-auto shadow-2xl relative"
              role="dialog"
              aria-modal="true"
              aria-labelledby="reel-upload-title"
            >
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                aria-label="Close"
                className="absolute top-4 right-4 p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
              <h3 id="reel-upload-title" className="text-2xl font-bold text-stone-900 mb-6 pr-10">Upload Video Reel</h3>

              <form onSubmit={handleUpload} className="flex flex-col gap-4">
                <Alert tone={uploadMsg.tone || 'error'}>{uploadMsg.text}</Alert>
                <div>
                  <label htmlFor="reel-author" className="block text-sm font-semibold text-stone-700 mb-1">Your Name / Handle</label>
                  <input id="reel-author" required name="author_name" type="text" maxLength={100} defaultValue={user?.name || ''} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="e.g. Foodie123" />
                </div>
                <div>
                  <label htmlFor="reel-title" className="block text-sm font-semibold text-stone-700 mb-1">Video Title</label>
                  <input id="reel-title" required name="title" type="text" maxLength={150} className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors" placeholder="e.g. Best Vada Pav!" />
                </div>
                <div>
                  <label htmlFor="reel-file" className="block text-sm font-semibold text-stone-700 mb-1">Video File (MP4/WebM, up to {MAX_VIDEO_MB} MB)</label>
                  <input id="reel-file" required name="video" type="file" accept="video/mp4,video/webm" className="w-full text-sm text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-600 hover:file:bg-brand-100 transition-colors" />
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-4 w-full bg-brand-500 hover:bg-brand-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "Submit for Review"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {reportId && <ReportDialog targetType="reel" targetId={reportId} title="Report this video" onClose={() => setReportId(null)} />}
    </section>
  );
}
