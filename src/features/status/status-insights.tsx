"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { HistoryPoint, HistoryRange, Incident } from "@/src/server/storage/database";
import type { RegionalCheck } from "@/src/server/status/regional-checks";

type Payload = {
  range: HistoryRange;
  history: { points: HistoryPoint[]; persistent: boolean };
  incidents: Incident[];
  regions: RegionalCheck[];
  generatedAt: string;
};

const rangeLabels: Record<HistoryRange, string> = { "24h": "24 часа", "7d": "7 дней", "30d": "30 дней" };

function samplePoints(points: HistoryPoint[], limit = 60) {
  if (points.length <= limit) return points;
  const step = Math.ceil(points.length / limit);
  return points.filter((_, index) => index % step === 0 || index === points.length - 1);
}

function average(points: HistoryPoint[], key: "serviceAvailability" | "locationAvailability") {
  return points.length ? points.reduce((sum, point) => sum + point[key], 0) / points.length : null;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function StatusInsights() {
  const [range, setRange] = useState<HistoryRange>("24h");
  const [payload, setPayload] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextRange: HistoryRange) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/observability?range=${nextRange}`, { cache: "no-store" });
      if (!response.ok) throw new Error("observability request failed");
      setPayload(await response.json() as Payload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(range), 0);
    return () => window.clearTimeout(timer);
  }, [load, range]);
  const points = useMemo(() => samplePoints(payload?.history.points ?? []), [payload]);
  const serviceAverage = average(payload?.history.points ?? [], "serviceAvailability");
  const locationAverage = average(payload?.history.points ?? [], "locationAvailability");

  return <div className="status-insights">
    <section className="status-history glass-card" aria-labelledby="availability-history-title">
      <div className="status-insights-head">
        <div><span className="eyebrow">История доступности</span><h2 id="availability-history-title">Стабильность во времени</h2></div>
        <div className="range-switcher" aria-label="Период истории">
          {(Object.keys(rangeLabels) as HistoryRange[]).map((item) => <button key={item} type="button" aria-pressed={range === item} onClick={() => setRange(item)}>{rangeLabels[item]}</button>)}
        </div>
      </div>
      {loading && !payload ? <div className="status-loading" role="status">Загружаем историю и региональные проверки…</div> : <>
        <div className="availability-summary" aria-label="Средняя доступность за выбранный период">
          <div><small>Сервисы</small><strong>{serviceAverage === null ? "—" : `${serviceAverage.toFixed(1)}%`}</strong></div>
          <div><small>Локации</small><strong>{locationAverage === null ? "—" : `${locationAverage.toFixed(1)}%`}</strong></div>
          <div><small>Замеров</small><strong>{payload?.history.points.length ?? 0}</strong></div>
        </div>
        {points.length ? <div className="availability-chart" role="img" aria-label={`История доступности за ${rangeLabels[range]}`}>
          {points.map((point) => <div className="availability-column" key={point.checkedAt} title={`${formatDate(point.checkedAt)} — сервисы ${point.serviceAvailability}%, локации ${point.locationAvailability}%`}>
            <span style={{ height: `${Math.max(point.locationAvailability, 3)}%` }} />
            <i style={{ height: `${Math.max(point.serviceAvailability, 3)}%` }} />
          </div>)}
        </div> : <div className="insight-empty"><strong>История начинает накапливаться</strong><span>Новые замеры сохраняются каждые пять минут. График появится после первых проверок.</span></div>}
        {payload && !payload.history.persistent && <p className="persistence-note">На этом стенде показаны замеры текущего запуска. Постоянная история включается через защищённую базу сайта.</p>}
      </>}
    </section>

    <section className="regional-checks" aria-labelledby="regional-checks-title">
      <div className="status-section-heading"><div><span className="eyebrow">Несколько регионов</span><h2 id="regional-checks-title">Доступность снаружи</h2></div><p>Независимые HTTPS-проверки выполняются через распределённую сеть Globalping и кешируются на 15 минут.</p></div>
      <div className="regional-grid">
        {(payload?.regions ?? []).map((region) => <article className="regional-card" key={region.id}>
          <span className={`status-dot status-${region.status}`} aria-hidden="true" />
          <div><small>{region.label}</small><strong>{region.city === "—" ? region.country : `${region.city}, ${region.country}`}</strong></div>
          <span>{region.status === "operational" ? "Доступен" : region.status === "outage" ? "Недоступен" : "Нет данных"}</span>
          <b>{region.latencyMs === null ? "—" : `${region.latencyMs} мс`}</b>
        </article>)}
        {!payload?.regions.length && <div className="insight-empty"><strong>Региональная проверка готовится</strong><span>Повторите загрузку через несколько минут.</span></div>}
      </div>
    </section>

    <section className="incident-feed" id="incidents" aria-labelledby="incident-feed-title">
      <div className="status-section-heading"><div><span className="eyebrow">Прозрачность</span><h2 id="incident-feed-title">Инциденты и технические работы</h2></div><p>Здесь публикуются активные проблемы, плановые работы и итоговые отчёты.</p></div>
      {payload?.incidents.length ? <div className="incident-list">{payload.incidents.map((incident) => <article className={`incident-item incident-${incident.severity}`} key={incident.id}>
        <div><span>{incident.planned ? "Плановые работы" : incident.status === "resolved" ? "Завершено" : "Инцидент"}</span><time dateTime={incident.startsAt}>{formatDate(incident.startsAt)}</time></div>
        <h3>{incident.title}</h3><p>{incident.summary}</p>
        {incident.affectedServices.length > 0 && <small>Затронуто: {incident.affectedServices.join(", ")}</small>}
      </article>)}</div> : <div className="incident-clear"><span>✓</span><div><strong>Активных инцидентов нет</strong><p>Сервисы работают штатно, плановые технические работы не объявлены.</p></div></div>}
    </section>
  </div>;
}
