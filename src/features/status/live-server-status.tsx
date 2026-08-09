"use client";

import { useCallback, useEffect, useState } from "react";
import { CountryFlag } from "@/src/components/country-flag";
import { STATUS_PAGE_URL } from "@/src/config/links";
import type { LiveStatusSummary } from "@/src/server/status/live-types";
import type { MonitorStatus } from "@/src/server/status/types";

const labels: Record<MonitorStatus, string> = {
  operational: "Все системы работают",
  degraded: "Есть ограничения",
  outage: "Сервис недоступен",
  maintenance: "Технические работы",
  unknown: "Нет данных",
};

const incidentStatuses: Record<string, string> = {
  investigating: "Изучаем",
  identified: "Причина найдена",
  monitoring: "Наблюдаем",
  resolved: "Устранено",
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function StatusPill({ status }: { status: MonitorStatus }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

function metric(value: number | null, suffix = "") {
  return value === null ? "—" : `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value)}${suffix}`;
}

export function LiveServerStatus() {
  const [summary, setSummary] = useState<LiveStatusSummary | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/live-status", { cache: "no-store" });
      if (!response.ok) throw new Error("live status request failed");
      setSummary(await response.json() as LiveStatusSummary);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), Math.max(30, summary?.refreshAfterSeconds ?? 60) * 1000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load, summary?.refreshAfterSeconds]);

  if (!summary && !error) {
    return <section className="live-status-shell status-loading" aria-label="Статус серверов в реальном времени" aria-busy="true"><span className="live-status-loader" />Получаем данные независимого мониторинга…</section>;
  }

  if (!summary) {
    return <section className="live-status-unavailable glass-card"><div><span className="eyebrow">Независимый мониторинг</span><h2>Сводка временно недоступна</h2><p>Откройте подробную страницу статуса или повторите запрос через несколько секунд.</p></div><div className="live-status-actions"><button className="button button-secondary" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? "Проверяем…" : "Повторить"}</button><a className="button button-primary" href={STATUS_PAGE_URL} target="_blank" rel="noreferrer">Открыть статус ↗</a></div></section>;
  }

  const rank = (status: MonitorStatus) => status === "outage" ? 0 : status === "maintenance" ? 1 : 2;
  const sortedServers = [...summary.servers].sort((left, right) => rank(left.status) - rank(right.status));

  return <section className="live-status-shell" aria-labelledby="live-status-title">
    <div className={`live-status-hero live-status-${summary.status}`}>
      <div className="live-status-hero-copy">
        <span className="live-status-kicker"><span className="live-pulse" /> Данные в реальном времени</span>
        <h2 id="live-status-title">Серверы ST VILLAGE</h2>
        <StatusPill status={summary.status} />
      </div>
      <div className="live-status-hero-meta"><small>Последняя проверка</small><strong>{formatTime(summary.generatedAt)}</strong><button type="button" onClick={() => void load(true)} disabled={refreshing}>{refreshing ? "Обновляем…" : "Обновить данные"}</button></div>
    </div>

    {error && <div className="notice status-warning" role="alert"><span>ⓘ</span><div><strong>Автообновление не удалось</strong>Показываем последнюю успешно полученную сводку.</div></div>}

    <div className="live-status-metrics" aria-label="Сводка статуса серверов">
      <article><small>Серверы в сети</small><strong>{summary.totals.online}<span> / {summary.totals.total}</span></strong><i>Текущая доступность</i></article>
      <article><small>Аптайм за 30 дней</small><strong>{metric(summary.totals.uptime30, "%")}</strong><i>По данным мониторинга</i></article>
      <article><small>Средняя задержка</small><strong>{metric(summary.totals.averageLatencyMs, " мс")}</strong><i>По всем узлам</i></article>
      <article><small>Обновление</small><strong>{summary.refreshAfterSeconds}<span> сек</span></strong><i>Автоматически</i></article>
    </div>

    {summary.incidents.length > 0 && <div className="live-incident-list" aria-label="Активные инциденты">
      {summary.incidents.map((incident) => <article className={`live-incident live-incident-${incident.severity}`} key={incident.id}>
        <div className="live-incident-mark">!</div>
        <div><small>{incidentStatuses[incident.status] ?? incident.status}</small><h3>{incident.title}</h3>{incident.latestUpdate && <p>{incident.latestUpdate}</p>}<div className="live-incident-affected">{incident.affected.map((server, index) => <span key={`${server.name}-${index}`}><CountryFlag code={server.countryCode} />{server.name}</span>)}</div></div>
        {incident.startedAt && <time dateTime={incident.startedAt}>{formatTime(incident.startedAt)}</time>}
      </article>)}
    </div>}

    <div className="live-status-heading"><div><span className="eyebrow">Локации</span><h3>Состояние каждого узла</h3></div><p>Недоступные серверы и технические работы всегда показываются первыми.</p></div>
    <div className="live-server-grid">
      {sortedServers.map((server) => <article className={`live-server-card live-server-${server.status}`} key={server.id}>
        <div className="live-server-main"><CountryFlag code={server.countryCode} /><div><strong>{server.name}</strong>{server.members > 1 && <small>{server.membersOnline} из {server.members} узлов в сети</small>}</div></div>
        <StatusPill status={server.status} />
        <div className="live-server-values"><span><small>Задержка</small><b>{metric(server.latencyMs, " мс")}</b></span><span><small>Аптайм 30 дней</small><b>{metric(server.uptime30, "%")}</b></span></div>
      </article>)}
    </div>

    <div className="live-status-footer"><p><strong>Нужна подробная история?</strong>На отдельной странице доступны графики за 30 дней и журнал инцидентов.</p><a className="button button-secondary" href={STATUS_PAGE_URL} target="_blank" rel="noreferrer">Открыть полный мониторинг ↗</a></div>
  </section>;
}
