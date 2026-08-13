import { checkRateLimit, rateLimitResponse } from "@/src/server/security/rate-limit";
import { siteBotUnauthorizedResponse, verifySiteBotRequest } from "@/src/server/security/site-bot-auth";
import { getSiteAdminAudit } from "@/src/server/storage/database";

export async function GET(request: Request) {
  const rateLimit = await checkRateLimit(request, "site-bot-audit", 30, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!await verifySiteBotRequest(request)) return siteBotUnauthorizedResponse();
  const limit = Number(new URL(request.url).searchParams.get("limit") || 20);
  return Response.json({ audit: await getSiteAdminAudit(limit) }, { headers: { "Cache-Control": "no-store" } });
}
