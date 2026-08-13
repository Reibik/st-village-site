"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { SiteAnnouncement } from "@/src/server/storage/database";

const kindLabels: Record<SiteAnnouncement["kind"], string> = {
  info: "Информация", update: "Обновление", maintenance: "Технические работы", critical: "Важно", promo: "Предложение",
};

function matchesPlacement(item: SiteAnnouncement, pathname: string) {
  return item.placement === "all" || (item.placement === "home" && pathname === "/") || (item.placement === "status" && pathname.startsWith("/status"));
}

export function SiteAnnouncements() {
  const pathname = usePathname();
  const [announcements, setAnnouncements] = useState<SiteAnnouncement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem("st-dismissed-announcements") || "[]") as string[]; } catch { return []; }
  });

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/announcements", { cache: "no-store", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload: { announcements?: SiteAnnouncement[] }) => setAnnouncements(payload.announcements ?? []))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const visible = announcements.filter((item) => matchesPlacement(item, pathname) && !dismissed.includes(item.id));
  if (visible.length === 0) return null;

  function dismiss(id: string) {
    const next = [...new Set([...dismissed, id])].slice(-50);
    setDismissed(next);
    localStorage.setItem("st-dismissed-announcements", JSON.stringify(next));
  }

  return <aside className="site-announcements" aria-label="Объявления сервиса" aria-live="polite">
    {visible.map((item) => <article className={`site-announcement announcement-${item.kind}`} key={item.id}>
      <div className="section-shell site-announcement-inner">
        <span className="announcement-pulse" aria-hidden="true" />
        <div className="announcement-copy">
          <small>{kindLabels[item.kind]}</small>
          <strong>{item.title}</strong>
          <p>{item.message}</p>
        </div>
        {item.ctaLabel && item.ctaUrl && <a className="announcement-action" href={item.ctaUrl}>{item.ctaLabel}<span aria-hidden="true">↗</span></a>}
        {item.dismissible && <button className="announcement-close" type="button" onClick={() => dismiss(item.id)} aria-label={`Закрыть объявление «${item.title}»`}>×</button>}
      </div>
    </article>)}
  </aside>;
}
