import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { createPageMetadata } from "@/src/config/seo";
import { LiveServerStatus } from "@/src/features/status/live-server-status";

export const metadata: Metadata = createPageMetadata({ title: "Статус инфраструктуры", description: "Актуальное состояние сервисов и серверных локаций ST VILLAGE с автоматическим обновлением.", path: "/status" });

export default function StatusPage() {
  return <>
    <PageHero eyebrow="Статус" title="Состояние инфраструктуры" text="Проверяйте доступность серверов, задержку, аптайм и активные инциденты. Данные независимого мониторинга обновляются автоматически." />
    <section className="section-shell page-content status-page-content">
      <LiveServerStatus />
    </section>
  </>;
}
