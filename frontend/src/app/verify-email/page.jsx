"use client";

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { safeNext } from '../../lib/api';
import RequireAuth from '../../components/RequireAuth';
import EmailCodeVerifier from '../../components/EmailCodeVerifier';
import { AuthLayout, PageSpinner } from '../../components/ui/forms';

function VerifyEmail({ user }) {
  const params = useSearchParams();
  const router = useRouter();
  const next = safeNext(params.get('next'), '/account');
  const [haveCode, setHaveCode] = useState(params.get('sent') === '1');
  const [done, setDone] = useState(false);

  if (done || user.email_verified !== false) {
    return (
      <AuthLayout title="Email verified" subtitle={user.email}>
        <div className="text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto">
            <CheckCircle2 size={32} className="text-emerald-500" />
          </div>
          <p className="text-sm text-stone-600">Thanks — your email address is confirmed.</p>
          <button type="button" onClick={() => router.push(next)} className="btn-orange w-full">
            Continue <ArrowRight size={16} />
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Confirm your email address to keep your account secure and to buy Premium."
      below={
        !haveCode && (
          <button type="button" onClick={() => setHaveCode(true)} className="font-bold text-brand-500 hover:text-brand-600 py-2">
            I already have a code
          </button>
        )
      }
    >
      <EmailCodeVerifier email={user.email} codeSent={haveCode} onSent={() => setHaveCode(true)} onVerified={() => setDone(true)} />
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RequireAuth>{(user) => <VerifyEmail user={user} />}</RequireAuth>
    </Suspense>
  );
}
