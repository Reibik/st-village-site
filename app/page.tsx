import Link from "next/link";
import Image from "next/image";
import { CtaPanel } from "@/src/components/cta-panel";
import { FaqList } from "@/src/components/faq-list";
import { SectionHeading } from "@/src/components/section-heading";
import { PlatformStrip } from "@/src/components/platform-strip";
import { homeFaqs, locations, plans } from "@/src/config/content";

const advantages = [
  {
    index: "01",
    title: "Подключение без лишней сложности",
    text: "Пошаговые инструкции для популярных платформ и понятный путь от выбора тарифа до готового подключения.",
  },
  {
    index: "02",
    title: "Инфраструктура под наблюдением",
    text: "Состояние локаций, уведомления о работах и история изменений собраны в одном прозрачном интерфейсе.",
  },
  {
    index: "03",
    title: "Управление в одном месте",
    text: "Подписка, устройства, подключение и обращения в поддержку доступны из единого личного пространства.",
  },
];

const steps = [
  ["01", "Выберите формат", "Сравните периоды и количество устройств."],
  ["02", "Получите доступ", "Ссылка подключения появится в личном кабинете."],
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
            <Link className="button button-primary" href="/pricing">Начать пользоваться <span aria-hidden="true">→</span></Link>
            <Link className="button button-secondary" href="/login"><span className="telegram-glyph" aria-hidden="true">↗</span> Открыть Telegram-бота</Link>
          </div>
          <div className="hero-facts" aria-label="Возможности сервиса">
            <div><strong>6</strong><span>поддерживаемых платформ</span></div>
            <div><strong>24/7</strong><span>страница состояния</span></div>
            <div><strong>1</strong><span>единый кабинет</span></div>
          </div>
        </div>
        <div className="hero-visual" aria-label="Фирменный помощник ST VILLAGE">
          <div className="hero-orbit orbit-one" />
          <div className="hero-orbit orbit-two" />
          <div className="logo-halo" />
          <Image src="/brand-emblem.png" alt="Эмблема ST VILLAGE с фирменным роботом" width="720" height="720" priority sizes="(max-width: 680px) 92vw, 500px" />
          <div className="signal-card signal-card-top"><span className="signal-icon">◎</span><div><small>Состояние</small><strong>Мониторинг активен</strong></div></div>
          <div className="signal-card signal-card-bottom"><span className="signal-icon">⌁</span><div><small>Подключение</small><strong>Пошаговая настройка</strong></div></div>
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
            <li><span>✓</span> Личный кабинет и уведомления</li>
            <li><span>✓</span> Инструкции для всех основных устройств</li>
            <li><span>✓</span> Прозрачная страница состояния</li>
          </ul>
          <Link className="text-link" href="/connect">Посмотреть процесс подключения <span>→</span></Link>
        </div>
        <div className="control-panel" aria-label="Пример интерфейса управления">
          <div className="panel-bar"><span>Моё подключение</span><span className="panel-badge">Интерфейс кабинета</span></div>
          <div className="connection-card">
            <div className="connection-head"><div><small>Текущее состояние</small><strong>Данные появятся после входа</strong></div><span className="pulse-ring" /></div>
            <div className="connection-line"><span>Устройства</span><strong>—</strong></div>
            <div className="connection-line"><span>Период</span><strong>—</strong></div>
            <div className="connection-progress"><span /></div>
          </div>
          <div className="mini-grid"><div><span>⌘</span><small>Устройства</small></div><div><span>◎</span><small>Локации</small></div><div><span>?</span><small>Поддержка</small></div></div>
        </div>
      </section>

      <section className="section-shell section-block" id="pricing">
        <SectionHeading eyebrow="Тарифы" title="Выберите подходящий период" text="Интерфейс готов к загрузке тарифов из серверного каталога. До подключения базы цены честно не публикуются." action={{ label: "Все тарифы", href: "/pricing" }} />
        <div className="pricing-grid compact-pricing">
          {plans.map((plan) => (
            <article className={`price-card${plan.highlighted ? " price-card-featured" : ""}`} key={plan.id}>
              {plan.highlighted && <div className="price-ribbon">Популярный период</div>}
              <span className="plan-kicker">{plan.kicker}</span>
              <h3>{plan.name}</h3>
              <div className="price-placeholder">Цена будет опубликована</div>
              <p>{plan.description}</p>
              <Link className={plan.highlighted ? "button button-primary" : "button button-secondary"} href="/pricing">Подробнее <span>→</span></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-block" id="locations">
        <SectionHeading eyebrow="Инфраструктура" title="Серверные локации" text="Фактические статусы и задержки будут поступать из мониторинга. Случайные показатели не используются." action={{ label: "Страница состояния", href: "/status" }} />
        <div className="location-list">
          {locations.map((location) => (
            <div className="location-row" key={location.code}>
              <div className="location-name"><span className="flag-placeholder">{location.code}</span><div><strong>{location.name}</strong><small>{location.region}</small></div></div>
              <div className="location-status"><span className="status-dot status-neutral" /> Данные ожидаются</div>
              <div className="latency">— мс</div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell section-block">
        <SectionHeading eyebrow="Начало работы" title="Три понятных шага" text="Весь путь спроектирован так, чтобы первая настройка не требовала специальных знаний." />
        <div className="steps-grid">
          {steps.map(([number, title, text], index) => (
            <article className="step-card" key={number}>
              <span>{number}</span><h3>{title}</h3><p>{text}</p>{index < 2 && <i aria-hidden="true">→</i>}
            </article>
          ))}
        </div>
      </section>

      <section className="section-shell section-block faq-layout">
        <SectionHeading eyebrow="Вопросы и ответы" title="Коротко о главном" text="Если ответа здесь нет, база знаний и поддержка помогут разобраться дальше." />
        <FaqList items={homeFaqs} />
      </section>

      <section className="section-shell section-block"><CtaPanel /></section>
    </>
  );
}
