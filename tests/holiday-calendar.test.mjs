import assert from "node:assert/strict";
import test from "node:test";
import { HOLIDAY_RULES, resolveHoliday } from "../src/features/holidays/calendar.ts";
import { canPreviewHolidays, getHolidayScope, parseHolidayPreference } from "../src/features/holidays/policy.ts";

for (const [date, theme] of [
  ["2026-10-24T20:59:59Z", null], ["2026-10-24T21:00:00Z", "halloween"],
  ["2026-11-01T20:59:59Z", "halloween"], ["2026-11-01T21:00:00Z", null],
  ["2026-12-19T21:00:00Z", "winter"], ["2026-12-31T21:00:00Z", "winter"],
  ["2027-01-10T20:59:59Z", "winter"], ["2027-01-10T21:00:00Z", null],
  ["2026-04-09T20:59:59Z", null], ["2026-04-09T21:00:00Z", "space"],
  ["2026-04-12T20:59:59Z", "space"], ["2026-04-12T21:00:00Z", null],
]) test(`Moscow calendar ${date} selects ${theme}`, () => assert.equal(resolveHoliday(new Date(date))?.theme ?? null, theme));

test("invalid dates and broken Intl fail closed", () => {
  assert.equal(resolveHoliday(new Date(NaN)), null);
  const original = Intl.DateTimeFormat;
  try { Intl.DateTimeFormat = function () { throw new Error("unavailable"); }; assert.equal(resolveHoliday(new Date()), null); }
  finally { Intl.DateTimeFormat = original; }
});
const fixture = { ...HOLIDAY_RULES[0], start: {month: 2, day:29}, end: {month:2,day:29} };
test("leap day never rolls forward to March", () => {
  assert.equal(resolveHoliday(new Date("2028-02-29T12:00:00Z"), [fixture])?.id, "winter");
  assert.equal(resolveHoliday(new Date("2027-03-01T12:00:00Z"), [fixture]), null);
});
test("priority and ASCII tie are deterministic without mutating rules", () => {
  const a = {...fixture, id:"a", priority:10}; const b = {...fixture,id:"b",priority:10};
  const now = new Date("2028-02-29T12:00:00Z");
  assert.equal(resolveHoliday(now, [b,a])?.id, "a");
  assert.equal(resolveHoliday(now, [a,b])?.id, "a");
  assert.equal(resolveHoliday(now, [a,{...b,priority:11}])?.id, "b");
  assert.equal(resolveHoliday(now, [a,a]), null);
});
test("malformed and disabled rules do not activate", () => {
  for (const rule of [null, {...fixture,enabled:false}, {...fixture,priority:NaN}, {...fixture,theme:"bad"}, {...fixture,id:""}, {...fixture,start:{month:2,day:30}}, {...fixture,end:{month:13,day:1}}]) {
    assert.equal(resolveHoliday(new Date("2028-02-29T12:00:00Z"), [rule]), null);
  }
});
test("preference defaults and service route exclusions", () => {
  for (const raw of [null,"on","invalid"]) assert.equal(parseHolidayPreference(raw),true);
  assert.equal(parseHolidayPreference("off"),false);
  for (const path of ["/status/management", "/status/management/", "/status/management/log", "/preview/holidays"]) assert.equal(getHolidayScope(path),"none");
  assert.equal(getHolidayScope("/"),"home");
  for (const path of ["/news", "/status", "/pricing", "/connect", "/support", "/release", "/legal/privacy", "/legal/terms", "/login", "/coupons"]) assert.equal(getHolidayScope(path),"page");
});
test("preview trusts configuration only and rejects lookalike origins", () => {
  assert.equal(canPreviewHolidays("development","https://stvillage.top"),true);
  assert.equal(canPreviewHolidays("production","https://dev.stvillage.ru"),true);
  for (const url of ["https://stvillage.top", "http://dev.stvillage.ru", "https://dev.stvillage.ru.evil", "https://user@dev.stvillage.ru", "https://dev.stvillage.ru:123", "https://dev.stvillage.ru/path"]) assert.equal(canPreviewHolidays("production",url),false);
});
