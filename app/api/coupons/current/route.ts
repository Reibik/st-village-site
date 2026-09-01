import { getCouponDropSnapshot } from "@/src/server/coupons/schedule";

export async function GET() {
  return Response.json(getCouponDropSnapshot(), {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
