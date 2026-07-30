import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";

export const metadata: Metadata = { title: "Политика конфиденциальности" };
export default function PrivacyPage() { return <><PageHero eyebrow="Документы" title="Политика конфиденциальности" text="Черновая структура документа. Перед production-запуском её необходимо заполнить юридически проверенным текстом и реквизитами оператора." /><section className="section-shell page-content"><div className="notice"><span>ⓘ</span><div><strong>Требуется юридическая редакция</strong>Мы не публикуем вымышленные реквизиты или неподтверждённые обязательства.</div></div><article className="glass-card legal-copy"><h2>Что будет описано в документе</h2><p>Состав обрабатываемых данных, цели и основания обработки, сроки хранения, права пользователя, меры защиты и порядок обращения к оператору.</p></article></section></>; }
