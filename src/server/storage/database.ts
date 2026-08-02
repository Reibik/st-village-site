import { schemaStatements } from "@/db/schema";
import type { StatusSnapshot } from "@/src/server/status/types";

type D1Result<T = Record<string, unknown>> = { results?: T[]; success?: boolean };
type D1Statement = {
  bind(...values: unknown[]): D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
};
type D1DatabaseLike = {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
};

export type HistoryRange = "24h" | "7d" | "30d";
export type HistoryPoint = {
  checkedAt: string;
  status: string;
  serviceAvailability: number;
  locationAvailability: number;
};
export type Incident = {
  id: string;
  title: string;
  summary: string;
  severity: "info" | "minor" | "major";
  status: "investigating" | "monitoring" | "resolved" | "scheduled";
  planned: boolean;
  affectedServices: string[];
  startsAt: string;
  resolvedAt: string | null;
};
export type PublicReview = {
  id: string;
  displayName: string;
  rating: number;
  text: string;
  createdAt: string;
};

let databasePromise: Promise<D1DatabaseLike | null> | null = null;
let schemaReady: Promise<void> | null = null;
const memorySamples: HistoryPoint[] = [];
const memoryReviews: PublicReview[] = [];
const memoryAlerts = new Map<string, string>();

async function loadDatabase(): Promise<D1DatabaseLike | null> {
  if (!databasePromise) {
    databasePromise = import("cloudflare:workers")
      .then((module) => ((module.env as { DB?: D1DatabaseLike }).DB ?? null))
      .catch(() => null);
  }
  return databasePromise;
}

async function getDatabase() {
  const database = await loadDatabase();
  if (!database) return null;
  if (!schemaReady) {
    schemaReady = database.batch(schemaStatements.map((statement) => database.prepare(statement))).then(() => undefined);
  }
  await schemaReady;
  return database;
}

export async function databaseAvailable() {
  const database = await getDatabase();
  if (!database) return false;
  await database.prepare("SELECT 1 AS ok").first();
  return true;
}

function sampleFromSnapshot(snapshot: StatusSnapshot): HistoryPoint {
  const serviceOperational = snapshot.services.filter((item) => item.status === "operational").length;
  const locationOperational = snapshot.locations.filter((item) => item.status === "operational").length;
  return {
    checkedAt: snapshot.generatedAt,
    status: snapshot.status,
    serviceAvailability: snapshot.services.length ? Math.round(serviceOperational / snapshot.services.length * 1000) / 10 : 0,
    locationAvailability: snapshot.locations.length ? Math.round(locationOperational / snapshot.locations.length * 1000) / 10 : 0,
  };
}

function sampleBucket(iso: string) {
  const date = new Date(iso);
  date.setUTCMinutes(Math.floor(date.getUTCMinutes() / 5) * 5, 0, 0);
  return date.toISOString();
}

export async function recordStatusSnapshot(snapshot: StatusSnapshot) {
  const point = sampleFromSnapshot(snapshot);
  memorySamples.push(point);
  if (memorySamples.length > 8_640) memorySamples.splice(0, memorySamples.length - 8_640);
  const database = await getDatabase();
  if (!database) return false;
  const serviceOperational = snapshot.services.filter((item) => item.status === "operational").length;
  const locationOperational = snapshot.locations.filter((item) => item.status === "operational").length;
  await database.prepare(`INSERT OR IGNORE INTO status_samples
    (bucket, checked_at, overall_status, service_total, service_operational, location_total, location_operational)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
      sampleBucket(snapshot.generatedAt), snapshot.generatedAt, snapshot.status,
      snapshot.services.length, serviceOperational, snapshot.locations.length, locationOperational,
    ).run();
  return true;
}

const rangeHours: Record<HistoryRange, number> = { "24h": 24, "7d": 168, "30d": 720 };

export async function getStatusHistory(range: HistoryRange): Promise<{ points: HistoryPoint[]; persistent: boolean }> {
  const since = new Date(Date.now() - rangeHours[range] * 3_600_000).toISOString();
  const database = await getDatabase();
  if (!database) return { points: memorySamples.filter((point) => point.checkedAt >= since), persistent: false };
  const rows = (await database.prepare(`SELECT checked_at, overall_status, service_total, service_operational,
    location_total, location_operational FROM status_samples WHERE checked_at >= ? ORDER BY checked_at ASC`).bind(since).all<{
      checked_at: string; overall_status: string; service_total: number; service_operational: number;
      location_total: number; location_operational: number;
    }>()).results ?? [];
  return {
    persistent: true,
    points: rows.map((row) => ({
      checkedAt: row.checked_at,
      status: row.overall_status,
      serviceAvailability: row.service_total ? Math.round(row.service_operational / row.service_total * 1000) / 10 : 0,
      locationAvailability: row.location_total ? Math.round(row.location_operational / row.location_total * 1000) / 10 : 0,
    })),
  };
}

export async function getIncidents(): Promise<Incident[]> {
  const database = await getDatabase();
  if (!database) return [];
  const rows = (await database.prepare(`SELECT id, title, summary, severity, status, planned, affected_services,
    starts_at, resolved_at FROM incidents ORDER BY starts_at DESC LIMIT 50`).all<Record<string, unknown>>()).results ?? [];
  return rows.map((row) => ({
    id: String(row.id), title: String(row.title), summary: String(row.summary),
    severity: row.severity as Incident["severity"], status: row.status as Incident["status"],
    planned: Boolean(row.planned), affectedServices: JSON.parse(String(row.affected_services || "[]")) as string[],
    startsAt: String(row.starts_at), resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
  }));
}

export async function saveIncident(incident: Incident) {
  const database = await getDatabase();
  if (!database) return false;
  await database.prepare(`INSERT INTO incidents
    (id, title, summary, severity, status, planned, affected_services, starts_at, resolved_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, summary = excluded.summary,
    severity = excluded.severity, status = excluded.status, planned = excluded.planned,
    affected_services = excluded.affected_services, starts_at = excluded.starts_at,
    resolved_at = excluded.resolved_at`).bind(
      incident.id, incident.title, incident.summary, incident.severity, incident.status,
      incident.planned ? 1 : 0, JSON.stringify(incident.affectedServices), incident.startsAt, incident.resolvedAt,
    ).run();
  return true;
}

export async function getApprovedReviews(): Promise<PublicReview[]> {
  const database = await getDatabase();
  if (!database) return memoryReviews;
  const rows = (await database.prepare(`SELECT id, display_name, rating, text, created_at FROM reviews
    WHERE status = 'approved' ORDER BY created_at DESC LIMIT 12`).all<Record<string, unknown>>()).results ?? [];
  return rows.map((row) => ({ id: String(row.id), displayName: String(row.display_name), rating: Number(row.rating), text: String(row.text), createdAt: String(row.created_at) }));
}

export async function submitReview(review: Omit<PublicReview, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const database = await getDatabase();
  if (!database) return { id, stored: false };
  await database.prepare(`INSERT INTO reviews (id, display_name, rating, text, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)`).bind(id, review.displayName, review.rating, review.text, createdAt).run();
  return { id, stored: true };
}

export async function moderateReview(id: string, status: "approved" | "rejected") {
  const database = await getDatabase();
  if (!database) return false;
  await database.prepare("UPDATE reviews SET status = ?, moderated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
  return true;
}

export async function recordPrivateMetric(input: {
  eventType: "outbound_click" | "web_vital";
  destination?: "cabinet" | "telegram";
  page: string;
  metricName?: string;
  metricValue?: number;
}) {
  const database = await getDatabase();
  if (!database) return false;
  const now = new Date();
  await database.prepare(`INSERT INTO private_metrics
    (event_type, destination, page, metric_name, metric_value, day_bucket, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(
      input.eventType, input.destination ?? null, input.page,
      input.metricName ?? null, input.metricValue ?? null,
      now.toISOString().slice(0, 10), now.toISOString(),
    ).run();
  return true;
}

export async function getAlertState(key: string) {
  const database = await getDatabase();
  if (!database) return memoryAlerts.get(key) ?? null;
  const row = await database.prepare("SELECT value FROM alert_state WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setAlertState(key: string, value: string) {
  memoryAlerts.set(key, value);
  const database = await getDatabase();
  if (!database) return false;
  await database.prepare(`INSERT INTO alert_state (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(key, value, new Date().toISOString()).run();
  return true;
}

export async function cleanupObservability() {
  const database = await getDatabase();
  if (!database) return false;
  await database.batch([
    database.prepare("DELETE FROM status_samples WHERE checked_at < datetime('now', '-45 days')"),
    database.prepare("DELETE FROM private_metrics WHERE created_at < datetime('now', '-90 days')"),
    database.prepare("DELETE FROM reviews WHERE status = 'rejected' AND created_at < datetime('now', '-30 days')"),
  ]);
  return true;
}
