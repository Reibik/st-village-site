export async function GET() {
  return Response.json({ status: "coming_soon", error: "coupons_unavailable" }, {
    status: 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
