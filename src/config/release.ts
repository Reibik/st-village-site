import packageJson from "@/package.json";

export const SITE_RELEASE = {
  version: packageJson.version,
  channel: "stable",
  name: "Управление и надёжность",
  releasedAt: "2026-08-02T00:00:00.000Z",
} as const;
