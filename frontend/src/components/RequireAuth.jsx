"use client";

// Renders children only for a logged-in user. Logged-out visitors go to /login?next=<this page>.
// If the token could not be checked because the server is unreachable, offers a retry instead of
// logging the user out.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { PageSpinner } from './ui/forms';

export function loginHref(next) {
  return `/login?next=${encodeURIComponent(next || '/')}`;
}

export function currentPath() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname + window.location.search;
}

export default function RequireAuth({ children }) {
  const { user, token, loading, authError, refreshUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token && !user) router.replace(loginHref(currentPath()));
  }, [loading, token, user, router]);

  if (user) return typeof children === 'function' ? children(user) : children;

  if (!loading && token && authError === 'network') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-stone-50 px-4 pt-24 text-center">
        <WifiOff size={36} className="text-stone-400" />
        <h1 className="text-2xl font-extrabold text-stone-900 leading-tight">We can't reach HungryBird right now</h1>
        <p className="text-stone-500 text-sm max-w-sm">Your session is safe. Check your connection and try again.</p>
        <button type="button" onClick={refreshUser} className="btn-primary">
          Try again
        </button>
      </div>
    );
  }

  return <PageSpinner />;
}
