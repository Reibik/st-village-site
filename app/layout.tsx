import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/src/components/site-footer";
import { SiteHeader } from "@/src/components/site-header";
import { UpdateNotice } from "@/src/components/update-notice";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://st-village.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "ST VILLAGE — цифровая экосистема", template: "%s — ST VILLAGE" },
  description: "Современная инфраструктура, удобное управление подключением и поддержка на каждом этапе.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "ST VILLAGE",
    title: "ST VILLAGE — стабильное подключение к цифровому миру",
    description: "Технологии, сервисы и возможности в одной цифровой экосистеме.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ST VILLAGE — Технологии, Сервисы, Возможности" }],
  },
  twitter: { card: "summary_large_image", title: "ST VILLAGE", description: "Технологии • Сервисы • Возможности", images: ["/og.png"] },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export const viewport: Viewport = { colorScheme: "dark light", themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#0b0f14" }, { media: "(prefers-color-scheme: light)", color: "#f4f7fb" }] };

const themeScript = `(function(){try{var t=localStorage.getItem('st-theme');var d=t||(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');document.documentElement.dataset.theme=d}catch(e){}})()`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <a className="skip-link" href="#main-content">Перейти к содержанию</a>
        <div className="site-noise" aria-hidden="true" />
        <SiteHeader />
        <main id="main-content">{children}</main>
        <SiteFooter />
        <UpdateNotice />
      </body>
    </html>
  );
}
