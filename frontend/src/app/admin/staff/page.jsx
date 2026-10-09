"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Dices, KeyRound, Pencil, Power, ShieldAlert, Trash2, UserPlus } from "lucide-react";
import { adminFetch, formatDate, formatDateTime, ROLE_LABELS, timeAgo } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Field, Loading, PageHeader, ReadOnlyNote, SearchInput } from "../components/ui";

// Full class strings (not interpolated) so Tailwind keeps them.
const ROLES = [
  {
    value: "super_admin",
    desc: "Full unrestricted access, including staff.",
    on: "border-indigo-500 bg-indigo-50", off: "border-slate-200 bg-white hover:border-indigo-200",
    dot: "border-indigo-500 bg-indigo-500", title: "text-indigo-900", text: "text-indigo-700/70",
    pill: "bg-indigo-50 text-indigo-700 border-indigo-200", avatar: "bg-indigo-100 text-indigo-700",
  },
  {
    value: "moderator",
    desc: "Vendors, submissions, reviews, reports, reels, users & inbox.",
    on: "border-brand-500 bg-brand-50", off: "border-slate-200 bg-white hover:border-brand-200",
    dot: "border-brand-500 bg-brand-500", title: "text-brand-700", text: "text-brand-700/70",
    pill: "bg-brand-50 text-brand-700 border-brand-200", avatar: "bg-brand-100 text-brand-700",
  },
  {
    value: "support",
    desc: "Inbox & reports. Read-only elsewhere.",
    on: "border-emerald-500 bg-emerald-50", off: "border-slate-200 bg-white hover:border-emerald-200",
    dot: "border-emerald-500 bg-emerald-500", title: "text-emerald-900", text: "text-emerald-700/70",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200", avatar: "bg-emerald-100 text-emerald-700",
  },
  {
    value: "city_manager",
    desc: "Cities, vendors & submissions.",
    on: "border-blue-500 bg-blue-50", off: "border-slate-200 bg-white hover:border-blue-200",
    dot: "border-blue-500 bg-blue-500", title: "text-blue-900", text: "text-blue-700/70",
    pill: "bg-blue-50 text-blue-700 border-blue-200", avatar: "bg-blue-100 text-blue-700",
  },
  {
    value: "app_manager",
    desc: "Banners, notifications, app settings & categories.",
    on: "border-purple-500 bg-purple-50", off: "border-slate-200 bg-white hover:border-purple-200",
    dot: "border-purple-500 bg-purple-500", title: "text-purple-900", text: "text-purple-700/70",
    pill: "bg-purple-50 text-purple-700 border-purple-200", avatar: "bg-purple-100 text-purple-700",
  },
];
const ROLE_BY_VALUE = Object.fromEntries(ROLES.map((r) => [r.value, r]));

function generatePassword(length = 14) {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  const symbols = "!@#$%&*?";
  const all = lower + upper + digits + symbols;
  const rand = (n) => {
    const buf = new Uint32Array(1);
    window.crypto.getRandomValues(buf);
    return buf[0] % n;
  };
  const chars = [lower, upper, digits, symbols].map((set) => set[rand(set.length)]);
  while (chars.length < length) chars.push(all[rand(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rand(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function RoleCards({ value, onChange, name }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {ROLES.map((r) => {
        const selected = value === r.value;
        return (
          <label key={r.value} className={`cursor-pointer p-3 rounded-lg border-2 transition-all flex flex-col ${selected ? r.on : r.off}`}>
            <div className="flex items-center gap-2 mb-1">
              <input type="radio" name={name} value={r.value} checked={selected} onChange={() => onChange(r.value)} className="hidden" />
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${selected ? r.dot : "border-slate-300"}`}>
                {selected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <span className={`font-bold text-sm truncate ${r.title}`}>{ROLE_LABELS[r.value]}</span>
            </div>
            <p className={`text-xs ml-6 leading-tight m-0 ${r.text}`}>{r.desc}</p>
          </label>
        );
      })}
    </div>
  );
}

function PasswordField({ value, onChange, label = "Initial password", hint = "At least 8 characters. Share it securely - they can change it after logging in." }) {
  const toast = useToast();
  return (
    <Field label={label} required hint={hint}>
      <div className="flex gap-2">
        <input className="admin-input !font-mono" type="text" autoComplete="new-password" required minLength={8} value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" className="admin-btn" onClick={() => onChange(generatePassword())} title="Generate a strong password">
          <Dices size={15} /> Generate
        </button>
        <button
          type="button"
          className="admin-btn admin-icon-btn"
          title="Copy"
          disabled={!value}
          onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success("Password copied"), () => toast.error("Could not copy"))}
        >
          <Copy size={15} />
        </button>
      </div>
    </Field>
  );
}

export default function AdminStaff() {
  const toast = useToast();
  const confirm = useConfirm();
  const { admin: me, refreshProfile } = useAdmin();
  const canManage = useCan("staff");

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [creating, setCreating] = useState(null);
  const [editing, setEditing] = useState(null);
  const [resetting, setResetting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await adminFetch("/staff");
      setStaff(data.staff || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((m) => {
      const matches = !q || [m.name, m.email, m.username].filter(Boolean).some((v) => v.toLowerCase().includes(q));
      return matches && (roleFilter === "all" || m.role === roleFilter);
    });
  }, [staff, search, roleFilter]);

  const submitCreate = async (e) => {
    e.preventDefault();
    if (creating.password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    try {
      const res = await adminFetch("/staff", {
        method: "POST",
        body: { name: creating.name.trim(), email: creating.email.trim(), username: creating.username.trim() || null, role: creating.role, password: creating.password },
      });
      toast.success(res.message || "Admin account created");
      setCreating(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await adminFetch(`/staff/${editing.id}`, { method: "PUT", body: { name: editing.name.trim(), role: editing.role } });
      toast.success(res.message || "Staff updated");
      if (editing.isMe) refreshProfile();
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    if (resetting.password.length < 8) return toast.error("Password must be at least 8 characters.");
    setBusy(true);
    try {
      await adminFetch(`/staff/${resetting.id}`, { method: "PUT", body: { password: resetting.password } });
      toast.success(`Password reset for ${resetting.name}`);
      setResetting(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (m) => {
    const next = !m.is_active;
    if (!next) {
      const ok = await confirm({
        title: `Deactivate ${m.name}?`,
        message: "They are signed out immediately and can't log in until reactivated. Their account is kept.",
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    try {
      const res = await adminFetch(`/staff/${m.id}`, { method: "PUT", body: { is_active: next } });
      setStaff((list) => list.map((x) => (x.id === m.id ? res.staff || { ...x, is_active: next } : x)));
      toast.success(next ? `${m.name} reactivated` : `${m.name} deactivated`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const revoke = async (m) => {
    const ok = await confirm({
      title: `Revoke access for ${m.name}?`,
      message: "Their admin account is deleted permanently. You can create a new one later if needed.",
      confirmLabel: "Revoke access",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/staff/${m.id}`, { method: "DELETE" });
      toast.success(res.message || "Access revoked");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div>
      <PageHeader title="Staff Admins" subtitle="Manage who can access this panel and what each person can change.">
        {canManage && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={() => setCreating({ name: "", email: "", username: "", role: "moderator", password: generatePassword() })}>
            <UserPlus size={15} /> Add admin
          </button>
        )}
      </PageHeader>

      <ReadOnlyNote area="staff">Only a Super Admin can add, edit or remove staff. You can view the team list.</ReadOnlyNote>

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search staff by name, email or username..." />
        <select className="admin-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
          <option value="all">All roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {ROLE_LABELS[r.value]}
            </option>
          ))}
        </select>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Loading label="Loading staff..." />
      ) : filtered.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={ShieldAlert} title={staff.length ? "No staff match your filters" : "No staff found"} />
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Staff member</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Added</th>
                {canManage && <th className="actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const role = ROLE_BY_VALUE[m.role] || ROLES[1];
                const isMe = me && m.id === me.id;
                return (
                  <tr key={m.id} style={{ opacity: m.is_active ? 1 : 0.6 }}>
                    <td style={{ minWidth: 220 }}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${role.avatar}`}>{(m.name || "?").charAt(0).toUpperCase()}</div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            {m.name}
                            {isMe && <span className="admin-badge brand">You</span>}
                          </div>
                          <div className="text-xs text-slate-500">{m.email}</div>
                          {m.username && <div className="text-[11px] text-slate-400">@{m.username}</div>}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border whitespace-nowrap ${role.pill}`}>{ROLE_LABELS[m.role] || m.role}</span>
                    </td>
                    <td>
                      <span className={`admin-badge ${m.is_active ? "active" : "inactive"}`}>{m.is_active ? "Active" : "Deactivated"}</span>
                    </td>
                    <td className="text-slate-500 text-xs whitespace-nowrap" title={formatDateTime(m.last_login)}>
                      {m.last_login ? timeAgo(m.last_login) : "Never logged in"}
                    </td>
                    <td className="text-slate-500 text-xs whitespace-nowrap">{formatDate(m.created_at)}</td>
                    {canManage && (
                      <td className="actions">
                        <div className="admin-actions">
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Edit name & role" onClick={() => setEditing({ id: m.id, name: m.name, role: m.role, isMe })}>
                            <Pencil size={15} />
                          </button>
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Reset password" onClick={() => setResetting({ id: m.id, name: m.name, password: generatePassword() })}>
                            <KeyRound size={15} />
                          </button>
                          {!isMe && (
                            <>
                              <button type="button" className={`admin-btn admin-btn-ghost admin-icon-btn ${m.is_active ? "" : "!text-emerald-600"}`} title={m.is_active ? "Deactivate" : "Reactivate"} onClick={() => toggleActive(m)}>
                                <Power size={15} />
                              </button>
                              <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm !text-rose-600" onClick={() => revoke(m)}>
                                <Trash2 size={14} /> Revoke
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add admin */}
      <Modal
        open={!!creating}
        onClose={() => setCreating(null)}
        busy={busy}
        size="xl"
        title="Add admin"
        subtitle="Create a staff account with an initial password."
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setCreating(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="staff-create" className="admin-btn admin-btn-brand" disabled={busy}>
              <UserPlus size={15} /> {busy ? "Creating..." : "Create account"}
            </button>
          </>
        }
      >
        {creating && (
          <form id="staff-create" className="admin-form-grid three" onSubmit={submitCreate}>
            <Field label="Full name" required>
              <input className="admin-input" required maxLength={100} value={creating.name} onChange={(e) => setCreating({ ...creating, name: e.target.value })} placeholder="e.g. Neha Sharma" />
            </Field>
            <Field label="Email" required hint="Can be used to log in">
              <input className="admin-input" type="email" required maxLength={150} value={creating.email} onChange={(e) => setCreating({ ...creating, email: e.target.value })} placeholder="name@hungrybird.in" />
            </Field>
            <Field label="Username (optional)">
              <input className="admin-input" maxLength={80} value={creating.username} onChange={(e) => setCreating({ ...creating, username: e.target.value.replace(/\s/g, "") })} placeholder="e.g. neha" />
            </Field>
            <div className="span-all">
              <label className="admin-label">Permission role</label>
              <RoleCards name="create-role" value={creating.role} onChange={(role) => setCreating({ ...creating, role })} />
            </div>
            <div className="span-all">
              <PasswordField value={creating.password} onChange={(password) => setCreating({ ...creating, password })} />
            </div>
          </form>
        )}
      </Modal>

      {/* Edit role */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        busy={busy}
        size="xl"
        title={`Edit ${editing?.name || "staff"}`}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setEditing(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="staff-edit" className="admin-btn admin-btn-brand" disabled={busy}>
              {busy ? "Saving..." : "Save changes"}
            </button>
          </>
        }
      >
        {editing && (
          <form id="staff-edit" className="admin-form" onSubmit={submitEdit}>
            <Field label="Full name" required>
              <input className="admin-input" required maxLength={100} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </Field>
            <div>
              <label className="admin-label">Permission role</label>
              <RoleCards name="edit-role" value={editing.role} onChange={(role) => setEditing({ ...editing, role })} />
              {editing.isMe && editing.role !== "super_admin" && (
                <div className="admin-note mt-3 !mb-0">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                  <span>You are changing your own role. You will lose access to staff management once saved.</span>
                </div>
              )}
            </div>
          </form>
        )}
      </Modal>

      {/* Reset password */}
      <Modal
        open={!!resetting}
        onClose={() => setResetting(null)}
        busy={busy}
        title={`Reset password for ${resetting?.name || ""}`}
        footer={
          <>
            <button type="button" className="admin-btn" onClick={() => setResetting(null)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" form="staff-reset" className="admin-btn admin-btn-brand" disabled={busy}>
              <KeyRound size={15} /> {busy ? "Saving..." : "Set new password"}
            </button>
          </>
        }
      >
        {resetting && (
          <form id="staff-reset" className="admin-form" onSubmit={submitReset}>
            <PasswordField label="New password" value={resetting.password} onChange={(password) => setResetting({ ...resetting, password })} hint="At least 8 characters. Their current sessions keep working until they expire." />
          </form>
        )}
      </Modal>
    </div>
  );
}
