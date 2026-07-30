import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";

export const metadata: Metadata = { title: "Тарифы", description: "Периоды и параметры цифрового сервиса ST VILLAGE." };

export default function PricingPage() { return <><PageHero eyebrow="Тарифы" title="Выберите удобный период" text="Сравните формат использования, а актуальные условия и оформление откройте в отдельном личном кабинете." /><section className="section-shell page-content"><PricingCatalog /></section></>; }
