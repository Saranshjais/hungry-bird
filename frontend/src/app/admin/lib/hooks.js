"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { can, canRead } from "./api";

/** Shared admin session state, provided by AdminAuthProvider. */
export const AdminContext = createContext({
  admin: null,
  counts: {},
  refreshCounts: () => {},
  refreshProfile: () => Promise.resolve(),
});

export function useAdmin() {
  return useContext(AdminContext);
}

/** true when the logged-in staff role may change things in `area`. */
export function useCan(area) {
  const { admin } = useAdmin();
  return can(area, admin);
}

/** true when the logged-in staff role may open/see `area` (from GET /me `permissions`). */
export function useCanRead(area) {
  const { admin } = useAdmin();
  return canRead(area, admin);
}

/**
 * Page number tied to a filter key: whenever the key (e.g. search + filters) changes,
 * the page falls back to 1 in the same render, so no stale page is ever requested.
 */
export function usePageFor(key) {
  const [state, setState] = useState({ key, page: 1 });
  const page = state.key === key ? state.page : 1;
  const setPage = useCallback((p) => setState({ key, page: p }), [key]);
  return [page, setPage];
}

export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
