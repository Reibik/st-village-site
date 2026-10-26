import type { Metadata } from "next";
import Link from "next/link";
import { CtaPanel } from "@/src/components/cta-panel";
import { PageHero } from "@/src/components/page-hero";
import { SITE_RELEASE } from "@/src/config/release";
import { releaseHistory } from "@/src/config/release-history";
import { createPageMetadata } from "@/src/config/seo";

export const metadata: Metadata = createPageMetadata({
  title: `Релиз v${SITE_RELEASE.version}`,
  description: `ST VILLAGE v${SITE_RELEASE.version} — праздничное оформление всех публичных страниц, обновлённая главная, флаг Эстонии и исправления мониторинга.`,
  path: "/release",
});

const releaseHighlights = [
  {
    index: "01",
    title: "Праздник на каждой странице",
    text: "Сезонные орбиты появляются автоматически по московскому календарю. Общее оформление можно выключить в подвале сайта.",
  },
  {
    index: "02",
    title: "Выразительнее и удобнее",
    text: "Пробный доступ стал заметнее, подписи — крупнее, а эффекты стекла — спокойнее. Главная сохраняет фирменную орбиту и быстрый переход в кабинет.",
  },
  {
    index: "03",
    title: "Мониторинг без ложных цифр",
    text: "Добавлен флаг Эстонии. Неизвестные показатели и даты больше не отображаются как нулевой аптайм или начало 1970 года.",
  },
] as const;

const releaseDate = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow",
}).format(new Date(SITE_RELEASE.releasedAt));

export default function ReleasePage() {
  return <>
    <PageHero
      eyebrow={`Стабильный канал · v${SITE_RELEASE.version}`}
      title="Фирменная орбита — праздничное обновление"
      text={`Версия ${SITE_RELEASE.version}: праздничное оформление всех публичных страниц, более читаемая главная и точные данные мониторинга.`}
    />

    <section className="section-shell page-content release-page" aria-labelledby="release-highlights-title">
      <div className="release-banner glass-card">
        <div>
          <div className="eyebrow">{SITE_RELEASE.name}</div>
          <h2 id="release-highlights-title">{SITE_RELEASE.name}</h2>
          <p>Выпущен <time dateTime={SITE_RELEASE.releasedAt}>{releaseDate}</time>. Праздничные орбиты, улучшения главной и исправления мониторинга доступны на сайте. Купоны пока закрыты и отмечены бейджем «Скоро».</p>
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

      <section className="release-history" aria-labelledby="release-history-title">
        <div className="section-heading"><span className="eyebrow">История изменений</span><h2 id="release-history-title">Обновления и технические изменения</h2><p>Публичный журнал показывает, что изменилось в сервисе и какие функции готовятся к следующему выпуску.</p></div>
        <div className="release-timeline">{releaseHistory.map((release) => <article className={release.current ? "release-entry release-entry-current" : "release-entry"} key={release.version}>
          <div className="release-entry-marker" aria-hidden="true" />
          <div className="release-entry-meta"><strong>{`v${release.version}`}</strong><span>{release.date}</span></div>
          <ul>{release.items.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>)}</div>
        <p className="release-operations-link">Текущее состояние серверов, задержка и активные инциденты доступны на <Link href="/status">странице статуса</Link>.</p>
      </section>
    </section>

    <section className="section-shell section-block"><CtaPanel /></section>
  </>;
}
