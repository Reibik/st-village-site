import Link from "next/link";

export function SiteFooter() {
  return <footer className="site-footer"><div className="section-shell footer-top">
    <div className="footer-brand"><Link className="brand" href="/"><span className="brand-mark">ST</span><span className="brand-copy"><strong>ST VILLAGE</strong><small>ТЕХНОЛОГИИ • СЕРВИСЫ</small></span></Link><p>Цифровая экосистема для стабильного подключения, понятного управления и поддержки.</p></div>
    <div className="footer-col"><h3>Сервис</h3><Link href="/pricing">Тарифы</Link><Link href="/connect">Подключение</Link><Link href="/status">Статус</Link></div>
    <div className="footer-col"><h3>Информация</h3><Link href="/news">Новости</Link><Link href="/support">Поддержка</Link><Link href="/support#faq">База знаний</Link></div>
    <div className="footer-col"><h3>Управление</h3><Link href="/login">Войти</Link><Link href="/login">Личный кабинет</Link></div>
  </div><div className="section-shell footer-bottom"><span>© {new Date().getFullYear()} ST VILLAGE</span><div className="footer-legal"><Link href="/legal/privacy">Конфиденциальность</Link><Link href="/legal/terms">Условия использования</Link><span>Технологии • Сервисы • Возможности</span></div></div></footer>;
}
