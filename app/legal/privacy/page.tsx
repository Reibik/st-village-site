import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { TELEGRAM_BOT_URL } from "@/src/config/links";
import { createPageMetadata } from "@/src/config/seo";

export const metadata: Metadata = createPageMetadata({
  title: "Политика конфиденциальности",
  description: "Порядок обработки и защиты данных пользователей сервиса ST VILLAGE.",
  path: "/legal/privacy",
});

const sections = [
  ["privacy-general", "1. Общие положения"],
  ["privacy-data", "2. Какие данные мы собираем"],
  ["privacy-purpose", "3. Цели обработки данных"],
  ["privacy-storage", "4. Передача и хранение данных"],
  ["privacy-security", "5. Безопасность"],
  ["privacy-rights", "6. Права пользователя"],
  ["privacy-updates", "7. Изменения политики"],
] as const;

export default function PrivacyPage() {
  return <>
    <PageHero eyebrow="Документы" title="Политика конфиденциальности 🚀ST VILLAGE🚀" text="Документ определяет порядок обработки и защиты минимально необходимых данных пользователей сервиса." />
    <section className="section-shell page-content">
      <div className="legal-layout">
        <aside className="legal-nav glass-card" aria-label="Содержание политики конфиденциальности">
          <span className="legal-doc-kicker">Документ ST VILLAGE</span>
          <strong>Содержание</strong>
          <nav>{sections.map(([id,label]) => <a href={`#${id}`} key={id}>{label}</a>)}</nav>
          <a className="legal-support-link" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Связаться с поддержкой ↗</a>
        </aside>

        <article className="legal-document glass-card">
          <header className="legal-document-header"><span>Актуальная редакция</span><p>Политика конфиденциальности сервиса 🚀ST VILLAGE🚀</p></header>

          <section className="legal-section" id="privacy-general"><h2>1. Общие положения</h2><p>Настоящая политика определяет порядок обработки и защиты персональных данных пользователей VPN-сервиса 🚀ST VILLAGE🚀, предоставляемого через Telegram-бота <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">@st_village_vpn_bot</a>.</p></section>

          <section className="legal-section" id="privacy-data"><h2>2. Какие данные мы собираем</h2><p>Для стабильной работы сервиса мы собираем только минимально необходимую информацию:</p><ul><li>Telegram ID пользователя.</li><li>Техническую информацию, необходимую для оказания поддержки, например тип устройства или версию приложения.</li><li>Обезличенные агрегированные события перехода в кабинет или Telegram-бот и показатели производительности страниц. Сайт не сохраняет в аналитике IP-адрес, cookie, Telegram ID или историю просмотра.</li><li>Имя или псевдоним, оценку и текст отзыва — только когда пользователь самостоятельно отправляет их для публикации.</li></ul><div className="legal-highlight"><strong>Важно</strong><p>🚀ST VILLAGE🚀 не записывает логи вашей интернет-активности, не отслеживает и не анализирует проходящий трафик.</p></div></section>

          <section className="legal-section" id="privacy-purpose"><h2>3. Цели обработки данных</h2><p>Собранные данные используются исключительно в следующих целях:</p><ul><li>Идентификация пользователя для предоставления доступа к VPN-сервису.</li><li>Оказание технической поддержки и оперативное решение вопросов.</li><li>Обеспечение безопасности сервиса и предотвращение нарушений правил использования.</li></ul></section>

          <section className="legal-section" id="privacy-storage"><h2>4. Передача и хранение данных</h2><p>Ваши персональные данные не передаются третьим лицам, за исключением случаев, прямо предусмотренных действующим законодательством. Вся информация хранится только в том объёме, который строго необходим для корректной работы бота и поддержки пользователей.</p><p>Отправленные отзывы хранятся до завершения модерации, а опубликованные — до отзыва согласия пользователем. Агрегированные технические показатели не используются для построения персонального профиля.</p></section>

          <section className="legal-section" id="privacy-security"><h2>5. Безопасность</h2><p>Сервис 🚀ST VILLAGE🚀 применяет современные технические и организационные меры для надёжной защиты ваших данных от несанкционированного доступа, утечки, изменения или уничтожения.</p></section>

          <section className="legal-section" id="privacy-rights"><h2>6. Права пользователя</h2><p>Вы полностью контролируете свои данные и имеете право:</p><ul><li>Запрашивать информацию о своих сохранённых данных.</li><li>Требовать их исправления или полного удаления.</li><li>Отозвать своё согласие на обработку данных. В этом случае предоставление услуг сервиса может быть ограничено или прекращено.</li></ul><p>Для реализации своих прав обращайтесь напрямую в службу поддержки через Telegram: <a href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">@st_village_vpn_bot</a>.</p></section>

          <section className="legal-section" id="privacy-updates"><h2>7. Изменения политики</h2><p>Команда 🚀ST VILLAGE🚀 может обновлять настоящую политику конфиденциальности без предварительного уведомления. Актуальная версия документа всегда доступна на нашем сайте.</p></section>
        </article>
      </div>
    </section>
  </>;
}
