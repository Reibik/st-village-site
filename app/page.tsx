import Image from "next/image";
import { CtaPanel } from "@/src/components/cta-panel";
import { CountryFlag } from "@/src/components/country-flag";
import { FaqList } from "@/src/components/faq-list";
import { SectionHeading } from "@/src/components/section-heading";
import { PlatformStrip } from "@/src/components/platform-strip";
import { TelegramNewsFeed } from "@/src/features/news/telegram-news-feed";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";
import { homeFaqs, locations } from "@/src/config/content";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";

const advantages = [
  {
    index: "01",
    title: "Подключение без лишней сложности",
    text: "Пошаговый мастер сосредоточен на двух основных приложениях — Happ и INCY — и ведёт до готового подключения.",
  },
  {
    index: "02",
    title: "Инфраструктура под наблюдением",
    text: "Состояние сервисов и серверных локаций доступно на отдельной странице и обновляется автоматически.",
  },
  {
    index: "03",
    title: "Управление в одном месте",
    text: "Сайт, отдельный кабинет и Telegram-бот образуют понятный маршрут без дублирования интерфейсов.",
  },
];

const steps = [
  ["01", "Откройте Telegram-бота", "Начните работу в официальном боте ST VILLAGE."],
  ["02", "Перейдите в кабинет", "Управляйте сервисом на отдельном клиентском портале."],
  ["03", "Настройте устройство", "Следуйте инструкции для своей платформы."],
];

export default function Home() {
  return (
    <>
      <section className="hero section-shell" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="eyebrow"><span className="status-dot" /> Цифровая экосистема ST VILLAGE</div>
          <h1 id="hero-title">Стабильное подключение <span>к цифровому миру</span></h1>
          <p className="hero-lead">Современная инфраструктура, удобное управление и поддержка на каждом этапе — в одном аккуратном сервисе.</p>
          <div className="hero-actions">
            <a className="button button-primary" href={CABINET_URL} target="_blank" rel="noreferrer">Открыть личный кабинет <span aria-hidden="true">↗</span></a>
            <a className="button button-secondary" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer"><span className="telegram-glyph" aria-hidden="true">↗</span> Открыть Telegram-бота</a>
          </div>
          <div className="hero-facts" aria-label="Возможности сервиса">
            <div><strong>6</strong><span>поддерживаемых платформ</span></div>
            <div><strong>24/7</strong><span>страница состояния</span></div>
            <div><strong>2</strong><span>прямых клиентских канала</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="Фирменный помощник ST VILLAGE">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="logo-halo" />
          <Image src="/brand-emblem.png" alt="Эмблема ST VILLAGE с фирменным роботом" width="720" height="720" priority unoptimized sizes="(max-width: 680px) 92vw, 500px" />
          <div className="signal-card signal-card-top"><span className="signal-icon">◎</span><div><small>Состояние</small><strong>Мониторинг активен</strong></div></div>
          <div className="signal-card signal-card-bottom"><span className="signal-icon">⌁</span><div><small>Подключение</small><strong>Happ и INCY</strong></div></div>
        </div>
      </section>

      <PlatformStrip />

      <section className="section-shell section-block" id="features">
        <SectionHeading eyebrow="Основа сервиса" title="Всё необходимое. Без лишнего." text="ST VILLAGE объединяет подключение, управление и поддержку в цельный пользовательский путь." />
        <div className="feature-grid">
          {advantages.map((item) => (
            <article className="feature-card" key={item.index}>
              <span className="feature-index">{item.index}</span>
              <div className="feature-symbol" aria-hidden="true">{item.index === "01" ? "⌁" : item.index === "02" ? "◉" : "◇"}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-block split-showcase" id="capabilities">
        <div className="showcase-copy">
          <div className="eyebrow">Возможности</div>
          <h2>Один сервис — разные сценарии</h2>
          <p>Продуманная структура помогает быстро найти нужное действие: от первого подключения до обращения в поддержку.</p>
          <ul className="check-list">
            <li><span>✓</span> Безопасное управление подключением</li>
            <li><span>✓</span> Отдельный личный кабинет</li>
            <li><span>✓</span> Инструкции для всех основных устройств</li>
            <li><span>✓</span> Прозрачная страница состояния</li>
          </ul>
          <a className="text-link" href={CABINET_URL} target="_blank" rel="noreferrer">Перейти в кабинет <span>↗</span></a>
        </div>
        <div className="control-panel" aria-label="Пример интерфейса управления">
          <div className="panel-bar"><span>Клиентский маршрут</span><span className="panel-badge">Кабинет + Telegram</span></div>
          <div className="connection-card">
            <div className="connection-head"><div><small>Личный кабинет</small><strong>cabinet.stvillage.ru</strong></div><span className="pulse-ring" /></div>
            <div className="connection-line"><span>Связь с сервисом</span><strong>Telegram-бот</strong></div>
            <div className="connection-line"><span>Переход с сайта</span><strong>В один клик</strong></div>
            <div className="client-links"><a href={CABINET_URL} target="_blank" rel="noreferrer">Открыть кабинет ↗</a><a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Открыть бота ↗</a></div>
          </div>
          <div className="mini-grid"><div><span>⌘</span><small>Кабинет</small></div><div><span>↗</span><small>Telegram</small></div><div><span>?</span><small>Инструкции</small></div></div>
        </div>
      </section>

      <section className="section-shell section-block" id="pricing">
        <SectionHeading eyebrow="Тарифы" title="Выберите подходящий вариант" text="Цены и условия автоматически синхронизируются с личным кабинетом. Выберите тариф и удобный период прямо на сайте." action={{ label: "Все тарифы", href: "/pricing" }} />
        <PricingCatalog compact />
      </section>

      <section className="section-shell section-block" id="locations">
        <SectionHeading eyebrow="Инфраструктура" title="Серверные локации" text="Состояние серверов поступает из Remnawave и доступно на отдельной странице мониторинга." action={{ label: "Страница состояния", href: "/status" }} />
        <div className="location-list">
          {locations.map((location) => (
            <div className="location-row" key={location.code}>
              <div className="location-name"><CountryFlag code={location.code} /><div><strong>{location.name}</strong><small>{location.region}</small></div></div>
              <div className="location-status"><span className="status-pill status-unknown"><span className="status-dot" />Состояние в мониторинге</span></div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell section-block">
        <SectionHeading eyebrow="Начало работы" title="Три понятных шага" text="Бот и кабинет уже связаны между собой, а сайт помогает быстро выбрать нужный маршрут." />
        <div className="steps-grid">
          {steps.map(([number, title, text], index) => (
            <article className="step-card" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>{index < 2 && <i aria-hidden="true">→</i>}
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-block home-news-section" id="news">
        <SectionHeading eyebrow="Из Telegram" title="Последние новости" text="Обновления сервиса, важные объявления и полезные материалы из официального канала ST VILLAGE." action={{ label: "Все новости", href: "/news" }} />
        <TelegramNewsFeed limit={2} compact />
      </section>

      <section className="section-shell section-block faq-layout">
        <SectionHeading eyebrow="Вопросы и ответы" title="Коротко о главном" text="Если ответа здесь нет, база знаний и поддержка помогут разобраться дальше." />
        <FaqList items={homeFaqs} />
      </section>

      <section className="section-shell section-block"><CtaPanel /></section>
    </>
  );
}
