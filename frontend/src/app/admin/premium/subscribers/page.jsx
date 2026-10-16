"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeIndianRupee, CalendarPlus, Crown, History, Mail, ShieldOff, UserPlus } from "lucide-react";
import { adminFetch, formatDate, formatDateTime, formatPaise, qs } from "../../lib/api";
import { useCan, useCanRead, useDebounce, usePageFor } from "../../lib/hooks";
import Modal from "../../components/Modal";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pagination, ReadOnlyNote, SearchInput, Spinner } from "../../components/ui";
import { PremiumActionModal, PremiumBadge, PremiumHistory, PremiumStatusBanner, PremiumTabs, premiumInfo, usePremiumConfig } from "../../components/Premium";

const PER_PAGE = 25;

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  return data?.subscriptions || data?.subscribers || data?.users || data?.items || [];
}

/** Subscription rows use user_id; user rows use id. */
const uid = (row) => row.user_id ?? row.id;

/** last_payment may be an ISO string or { amount_paise, paid_at/created_at, plan/plan_name, method, status }. */
function LastPayment({ value }) {
  if (!value) return <span className="text-neutral-400">—</span>;
  if (typeof value === "string") return <span className="text-xs text-neutral-600">{formatDateTime(value)}</span>;
  const plan = value.plan_name || value.plan?.name || (typeof value.plan === "string" ? value.plan : null);
  return (
    <div className="text-xs">
      <div className="font-semibold text-neutral-800 text-sm">{value.amount_paise != null ? formatPaise(value.amount_paise) : "—"}</div>
      <div className="text-neutral-500">{[plan, value.method ? String(value.method).toUpperCase() : null].filter(Boolean).join(" · ")}</div>
      <div className="text-neutral-400">{formatDateTime(value.paid_at || value.created_at)}</div>
    </div>
  );
}

export default function PremiumSubscribers() {
  const canWrite = useCan("premium");
  const canFindUsers = useCanRead("users");
  const config = usePremiumConfig();

  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = useState("active");
  const [page, setPage] = usePageFor(`${q}|${status}`);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 1, per_page: PER_PAGE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [action, setAction] = useState(null); // { user, action }
  const [viewing, setViewing] = useState(null); // row
  const [historyKey, setHistoryKey] = useState(0);
  const [finding, setFinding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/subscriptions${qs({ status, q, page, per_page: PER_PAGE })}`);
      const rows = rowsFrom(res);
      setData({ rows, total: res.total ?? rows.length, page: res.page ?? page, pages: res.pages ?? 1, per_page: res.per_page ?? PER_PAGE });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  const afterAction = (res, body) => {
    const updated = res?.user || res?.subscription || null;
    const id = uid(action.user);
    const patch = updated
      ? { premium_until: updated.premium_until ?? null, is_premium: updated.is_premium }
      : body.action === "revoke"
        ? { premium_until: new Date().toISOString(), is_premium: false }
        : null;
    if (patch) {
      setData((d) => ({ ...d, rows: d.rows.map((r) => (uid(r) === id ? { ...r, ...patch } : r)) }));
      setViewing((v) => (v && uid(v) === id ? { ...v, ...patch } : v));
    }
    setHistoryKey((k) => k + 1);
    load();
  };

  const statuses = [
    { value: "active", label: "Active" },
    { value: "expired", label: "Expired" },
    { value: "all", label: "All" },
  ];

  return (
    <div>
      <PageHeader
        title="Subscribers"
        subtitle={`${data.total.toLocaleString("en-IN")} ${data.total === 1 ? "person" : "people"} ${
          status === "all" ? `who ${data.total === 1 ? "has" : "have"} had Premium` : status === "active" ? "with active Premium" : "whose Premium has expired"
        }.`}
      >
        {canWrite && canFindUsers && (
          <button type="button" className="admin-btn admin-btn-brand" onClick={() => setFinding(true)}>
            <UserPlus size={15} /> Grant to a user
          </button>
        )}
      </PageHeader>
      <PremiumTabs current="/admin/premium/subscribers" />
      <ReadOnlyNote area="premium" />
      <PremiumStatusBanner config={config} compact />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search name or email..." />
        <div className="admin-segmented" role="group" aria-label="Subscription status">
          {statuses.map((s) => (
            <button key={s.value} type="button" className={status === s.value ? "active" : ""} onClick={() => setStatus(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading && data.rows.length === 0 ? (
        <Loading label="Loading subscribers..." />
      ) : data.rows.length === 0 ? (
        !error && (
          <div className="admin-card">
            <EmptyState icon={BadgeIndianRupee} title={q ? "No subscribers match" : status === "active" ? "No active subscribers" : "No subscribers yet"} message={q ? "Try a different name or email." : "People who buy a plan, or get Premium from your team, show up here."} />
          </div>
        )
      ) : (
        <>
          <div className="admin-table-container" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Status</th>
                  <th>Premium until</th>
                  <th>Last payment</th>
                  <th className="actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => {
                  const { active, until } = premiumInfo(r);
                  return (
                    <tr key={uid(r)}>
                      <td style={{ minWidth: 200 }}>
                        <div className="font-semibold text-neutral-900">{r.name || "—"}</div>
                        <div className="text-xs text-neutral-500 break-all">{r.email}</div>
                        <div className="text-[11px] text-neutral-400">User #{uid(r)}</div>
                      </td>
                      <td>{active ? <span className="admin-badge premium normal-case"><Crown size={11} /> Active</span> : <span className="admin-badge neutral">Expired</span>}</td>
                      <td className="text-xs whitespace-nowrap" title={formatDateTime(until)}>
                        {until ? formatDate(until) : "—"}
                      </td>
                      <td style={{ minWidth: 140 }}>
                        <LastPayment value={r.last_payment} />
                      </td>
                      <td className="actions">
                        <div className="admin-actions">
                          <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn" title="Subscription history" onClick={() => setViewing(r)}>
                            <History size={15} />
                          </button>
                          {canWrite && (
                            <>
                              <button type="button" className="admin-btn admin-btn-sm" onClick={() => setAction({ user: r, action: active ? "extend" : "grant" })}>
                                <CalendarPlus size={14} /> {active ? "Extend" : "Grant"}
                              </button>
                              {active && (
                                <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm !text-rose-600" onClick={() => setAction({ user: r, action: "revoke" })}>
                                  <ShieldOff size={14} /> Revoke
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
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page || PER_PAGE} onChange={setPage} noun="subscribers" />
        </>
      )}

      {/* History drawer */}
      <Modal
        open={!!viewing}
        drawer
        onClose={() => setViewing(null)}
        title={viewing?.name || viewing?.email || "Subscriber"}
        subtitle={viewing ? `User #${uid(viewing)}${viewing.email && viewing.name ? ` · ${viewing.email}` : ""}` : ""}
        footer={
          viewing &&
          canWrite && (
            <>
              {premiumInfo(viewing).active && (
                <button type="button" className="admin-btn admin-btn-ghost !text-rose-600 mr-auto" onClick={() => setAction({ user: viewing, action: "revoke" })}>
                  <ShieldOff size={15} /> Revoke
                </button>
              )}
              <button type="button" className="admin-btn admin-btn-brand" onClick={() => setAction({ user: viewing, action: premiumInfo(viewing).active ? "extend" : "grant" })}>
                <CalendarPlus size={15} /> {premiumInfo(viewing).active ? "Extend" : "Grant"}
              </button>
            </>
          )
        }
      >
        {viewing && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <PremiumBadge user={viewing} />
                {!premiumInfo(viewing).until && <span className="admin-badge neutral">No Premium</span>}
              </div>
              {viewing.email && (
                <a href={`mailto:${viewing.email}`} className="flex items-center gap-2 text-blue-600 hover:underline break-all">
                  <Mail size={14} className="shrink-0" /> {viewing.email}
                </a>
              )}
              <div>
                <div className="admin-label !mb-1">Last payment</div>
                <LastPayment value={viewing.last_payment} />
              </div>
            </div>
            <div>
              <div className="admin-label">Subscription history</div>
              <PremiumHistory userId={uid(viewing)} refreshKey={historyKey} />
            </div>
          </div>
        )}
      </Modal>

      <PremiumActionModal target={action ? { ...action, user: { ...action.user, id: uid(action.user) } } : null} onClose={() => setAction(null)} onDone={afterAction} />

      <FindUserModal
        open={finding}
        onClose={() => setFinding(false)}
        onPick={(u) => {
          setFinding(false);
          setAction({ user: u, action: premiumInfo(u).active ? "extend" : "grant" });
        }}
      />
    </div>
  );
}

/** Search app users (GET /api/admin/users?q=) to grant Premium to someone who isn't a subscriber yet. */
function FindUserModal({ open, onClose, onPick }) {
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setResults([]);
      return undefined;
    }
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminFetch(`/users${qs({ q: q.trim(), per_page: 8 })}`)
      .then((d) => !cancelled && setResults(d.users || []))
      .catch((err) => !cancelled && setError(err))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [q, open]);

  return (
    <Modal open={open} onClose={onClose} size="sm" title="Grant Premium to a user" subtitle="Search by name or email, then choose how many days to add.">
      <div className="flex flex-col gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Name or email (at least 2 letters)" />
        <ErrorBanner message={error} />
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            <Spinner small /> Searching...
          </div>
        ) : results.length > 0 ? (
          <div className="admin-picker">
            {results.map((u) => (
              <button key={u.id} type="button" onClick={() => onPick(u)}>
                <div className="admin-avatar" style={{ width: 30, height: 30, fontSize: "0.75rem" }}>
                  {(u.name || u.email || "?").charAt(0)}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold truncate">{u.name || "—"}</span>
                  <span className="block text-xs text-neutral-500 truncate">{u.email}</span>
                </span>
                <PremiumBadge user={u} showExpired={false} />
              </button>
            ))}
          </div>
        ) : q.trim().length >= 2 ? (
          <p className="text-sm text-neutral-500 m-0">No users found.</p>
        ) : null}
      </div>
    </Modal>
  );
}
