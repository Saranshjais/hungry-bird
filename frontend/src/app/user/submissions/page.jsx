"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Clock, CheckCircle2, XCircle, MapPin, ArrowLeft, Loader2, Store } from 'lucide-react';
import Link from 'next/link';

export default function UserSubmissionsPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If not loading auth, and user is null, redirect to login
    if (!token) {
      if (typeof window !== 'undefined' && localStorage.getItem('token') === null) {
        router.push('/login');
      }
      return;
    }
    
    fetchSubmissions();
  }, [token, router]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:5000';
      const res = await fetch(`${backendUrl}/api/user/submissions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) {
        throw new Error('Failed to load submissions');
      }
      
      const data = await res.json();
      setSubmissions(data.submissions || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load submissions.');
    } finally {
      setLoading(false);
    }
  };

  const renderStatus = (status) => {
    if (status === 'pending') {
      return (
        <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200/50">
          <Clock size={12} className="text-amber-500" />
          <span className="text-amber-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Pending</span>
        </div>
      );
    } else if (status === 'approved') {
      return (
        <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/50">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-emerald-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Approved</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1 rounded-md border border-red-200/50">
          <XCircle size={12} className="text-red-500" />
          <span className="text-red-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Rejected</span>
        </div>
      );
    }
  };

  if (!user && !token) return null; // Prevent flicker while redirecting

  return (
    <div className="min-h-screen bg-[#fdfbf9] pt-24 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center rounded-full border border-stone-200 bg-white text-stone-600 hover:bg-stone-50 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-1">My Submissions</h1>
            <p className="text-sm text-stone-500 font-medium">Track the vendors you have submitted for verification.</p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-8 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="text-brand-500 animate-spin" />
              <p className="text-stone-500 font-medium">Loading submissions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 text-center">
              <p className="text-red-600 font-bold mb-2">Oops!</p>
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <button 
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
                You haven't submitted any hidden gems for verification. Help others discover great street food!
              </p>
              <Link href="/submit-vendor" className="btn-primary">
                Submit a Gem
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {submissions.map((sub) => (
                <div key={sub.id} className="p-5 border border-stone-200 rounded-2xl bg-white hover:border-stone-300 transition-colors shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-stone-900 mb-1 leading-tight">{sub.stall_name}</h3>
                      <div className="flex items-center gap-1.5 text-stone-500">
                        <MapPin size={14} className="text-brand-500" />
                        <span className="text-sm font-medium">{sub.city_name}</span>
                      </div>
                    </div>
                    <div>
                      {renderStatus(sub.status)}
                    </div>
                  </div>
                  
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-stone-600 text-sm">
                      <span className="font-bold text-stone-800">Cuisine:</span> {sub.cuisine_type || 'N/A'}
                    </p>
                    <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                      Submitted {new Date(sub.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
