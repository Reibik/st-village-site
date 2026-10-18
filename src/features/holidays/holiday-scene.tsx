"use client";
import type { HolidayTheme } from "./calendar";
import type { CSSProperties } from "react";

function Symbol({ kind }: { kind: "snow" | "star" | "pumpkin" | "satellite" }) {
  return <svg viewBox="0 0 32 32" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
    {kind === "snow" && <path d="M16 3v26M5 9l22 14M5 23L27 9M12 6l4 4 4-4M12 26l4-4 4 4M6 13l5-1-1-5M22 25l-1-5 5-1M6 19l5 1-1 5M22 7l-1 5 5 1" />}
    {kind === "star" && <path d="m16 3 3.5 9.5L29 16l-9.5 3.5L16 29l-3.5-9.5L3 16l9.5-3.5Z" fill="currentColor" fillOpacity=".12" />}
    {kind === "pumpkin" && <><path d="M16 9c-10-5-16 11-8 17 3 3 6 1 8 1s5 2 8-1c8-6 2-22-8-17Z" fill="currentColor" fillOpacity=".12" /><path d="M16 9c-3 6-3 12 0 18 3-6 3-12 0-18Zm0 0c-1-4 1-5 4-6M9 18l3-2m8 0 3 2m-11 4q4 3 8 0" /></>}
    {kind === "satellite" && <><path d="m13 10 9 9-5 5-9-9Zm-3 1L6 7l-5 5 4 4Zm11 10 4 4 5-5-4-4ZM5 8l6 6m12 5 6 6M19 7a6 6 0 0 1 6 6m-6-3a3 3 0 0 1 3 3M15 25l-3 4" /><path d="m11 13 9 9" strokeWidth="3" /></>}
  </svg>;
}

const heroPoints = [[77, 17], [13, 30], [83, 54], [25, 13], [52, 8], [7, 59]] as const;

export function HolidayScene({ theme, surface, paused }: { theme: HolidayTheme; surface: "logo" | "hero" | "edges"; paused: boolean }) {
  if (surface === "edges" && theme === "space") return null;
  if (surface !== "logo") {
    const count = surface === "hero" ? 6 : 12;
    return <div className={`holiday-scene holiday-${theme} holiday-${surface}`} data-holiday-theme={theme} data-holiday-surface={surface} data-paused={paused} aria-hidden="true">
      {surface === "hero" && <span className="holiday-halo" />}
      {Array.from({ length: count }, (_, index) => {
        const kind = theme === "winter" ? "snow" : theme === "space" ? (index === 0 ? "satellite" : "star") : index % 3 === 0 ? "pumpkin" : "star";
        const point = surface === "hero" ? heroPoints[index] : null;
        const style = { "--holiday-x": `${point?.[0] ?? 0}%`, "--holiday-y": `${point?.[1] ?? 8 + Math.floor(index / 2) * 14}%`, "--holiday-delay": `${-index * 1.7}s`, "--holiday-duration": `${14 + index % 4 * 3}s` } as CSSProperties;
        return <span key={index} className={`holiday-particle holiday-symbol-${kind} ${index < (surface === "hero" ? 4 : 2) ? "holiday-mobile" : ""} ${index % 2 ? "holiday-right" : "holiday-left"}`} style={style} data-holiday-particle="" ><Symbol kind={kind} /></span>;
      })}
    </div>;
  }
  return <span className={`holiday-scene holiday-${theme} holiday-logo`} data-holiday-theme={theme} data-holiday-surface={surface} data-paused={paused} aria-hidden="true">
    {theme === "winter" ? <svg viewBox="0 0 64 24" focusable="false"><path d="M2 4Q32 30 62 4" fill="none" stroke="currentColor" strokeWidth="1" />{[8,20,32,44,56].map((x, i) => <circle key={x} cx={x} cy={i === 0 || i === 4 ? 8 : i === 2 ? 16 : 13} r="2" fill="currentColor" />)}</svg> : <Symbol kind={theme === "space" ? "star" : "pumpkin"} />}
  </span>;
}
