import { SITE_RELEASE } from "@/src/config/release";
import { verifySiteBotRequest, siteBotUnauthorizedResponse } from "@/src/server/security/site-bot-auth";
import { fetchLiveStatus } from "@/src/server/status/live-status";
import { getActiveSiteAnnouncements, getIncidents, getManagedReviews, getPrivateMetricsSummary } from "@/src/server/storage/database";
import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-dashboard", 60, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!await verifySiteBotRequest(request)) return siteBotUnauthorizedResponse();

  const [live, incidents, announcements, pendingReviews, analytics] = await Promise.all([
    fetchLiveStatus().catch(() => null),
    getIncidents(), getActiveSiteAnnouncements(), getManagedReviews("pending"), getPrivateMetricsSummary(7),
  ]);
  const activeIncidents = incidents.filter((item) => item.status !== "resolved");
  return Response.json({
    generatedAt: new Date().toISOString(),
    site: { status: live ? "operational" : "degraded", url: process.env.NEXT_PUBLIC_SITE_URL || "https://stvillage.top" },
    release: { version: SITE_RELEASE.version, channel: SITE_RELEASE.channel, name: SITE_RELEASE.name, build: __ST_VILLAGE_BUILD_VERSION__ },
    infrastructure: live ? { status: live.status, ...live.totals } : null,
    incidents: { active: activeIncidents.length, scheduled: activeIncidents.filter((item) => item.status === "scheduled").length },
    announcements: { active: announcements.length },
    reviews: { pending: pendingReviews.length },
    analytics,
  }, { headers: { "Cache-Control": "no-store" } });
}
