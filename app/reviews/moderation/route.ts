import { goneResponse } from "@/src/server/http/gone";

export function GET() { return goneResponse("page"); }
export function HEAD() { return new Response(null, GET()); }
