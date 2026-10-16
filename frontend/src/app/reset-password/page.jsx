"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, RotateCw } from 'lucide-react';
import { api, errorMessage, isStrongPassword } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { Alert, AuthLayout, CodeInput, Field, PageSpinner, PasswordField, PasswordRules, SubmitButton } from '../../components/ui/forms';

function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, clearSession } = useAuth();
  const [email, setEmail] = useState(params.get('email') || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const submit = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setError(errorMessage({ code: 'WEAK_PASSWORD' }));
      return;
    }
    setSaving(true);
    setError('');
    setInfo('');
    try {
      await api('/api/auth/password/reset', {
        method: 'POST',
        auth: false,
        body: { email: email.trim(), code, new_password: password },
      });
      // The server revokes every existing session of this account; drop ours too.
      if (user) clearSession();
      router.push(`/login?reset=1&email=${encodeURIComponent(email.trim())}`);
    } catch (err) {
      if (err.code === 'CODE_EXPIRED' || err.code === 'TOO_MANY_ATTEMPTS') setCode('');
      setError(errorMessage(err, { default: "We couldn't reset your password. Please try again." }));
      setSaving(false);
    }
  };

  const resend = async () => {
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setInfo('');
    try {
      await api('/api/auth/password/forgot', { method: 'POST', body: { email: email.trim() }, auth: false });
      setInfo(`If an account exists for ${email.trim()}, a new code is on its way.`);
      setCooldown(60);
    } catch (err) {
      if (err.code === 'RATE_LIMITED') setCooldown(Number(err.data?.resend_after) > 0 ? Number(err.data.resend_after) : 60);
      setError(errorMessage(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Set a new password"
      subtitle="Enter the 6-digit code we emailed you and choose a new password."
      below={
        <Link href="/login" className="font-bold text-stone-500 hover:text-stone-800 py-2 inline-block">
          Back to login
        </Link>
      }
    >
      <form className="space-y-6" onSubmit={submit}>
        <Alert>{error}</Alert>
        <Alert tone="success">{info}</Alert>

        <Field
          label="Email address"
          icon={Mail}
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <div>
          <CodeInput value={code} onChange={setCode} autoFocus={!!email} />
          <div className="mt-1 text-right">
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || resending}
              className="inline-flex items-center gap-1 py-2 text-sm font-bold text-brand-500 hover:text-brand-600 disabled:text-stone-400 disabled:cursor-not-allowed"
            >
              <RotateCw size={13} className={resending ? 'animate-spin' : ''} />
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Send a new code'}
            </button>
          </div>
        </div>

        <div>
          <PasswordField
            label="New password"
            icon={Lock}
            id="new-password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <PasswordRules value={password} />
        </div>

        <SubmitButton loading={saving} disabled={code.length !== 6 || !isStrongPassword(password) || !email.trim()}>
          Save new password <ArrowRight className="h-4 w-4" />
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResetPassword />
    </Suspense>
  );
}
