"use client";

import { useCallback, useEffect, useState } from "react";
import { CountryFlag } from "@/src/components/country-flag";
import type { MonitorStatus, StatusSnapshot } from "@/src/server/status/types";

const statusLabels: Record<MonitorStatus, string> = {
  operational: "Работает",
  degraded: "Частичные ограничения",
  outage: "Недоступен",
  maintenance: "Технические работы",
  unknown: "Нет данных",
};

function formatTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value));
}

function StatusPill({ status }: { status: MonitorStatus }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{statusLabels[status]}</span>;
}

export function StatusDashboard() {
  const [snapshot, setSnapshot] = useState<StatusSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error("status request failed");
      setSnapshot(await response.json() as StatusSnapshot);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [load]);

  if (!snapshot && !error) {
    return <div className="status-loading" role="status">Получаем актуальное состояние сервисов…</div>;
  }

  if (!snapshot) {
    return <div className="empty-state"><div className="empty-symbol">!</div><h2>Мониторинг временно недоступен</h2><p>Не удалось получить состояние сервисов. Попробуйте обновить страницу через несколько секунд.</p><button className="button button-secondary status-retry" onClick={() => void load(true)}>Повторить</button></div>;
  }

  const operationalServices = snapshot.services.filter((service) => service.status === "operational").length;
  const operationalLocations = snapshot.locations.filter((location) => location.status === "operational").length;

  return <>
    <div className="status-toolbar" aria-live="polite">
      <div><small>Общее состояние</small><StatusPill status={snapshot.status} /></div>
      <div className="status-updated"><small>Последнее обновление</small><strong>{formatTime(snapshot.generatedAt)}</strong></div>
      <button className="button button-secondary status-refresh" disabled={refreshing} onClick={() => void load(true)}>{refreshing ? "Проверяем…" : "Обновить"}</button>
    </div>

    {error && <div className="notice status-warning" role="alert"><span>ⓘ</span><div><strong>Не удалось обновить данные</strong>Показано последнее успешно полученное состояние.</div></div>}

    <div className="status-metrics" aria-label="Краткая сводка мониторинга">
      <div><small>Работающие сервисы</small><strong>{operationalServices}<span>/{snapshot.services.length}</span></strong></div>
      <div><small>Доступные локации</small><strong>{operationalLocations}<span>/{snapshot.locations.length}</span></strong></div>
      <div><small>Интервал проверки</small><strong>{snapshot.refreshAfterSeconds}<span> сек</span></strong></div>
    </div>

    <div className="status-service-grid">
      {snapshot.services.map((service) => <article className="status-service-card" key={service.id}>
        <div className="status-service-head"><StatusPill status={service.status} /><span className="latency">{service.latencyMs === null ? "—" : `${service.latencyMs} мс`}</span></div>
        <h2>{service.name}</h2>
        <p>{service.description}</p>
        <small><span>{service.message}</span><time dateTime={service.checkedAt}>Проверено в {formatTime(service.checkedAt)}</time></small>
      </article>)}
    </div>

    <div className="status-section-heading"><div><span className="eyebrow">Локации</span><h2>Серверные узлы</h2></div><p>Фактическое состояние подключения каждого узла получаем напрямую из Remnawave.</p></div>
    <div className="location-list">
      {snapshot.locations.map((location) => <div className="location-row" key={location.id}>
        <div className="location-name"><CountryFlag code={location.code} /><div><strong>{location.name}</strong><small>{location.region}</small></div></div>
        <div className="location-status"><StatusPill status={location.status} /><small><span>{location.message}</span><time dateTime={location.checkedAt}>Проверено в {formatTime(location.checkedAt)}</time></small></div>
      </div>)}
    </div>

    <div className="status-note"><span>i</span><p><strong>Как читать данные</strong>Задержка для локаций не отображается: без независимых точек проверки такой показатель был бы неточным. Проверка страницы Telegram подтверждает только доступность ссылки. Токены и адреса серверов никогда не передаются в браузер.</p></div>
  </>;
}
