import packageJson from "@/package.json";

export const SITE_RELEASE = {
  version: packageJson.version,
  channel: "stable",
  name: "Мониторинг и качество",
  releasedAt: "2026-08-09T00:00:00.000Z",
} as const;
