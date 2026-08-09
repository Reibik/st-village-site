import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";
import { getPrivateMetricsSummary, recordPrivateMetric } from "@/src/server/storage/database";

const destinations = new Set(["cabinet", "telegram"]);
const vitalNames = new Set(["CLS", "FCP", "INP", "LCP", "TTFB"]);

function safePage(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  return value.slice(0, 120).replace(/[^a-zA-Z0-9_\-/?=&.]/g, "");
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, "private-analytics", 120, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.eventType === "outbound_click" && typeof payload.destination === "string" && destinations.has(payload.destination)) {
      const stored = await recordPrivateMetric({
        eventType: "outbound_click",
        destination: payload.destination as "cabinet" | "telegram",
        page: safePage(payload.page),
      });
      return Response.json({ accepted: true, stored }, { status: 202 });
    }
    if (payload.eventType === "web_vital" && typeof payload.metricName === "string" && vitalNames.has(payload.metricName)) {
      const value = Number(payload.metricValue);
      if (!Number.isFinite(value) || value < 0 || value > 120_000) return Response.json({ error: "invalid metric" }, { status: 400 });
      const stored = await recordPrivateMetric({ eventType: "web_vital", page: safePage(payload.page), metricName: payload.metricName, metricValue: value });
      return Response.json({ accepted: true, stored }, { status: 202 });
    }
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
  return Response.json({ error: "unsupported event" }, { status: 400 });
}

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, "status-admin", 60, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  const configuredToken = process.env.STATUS_ADMIN_TOKEN?.trim();
  const suppliedToken = request.headers.get("x-st-village-status-token")?.trim()
    || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredToken || suppliedToken !== configuredToken) return Response.json({ error: "unauthorized" }, { status: 401 });
  const days = Number(new URL(request.url).searchParams.get("days") || 30);
  return Response.json(await getPrivateMetricsSummary(days), { headers: { "Cache-Control": "no-store" } });
}
