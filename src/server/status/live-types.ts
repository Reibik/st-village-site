import type { MonitorStatus } from "@/src/server/status/types";

export interface LiveStatusServer {
  id: string;
  name: string;
  countryCode: string;
  status: MonitorStatus;
  uptime30: number | null;
  latencyMs: number | null;
  members: number;
  membersOnline: number;
}

export interface LiveStatusIncident {
  id: string;
  title: string;
  severity: "info" | "minor" | "major" | "critical";
  status: string;
  startedAt: string | null;
  affected: Array<{ name: string; countryCode: string }>;
  latestUpdate: string | null;
}

export interface LiveStatusSummary {
  status: MonitorStatus;
  generatedAt: string;
  refreshAfterSeconds: number;
  totals: {
    online: number;
    total: number;
    maintenance: number;
    uptime30: number | null;
    averageLatencyMs: number | null;
  };
  servers: LiveStatusServer[];
  incidents: LiveStatusIncident[];
}
