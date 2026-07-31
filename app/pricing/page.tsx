import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";

export const metadata: Metadata = { title: "Тарифы", description: "Периоды и параметры цифрового сервиса ST VILLAGE." };

export default function PricingPage() { return <><PageHero eyebrow="Тарифы" title="Выберите удобный тариф" text="Актуальные цены и параметры поступают напрямую из личного кабинета. Выберите вариант и период, а оформление завершите в кабинете." /><section className="section-shell page-content"><PricingCatalog /></section></>; }
