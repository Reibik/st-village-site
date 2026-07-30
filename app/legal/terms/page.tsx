import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";

export const metadata: Metadata = { title: "Условия использования" };
export default function TermsPage() { return <><PageHero eyebrow="Документы" title="Условия использования" text="Черновая структура условий. Финальный документ должен быть согласован с моделью сервиса, оплатой и возвратами." /><section className="section-shell page-content"><div className="notice"><span>ⓘ</span><div><strong>Требуется юридическая редакция</strong>Условия не подменяются шаблонным или вымышленным договором.</div></div><article className="glass-card legal-copy"><h2>Что будет описано в документе</h2><p>Порядок предоставления сервиса, права и обязанности сторон, оплата, продление, возвраты, допустимое использование и порядок разрешения обращений.</p></article></section></>; }
