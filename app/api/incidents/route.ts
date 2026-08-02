import { getIncidents, saveIncident, type Incident } from "@/src/server/storage/database";

const statuses = new Set<Incident["status"]>(["investigating", "monitoring", "resolved", "scheduled"]);
const severities = new Set<Incident["severity"]>(["info", "minor", "major"]);

export async function GET() {
  return Response.json({ incidents: await getIncidents() }, { headers: { "Cache-Control": "public, s-maxage=120" } });
}

export async function POST(request: Request) {
  const configuredToken = process.env.STATUS_ADMIN_TOKEN?.trim();
  const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredToken || suppliedToken !== configuredToken) return Response.json({ error: "unauthorized" }, { status: 401 });
  try {
    const payload = await request.json() as Partial<Incident>;
    const incident: Incident = {
      id: String(payload.id || crypto.randomUUID()).slice(0, 80),
      title: String(payload.title || "").trim().slice(0, 120),
      summary: String(payload.summary || "").trim().slice(0, 1_500),
      severity: payload.severity as Incident["severity"], status: payload.status as Incident["status"],
      planned: Boolean(payload.planned),
      affectedServices: Array.isArray(payload.affectedServices) ? payload.affectedServices.map(String).slice(0, 12) : [],
      startsAt: String(payload.startsAt || new Date().toISOString()),
      resolvedAt: payload.resolvedAt ? String(payload.resolvedAt) : null,
    };
    if (!incident.title || !incident.summary || !statuses.has(incident.status) || !severities.has(incident.severity) || Number.isNaN(Date.parse(incident.startsAt))) {
      return Response.json({ error: "invalid incident" }, { status: 400 });
    }
    const stored = await saveIncident(incident);
    return Response.json({ incident, stored }, { status: stored ? 200 : 503 });
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
}

