"use client";

import { useEffect, useMemo, useState } from "react";
import { CountryFlag } from "@/src/components/country-flag";
import { locations } from "@/src/config/content";
import type { LiveStatusServer, LiveStatusSummary } from "@/src/server/status/live-types";
import type { MonitorStatus } from "@/src/server/status/types";

const statusPriority: Record<MonitorStatus, number> = {
  operational: 0,
  maintenance: 1,
  degraded: 2,
  outage: 3,
  unknown: 4,
};

const statusLabels: Record<MonitorStatus, string> = {
  operational: "Работает",
  maintenance: "Работы",
  degraded: "Нестабильно",
  outage: "Недоступно",
  unknown: "Проверяем",
};

function aggregateLocation(servers: LiveStatusServer[]) {
  if (!servers.length) return { status: "unknown" as MonitorStatus, online: 0, total: 0 };
  const status = [...servers].sort((left, right) => statusPriority[right.status] - statusPriority[left.status])[0].status;
  return {
    status,
    online: servers.reduce((total, server) => total + server.membersOnline, 0),
    total: servers.reduce((total, server) => total + server.members, 0),
  };
}

export function HomeNetworkShowcase() {
  const [summary, setSummary] = useState<LiveStatusSummary | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/live-status", { cache: "no-store", signal: controller.signal });
        if (!response.ok) return;
        setSummary(await response.json() as LiveStatusSummary);
      } catch {
        // The static network overview remains useful when live status is temporarily unavailable.
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  const locationStates = useMemo(() => new Map(locations.map((location) => [
    location.code,
    aggregateLocation(summary?.servers.filter((server) => server.countryCode === location.code) ?? []),
  ])), [summary]);

  const overallStatus = summary?.status ?? "unknown";

  return (
    <section className="section-shell section-block" id="locations" aria-labelledby="network-title">
      <div className="network-showcase">
        <span className="network-ambient network-ambient-one" aria-hidden="true" />
        <span className="network-ambient network-ambient-two" aria-hidden="true" />

        <div className="network-copy">
          <div className="eyebrow"><span className={`network-live-dot network-live-${overallStatus}`} /> Сеть ST VILLAGE</div>
          <h2 id="network-title">Европа рядом.<br /><span>Сеть всегда на виду.</span></h2>
          <p>Выбирайте подходящий маршрут, а состояние инфраструктуры проверяйте в реальном времени. Данные обновляются автоматически и без скрытых показателей.</p>

          <div className="network-facts" aria-label="Показатели инфраструктуры">
            <div><strong>{summary ? `${summary.totals.online}/${summary.totals.total}` : "—"}</strong><span>узлов сейчас в сети</span></div>
            <div><strong>{locations.length}</strong><span>стран в инфраструктуре</span></div>
            <div><strong>60 сек</strong><span>интервал обновления</span></div>
          </div>

          <div className="network-actions">
            <a className="button button-primary" href="/status">Открыть живой мониторинг <span aria-hidden="true">→</span></a>
            <span className={`network-overall network-overall-${overallStatus}`}><i />{summary ? statusLabels[overallStatus] : "Получаем данные"}</span>
          </div>
        </div>

        <div className="network-map" aria-label="Схема серверной сети ST VILLAGE">
          <span className="network-map-caption" aria-hidden="true">ST VILLAGE NETWORK · EUROPE</span>
          {locations.map((location) => {
            const state = locationStates.get(location.code) ?? { status: "unknown" as MonitorStatus, online: 0, total: 0 };
            return (
              <div className={`network-node network-node-${location.code.toLowerCase()} network-node-${state.status}`} key={location.code}>
                <CountryFlag code={location.code} />
                <div><strong>{location.name}</strong><small>{state.total ? `${state.online}/${state.total} узлов в сети` : location.region}</small></div>
                <span className="network-node-state" aria-label={statusLabels[state.status]} />
              </div>
            );
          })}
          {locations.map((location) => <span className={`network-link network-link-${location.code.toLowerCase()}`} aria-hidden="true" key={`link-${location.code}`} />)}
          <div className="network-core">
            <span className="network-core-pulse" aria-hidden="true" />
            <strong>{summary ? summary.totals.online : "ST"}</strong>
            <small>{summary ? "узлов онлайн" : "центр сети"}</small>
          </div>
          <div className="network-legend"><span><i className="network-live-operational" /> Доступно</span><span><i className="network-live-unknown" /> Обновляется онлайн</span></div>
        </div>
      </div>
    </section>
  );
}
