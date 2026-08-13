import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";
import { siteBotUnauthorizedResponse, verifySiteBotRequest } from "@/src/server/security/site-bot-auth";
import { getIncidents, recordSiteAdminAudit, saveIncident, type Incident } from "@/src/server/storage/database";

const statuses = new Set<Incident["status"]>(["investigating", "monitoring", "resolved", "scheduled"]);
const severities = new Set<Incident["severity"]>(["info", "minor", "major"]);

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-incidents", 60, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!await verifySiteBotRequest(request)) return siteBotUnauthorizedResponse();
  return Response.json({ incidents: await getIncidents() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-incidents", 30, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  const body = await request.text();
  const actor = await verifySiteBotRequest(request, body);
  if (!actor) return siteBotUnauthorizedResponse();
  try {
    const payload = JSON.parse(body) as Partial<Incident>;
    const incident: Incident = {
      id: String(payload.id || crypto.randomUUID()).slice(0, 80), title: String(payload.title || "").trim().slice(0, 120),
      summary: String(payload.summary || "").trim().slice(0, 1_500), severity: payload.severity as Incident["severity"],
      status: payload.status as Incident["status"], planned: Boolean(payload.planned),
      affectedServices: Array.isArray(payload.affectedServices) ? payload.affectedServices.map(String).slice(0, 12) : [],
      startsAt: String(payload.startsAt || new Date().toISOString()), resolvedAt: payload.resolvedAt ? String(payload.resolvedAt) : null,
    };
    if (!incident.title || !incident.summary || !statuses.has(incident.status) || !severities.has(incident.severity) || Number.isNaN(Date.parse(incident.startsAt))) {
      return Response.json({ error: "invalid incident" }, { status: 400 });
    }
    const stored = await saveIncident(incident);
    await recordSiteAdminAudit({ actorId: actor.id, action: `incident.${incident.status}`, entityType: "incident", entityId: incident.id, details: { title: incident.title, planned: incident.planned } });
    return Response.json({ incident, stored }, { status: stored ? 200 : 503 });
  } catch { return Response.json({ error: "invalid payload" }, { status: 400 }); }
}
