import Link from "next/link";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";
import { SITE_RELEASE } from "@/src/config/release";

export function SiteFooter() {
  return <footer className="site-footer"><div className="section-shell footer-top">
    <div className="footer-brand"><Link className="brand" href="/"><span className="brand-mark">ST</span><span className="brand-copy"><strong>ST VILLAGE</strong><small>ТЕХНОЛОГИИ • СЕРВИСЫ</small></span></Link><p>Цифровая экосистема для стабильного подключения, понятного управления и поддержки.</p></div>
    <div className="footer-col"><h3>Сервис</h3><Link href="/pricing">Тарифы</Link><Link href="/connect">Подключение</Link><Link href="/status">Статус</Link></div>
    <div className="footer-col"><h3>Информация</h3><Link href="/news">Новости</Link><Link href="/reviews">Отзывы</Link><Link href="/support">Поддержка</Link><Link href="/support#faq">База знаний</Link></div>
    <div className="footer-col"><h3>Клиентам</h3><a href={CABINET_URL} target="_blank" rel="noreferrer">Личный кабинет ↗</a><a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Telegram-бот ↗</a></div>
  </div><div className="section-shell footer-bottom"><div className="footer-meta"><span>© {new Date().getFullYear()} ST VILLAGE</span><Link className="footer-version" href="/release" title={`${SITE_RELEASE.name} — v${SITE_RELEASE.version}`}>v{SITE_RELEASE.version}</Link></div><div className="footer-legal"><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/terms">Условия использования</Link><span>Технологии • Сервисы • Возможности</span></div></div></footer>;
}
