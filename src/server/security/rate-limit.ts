type Counter = { count: number; resetAt: number };

const counters = new Map<string, Counter>();
const processSalt = crypto.randomUUID();

async function requestKey(request: Request, scope: string) {
  const address = request.headers.get("cf-connecting-ip")
    || request.headers.get("x-real-ip")
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const secret = process.env.RATE_LIMIT_SECRET?.trim() || processSalt;
  const bytes = new TextEncoder().encode(`${secret}:${scope}:${address}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function prune(now: number) {
  if (counters.size < 2_000) return;
  for (const [key, counter] of counters) {
    if (counter.resetAt <= now) counters.delete(key);
  }
  while (counters.size > 4_000) counters.delete(counters.keys().next().value as string);
}

export async function checkRateLimit(request: Request, scope: string, limit: number, windowMs: number) {
  const now = Date.now();
  prune(now);
  const key = await requestKey(request, scope);
  const current = counters.get(key);
  if (!current || current.resetAt <= now) {
    counters.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }
  current.count += 1;
  return {
    allowed: current.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1_000)),
  };
}

export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json({ error: "Слишком много запросов. Попробуйте позднее." }, {
    status: 429,
    headers: { "Retry-After": String(retryAfterSeconds), "Cache-Control": "no-store" },
  });
}

export async function readTextLimited(request: Request, maximumBytes = 16_384): Promise<string | Response> {
  const tooLarge = () => Response.json({ error: "payload too large" }, {
    status: 413, headers: { "Cache-Control": "no-store" },
  });
  if (Number(request.headers.get("content-length") || 0) > maximumBytes) {
    await request.body?.cancel();
    return tooLarge();
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maximumBytes) {
        await reader.cancel();
        return tooLarge();
      }
      parts.push(decoder.decode(chunk.value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    reader.releaseLock();
  }
}

export async function readJsonLimited(request: Request, maximumBytes = 16_384) {
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > maximumBytes) throw new Error("payload too large");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maximumBytes) throw new Error("payload too large");
  return JSON.parse(body) as Record<string, unknown>;
}
