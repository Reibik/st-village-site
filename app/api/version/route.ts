import packageJson from "@/package.json";

export async function GET(request: Request) {
  const currentVersion = new URL(request.url).searchParams.get("current");
  const version = __ST_VILLAGE_BUILD_VERSION__;

  return Response.json(
    {
      version,
      release: packageJson.version,
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
