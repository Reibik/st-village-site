import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";
import { siteBotUnauthorizedResponse, verifySiteBotRequest } from "@/src/server/security/site-bot-auth";
import { getSiteAnnouncements, recordSiteAdminAudit, saveSiteAnnouncement, type SiteAnnouncement } from "@/src/server/storage/database";

const kinds = new Set<SiteAnnouncement["kind"]>(["info", "update", "maintenance", "critical", "promo"]);
const placements = new Set<SiteAnnouncement["placement"]>(["all", "home", "status"]);
const states = new Set<SiteAnnouncement["state"]>(["draft", "published", "archived"]);

function safeLink(value: unknown) {
  if (!value) return null;
  const text = String(value).trim().slice(0, 500);
  if (text.startsWith("/")) return text;
  try {
    const url = new URL(text);
    return url.protocol === "https:" ? url.toString() : null;
  } catch { return null; }
}

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-announcements", 60, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!await verifySiteBotRequest(request)) return siteBotUnauthorizedResponse();
  return Response.json({ announcements: await getSiteAnnouncements() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-announcements", 30, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  const body = await request.text();
  const actor = await verifySiteBotRequest(request, body);
  if (!actor) return siteBotUnauthorizedResponse();
  try {
    const payload = JSON.parse(body) as Record<string, unknown>;
    const now = new Date().toISOString();
    const startsAt = String(payload.startsAt || now);
    const endsAt = payload.endsAt ? String(payload.endsAt) : null;
    const announcement: SiteAnnouncement = {
      id: String(payload.id || crypto.randomUUID()).slice(0, 80),
      kind: payload.kind as SiteAnnouncement["kind"],
      title: String(payload.title || "").trim().slice(0, 100),
      message: String(payload.message || "").trim().slice(0, 800),
      ctaLabel: payload.ctaLabel ? String(payload.ctaLabel).trim().slice(0, 40) : null,
      ctaUrl: safeLink(payload.ctaUrl),
      placement: payload.placement as SiteAnnouncement["placement"],
      state: payload.state as SiteAnnouncement["state"],
      dismissible: payload.dismissible !== false,
      startsAt, endsAt,
      createdAt: payload.createdAt && !Number.isNaN(Date.parse(String(payload.createdAt))) ? String(payload.createdAt) : now,
      updatedAt: now,
    };
    if (!announcement.title || !announcement.message || !kinds.has(announcement.kind) || !placements.has(announcement.placement)
      || !states.has(announcement.state) || Number.isNaN(Date.parse(startsAt)) || (endsAt && (Number.isNaN(Date.parse(endsAt)) || endsAt <= startsAt))
      || Boolean(announcement.ctaLabel) !== Boolean(announcement.ctaUrl)) {
      return Response.json({ error: "invalid announcement" }, { status: 400 });
    }
    const stored = await saveSiteAnnouncement(announcement);
    await recordSiteAdminAudit({ actorId: actor.id, action: `announcement.${announcement.state}`, entityType: "announcement", entityId: announcement.id, details: { title: announcement.title, placement: announcement.placement } });
    return Response.json({ announcement, stored }, { status: stored ? 200 : 503 });
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }
}
