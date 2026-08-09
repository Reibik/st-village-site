import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { createPageMetadata } from "@/src/config/seo";
import { StatusDashboard } from "@/src/features/status/status-dashboard";
import { LiveServerStatus } from "@/src/features/status/live-server-status";

export const metadata: Metadata = createPageMetadata({ title: "Статус инфраструктуры", description: "Актуальное состояние сервисов и серверных локаций ST VILLAGE с автоматическим обновлением.", path: "/status" });

export default function StatusPage() {
  return <>
    <PageHero eyebrow="Статус" title="Состояние инфраструктуры" text="Проверяйте доступность серверов, задержку, аптайм и активные инциденты. Данные независимого мониторинга обновляются автоматически." />
    <section className="section-shell page-content status-page-content">
      <LiveServerStatus />
      <div className="status-section-heading status-service-heading"><div><span className="eyebrow">Сервисы</span><h2>Дополнительные проверки</h2></div><p>Доступность сайта, личного кабинета, Telegram и состояние панели управления.</p></div>
      <StatusDashboard />
    </section>
  </>;
}
