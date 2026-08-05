import { notifyReviewSubmission } from "@/src/server/reviews/notifications";
import { checkRateLimit, rateLimitResponse, readJsonLimited } from "@/src/server/security/rate-limit";
import { deleteReview, getApprovedReviews, getManagedReviews, moderateReview, submitReview, type ManagedReview } from "@/src/server/storage/database";

function hasAdminAccess(request: Request) {
  const configuredToken = process.env.REVIEWS_ADMIN_TOKEN?.trim();
  const suppliedToken = request.headers.get("x-st-village-admin-token")?.trim()
    || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return Boolean(configuredToken && suppliedToken === configuredToken);
}

function moderationUrl(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(request.url).protocol.replace(":", "");
  const origin = host ? `${protocol}://${host}` : new URL(request.url).origin;
  return new URL("/reviews/moderation", origin).toString();
}

export async function GET(request: Request) {
  const requestedStatus = new URL(request.url).searchParams.get("status");
  if (requestedStatus) {
    const rateLimit = await checkRateLimit(request, "review-admin", 30, 15 * 60_000);
    if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
    if (!hasAdminAccess(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
    if (!["pending", "approved", "rejected"].includes(requestedStatus)) return Response.json({ error: "invalid status" }, { status: 400 });
    return Response.json({ reviews: await getManagedReviews(requestedStatus as ManagedReview["status"]) }, { headers: { "Cache-Control": "no-store" } });
  }
  return Response.json({ reviews: await getApprovedReviews() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const rateLimit = await checkRateLimit(request, "review-submit", 4, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  try {
    const payload = await readJsonLimited(request);
    if (payload.website) return Response.json({ accepted: true }, { status: 202 });
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 40) : "";
    const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 800) : "";
    const rating = Number(payload.rating);
    if (displayName.length < 2 || text.length < 20 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Проверьте имя, оценку и текст отзыва." }, { status: 400 });
    }
    const result = await submitReview({ displayName, rating, text });
    const moderationNotified = result.stored
      ? await notifyReviewSubmission({ id: result.id, displayName, rating, text }, moderationUrl(request))
      : false;
    return Response.json({ accepted: true, pendingModeration: true, stored: result.stored, moderationNotified }, { status: 202 });
  } catch {
    return Response.json({ error: "Не удалось обработать отзыв." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const rateLimit = await checkRateLimit(request, "review-admin", 30, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!hasAdminAccess(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const payload = await readJsonLimited(request) as { id?: string; status?: string };
  if (!payload.id || !["approved", "rejected"].includes(payload.status ?? "")) return Response.json({ error: "invalid payload" }, { status: 400 });
  const updated = await moderateReview(payload.id, payload.status as "approved" | "rejected");
  return Response.json({ updated });
}

export async function DELETE(request: Request) {
  const rateLimit = await checkRateLimit(request, "review-admin", 30, 15 * 60_000);
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.retryAfterSeconds);
  if (!hasAdminAccess(request)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const payload = await readJsonLimited(request) as { id?: string };
  if (!payload.id) return Response.json({ error: "invalid payload" }, { status: 400 });
  return Response.json({ deleted: await deleteReview(payload.id) });
}
