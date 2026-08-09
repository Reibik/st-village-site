"use client";

import { FormEvent, useCallback, useState } from "react";
import type { Incident, PrivateMetricsSummary } from "@/src/server/storage/database";

const emptyIncident = (): Incident => ({
  id: "", title: "", summary: "", severity: "info", status: "investigating", planned: false,
  affectedServices: [], startsAt: new Date().toISOString(), resolvedAt: null,
});

export function StatusManagement() {
  const [token, setToken] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<PrivateMetricsSummary | null>(null);
  const [draft, setDraft] = useState<Incident>(emptyIncident);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = useCallback(() => ({ "X-ST-Village-Status-Token": token }), [token]);

  async function load(event?: FormEvent) {
    event?.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const [incidentResponse, metricsResponse] = await Promise.all([
        fetch("/api/incidents", { cache: "no-store" }),
        fetch("/api/analytics?days=30", { cache: "no-store", headers: headers() }),
      ]);
      if (!metricsResponse.ok) {
        setAuthenticated(false);
        setMessage(metricsResponse.status === 401 ? "Неверный STATUS_ADMIN_TOKEN." : "Не удалось открыть панель управления.");
        return;
      }
      setIncidents(((await incidentResponse.json()) as { incidents: Incident[] }).incidents);
      setMetrics(await metricsResponse.json() as PrivateMetricsSummary);
      setAuthenticated(true);
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers() },
        body: JSON.stringify(draft),
      });
      const payload = await response.json().catch(() => ({})) as { incident?: Incident; error?: string };
      if (!response.ok || !payload.incident) {
        setMessage(payload.error || "Не удалось сохранить инцидент.");
        return;
      }
      setDraft(emptyIncident());
      await load();
      setMessage("Публикация сохранена на странице статуса.");
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(incident: Incident) {
    setDraft({ ...incident, status: "resolved", resolvedAt: new Date().toISOString() });
    setMessage("Данные перенесены в форму. Проверьте и нажмите «Сохранить публикацию».");
  }

  if (!authenticated) return <form className="moderation-login glass-card" onSubmit={load}>
    <label>STATUS_ADMIN_TOKEN<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" required /></label>
    <button className="button button-primary" type="submit" disabled={busy}>Открыть управление</button>
    {message && <p className="review-message review-message-error" role="alert">{message}</p>}
  </form>;

  return <div className="status-management">
    <section className="admin-metrics-grid" aria-label="Приватная аналитика за 30 дней">
      <article className="glass-card"><small>Переходы в кабинет</small><strong>{metrics?.outbound.cabinet ?? 0}</strong></article>
      <article className="glass-card"><small>Переходы в Telegram</small><strong>{metrics?.outbound.telegram ?? 0}</strong></article>
      {(metrics?.vitals ?? []).map((metric) => <article className="glass-card" key={metric.name}><small>{metric.name} · {metric.samples} замеров</small><strong>{Math.round(metric.average)}{metric.name === "CLS" ? "" : " мс"}</strong></article>)}
    </section>
    <section className="status-admin-grid">
      <form className="incident-editor glass-card" onSubmit={save}>
        <h2>{draft.id ? "Изменить публикацию" : "Новая публикация"}</h2>
        <label>Заголовок<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} maxLength={120} required /></label>
        <label>Описание<textarea value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} rows={6} maxLength={1500} required /></label>
        <div className="incident-editor-row">
          <label>Важность<select value={draft.severity} onChange={(event) => setDraft({ ...draft, severity: event.target.value as Incident["severity"] })}><option value="info">Информация</option><option value="minor">Ограничения</option><option value="major">Серьёзный сбой</option></select></label>
          <label>Состояние<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as Incident["status"] })}><option value="investigating">Изучаем</option><option value="monitoring">Наблюдаем</option><option value="scheduled">Запланировано</option><option value="resolved">Завершено</option></select></label>
        </div>
        <label>Затронутые сервисы<input value={draft.affectedServices.join(", ")} onChange={(event) => setDraft({ ...draft, affectedServices: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} placeholder="Сайт, кабинет, Германия #1" /></label>
        <label className="review-consent"><input type="checkbox" checked={draft.planned} onChange={(event) => setDraft({ ...draft, planned: event.target.checked })} /><span>Плановые технические работы</span></label>
        <div className="moderation-actions"><button className="button button-primary" type="submit" disabled={busy}>Сохранить публикацию</button>{draft.id && <button className="button button-secondary" type="button" onClick={() => setDraft(emptyIncident())}>Отмена</button>}</div>
      </form>
      <div className="incident-admin-list">
        <div className="moderation-toolbar"><h2>Все публикации</h2><button className="button button-secondary" type="button" onClick={() => void load()} disabled={busy}>Обновить</button></div>
        {message && <p className="review-message review-message-sent" role="status">{message}</p>}
        {incidents.map((incident) => <article className="moderation-card glass-card" key={incident.id}>
          <div className="moderation-card-head"><strong>{incident.title}</strong><span>{incident.status}</span></div>
          <p>{incident.summary}</p>
          <div className="moderation-actions"><button className="button button-secondary" type="button" onClick={() => setDraft(incident)}>Изменить</button>{incident.status !== "resolved" && <button className="button button-primary" type="button" onClick={() => void resolve(incident)}>Завершить</button>}</div>
        </article>)}
      </div>
    </section>
  </div>;
}
