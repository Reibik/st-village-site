import type { MonitorStatus } from "@/src/server/status/types";
import type { LiveStatusIncident, LiveStatusServer, LiveStatusSummary } from "@/src/server/status/live-types";

const DEFAULT_SUMMARY_URL = "https://status.stvillage.ru/api/summary";
const MAX_RESPONSE_SIZE = 750_000;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as UnknownRecord : {};
}

function cleanText(value: unknown, fallback = "", maxLength = 160) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : fallback;
}

function finiteNumber(value: unknown, minimum = 0, maximum = Number.MAX_SAFE_INTEGER): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.min(maximum, Math.max(minimum, parsed)) : null;
}

function wholeNumber(value: unknown, minimum = 0, maximum = 10_000) {
  return Math.round(finiteNumber(value, minimum, maximum) ?? minimum);
}

function timestampToIso(value: unknown): string | null {
  const seconds = finiteNumber(value, 0);
  if (seconds === null) return null;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function serverStatus(source: UnknownRecord): MonitorStatus {
  if (source.maintenance === true) return "maintenance";
  return source.online === true ? "operational" : "outage";
}

function overallStatus(online: number, total: number, maintenance: number): MonitorStatus {
  if (total === 0) return "unknown";
  if (online === 0) return "outage";
  if (online < total) return "degraded";
  if (maintenance > 0) return "maintenance";
  return "operational";
}

function sanitizeServer(value: unknown): LiveStatusServer | null {
  const source = record(value);
  const id = cleanText(source.sid, "", 80);
  if (!id) return null;
  const latency = finiteNumber(source.latencyMs, 0, 60_000);
  return {
    id,
    name: cleanText(source.name, "Сервер", 100),
    countryCode: cleanText(source.cc, "", 2).toUpperCase(),
    status: serverStatus(source),
    uptime30: finiteNumber(source.uptime30, 0, 100),
    latencyMs: latency === 0 ? null : latency,
    members: wholeNumber(source.members),
    membersOnline: wholeNumber(source.membersOnline),
  };
}

function sanitizeIncident(value: unknown): LiveStatusIncident | null {
  const source = record(value);
  const title = cleanText(source.title, "", 180);
  if (!title) return null;
  const updates = Array.isArray(source.updates) ? source.updates.map(record) : [];
  const latest = updates.at(-1);
  const severityValue = cleanText(source.severity, "info", 20);
  const severity = (["info", "minor", "major", "critical"] as const).find((item) => item === severityValue) ?? "info";
  const affected = (Array.isArray(source.affected) ? source.affected : []).slice(0, 30).map((item) => {
    const affectedItem = record(item);
    return { name: cleanText(affectedItem.name, "Сервер", 100), countryCode: cleanText(affectedItem.cc, "", 2).toUpperCase() };
  });
  return {
    id: String(source.id ?? title).slice(0, 100),
    title,
    severity,
    status: cleanText(source.status, "investigating", 40),
    startedAt: timestampToIso(source.startedTs),
    affected,
    latestUpdate: latest ? cleanText(latest.body, "", 300) || null : null,
  };
}

export function normalizeLiveStatus(payload: unknown): LiveStatusSummary {
  const source = record(payload);
  const totalsSource = record(source.totals);
  const servers = (Array.isArray(source.servers) ? source.servers : []).slice(0, 100).map(sanitizeServer).filter((item): item is LiveStatusServer => item !== null);
  const incidents = (Array.isArray(source.incidents) ? source.incidents : []).slice(0, 20).map(sanitizeIncident).filter((item): item is LiveStatusIncident => item !== null);
  const total = wholeNumber(totalsSource.total, 0, 100) || servers.length;
  const online = Math.min(total, wholeNumber(totalsSource.online, 0, 100));
  const maintenance = Math.min(total, wholeNumber(totalsSource.maintenance, 0, 100));
  const pollInterval = wholeNumber(source.pollInterval, 30, 600);
  return {
    status: overallStatus(online, total, maintenance),
    generatedAt: timestampToIso(source.lastCheckTs) ?? new Date().toISOString(),
    refreshAfterSeconds: Math.min(60, pollInterval),
    totals: { online, total, maintenance, uptime30: finiteNumber(totalsSource.uptime30, 0, 100), averageLatencyMs: finiteNumber(totalsSource.avgLatency, 0, 60_000) },
    servers,
    incidents,
  };
}

export async function fetchLiveStatus(): Promise<LiveStatusSummary> {
  const url = process.env.LIVE_STATUS_API_URL?.trim() || DEFAULT_SUMMARY_URL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { headers: { accept: "application/json", "user-agent": "ST-VILLAGE-Site/1.1" }, signal: controller.signal });
    if (!response.ok) throw new Error(`Live status returned ${response.status}`);
    const body = await response.text();
    if (body.length > MAX_RESPONSE_SIZE) throw new Error("Live status response is too large");
    const summary = normalizeLiveStatus(JSON.parse(body) as unknown);
    if (summary.servers.length === 0) throw new Error("Live status response has no servers");
    return summary;
  } finally {
    clearTimeout(timeout);
  }
}
