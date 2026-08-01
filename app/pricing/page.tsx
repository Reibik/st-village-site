import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { TrialOffer } from "@/src/components/trial-offer";
import { createPageMetadata } from "@/src/config/seo";
import { PricingCatalog } from "@/src/features/pricing/pricing-catalog";

export const metadata: Metadata = createPageMetadata({
  title: "Тарифы",
  description: "Актуальные тарифы ST VILLAGE и пробный период на 1 день: 5 ГБ трафика, 1 устройство и доступ к локациям Германии, Польши и Швеции.",
  path: "/pricing",
});

export default function PricingPage() {
  return <>
    <PageHero
      eyebrow="Тарифы"
      title="Выберите удобный тариф"
      text="Начните с пробного периода или выберите платный тариф. Актуальные цены и параметры поступают напрямую из личного кабинета, где завершается оформление."
    />
    <section className="section-shell page-content pricing-page-content">
      <TrialOffer compact />
      <PricingCatalog />
    </section>
  </>;
}
