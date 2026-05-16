// Auth store — holds the current user (or null = guest) plus a load
// status flag for "show spinner during initial /auth/me probe".
//
// NOT persisted: user info comes from the cookie each session via
// `fetchCurrentUser`. Persisting would let stale identity survive a
// real logout on the parent portal.

import { create } from 'zustand';
import { fetchCurrentUser, logout as apiLogout } from '../lib/auth';
import type { User } from '../core/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: User | null;
  status: AuthStatus;
  /** Bootstrapped on app mount. Re-callable for "refresh user" after
   * the portal might have updated profile fields. */
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  /** Sync setter — the (future) Phase 7A login flow will call this
   * after a successful credential exchange. */
  setUser: (u: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'loading',

  fetchUser: async () => {
    set({ status: 'loading' });
    const u = await fetchCurrentUser();
    set({ user: u, status: u ? 'authenticated' : 'unauthenticated' });
  },

  logout: async () => {
    await apiLogout();
    set({ user: null, status: 'unauthenticated' });
  },

  setUser: (u) => {
    set({ user: u, status: u ? 'authenticated' : 'unauthenticated' });
  },
}));
