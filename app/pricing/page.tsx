import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";

export const metadata: Metadata = { title: "Тарифы", description: "Периоды и параметры цифрового сервиса ST VILLAGE." };

export default function PricingPage() { return <><PageHero eyebrow="Тарифы" title="Понятные варианты без скрытых условий" text="Выберите период и количество устройств. Фактическая стоимость появится после подключения серверного каталога." /><section className="section-shell page-content"><PricingCatalog /></section></>; }
