"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CABINET_URL } from "@/src/config/links";

const navItems = [
  ["Возможности", "/#features"], ["Тарифы", "/pricing"], ["Купоны", "/coupons"], ["Подключение", "/connect"], ["Статус", "/status"], ["Поддержка", "/support"],
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function isCurrent(href: string) {
    if (href.startsWith("/#")) return undefined;
    return pathname === href ? "page" as const : undefined;
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("st-theme", next);
  }

  return (
    <header className="site-header">
      <div className="section-shell nav-shell">
        <Link className="brand" href="/" aria-label="ST VILLAGE — главная">
          <span className="brand-mark">ST</span><span className="brand-copy"><strong>ST VILLAGE</strong><small>ТЕХНОЛОГИИ • СЕРВИСЫ</small></span>
        </Link>
        <nav className="main-nav" aria-label="Основная навигация">{navItems.map(([label, href]) => <Link href={href} key={href} aria-current={isCurrent(href)}>{label}</Link>)}</nav>
        <div className="nav-actions">
          <button className="theme-toggle" type="button" onClick={toggleTheme} aria-label="Переключить цветовую тему"><span className="theme-moon">◒</span><span className="theme-sun">☼</span></button>
          <a className="button button-secondary button-small" href={CABINET_URL} target="_blank" rel="noreferrer">Кабинет ↗</a>
          <Link className="button button-primary button-small" href="/pricing">Тарифы</Link>
          <button ref={menuButton} className="menu-toggle" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? "Закрыть меню" : "Открыть меню"}>{open ? "×" : "≡"}</button>
        </div>
      </div>
      {open && <nav className="mobile-nav section-shell" id="mobile-nav" aria-label="Мобильная навигация">{navItems.map(([label, href]) => <Link href={href} key={href} aria-current={isCurrent(href)} onClick={() => setOpen(false)}>{label}</Link>)}<Link href="/reviews" aria-current={isCurrent("/reviews")} onClick={() => setOpen(false)}>Отзывы</Link><a href={CABINET_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>Открыть личный кабинет ↗</a></nav>}
    </header>
  );
}
