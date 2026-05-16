// Auth client — talks to the parent portal. Phase 3 ships the
// HTTP surface; the actual `/auth/me` + `/auth/logout` endpoints land
// with Phase 7A on the FastAPI backend. Until then, `fetchCurrentUser`
// returns null (treated as guest) so solo / offline play keeps working.

import { PORTAL_CONFIG } from '../core/constants';
import type { User } from '../core/types';

export async function fetchCurrentUser(signal?: AbortSignal): Promise<User | null> {
  try {
    const res = await fetch(PORTAL_CONFIG.AUTH_ENDPOINT, {
      credentials: 'include',
      signal,
    });
    if (res.status === 401) return null;
    if (!res.ok) throw new Error(`auth fetch failed: ${res.status}`);
    const data = await res.json();
    // Accept either `{ id, email, displayName, avatarUrl }` or
    // `{ user: {...} }` — defensive against backend response shape.
    const u = (data?.user ?? data) as Partial<User>;
    if (!u || !u.id || !u.email) return null;
    return {
      id: String(u.id),
      email: String(u.email),
      displayName: String(u.displayName ?? u.email),
      avatarUrl: u.avatarUrl ? String(u.avatarUrl) : undefined,
    };
  } catch (err) {
    if ((err as Error).name === 'AbortError') return null;
    // Network / CORS / DNS — degrade to guest so the game stays playable.
    // The error is logged once so ops can spot a misconfigured AUTH_ENDPOINT
    // without the UI blowing up.
    console.warn('fetchCurrentUser failed:', err);
    return null;
  }
}

export async function logout(signal?: AbortSignal): Promise<void> {
  try {
    await fetch(PORTAL_CONFIG.LOGOUT_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      signal,
    });
  } catch (err) {
    if ((err as Error).name === 'AbortError') return;
    console.warn('logout request failed:', err);
  }
}
