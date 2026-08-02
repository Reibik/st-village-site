"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PublicReview } from "@/src/server/storage/database";

function reviewDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { month: "long", year: "numeric" }).format(new Date(value));
}

export function ReviewsBoard() {
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/reviews", { cache: "no-store" });
      if (response.ok) setReviews(((await response.json()) as { reviews: PublicReview[] }).reviews);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setState("sending");
    setMessage("Отправляем отзыв на модерацию…");
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.get("displayName"), rating: Number(form.get("rating")),
          text: form.get("text"), website: form.get("website"),
        }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; stored?: boolean };
      if (!response.ok) {
        setState("error");
        setMessage(payload.error || "Не удалось отправить отзыв. Попробуйте ещё раз.");
        return;
      }
      formElement.reset();
      setState("sent");
      setMessage(payload.stored === false
        ? "Форма работает, но постоянное хранилище тестового стенда временно недоступно. Попробуйте позднее."
        : "Спасибо! Отзыв отправлен на модерацию и появится после проверки.");
    } catch {
      setState("error");
      setMessage("Не удалось связаться с сервером. Проверьте соединение и попробуйте ещё раз.");
    }
  }

  return <div className="reviews-layout">
    <section aria-labelledby="published-reviews-title">
      <div className="section-heading"><span className="eyebrow">Проверенные отзывы</span><h2 id="published-reviews-title">Опыт клиентов</h2><p>Публикуются только отзывы, прошедшие ручную модерацию. Платные и автоматически созданные отзывы не используются.</p></div>
      {loading ? <div className="status-loading" role="status">Загружаем отзывы…</div> : reviews.length ? <div className="review-grid">
        {reviews.map((review) => <article className="review-card glass-card" key={review.id}>
          <div className="review-rating" aria-label={`Оценка ${review.rating} из 5`}>{"★".repeat(review.rating)}<span>{"★".repeat(5 - review.rating)}</span></div>
          <blockquote>«{review.text}»</blockquote>
          <footer><strong>{review.displayName}</strong><time dateTime={review.createdAt}>{reviewDate(review.createdAt)}</time></footer>
        </article>)}
      </div> : <div className="review-empty glass-card"><span>☆</span><div><strong>Здесь появятся первые проверенные отзывы</strong><p>Мы не заполняем раздел вымышленными комментариями. Вы можете стать первым клиентом, который поделится опытом.</p></div></div>}
    </section>

    <aside className="review-form-card glass-card" aria-labelledby="review-form-title">
      <span className="eyebrow">Обратная связь</span><h2 id="review-form-title">Поделиться впечатлением</h2><p>Напишите о качестве подключения, кабинете или поддержке. Не указывайте Telegram ID, ссылки подписки и другие личные данные.</p>
      <form onSubmit={submit}>
        <label>Как вас представить<input name="displayName" required minLength={2} maxLength={40} autoComplete="nickname" placeholder="Имя или псевдоним" /></label>
        <label>Оценка<select name="rating" required defaultValue="5"><option value="5">5 — отлично</option><option value="4">4 — хорошо</option><option value="3">3 — нормально</option><option value="2">2 — есть проблемы</option><option value="1">1 — плохо</option></select></label>
        <label>Ваш отзыв<textarea name="text" required minLength={20} maxLength={800} rows={6} placeholder="Что понравилось и что можно улучшить?" /></label>
        <label className="review-honeypot" aria-hidden="true">Ваш сайт<input name="website" tabIndex={-1} autoComplete="off" /></label>
        <label className="review-consent"><input type="checkbox" required /> <span>Разрешаю опубликовать этот текст и указанное имя после модерации.</span></label>
        <button className="button button-primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "Отправляем…" : "Отправить на модерацию"}</button>
        {message && <p className={`review-message review-message-${state}`} role={state === "error" ? "alert" : "status"} aria-live="polite">{message}</p>}
      </form>
    </aside>
  </div>;
}
