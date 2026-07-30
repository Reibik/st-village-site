import Link from "next/link";

export function CtaPanel() { return <div className="cta-panel"><div className="cta-copy"><div className="eyebrow">Готовы начать?</div><h2>Ваше цифровое пространство — в одном месте</h2><p>Выберите период, настройте устройство по инструкции и управляйте сервисом из личного кабинета.</p><Link className="button button-primary" href="/pricing">Посмотреть тарифы <span>→</span></Link></div></div>; }
