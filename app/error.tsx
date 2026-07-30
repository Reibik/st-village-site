"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) { return <section className="section-shell page-hero"><div className="login-panel glass-card"><span className="brand-mark login-brand">ST</span><h1>Что-то пошло не так</h1><p>Внутренние детали скрыты. Попробуйте повторить действие или вернитесь позже.</p><button className="button button-primary" type="button" onClick={reset}>Повторить</button></div></section>; }
