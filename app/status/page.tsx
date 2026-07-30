import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { StatusDashboard } from "@/src/features/status/status-dashboard";

export const metadata: Metadata = { title: "Статус инфраструктуры", description: "Актуальное состояние сервисов и серверных локаций ST VILLAGE." };

export default function StatusPage() {
  return <>
    <PageHero eyebrow="Статус" title="Состояние инфраструктуры" text="Живые проверки сайта, кабинета, Telegram и серверных локаций. Данные обновляются автоматически каждые 30 секунд." />
    <section className="section-shell page-content"><StatusDashboard /></section>
  </>;
}
