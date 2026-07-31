"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="section-shell page-hero"><div className="login-panel glass-card"><span className="brand-mark login-brand">ST</span><h1>Что-то пошло не так</h1><p>Внутренние детали скрыты. Попробуйте повторить действие или обратитесь в поддержку.</p><div className="hero-actions"><button className="button button-primary" type="button" onClick={reset}>Повторить</button><Link className="button button-secondary" href="/support">Поддержка</Link></div></div></section>; }
