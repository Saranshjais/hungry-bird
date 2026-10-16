"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  UserRound, Mail, Lock, Phone, ShieldCheck, ShieldAlert, Crown, ClipboardList, Heart,
  ChevronRight, Trash2, LogOut, Save, Loader2,
} from 'lucide-react';
import RequireAuth from '../../components/RequireAuth';
import { useAuth } from '../../context/AuthContext';
import { useConfig } from '../../context/ConfigContext';
import { api, errorMessage, isStrongPassword } from '../../lib/api';
import { formatDate } from '../../lib/vendors';
import { formatPaise, premiumEnabled } from '../../lib/premium';
import { Alert, Field, PasswordField, PasswordRules } from '../../components/ui/forms';

function Section({ icon: Icon, title, description, children, tone = 'default' }) {
  return (
    <section className={`bg-white border rounded-3xl p-5 sm:p-8 shadow-sm ${tone === 'danger' ? 'border-red-100' : 'border-stone-200'}`}>
      <div className="flex items-start gap-3 mb-6">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${tone === 'danger' ? 'bg-red-50 text-red-500' : 'bg-brand-50 text-brand-500'}`}>
          <Icon size={19} />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-stone-900 leading-tight">{title}</h2>
          {description && <p className="text-sm text-stone-500 mt-1 mb-0">{description}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function SaveButton({ loading, children = 'Save changes', disabled }) {
  return (
    <button type="submit" disabled={loading || disabled} className="btn-primary w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed">
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={15} />} {children}
    </button>
  );
}

function ProfileForm({ user }) {
  const { updateUser } = useAuth();
  const [name, setName] = useState(user.name || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ tone: '', text: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setMsg({ tone: 'error', text: 'Please enter your name.' });
      return;
    }
    if (phone.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(phone.trim())) {
      setMsg({ tone: 'error', text: 'Enter a valid phone number (digits, spaces, + and - only).' });
      return;
    }
    setSaving(true);
    setMsg({ tone: '', text: '' });
    try {
      const data = await api('/api/auth/profile', { method: 'PUT', body: { name: name.trim(), phone: phone.trim() } });
      updateUser(data.user || { name: name.trim(), phone: phone.trim() });
      setMsg({ tone: 'success', text: 'Profile saved.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Alert tone={msg.tone || 'error'}>{msg.text}</Alert>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Field label="Name" icon={UserRound} id="name" required maxLength={100} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        <Field label="Phone (optional)" icon={Phone} id="phone" type="tel" maxLength={20} autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
      </div>
      <SaveButton loading={saving} />
    </form>
  );
}

function EmailForm({ user }) {
  const { updateUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ tone: '', text: '' });
  const [pendingVerify, setPendingVerify] = useState(false);
  const unverified = user.email_verified === false;

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value || value === (user.email || '').toLowerCase()) {
      setMsg({ tone: 'error', text: 'Enter a new email address.' });
      return;
    }
    setSaving(true);
    setMsg({ tone: '', text: '' });
    try {
      const data = await api('/api/auth/profile', { method: 'PUT', body: { email: value, current_password: password } });
      const next = data.user || { email: value, email_verified: false };
      updateUser(next);
      setEmail('');
      setPassword('');
      const needsCode = next.email_verified === false;
      const sent = data.verification_sent !== false;
      setPendingVerify(needsCode && sent);
      setMsg({
        tone: 'success',
        text: !needsCode
          ? 'Email changed.'
          : sent
            ? `Email changed. We sent a 6-digit code to ${next.email || value} — enter it to verify the new address.`
            : `Email changed to ${next.email || value}. We couldn't send the verification code just now — use "Verify your email" to send one.`,
      });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50 border border-stone-100 rounded-2xl p-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider m-0">Current email</p>
          <p className="font-bold text-stone-900 break-all m-0">{user.email}</p>
        </div>
        {unverified ? (
          <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <ShieldAlert size={13} /> Not verified
          </span>
        ) : user.email_verified === true ? (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full text-xs font-bold">
            <ShieldCheck size={13} /> Verified
          </span>
        ) : null}
      </div>

      {(unverified || pendingVerify) && (
        <Link href={`/verify-email?next=/account${pendingVerify ? '&sent=1' : ''}`} className="btn-orange w-full sm:w-auto">
          <ShieldCheck size={16} /> {pendingVerify ? 'Enter verification code' : 'Verify your email'}
        </Link>
      )}

      <form onSubmit={submit} className="space-y-5 pt-2 border-t border-stone-100">
        <h3 className="text-sm font-extrabold text-stone-900 pt-4">Change email</h3>
        <Alert tone={msg.tone || 'error'}>{msg.text}</Alert>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="New email" icon={Mail} id="new-email" type="email" autoComplete="email" required maxLength={150} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <PasswordField label="Current password" icon={Lock} id="email-password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <p className="text-xs text-stone-500 m-0">You'll need to verify the new address with a code we email to it.</p>
        <SaveButton loading={saving} disabled={!email.trim() || !password}>Change email</SaveButton>
      </form>
    </div>
  );
}

function PasswordForm() {
  const { setToken } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ tone: '', text: '' });

  const submit = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(next)) {
      setMsg({ tone: 'error', text: errorMessage({ code: 'WEAK_PASSWORD' }) });
      return;
    }
    setSaving(true);
    setMsg({ tone: '', text: '' });
    try {
      const data = await api('/api/auth/password', { method: 'PUT', body: { current_password: current, new_password: next } });
      // Other sessions are revoked; the server hands this browser a fresh token.
      if (data.token) setToken(data.token);
      setCurrent('');
      setNext('');
      setMsg({ tone: 'success', text: 'Password changed. You have been logged out on other devices.' });
    } catch (err) {
      setMsg({ tone: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <Alert tone={msg.tone || 'error'}>{msg.text}</Alert>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <PasswordField label="Current password" icon={Lock} id="current-password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
        <div>
          <PasswordField label="New password" icon={Lock} id="new-password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          <PasswordRules value={next} />
        </div>
      </div>
      <SaveButton loading={saving} disabled={!current || !isStrongPassword(next)}>Change password</SaveButton>
    </form>
  );
}

const HISTORY_LABELS = { purchase: 'Purchase', payment: 'Purchase', grant: 'Granted by HungryBird', extend: 'Extended by HungryBird', revoke: 'Ended by HungryBird' };

function PremiumStatus() {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = () => {
    setState({ loading: true, error: '', data: null });
    api('/api/premium/status')
      .then((data) => setState({ loading: false, error: '', data }))
      .catch((err) => setState({ loading: false, error: errorMessage(err), data: null }));
  };
  useEffect(load, []);

  if (state.loading) return <div className="py-6 flex justify-center"><div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>;
  if (state.error) {
    return (
      <div className="space-y-3">
        <Alert>{state.error}</Alert>
        <button type="button" onClick={load} className="btn-ghost">Try again</button>
      </div>
    );
  }
  const { is_premium: active, premium_until: until, history = [] } = state.data || {};

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl p-4 border flex flex-wrap items-center justify-between gap-3 ${active ? 'bg-amber-50 border-amber-200' : 'bg-stone-50 border-stone-100'}`}>
        <div className="min-w-0">
          <p className="font-extrabold text-stone-900 m-0 flex items-center gap-1.5">
            <Crown size={16} className={active ? 'text-amber-500' : 'text-stone-400'} />
            {active ? 'Premium is active' : 'You are on the free plan'}
          </p>
          {active && until && <p className="text-sm text-stone-600 m-0 mt-0.5">Until {formatDate(until, { day: 'numeric', month: 'long', year: 'numeric' })}</p>}
          {!active && until && <p className="text-sm text-stone-500 m-0 mt-0.5">Your last pass ended on {formatDate(until)}</p>}
        </div>
        <Link href="/premium" className="btn-orange" style={{ minHeight: 42 }}>
          {active ? 'Extend Premium' : 'Get Premium'}
        </Link>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-extrabold text-stone-900 mb-3">History</h3>
          <ul className="divide-y divide-stone-100 border border-stone-100 rounded-2xl overflow-hidden">
            {history.map((h, i) => (
              <li key={i} className="p-4 flex flex-wrap items-center justify-between gap-2 bg-white">
                <div className="min-w-0">
                  <p className="font-bold text-stone-800 text-sm m-0">
                    {HISTORY_LABELS[h.kind] || (h.kind ? h.kind.charAt(0).toUpperCase() + h.kind.slice(1) : 'Premium')}
                    {h.days ? ` · ${h.days} days` : ''}
                  </p>
                  <p className="text-xs text-stone-500 m-0">
                    {formatDate(h.created_at)}
                    {h.ends_at ? ` · ends ${formatDate(h.ends_at)}` : ''}
                  </p>
                </div>
                {h.amount_paise != null && <span className="text-sm font-extrabold text-stone-900">{formatPaise(h.amount_paise)}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function LinkRow({ href, icon: Icon, label, hint }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-4 rounded-2xl border border-stone-200 bg-white hover:border-brand-300 hover:bg-brand-50/40 transition-colors">
      <Icon size={18} className="text-brand-500 flex-shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-stone-900 text-sm">{label}</span>
        {hint && <span className="block text-xs text-stone-500">{hint}</span>}
      </span>
      <ChevronRight size={16} className="text-stone-400 flex-shrink-0" />
    </Link>
  );
}

function AccountContent({ user }) {
  const config = useConfig();
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-[#fdfbf9] pt-24 sm:pt-28 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-1 leading-tight">Your account</h1>
            <p className="text-sm text-stone-500 font-medium m-0 break-all">{user.email}</p>
          </div>
          <button type="button" onClick={() => logout()} className="btn-ghost" style={{ minHeight: 42 }}>
            <LogOut size={15} /> Log out
          </button>
        </div>

        <Section icon={UserRound} title="Profile" description="Your name is shown on reviews you post.">
          <ProfileForm user={user} />
        </Section>

        <Section icon={Mail} title="Email" description="Used to log in and to send you verification and password codes.">
          <EmailForm user={user} />
        </Section>

        <Section icon={Lock} title="Password" description="Changing it logs you out everywhere else.">
          <PasswordForm />
        </Section>

        {premiumEnabled(config) && (
          <Section icon={Crown} title="Premium" description="Unlock every hidden gem and food trail.">
            <PremiumStatus />
          </Section>
        )}

        <Section icon={ClipboardList} title="Your activity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LinkRow href="/user/submissions" icon={ClipboardList} label="My Submissions" hint="Stalls you suggested" />
            <LinkRow href="/account/favorites" icon={Heart} label="Saved stalls" hint="Your favourites" />
          </div>
        </Section>

        <Section icon={Trash2} title="Delete account" description="Permanently delete your HungryBird account and personal data." tone="danger">
          <Link href="/account/delete" className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-full border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors w-full sm:w-auto">
            <Trash2 size={15} /> Delete my account
          </Link>
        </Section>
      </div>
    </div>
  );
}

export default function AccountPage() {
  return <RequireAuth>{(user) => <AccountContent user={user} />}</RequireAuth>;
}
