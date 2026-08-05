import type { Metadata } from "next";
import { ReviewsModeration } from "@/src/features/reviews/reviews-moderation";

export const metadata: Metadata = {
  title: "Модерация отзывов",
  robots: { index: false, follow: false, nocache: true },
};

export default function ReviewsModerationPage() {
  return <main className="section-shell page-content moderation-page">
    <header className="section-heading">
      <span className="eyebrow">Закрытый раздел</span>
      <h1>Модерация отзывов</h1>
      <p>Введите значение REVIEWS_ADMIN_TOKEN. Токен используется только для запросов к серверу и не сохраняется в браузере.</p>
      <a className="text-link" href="/status/management">Управление статусом и аналитика →</a>
    </header>
    <ReviewsModeration />
  </main>;
}
