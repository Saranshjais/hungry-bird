"use client";

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CheckCircle2, XCircle, MapPin, ArrowLeft, Loader2, Store } from 'lucide-react';
import Link from 'next/link';
import RequireAuth from '../../../components/RequireAuth';
import { api, errorMessage } from '../../../lib/api';
import { formatDate } from '../../../lib/vendors';

function renderStatus(status) {
  if (status === 'approved') {
    return (
      <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/50 w-fit">
        <CheckCircle2 size={12} className="text-emerald-500" />
        <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Approved</span>
      </div>
    );
  }
  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-md border border-red-200/50 w-fit">
        <XCircle size={12} className="text-red-500" />
        <span className="text-red-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Not approved</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/50 w-fit">
      <Clock size={12} className="text-amber-500" />
      <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">In review</span>
    </div>
  );
}

function Submissions() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api('/api/user/submissions');
      setSubmissions(data.submissions || []);
    } catch (err) {
      setError(errorMessage(err, { default: 'Failed to load submissions.' }));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubmissions(); }, [fetchSubmissions]);

  return (
    <div className="min-h-screen bg-[#fdfbf9] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-1">My Submissions</h1>
            <p className="text-sm text-stone-500 font-medium m-0">Track the stalls you have suggested.</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-8 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4" role="status">
              <Loader2 size={32} className="text-brand-500 animate-spin" />
              <p className="text-stone-500 font-medium">Getting your submissions…</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-red-600 font-bold mb-2">Oops!</p>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button
                type="button"
                onClick={fetchSubmissions}
                className="px-4 py-2 bg-white text-red-600 rounded-lg text-sm font-bold border border-red-200 hover:bg-red-50 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-6">
                <Store size={32} className="text-stone-300" />
              </div>
              <h3 className="text-xl font-extrabold text-stone-900 mb-2">No submissions yet</h3>
              <p className="text-stone-500 max-w-md mx-auto mb-8">
                You haven't suggested any stalls yet. Help others discover great street food!
              </p>
              <Link href="/submit-vendor" className="btn-primary">
                Submit a Gem
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-4 sm:p-5 border border-stone-200 rounded-2xl bg-white hover:border-stone-300 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-stone-900 mb-1 leading-tight break-words">{sub.stall_name}</h3>
                      {sub.city_name && (
                        <div className="flex items-center gap-1.5 text-stone-500">
                          <MapPin size={14} className="text-brand-500 flex-shrink-0" />
                          <span className="text-sm font-medium">{sub.city_name}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {renderStatus(sub.status)}
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-stone-600 text-sm m-0 break-words">
                      <span className="font-bold text-stone-800">Cuisine:</span> {sub.cuisine_type || '—'}
                    </p>
                    {sub.created_at && (
                      <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider m-0">
                        Submitted {formatDate(sub.created_at)}
                      </p>
                    )}
                  </div>
                  {sub.review_notes && (
                    <p className="text-sm text-stone-600 mt-3 mb-0 break-words">
                      <span className="font-bold text-stone-800">Note from our team:</span> {sub.review_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UserSubmissionsPage() {
  return <RequireAuth><Submissions /></RequireAuth>;
}
