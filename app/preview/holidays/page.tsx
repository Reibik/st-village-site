import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/src/config/seo";
import { canPreviewHolidays } from "@/src/features/holidays/policy";
import { HolidayPreview } from "@/src/features/holidays/holiday-preview";

export const metadata: Metadata = {
  title: "Предпросмотр праздничных тем",
  robots: { index: false, follow: false },
  alternates: { canonical: null, languages: {} },
};

export default function HolidayPreviewPage() {
  if (!canPreviewHolidays(process.env.NODE_ENV, SITE_URL)) notFound();
  return <HolidayPreview />;
}
