import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { createPageMetadata } from "@/src/config/seo";

export const metadata: Metadata = {
  ...createPageMetadata({ title: "Купоны — скоро", description: "Раздел купонов ST VILLAGE временно закрыт. Раздачи появятся после открытия раздела.", path: "/coupons" }),
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export default function CouponsPage() {
  return <>
    <PageHero eyebrow="Скоро" title="Купоны — скоро" text="Готовим новый формат подарков. Раздел пока закрыт — купоны появятся после его открытия." />
    <section className="section-shell page-content">
      <div className="coupons-coming-soon-card">
        <span className="coupons-coming-soon-symbol" aria-hidden="true">◇</span>
        <div><span className="coming-soon-badge">Скоро</span><h2>Подарки ещё впереди</h2><p>Пока здесь нет активных раздач. Дату открытия сообщим отдельно.</p></div>
        <Link className="button button-secondary" href="/">На главную <span aria-hidden="true">→</span></Link>
      </div>
    </section>
  </>;
}
