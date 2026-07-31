import packageJson from "@/package.json";

export const SITE_RELEASE = {
  version: packageJson.version,
  channel: "stable",
  name: "Стабильный запуск",
  releasedAt: "2026-07-31T00:00:00.000Z",
} as const;
