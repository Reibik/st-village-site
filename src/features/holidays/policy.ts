export const HOLIDAY_PREFERENCE_KEY = "st-holiday-effects";

export function parseHolidayPreference(raw: string | null): boolean { return raw !== "off"; }

export function getHolidayScope(pathname: string): "home" | "page" | "none" {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/preview" || path.startsWith("/preview/") || path === "/status/management" || path.startsWith("/status/management/")) return "none";
  return path === "/" ? "home" : "page";
}

export function canPreviewHolidays(nodeEnv: string | undefined, siteUrl: string): boolean {
  return nodeEnv === "development" || siteUrl.replace(/\/+$/, "") === "https://dev.stvillage.ru";
}
