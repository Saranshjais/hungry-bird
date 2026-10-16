"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, BadgeIndianRupee, Clapperboard, ClipboardList, Crown, Flag, Inbox, KeyRound, LayoutDashboard, LogOut, MapPin,
  Menu, Receipt, Route, ShieldCheck, Smartphone, Star, Store, Tags, Ticket, Users, X,
} from "lucide-react";
import {
  adminFetch, canRead, clearSession, FORBIDDEN_EVENT, getAdmin, getToken, normalizePermissions, setSession, ROLE_LABELS,
} from "./lib/api";
import { AdminContext } from "./lib/hooks";
import { ToastProvider, useToast } from "./components/Toast";
import Modal, { ConfirmProvider } from "./components/Modal";
import { Field, NoAccess } from "./components/ui";

// `area` = the permission area a role must be able to READ to see the item / open the page.
const NAV = [
  { section: "Overview" },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: "unread_messages", area: "inbox" },
  { section: "Content" },
  { href: "/admin/submissions", label: "Submissions", icon: ClipboardList, badge: "pending_submissions", area: "submissions" },
  { href: "/admin/vendors", label: "Vendors", icon: Store, area: "vendors" },
  { href: "/admin/categories", label: "Categories", icon: Tags, area: "categories" },
  { href: "/admin/cities", label: "Cities", icon: MapPin, area: "cities" },
  { href: "/admin/trails", label: "Food Trails", icon: Route, area: "content" },
  { href: "/admin/ratings", label: "Reviews", icon: Star, area: "reviews" },
  { href: "/admin/reels", label: "Reels", icon: Clapperboard, badge: "pending_reels", area: "reels" },
  { section: "Community" },
  { href: "/admin/users", label: "Users", icon: Users, area: "users" },
  { href: "/admin/reports", label: "Reports", icon: Flag, badge: "pending_reports", area: "reports" },
  { section: "Premium" },
  { href: "/admin/premium", label: "Premium overview", icon: Crown, area: "premium", exact: true },
  { href: "/admin/premium/plans", label: "Plans", icon: Ticket, area: "premium" },
  { href: "/admin/premium/subscribers", label: "Subscribers", icon: BadgeIndianRupee, area: "premium" },
  { href: "/admin/premium/payments", label: "Payments", icon: Receipt, area: "premium" },
  { section: "System" },
  { href: "/admin/staff", label: "Staff Admins", icon: ShieldCheck, area: "staff" },
  { href: "/admin/app-settings", label: "App Settings", icon: Smartphone, area: "app" },
];

function isActive(pathname, item) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Read area needed for a panel URL (longest matching nav prefix), or null when open to every role. */
function areaForPath(pathname) {
  let best = null;
  NAV.forEach((item) => {
    if (!item.href || !item.area) return;
    if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
      if (!best || item.href.length > best.href.length) best = item;
    }
  });
  return best?.area || null;
}

/** Nav items (and their section headings) the role can open; empty sections are dropped. */
function visibleNav(admin) {
  const out = [];
  let pendingSection = null;
  NAV.forEach((item) => {
    if (item.section) {
      pendingSection = item;
      return;
    }
    if (!canRead(item.area, admin)) return;
    if (pendingSection) {
      out.push(pendingSection);
      pendingSection = null;
    }
    out.push(item);
  });
  return out;
}

export default function AdminAuthProvider({ children }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AdminShell>{children}</AdminShell>
      </ConfirmProvider>
    </ToastProvider>
  );
}

function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [counts, setCounts] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  // Auth gate: redirect between /admin/login and the panel based on the stored token.
  useEffect(() => {
    const token = getToken();
    if (!token && !isLoginPage) {
      router.replace("/admin/login");
      return;
    }
    if (token && isLoginPage) {
      router.replace("/admin");
      return;
    }
    setAdmin(getAdmin());
    setReady(true);
  }, [isLoginPage, router]);

  const refreshProfile = useCallback(() => {
    if (!getToken()) return Promise.resolve();
    return adminFetch("/me")
      .then((data) => {
        if (data?.admin) {
          // Keep the server's read/write areas with the profile so nav, pages and actions can be gated.
          const perms = normalizePermissions(data) || normalizePermissions(data.admin);
          const profile = { ...data.admin, _perms: perms || undefined };
          setSession(null, profile);
          setAdmin(profile);
        }
      })
      .catch(() => {});
  }, []);

  // Refresh the profile once per session load (role may have changed since login).
  useEffect(() => {
    if (ready && !isLoginPage) refreshProfile();
  }, [ready, isLoginPage, refreshProfile]);

  const refreshCounts = useCallback(() => {
    if (!getToken()) return;
    adminFetch("/counts")
      .then((data) => setCounts(data?.totals || {}))
      .catch(() => {});
  }, []);

  // Sidebar badges refresh on every route change; also close the mobile menu.
  useEffect(() => {
    setMenuOpen(false);
    if (ready && !isLoginPage) refreshCounts();
  }, [pathname, ready, isLoginPage, refreshCounts]);

  const ctx = useMemo(() => ({ admin, counts, refreshCounts, refreshProfile }), [admin, counts, refreshCounts, refreshProfile]);

  // Any 403 from the API (a role without access to that area) becomes a toast.
  const toast = useToast();
  useEffect(() => {
    const onForbidden = (e) => toast.error(e.detail?.message || "Your role does not allow this action.");
    window.addEventListener(FORBIDDEN_EVENT, onForbidden);
    return () => window.removeEventListener(FORBIDDEN_EVENT, onForbidden);
  }, [toast]);

  const logout = () => {
    clearSession();
    setAdmin(null);
    setCounts({});
    router.replace("/admin/login");
  };

  if (isLoginPage) {
    return <AdminContext.Provider value={ctx}>{children}</AdminContext.Provider>;
  }

  if (!ready) {
    return (
      <div className="admin-layout" style={{ alignItems: "center", justifyContent: "center" }}>
        <div className="admin-loading">
          <span className="admin-spinner" /> Loading secure area...
        </div>
      </div>
    );
  }

  const pageArea = areaForPath(pathname);
  const nav = visibleNav(admin);
  // Only count waiting work in areas this role can open.
  const totalAlerts = nav.reduce((sum, item) => sum + (item.badge ? counts[item.badge] || 0 : 0), 0);
  const name = admin?.name || admin?.username || "Admin";

  return (
    <AdminContext.Provider value={ctx}>
      <div className="admin-layout">
        {/* Mobile top bar */}
        <header className="admin-topbar">
          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="HungryBird" />
          {totalAlerts > 0 && (
            <span className="admin-nav-badge admin-topbar-badge" title="Items waiting for review">
              {totalAlerts}
            </span>
          )}
        </header>

        {menuOpen && <div className="admin-sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

        <aside className={`admin-sidebar ${menuOpen ? "open" : ""}`}>
          <div className="admin-sidebar-header">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="HungryBird Logo" />
            <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn admin-sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>

          <nav className="admin-nav">
            {nav.map((item) => {
              if (item.section) {
                return (
                  <div key={item.section} className="admin-nav-section">
                    {item.section}
                  </div>
                );
              }
              const Icon = item.icon;
              const badge = item.badge ? counts[item.badge] : 0;
              return (
                <Link key={item.href} href={item.href} className={`admin-nav-link ${isActive(pathname, item) ? "active" : ""}`}>
                  <Icon size={17} />
                  <span>{item.label}</span>
                  {badge > 0 && <span className="admin-nav-badge">{badge > 99 ? "99+" : badge}</span>}
                </Link>
              );
            })}
            <Link href="/" className="admin-nav-link back-to-site">
              <ArrowLeft size={15} /> Back to Site
            </Link>
          </nav>

          <div className="admin-sidebar-footer">
            <div className="admin-profile">
              <div className="admin-avatar">{name.charAt(0)}</div>
              <div className="min-w-0">
                <div className="admin-profile-name" title={admin?.email || ""}>
                  {name}
                </div>
                <div className="admin-profile-role">{ROLE_LABELS[admin?.role] || admin?.role || "Staff"}</div>
              </div>
            </div>
            <div className="admin-sidebar-actions">
              <button type="button" className="admin-btn" onClick={() => setPwOpen(true)}>
                <KeyRound size={14} /> Password
              </button>
              <button type="button" className="admin-btn" onClick={logout}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </aside>

        <main className="admin-main">{pageArea && !canRead(pageArea, admin) ? <NoAccess /> : children}</main>
      </div>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
    </AdminContext.Provider>
  );
}

function ChangePasswordModal({ open, onClose }) {
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const close = () => {
    setForm({ current: "", next: "", confirm: "" });
    setError("");
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.next.length < 8) return setError("New password must be at least 8 characters.");
    if (form.next !== form.confirm) return setError("The new passwords do not match.");
    setSaving(true);
    try {
      const data = await adminFetch("/me/password", {
        method: "PUT",
        body: { current_password: form.current, new_password: form.next },
      });
      toast.success(data.message || "Password updated");
      close();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      busy={saving}
      size="sm"
      title="Change password"
      subtitle="Use at least 8 characters."
      footer={
        <>
          <button type="button" className="admin-btn" onClick={close} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="admin-change-pw" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Update password"}
          </button>
        </>
      }
    >
      <form id="admin-change-pw" className="admin-form" onSubmit={submit}>
        <Field label="Current password" required>
          <input type="password" className="admin-input" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} />
        </Field>
        <Field label="New password" required>
          <input type="password" className="admin-input" autoComplete="new-password" required minLength={8} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} />
        </Field>
        <Field label="Confirm new password" required>
          <input type="password" className="admin-input" autoComplete="new-password" required minLength={8} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
        </Field>
        {error && <div className="admin-error !mb-0">{error}</div>}
      </form>
    </Modal>
  );
}
