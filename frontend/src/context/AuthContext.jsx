"use client";

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getToken, setToken as storeToken, SESSION_EXPIRED_EVENT } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setTokenState] = useState(null);
  const [loading, setLoading] = useState(true);
  // 'network' when the token could not be checked because the server was unreachable
  const [authError, setAuthError] = useState(null);
  const router = useRouter();

  const setToken = useCallback((t) => {
    storeToken(t);
    setTokenState(t || null);
  }, []);

  const clearSession = useCallback(() => {
    storeToken(null);
    setTokenState(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = getToken();
    if (!t) {
      setUser(null);
      setTokenState(null);
      setLoading(false);
      return null;
    }
    setTokenState(t);
    try {
      const data = await api('/api/auth/me', { token: t, timeout: 30000 });
      setUser(data.user || null);
      setAuthError(null);
      return data.user || null;
    } catch (err) {
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        // expired, revoked (password reset) or suspended: drop the session
        clearSession();
        setAuthError(null);
      } else {
        // Server asleep / offline: keep the token so the user stays logged in once it is back.
        setAuthError('network');
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // Any API call answered 401 for our token: the session is over (no retry loop — the token is gone).
  useEffect(() => {
    const onExpired = () => {
      if (getToken()) return; // a fresh token was stored after the failing call
      setTokenState(null);
      setUser(null);
      setAuthError(null);
      setLoading(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  // Keep tabs in sync (log out / log in elsewhere).
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'hb_token') refreshUser();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refreshUser]);

  const startSession = useCallback(
    (data) => {
      if (data && data.token) setToken(data.token);
      if (data && data.user) setUser(data.user);
      setAuthError(null);
    },
    [setToken]
  );

  const login = async (email, password) => {
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password }, auth: false });
      startSession(data);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const register = async (name, email, password) => {
    try {
      const data = await api('/api/auth/register', { method: 'POST', body: { name, email, password }, auth: false });
      startSession(data);
      return { success: true, user: data.user, verificationSent: data.verification_sent !== false };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  const logout = (redirect = '/') => {
    clearSession();
    if (redirect) router.push(redirect);
  };

  const updateUser = useCallback((next) => {
    if (next) setUser((u) => ({ ...(u || {}), ...next }));
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, loading, authError, login, register, logout, refreshUser, updateUser, setToken, clearSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Contract §1: these fields may be missing on an older backend — treat "missing" as "not blocking".
export const isEmailUnverified = (user) => !!user && user.email_verified === false;
