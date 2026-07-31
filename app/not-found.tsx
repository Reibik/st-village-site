import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() { return <section className="section-shell page-hero"><div className="login-panel glass-card"><span className="brand-mark login-brand">404</span><h1>Такой страницы нет</h1><p>Фирменный помощник не нашёл этот адрес. Вернитесь на главную или откройте раздел поддержки.</p><div className="hero-actions"><Link className="button button-primary" href="/">На главную</Link><Link className="button button-secondary" href="/support">Поддержка</Link></div></div></section>; }
