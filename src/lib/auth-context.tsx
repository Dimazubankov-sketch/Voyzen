"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { emailFor, normalizeUsername } from "./accounts";

export interface VoyzenUser {
  name: string;
  handle: string;
  email: string;
  phone?: string;
  avatar?: string;
  banner?: string;
  bio?: string;
  location?: string;
  website?: string;
  following: number;
  followers: number;
  /** Voyzen Plus subscriber. */
  premium?: boolean;
  /** Verified badge (comes with Plus). */
  verified?: boolean;
  /** Plus plan expiry, epoch ms. */
  premiumUntil?: number;
}

interface AuthValue {
  user: VoyzenUser | null;
  ready: boolean;
  /** Every account signed in on this device, for the account switcher. */
  accounts: VoyzenUser[];
  /** Drop straight into the app with an already-verified account. */
  signIn: (account: { username: string; name: string; phone?: string }) => void;
  signUp: (name: string, username: string, phone: string) => void;
  signOut: () => void;
  /** Switch the active account to one already in `accounts`. */
  switchAccount: (handle: string) => void;
  updateUser: (patch: Partial<VoyzenUser>) => void;
  /** Subscribe to Voyzen Plus (adds the verified badge). */
  subscribe: (plan: "month" | "year") => void;
  cancelSubscription: () => void;
}

const STORAGE_KEY = "voyzen.user";
const SESSIONS_KEY = "voyzen.sessions";
const AuthContext = createContext<AuthValue | null>(null);

function readSessions(): VoyzenUser[] {
  try {
    const raw = window.localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as VoyzenUser[]) : [];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VoyzenUser | null>(null);
  const [accounts, setAccounts] = useState<VoyzenUser[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const sessions = readSessions();
      const raw = window.localStorage.getItem(STORAGE_KEY);
      let active: VoyzenUser | null = null;
      if (raw) {
        // Sessions saved before these fields existed still need sane numbers.
        const saved = JSON.parse(raw) as Partial<VoyzenUser>;
        active = { following: 394, followers: 28300, ...saved } as VoyzenUser;
      }
      // Make sure the active account is always in the list.
      const merged = [...sessions];
      if (active && !merged.some((a) => a.handle === active!.handle)) merged.unshift(active);
      setAccounts(merged);
      setUser(active);
    } catch {
      /* ignore unavailable storage */
    }
    setReady(true);
  }, []);

  const persistActive = useCallback((next: VoyzenUser | null) => {
    setUser(next);
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  /** Add or replace an account in the session list (by handle) and activate it. */
  const enter = useCallback(
    (next: VoyzenUser) => {
      persistActive(next);
      setAccounts((prev) => {
        const merged = [next, ...prev.filter((a) => a.handle !== next.handle)];
        try {
          window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));
        } catch {
          /* ignore */
        }
        return merged;
      });
    },
    [persistActive],
  );

  const signIn = useCallback(
    ({ username, name, phone }: { username: string; name: string; phone?: string }) => {
      const handle = normalizeUsername(username);
      const existing = readSessions().find((a) => a.handle === handle);
      enter(
        existing ?? {
          name: name || "Voyzen User",
          handle,
          email: emailFor(username),
          phone,
          following: 394,
          followers: 28300,
        },
      );
    },
    [enter],
  );

  const signUp = useCallback(
    (name: string, username: string, phone: string) => {
      enter({
        name: name || "Voyzen User",
        handle: normalizeUsername(username),
        email: emailFor(username),
        phone,
        following: 0,
        followers: 0,
      });
    },
    [enter],
  );

  const switchAccount = useCallback(
    (handle: string) => {
      const found = accounts.find((a) => a.handle === handle);
      if (found) persistActive(found);
    },
    [accounts, persistActive],
  );

  // Signing out drops this account from the device and, if another remains,
  // switches to it; otherwise it returns to the auth screen.
  const signOut = useCallback(() => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.handle !== user?.handle);
      try {
        window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      persistActive(next[0] ?? null);
      return next;
    });
  }, [persistActive, user?.handle]);

  const updateUser = useCallback(
    (patch: Partial<VoyzenUser>) =>
      setUser((current) => {
        if (!current) return current;
        const next = { ...current, ...patch };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        setAccounts((prev) => {
          const merged = prev.map((a) => (a.handle === next.handle ? next : a));
          try {
            window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(merged));
          } catch {
            /* ignore */
          }
          return merged;
        });
        return next;
      }),
    [],
  );

  const subscribe = useCallback(
    (plan: "month" | "year") => {
      const days = plan === "year" ? 365 : 30;
      updateUser({ premium: true, verified: true, premiumUntil: Date.now() + days * 86_400_000 });
    },
    [updateUser],
  );

  const cancelSubscription = useCallback(() => {
    updateUser({ premium: false, verified: false, premiumUntil: undefined });
  }, [updateUser]);

  const value = useMemo(
    () => ({ user, ready, accounts, signIn, signUp, signOut, switchAccount, updateUser, subscribe, cancelSubscription }),
    [user, ready, accounts, signIn, signUp, signOut, switchAccount, updateUser, subscribe, cancelSubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
