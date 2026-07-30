import type { Metadata } from "next";
import { PageHero } from "@/src/components/page-hero";
import { ConnectionWizard } from "@/src/features/connect/connection-wizard";

export const metadata: Metadata = { title: "Подключение", description: "Пошаговая настройка ST VILLAGE для популярных устройств." };
export default function ConnectPage() { return <><PageHero eyebrow="Подключение" title="Настройка шаг за шагом" text="Выберите устройство и приложение — мастер покажет подходящие действия и в нужный момент откроет отдельный личный кабинет." /><section className="section-shell page-content"><ConnectionWizard /></section></>; }
