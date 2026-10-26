"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { resolveHoliday, type HolidayRule } from "./calendar";
import { getHolidayScope, HOLIDAY_PREFERENCE_KEY, parseHolidayPreference } from "./policy";

type HolidayState = {
  ready: boolean; enabled: boolean; active: HolidayRule | null;
  scope: "home" | "page" | "none"; visible: boolean; toggle: () => void;
};
const HolidayContext = createContext<HolidayState | null>(null);

export function HolidayProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState({ ready: false, enabled: true, active: null as HolidayRule | null, visible: true });

  useEffect(() => {
    let disposed = false;
    let enabled = true;
    try { enabled = parseHolidayPreference(localStorage.getItem(HOLIDAY_PREFERENCE_KEY)); } catch { /* Optional storage. */ }
    let interval: ReturnType<typeof setInterval> | undefined;
    function refresh() {
      setState((previous) => ({ ...previous, active: resolveHoliday(new Date()), visible: !document.hidden }));
    }
    function visibility() {
      clearInterval(interval);
      refresh();
      if (!document.hidden) interval = setInterval(refresh, 60_000);
    }
    function storage(event: StorageEvent) {
      if (event.key !== HOLIDAY_PREFERENCE_KEY && event.key !== null) return;
      // Ignore sessionStorage and synthetic events for unrelated storage areas.
      try { if (event.storageArea && event.storageArea !== localStorage) return; } catch { return; }
      setState((previous) => ({ ...previous, enabled: parseHolidayPreference(event.key === null ? null : event.newValue) }));
    }
    // Hydrate browser-only preference after the initial matching server/client render.
    void Promise.resolve().then(() => {
      if (!disposed) setState({ ready: true, enabled, active: resolveHoliday(new Date()), visible: !document.hidden });
    });
    if (!document.hidden) interval = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("storage", storage);
    return () => {
      disposed = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("storage", storage);
    };
  }, []);

  function toggle() {
    const enabled = !state.enabled;
    try { localStorage.setItem(HOLIDAY_PREFERENCE_KEY, enabled ? "on" : "off"); } catch { /* Keep the in-memory choice. */ }
    setState((previous) => ({ ...previous, enabled }));
  }

  return <HolidayContext.Provider value={{ ...state, scope: getHolidayScope(pathname ?? "/"), toggle }}>{children}</HolidayContext.Provider>;
}

export function useHoliday(): HolidayState {
  const value = useContext(HolidayContext);
  if (!value) throw new Error("Holiday components require HolidayProvider");
  return value;
}
