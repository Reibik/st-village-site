"use client";
import { useHoliday } from "./holiday-provider";

export function HolidayToggle() {
  const { ready, enabled, toggle } = useHoliday();
  return <button className="holiday-toggle" type="button" disabled={!ready} aria-pressed={enabled} onClick={toggle}>
    <span aria-hidden="true">✧</span> Праздничное оформление: {enabled ? "включено" : "выключено"}
  </button>;
}
