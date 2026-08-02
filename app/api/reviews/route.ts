import { getApprovedReviews, moderateReview, submitReview } from "@/src/server/storage/database";

export async function GET() {
  return Response.json({ reviews: await getApprovedReviews() }, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Record<string, unknown>;
    if (payload.website) return Response.json({ accepted: true }, { status: 202 });
    const displayName = typeof payload.displayName === "string" ? payload.displayName.trim().slice(0, 40) : "";
    const text = typeof payload.text === "string" ? payload.text.trim().slice(0, 800) : "";
    const rating = Number(payload.rating);
    if (displayName.length < 2 || text.length < 20 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return Response.json({ error: "Проверьте имя, оценку и текст отзыва." }, { status: 400 });
    }
    const result = await submitReview({ displayName, rating, text });
    return Response.json({ accepted: true, pendingModeration: true, stored: result.stored }, { status: 202 });
  } catch {
    return Response.json({ error: "Не удалось обработать отзыв." }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const configuredToken = process.env.REVIEWS_ADMIN_TOKEN?.trim();
  const suppliedToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!configuredToken || suppliedToken !== configuredToken) return Response.json({ error: "unauthorized" }, { status: 401 });
  const payload = await request.json() as { id?: string; status?: string };
  if (!payload.id || !["approved", "rejected"].includes(payload.status ?? "")) return Response.json({ error: "invalid payload" }, { status: 400 });
  const updated = await moderateReview(payload.id, payload.status as "approved" | "rejected");
  return Response.json({ updated });
}
