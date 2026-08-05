import type { Metadata } from "next";
import { StatusManagement } from "@/src/features/status/status-management";

export const metadata: Metadata = {
  title: "Управление статусом",
  robots: { index: false, follow: false, nocache: true },
};

export default function StatusManagementPage() {
  return <main className="section-shell page-content moderation-page">
    <header className="section-heading">
      <span className="eyebrow">Закрытый раздел</span>
      <h1>Управление статусом</h1>
      <p>Публикуйте инциденты и технические работы, следите за переходами и реальными показателями загрузки без cookie.</p>
    </header>
    <StatusManagement />
  </main>;
}
