export type HolidayTheme = "winter" | "space" | "halloween";
export type HolidayRule = {
  readonly id: string; readonly name: string;
  readonly start: { month: number; day: number }; readonly end: { month: number; day: number };
  readonly theme: HolidayTheme; readonly priority: number; readonly enabled: boolean;
};

export const HOLIDAY_RULES: readonly HolidayRule[] = [
  { id: "winter", name: "Зимние праздники", start: { month: 12, day: 20 }, end: { month: 1, day: 10 }, theme: "winter", priority: 100, enabled: true },
  { id: "space", name: "Дни космоса", start: { month: 4, day: 10 }, end: { month: 4, day: 12 }, theme: "space", priority: 80, enabled: true },
  { id: "halloween", name: "Хэллоуин", start: { month: 10, day: 25 }, end: { month: 11, day: 1 }, theme: "halloween", priority: 70, enabled: true },
];

function validDay(value: HolidayRule["start"]): boolean {
  if (!value || !Number.isInteger(value.month) || !Number.isInteger(value.day)) return false;
  const date = new Date(Date.UTC(2000, value.month - 1, value.day));
  return date.getUTCMonth() + 1 === value.month && date.getUTCDate() === value.day;
}

export function resolveHoliday(now: Date, rules: readonly HolidayRule[] = HOLIDAY_RULES): HolidayRule | null {
  try {
    if (!Number.isFinite(now.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Moscow", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
    const today = month * 100 + day;
    const counts = new Map<string, number>();
    for (const rule of rules) if (rule?.id) counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
    return rules.filter((rule) => {
      if (!rule || !rule.enabled || !/^[a-z0-9-]+$/.test(rule.id) || counts.get(rule.id) !== 1 || !Number.isFinite(rule.priority)
        || !["winter", "space", "halloween"].includes(rule.theme) || !validDay(rule.start) || !validDay(rule.end)) return false;
      const start = rule.start.month * 100 + rule.start.day;
      const end = rule.end.month * 100 + rule.end.day;
      return start <= end ? today >= start && today <= end : today >= start || today <= end;
    }).sort((a, b) => b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
  } catch { return null; }
}
