"use client";

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, ArrowRight, MailCheck } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { Alert, AuthLayout, Field, PageSpinner, SubmitButton } from '../../components/ui/forms';

function ForgotPassword() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get('email') || '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setSending(true);
    setError('');
    try {
      // Always answers {ok:true} whether or not the account exists (no account enumeration).
      await api('/api/auth/password/forgot', { method: 'POST', body: { email: value }, auth: false });
      setSentTo(value);
    } catch (err) {
      setError(errorMessage(err, { default: "We couldn't send the code right now. Please try again." }));
    } finally {
      setSending(false);
    }
  };

  if (sentTo) {
    return (
      <AuthLayout
        title="Check your email"
        below={
          <Link href="/login" className="font-bold text-stone-500 hover:text-stone-800 py-2 inline-block">
            Back to login
          </Link>
        }
      >
        <div className="space-y-6">
          <div className="flex items-start gap-3 bg-brand-50 border border-brand-100 rounded-2xl p-4">
            <MailCheck size={22} className="text-brand-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-stone-700 m-0 min-w-0 break-words" style={{ color: 'inherit' }}>
              If an account exists for <strong className="text-stone-900 break-all">{sentTo}</strong>, we&apos;ve sent it a
              6-digit code. The code is valid for 10 minutes.
            </p>
          </div>
          <Link href={`/reset-password?email=${encodeURIComponent(sentTo)}`} className="btn-orange w-full">
            Enter the code <ArrowRight size={16} />
          </Link>
          <button
            type="button"
            onClick={() => setSentTo('')}
            className="w-full text-sm font-bold text-stone-500 hover:text-stone-800 py-2"
          >
            Use a different email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle="Enter your account email and we'll send you a code to set a new password."
      below={
        <>
          Remembered it?{' '}
          <Link href="/login" className="font-bold text-brand-500 hover:text-brand-600">
            Back to login
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={submit}>
        <Alert>{error}</Alert>
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
        <SubmitButton loading={sending}>
          Send code <ArrowRight className="h-4 w-4" />
        </SubmitButton>
        <p className="text-xs text-stone-500 text-center m-0">
          Already have a code?{' '}
          <Link
            href={`/reset-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
            className="font-bold text-brand-500 hover:text-brand-600"
          >
            Enter it here
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ForgotPassword />
    </Suspense>
  );
}
