const MAX_CLOCK_SKEW_SECONDS = 300;
const consumedNonces = new Map<string, number>();

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export type SiteBotActor = { id: string };

export async function verifySiteBotRequest(request: Request, body = ""): Promise<SiteBotActor | null> {
  const secret = process.env.SITE_BOT_API_TOKEN?.trim();
  const actorId = request.headers.get("x-st-village-bot-actor")?.trim() ?? "";
  const timestamp = request.headers.get("x-st-village-bot-timestamp")?.trim() ?? "";
  const nonce = request.headers.get("x-st-village-bot-nonce")?.trim() ?? "";
  const suppliedSignature = request.headers.get("x-st-village-bot-signature")?.trim().toLowerCase() ?? "";
  if (!secret || !/^\d{6,20}$/.test(actorId) || !/^\d{10}$/.test(timestamp) || !/^[a-zA-Z0-9-]{16,80}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(suppliedSignature)) return null;

  const configuredAdmins = (process.env.SITE_BOT_ADMIN_IDS ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  if (configuredAdmins.length === 0 || !configuredAdmins.includes(actorId)) return null;
  if (Math.abs(Math.floor(Date.now() / 1_000) - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS) return null;
  const now = Date.now();
  for (const [usedNonce, expiresAt] of consumedNonces) if (expiresAt <= now) consumedNonces.delete(usedNonce);
  if (consumedNonces.has(nonce)) return null;

  const url = new URL(request.url);
  const canonical = [timestamp, nonce, request.method.toUpperCase(), `${url.pathname}${url.search}`, body].join("\n");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(canonical)));
  if (!constantTimeEqual(expected, suppliedSignature)) return null;
  consumedNonces.set(nonce, now + MAX_CLOCK_SKEW_SECONDS * 1_000);
  return { id: actorId };
}

export function siteBotUnauthorizedResponse() {
  return Response.json({ error: "unauthorized" }, {
    status: 401,
    headers: { "Cache-Control": "no-store", "WWW-Authenticate": "STVillageBotSignature" },
  });
}
