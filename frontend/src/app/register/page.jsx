"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { errorMessage, isStrongPassword, safeNext } from '../../lib/api';
import { Alert, AuthLayout, Field, PageSpinner, PasswordField, PasswordRules, SubmitButton } from '../../components/ui/forms';
import EmailCodeVerifier from '../../components/EmailCodeVerifier';

function RegisterFlow() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState('form'); // form | verify | done
  const [codeSent, setCodeSent] = useState(true);
  const { register, user, loading } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStrongPassword(password)) {
      setError(errorMessage({ code: 'WEAK_PASSWORD' }));
      return;
    }
    setIsSubmitting(true);
    setError('');

    const res = await register(name.trim(), email.trim(), password);
    setIsSubmitting(false);
    if (res.success) {
      setCodeSent(res.verificationSent);
      // Older backends don't have email verification: nothing to verify.
      setStep(res.user && res.user.email_verified === false ? 'verify' : 'done');
    } else {
      setError(errorMessage(res.error, { default: 'Failed to create account' }));
    }
  };

  const qs = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  if (step === 'verify') {
    return (
      <AuthLayout
        title="Check your email"
        subtitle="One last step: confirm your email address."
        below={
          <button type="button" onClick={() => router.push(next)} className="font-bold text-stone-500 hover:text-stone-800 py-2">
            Skip for now — I'll verify later
          </button>
        }
      >
        {!codeSent && (
          <Alert tone="warning" className="mb-6">
            Your account is ready, but we couldn't send the verification email just now. Try sending the code again.
          </Alert>
        )}
        <EmailCodeVerifier
          email={user?.email || email}
          codeSent={codeSent}
          initialCooldown={codeSent ? 60 : 0}
          onVerified={() => setStep('done')}
        />
      </AuthLayout>
    );
  }

  if (step === 'done') {
    return (
      <AuthLayout title="You're all set" subtitle={`Welcome to HungryBird${user?.name ? `, ${user.name.split(' ')[0]}` : ''}!`}>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <p className="text-sm text-stone-600">
            {user?.email_verified ? 'Your email is verified.' : 'Your account has been created.'} Start exploring the best street food near you.
          </p>
          <button type="button" onClick={() => router.push(next)} className="btn-orange w-full">
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  if (!loading && user && !isSubmitting) {
    return (
      <AuthLayout title="You're already signed in" subtitle={user.email}>
        <div className="space-y-3">
          <Link href={next} className="btn-orange w-full">Continue</Link>
          <Link href="/account" className="btn-ghost w-full">Go to your account</Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create an account"
      subtitle={
        <>
          Already have an account?{' '}
          <Link href={`/login${qs}`} className="font-bold text-brand-500 hover:text-brand-600">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <Alert>{error}</Alert>

        <Field
          label="Full Name"
          icon={User}
          id="name"
          type="text"
          autoComplete="name"
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />

        <Field
          label="Email address"
          icon={Mail}
          id="email"
          type="email"
          autoComplete="email"
          required
          maxLength={150}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />

        <div>
          <PasswordField
            label="Password"
            icon={Lock}
            id="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <PasswordRules value={password} />
        </div>

        <SubmitButton loading={isSubmitting} disabled={!isStrongPassword(password)}>
          Create Account <ArrowRight className="h-4 w-4" />
        </SubmitButton>

        <p className="text-xs text-stone-500 text-center m-0">
          By creating an account you agree to our{' '}
          <Link href="/terms" className="font-bold text-stone-700 hover:text-brand-600">Terms</Link> and{' '}
          <Link href="/privacy" className="font-bold text-stone-700 hover:text-brand-600">Privacy Policy</Link>.
        </p>
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RegisterFlow />
    </Suspense>
  );
}
