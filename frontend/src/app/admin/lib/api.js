// Small client for the HungryBird admin API.
//   adminFetch("/vendors")              -> GET  {API_URL}/api/admin/vendors
//   adminFetch("/api/contact", {...})   -> paths starting with /api are used as-is
// Throws an Error carrying the backend's `error` message on non-2xx responses.
// A 401 clears the stored session and sends the browser to /admin/login.

// Same rule as the public site: NEXT_PUBLIC_API_URL (or the old NEXT_PUBLIC_BACKEND_URL alias); otherwise the
// local Flask server in development and the production API in production builds. No trailing slash.
const PRODUCTION_API_URL = "https://hungry-bird-jye4.onrender.com";
const DEVELOPMENT_API_URL = "http://127.0.0.1:5000";
export const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production" ? PRODUCTION_API_URL : DEVELOPMENT_API_URL)
).replace(/\/+$/, "");

const TOKEN_KEY = "admin_token";
const PROFILE_KEY = "admin_profile";

// Fallback write areas per role (mirrors ROLE_PERMISSIONS in backend/app/routes/admin_api.py).
// The real list comes from GET /api/admin/me `permissions`; these are only used until it loads
// or when an older backend sends no permissions.
export const ROLE_PERMISSIONS = {
  super_admin: ["*"],
  moderator: ["submissions", "vendors", "reviews", "reports", "reels", "categories", "users", "inbox"],
  support: ["inbox", "reports"],
  city_manager: ["cities", "vendors", "submissions", "content"],
  app_manager: ["app", "categories", "content"],
};

// Fallback READ areas per role (mirrors ROLE_READ_PERMISSIONS in admin_api.py), used only until
// GET /me answers. "premium" (plans, subscribers, payments) and "staff" are Super Admin only.
export const ROLE_READ_DEFAULTS = {
  super_admin: ["*"],
  moderator: ["dashboard", "submissions", "vendors", "cities", "categories", "reviews", "users", "inbox", "reports", "reels", "content"],
  support: ["dashboard", "inbox", "reports", "users", "vendors", "cities", "categories", "content"],
  city_manager: ["dashboard", "submissions", "vendors", "cities", "categories", "content"],
  app_manager: ["dashboard", "app", "categories", "content", "cities", "vendors"],
};

/** Every permission area the panel knows about (same names as the backend's AREAS). */
export const AREAS = [
  "dashboard", "submissions", "vendors", "cities", "categories", "reviews", "users", "inbox",
  "reports", "reels", "app", "content", "premium", "staff",
];

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

// ---------- permissions ----------

const READ_WORDS = ["read", "view", "r"];
const WRITE_WORDS = ["write", "edit", "manage", "w", "rw", "read_write", "readwrite"];

function asList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return value.split(/[\s,]+/).filter(Boolean);
  return [];
}

/**
 * Turn GET /api/admin/me into { read: [], write: [], personal }.
 * The backend sends `permissions` (areas the role may WRITE, ["*"] for super_admin), plus
 * `read_permissions`, `write_permissions`, `areas: {area: {read, write}}` and `can_see_personal_data`.
 * `areas` wins when present. Older shapes are still understood: ["vendors:read"], { read, write },
 * { vendors: "write" }. Write access always implies read access. Returns null when nothing usable was sent.
 */
export function normalizePermissions(source) {
  if (!source || typeof source !== "object") return null;
  const raw = source.permissions;
  const read = new Set();
  const write = new Set();
  let sawRead = false;
  let sawAny = false;
  const personal = typeof source.can_see_personal_data === "boolean" ? source.can_see_personal_data : undefined;

  // Authoritative per-area map from the backend.
  if (source.areas && typeof source.areas === "object" && !Array.isArray(source.areas)) {
    Object.entries(source.areas).forEach(([area, level]) => {
      if (level?.read) read.add(area);
      if (level?.write) write.add(area);
    });
    asList(raw).forEach((a) => a === "*" && write.add("*"));
    write.forEach((a) => read.add(a));
    return { read: [...read], write: [...write], hasRead: true, personal };
  }

  const addRead = (area) => {
    read.add(area);
    sawRead = true;
  };

  const addEntry = (entry) => {
    sawAny = true;
    const parts = String(entry).trim().toLowerCase().split(/[:.]/);
    if (parts.length === 1) {
      write.add(parts[0]);
      return;
    }
    const [a, b] = parts;
    if (READ_WORDS.includes(a)) addRead(b);
    else if (WRITE_WORDS.includes(a)) write.add(b);
    else if (READ_WORDS.includes(b)) addRead(a);
    else write.add(a);
  };

  if (Array.isArray(raw)) {
    raw.forEach(addEntry);
  } else if (raw && typeof raw === "object") {
    const readList = raw.read ?? raw.reads ?? raw.read_areas ?? raw.view;
    const writeList = raw.write ?? raw.writes ?? raw.write_areas ?? raw.edit ?? raw.manage;
    if (readList !== undefined || writeList !== undefined) {
      asList(readList).forEach((a) => read.add(a));
      asList(writeList).forEach((a) => write.add(a));
      sawRead = readList !== undefined;
      sawAny = true;
    } else {
      Object.entries(raw).forEach(([area, level]) => {
        sawAny = true;
        let levels = [];
        if (Array.isArray(level)) levels = level.map((l) => String(l).toLowerCase());
        else if (level && typeof level === "object") levels = Object.keys(level).filter((k) => level[k]).map((k) => k.toLowerCase());
        else if (level === true) levels = ["write"];
        else if (level) levels = [String(level).toLowerCase()];
        const isWrite = levels.some((l) => WRITE_WORDS.includes(l));
        const isRead = levels.some((l) => READ_WORDS.includes(l));
        if (isWrite || (levels.length && !isRead)) write.add(area);
        if (isRead) addRead(area);
        else if (levels.length === 0) sawRead = true; // { area: false } = explicitly no access
      });
    }
  }

  const topRead = source.read_permissions ?? source.read_areas ?? source.permissions_read;
  if (topRead !== undefined) {
    asList(topRead).forEach((a) => read.add(a));
    sawRead = true;
    sawAny = true;
  }
  const topWrite = source.write_permissions ?? source.write_areas;
  if (topWrite !== undefined) {
    asList(topWrite).forEach((a) => write.add(a));
    sawAny = true;
  }
  if (!sawAny) return null;
  write.forEach((a) => read.add(a));
  return { read: [...read], write: [...write], hasRead: sawRead, personal };
}

/** Effective { read, write } area lists for a staff profile (server data first, role defaults otherwise). */
export function permissionsFor(admin) {
  if (!admin) return { read: [], write: [] };
  const fromServer = admin._perms || normalizePermissions(admin);
  const role = admin.role;
  const write = fromServer ? fromServer.write : ROLE_PERMISSIONS[role] || [];
  let read;
  if (fromServer && fromServer.hasRead) read = fromServer.read;
  else read = [...new Set([...(ROLE_READ_DEFAULTS[role] || []), ...write])];
  return { read, write };
}

/** Can the logged-in admin change things in `area`? (cities, vendors, app, premium, staff, ...) */
export function can(area, admin = getAdmin()) {
  if (!admin || admin.is_active === false) return false;
  const { write } = permissionsFor(admin);
  if (write.includes("*")) return true;
  if (area === "staff") return admin.role === "super_admin" || write.includes("staff");
  return write.includes(area);
}

/** Can the logged-in admin open/see `area`? Pages and nav items the role can't read are hidden. */
export function canRead(area, admin = getAdmin()) {
  if (!area) return true;
  if (!admin || admin.is_active === false) return false;
  const { read, write } = permissionsFor(admin);
  if (read.includes("*") || write.includes("*")) return true;
  if (area === "staff") return admin.role === "super_admin" || read.includes("staff");
  return read.includes(area) || write.includes(area);
}

/** Reviewer emails/IPs and submitter emails are only sent to roles that may read users. */
export function canSeePersonalData(admin = getAdmin()) {
  const p = admin?._perms?.personal;
  return typeof p === "boolean" ? p : canRead("users", admin);
}

/** Only a Super Admin may permanently delete app users (AUDIT-security M2). */
export function isSuperAdmin(admin = getAdmin()) {
  return !!admin && admin.is_active !== false && admin.role === "super_admin";
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

const NOTICE_KEY = "admin_login_notice";
let redirecting = false;

/** A 401 (expired/old token, revoked access): drop the session and go to the login page once. */
function handleUnauthorized(message) {
  clearSession();
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin/login") || redirecting) return;
  redirecting = true;
  try {
    storage()?.setItem(NOTICE_KEY, message || "Your session has ended. Please sign in again.");
  } catch {
    /* storage unavailable */
  }
  window.location.replace("/admin/login");
}

/** One-time message for the login page (e.g. "Session expired"), cleared once read. */
export function takeLoginNotice() {
  const s = storage();
  const msg = s?.getItem(NOTICE_KEY) || "";
  if (msg) s.removeItem(NOTICE_KEY);
  return msg;
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
    if (res.status === 401 && auth && !path.endsWith("/login")) {
      const why = String(data?.error || "");
      handleUnauthorized(
        /revoked|disabled/i.test(why) ? "Your admin access has been revoked or disabled."
        : /expired/i.test(why) ? "Your session expired. Please sign in again."
        : "Your session has ended. Please sign in again."
      );
    }
    const fallback =
      res.status === 404 ? "Not found - it may have been deleted already."
      : res.status === 403 ? (method === "GET" ? "You don't have access to this." : "Your role does not allow this action.")
      : res.status === 429 ? "Too many requests - please wait a moment and try again."
      : res.status === 503 ? "This service isn't available on the server right now."
      : `Request failed (${res.status})`;
    const error = new Error(data?.error || data?.message || fallback);
    error.status = res.status;
    error.code = data?.code;
    error.data = data;
    // 403 from any call: AdminShell shows a toast (identical toasts are de-duplicated).
    if (res.status === 403 && auth && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(FORBIDDEN_EVENT, { detail: { message: error.message, path, method } }));
    }
    throw error;
  }
  return data ?? {};
}

/** Fired on window for every 403 response; AdminShell turns it into a toast. */
export const FORBIDDEN_EVENT = "hb-admin-forbidden";

/** true for an Error thrown by adminFetch because the role lacks access. */
export function isForbidden(err) {
  return !!err && err.status === 403;
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
    let message = res.status === 403 ? "Your role does not allow this download." : `Download failed (${res.status})`;
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

/** Integer paise -> "₹49" / "₹49.50" (Indian digit grouping). */
export function formatPaise(paise, fallback = "—") {
  if (paise === null || paise === undefined || paise === "") return fallback;
  const n = Number(paise);
  if (!Number.isFinite(n)) return fallback;
  const rupees = n / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(rupees) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** Rupees typed by staff ("49", "49.5") -> integer paise, or null when empty/invalid. */
export function rupeesToPaise(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(String(value).replace(/[₹,\s]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/** Integer paise -> rupees string for an <input> ("4900" -> "49", "4950" -> "49.5"). */
export function paiseToRupeesInput(paise) {
  if (paise === null || paise === undefined || paise === "") return "";
  const n = Number(paise);
  return Number.isFinite(n) ? String(n / 100) : "";
}

/** Loose URL check for settings fields: empty is fine, otherwise http(s)://host.tld/... */
export function isValidUrl(value) {
  if (!value) return true;
  try {
    const u = new URL(String(value).trim());
    return (u.protocol === "https:" || u.protocol === "http:") && /\./.test(u.hostname);
  } catch {
    return false;
  }
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
