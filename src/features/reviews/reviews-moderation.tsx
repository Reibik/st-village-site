"use client";

import { FormEvent, useState } from "react";
import type { PendingReview } from "@/src/server/storage/database";

type LoadState = "idle" | "loading" | "ready" | "error";

export function ReviewsModeration() {
  const [token, setToken] = useState("");
  const [reviews, setReviews] = useState<PendingReview[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadReviews(event?: FormEvent) {
    event?.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const response = await fetch("/api/reviews?status=pending", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        setState("error");
        setMessage(response.status === 401 ? "Неверный токен модератора." : "Не удалось загрузить отзывы.");
        return;
      }
      const payload = await response.json() as { reviews: PendingReview[] };
      setReviews(payload.reviews);
      setState("ready");
    } catch {
      setState("error");
      setMessage("Не удалось связаться с сервером.");
    }
  }

  async function moderate(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status }),
      });
      const payload = await response.json().catch(() => ({})) as { updated?: boolean; error?: string };
      if (!response.ok || !payload.updated) {
        setMessage(payload.error || "Не удалось изменить статус отзыва.");
        return;
      }
      setReviews((items) => items.filter((review) => review.id !== id));
      setMessage(status === "approved" ? "Отзыв опубликован." : "Отзыв отклонён.");
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setBusyId(null);
    }
  }

  if (state === "idle" || state === "error") {
    return <form className="moderation-login glass-card" onSubmit={loadReviews}>
      <label>Токен модератора<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" required /></label>
      <button className="button button-primary" type="submit">Открыть очередь</button>
      {message && <p className="review-message review-message-error" role="alert">{message}</p>}
    </form>;
  }

  return <div className="moderation-board">
    <div className="moderation-toolbar">
      <p>{state === "loading" ? "Загружаем отзывы…" : `Ожидают проверки: ${reviews.length}`}</p>
      <button className="button button-secondary" type="button" onClick={() => loadReviews()} disabled={state === "loading"}>Обновить</button>
    </div>
    {message && <p className="review-message review-message-sent" role="status" aria-live="polite">{message}</p>}
    {state === "ready" && reviews.length === 0 ? <div className="moderation-empty glass-card"><strong>Очередь пуста</strong><p>Новых отзывов для проверки пока нет.</p></div> : null}
    <div className="moderation-list">
      {reviews.map((review) => <article className="moderation-card glass-card" key={review.id}>
        <div className="moderation-card-head"><strong>{review.displayName}</strong><span aria-label={`${review.rating} из 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
        <p>{review.text}</p>
        <small>{new Date(review.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</small>
        <div className="moderation-actions">
          <button className="button button-primary" type="button" onClick={() => moderate(review.id, "approved")} disabled={busyId === review.id}>Опубликовать</button>
          <button className="button button-secondary" type="button" onClick={() => moderate(review.id, "rejected")} disabled={busyId === review.id}>Отклонить</button>
        </div>
      </article>)}
    </div>
  </div>;
}
