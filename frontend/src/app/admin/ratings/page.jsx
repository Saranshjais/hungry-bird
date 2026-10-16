"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, Calculator, CircleCheck, CircleX, ExternalLink, Info, MessageSquareText, Quote, Star, Trash2, X } from "lucide-react";
import { adminFetch, canSeePersonalData, formatDate, formatDateTime, qs } from "../lib/api";
import { useAdmin, useCan, useDebounce, usePageFor } from "../lib/hooks";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Modal";
import { EmptyState, ErrorBanner, Loading, PageHeader, Pagination, ReadOnlyNote, SearchInput, Stars, StatusBadge, Tabs } from "../components/ui";

const PER_PAGE = 25;

export default function AdminReviews() {
  const [tab, setTab] = useState("reviews");
  const [vendorFilter, setVendorFilter] = useState(null); // { id, name }

  const showVendorReviews = (vendor) => {
    setVendorFilter(vendor);
    setTab("reviews");
  };

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Moderate vendor reviews and the testimonials shown on the website." />
      <ReadOnlyNote area="reviews" />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "reviews", label: "Vendor reviews", icon: MessageSquareText },
          { value: "summary", label: "Rating summary", icon: BarChart3 },
          { value: "site", label: "Website testimonials", icon: Quote },
        ]}
      />
      {tab === "reviews" && <VendorReviews vendorFilter={vendorFilter} clearVendor={() => setVendorFilter(null)} />}
      {tab === "summary" && <RatingSummary onShowReviews={showVendorReviews} />}
      {tab === "site" && <SiteReviews />}
    </div>
  );
}

function VendorReviews({ vendorFilter, clearVendor }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { admin } = useAdmin();
  const canWrite = useCan("reviews");
  const [search, setSearch] = useState("");
  const q = useDebounce(search, 300);
  const [lowOnly, setLowOnly] = useState(false);
  const vendorId = vendorFilter?.id || "";
  const [page, setPage] = usePageFor([q, lowOnly, vendorId].join("|"));
  const [data, setData] = useState({ reviews: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/reviews${qs({ q, max_rating: lowOnly ? 2 : "", vendor_id: vendorId, page, per_page: PER_PAGE })}`);
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [q, lowOnly, vendorId, page]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (r) => {
    const ok = await confirm({
      title: "Delete this review?",
      message: `The ${r.rating_value}★ review by ${r.author_name} on ${r.vendor_name || "this vendor"} will be removed and the vendor's average rating recalculated.`,
      confirmLabel: "Delete review",
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await adminFetch(`/reviews/${r.id}`, { method: "DELETE" });
      toast.success(res.message || "Review deleted");
      if (data.reviews.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Search review text, author or vendor..." />
        <label className="admin-check px-2">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />≤ 2★ only
        </label>
        {!canSeePersonalData(admin) && <span className="text-xs text-neutral-500 px-2">Reviewer emails and IPs are only shown to roles that can see user data.</span>}
        {vendorFilter && (
          <span className="admin-badge brand !text-sm !py-1">
            Vendor: {vendorFilter.name}
            <button type="button" onClick={clearVendor} className="ml-1 flex" aria-label="Clear vendor filter">
              <X size={13} />
            </button>
          </span>
        )}
      </div>

      <ErrorBanner message={error} onRetry={load} />

      {loading && data.reviews.length === 0 ? (
        <Loading label="Loading reviews..." />
      ) : data.reviews.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={MessageSquareText} title="No reviews found" message={q || lowOnly || vendorFilter ? "Try changing the filters." : "Reviews written on the website and app will appear here."} />
        </div>
      ) : (
        <>
          <div className="admin-table-container" style={{ opacity: loading ? 0.6 : 1 }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Author</th>
                  <th>Date</th>
                  {canWrite && <th className="actions"></th>}
                </tr>
              </thead>
              <tbody>
                {data.reviews.map((r) => (
                  <tr key={r.id}>
                    <td style={{ minWidth: 160 }}>
                      <a href={`/vendor/${r.vendor_id}`} target="_blank" rel="noreferrer" className="font-semibold text-neutral-900 hover:text-brand-600 inline-flex items-center gap-1">
                        {r.vendor_name || `Vendor #${r.vendor_id}`} <ExternalLink size={11} className="text-neutral-400" />
                      </a>
                      <div className="text-xs text-neutral-500">{r.city_name || ""}</div>
                    </td>
                    <td>
                      <span className={`font-semibold whitespace-nowrap ${r.rating_value <= 2 ? "text-rose-600" : "text-amber-600"}`}>★ {r.rating_value}</span>
                    </td>
                    <td style={{ minWidth: 260, maxWidth: 480 }}>
                      {r.review_text ? <div className="text-sm text-neutral-700 whitespace-pre-line line-clamp-4">{r.review_text}</div> : <span className="text-neutral-400 italic text-xs">Rating only</span>}
                    </td>
                    <td style={{ minWidth: 150 }}>
                      <div className="font-medium">{r.author_name}</div>
                      {r.user_email && <div className="text-xs text-neutral-500">{r.user_email}</div>}
                      {!r.user_id && r.user_ip && <div className="text-[11px] text-neutral-400">Guest · {r.user_ip}</div>}
                    </td>
                    <td className="text-neutral-500 text-xs whitespace-nowrap" title={formatDateTime(r.created_at)}>
                      {formatDate(r.created_at)}
                    </td>
                    {canWrite && (
                      <td className="actions">
                        <button type="button" className="admin-btn admin-btn-ghost admin-icon-btn !text-rose-600" title="Delete review" onClick={() => remove(r)}>
                          <Trash2 size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pages={data.pages} total={data.total} perPage={data.per_page || PER_PAGE} onChange={setPage} noun="reviews" />
        </>
      )}
    </>
  );
}

function RatingSummary({ onShowReviews }) {
  const toast = useToast();
  const confirm = useConfirm();
  const canFixRatings = useCan("vendors");
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState(null);

  /** POST /vendors/<id>/recalculate-rating - replaces imported/seeded numbers with the real average. */
  const recalculate = async (r) => {
    const ok = await confirm({
      title: `Recalculate ${r.name}'s rating?`,
      message: "The rating is recomputed from reviews written on HungryBird. Imported or seeded numbers are discarded; with no reviews the vendor shows no rating.",
      confirmLabel: "Recalculate",
    });
    if (!ok) return;
    setBusyId(r.id);
    try {
      const res = await adminFetch(`/vendors/${r.id}/recalculate-rating`, { method: "POST" });
      const v = res.vendor || res;
      setRatings((list) => list.map((x) => (x.id === r.id ? { ...x, avg_rating: v.avg_rating ?? null, total_ratings: v.total_ratings ?? 0 } : x)));
      toast.success(res.message || "Rating recalculated from real reviews");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch("/ratings");
      setRatings(res.ratings || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return ratings;
    return ratings.filter((r) => [r.name, r.city_name, r.cuisine_type].filter(Boolean).some((v) => v.toLowerCase().includes(q)));
  }, [ratings, search]);

  return (
    <>
      <div className="admin-toolbar">
        <SearchInput value={search} onChange={setSearch} placeholder="Filter by vendor, city or cuisine..." />
        <span className="text-xs text-neutral-500 px-2">{ratings.length} vendors with ratings</span>
      </div>
      <div className="admin-note info">
        <Info size={16} className="shrink-0 mt-0.5" />
        <span>Some imported or seeded vendors carry ratings that didn&apos;t come from HungryBird reviews. {canFixRatings ? "Use Recalculate to reset a vendor to its real community rating." : "Someone who manages vendors can recalculate them from real reviews."}</span>
      </div>
      <ErrorBanner message={error} onRetry={load} />
      {loading ? (
        <Loading label="Loading ratings..." />
      ) : filtered.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Star} title="No rated vendors" />
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th>City</th>
                <th>Cuisine</th>
                <th>Average</th>
                <th className="num">Ratings</th>
                <th className="actions"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.name}</td>
                  <td className="text-neutral-600">{r.city_name || "—"}</td>
                  <td className="text-neutral-600">{r.cuisine_type || "—"}</td>
                  <td>
                    <Stars value={r.avg_rating} />
                  </td>
                  <td className="num">{r.total_ratings}</td>
                  <td className="actions">
                    <div className="admin-actions">
                      {canFixRatings && (
                        <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" disabled={busyId === r.id} onClick={() => recalculate(r)} title="Recalculate from real reviews">
                          <Calculator size={14} /> Recalculate
                        </button>
                      )}
                      <button type="button" className="admin-btn admin-btn-sm" onClick={() => onShowReviews({ id: r.id, name: r.name })}>
                        View reviews
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function SiteReviews() {
  const toast = useToast();
  const confirm = useConfirm();
  const canWrite = useCan("reviews");
  // New testimonials arrive as "pending" and need approval, so that's the useful default view.
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminFetch(`/site-reviews?status=${status}`);
      setItems(res.site_reviews || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const setReviewStatus = async (r, next) => {
    try {
      const res = await adminFetch(`/site-reviews/${r.id}`, { method: "PUT", body: { status: next } });
      toast.success(res.message || `Review ${next}`);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (r) => {
    const ok = await confirm({ title: "Delete testimonial?", message: `"${(r.review_text || "").slice(0, 120)}" by ${r.author_name || "Anonymous"} will be permanently deleted.`, confirmLabel: "Delete", danger: true });
    if (!ok) return;
    try {
      const res = await adminFetch(`/site-reviews/${r.id}`, { method: "DELETE" });
      toast.success(res.message || "Testimonial deleted");
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <>
      <div className="admin-toolbar">
        <div className="admin-segmented">
          {["pending", "approved", "rejected", "all"].map((s) => (
            <button key={s} type="button" className={status === s ? "active" : ""} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-xs text-neutral-500 px-2">New testimonials wait here until someone approves them. Only approved ones can appear on the website.</span>
      </div>
      <ErrorBanner message={error} onRetry={load} />
      {loading ? (
        <Loading label="Loading testimonials..." />
      ) : items.length === 0 ? (
        <div className="admin-card">
          <EmptyState icon={Quote} title={`No ${status === "all" ? "" : status} testimonials`} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((r) => (
            <div key={r.id} className="admin-card !mb-0 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-neutral-900">{r.author_name || "Anonymous"}</div>
                  <div className="text-xs text-neutral-500">
                    {formatDate(r.created_at)} {r.rating_value ? <span className="text-amber-600 font-semibold ml-1">★ {r.rating_value}</span> : null}
                  </div>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="text-sm text-neutral-700 m-0 whitespace-pre-line">{r.review_text}</p>
              {canWrite && (
                <div className="flex flex-wrap gap-2 pt-3 border-t border-neutral-100 mt-auto">
                  {r.status !== "approved" && (
                    <button type="button" className="admin-btn admin-btn-success admin-btn-sm" onClick={() => setReviewStatus(r, "approved")}>
                      <CircleCheck size={14} /> Approve
                    </button>
                  )}
                  {r.status !== "rejected" && (
                    <button type="button" className="admin-btn admin-btn-danger-soft admin-btn-sm" onClick={() => setReviewStatus(r, "rejected")}>
                      <CircleX size={14} /> Reject
                    </button>
                  )}
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm ml-auto" onClick={() => remove(r)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
