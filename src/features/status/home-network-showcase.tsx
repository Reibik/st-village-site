"use client";

import { useEffect, useState } from "react";
import { CountryFlag, countryName } from "@/src/components/country-flag";
import type { LiveStatusSummary } from "@/src/server/status/live-types";
import { getNetworkCountries, isLiveStatusStale } from "./network-catalog";

const labels = { operational: "Сеть работает", maintenance: "Технические работы", degraded: "Есть ограничения", outage: "Сеть недоступна", unknown: "Получаем данные" };

export function HomeNetworkShowcase() {
  const [summary, setSummary] = useState<LiveStatusSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let loading = false;
    const load = async () => {
      if (loading) return;
      loading = true;
      try {
        const response = await fetch("/api/live-status", { cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (!response.ok) throw new Error("Status unavailable");
        const data = await response.json() as LiveStatusSummary;
        if (!Array.isArray(data.servers) || !data.totals) throw new Error("Invalid status");
        if (!controller.signal.aborted) { setSummary(data); setFailed(false); setNow(Date.now()); }
      } catch {
        if (!controller.signal.aborted) setFailed(true);
      } finally { loading = false; }
    };
    void load();
    const timer = window.setInterval(() => { setNow(Date.now()); void load(); }, 60_000);
    const visible = () => { if (document.visibilityState === "visible") { setNow(Date.now()); void load(); } };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); window.clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, []);
  const stale = !!summary && (failed || isLiveStatusStale(summary, now));
  const countries = summary ? getNetworkCountries(summary.servers) : [];
  const status = stale || !summary ? "unknown" : summary.status;
  return <section className="section-shell section-block" id="locations" aria-labelledby="network-title">
    <div className="network-showcase">
      <div className="network-copy">
        <div className="eyebrow">Открытая инфраструктура</div>
        <h2 id="network-title">Не обещаем.<br /><span>Показываем.</span></h2>
        <p>Состояние сети — не рекламная цифра. Проверяйте доступность серверов и активные инциденты в независимом мониторинге.</p>
        <a className="text-link" href="/status">Открыть живой мониторинг <span aria-hidden="true">→</span></a>
      </div>
      <div className="network-console" aria-label="Сводка серверной сети ST VILLAGE">
        <div className="network-console-header"><span>ST VILLAGE NETWORK</span><span className={`network-overall network-overall-${status}`}><i />{stale ? "Данные устарели" : failed ? "Сводка недоступна" : labels[status]}</span></div>
        <div className="network-facts">
          <div><strong>{summary ? `${summary.totals.online}/${summary.totals.total}` : "—"}</strong><span>{stale ? "в последней сводке" : "узлов и маршрутов"}</span></div>
          <div><strong>{summary ? countries.length : "—"}</strong><span>стран в сети</span></div>
          <div><strong>60 сек</strong><span>обновление сводки</span></div>
        </div>
        <div className="network-country-grid">
          {countries.map((country) => <div className={`network-country network-node-${stale ? "unknown" : country.status}`} key={country.code}>
            <CountryFlag code={country.code} /><div><strong>{countryName(country.code)}</strong><small>{stale ? "Последние данные" : `${country.online}/${country.total} узлов в сети`}</small></div><span className="network-node-state" aria-label={stale ? "Данные устарели" : labels[country.status]} />
          </div>)}
          {!countries.length && <p>{failed ? "Не удалось получить сводку. Полный мониторинг доступен по ссылке." : "Загружаем актуальные локации…"}</p>}
        </div>
        <p className="network-console-note">{stale ? "Не считаем сохранённые данные текущей доступностью." : summary?.incidents.some((item) => item.status !== "resolved") ? "Есть активные сообщения мониторинга. Подробности — на странице статуса." : "Автоматические маршруты не входят в число стран."}</p>
      </div>
    </div>
  </section>;
}
