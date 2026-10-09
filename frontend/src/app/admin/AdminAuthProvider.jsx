"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Clapperboard, ClipboardList, Flag, Inbox, KeyRound, LayoutDashboard, LogOut, MapPin,
  Menu, ShieldCheck, Smartphone, Star, Store, Tags, Users, X,
} from "lucide-react";
import { adminFetch, clearSession, getAdmin, getToken, setSession, ROLE_LABELS } from "./lib/api";
import { AdminContext } from "./lib/hooks";
import { ToastProvider, useToast } from "./components/Toast";
import Modal, { ConfirmProvider } from "./components/Modal";
import { Field } from "./components/ui";

const NAV = [
  { section: "Overview" },
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/inbox", label: "Inbox", icon: Inbox, badge: "unread_messages" },
  { section: "Content" },
  { href: "/admin/submissions", label: "Submissions", icon: ClipboardList, badge: "pending_submissions" },
  { href: "/admin/vendors", label: "Vendors", icon: Store },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/ratings", label: "Reviews", icon: Star },
  { href: "/admin/reels", label: "Reels", icon: Clapperboard, badge: "pending_reels" },
  { section: "Community" },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: Flag, badge: "pending_reports" },
  { section: "System" },
  { href: "/admin/staff", label: "Staff Admins", icon: ShieldCheck },
  { href: "/admin/app-settings", label: "App Settings", icon: Smartphone },
];

function isActive(pathname, href) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
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
          setSession(null, data.admin);
          setAdmin(data.admin);
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

  const totalAlerts = (counts.pending_submissions || 0) + (counts.pending_reports || 0) + (counts.unread_messages || 0) + (counts.pending_reels || 0);
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
            {NAV.map((item) => {
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
                <Link key={item.href} href={item.href} className={`admin-nav-link ${isActive(pathname, item.href) ? "active" : ""}`}>
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

        <main className="admin-main">{children}</main>
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
