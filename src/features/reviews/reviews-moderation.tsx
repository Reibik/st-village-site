"use client";

import { FormEvent, useCallback, useState } from "react";
import type { ManagedReview } from "@/src/server/storage/database";

type LoadState = "idle" | "loading" | "ready" | "error";
type ReviewStatus = ManagedReview["status"];

const statusLabels: Record<ReviewStatus, string> = {
  pending: "Ожидают проверки",
  approved: "Опубликованы",
  rejected: "Отклонены",
};

export function ReviewsModeration() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<ReviewStatus>("pending");
  const [reviews, setReviews] = useState<ManagedReview[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadReviews = useCallback(async (nextStatus: ReviewStatus, event?: FormEvent) => {
    event?.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const response = await fetch(`/api/reviews?status=${nextStatus}`, {
        cache: "no-store",
        headers: { "X-ST-Village-Admin-Token": token },
      });
      if (!response.ok) {
        setState("error");
        setMessage(response.status === 401 ? "Неверный токен модератора." : response.status === 429 ? "Слишком много запросов. Подождите несколько минут." : "Не удалось загрузить отзывы.");
        return;
      }
      const payload = await response.json() as { reviews: ManagedReview[] };
      setStatus(nextStatus);
      setReviews(payload.reviews);
      setState("ready");
    } catch {
      setState("error");
      setMessage("Не удалось связаться с сервером.");
    }
  }, [token]);

  async function moderate(id: string, nextStatus: "approved" | "rejected") {
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-ST-Village-Admin-Token": token },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const payload = await response.json().catch(() => ({})) as { updated?: boolean; error?: string };
      if (!response.ok || !payload.updated) {
        setMessage(payload.error || "Не удалось изменить статус отзыва.");
        return;
      }
      setReviews((items) => items.filter((review) => review.id !== id));
      setMessage(nextStatus === "approved" ? "Отзыв опубликован." : "Отзыв снят с публикации.");
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Удалить отзыв без возможности восстановления?")) return;
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/reviews", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "X-ST-Village-Admin-Token": token },
        body: JSON.stringify({ id }),
      });
      const payload = await response.json().catch(() => ({})) as { deleted?: boolean; error?: string };
      if (!response.ok || !payload.deleted) {
        setMessage(payload.error || "Не удалось удалить отзыв.");
        return;
      }
      setReviews((items) => items.filter((review) => review.id !== id));
      setMessage("Отзыв удалён.");
    } catch {
      setMessage("Не удалось связаться с сервером.");
    } finally {
      setBusyId(null);
    }
  }

  if (state === "idle" || state === "error") {
    return <form className="moderation-login glass-card" onSubmit={(event) => loadReviews("pending", event)}>
      <label>Токен модератора<input type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="current-password" required /></label>
      <button className="button button-primary" type="submit">Открыть модерацию</button>
      {message && <p className="review-message review-message-error" role="alert">{message}</p>}
    </form>;
  }

  return <div className="moderation-board">
    <div className="moderation-tabs" role="tablist" aria-label="Статус отзывов">
      {(Object.keys(statusLabels) as ReviewStatus[]).map((item) => <button key={item} type="button" role="tab" aria-selected={status === item} onClick={() => void loadReviews(item)}>{statusLabels[item]}</button>)}
    </div>
    <div className="moderation-toolbar">
      <p>{state === "loading" ? "Загружаем отзывы…" : `${statusLabels[status]}: ${reviews.length}`}</p>
      <button className="button button-secondary" type="button" onClick={() => void loadReviews(status)} disabled={state === "loading"}>Обновить</button>
    </div>
    {message && <p className="review-message review-message-sent" role="status" aria-live="polite">{message}</p>}
    {state === "ready" && reviews.length === 0 ? <div className="moderation-empty glass-card"><strong>Список пуст</strong><p>В этой категории отзывов пока нет.</p></div> : null}
    <div className="moderation-list">
      {reviews.map((review) => <article className="moderation-card glass-card" key={review.id}>
        <div className="moderation-card-head"><strong>{review.displayName}</strong><span aria-label={`${review.rating} из 5`}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span></div>
        <p>{review.text}</p>
        <small>{new Date(review.createdAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}</small>
        <div className="moderation-actions">
          {status !== "approved" && <button className="button button-primary" type="button" onClick={() => moderate(review.id, "approved")} disabled={busyId === review.id}>Опубликовать</button>}
          {status !== "rejected" && <button className="button button-secondary" type="button" onClick={() => moderate(review.id, "rejected")} disabled={busyId === review.id}>{status === "approved" ? "Снять с публикации" : "Отклонить"}</button>}
          {status !== "pending" && <button className="button moderation-delete" type="button" onClick={() => remove(review.id)} disabled={busyId === review.id}>Удалить</button>}
        </div>
      </article>)}
    </div>
  </div>;
}
