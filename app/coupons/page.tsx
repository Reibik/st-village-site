import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { createPageMetadata, SITE_NAME, SITE_URL } from "@/src/config/seo";
import { serializeJsonLd } from "@/src/config/structured-data";
import { CouponDrop } from "@/src/features/coupons/coupon-drop";
import { getCouponDropSnapshot } from "@/src/server/coupons/schedule";

export const metadata: Metadata = createPageMetadata({
  title: "Купонный дроп",
  description: "Периодическая раздача купонов ST VILLAGE: следите за обратным отсчётом и активируйте доступный подарок через официальный Telegram-бот.",
  path: "/coupons",
});

const couponsJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/coupons#drop`,
  url: `${SITE_URL}/coupons`,
  name: `Купонный дроп ${SITE_NAME}`,
  description: "Периодическая раздача промокодов и подарков для пользователей ST VILLAGE.",
  inLanguage: "ru-RU",
  isPartOf: { "@id": `${SITE_URL}/#website` },
};

export default function CouponsPage() {
  const snapshot = getCouponDropSnapshot();
  return <>
    <PageHero eyebrow="Подарки" title="Купонный дроп ST VILLAGE" text="Пять подарков появляются по очереди. Следите за таймером, открывайте активный купон и забирайте его через официальный Telegram-бот." />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(couponsJsonLd) }} />
    <section className="section-shell page-content coupons-page-content"><CouponDrop initialSnapshot={snapshot} /></section>
  </>;
}
