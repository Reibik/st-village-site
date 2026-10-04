import { goneResponse } from "@/src/server/http/gone";

export function GET() { return goneResponse(); }
export function HEAD() { return new Response(null, GET()); }
export const POST = GET;
export const PATCH = GET;
export const DELETE = GET;
export const PUT = GET;
export const OPTIONS = GET;
