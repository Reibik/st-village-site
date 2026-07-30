import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Вход", robots: { index: false, follow: false } };

export default function LoginPage() { return <section className="section-shell page-hero"><div className="breadcrumbs"><Link href="/">Главная</Link><span>/</span>Вход</div><div className="login-panel glass-card"><span className="brand-mark login-brand">ST</span><h1>Вход в ST VILLAGE</h1><p>Авторизация будет выполняться через Telegram с серверной проверкой подписи и защищённой сессией.</p><div className="login-state"><strong>Интеграция ещё не настроена</strong>Кнопка входа станет доступна после добавления имени бота и серверного секрета. Секрет никогда не передаётся в браузер.</div><button className="button button-primary" type="button" disabled aria-disabled="true">Telegram-бот настраивается</button><div><Link className="text-link login-back" href="/">← Вернуться на главную</Link></div></div><style>{`.login-panel button:disabled{opacity:.55;cursor:not-allowed;transform:none}.login-back{margin-top:24px}`}</style></section>; }
