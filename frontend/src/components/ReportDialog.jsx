"use client";

// "Report a problem" dialog → POST /api/reports (target_type: vendor | review | reel).

import { useEffect, useState } from 'react';
import { Flag, X, CheckCircle2, Loader2 } from 'lucide-react';
import { api, errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Alert } from './ui/forms';

const REASONS = {
  vendor: ['Permanently closed', 'Wrong location or details', 'Duplicate listing', 'Inappropriate photo or content', 'Other'],
  review: ['Spam or advertising', 'Offensive or abusive', 'Not about this stall', 'Fake review', 'Other'],
  reel: ['Spam', 'Offensive or abusive', 'Not about street food', 'Other'],
};

export default function ReportDialog({ targetType, targetId, title = 'Report a problem', onClose }) {
  const { user } = useAuth();
  const reasons = REASONS[targetType] || REASONS.vendor;
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    if (!reason) {
      setError('Please choose a reason.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/reports', {
        method: 'POST',
        body: {
          target_type: targetType,
          target_id: targetId,
          reason,
          details: details.trim(),
          ...(user ? {} : { reporter_name: name.trim() }),
        },
      });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, { default: "We couldn't send your report. Please try again." }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] supports-[height:100dvh]:max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3 border-b border-stone-100 sticky top-0 bg-white">
          <h2 id="report-title" className="text-lg font-extrabold text-stone-900 flex items-center gap-2">
            <Flag size={17} className="text-red-500" /> {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 flex items-center justify-center rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-800">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="p-6 text-center">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
            <p className="font-bold text-stone-900 mb-1">Thanks for letting us know</p>
            <p className="text-sm text-stone-500 mb-6">Our team will take a look.</p>
            <button type="button" onClick={onClose} className="btn-primary w-full">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            <Alert>{error}</Alert>
            <fieldset>
              <legend className="text-sm font-bold text-stone-700 mb-2">What's wrong?</legend>
              <div className="space-y-2">
                {reasons.map((r) => (
                  <label key={r} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${reason === r ? 'border-brand-500 bg-brand-50 text-stone-900' : 'border-stone-200 text-stone-700 hover:bg-stone-50'}`}>
                    <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-brand-500 w-4 h-4" />
                    {r}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="report-details" className="block text-sm font-bold text-stone-700 mb-2">Details (optional)</label>
              <textarea id="report-details" rows={3} maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500 resize-none" placeholder="Anything that helps us check it" />
            </div>
            {!user && (
              <div>
                <label htmlFor="report-name" className="block text-sm font-bold text-stone-700 mb-2">Your name (optional)</label>
                <input id="report-name" type="text" maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="w-full text-sm p-3 border border-stone-200 rounded-xl outline-none focus:border-brand-500" />
              </div>
            )}
            <button type="submit" disabled={busy} className="btn-orange w-full disabled:opacity-60">
              {busy ? <Loader2 size={16} className="animate-spin" /> : 'Send report'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
