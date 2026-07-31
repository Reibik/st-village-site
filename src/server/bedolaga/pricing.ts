const DEFAULT_API_URL = "https://cabinet.stvillage.ru/api";
const DEFAULT_LANDING_SLUG = "st-village";
const CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5_000;
const MAX_RESPONSE_BYTES = 256 * 1024;

export type PricingPeriod = {
  days: number;
  label: string;
  priceKopeks: number;
  originalPriceKopeks: number | null;
  discountPercent: number | null;
};

export type PricingTariff = {
  id: number;
  name: string;
  description: string | null;
  trafficLimitGb: number;
  deviceLimit: number;
  tierLevel: number;
  isDaily: boolean;
  periods: PricingPeriod[];
};

export type PricingSnapshot = {
  status: "ok";
  title: string;
  tariffs: PricingTariff[];
  updatedAt: string;
  stale: boolean;
};

type CachedSnapshot = {
  snapshot: PricingSnapshot;
  fetchedAt: number;
};

let cached: CachedSnapshot | null = null;
let pending: Promise<PricingSnapshot> | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteInteger(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.trunc(value))
    : fallback;
}

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\r\n/g, "\n").replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function periodLabel(days: number) {
  if (days === 1) return "1 день";
  if (days === 30) return "1 месяц";
  if (days === 60) return "2 месяца";
  if (days === 90) return "3 месяца";
  if (days === 180) return "6 месяцев";
  if (days === 365) return "1 год";
  return `${days} дней`;
}

function parsePeriod(value: unknown): PricingPeriod | null {
  if (!isRecord(value)) return null;
  const days = finiteInteger(value.days);
  const priceKopeks = finiteInteger(value.price_kopeks);
  if (days < 1 || priceKopeks < 1) return null;

  const original = value.original_price_kopeks;
  const discount = value.discount_percent;
  return {
    days,
    label: periodLabel(days),
    priceKopeks,
    originalPriceKopeks: typeof original === "number" && original > priceKopeks
      ? finiteInteger(original)
      : null,
    discountPercent: typeof discount === "number" && discount > 0
      ? Math.min(99, finiteInteger(discount))
      : null,
  };
}

function parseTariff(value: unknown): PricingTariff | null {
  if (!isRecord(value)) return null;
  const id = finiteInteger(value.id);
  const name = cleanText(value.name, 100);
  const periods = Array.isArray(value.periods)
    ? value.periods.map(parsePeriod).filter((period): period is PricingPeriod => period !== null).slice(0, 12)
    : [];

  if (id < 1 || !name || periods.length === 0) return null;
  const description = cleanText(value.description, 600);
  return {
    id,
    name,
    description: description || null,
    trafficLimitGb: finiteInteger(value.traffic_limit_gb),
    deviceLimit: finiteInteger(value.device_limit),
    tierLevel: finiteInteger(value.tier_level),
    isDaily: value.is_daily === true,
    periods,
  };
}

function parseLanding(value: unknown): Omit<PricingSnapshot, "updatedAt" | "stale"> {
  if (!isRecord(value)) throw new Error("Invalid pricing response");
  const tariffs = Array.isArray(value.tariffs)
    ? value.tariffs.map(parseTariff).filter((tariff): tariff is PricingTariff => tariff !== null).slice(0, 24)
    : [];
  if (tariffs.length === 0) throw new Error("No active tariffs");

  return {
    status: "ok",
    title: cleanText(value.title, 160) || "Тарифы ST VILLAGE",
    tariffs,
  };
}

function getEndpoint() {
  const baseUrl = (process.env.BEDOLAGA_API_URL || DEFAULT_API_URL).replace(/\/+$/, "");
  const slug = process.env.BEDOLAGA_LANDING_SLUG || DEFAULT_LANDING_SLUG;
  return `${baseUrl}/cabinet/landing/${encodeURIComponent(slug)}?lang=ru`;
}

async function fetchFreshPricing(): Promise<PricingSnapshot> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(getEndpoint(), {
      headers: {
        accept: "application/json",
        "user-agent": "ST-VILLAGE-Pricing/1.0",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Pricing upstream returned ${response.status}`);

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_RESPONSE_BYTES) throw new Error("Pricing response is too large");
    const body = await response.arrayBuffer();
    if (body.byteLength > MAX_RESPONSE_BYTES) throw new Error("Pricing response is too large");

    const parsed = parseLanding(JSON.parse(new TextDecoder().decode(body)));
    const snapshot: PricingSnapshot = {
      ...parsed,
      updatedAt: new Date().toISOString(),
      stale: false,
    };
    cached = { snapshot, fetchedAt: Date.now() };
    return snapshot;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getBedolagaPricing(): Promise<PricingSnapshot> {
  const now = Date.now();
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) return cached.snapshot;

  if (!pending) {
    pending = fetchFreshPricing().finally(() => {
      pending = null;
    });
  }

  try {
    return await pending;
  } catch (error) {
    if (cached && now - cached.fetchedAt < STALE_TTL_MS) {
      return { ...cached.snapshot, stale: true };
    }
    throw error;
  }
}
