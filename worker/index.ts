/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { SITE_RELEASE } from "../src/config/release";
import { collectStatus } from "../src/server/status/collector";
import { notifyStatusChange } from "../src/server/status/alerts";
import { cleanupObservability, recordStatusSnapshot } from "../src/server/storage/database";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

function withReleaseHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("X-ST-Village-Release", SITE_RELEASE.version);
  headers.set("X-ST-Village-Channel", SITE_RELEASE.channel);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/.well-known/security.txt") {
      return withReleaseHeaders(new Response(
        "Contact: mailto:admin@stvillage.ru\n" +
          "Canonical: https://stvillage.ru/.well-known/security.txt\n" +
          "Preferred-Languages: ru, en\n" +
          "Expires: 2027-07-31T00:00:00.000Z\n",
        {
          headers: {
            "Cache-Control": "public, max-age=3600",
            "Content-Type": "text/plain; charset=utf-8",
          },
        },
      ));
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return withReleaseHeaders(await handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths));
    }

    return withReleaseHeaders(await handler.fetch(request, env, ctx));
  },
  async scheduled(_event: ScheduledEvent, _env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      const snapshot = await collectStatus();
      await Promise.allSettled([recordStatusSnapshot(snapshot), notifyStatusChange(snapshot), cleanupObservability()]);
    })());
  },
};

export default worker;
