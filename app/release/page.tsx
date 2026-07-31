import type { Metadata } from "next";
import Link from "next/link";
import { CtaPanel } from "@/src/components/cta-panel";
import { PageHero } from "@/src/components/page-hero";
import { SITE_RELEASE } from "@/src/config/release";
import { createPageMetadata } from "@/src/config/seo";

export const metadata: Metadata = createPageMetadata({
  title: `Релиз v${SITE_RELEASE.version}`,
  description: "ST VILLAGE v1.0.0 — стабильный запуск сайта, кабинета, Telegram-бота, тарифов, новостей, инструкций и мониторинга инфраструктуры.",
  path: "/release",
});

const releaseHighlights = [
  {
    index: "01",
    title: "Единый клиентский маршрут",
    text: "Сайт ведёт от выбора тарифа и приложения до личного кабинета, Telegram-бота и поддержки без дублирования управления.",
  },
  {
    index: "02",
    title: "Живые данные",
    text: "Тарифы синхронизируются с кабинетом, новости — с Telegram-каналом, а состояние сервисов и локаций обновляется автоматически.",
  },
  {
    index: "03",
    title: "Готовность к эксплуатации",
    text: "Релизы проходят автоматические проверки, сайт сообщает о новой версии, а развёртывание сохраняет возможность безопасного отката.",
  },
] as const;

export default function ReleasePage() {
  return <>
    <PageHero
      eyebrow={`Стабильный канал · v${SITE_RELEASE.version}`}
      title="ST VILLAGE готов к стабильной работе"
      text="Версия 1.0.0 объединяет публичный сайт, отдельный личный кабинет, Telegram-бота, инструкции и прозрачный мониторинг в законченный клиентский сервис."
    />

    <section className="section-shell page-content release-page" aria-labelledby="release-highlights-title">
      <div className="release-banner glass-card">
        <div>
          <div className="eyebrow">{SITE_RELEASE.name}</div>
          <h2 id="release-highlights-title">Первый стабильный релиз</h2>
          <p>Опубликован <time dateTime={SITE_RELEASE.releasedAt}>31 июля 2026 года</time>. Номер версии теперь доступен внизу каждой страницы и ведёт к сведениям о текущем выпуске.</p>
        </div>
        <span className="release-badge" aria-label={`Версия ${SITE_RELEASE.version}`}>v{SITE_RELEASE.version}</span>
      </div>

      <div className="feature-grid release-grid">
        {releaseHighlights.map((item) => <article className="feature-card" key={item.index}>
          <span className="feature-index">{item.index}</span>
          <div className="feature-symbol" aria-hidden="true">{item.index === "01" ? "⌁" : item.index === "02" ? "◉" : "✓"}</div>
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </article>)}
      </div>

      <div className="release-actions glass-card">
        <div>
          <h2>Проверить сервис прямо сейчас</h2>
          <p>Откройте страницу состояния инфраструктуры или перейдите к пошаговой настройке Happ и INCY.</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/status">Состояние сервисов</Link>
          <Link className="button button-secondary" href="/connect">Настроить подключение</Link>
        </div>
      </div>
    </section>

    <section className="section-shell section-block"><CtaPanel /></section>
  </>;
}
