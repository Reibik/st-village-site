import Image from "next/image";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";

const quickLinks = [
  {
    title: "Личный кабинет",
    hint: "Управление подпиской",
    action: "Открыть кабинет",
    href: CABINET_URL,
    image: "/qr-cabinet.png",
  },
  {
    title: "Telegram-бот",
    hint: "Покупка и поддержка",
    action: "Открыть бота",
    href: TELEGRAM_BOT_URL,
    image: "/qr-telegram-bot.png",
  },
] as const;

export function CtaPanel({ trial = false }: { trial?: boolean }) {
  return <div className="cta-panel">
    <div className="cta-copy">
      <div className="eyebrow">{trial ? "Ваш следующий шаг" : "Клиентское пространство"}</div>
      <h2>{trial ? "Начните с одного дня." : "Кабинет и бот всегда под рукой"}</h2>
      <p>{trial ? "Проверьте подключение на своём устройстве. Если всё подходит — выберите тариф в кабинете. Подписка и поддержка всегда рядом." : "Откройте нужный сервис кнопкой или наведите камеру телефона на QR-код, если смотрите сайт с компьютера."}</p>
      <div className="cta-actions"><a className="button button-primary" href={CABINET_URL} target="_blank" rel="noreferrer">{trial ? "Попробовать ST VILLAGE" : "Открыть кабинет"} <span aria-hidden="true">↗</span></a><a className="button button-secondary" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Telegram-бот <span aria-hidden="true">↗</span></a></div>
    </div>
    <div className="cta-qr-grid" aria-label="Быстрые переходы по QR-коду">
      {quickLinks.map((item) => <a className="cta-qr-card" href={item.href} target="_blank" rel="noreferrer" aria-label={`${item.action}: ${item.hint}`} key={item.title}>
        <span className="cta-qr-image"><Image src={item.image} alt={`QR-код: ${item.title}`} width="512" height="512" unoptimized /></span>
        <span className="cta-qr-copy"><small>{item.hint}</small><strong>{item.title}</strong><span>{item.action} ↗</span></span>
      </a>)}
    </div>
  </div>;
}
