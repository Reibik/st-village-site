import packageJson from "@/package.json";

export const SITE_RELEASE = {
  version: packageJson.version,
  channel: "stable",
  name: "Фирменная орбита",
  releasedAt: "2026-10-03T00:00:00.000Z",
} as const;
