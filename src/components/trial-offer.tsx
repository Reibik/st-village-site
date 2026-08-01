import { CountryFlag } from "@/src/components/country-flag";
import { CABINET_URL } from "@/src/config/links";

const trialLocations = [
  { code: "DE", name: "Германия" },
  { code: "PL", name: "Польша" },
  { code: "SE", name: "Швеция" },
] as const;

const trialLimits = [
  { value: "1", label: "день доступа" },
  { value: "5 ГБ", label: "трафика" },
  { value: "1", label: "устройство" },
] as const;

export function TrialOffer({ compact = false }: { compact?: boolean }) {
  return <aside className={`trial-offer${compact ? " trial-offer-compact" : ""}`} aria-labelledby={compact ? "trial-title-pricing" : "trial-title-home"}>
    <div className="trial-offer-glow" aria-hidden="true" />
    <div className="trial-offer-main">
      <div className="trial-offer-copy">
        <div className="trial-offer-kicker"><span className="status-dot" /> Пробный период</div>
        <h2 id={compact ? "trial-title-pricing" : "trial-title-home"}>Попробуйте ST VILLAGE перед оплатой</h2>
        <p>Проверьте качество подключения на своём устройстве и спокойно решите, какой платный тариф подходит вам лучше.</p>
      </div>

      <div className="trial-limit-grid" aria-label="Условия пробного периода">
        {trialLimits.map((limit) => <div className="trial-limit" key={limit.label}>
          <strong>{limit.value}</strong>
          <span>{limit.label}</span>
        </div>)}
      </div>

      <div className="trial-location-row">
        <div>
          <small>Доступные локации</small>
          <strong>Ограниченный набор серверов</strong>
        </div>
        <div className="trial-location-list" aria-label="Германия, Польша и Швеция">
          {trialLocations.map((location) => <span className="trial-location" key={location.code}>
            <CountryFlag code={location.code} />
            <span>{location.name}</span>
          </span>)}
        </div>
      </div>
    </div>

    <div className="trial-offer-side">
      <div className="trial-restriction">
        <span className="trial-restriction-icon" aria-hidden="true">i</span>
        <div>
          <strong>Белые списки — только на платных тарифах</strong>
          <p>Белые списки не входят в пробный период. Они становятся доступны после перехода на платный тариф.</p>
        </div>
      </div>
      <a className="button button-primary trial-button" href={CABINET_URL} target="_blank" rel="noreferrer">
        Получить пробный доступ <span aria-hidden="true">↗</span>
      </a>
      <small className="trial-caption">Активация и управление — в личном кабинете</small>
    </div>
  </aside>;
}
