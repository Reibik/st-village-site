import { SITE_RELEASE } from "@/src/config/release";

export async function GET(request: Request) {
  const currentVersion = new URL(request.url).searchParams.get("current");
  const version = __ST_VILLAGE_BUILD_VERSION__;

  return Response.json(
    {
      version,
      release: SITE_RELEASE.version,
      channel: SITE_RELEASE.channel,
      releaseName: SITE_RELEASE.name,
      updateAvailable: Boolean(currentVersion && currentVersion !== version),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    },
  );
}
