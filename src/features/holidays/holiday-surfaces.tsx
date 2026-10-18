"use client";
import { useHoliday } from "./holiday-provider";
import { HolidayScene } from "./holiday-scene";
import { HolidayBoundary } from "./holiday-boundary";

function Surface({ surface }: { surface: "logo" | "hero" | "edges" }) {
  const { ready, enabled, active, scope, visible } = useHoliday();
  if (!ready || !enabled || !active || scope === "none" || (surface !== "logo" && scope !== "home")) return null;
  return <HolidayBoundary resetKey={`${active.theme}:${surface}`}><HolidayScene theme={active.theme} surface={surface} paused={!visible} /></HolidayBoundary>;
}
export function HolidayLogoAccent() { return <Surface surface="logo" />; }
export function HolidayHeroAccent() { return <Surface surface="hero" />; }
export function HolidayEdgeEffects() { return <Surface surface="edges" />; }
