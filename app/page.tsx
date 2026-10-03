import Image from "next/image";
import { CtaPanel } from "@/src/components/cta-panel";
import { CountryFlag } from "@/src/components/country-flag";
import { FaqList } from "@/src/components/faq-list";
import { SectionHeading } from "@/src/components/section-heading";
import { PlatformStrip } from "@/src/components/platform-strip";
import { TelegramNewsFeed } from "@/src/features/news/telegram-news-feed";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";
import { CouponDrop } from "@/src/features/coupons/coupon-drop";
import { HomeNetworkShowcase } from "@/src/features/status/home-network-showcase";
import { homeFaqs } from "@/src/config/content";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";
import { createFaqJsonLd, serializeJsonLd } from "@/src/config/structured-data";
import { getCouponDropSnapshot } from "@/src/server/coupons/schedule";
import "./orbital-home.css";

const steps = [
  { title: "Активируйте доступ", text: "Войдите в кабинет и выберите пробный период или подходящий тариф.", href: CABINET_URL, action: "Открыть кабинет", external: true, symbol: "↗" },
  { title: "Установите приложение", text: "Happ или INCY: поможем выбрать официальную версию для вашего устройства.", href: "/connect", action: "Выбрать приложение", external: false, symbol: "↓" },
  { title: "Добавьте подписку", text: "Импортируйте ссылку из кабинета в приложение и включите подключение.", href: "/connect", action: "Посмотреть инструкцию", external: false, symbol: "✓" },
];

const faqJsonLd = createFaqJsonLd(homeFaqs);

export default function Home() {
  const couponSnapshot = getCouponDropSnapshot();
  return <div className="orbital-home">
    <section className="hero section-shell" aria-labelledby="hero-title">
      <div className="hero-copy">
        <div className="eyebrow"><span className="orbit-kicker-mark" aria-hidden="true" /> Ваше подключение. Ваши правила.</div>
        <h1 id="hero-title">Защищённое<br />подключение.<br /><span>Просто каждый день.</span></h1>
        <p className="hero-lead">На телефоне, компьютере и ТВ. Подключайтесь через Happ или INCY и управляйте подпиской в удобном кабинете.</p>
        <div className="hero-actions">
          <a className="button button-primary" href={CABINET_URL} target="_blank" rel="noreferrer">Попробовать 1 день <span aria-hidden="true">↗</span></a>
          <a className="button button-secondary" href="/connect">Как подключиться <span aria-hidden="true">→</span></a>
        </div>
        <aside className="hero-trial" aria-label="Пробный период">
          <div className="hero-trial-limits"><span><strong>1</strong><span>день доступа</span></span><span><strong>5 ГБ</strong><span>трафика</span></span><span><strong>1</strong><span>устройство</span></span></div>
          <div className="hero-trial-countries"><span>Локации:</span><span><CountryFlag code="DE" />Германия</span><span><CountryFlag code="PL" />Польша</span><span><CountryFlag code="SE" />Швеция</span></div>
          <p>Белые списки не входят в пробный период — доступны на платных тарифах.</p>
        </aside>
      </div>
      <div className="hero-visual" aria-label="Фирменная орбита ST VILLAGE">
        <span className="hero-visual-coordinate" aria-hidden="true">ST / DIGITAL CONNECTION</span>
        <div className="hero-orbit orbit-one" aria-hidden="true" />
        <div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="logo-halo" aria-hidden="true" />
        <picture className="hero-emblem-picture">
          <source srcSet="/brand-emblem.avif" type="image/avif" />
          <source srcSet="/brand-emblem.webp" type="image/webp" />
          <Image src="/brand-emblem.png" alt="Эмблема ST VILLAGE с фирменным роботом" width="1080" height="1080" loading="eager" fetchPriority="high" unoptimized sizes="(max-width: 680px) 88vw, 480px" />
        </picture>
        <div className="signal-card signal-card-bottom"><span className="signal-icon" aria-hidden="true">⌁</span><div><small>Два приложения. Один доступ.</small><strong>Happ <span> / </span> INCY</strong></div></div>
        <span className="hero-visual-caption" aria-hidden="true">ТЕХНОЛОГИИ · СЕРВИСЫ · ВОЗМОЖНОСТИ</span>
      </div>
    </section>

    <PlatformStrip />
    <div className="section-shell orbit-proof"><a href="/status"><span aria-hidden="true">◎</span> Открытый мониторинг</a><a href="/connect"><span aria-hidden="true">↗</span> Инструкции для 6 платформ</a><a href="/support"><span aria-hidden="true">◇</span> Поддержка рядом</a></div>

    <section className="section-shell section-block split-showcase" id="features" aria-labelledby="capabilities-title">
      <div className="showcase-copy" id="capabilities">
        <div className="eyebrow">Возможности</div>
        <h2 id="capabilities-title">Всё под рукой.<br /><span>Без лишних действий.</span></h2>
        <p>Подписка, устройства и баланс — в одном кабинете. Сайт помогает начать, а кабинет остаётся вашим центром управления.</p>
        <ul className="orbit-benefits">
          <li><span aria-hidden="true">01</span><div><strong>Подписка под контролем</strong><p>Трафик, срок действия и продление в одном месте.</p></div></li>
          <li><span aria-hidden="true">02</span><div><strong>Ваши устройства</strong><p>Добавляйте подключение по понятной инструкции.</p></div></li>
          <li><span aria-hidden="true">03</span><div><strong>Удобный выбор</strong><p>Пользуйтесь кабинетом или связанным Telegram-ботом.</p></div></li>
        </ul>
        <a className="text-link" href={CABINET_URL} target="_blank" rel="noreferrer">Открыть личный кабинет <span aria-hidden="true">↗</span></a>
      </div>
      <a className="cabinet-preview" href={CABINET_URL} target="_blank" rel="noreferrer" aria-label="Открыть личный кабинет ST VILLAGE">
        <span className="cabinet-preview-glow" aria-hidden="true" />
        <span className="cabinet-preview-chip cabinet-preview-chip-live">Ваш центр управления</span>
        <span className="cabinet-preview-frame">
          <span className="cabinet-preview-toolbar" aria-hidden="true"><span className="cabinet-preview-dots"><i /><i /><i /></span><span>cabinet.stvillage.top</span><strong>ST</strong></span>
          <picture className="cabinet-preview-picture">
            <source srcSet="/cabinet-dashboard-preview.webp?v=2" type="image/webp" />
            <Image src="/cabinet-dashboard-preview.png?v=2" alt="Демонстрация личного кабинета ST VILLAGE: подписка, баланс и устройства" width="1200" height="800" unoptimized sizes="(max-width: 980px) 92vw, 620px" />
          </picture>
          <span className="cabinet-preview-footer"><span>Демонстрационный интерфейс</span><strong>Открыть кабинет <i aria-hidden="true">↗</i></strong></span>
        </span>
        <span className="cabinet-preview-chip cabinet-preview-chip-secure">Подписка · устройства · баланс</span>
      </a>
    </section>

    <section className="section-shell section-block" id="getting-started">
      <SectionHeading eyebrow="Начало работы" title="Три шага. И вы на связи." text="Без сложных настроек: от пробного доступа до первого подключения." />
      <div className="steps-grid">{steps.map((step, index) => <article className="step-card" key={step.title}>
        <div className="step-card-top"><span className="step-number">0{index + 1}</span><small>Шаг {index + 1} из {steps.length}</small><span className="orbit-step-symbol" aria-hidden="true">{step.symbol}</span></div>
        <div className="step-card-copy"><h3>{step.title}</h3><p>{step.text}</p></div>
        <a className="text-link" href={step.href} target={step.external ? "_blank" : undefined} rel={step.external ? "noreferrer" : undefined}>{step.action} <span aria-hidden="true">{step.external ? "↗" : "→"}</span></a>
        {index < steps.length - 1 && <span className="step-connector" aria-hidden="true">→</span>}
      </article>)}</div>
      <p className="orbit-onboarding-help">Предпочитаете Telegram? <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Официальный бот тоже поможет начать ↗</a></p>
    </section>

    <section className="section-shell section-block" id="pricing">
      <SectionHeading eyebrow="Тарифы" title="Ваш ритм. Ваш тариф." text="Выберите количество устройств и удобный период. Цены и условия получаем из личного кабинета." action={{ label: "Все тарифы", href: "/pricing" }} />
      <PricingCatalog compact />
      <div className="orbit-trial-note"><span className="orbit-trial-note-icon" aria-hidden="true">↗</span><div><strong>Сначала попробуйте. Потом решите.</strong><p>Пробный период: 1 день, 5 ГБ и 1 устройство. Германия, Польша и Швеция. Белые списки — только на платных тарифах.</p></div><a className="text-link" href={CABINET_URL} target="_blank" rel="noreferrer">Получить доступ <span aria-hidden="true">↗</span></a></div>
    </section>

    {couponSnapshot.status !== "ended" && <section className="section-shell coupon-home-section" aria-label="Купонная раздача ST VILLAGE"><CouponDrop initialSnapshot={couponSnapshot} compact /></section>}
    <HomeNetworkShowcase />

    <section className="section-shell section-block home-news-section" id="news">
      <SectionHeading eyebrow="Журнал ST VILLAGE" title="Остаёмся на связи." text="Обновления сервиса и важные объявления из нашего Telegram-канала." action={{ label: "Все новости", href: "/news" }} />
      <TelegramNewsFeed limit={2} compact />
    </section>

    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }} />
    <section className="section-shell section-block faq-layout" id="faq"><SectionHeading eyebrow="Вопросы и ответы" title="Без лишних вопросов." text="Самое важное перед подключением. Если нужна помощь — мы рядом." /><FaqList items={homeFaqs} /></section>
    <section className="section-shell section-block orbit-final-cta"><CtaPanel trial /></section>
  </div>;
}
