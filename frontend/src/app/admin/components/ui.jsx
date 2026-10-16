"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ImageOff, Inbox, Lock, RefreshCw, Search, ShieldX, TriangleAlert } from "lucide-react";
import { ROLE_LABELS } from "../lib/api";
import { useAdmin, useCan } from "../lib/hooks";

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="admin-page-header">
      <div className="min-w-0">
        <h1>{title}</h1>
        {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="admin-page-actions">{children}</div>}
    </div>
  );
}

export function Spinner({ small = false }) {
  return <span className={`admin-spinner ${small ? "sm" : ""}`} aria-hidden="true" />;
}

export function Loading({ label = "Loading..." }) {
  return (
    <div className="admin-loading">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", message, children }) {
  return (
    <div className="admin-empty">
      <Icon size={36} />
      <h3>{title}</h3>
      {message && <p>{message}</p>}
      {children && <div className="mt-4 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

/** `message` may be a string or an Error from adminFetch; a 403 renders a friendly no-access note. */
export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;
  const text = typeof message === "string" ? message : message.message || "Something went wrong.";
  if (typeof message === "object" && message.status === 403) {
    return (
      <div className="admin-note" role="alert">
        <Lock size={16} className="shrink-0 mt-0.5" />
        <span>You don&apos;t have access to this information with your current role. {text !== "You don't have access to this." && <span className="text-amber-800/80">({text})</span>}</span>
      </div>
    );
  }
  return (
    <div className="admin-error" role="alert">
      <TriangleAlert size={18} className="shrink-0" />
      <span className="flex-1 min-w-0">{text}</span>
      {onRetry && (
        <button type="button" className="admin-btn admin-btn-sm" onClick={onRetry}>
          <RefreshCw size={14} /> Retry
        </button>
      )}
    </div>
  );
}

/** Full-page state for a page the current role can't open. */
export function NoAccess({ title = "You don't have access to this page", message, children }) {
  const { admin } = useAdmin();
  return (
    <div className="admin-card admin-no-access">
      <div className="admin-empty">
        <ShieldX size={40} />
        <h3>{title}</h3>
        <p>
          {message || (
            <>
              You are signed in as <strong>{ROLE_LABELS[admin?.role] || admin?.role || "staff"}</strong>. Ask a Super Admin if you need access to this area.
            </>
          )}
        </p>
        <div className="mt-4 flex justify-center gap-2 flex-wrap">
          {children || (
            <Link href="/admin" className="admin-btn">
              Back to dashboard
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shown when the current role can read but not change this area. */
export function ReadOnlyNote({ area, children }) {
  const { admin } = useAdmin();
  const allowed = useCan(area);
  if (allowed || !admin) return null;
  return (
    <div className="admin-note">
      <Lock size={16} className="shrink-0 mt-0.5" />
      <span>
        {children || (
          <>
            You are signed in as <strong>{ROLE_LABELS[admin.role] || admin.role}</strong>, which can view this page but not change it.
          </>
        )}
      </span>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={value === t.value}
            className={`admin-tab ${value === t.value ? "active" : ""}`}
            onClick={() => onChange(t.value)}
          >
            {Icon && <Icon size={16} />}
            {t.label}
            {t.count !== undefined && t.count !== null && <span className="admin-tab-count">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Pagination({ page, pages, total, perPage, onChange, noun = "items" }) {
  if (!total) return null;
  const from = (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);
  return (
    <div className="admin-pager">
      <span>
        Showing <strong className="text-neutral-800">{from}–{to}</strong> of <strong className="text-neutral-800">{total}</strong> {noun}
      </span>
      <div className="admin-pager-controls">
        <button type="button" className="admin-btn admin-btn-sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={14} /> Prev
        </button>
        <span className="px-1">
          Page {page} of {pages}
        </span>
        <button type="button" className="admin-btn admin-btn-sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export function Field({ label, required, hint, className = "", children }) {
  return (
    <div className={className}>
      {label && (
        <label className="admin-label">
          {label} {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && <div className="admin-hint">{hint}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="admin-search">
      <Search size={16} />
      <input type="search" className="admin-input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function Switch({ checked, onChange, disabled = false, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`admin-switch ${checked ? "on" : ""}`}
      onClick={() => onChange?.(!checked)}
    />
  );
}

/** Image with a graceful fallback when the URL is empty or broken. */
export function Thumb({ src, alt = "", size = 44, className = "" }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (!src || failedSrc === src) {
    return (
      <div className={`admin-thumb ${className}`} style={{ width: size, height: size }}>
        <ImageOff size={Math.round(size * 0.4)} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={`admin-thumb ${className}`} style={{ width: size, height: size }} onError={() => setFailedSrc(src)} />
  );
}

/** Larger preview used next to image_url inputs. */
export function ImagePreview({ src, height = 140 }) {
  const [failedSrc, setFailedSrc] = useState(null);
  const failed = failedSrc === src;
  return (
    <div
      className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center overflow-hidden text-xs text-neutral-400"
      style={{ height }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Preview" className="w-full h-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        <span className="flex flex-col items-center gap-1">
          <ImageOff size={20} />
          {src ? "Image could not be loaded" : "Paste an image URL to preview"}
        </span>
      )}
    </div>
  );
}

export function StatusBadge({ status, children }) {
  return <span className={`admin-badge ${status || "neutral"}`}>{children || status || "—"}</span>;
}

export function Stars({ value }) {
  if (value === null || value === undefined || value === "") return <span className="text-neutral-400">—</span>;
  const n = Number(value);
  return (
    <span className="inline-flex items-center gap-1 font-semibold text-amber-600 whitespace-nowrap">
      ★ {Number.isFinite(n) ? n.toFixed(1) : value}
    </span>
  );
}
