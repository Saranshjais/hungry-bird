// Server-side reads (metadata, sitemap). Never throws: returns null when the API is slow or down,
// so a sleeping backend can't break or stall page rendering and builds.
import { API_URL } from './api';

export async function serverGet(path, { revalidate = 300, timeout = 6000 } = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeout),
      ...(revalidate === 0 ? { cache: 'no-store' } : { next: { revalidate } }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
