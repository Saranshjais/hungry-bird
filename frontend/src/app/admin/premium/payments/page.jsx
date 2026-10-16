"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Receipt, X } from "lucide-react";
import { adminFetch, formatDateTime, formatPaise, qs } from "../../lib/api";
import { useDebounce, usePageFor } from "../../lib/hooks";
import { useToast } from "../../components/Toast";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pagination, SearchInput } from "../../components/ui";
import { PremiumStatusBanner, PremiumTabs, usePremiumConfig } from "../../components/Premium";

const PER_PAGE = 25;

// Payment.status values stored by the backend (models.py): created, paid, failed, amount_mismatch.
const STATUSES = [
  { value: "", label: "All statuses" },
  { value: "paid", label: "Paid" },
  { value: "created", label: "Started, not paid" },
  { value: "failed", label: "Failed" },
  { value: "amount_mismatch", label: "Amount mismatch" },
];
const STATUS_LABEL = { paid: "Paid", created: "Not paid", failed: "Failed", amount_mismatch: "Amount mismatch" };
const STATUS_HELP = {
  paid: "Captured by Razorpay; Premium was added to the user.",
  created: "Checkout was opened but no successful payment came back (abandoned or still in progress).",
  failed: "Razorpay reported the payment as failed.",
  amount_mismatch: "Razorpay's amount didn't match the plan price, so Premium was NOT added. Check it in the Razorpay dashboard.",
};

function rowsFrom(data) {
  if (Array.isArray(data)) return data;
  return data?.payments || data?.items || [];
}

function CopyId({ value, label }) {
  const toast = useToast();
  if (!value) return <span className="text-neutral-300">—</span>;
  return (
    <span className="inline-flex items-center gap-1 max-w-full">
      <span className="admin-mono" title={label}>
        {value}
      </span>
      <button
        type="button"
        className="admin-btn admin-btn-ghost admin-icon-btn shrink-0"
        style={{ width: 24, height: 24, padding: 3 }}
        title={`Copy ${label}`}
        aria-label={`Copy ${label}`}
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`), () => toast.error("Could not copy"))}
      >
        <Copy size={12} />
      </button>
    </span>
  );
}

export default function PremiumPayments() {
  const config = usePremiumConfig();
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [status, setStatus] = useState("");
  const [page, setPage] = usePageFor(`${q}|${status}`);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 1, per_page: PER_PAGE });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/payments${qs({ status, q, page, per_page: PER_PAGE })}`);
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

  const filtersActive = search || status;

  return (
    <div>
      <PageHeader title="Payments" subtitle="Every Razorpay order started for a Premium plan. Refunds are made from the Razorpay dashboard." />
      <PremiumTabs current="/admin/premium/payments" />
      <PremiumStatusBanner config={config} compact />

      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search user, email, order or payment id..." />
        <select className="admin-select" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Payment status">
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => {
              setSearch("");
              setStatus("");
            }}
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading && data.rows.length === 0 ? (
        <Loading label="Loading payments..." />
      ) : data.rows.length === 0 ? (
        !error && (
          <div className="admin-card">
            <EmptyState icon={Receipt} title={filtersActive ? "No payments match" : "No payments yet"} message={filtersActive ? "Try a different search or status." : "Payments appear here once Premium is on, payments are configured and someone buys a plan."} />
          </div>
        )
      ) : (
        <>
          <div className="admin-table-container" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>User</th>
                  <th>Plan</th>
                  <th className="num">Amount</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Razorpay ids</th>
                  <th>Paid</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((p) => {
                  const user = p.user && typeof p.user === "object" ? p.user : { name: typeof p.user === "string" ? p.user : p.user_name, email: p.user_email, id: p.user_id };
                  const plan = p.plan && typeof p.plan === "object" ? p.plan.name : p.plan || p.plan_name;
                  const st = String(p.status || "").toLowerCase();
                  return (
                    <tr key={p.id}>
                      <td className="text-xs whitespace-nowrap text-neutral-600">{formatDateTime(p.created_at)}</td>
                      <td style={{ minWidth: 170 }}>
                        <div className="font-semibold text-neutral-900">{user.name || "—"}</div>
                        {user.email && <div className="text-xs text-neutral-500 break-all">{user.email}</div>}
                        {user.id != null && <div className="text-[11px] text-neutral-400">User #{user.id}</div>}
                      </td>
                      <td className="text-sm whitespace-nowrap">{plan || "—"}</td>
                      <td className="num font-semibold whitespace-nowrap">{p.amount_display || formatPaise(p.amount_paise)}</td>
                      <td>
                        <span className={`admin-badge normal-case ${st === "amount_mismatch" ? "danger" : st || "neutral"}`} title={STATUS_HELP[st]}>
                          {STATUS_LABEL[st] || p.status || "—"}
                        </span>
                      </td>
                      <td className="text-xs uppercase font-semibold text-neutral-600 whitespace-nowrap">{p.method || "—"}</td>
                      <td style={{ minWidth: 230, maxWidth: 300 }}>
                        <div className="flex flex-col gap-1">
                          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Order</div>
                          <CopyId value={p.provider_order_id} label="Order id" />
                          <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold mt-1">Payment</div>
                          <CopyId value={p.provider_payment_id} label="Payment id" />
                        </div>
                      </td>
                      <td className="text-xs whitespace-nowrap text-neutral-600">{p.paid_at ? formatDateTime(p.paid_at) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page || PER_PAGE} onChange={setPage} noun="payments" />
        </>
      )}
    </div>
  );
}
