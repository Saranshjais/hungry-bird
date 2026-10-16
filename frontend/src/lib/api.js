// One client for the public HungryBird API, used by every page and component outside /admin.
//
//   api('/api/cities')                               -> GET, JSON
//   api('/api/auth/login', { method: 'POST', body }) -> JSON body, Bearer token when logged in
//
// Errors are thrown as ApiError { message, status, code, data }. Use errorMessage(err) to turn any
// error (including the contract's machine codes) into a sentence that can be shown to people.

const PROD_API = 'https://hungry-bird-jye4.onrender.com';
const DEV_API = 'http://127.0.0.1:5000';

// NEXT_PUBLIC_BACKEND_URL is the old name of the same setting; both are inlined at build time.
const CONFIGURED_API = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || '';

export const API_URL = (CONFIGURED_API || (process.env.NODE_ENV === 'production' ? PROD_API : DEV_API)).replace(/\/+$/, '');

// Public address of this website (SEO: canonical URLs, sitemap, Open Graph).
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://hungry-bird-gamma.vercel.app').replace(/\/+$/, '');

export const TOKEN_KEY = 'hb_token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked (private mode): the session lasts for this page only */
  }
}

// Fired when the server rejects our stored token (expired, revoked by a password reset, or issued
// before a deploy that changed the token format). AuthContext listens and logs the user out locally.
export const SESSION_EXPIRED_EVENT = 'hb:session-expired';

export class ApiError extends Error {
  constructor(message, { status = 0, code = null, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

/**
 * Call the API.
 * @param {string} path  '/api/...' (or an absolute URL)
 * @param {object} opts  method, body (JSON-encoded unless FormData), token (overrides the stored one),
 *                       auth (false = never send a token), timeout (ms), signal, headers
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, token, auth = true, timeout = 20000, signal, headers = {} } = opts;
  const url = /^https?:\/\//.test(path) ? path : `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;

  const h = { Accept: 'application/json', ...headers };
  const bearer = token !== undefined ? token : auth ? getToken() : null;
  if (bearer) h.Authorization = `Bearer ${bearer}`;

  let payload;
  if (body !== undefined && body !== null) {
    if (typeof FormData !== 'undefined' && body instanceof FormData) {
      payload = body;
    } else {
      h['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
  }

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener('abort', onAbort, { once: true });
  }
  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  let res;
  try {
    res = await fetch(url, { method, headers: h, body: payload, signal: controller.signal, cache: 'no-store' });
  } catch (e) {
    if (signal?.aborted) throw new ApiError('Request cancelled', { code: 'ABORTED' });
    const timedOut = controller.signal.aborted;
    throw new ApiError(
      timedOut ? 'The server is taking too long to respond.' : 'We could not reach the server.',
      { code: timedOut ? 'TIMEOUT' : 'NETWORK' }
    );
  } finally {
    if (timer) clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (res.status === 401 && bearer) {
    // Only drop the token we actually sent (a newer one may have been stored meanwhile).
    if (getToken() === bearer) setToken(null);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { path } }));
  }

  if (!res.ok || (data && data.success === false)) {
    const fallback = res.status === 401 ? 'Please log in to continue.' : res.status >= 500 ? 'Something went wrong on our side.' : 'Request failed.';
    throw new ApiError((data && (data.error || data.message)) || fallback, {
      status: res.status,
      code: (data && data.code) || null,
      data,
    });
  }
  return data ?? {};
}

// Friendly sentences for the contract's machine codes (CONTRACT "Conventions").
const CODE_MESSAGES = {
  RATE_LIMITED: 'Too many attempts. Please wait a minute and try again.',
  INVALID_CODE: "That code isn't right. Check the latest email from us and try again.",
  CODE_EXPIRED: 'That code has expired. Ask for a new one below.',
  TOO_MANY_ATTEMPTS: 'Too many wrong tries for this code. Ask for a new code.',
  WEAK_PASSWORD: 'Use at least 8 characters, with at least one letter and one number.',
  EMAIL_NOT_CONFIGURED: "We can't send emails right now. Please try again later, or contact support.",
  EMAIL_SEND_FAILED: "We couldn't send the email just now. Please try again in a moment.",
  EMAIL_NOT_VERIFIED: 'Please verify your email address first.',
  INVALID_PASSWORD: 'Your current password is incorrect.',
  PAYMENTS_NOT_CONFIGURED: "Payments aren't available right now. Please try again later.",
  PAYMENT_PROVIDER_ERROR: 'The payment service is having trouble. Please try again in a moment.',
  PREMIUM_DISABLED: "Premium isn't available right now.",
  PREMIUM_REQUIRED: 'This is a Premium stall. Unlock HungryBird Premium to rate it.',
  PAYMENT_VERIFICATION_FAILED: "We couldn't confirm this payment. If money was taken, contact support with your payment ID.",
  NETWORK: 'We could not reach the server. Check your connection and try again.',
  TIMEOUT: 'The server is taking too long to respond. Please try again in a moment.',
};

// For these the server's own sentence is more specific (e.g. "Please wait 42 seconds…",
// "You have already rated this place today."), so it wins when present.
const PREFER_SERVER_MESSAGE = new Set(['RATE_LIMITED']);

export function errorMessage(err, overrides = {}) {
  if (!err) return '';
  const code = err.code || (err.status === 429 ? 'RATE_LIMITED' : null);
  if (code && overrides[code]) return overrides[code];
  if (code && PREFER_SERVER_MESSAGE.has(code) && err.message && err.status) return err.message;
  if (code === 'INVALID_CODE' && Number.isFinite(Number(err.data?.attempts_left)) && err.data.attempts_left !== null) {
    const n = Number(err.data.attempts_left);
    return n > 0
      ? `${CODE_MESSAGES.INVALID_CODE} ${n} ${n === 1 ? 'try' : 'tries'} left.`
      : CODE_MESSAGES.TOO_MANY_ATTEMPTS;
  }
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (overrides.default && (!err.message || err.status >= 500 || !err.status)) return overrides.default;
  return err.message || overrides.default || 'Something went wrong. Please try again.';
}

// Only allow same-site relative paths as post-login destinations (no open redirects).
export function safeNext(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return fallback;
  return value;
}

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { id: 'letter', label: 'At least one letter', test: (p) => /[A-Za-z]/.test(p) },
  { id: 'digit', label: 'At least one number', test: (p) => /\d/.test(p) },
];

export const isStrongPassword = (p) => PASSWORD_RULES.every((r) => r.test(p || ''));
