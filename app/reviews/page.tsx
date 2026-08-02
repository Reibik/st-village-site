import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { createPageMetadata } from "@/src/config/seo";
import { ReviewsBoard } from "@/src/features/reviews/reviews-board";

export const metadata: Metadata = createPageMetadata({
  title: "Отзывы клиентов",
  description: "Проверенные отзывы клиентов ST VILLAGE и форма обратной связи с предварительной модерацией.",
  path: "/reviews",
});

export default function ReviewsPage() {
  return <>
    <PageHero eyebrow="Отзывы" title="Честная обратная связь" text="Публикуем только реальные отзывы после ручной проверки — без вымышленных комментариев и скрытой рекламы." />
    <section className="section-shell page-content"><ReviewsBoard /></section>
  </>;
}

