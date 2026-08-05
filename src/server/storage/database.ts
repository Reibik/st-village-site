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
export type PrivateMetricsSummary = {
  days: number;
  outbound: { cabinet: number; telegram: number };
  vitals: Array<{ name: string; average: number; samples: number }>;
};
export type PublicReview = {
  id: string;
  displayName: string;
  rating: number;
  text: string;
  createdAt: string;
};
export type ManagedReview = PublicReview & {
  status: "pending" | "approved" | "rejected";
  moderatedAt?: string;
};

let databasePromise: Promise<D1DatabaseLike | null> | null = null;
let schemaReady: Promise<void> | null = null;
const memorySamples: HistoryPoint[] = [];
const memoryReviews: PublicReview[] = [];
const memoryAlerts = new Map<string, string>();

type StoredReview = PublicReview & { status: "pending" | "approved" | "rejected"; moderatedAt?: string };
type FileState = {
  samples: HistoryPoint[];
  incidents: Incident[];
  reviews: StoredReview[];
  alerts: Record<string, string>;
  metrics: Record<string, number>;
};
type FileStore = { path: string; state: FileState };

let fileStorePromise: Promise<FileStore | null> | null = null;
let fileWriteQueue: Promise<boolean> = Promise.resolve(true);

function emptyFileState(): FileState {
  return { samples: [], incidents: [], reviews: [], alerts: {}, metrics: {} };
}

function defaultFileStorePath(channel: string) {
  if (process.env.NEXT_PUBLIC_SITE_URL?.includes("dev.stvillage.ru")) {
    return "/opt/st-village-dev/data/observability.json";
  }
  if (process.env.NEXT_PUBLIC_SITE_URL?.includes("stvillage.ru")) {
    return "/opt/st-village-site/data/observability.json";
  }
  return `/var/tmp/st-village-observability-${channel}.json`;
}

async function getFileStore(): Promise<FileStore | null> {
  if (!fileStorePromise) {
    fileStorePromise = (async () => {
      try {
        const fs = await import("node:fs/promises");
        const channel = (process.env.ST_VILLAGE_CHANNEL || process.env.NODE_ENV || "site").replace(/[^a-z0-9_-]/gi, "-");
        const path = process.env.OBSERVABILITY_FILE_PATH || defaultFileStorePath(channel);
        let state = emptyFileState();
        try {
          state = { ...state, ...JSON.parse(await fs.readFile(path, "utf8")) as Partial<FileState> };
        } catch (error) {
          if ((error as { code?: string }).code !== "ENOENT") throw error;
          await fs.writeFile(path, JSON.stringify(state), { encoding: "utf8", mode: 0o600 });
        }
        return { path, state };
      } catch {
        return null;
      }
    })();
  }
  return fileStorePromise;
}

async function persistFileStore(store: FileStore) {
  fileWriteQueue = fileWriteQueue.then(async () => {
    try {
      const fs = await import("node:fs/promises");
      const temporary = `${store.path}.${process.pid}.tmp`;
      await fs.writeFile(temporary, JSON.stringify(store.state), { encoding: "utf8", mode: 0o600 });
      await fs.rename(temporary, store.path);
      return true;
    } catch {
      return false;
    }
  });
  return fileWriteQueue;
}

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
  if (!database) return Boolean(await getFileStore());
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
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    const bucket = sampleBucket(point.checkedAt);
    store.state.samples = [...store.state.samples.filter((item) => sampleBucket(item.checkedAt) !== bucket), point].slice(-8_640);
    return persistFileStore(store);
  }
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
  if (!database) {
    const store = await getFileStore();
    return store
      ? { points: store.state.samples.filter((point) => point.checkedAt >= since), persistent: true }
      : { points: memorySamples.filter((point) => point.checkedAt >= since), persistent: false };
  }
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
  if (!database) return (await getFileStore())?.state.incidents.slice(0, 50) ?? [];
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
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    store.state.incidents = [incident, ...store.state.incidents.filter((item) => item.id !== incident.id)].slice(0, 50);
    return persistFileStore(store);
  }
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
  if (!database) {
    const store = await getFileStore();
    return store ? store.state.reviews.filter((review) => review.status === "approved").slice(0, 12) : memoryReviews;
  }
  const rows = (await database.prepare(`SELECT id, display_name, rating, text, created_at FROM reviews
    WHERE status = 'approved' ORDER BY created_at DESC LIMIT 12`).all<Record<string, unknown>>()).results ?? [];
  return rows.map((row) => ({ id: String(row.id), displayName: String(row.display_name), rating: Number(row.rating), text: String(row.text), createdAt: String(row.created_at) }));
}

export async function getManagedReviews(status: ManagedReview["status"]): Promise<ManagedReview[]> {
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    return (store?.state.reviews ?? [])
      .filter((review) => review.status === status)
      .slice(0, 100);
  }
  const rows = (await database.prepare(`SELECT id, display_name, rating, text, status, created_at, moderated_at
    FROM reviews WHERE status = ? ORDER BY created_at DESC LIMIT 100`).bind(status).all<Record<string, unknown>>()).results ?? [];
  return rows.map((row) => ({
    id: String(row.id), displayName: String(row.display_name), rating: Number(row.rating), text: String(row.text),
    status: row.status as ManagedReview["status"], createdAt: String(row.created_at),
    moderatedAt: row.moderated_at ? String(row.moderated_at) : undefined,
  }));
}

export async function submitReview(review: Omit<PublicReview, "id" | "createdAt">) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    if (!store) return { id, stored: false };
    store.state.reviews.unshift({ id, createdAt, status: "pending", ...review });
    return { id, stored: await persistFileStore(store) };
  }
  await database.prepare(`INSERT INTO reviews (id, display_name, rating, text, status, created_at)
    VALUES (?, ?, ?, ?, 'pending', ?)`).bind(id, review.displayName, review.rating, review.text, createdAt).run();
  return { id, stored: true };
}

export async function moderateReview(id: string, status: "approved" | "rejected") {
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    const review = store?.state.reviews.find((item) => item.id === id);
    if (!store || !review) return false;
    review.status = status;
    review.moderatedAt = new Date().toISOString();
    return persistFileStore(store);
  }
  await database.prepare("UPDATE reviews SET status = ?, moderated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), id).run();
  return true;
}

export async function deleteReview(id: string) {
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    const before = store.state.reviews.length;
    store.state.reviews = store.state.reviews.filter((item) => item.id !== id);
    return before !== store.state.reviews.length && persistFileStore(store);
  }
  const existing = await database.prepare("SELECT id FROM reviews WHERE id = ?").bind(id).first<{ id: string }>();
  if (!existing) return false;
  await database.prepare("DELETE FROM reviews WHERE id = ?").bind(id).run();
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
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    const key = [new Date().toISOString().slice(0, 10), input.eventType, input.destination ?? "", input.page, input.metricName ?? ""].join("|");
    store.state.metrics[`${key}|count`] = (store.state.metrics[`${key}|count`] ?? store.state.metrics[key] ?? 0) + 1;
    if (input.eventType === "web_vital" && typeof input.metricValue === "number") {
      store.state.metrics[`${key}|sum`] = (store.state.metrics[`${key}|sum`] ?? 0) + input.metricValue;
    }
    return persistFileStore(store);
  }
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

export async function getPrivateMetricsSummary(days = 30): Promise<PrivateMetricsSummary> {
  const safeDays = Math.min(90, Math.max(1, Math.floor(days)));
  const sinceDate = new Date(Date.now() - (safeDays - 1) * 86_400_000).toISOString().slice(0, 10);
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    const outbound = { cabinet: 0, telegram: 0 };
    const vitals = new Map<string, { sum: number; samples: number }>();
    for (const [key, value] of Object.entries(store?.state.metrics ?? {})) {
      const [day, eventType, destination, , metricName, suffix] = key.split("|");
      if (day < sinceDate || suffix === "sum" || (!suffix && eventType === "web_vital")) continue;
      if (!suffix && store?.state.metrics[`${key}|count`] !== undefined) continue;
      if (eventType === "outbound_click" && (destination === "cabinet" || destination === "telegram")) outbound[destination] += value;
      if (eventType === "web_vital" && metricName) {
        const current = vitals.get(metricName) ?? { sum: 0, samples: 0 };
        const baseKey = key.replace(/\|count$/, "");
        current.samples += value;
        current.sum += store?.state.metrics[`${baseKey}|sum`] ?? 0;
        vitals.set(metricName, current);
      }
    }
    return {
      days: safeDays,
      outbound,
      vitals: [...vitals.entries()].map(([name, value]) => ({ name, samples: value.samples, average: value.samples ? value.sum / value.samples : 0 })),
    };
  }
  const since = new Date(Date.now() - safeDays * 86_400_000).toISOString();
  const outboundRows = (await database.prepare(`SELECT destination, COUNT(*) AS total FROM private_metrics
    WHERE event_type = 'outbound_click' AND created_at >= ? GROUP BY destination`).bind(since).all<Record<string, unknown>>()).results ?? [];
  const vitalRows = (await database.prepare(`SELECT metric_name, AVG(metric_value) AS average, COUNT(*) AS samples
    FROM private_metrics WHERE event_type = 'web_vital' AND created_at >= ? GROUP BY metric_name`).bind(since).all<Record<string, unknown>>()).results ?? [];
  const outbound = { cabinet: 0, telegram: 0 };
  for (const row of outboundRows) if (row.destination === "cabinet" || row.destination === "telegram") outbound[row.destination] = Number(row.total);
  return {
    days: safeDays,
    outbound,
    vitals: vitalRows.map((row) => ({ name: String(row.metric_name), average: Number(row.average), samples: Number(row.samples) })),
  };
}

export async function getAlertState(key: string) {
  const database = await getDatabase();
  if (!database) return (await getFileStore())?.state.alerts[key] ?? memoryAlerts.get(key) ?? null;
  const row = await database.prepare("SELECT value FROM alert_state WHERE key = ?").bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

export async function setAlertState(key: string, value: string) {
  memoryAlerts.set(key, value);
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    store.state.alerts[key] = value;
    return persistFileStore(store);
  }
  await database.prepare(`INSERT INTO alert_state (key, value, updated_at) VALUES (?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(key, value, new Date().toISOString()).run();
  return true;
}

export async function cleanupObservability() {
  const database = await getDatabase();
  if (!database) {
    const store = await getFileStore();
    if (!store) return false;
    const sampleCutoff = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const reviewCutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
    store.state.samples = store.state.samples.filter((item) => item.checkedAt >= sampleCutoff);
    store.state.reviews = store.state.reviews.filter((item) => item.status !== "rejected" || item.createdAt >= reviewCutoff);
    const metricCutoff = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    store.state.metrics = Object.fromEntries(Object.entries(store.state.metrics).filter(([key]) => key.slice(0, 10) >= metricCutoff));
    return persistFileStore(store);
  }
  await database.batch([
    database.prepare("DELETE FROM status_samples WHERE checked_at < datetime('now', '-45 days')"),
    database.prepare("DELETE FROM private_metrics WHERE created_at < datetime('now', '-90 days')"),
    database.prepare("DELETE FROM reviews WHERE status = 'rejected' AND created_at < datetime('now', '-30 days')"),
  ]);
  return true;
}
