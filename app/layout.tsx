import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";
import { SiteObservability } from "@/src/components/site-observability";
import { UpdateNotice } from "@/src/components/update-notice";
import { createPageMetadata, DEFAULT_DESCRIPTION, DEFAULT_TITLE, rootJsonLd, SITE_NAME, SITE_URL } from "@/src/config/seo";
import "./globals.css";

const homeMetadata = createPageMetadata({ title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, path: "/" });
const BRAND_ICON_VERSION = "2";
const faviconUrl = `/favicon.ico?v=${BRAND_ICON_VERSION}`;

export const metadata: Metadata = {
  ...homeMetadata,
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s — ${SITE_NAME}` },
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "technology",
  keywords: ["ST VILLAGE", "защищённое подключение", "Happ", "INCY", "личный кабинет", "Telegram-бот", "статус серверов"],
  referrer: "origin-when-cross-origin",
  formatDetection: { email: false, address: false, telephone: false },
  icons: {
    icon: [
      { url: faviconUrl, type: "image/x-icon", sizes: "any" },
      { url: `/icon-192.png?v=${BRAND_ICON_VERSION}`, type: "image/png", sizes: "192x192" },
      { url: `/icon-512.png?v=${BRAND_ICON_VERSION}`, type: "image/png", sizes: "512x512" },
    ],
    shortcut: faviconUrl,
    apple: [{ url: `/apple-touch-icon.png?v=${BRAND_ICON_VERSION}`, sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    yandex: process.env.YANDEX_SITE_VERIFICATION || undefined,
  },
  other: {
    "msapplication-TileColor": "#0b0f14",
  },
};

export const viewport: Viewport = { colorScheme: "dark light", themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b0f14" }, { media: "(prefers-color-scheme: light)", color: "#f4f7fb" }] };

const themeScript = `(function(){try{var t=localStorage.getItem('st-theme');var d=t||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=d}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd).replace(/</g, "\\u003c") }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">Перейти к содержанию</a>
        <div className="site-noise" aria-hidden="true" />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <UpdateNotice />
        <SiteObservability />
      </body>
    </html>
  );
}
