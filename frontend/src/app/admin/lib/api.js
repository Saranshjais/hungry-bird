// Small client for the HungryBird admin API.
//   adminFetch("/vendors")              -> GET  {API_URL}/api/admin/vendors
//   adminFetch("/api/contact", {...})   -> paths starting with /api are used as-is
// Throws an Error carrying the backend's `error` message on non-2xx responses.
// A 401 clears the stored session and sends the browser to /admin/login.

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

const TOKEN_KEY = "admin_token";
const PROFILE_KEY = "admin_profile";

// Mirrors ROLE_PERMISSIONS in backend/app/routes/admin_api.py.
// Every active staff role can READ everything; this only gates writes.
export const ROLE_PERMISSIONS = {
  super_admin: ["*"],
  moderator: ["submissions", "vendors", "reviews", "reports", "reels", "categories", "users", "inbox"],
  support: ["inbox", "reports"],
  city_manager: ["cities", "vendors", "submissions"],
  app_manager: ["app", "categories"],
};

export const ROLE_LABELS = {
  super_admin: "Super Admin",
  moderator: "Moderator",
  support: "Support",
  city_manager: "City Manager",
  app_manager: "App Manager",
};

function storage() {
  try {
    return typeof window !== "undefined" ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

export function getToken() {
  return storage()?.getItem(TOKEN_KEY) || null;
}

export function getAdmin() {
  const raw = storage()?.getItem(PROFILE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSession(token, admin) {
  const s = storage();
  if (!s) return;
  if (token) s.setItem(TOKEN_KEY, token);
  if (admin) s.setItem(PROFILE_KEY, JSON.stringify(admin));
}

export function clearSession() {
  const s = storage();
  if (!s) return;
  s.removeItem(TOKEN_KEY);
  s.removeItem(PROFILE_KEY);
}

/** Can the logged-in admin change things in `area`? (cities, vendors, app, staff, ...) */
export function can(area, admin = getAdmin()) {
  if (!admin || admin.is_active === false) return false;
  if (area === "staff") return admin.role === "super_admin";
  const perms = ROLE_PERMISSIONS[admin.role] || [];
  return perms.includes("*") || perms.includes(area);
}

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.startsWith("/api/") ? `${API_URL}${p}` : `${API_URL}/api/admin${p}`;
}

/** Build "?a=1&b=2" from an object, skipping empty values. */
export function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function handleUnauthorized() {
  clearSession();
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
    window.location.replace("/admin/login");
  }
}

export async function adminFetch(path, { method = "GET", body, isForm = false, signal, auth = true } = {}) {
  const headers = {};
  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    if (isForm) {
      payload = body; // FormData: the browser sets the multipart boundary
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  let res;
  try {
    res = await fetch(buildUrl(path), { method, headers, body: payload, signal });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new Error("Cannot reach the HungryBird API. Please check that the backend is running.");
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

  if (!res.ok) {
    if (res.status === 401 && auth && !path.endsWith("/login")) handleUnauthorized();
    const fallback =
      res.status === 404 ? "Not found - it may have been deleted already."
      : res.status === 403 ? "Your role does not allow this action."
      : `Request failed (${res.status})`;
    const error = new Error(data?.error || data?.message || fallback);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data ?? {};
}

/** Fetch an authenticated file (e.g. CSV export) and trigger a browser download. */
export async function downloadFile(path, filename) {
  let res;
  try {
    res = await fetch(buildUrl(path), { headers: { Authorization: `Bearer ${getToken() || ""}` } });
  } catch {
    throw new Error("Cannot reach the HungryBird API. Please check that the backend is running.");
  }
  if (!res.ok) {
    if (res.status === 401) handleUnauthorized();
    let message = `Download failed (${res.status})`;
    try {
      message = (await res.json()).error || message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  const blob = await res.blob();
  saveBlob(blob, filename);
}

/** Save a Blob as a file via a temporary object URL. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- formatting helpers ----------

/** Backend timestamps are naive UTC ISO strings; treat them as UTC. */
export function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value);
  const hasZone = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(s);
  const d = new Date(hasZone || !s.includes("T") ? s : `${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, fallback = "—") {
  const d = parseDate(value);
  return d ? d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : fallback;
}

export function formatDateTime(value, fallback = "—") {
  const d = parseDate(value);
  if (!d) return fallback;
  return `${d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}, ${d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return "";
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

/** Turn "" into null and numeric strings into numbers for optional numeric fields. */
export function toNumberOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : value;
}

export function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
