"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Play, Video, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminReels() {
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchReels();
  }, []);

  const fetchReels = async () => {
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + "/api/admin/reels/pending", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      setReels(data.reels || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      const token = sessionStorage.getItem("admin_token");
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000") + `/api/admin/reels/${id}/${action}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.ok) {
        setReels(reels.filter(r => r.id !== id));
      } else {
        alert("Action failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="font-sans">
      <div className="admin-page-header">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Video className="text-rose-500" size={32} /> Video Approvals
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Review and moderate community-submitted video reels.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
        </div>
      ) : reels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-700">All Caught Up!</h3>
          <p className="text-slate-500 mt-2">No pending video submissions at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence>
            {reels.map((reel) => (
              <motion.div
                key={reel.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col group"
              >
                <div className="relative h-64 bg-black">
                  <video 
                    src={reel.videoUrl} 
                    className="w-full h-full object-cover" 
                    controls 
                    preload="metadata"
                  />
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-white/10">
                    ID: #{reel.id}
                  </div>
                </div>
                
                <div className="p-6 flex flex-col flex-grow">
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2">{reel.title}</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 font-bold text-sm">
                        {reel.author_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold text-slate-600">{reel.author_name}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4 mt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleAction(reel.id, 'reject')}
                      disabled={actionLoading === reel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={18} /> Reject
                    </button>
                    <button
                      onClick={() => handleAction(reel.id, 'approve')}
                      disabled={actionLoading === reel.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 size={18} /> Approve
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
