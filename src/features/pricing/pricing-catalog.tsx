"use client";

import { useCallback, useEffect, useState } from "react";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";

type PricingPeriod = {
  days: number;
  label: string;
  priceKopeks: number;
  originalPriceKopeks: number | null;
  discountPercent: number | null;
};

type PricingTariff = {
  id: number;
  name: string;
  description: string | null;
  trafficLimitGb: number;
  deviceLimit: number;
  periods: PricingPeriod[];
};

type PricingSnapshot = {
  status: "ok";
  tariffs: PricingTariff[];
  updatedAt: string;
  stale: boolean;
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const rubles = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

function formatPrice(kopeks: number) {
  return rubles.format(kopeks / 100);
}

function TariffCard({ tariff, featured }: { tariff: PricingTariff; featured: boolean }) {
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = tariff.periods[periodIndex] ?? tariff.periods[0];

  return (
    <article className={`price-card tariff-card${featured ? " price-card-featured" : ""}`}>
      {featured && <div className="price-ribbon">Популярный выбор</div>}
      <span className="plan-kicker">{tariff.trafficLimitGb === 0 ? "Безлимитный трафик" : `${tariff.trafficLimitGb} ГБ в месяц`}</span>
      <h3>{tariff.name}</h3>

      <div className="tariff-price-row" aria-live="polite">
        <strong className="tariff-price">{formatPrice(period.priceKopeks)}</strong>
        {period.originalPriceKopeks && <s className="tariff-price-old">{formatPrice(period.originalPriceKopeks)}</s>}
        {period.discountPercent && <span className="tariff-discount">−{period.discountPercent}%</span>}
      </div>
      <span className="tariff-price-caption">за {period.label.toLowerCase()}</span>

      <div className="tariff-periods" aria-label={`Период тарифа ${tariff.name}`}>
        {tariff.periods.map((item, index) => (
          <button
            className={`tariff-period-button${index === periodIndex ? " active" : ""}`}
            type="button"
            aria-pressed={index === periodIndex}
            onClick={() => setPeriodIndex(index)}
            key={item.days}
          >
            {item.label}
          </button>
        ))}
      </div>

      <ul className="tariff-facts">
        <li><span>Трафик</span><strong>{tariff.trafficLimitGb === 0 ? "Безлимит" : `${tariff.trafficLimitGb} ГБ`}</strong></li>
        <li><span>Устройства</span><strong>{tariff.deviceLimit === 0 ? "Без ограничений" : `до ${tariff.deviceLimit}`}</strong></li>
        <li><span>Локации</span><strong>Все доступные</strong></li>
      </ul>

      {tariff.description && <p className="tariff-description">{tariff.description}</p>}
      <a className={featured ? "button button-primary" : "button button-secondary"} href={CABINET_URL} target="_blank" rel="noreferrer">
        Выбрать в кабинете <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}

function PricingSkeleton({ compact }: { compact: boolean }) {
  return (
    <div className="pricing-grid pricing-page-grid" aria-label="Загрузка тарифов" aria-busy="true">
      {Array.from({ length: compact ? 3 : 5 }, (_, index) => (
        <div className="price-card pricing-skeleton" aria-hidden="true" key={index}>
          <span /><strong /><i /><i /><i />
        </div>
      ))}
    </div>
  );
}

export function PricingCatalog({ compact = false }: { compact?: boolean }) {
  const [snapshot, setSnapshot] = useState<PricingSnapshot | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/pricing", { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error("Pricing is unavailable");
      const payload = await response.json() as PricingSnapshot;
      if (payload.status !== "ok" || !Array.isArray(payload.tariffs) || payload.tariffs.length === 0) {
        throw new Error("Invalid pricing response");
      }
      setSnapshot(payload);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), REFRESH_INTERVAL_MS);
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [load]);

  if (!snapshot && !failed) return <PricingSkeleton compact={compact} />;

  if (!snapshot) {
    return (
      <div className="pricing-unavailable glass-card" role="status">
        <span className="pricing-unavailable-icon" aria-hidden="true">↻</span>
        <div>
          <h3>Не удалось загрузить тарифы</h3>
          <p>Актуальные цены и оформление по-прежнему доступны в личном кабинете.</p>
          <div className="pricing-unavailable-actions">
            <button className="button button-secondary" type="button" onClick={() => void load()}>Повторить</button>
            <a className="button button-primary" href={CABINET_URL} target="_blank" rel="noreferrer">Открыть кабинет ↗</a>
            <a className="text-link" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Поддержка в Telegram ↗</a>
          </div>
        </div>
      </div>
    );
  }

  const tariffs = compact ? snapshot.tariffs.slice(0, 3) : snapshot.tariffs;
  return (
    <>
      <div className="pricing-sync" role="status">
        <span className="status-dot" aria-hidden="true" />
        <span>{snapshot.stale ? "Показаны последние сохранённые данные" : "Цены синхронизированы с личным кабинетом"}</span>
      </div>
      <div className="pricing-grid pricing-page-grid">
        {tariffs.map((tariff, index) => (
          <TariffCard tariff={tariff} featured={index === 1} key={tariff.id} />
        ))}
      </div>
    </>
  );
}
