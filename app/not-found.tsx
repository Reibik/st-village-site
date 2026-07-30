import Link from "next/link";

export default function NotFound() { return <section className="section-shell page-hero"><div className="login-panel glass-card"><span className="brand-mark login-brand">404</span><h1>Такой страницы нет</h1><p>Фирменный помощник не нашёл этот адрес. Вернитесь на главную или откройте раздел поддержки.</p><div className="hero-actions"><Link className="button button-primary" href="/">На главную</Link><Link className="button button-secondary" href="/support">Поддержка</Link></div></div></section>; }
