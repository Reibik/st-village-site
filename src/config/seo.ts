import type { Metadata } from "next";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://stvillage.top").replace(/\/+$/, "");
export const SITE_NAME = "ST VILLAGE";
export const DEFAULT_TITLE = "ST VILLAGE — защищённое подключение без лишней сложности";
export const DEFAULT_DESCRIPTION = "ST VILLAGE — удобный сервис защищённого подключения: тарифы, настройка через Happ и INCY, личный кабинет, поддержка и состояние серверов.";
export const SOCIAL_IMAGE = "/og-social-v2.png";

type PageMetadataOptions = {
  title: string;
  description: string;
  path: `/${string}` | "/";
};

export function createPageMetadata({ title, description, path }: PageMetadataOptions): Metadata {
  const socialTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { "ru-RU": path },
    },
    openGraph: {
      type: "website",
      url: path,
      locale: "ru_RU",
      siteName: SITE_NAME,
      title: socialTitle,
      description,
      images: [{
        url: SOCIAL_IMAGE,
        secureUrl: `${SITE_URL}${SOCIAL_IMAGE}`,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "ST VILLAGE — Технологии, Сервисы, Возможности",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [{ url: SOCIAL_IMAGE, alt: "ST VILLAGE — Технологии, Сервисы, Возможности" }],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export const rootJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
    image: `${SITE_URL}${SOCIAL_IMAGE}`,
    sameAs: [
      "https://t.me/exitcloud_vpn",
      "https://t.me/st_village_vpn_bot",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    alternateName: ["ST Village", "СТ Вилладж"],
    description: DEFAULT_DESCRIPTION,
    inLanguage: "ru-RU",
    publisher: { "@id": `${SITE_URL}/#organization` },
  },
  {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${SITE_URL}/#service`,
    name: SITE_NAME,
    serviceType: "Сервис защищённого подключения",
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
    provider: { "@id": `${SITE_URL}/#organization` },
    areaServed: "RU",
  },
];
