import { CABINET_URL, TELEGRAM_NEWS_URL } from "@/src/config/links";
import { SITE_NAME, SITE_URL } from "@/src/config/seo";

type FaqItem = { question: string; answer: string };
type TariffPeriod = { days: number; label: string; priceKopeks: number };
type Tariff = {
  id: number;
  name: string;
  description: string | null;
  trafficLimitGb: number;
  deviceLimit: number;
  periods: TariffPeriod[];
};
type NewsPost = {
  id: string;
  url: string;
  html: string;
  images: Array<{ url: string; alt: string }>;
  publishedAt: string | null;
};

const organization = { "@id": `${SITE_URL}/#organization` };

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function createFaqJsonLd(items: readonly FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    url: `${SITE_URL}/#faq`,
    inLanguage: "ru-RU",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
}

export function createPricingJsonLd(tariffs: readonly Tariff[]) {
  return {
    "@context": "https://schema.org",
    "@type": "OfferCatalog",
    "@id": `${SITE_URL}/pricing#catalog`,
    name: `Тарифы ${SITE_NAME}`,
    url: `${SITE_URL}/pricing`,
    inLanguage: "ru-RU",
    itemListElement: tariffs.flatMap((tariff) => tariff.periods.map((period) => ({
      "@type": "Offer",
      "@id": `${SITE_URL}/pricing#tariff-${tariff.id}-${period.days}`,
      name: `${tariff.name} — ${period.label}`,
      description: tariff.description || `Подписка ${SITE_NAME} на ${period.label.toLowerCase()}`,
      url: CABINET_URL,
      priceCurrency: "RUB",
      price: (period.priceKopeks / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      category: period.label,
      seller: organization,
      itemOffered: {
        "@type": "Service",
        name: tariff.name,
        serviceType: "Защищённое подключение",
        provider: organization,
        additionalProperty: [
          { "@type": "PropertyValue", name: "Трафик", value: tariff.trafficLimitGb === 0 ? "Безлимитный" : `${tariff.trafficLimitGb} ГБ` },
          { "@type": "PropertyValue", name: "Устройства", value: tariff.deviceLimit === 0 ? "Без ограничений" : tariff.deviceLimit },
        ],
      },
    }))),
  };
}

export const newsCollectionJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "@id": `${SITE_URL}/news#collection`,
  url: `${SITE_URL}/news`,
  name: `Новости ${SITE_NAME}`,
  description: `Обновления, инструкции и технические уведомления ${SITE_NAME}`,
  inLanguage: "ru-RU",
  isPartOf: { "@id": `${SITE_URL}/#website` },
  about: { "@id": `${SITE_URL}/#service` },
  publisher: organization,
  sameAs: TELEGRAM_NEWS_URL,
};

function plainText(html: string) {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&#160;": " ",
    "&amp;": "&",
    "&quot;": "\"",
    "&#39;": "'",
    "&apos;": "'",
  };

  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|amp|quot|apos|#39|#160);/gi, (entity) => entities[entity.toLowerCase()] ?? entity)
    .replace(/\s+/g, " ")
    .trim();
}

export function createNewsArticleJsonLd(post: NewsPost) {
  const text = plainText(post.html);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "@id": `${post.url}#article`,
    mainEntityOfPage: post.url,
    url: post.url,
    headline: (text || `Публикация ${SITE_NAME}`).slice(0, 110),
    description: (text || `Новость из официального Telegram-канала ${SITE_NAME}`).slice(0, 280),
    ...(post.publishedAt ? { datePublished: post.publishedAt, dateModified: post.publishedAt } : {}),
    ...(post.images.length ? { image: post.images.map((image) => image.url) } : {}),
    author: organization,
    publisher: organization,
    isPartOf: { "@id": `${SITE_URL}/news#collection` },
    inLanguage: "ru-RU",
  };
}
