import Link from "next/link";
import { locations } from "@/src/config/content";

const trustFacts = [
  { value: "24/7", label: "публичный статус сервисов", note: "с автоматическим обновлением" },
  { value: String(locations.length), label: "стран в инфраструктуре", note: "с отдельными серверными узлами" },
  { value: "0", label: "логов интернет-активности", note: "трафик не отслеживается" },
  { value: "3", label: "региона внешней проверки", note: "Европа, Азия и Северная Америка" },
] as const;

export function TrustPanel() {
  return <section className="section-shell section-block trust-section" aria-labelledby="trust-title">
    <div className="section-heading-row"><div className="section-heading"><span className="eyebrow">Прозрачность</span><h2 id="trust-title">Доверие подтверждается данными</h2><p>Показываем только проверяемые показатели и честно отмечаем, когда данных недостаточно.</p></div><Link className="text-link" href="/reviews">Отзывы клиентов →</Link></div>
    <div className="trust-grid">{trustFacts.map((fact) => <article className="trust-card" key={fact.label}><strong>{fact.value}</strong><span>{fact.label}</span><small>{fact.note}</small></article>)}</div>
  </section>;
}

