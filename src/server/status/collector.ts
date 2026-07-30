import { locations as fallbackLocations } from "@/src/config/content";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";
import type { LocationStatus, MonitorStatus, ServiceStatus, StatusSnapshot } from "./types";

interface LocationConfig {
  id: string;
  code: string;
  name: string;
  region: string;
  probeUrl?: string;
  remnawaveUuid?: string;
}

interface RemnawaveResult {
  service: ServiceStatus;
  nodes: Map<string, MonitorStatus>;
}

const allowedProtocols = new Set(["https:", "http:"]);

function now() {
  return new Date().toISOString();
}

function timeoutMs() {
  const configured = Number.parseInt(process.env.STATUS_PROBE_TIMEOUT_MS ?? "4000", 10);
  return Number.isFinite(configured) ? Math.min(Math.max(configured, 500), 10_000) : 4000;
}

function safeUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return allowedProtocols.has(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

async function probeHttp(
  id: string,
  name: string,
  description: string,
  target: string | undefined,
  unavailableMessage: string,
): Promise<ServiceStatus> {
  const checkedAt = now();
  const url = safeUrl(target);

  if (!url) {
    return { id, name, description, status: "unknown", latencyMs: null, checkedAt, message: unavailableMessage };
  }

  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs()),
      headers: { "User-Agent": "ST-VILLAGE-Status/1.0" },
    });
    const latencyMs = Date.now() - startedAt;
    const status: MonitorStatus = response.ok || (response.status >= 300 && response.status < 400) ? "operational" : "outage";
    return {
      id,
      name,
      description,
      status,
      latencyMs,
      checkedAt,
      message: status === "operational" ? "Сервис отвечает" : `Сервис вернул код ${response.status}`,
    };
  } catch {
    return { id, name, description, status: "outage", latencyMs: null, checkedAt, message: "Нет ответа на проверку" };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function findNodeArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!isRecord(payload)) return [];
  for (const key of ["nodes", "data", "response"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (isRecord(value)) {
      const nested = value.nodes ?? value.data;
      if (Array.isArray(nested)) return nested;
    }
  }
  return [];
}

function nodeId(node: Record<string, unknown>) {
  const value = node.uuid ?? node.id;
  return typeof value === "string" ? value : null;
}

function nodeStatus(node: Record<string, unknown>): MonitorStatus {
  if (node.isDisabled === true || node.disabled === true) return "maintenance";
  const connected = node.isConnected ?? node.isOnline ?? node.connected ?? node.online;
  if (connected === true) return "operational";
  if (connected === false) return "outage";
  const raw = typeof node.status === "string" ? node.status.toLowerCase() : "";
  if (["online", "connected", "enabled", "active"].includes(raw)) return "operational";
  if (["offline", "disconnected", "disabled", "inactive"].includes(raw)) return "outage";
  return "unknown";
}

async function probeRemnawave(): Promise<RemnawaveResult> {
  const checkedAt = now();
  const baseUrl = safeUrl(process.env.REMNAWAVE_BASE_URL);
  const token = process.env.REMNAWAVE_API_TOKEN?.trim();
  const path = process.env.REMNAWAVE_NODES_PATH?.trim() || "/api/nodes";
  if (!baseUrl || !token) {
    return {
      service: {
        id: "remnawave",
        name: "Серверная инфраструктура",
        description: "Состояние узлов по данным Remnawave",
        status: "unknown",
        latencyMs: null,
        checkedAt,
        message: "Ожидает подключения Remnawave",
      },
      nodes: new Map(),
    };
  }

  const url = new URL(path, baseUrl);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs()),
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      return {
        service: {
          id: "remnawave",
          name: "Серверная инфраструктура",
          description: "Состояние узлов по данным Remnawave",
          status: "outage",
          latencyMs,
          checkedAt,
          message: `API мониторинга вернул код ${response.status}`,
        },
        nodes: new Map(),
      };
    }

    const payload: unknown = await response.json();
    const nodes = new Map<string, MonitorStatus>();
    for (const item of findNodeArray(payload)) {
      if (!isRecord(item)) continue;
      const id = nodeId(item);
      if (id) nodes.set(id, nodeStatus(item));
    }
    return {
      service: {
        id: "remnawave",
        name: "Серверная инфраструктура",
        description: "Состояние узлов по данным Remnawave",
        status: "operational",
        latencyMs,
        checkedAt,
        message: nodes.size ? `Получены данные по ${nodes.size} узлам` : "API мониторинга отвечает",
      },
      nodes,
    };
  } catch {
    return {
      service: {
        id: "remnawave",
        name: "Серверная инфраструктура",
        description: "Состояние узлов по данным Remnawave",
        status: "outage",
        latencyMs: null,
        checkedAt,
        message: "API мониторинга не отвечает",
      },
      nodes: new Map(),
    };
  }
}

function parseLocations(): LocationConfig[] {
  const raw = process.env.STATUS_LOCATIONS_JSON?.trim();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const valid = parsed.flatMap((item): LocationConfig[] => {
          if (!isRecord(item)) return [];
          const { id, code, name, region, probeUrl, remnawaveUuid } = item;
          if (![id, code, name, region].every((value) => typeof value === "string" && value.length > 0)) return [];
          return [{
            id: id as string,
            code: code as string,
            name: name as string,
            region: region as string,
            probeUrl: typeof probeUrl === "string" ? probeUrl : undefined,
            remnawaveUuid: typeof remnawaveUuid === "string" ? remnawaveUuid : undefined,
          }];
        });
        if (valid.length) return valid;
      }
    } catch {
      // Invalid optional configuration falls back to the public location list.
    }
  }
  return fallbackLocations.map((location) => ({ id: location.code.toLowerCase(), ...location }));
}

async function collectLocation(location: LocationConfig, remnawave: RemnawaveResult): Promise<LocationStatus> {
  const probe = location.probeUrl
    ? await probeHttp(location.id, location.name, location.region, location.probeUrl, "Адрес проверки не настроен")
    : null;
  const panelStatus = location.remnawaveUuid ? remnawave.nodes.get(location.remnawaveUuid) : undefined;

  let status: MonitorStatus = probe?.status ?? panelStatus ?? "unknown";
  let message = probe?.message ?? (panelStatus ? "Состояние получено из Remnawave" : "Ожидает подключения мониторинга");
  if (probe?.status === "operational" && panelStatus === "outage") {
    status = "degraded";
    message = "Узел доступен, но отключён от панели";
  }
  if (probe?.status === "outage" && panelStatus === "operational") {
    status = "degraded";
    message = "Узел виден в панели, внешняя проверка не прошла";
  }

  return {
    id: location.id,
    code: location.code,
    name: location.name,
    region: location.region,
    status,
    checkedAt: probe?.checkedAt ?? remnawave.service.checkedAt,
    message,
  };
}

function overallStatus(items: Array<{ status: MonitorStatus }>): MonitorStatus {
  const statuses = items.map((item) => item.status);
  if (statuses.includes("outage")) return "outage";
  if (statuses.includes("degraded")) return "degraded";
  if (statuses.includes("maintenance")) return "maintenance";
  if (statuses.length && statuses.every((status) => status === "operational")) return "operational";
  return "unknown";
}

export async function collectStatus(): Promise<StatusSnapshot> {
  const generatedAt = now();
  const website: ServiceStatus = {
    id: "website",
    name: "Публичный сайт",
    description: "Основной сайт и страница статуса",
    status: "operational",
    latencyMs: null,
    checkedAt: generatedAt,
    message: "Страница статуса отвечает",
  };
  const botHealthUrl = process.env.STATUS_BOT_HEALTHCHECK_URL?.trim();
  const [cabinet, telegram, remnawave] = await Promise.all([
    probeHttp("cabinet", "Личный кабинет", "Вход и управление подпиской", process.env.STATUS_CABINET_URL || CABINET_URL, "Адрес кабинета не настроен"),
    probeHttp(
      "telegram",
      botHealthUrl ? "Telegram-бот" : "Страница Telegram-бота",
      botHealthUrl ? "Серверная проверка процесса бота" : "Доступность публичной страницы в Telegram",
      botHealthUrl || process.env.STATUS_TELEGRAM_URL || TELEGRAM_BOT_URL,
      "Адрес проверки бота не настроен",
    ),
    probeRemnawave(),
  ]);
  const locations = await Promise.all(parseLocations().map((location) => collectLocation(location, remnawave)));
  const services = [website, cabinet, telegram, remnawave.service];
  return { status: overallStatus([...services, ...locations]), generatedAt, refreshAfterSeconds: 30, services, locations };
}
