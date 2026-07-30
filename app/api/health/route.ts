export async function GET() { return Response.json({ status: "ok", service: "st-village-web", timestamp: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } }); }
