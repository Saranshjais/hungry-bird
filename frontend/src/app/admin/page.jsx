"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowUpRight, BadgeIndianRupee, Clapperboard, ClipboardList, Crown, Flag, Inbox, Mail, MapPin, Plus, Receipt, RefreshCw,
  Route, Smartphone, Star, Store, TrendingUp, Users,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { adminFetch, can, canRead, formatDateTime, formatPaise, timeAgo } from "./lib/api";
import { useAdmin } from "./lib/hooks";
import { EmptyState, ErrorBanner, Loading, PageHeader, Spinner } from "./components/ui";

// Activity rows link to these pages; hide the ones the role can't open.
const ACTIVITY_AREA = { user: "users", submission: "submissions", review: "reviews", report: "reports", message: "inbox" };

const SERIES = [
  { key: "users", label: "New users", color: "#3b82f6" },
  { key: "submissions", label: "Submissions", color: "#f97316" },
  { key: "reviews", label: "Reviews", color: "#10b981" },
];

const ACTIVITY_STYLE = {
  user: { icon: Users, cls: "text-blue-600 bg-blue-50" },
  submission: { icon: ClipboardList, cls: "text-amber-600 bg-amber-50" },
  review: { icon: Star, cls: "text-yellow-600 bg-yellow-50" },
  report: { icon: Flag, cls: "text-rose-600 bg-rose-50" },
  message: { icon: Mail, cls: "text-violet-600 bg-violet-50" },
};

function MetricCard({ tone, icon: Icon, value, display, label, badge, href, linkLabel }) {
  return (
    <div className={`admin-metric-card ${tone}`}>
      <div className="admin-metric-header">
        <div className="admin-metric-icon">
          <Icon size={20} />
        </div>
        {badge && <span className="admin-metric-badge">{badge}</span>}
      </div>
      <h3 className="admin-metric-value">{display ?? (value ?? 0).toLocaleString("en-IN")}</h3>
      <p className="admin-metric-label">{label}</p>
      <Link href={href} className="admin-metric-link">
        {linkLabel} <ArrowUpRight size={14} />
      </Link>
    </div>
  );
}

export default function AdminDashboard() {
  const { admin } = useAdmin();
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const load = useCallback(async (range) => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/stats?days=${range}`);
      setData(res);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(days);
  }, [days, load]);

  const totals = data?.totals || {};
  const series = data?.series || [];
  const r = (area) => canRead(area, admin);
  const activity = (data?.recent_activity || []).filter((a) => !ACTIVITY_AREA[a.type] || r(ACTIVITY_AREA[a.type]));
  const premium = r("premium") ? data?.premium || null : null;
  const byCity = data?.vendors_by_city || [];
  const topVendors = data?.top_vendors || [];
  const maxCity = Math.max(1, ...byCity.map((c) => c.vendors));
  const periodTotals = SERIES.map((s) => ({ ...s, total: series.reduce((sum, row) => sum + (row[s.key] || 0), 0) }));
  const connected = !!data && !error;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome back${admin?.name ? `, ${admin.name}` : ""}. Here is what is happening on HungryBird.`}>
        <span
          className={`inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${
            connected ? "bg-emerald-50 text-emerald-700 border-emerald-200" : error ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-neutral-50 text-neutral-500 border-neutral-200"
          }`}
          title={updatedAt ? `Last updated ${formatDateTime(updatedAt)}` : undefined}
        >
          <span className={`w-2 h-2 rounded-full ${connected ? "bg-emerald-500" : error ? "bg-rose-500" : "bg-neutral-300"}`} />
          {connected ? "API connected" : error ? "API unreachable" : "Connecting..."}
        </span>
        <button type="button" className="admin-btn" onClick={() => load(days)} disabled={loading}>
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </PageHeader>

      <ErrorBanner message={error} onRetry={() => load(days)} />

      {!data && loading ? (
        <Loading label="Loading dashboard..." />
      ) : !data ? null : (
        <>
          <div className="admin-dashboard-grid">
            {r("submissions") && <MetricCard tone="amber" icon={ClipboardList} value={totals.pending_submissions} label="Pending submissions" badge={totals.pending_submissions ? "Needs review" : null} href="/admin/submissions" linkLabel="Review submissions" />}
            {r("vendors") && <MetricCard tone="brand" icon={Store} value={totals.vendors} label="Vendors" badge={`${(totals.hidden_gems || 0).toLocaleString("en-IN")} hidden gems`} href="/admin/vendors" linkLabel="Manage vendors" />}
            {r("users") && <MetricCard tone="blue" icon={Users} value={totals.users} label="App users" badge={totals.suspended_users ? `${totals.suspended_users} suspended` : null} href="/admin/users" linkLabel="View users" />}
            {r("reports") && <MetricCard tone="rose" icon={Flag} value={totals.pending_reports} label="Pending reports" badge={totals.pending_reports ? "Open" : null} href="/admin/reports" linkLabel="Review reports" />}
            {r("inbox") && <MetricCard tone="blue" icon={Inbox} value={totals.unread_messages} label="Unread messages" badge={totals.unread_messages ? "Unread" : null} href="/admin/inbox" linkLabel="Open inbox" />}
            {r("reviews") && <MetricCard tone="amber" icon={Star} value={totals.reviews} label="Vendor reviews" href="/admin/ratings" linkLabel="Moderate reviews" />}
            {r("cities") && <MetricCard tone="brand" icon={MapPin} value={totals.cities} label="Cities" badge={`${totals.categories || 0} categories`} href="/admin/cities" linkLabel="Manage cities" />}
            {r("reels") && <MetricCard tone="rose" icon={Clapperboard} value={totals.pending_reels} label="Pending reels" badge={totals.pending_reels ? "Needs review" : null} href="/admin/reels" linkLabel="Review reels" />}
          </div>

          {premium && (
            <div className="admin-card">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <h3 className="admin-card-title !mb-0">
                  <Crown size={18} className="text-amber-500" /> Premium
                </h3>
                <Link href="/admin/premium" className="admin-metric-link !mt-0">
                  Open Premium <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className="admin-stat-row">
                <Link href="/admin/premium/subscribers" className="admin-stat no-underline hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2 text-amber-600 mb-2">
                    <BadgeIndianRupee size={18} />
                  </div>
                  <div className="admin-stat-value">{(premium.active_subscribers ?? 0).toLocaleString("en-IN")}</div>
                  <div className="admin-stat-label">Active subscribers</div>
                </Link>
                <Link href="/admin/premium/payments" className="admin-stat no-underline hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2 text-emerald-600 mb-2">
                    <TrendingUp size={18} />
                  </div>
                  <div className="admin-stat-value">{formatPaise(premium.revenue_30d_paise ?? 0)}</div>
                  <div className="admin-stat-label">Revenue · last 30 days</div>
                </Link>
                <Link href="/admin/premium/payments" className="admin-stat no-underline hover:border-amber-300 transition-colors">
                  <div className="flex items-center gap-2 text-blue-600 mb-2">
                    <Receipt size={18} />
                  </div>
                  <div className="admin-stat-value">{(premium.payments_30d ?? 0).toLocaleString("en-IN")}</div>
                  <div className="admin-stat-label">Payments · last 30 days</div>
                </Link>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col gap-6 min-w-0">
              <div className="admin-card !mb-0">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="admin-card-title !mb-0">
                    <TrendingUp size={18} className="text-brand-500" /> Platform activity
                    {loading && <Spinner small />}
                  </h3>
                  <div className="admin-segmented" role="group" aria-label="Date range">
                    {[7, 30].map((d) => (
                      <button key={d} type="button" className={days === d ? "active" : ""} onClick={() => setDays(d)}>
                        {d} days
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-4">
                  {periodTotals.map((s) => (
                    <div key={s.key} className="flex items-center gap-2 text-sm">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                      <span className="text-neutral-500">{s.label}</span>
                      <span className="font-semibold text-neutral-900">{s.total}</span>
                    </div>
                  ))}
                </div>

                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        {SERIES.map((s) => (
                          <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={s.color} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={s.color} stopOpacity={0} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} dy={8} minTickGap={12} />
                      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#a3a3a3", fontSize: 12 }} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e5e5", boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)", fontSize: 12 }} />
                      {SERIES.map((s) => (
                        <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2.5} fillOpacity={1} fill={`url(#grad-${s.key})`} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="admin-card !mb-0">
                <h3 className="admin-card-title">
                  <Activity size={18} className="text-blue-500" /> Recent activity
                </h3>
                {activity.length === 0 ? (
                  <EmptyState icon={Activity} title="No activity yet" message="New users, submissions, reviews, reports and messages will show up here." />
                ) : (
                  <div className="flex flex-col">
                    {activity.map((act, i) => {
                      const style = ACTIVITY_STYLE[act.type] || ACTIVITY_STYLE.message;
                      const Icon = style.icon;
                      return (
                        <Link
                          key={`${act.type}-${act.created_at}-${i}`}
                          href={act.link || "/admin"}
                          className="flex items-start gap-3 p-3 -mx-3 rounded-lg hover:bg-neutral-50 transition-colors no-underline"
                        >
                          <div className={`p-2 rounded-full shrink-0 ${style.cls}`}>
                            <Icon size={15} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-neutral-800 text-sm">{act.title}</div>
                            <div className="text-xs text-neutral-500 mt-0.5 truncate">{act.detail}</div>
                          </div>
                          <span className="text-xs font-medium text-neutral-400 whitespace-nowrap" title={formatDateTime(act.created_at)}>
                            {timeAgo(act.created_at)}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-6 min-w-0">
              <div className="dashboard-list-card">
                <h3 className="admin-card-title !text-sm uppercase !tracking-wider">Quick actions</h3>
                <div className="flex flex-col">
                  {[
                    { href: "/admin/submissions", icon: ClipboardList, label: "Review pending submissions", count: totals.pending_submissions, show: r("submissions") },
                    { href: "/admin/vendors?new=1", icon: Plus, label: "Add a vendor", show: can("vendors", admin) },
                    { href: "/admin/trails", icon: Route, label: "Manage food trails", show: r("content") },
                    { href: "/admin/reports", icon: Flag, label: "Review flagged content", count: totals.pending_reports, show: r("reports") },
                    { href: "/admin/inbox", icon: Inbox, label: "Answer support messages", count: totals.unread_messages, show: r("inbox") },
                    { href: "/admin/premium/subscribers", icon: Crown, label: "Premium subscribers", show: r("premium") },
                    { href: "/admin/app-settings", icon: Smartphone, label: "Mobile app settings", show: r("app") },
                  ].filter((q) => q.show).map((q) => (
                    <Link key={q.href} href={q.href} className="dashboard-list-item hover:bg-neutral-50 transition-colors rounded-md -mx-2 !px-2">
                      <div className="w-8 h-8 rounded-md bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0">
                        <q.icon size={15} />
                      </div>
                      <span className="font-medium text-sm text-neutral-700 flex-1">{q.label}</span>
                      {q.count > 0 && <span className="admin-nav-badge">{q.count}</span>}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="dashboard-list-card">
                <h3 className="admin-card-title !text-sm uppercase !tracking-wider">Vendors by city</h3>
                {byCity.length === 0 ? (
                  <p className="text-sm text-neutral-500 m-0">No cities yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {byCity.slice(0, 8).map((c) => (
                      <div key={c.city}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-neutral-700">{c.city}</span>
                          <span className="text-neutral-500 tabular-nums">{c.vendors.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="admin-bar-track">
                          <div className="admin-bar-fill" style={{ width: `${(c.vendors / maxCity) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="dashboard-list-card">
                <h3 className="admin-card-title !text-sm uppercase !tracking-wider">Most reviewed vendors</h3>
                {topVendors.length === 0 ? (
                  <p className="text-sm text-neutral-500 m-0">No reviews yet.</p>
                ) : (
                  <div className="flex flex-col">
                    {topVendors.map((v, i) => (
                      <a key={v.id} href={`/vendor/${v.id}`} target="_blank" rel="noreferrer" className="dashboard-list-item hover:bg-neutral-50 rounded-md -mx-2 !px-2">
                        <span className="w-6 text-xs font-bold text-neutral-400">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-neutral-800 truncate">{v.name}</div>
                          <div className="text-xs text-neutral-500">{v.city_name || "—"}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-amber-600">★ {v.avg_rating != null ? Number(v.avg_rating).toFixed(1) : "—"}</div>
                          <div className="text-xs text-neutral-400">{v.total_ratings} reviews</div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
