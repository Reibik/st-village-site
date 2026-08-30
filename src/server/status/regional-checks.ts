export type RegionalCheck = {
  id: string;
  label: string;
  country: string;
  city: string;
  status: "operational" | "outage" | "unknown";
  latencyMs: number | null;
  checkedAt: string;
};

const regions = [
  { id: "eu", label: "Европа", magic: "Germany+datacenter", fallbackCountry: "DE" },
  { id: "na", label: "Северная Америка", magic: "United States+datacenter", fallbackCountry: "US" },
  { id: "asia", label: "Азия", magic: "Japan+datacenter", fallbackCountry: "JP" },
] as const;
const CACHE_TTL_MS = 15 * 60_000;
let cached: { expiresAt: number; value: RegionalCheck[] } | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function fallbackChecks(): RegionalCheck[] {
  const checkedAt = new Date().toISOString();
  return regions.map((region) => ({
    id: region.id, label: region.label, country: region.fallbackCountry, city: "—",
    status: "unknown", latencyMs: null, checkedAt,
  }));
}

async function fetchMeasurement(id: string) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (attempt) await new Promise((resolve) => setTimeout(resolve, 900));
    const response = await fetch(`https://api.globalping.io/v1/measurements/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { Accept: "application/json", "User-Agent": "ST-VILLAGE-Regional-Status/1.0" },
    });
    if (!response.ok) throw new Error(`Globalping returned ${response.status}`);
    const payload: unknown = await response.json();
    if (isRecord(payload) && payload.status !== "in-progress") return payload;
  }
  throw new Error("Globalping measurement timed out");
}

export async function getRegionalChecks(): Promise<RegionalCheck[]> {
  if (process.env.STATUS_REGIONAL_CHECKS_DISABLED === "1") return fallbackChecks();
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  try {
    const site = new URL(process.env.STATUS_PUBLIC_SITE_URL || "https://stvillage.top");
    const response = await fetch("https://api.globalping.io/v1/measurements", {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": "ST-VILLAGE-Regional-Status/1.0" },
      body: JSON.stringify({
        type: "http",
        target: site.hostname,
        locations: regions.map((region) => ({ magic: region.magic, limit: 1 })),
        measurementOptions: { protocol: "HTTPS", request: { method: "GET", path: "/api/health" } },
      }),
    });
    if (!response.ok) throw new Error(`Globalping returned ${response.status}`);
    const created: unknown = await response.json();
    if (!isRecord(created) || typeof created.id !== "string") throw new Error("Globalping did not return an id");
    const payload = await fetchMeasurement(created.id);
    const rawResults = isRecord(payload) && Array.isArray(payload.results) ? payload.results : [];
    const parsed = rawResults.slice(0, regions.length).map((item, index): RegionalCheck => {
      const record = isRecord(item) ? item : {};
      const probe = isRecord(record.probe) ? record.probe : {};
      const location = isRecord(probe.location) ? probe.location : probe;
      const result = isRecord(record.result) ? record.result : {};
      const timings = isRecord(result.timings) ? result.timings : {};
      const statusCode = Number(result.statusCode ?? 0);
      const latency = Number(timings.total ?? timings.ttfb ?? 0);
      const reportedCountry = typeof location.country === "string" ? location.country : "";
      const region = regions.find((candidate) => candidate.fallbackCountry === reportedCountry) ?? regions[index] ?? regions[0];
      return {
        id: region.id,
        label: region.label,
        country: reportedCountry || region.fallbackCountry,
        city: typeof location.city === "string" ? location.city : "—",
        status: statusCode >= 200 && statusCode < 400 ? "operational" : statusCode ? "outage" : "unknown",
        latencyMs: Number.isFinite(latency) && latency > 0 ? Math.round(latency) : null,
        checkedAt: new Date().toISOString(),
      };
    });
    const fallback = fallbackChecks();
    const value = regions.map((region, index) => parsed.find((check) => check.id === region.id) ?? fallback[index]);
    cached = { expiresAt: Date.now() + CACHE_TTL_MS, value };
  } catch {
    cached = { expiresAt: Date.now() + 2 * 60_000, value: fallbackChecks() };
  }
  return cached.value;
}
