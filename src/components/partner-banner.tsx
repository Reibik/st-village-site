import { PLATI_PO_MIRU } from "@/src/config/partners";

export function PartnerBanner() {
  const { name, applicationUrl } = PLATI_PO_MIRU;

  return <section className="section-shell partner-banner" aria-label={name}>
    <div className="partner-banner-panel">
      <div className="partner-banner-body">
        <div className="partner-banner-copy">
          <div className="partner-banner-brand"><span className="partner-brand-symbol" aria-hidden="true">↗</span><strong>{name}</strong><span className="partner-launch-badge">{applicationUrl ? "Партнёрский сервис" : "Скоро"}</span></div>
          <h2>Зарубежные подписки и покупки — <span>больше возможностей.</span></h2>
          <p className="partner-banner-lead">Виртуальные карты для зарубежных оплат. Для любимых сервисов, онлайн-покупок и новых впечатлений.</p>
          <ul className="partner-use-cases" aria-label="Возможности сервиса"><li>Подписки</li><li>Покупки</li><li>Путешествия</li></ul>
          <div className="partner-banner-action">
            {applicationUrl
              ? <a className="button button-primary" href={applicationUrl} target="_blank" rel="sponsored noopener noreferrer">Получить карту <span aria-hidden="true">↗</span></a>
              : <button className="button partner-cta-soon" type="button" disabled aria-describedby="partner-launch-note">Получить карту <span>Скоро</span></button>}
            <span className="partner-banner-caption">Отдельный сервис.<br />Не входит в подписку.</span>
          </div>
        </div>

        <div className="partner-banner-visual" aria-hidden="true">
          <span className="partner-card-orbit partner-card-orbit-one" />
          <span className="partner-card-orbit partner-card-orbit-two" />
          <div className="partner-payment-card partner-payment-card-back" />
          <div className="partner-payment-card partner-payment-card-front">
            <div className="partner-card-top"><span>{name}</span><span className="partner-card-arrow">↗</span></div>
            <div className="partner-card-chip"><i /><i /><i /></div>
            <span className="partner-card-number">•••• &nbsp; •••• &nbsp; •••• &nbsp; ••••</span>
            <div className="partner-card-bottom"><span>Виртуальная карта</span><span>ДЕМО</span></div>
          </div>
          <span className="partner-visual-label">Новые возможности <span>без лишних границ</span></span>
        </div>
      </div>

      {/* The browser can toggle open before React attaches; keep that user-owned state. */}
      <details className="partner-banner-details" suppressHydrationWarning>
        <summary>Как это работает <span aria-hidden="true">+</span></summary>
        <div className="partner-banner-explanation">
          <ol><li>Выберите карту и ознакомьтесь с условиями сервиса.</li><li>Пройдите оформление на стороне «Плати по Миру».</li><li>Пополните карту и используйте её для подходящих оплат.</li></ol>
          <p>Доступность операций, стоимость и условия определяет провайдер. Этот блок не оформляет карту и не принимает платежи.</p>
        </div>
      </details>
      <p className="partner-launch-note" id="partner-launch-note">{applicationUrl ? "Оформление и обслуживание — на стороне провайдера." : "Партнёрский запуск готовится. Ссылку на оформление добавим позже."}</p>
    </div>
  </section>;
}
