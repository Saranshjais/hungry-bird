"use client";

// Shared, cached reads of small public lists (cities, categories) so the navbar, footer and pages
// make one request each per page load.

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

const cache = new Map(); // key -> { promise, data }

function cachedGet(key, path, pick) {
  const hit = cache.get(key);
  if (hit) return hit.promise;
  const promise = api(path, { auth: false, timeout: 20000 })
    .then((d) => {
      const data = pick(d);
      cache.set(key, { promise: Promise.resolve(data), data });
      return data;
    })
    .catch((e) => {
      cache.delete(key);
      throw e;
    });
  cache.set(key, { promise, data: undefined });
  return promise;
}

function useCachedList(key, path, pick) {
  const initial = cache.get(key)?.data;
  const [state, setState] = useState({ data: initial || [], loading: !initial, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    cachedGet(key, path, pick)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => setState({ data: [], loading: false, error }));
  }, [key, path, pick]);

  useEffect(() => {
    if (cache.get(key)?.data) return;
    load();
  }, [key, load]);

  return { ...state, reload: load };
}

const pickCities = (d) => (Array.isArray(d) ? d : (d && d.cities) || []).filter((c) => c && c.slug && c.is_active !== false);
const pickCategories = (d) => (Array.isArray(d) ? d : (d && d.categories) || []).filter((c) => c && c.slug && c.is_active !== false);

export function useCities() {
  const r = useCachedList('cities', '/api/cities', pickCities);
  return { cities: r.data, loading: r.loading, error: r.error, reload: r.reload };
}

export function useCategories() {
  const r = useCachedList('categories', '/api/categories', pickCategories);
  return { categories: r.data, loading: r.loading, error: r.error, reload: r.reload };
}
