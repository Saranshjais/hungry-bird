"use client";

import { useCallback, useEffect, useState } from "react";
import { Ban, Bell, BellOff, CalendarPlus, Crown, Eye, Heart, KeyRound, Mail, MailCheck, MailWarning, Phone, ShieldOff, Trash2, UserCheck, Users } from "lucide-react";
import { adminFetch, formatDate, formatDateTime, isSuperAdmin, qs, timeAgo } from "../lib/api";
import { useAdmin, useCan, useCanRead, useDebounce, usePageFor } from "../lib/hooks";
import { useToast } from "../components/Toast";
import Modal, { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pagination, ReadOnlyNote, SearchInput, Spinner, StatusBadge } from "../components/ui";
import { eventsFrom, PremiumActionModal, PremiumBadge, PremiumHistory, premiumInfo } from "../components/Premium";

const PER_PAGE = 25;

function EmailBadge({ user }) {
  if (user.email_verified === undefined || user.email_verified === null) return null;
  return user.email_verified ? (
    <span className="admin-badge active normal-case" title="The user confirmed this email with a code">
      <MailCheck size={11} /> Email verified
    </span>
  ) : (
    <span className="admin-badge pending normal-case" title="Not confirmed yet - the user must verify before buying Premium">
      <MailWarning size={11} /> Not verified
    </span>
  );
}

const RESET_ERRORS = {
  EMAIL_NOT_CONFIGURED: "Email isn't set up on the server (SMTP settings missing), so no reset email could be sent.",
  EMAIL_SEND_FAILED: "The reset email could not be sent (the mail server refused it). Please try again in a few minutes.",
  RATE_LIMITED: "Too many codes were sent to this email recently. Try again in a little while.",
};

export default function AdminUsers() {
  const toast = useToast();
  const confirm = useConfirm();
  const { admin } = useAdmin();
  const canWrite = useCan("users");
  const canDelete = canWrite && isSuperAdmin(admin);
  const canPremium = useCan("premium");
  const canSeePremium = useCanRead("premium");
  const [premiumAction, setPremiumAction] = useState(null); // { user, action }
  const [historyKey, setHistoryKey] = useState(0);

  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = useState("all");
  const [page, setPage] = usePageFor(`${q}|${status}`);
  const [data, setData] = useState({ users: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [viewing, setViewing] = useState(null); // { user, detail, loading, error }

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/users${qs({ q, status, page, per_page: PER_PAGE })}`);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [q, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const setUserStatus = async (u, next) => {
    if (next === "suspended") {
      const ok = await confirm({
        title: `Suspend ${u.name || u.email}?`,
        message: "Their account is blocked: they can't log in or use signed-in features (reviews, favourites, submissions) on the website or app until reactivated.",
        confirmLabel: "Suspend user",
        danger: true,
      });
      if (!ok) return;
    }
    setBusyId(u.id);
    try {
      const res = await adminFetch(`/users/${u.id}/status`, { method: "PUT", body: { status: next } });
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === u.id ? { ...x, status: next } : x)) }));
      setViewing((v) => (v && v.user.id === u.id ? { ...v, user: { ...v.user, status: next } } : v));
      toast.success(res.message || `User ${next}`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (u) => {
    const ok = await confirm({
      title: `Permanently delete ${u.name || u.email}?`,
      message:
        "This cannot be undone. The account, favourites and saved vendors are deleted; their reviews and submissions stay but are no longer linked to an account.\n\nTo only block access, suspend the user instead.",
      confirmLabel: "Delete permanently",
      danger: true,
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      const res = await adminFetch(`/users/${u.id}`, { method: "DELETE" });
      toast.success(res.message || "User deleted");
      setViewing(null);
      if (data.users.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const sendReset = async (u) => {
    const ok = await confirm({
      title: "Send a password reset email?",
      message: `${u.email} gets a 6-digit code (valid for 10 minutes) to set a new password in the app or on the website. Their current password keeps working until they use it; resetting signs them out everywhere.`,
      confirmLabel: "Send reset email",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      const res = await adminFetch(`/users/${u.id}/send-reset`, { method: "POST" });
      toast.success(res.message || `Password reset email sent to ${u.email}`);
    } catch (err) {
      toast.error(RESET_ERRORS[err.code] || err.message);
    } finally {
      setBusyId(null);
    }
  };

  const afterPremium = (res, body) => {
    const id = premiumAction?.user?.id;
    const updated = res?.user;
    const patch = updated
      ? { premium_until: updated.premium_until ?? null, is_premium: updated.is_premium }
      : body.action === "revoke"
        ? { premium_until: new Date().toISOString(), is_premium: false }
        : null;
    if (patch) {
      setData((d) => ({ ...d, users: d.users.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
      setViewing((v) => (v && v.user.id === id ? { ...v, user: { ...v.user, ...patch } } : v));
    }
    setHistoryKey((k) => k + 1);
    if (!patch) load();
  };

  const openView = async (u) => {
    setViewing({ user: u, detail: null, loading: true, error: "" });
    try {
      const detail = await adminFetch(`/users/${u.id}`);
      setViewing((v) => (v && v.user.id === u.id ? { user: detail.user || u, detail, loading: false, error: "" } : v));
    } catch (err) {
      setViewing((v) => (v && v.user.id === u.id ? { ...v, loading: false, error: err.message } : v));
    }
  };

  return (
    <div>
      <PageHeader title="Users" subtitle={`${data.total.toLocaleString("en-IN")} ${status === "all" ? "registered" : status} app users`} />
      <ReadOnlyNote area="users" />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name, email or phone..." />
        <div className="admin-segmented" role="group" aria-label="User status">
          {["all", "active", "suspended", "premium"].map((s) => (
            <button key={s} type="button" className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading && data.users.length === 0 ? (
        <Loading label="Loading users..." />
      ) : data.users.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Users} title="No users found" message={q || status !== "all" ? "Try a different search or filter." : "People who sign up on the website or app will appear here."} />
        </div>
      ) : (
        <>
          <div className="admin-table-container" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Premium</th>
                  <th>Joined</th>
                  <th>Last login</th>
                  <th className="num">Reviews</th>
                  <th className="num">Submissions</th>
                  <th>Status</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((u) => {
                  const suspended = u.status === "suspended";
                  return (
                    <tr key={u.id} style={{ opacity: busyId === u.id ? 0.5 : 1 }}>
                      <td style={{ minWidth: 220 }}>
                        <div className="flex items-center gap-3">
                          <div className="admin-avatar" style={{ width: 34, height: 34, fontSize: "0.8rem" }}>
                            {(u.name || u.email || "?").charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-neutral-900 truncate">{u.name || "—"}</div>
                            <div className="text-xs text-neutral-500 truncate">{u.email}</div>
                            {u.phone && <div className="text-xs text-neutral-400">{u.phone}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{u.email_verified === undefined || u.email_verified === null ? <span className="text-neutral-300">—</span> : <EmailBadge user={u} />}</td>
                      <td>{premiumInfo(u).until || u.is_premium ? <PremiumBadge user={u} /> : <span className="text-neutral-300">—</span>}</td>
                      <td className="text-neutral-600 text-xs whitespace-nowrap">{formatDate(u.joined)}</td>
                      <td className="text-neutral-600 text-xs whitespace-nowrap" title={formatDateTime(u.last_login)}>
                        {u.last_login ? timeAgo(u.last_login) : "Never"}
                      </td>
                      <td className="num">{u.reviews_count}</td>
                      <td className="num">{u.submissions_count}</td>
                      <td>
                        <StatusBadge status={u.status || "active"} />
                      </td>
                      <td className="actions">
                        <div className="admin-actions">
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="View details" onClick={() => openView(u)}>
                            <Eye size={15} />
                          </button>
                          {canPremium && (
                            <button
                              type="button"
                              className="admin-btn admin-btn-ghost admin-icon-btn"
                              title={premiumInfo(u).active ? "Extend Premium" : "Grant Premium"}
                              disabled={busyId === u.id}
                              onClick={() => setPremiumAction({ user: u, action: premiumInfo(u).active ? "extend" : "grant" })}
                            >
                              <Crown size={15} className={premiumInfo(u).active ? "text-amber-600" : ""} />
                            </button>
                          )}
                          {canWrite && (
                            <>
                              <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Send password reset email" disabled={busyId === u.id || !u.email} onClick={() => sendReset(u)}>
                                <KeyRound size={15} />
                              </button>
                              <button
                                type="button"
                                className="admin-btn admin-btn-sm"
                                disabled={busyId === u.id}
                                onClick={() => setUserStatus(u, suspended ? "active" : "suspended")}
                              >
                                {suspended ? <UserCheck size={14} /> : <Ban size={14} />} {suspended ? "Reactivate" : "Suspend"}
                              </button>
                              {canDelete && (
                                <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete permanently" disabled={busyId === u.id} onClick={() => remove(u)}>
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page || PER_PAGE} onChange={setPage} noun="users" />
        </>
      )}

      <Modal
        open={!!viewing}
        drawer
        onClose={() => setViewing(null)}
        title={viewing?.user.name || viewing?.user.email || "User"}
        subtitle={viewing ? `User #${viewing.user.id} · joined ${formatDate(viewing.user.joined)}` : ""}
        footer={
          viewing &&
          canWrite && (
            <>
              {canDelete && (
                <button type="button" className="admin-btn admin-btn-ghost !text-rose-600 mr-auto" onClick={() => remove(viewing.user)}>
                  <Trash2 size={15} /> Delete
                </button>
              )}
              <button type="button" className={`admin-btn ${canDelete ? "" : "mr-auto"}`} disabled={busyId === viewing.user.id || !viewing.user.email} onClick={() => sendReset(viewing.user)}>
                <KeyRound size={15} /> Send reset email
              </button>
              <button
                type="button"
                className="admin-btn"
                onClick={() => setUserStatus(viewing.user, viewing.user.status === "suspended" ? "active" : "suspended")}
              >
                {viewing.user.status === "suspended" ? <UserCheck size={15} /> : <Ban size={15} />}
                {viewing.user.status === "suspended" ? "Reactivate" : "Suspend"}
              </button>
            </>
          )
        }
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={viewing.user.status || "active"} />
                <EmailBadge user={viewing.user} />
                <PremiumBadge user={viewing.user} />
                <span className="admin-badge neutral">
                  {viewing.user.has_push_token ? <Bell size={11} /> : <BellOff size={11} />}
                  {viewing.user.has_push_token ? (viewing.user.notifications_enabled ? "Push enabled" : "Push muted") : "No device registered"}
                </span>
              </div>
              {viewing.user.email && (
                <a href={`mailto:${viewing.user.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Mail size={14} /> {viewing.user.email}
                </a>
              )}
              {viewing.user.phone && (
                <a href={`tel:${viewing.user.phone}`} className="flex items-center gap-2 text-neutral-700">
                  <Phone size={14} /> {viewing.user.phone}
                </a>
              )}
              <div className="text-xs text-neutral-500">Last login: {formatDateTime(viewing.user.last_login, "Never")}</div>
              {viewing.user.email_verified === false && <div className="text-xs text-amber-700">The email isn&apos;t verified yet - the user has to confirm it before they can buy Premium.</div>}
            </div>

            {(canSeePremium || canPremium) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3 flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold text-neutral-900 flex items-center gap-1.5">
                      <Crown size={14} className="text-amber-600" /> Premium
                    </div>
                    <div className="text-xs text-neutral-600">
                      {premiumInfo(viewing.user).active
                        ? `Active until ${formatDateTime(premiumInfo(viewing.user).until)}`
                        : premiumInfo(viewing.user).until
                          ? `Ended ${formatDateTime(premiumInfo(viewing.user).until)}`
                          : "Never had Premium"}
                    </div>
                  </div>
                  {canPremium && (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="admin-btn admin-btn-sm" onClick={() => setPremiumAction({ user: viewing.user, action: premiumInfo(viewing.user).active ? "extend" : "grant" })}>
                        <CalendarPlus size={14} /> {premiumInfo(viewing.user).active ? "Extend" : "Grant"}
                      </button>
                      {premiumInfo(viewing.user).active && (
                        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm !text-rose-600" onClick={() => setPremiumAction({ user: viewing.user, action: "revoke" })}>
                          <ShieldOff size={14} /> Revoke
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {canSeePremium && (
                  <div>
                    <div className="admin-label">Subscription history</div>
                    {viewing.loading ? (
                      <div className="flex items-center gap-2 text-sm text-neutral-500">
                        <Spinner small /> Loading subscription history...
                      </div>
                    ) : (
                      <PremiumHistory userId={viewing.user.id} refreshKey={historyKey} initial={eventsFrom(viewing.detail)} />
                    )}
                  </div>
                )}
              </div>
            )}

            {viewing.loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Spinner small /> Loading activity...
              </div>
            ) : viewing.error ? (
              <ErrorBanner message={viewing.error} onRetry={() => openView(viewing.user)} />
            ) : (
              viewing.detail && (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Favourites", value: viewing.detail.favorites_count, icon: Heart },
                      { label: "Reviews", value: viewing.user.reviews_count },
                      { label: "Submissions", value: viewing.user.submissions_count },
                    ].map((s) => (
                      <div key={s.label} className="rounded-lg border border-neutral-200 p-3 text-center">
                        <div className="text-xl font-bold text-neutral-900">{s.value ?? 0}</div>
                        <div className="text-[11px] uppercase tracking-wider text-neutral-500 font-semibold">{s.label}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="admin-label">Recent reviews</div>
                    {viewing.detail.reviews?.length ? (
                      <ul className="list-none m-0 p-0 flex flex-col gap-2">
                        {viewing.detail.reviews.map((r) => (
                          <li key={r.id} className="rounded-lg border border-neutral-200 p-3">
                            <div className="flex justify-between gap-2 text-sm">
                              <span className="font-semibold text-neutral-800 truncate">{r.vendor_name || "Vendor"}</span>
                              <span className="text-amber-600 font-semibold whitespace-nowrap">★ {r.rating_value}</span>
                            </div>
                            {r.review_text && <p className="text-xs text-neutral-600 mt-1 mb-0 line-clamp-3">{r.review_text}</p>}
                            <div className="text-[11px] text-neutral-400 mt-1">{formatDate(r.created_at)}</div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-neutral-500 m-0">No reviews yet.</p>
                    )}
                  </div>

                  <div>
                    <div className="admin-label">Vendor submissions</div>
                    {viewing.detail.submissions?.length ? (
                      <ul className="list-none m-0 p-0 border border-neutral-200 rounded-lg divide-y divide-neutral-100">
                        {viewing.detail.submissions.map((s) => (
                          <li key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="truncate">{s.stall_name}</span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span className="text-[11px] text-neutral-400">{formatDate(s.created_at)}</span>
                              <StatusBadge status={s.status} />
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-neutral-500 m-0">No submissions yet.</p>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </Modal>

      <PremiumActionModal target={premiumAction} onClose={() => setPremiumAction(null)} onDone={afterPremium} />
    </div>
  );
}
