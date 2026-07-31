import { getBedolagaPricing } from "@/src/server/bedolaga/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await getBedolagaPricing();
    return Response.json(snapshot, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return Response.json(
      {
        status: "unavailable",
        message: "Тарифы временно недоступны. Актуальные условия доступны в личном кабинете.",
      },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
