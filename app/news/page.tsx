import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { TELEGRAM_NEWS_URL } from "@/src/config/links";
import { createPageMetadata } from "@/src/config/seo";
import { newsCollectionJsonLd, serializeJsonLd } from "@/src/config/structured-data";
import { TelegramNewsFeed } from "@/src/features/news/telegram-news-feed";

export const metadata: Metadata = createPageMetadata({
  title: "Новости",
  description: "Свежие новости, обновления и технические уведомления из официального Telegram-канала ST VILLAGE.",
  path: "/news",
});

export default function NewsPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(newsCollectionJsonLd) }} />
      <PageHero
        eyebrow="Новости"
        title="Новости ST VILLAGE"
        text="Публикации из официального Telegram-канала появляются здесь автоматически — с изображениями, ссылками, цитатами и исходным форматированием."
      />
      <section className="section-shell page-content telegram-news-page">
        <div className="telegram-news-toolbar">
          <div>
            <span className="live-indicator"><i /> Автоматическое обновление</span>
            <p>Лента проверяет новые публикации каждые несколько минут.</p>
          </div>
          <a className="button button-secondary" href={TELEGRAM_NEWS_URL} target="_blank" rel="noreferrer">
            Открыть канал <span aria-hidden="true">↗</span>
          </a>
        </div>
        <TelegramNewsFeed limit={8} />
      </section>
    </>
  );
}
