import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/src/components/page-hero";
import { TELEGRAM_BOT_URL } from "@/src/config/links";
import { createPageMetadata } from "@/src/config/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Условия использования",
  description: "Публичная оферта и условия использования сервиса ST VILLAGE.",
  path: "/legal/terms",
});

const sections = [
  ["terms-general", "1. Общие положения"],
  ["terms-service", "2. Предоставляемые услуги"],
  ["terms-duties", "3. Обязанности пользователя"],
  ["terms-payment", "4. Оплата и условия возврата"],
  ["terms-liability", "5. Отказ от ответственности"],
  ["terms-privacy", "6. Конфиденциальность"],
  ["terms-duration", "7. Срок действия договора"],
  ["terms-contacts", "8. Контакты"],
] as const;

export default function TermsPage() {
  return <>
    <PageHero eyebrow="Документы" title="Публичная оферта сервиса 🚀ST VILLAGE🚀" text="Условия предоставления сервиса, оплаты, возврата и допустимого использования." />
    <section className="section-shell page-content">
      <div className="legal-layout">
        <aside className="legal-nav glass-card" aria-label="Содержание публичной оферты">
          <span className="legal-doc-kicker">Документ ST VILLAGE</span>
          <strong>Содержание</strong>
          <nav>{sections.map(([id,label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
          <a className="legal-support-link" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Связаться с поддержкой ↗</a>
        </aside>

        <article className="legal-document glass-card">
          <header className="legal-document-header"><span>Актуальная редакция</span><p>Публичная оферта сервиса 🚀ST VILLAGE🚀</p></header>

          <section className="legal-section" id="terms-general"><h2>1. Общие положения</h2><p>Настоящая оферта является официальным предложением заключить договор между вами (Пользователем) и сервисом 🚀ST VILLAGE🚀, предоставляемым через Telegram-бота <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">@st_village_vpn_bot</a>.</p><div className="legal-highlight"><strong>Принятие условий</strong><p>Начало использования бота означает ваше полное и безоговорочное согласие с условиями данного соглашения.</p></div><p>Условия оферты могут быть изменены администрацией сервиса без предварительного уведомления. Актуальная версия всегда доступна в боте.</p></section>

          <section className="legal-section" id="terms-service"><h2>2. Предоставляемые услуги</h2><p>Сервис 🚀ST VILLAGE🚀 предоставляет доступ к виртуальной частной сети (VPN) через Telegram-бота. Услуга обеспечивает шифрование интернет-трафика и защиту анонимности пользователя в сети.</p></section>

          <section className="legal-section" id="terms-duties"><h2>3. Обязанности пользователя</h2><p>Пользователь обязуется использовать сервис добросовестно. Строго не допускается использование VPN для:</p><ul><li>Любой противоправной и незаконной деятельности.</li><li>Массовой рассылки электронных сообщений (спама).</li><li>Организации кибератак, взломов и распространения вредоносного ПО (вирусов).</li></ul><div className="legal-warning"><strong>Внимание</strong><p>Нарушение любого из этих правил приводит к немедленной блокировке аккаунта пользователя.</p></div></section>

          <section className="legal-section" id="terms-payment"><h2>4. Оплата и условия возврата</h2><p>Все платежи за подписку осуществляются непосредственно через интерфейс Telegram-бота.</p><div className="legal-terms-grid"><div><strong>При первой покупке</strong><p>Пользователь имеет право запросить возврат средств в течение 7 дней с момента оплаты.</p></div><div><strong>При автопродлении</strong><p>Возврат средств возможен при обращении в поддержку в течение 48 часов после списания.</p></div></div><h3>Процедура возврата</h3><p>Средства возвращаются на тот же счёт или способ оплаты, с которого была произведена транзакция. Срок обработки заявки на возврат составляет до 10 рабочих дней.</p></section>

          <section className="legal-section" id="terms-liability"><h2>5. Отказ от ответственности</h2><p>Услуги сервиса предоставляются по принципу «как есть» (as is). Мы прикладываем все усилия для стабильной работы, однако не гарантируем 100% бесперебойную доступность сети и не несём ответственности за возможные блокировки со стороны вашего интернет-провайдера, а также технические сбои вне нашего контроля.</p></section>

          <section className="legal-section" id="terms-privacy"><h2>6. Конфиденциальность</h2><p>Сервис 🚀ST VILLAGE🚀 уважает ваше право на приватность. Мы не храним логи вашей активности. Для функционирования сервиса и оказания технической поддержки используются исключительно ваш Telegram ID и базовые технические данные согласно <Link href="/legal/privacy">Политике конфиденциальности</Link>.</p></section>

          <section className="legal-section" id="terms-duration"><h2>7. Срок действия договора</h2><p>Договор действует до полного окончания оплаченного периода подписки.</p><p>В случае блокировки аккаунта за нарушение пользовательских обязанностей, указанных в пункте 3, действие договора прекращается досрочно, а возврат средств за неиспользованный период не производится.</p></section>

          <section className="legal-section" id="terms-contacts"><h2>8. Контакты</h2><p>По всем вопросам, связанным с работой сервиса, оплатой или техническими проблемами, обращайтесь в службу поддержки через нашего Telegram-бота: <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">@st_village_vpn_bot</a>.</p></section>
        </article>
      </div>
    </section>
  </>;
}
