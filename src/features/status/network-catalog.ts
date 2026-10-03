import type { LiveStatusServer, LiveStatusSummary } from "@/src/server/status/live-types";
import type { MonitorStatus } from "@/src/server/status/types";

const priority: Record<MonitorStatus, number> = { operational: 0, maintenance: 1, degraded: 2, outage: 3, unknown: 4 };

import { isAutomaticRoute } from "../../utils/server-label.mjs";
export { isAutomaticRoute, cleanServerName } from "../../utils/server-label.mjs";

export function isLiveStatusStale(summary: LiveStatusSummary, now = Date.now()) {
  const age = now - Date.parse(summary.generatedAt);
  return !Number.isFinite(age) || age < -60_000 || age > Math.max(300, summary.refreshAfterSeconds * 3) * 1000;
}

export function getNetworkCountries(servers: LiveStatusServer[]) {
  const groups = new Map<string, LiveStatusServer[]>();
  for (const server of servers) {
    if (!/^[A-Z]{2}$/.test(server.countryCode) || isAutomaticRoute(server.name)) continue;
    const group = groups.get(server.countryCode) ?? [];
    group.push(server);
    groups.set(server.countryCode, group);
  }
  return [...groups].map(([code, nodes]) => ({
    code,
    status: nodes.reduce<MonitorStatus>((status, node) => priority[node.status] > priority[status] ? node.status : status, "operational"),
    online: nodes.reduce((count, node) => count + (node.members > 0 ? node.membersOnline : node.status === "operational" ? 1 : 0), 0),
    total: nodes.reduce((count, node) => count + Math.max(1, node.members), 0),
  })).sort((a, b) => a.code.localeCompare(b.code));
}
