"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { errorMessage, safeNext } from '../../lib/api';
import { Alert, AuthLayout, Field, PageSpinner, PasswordField, SubmitButton } from '../../components/ui/forms';

function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/');
  const [email, setEmail] = useState(params.get('email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const router = useRouter();
  const notice = params.get('reset') === '1' ? 'Your password has been changed. Log in with your new password.' : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const res = await login(email.trim(), password);
    if (res.success) {
      router.push(next);
    } else {
      setError(errorMessage(res.error, { default: 'Failed to log in' }));
      setIsSubmitting(false);
    }
  };

  const qs = next !== '/' ? `?next=${encodeURIComponent(next)}` : '';

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          Don't have an account?{' '}
          <Link href={`/register${qs}`} className="font-bold text-brand-500 hover:text-brand-600">
            Sign up for free
          </Link>
        </>
      }
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        {notice && <Alert tone="success">{notice}</Alert>}
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

        <div>
          <PasswordField
            label="Password"
            icon={Lock}
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <div className="mt-2 text-right">
            <Link
              href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`}
              className="inline-block py-1 text-sm font-bold text-brand-500 hover:text-brand-600"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <SubmitButton loading={isSubmitting}>
          Sign In <ArrowRight className="h-4 w-4" />
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}
