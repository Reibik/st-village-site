export type MonitorStatus = "operational" | "degraded" | "outage" | "maintenance" | "unknown";

export interface ServiceStatus {
  id: string;
  name: string;
  description: string;
  status: MonitorStatus;
  latencyMs: number | null;
  checkedAt: string;
  message: string;
}

export interface LocationStatus {
  id: string;
  code: string;
  name: string;
  region: string;
  status: MonitorStatus;
  checkedAt: string;
  message: string;
}

export interface StatusSnapshot {
  status: MonitorStatus;
  generatedAt: string;
  refreshAfterSeconds: number;
  services: ServiceStatus[];
  locations: LocationStatus[];
}
