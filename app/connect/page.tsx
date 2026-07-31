import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { CONNECTION_APPS } from "@/src/config/connection-apps";
import { createPageMetadata } from "@/src/config/seo";
import { ConnectionWizard } from "@/src/features/connect/connection-wizard";

export const metadata: Metadata = createPageMetadata({
  title: "Подключение",
  description: "Официальные загрузки и пошаговая настройка ST VILLAGE через приложения Happ и INCY.",
  path: "/connect",
});

export default function ConnectPage() {
  return <>
    <PageHero
      eyebrow="Подключение · v0.8.1"
      title="Happ и INCY — два основных приложения"
      text="Сайт определит ваше устройство, предложит подходящее приложение и проведёт от загрузки до первого подключения. Персональные данные подключения остаются в отдельном кабинете ST VILLAGE."
    />

    <section className="section-shell connect-app-focus" aria-labelledby="connect-apps-title">
      <div className="section-heading">
        <div className="eyebrow">Проверенные источники</div>
        <h2 id="connect-apps-title">Только официальные версии</h2>
        <p>Кнопки в мастере ведут в магазины приложений или на официальные сайты и репозитории разработчиков.</p>
      </div>
      <div className="connect-app-grid">
        {Object.values(CONNECTION_APPS).map((client, index) => <article className="connect-app-card glass-card" key={client.id}>
          <span className="connect-app-index">0{index + 1}</span>
          <div className={`connect-app-mark${client.id === "incy" ? " connect-app-mark-alt" : ""}`} aria-hidden="true">{client.mark}</div>
          <div>
            <span className="connect-app-label">Официальное приложение</span>
            <h3>{client.name}</h3>
            <p>{client.description}</p>
            <a className="text-link connect-official-link" href={client.officialUrl} target="_blank" rel="noreferrer">Официальный сайт ↗</a>
          </div>
        </article>)}
      </div>
    </section>

    <section className="section-shell page-content connect-wizard-section">
      <ConnectionWizard />
    </section>
  </>;
}
