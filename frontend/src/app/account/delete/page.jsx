"use client";

// Public account-deletion page (Google Play requires a web URL where users can request deletion).
// Readable without logging in; deleting requires logging in and confirming with the password.

import { useState } from 'react';
import Link from 'next/link';
import { Trash2, CheckCircle2, XCircle, Lock, LogIn, Mail, Loader2 } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useConfig } from '../../../context/ConfigContext';
import { api, errorMessage } from '../../../lib/api';
import { Alert, PasswordField } from '../../../components/ui/forms';

const DELETED = [
  'Your account: name, email address, phone number and password',
  'Your saved stalls (favourites)',
  'Your notification settings and app push token',
  'Any remaining Premium time on the account',
];

const KEPT = [
  'Reviews, ratings and stall suggestions you posted stay on HungryBird, but are no longer linked to your account. If you want them removed too, contact us before deleting.',
  'Payment records, where the law requires us to keep them (for example tax records).',
];

function DeletedNotice() {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
        <CheckCircle2 size={32} className="text-emerald-500" />
      </div>
      <h2 className="text-xl font-extrabold text-stone-900 mb-2">Your account has been deleted</h2>
      <p className="text-sm text-stone-500 mb-6">Thanks for being part of HungryBird. You can still browse the site without an account.</p>
      <Link href="/" className="btn-primary">Back to home</Link>
    </div>
  );
}

function DeleteForm({ user, onDeleted }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (confirm.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/account', { method: 'DELETE', body: { current_password: password } });
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, { default: "We couldn't delete your account right now. Please try again." }));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <p className="text-sm text-stone-600 m-0">
        Logged in as <strong className="text-stone-900 break-all">{user.email}</strong>.
      </p>
      <Alert>{error}</Alert>
      <PasswordField label="Your password" icon={Lock} id="delete-password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <div>
        <label htmlFor="delete-confirm" className="block text-sm font-bold text-stone-700 mb-2">
          Type <span className="font-mono text-red-600">DELETE</span> to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="block w-full px-3 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-400 focus:outline-none transition-all"
        />
      </div>
      <button
        type="submit"
        disabled={busy || !password || confirm.trim().toUpperCase() !== 'DELETE'}
        className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={16} />} Permanently delete my account
      </button>
      <p className="text-xs text-stone-500 text-center m-0">This can't be undone.</p>
    </form>
  );
}

export default function DeleteAccountPage() {
  const { user, loading, clearSession } = useAuth();
  const { supportEmail } = useConfig();
  const [deleted, setDeleted] = useState(false);

  return (
    <div className="min-h-screen bg-[#fdfbf9] pt-24 sm:pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-stone-900 leading-tight mb-3">Delete your HungryBird account</h1>
        <p className="text-stone-600 mb-8">
          You can permanently delete your HungryBird account and the personal data linked to it at any time. This
          applies to accounts created on the website and in the HungryBird app.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-stone-900 mb-4">What gets deleted</h2>
            <ul className="space-y-3">
              {DELETED.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-stone-700">
                  <XCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-white border border-stone-200 rounded-3xl p-5 sm:p-6">
            <h2 className="text-base font-extrabold text-stone-900 mb-4">What we keep</h2>
            <ul className="space-y-3">
              {KEPT.map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm text-stone-700">
                  <CheckCircle2 size={16} className="text-stone-400 flex-shrink-0 mt-0.5" /> <span>{t}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white border border-red-100 rounded-3xl p-5 sm:p-8 shadow-sm">
          {deleted ? (
            <DeletedNotice />
          ) : loading ? (
            <div className="py-8 flex justify-center"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : user ? (
            <DeleteForm user={user} onDeleted={() => { setDeleted(true); clearSession(); }} />
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-extrabold text-stone-900">How to delete your account</h2>
              <ol className="list-decimal pl-5 space-y-1 text-sm text-stone-700">
                <li>Log in with the email address of the account.</li>
                <li>Come back to this page (we bring you here after logging in).</li>
                <li>Confirm with your password.</li>
              </ol>
              <Link href={`/login?next=${encodeURIComponent('/account/delete')}`} className="btn-primary w-full sm:w-auto">
                <LogIn size={16} /> Log in to delete your account
              </Link>
              <p className="text-sm text-stone-500 m-0">
                Forgot your password?{' '}
                <Link href="/forgot-password" className="font-bold text-brand-600 hover:text-brand-700">Reset it</Link> first.
              </p>
              {supportEmail && (
                <p className="text-sm text-stone-500 m-0 flex flex-wrap items-center gap-1">
                  <Mail size={14} className="text-stone-400" /> Can't log in at all? Email{' '}
                  <a href={`mailto:${supportEmail}?subject=${encodeURIComponent('Delete my HungryBird account')}`} className="font-bold text-brand-600 break-all">
                    {supportEmail}
                  </a>{' '}
                  from the address on your account.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
