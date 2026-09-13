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
import { translate, type Lang, type TranslationKey } from "./i18n";
import { haptic, setHapticsEnabled } from "@/utils/haptics";

interface Toggles {
  push: boolean;
  readReceipts: boolean;
  /** Force the phone layout even on a wide screen. */
  mobileView: boolean;
  /** Vibrate on taps (Android). */
  haptics: boolean;
  /** Turn off animations and transitions. */
  reduceMotion: boolean;
  /** Enter sends a message; off = Enter is a newline. */
  enterToSend: boolean;
}

const DEFAULT_TOGGLES: Toggles = {
  push: true,
  readReceipts: true,
  mobileView: false,
  haptics: true,
  reduceMotion: false,
  enterToSend: true,
};

interface SettingsValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  toggles: Toggles;
  setToggle: (key: keyof Toggles, value: boolean) => void;
  /** True when the wide layout should render (viewport is wide AND not forced to mobile). */
  isDesktop: boolean;
  /** True when the viewport itself is wide, regardless of the mobile-view switch. */
  isWideScreen: boolean;
}

const STORAGE_KEY = "voyzen.settings";
const SettingsContext = createContext<SettingsValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [toggles, setToggles] = useState<Toggles>(DEFAULT_TOGGLES);
  const [isWideScreen, setIsWideScreen] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { lang?: Lang; toggles?: Partial<Toggles> };
        if (saved.lang) setLangState(saved.lang);
        if (saved.toggles) setToggles({ ...DEFAULT_TOGGLES, ...saved.toggles });
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Track the breakpoint in JS so the mobile-view switch can override it.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsWideScreen(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Reflect the reduce-motion toggle on <html> so a CSS rule can kill animations.
  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", toggles.reduceMotion);
  }, [toggles.reduceMotion]);

  // Keep the haptics module in step, and fire a tap buzz on any button/link.
  useEffect(() => {
    setHapticsEnabled(toggles.haptics);
  }, [toggles.haptics]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("button, a, [role='button'], input[type='checkbox'], label")) haptic(8);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const persist = useCallback((next: { lang: Lang; toggles: Toggles }) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      persist({ lang: l, toggles });
    },
    [persist, toggles],
  );

  const setToggle = useCallback(
    (key: keyof Toggles, value: boolean) => {
      const next = { ...toggles, [key]: value };
      setToggles(next);
      persist({ lang, toggles: next });
    },
    [lang, persist, toggles],
  );

  const t = useCallback((key: TranslationKey) => translate(lang, key), [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t,
      toggles,
      setToggle,
      isDesktop: isWideScreen && !toggles.mobileView,
      isWideScreen,
    }),
    [lang, setLang, t, toggles, setToggle, isWideScreen],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within <SettingsProvider>");
  return ctx;
}

/** Shorthand for components that only need the translator. */
export function useT() {
  return useSettings().t;
}

/** Whether to render the wide (desktop) layout. */
export function useIsDesktop() {
  return useSettings().isDesktop;
}

