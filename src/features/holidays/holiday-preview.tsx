"use client";
import Image from "next/image";
import { useState, useSyncExternalStore } from "react";
import type { HolidayTheme } from "./calendar";
import { HolidayScene } from "./holiday-scene";
import { HolidayBoundary } from "./holiday-boundary";

const choices = [[null, "Обычный вид"], ["winter", "Зима"], ["space", "Космос"], ["halloween", "Хэллоуин"]] as const;
const subscribe = () => () => {};

export function HolidayPreview() {
  const [theme, setTheme] = useState<HolidayTheme | null>(null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  return <section className="section-shell holiday-preview-page">
    <div className="eyebrow">Только для dev</div>
    <h1>Праздничные орбиты</h1>
    <p className="holiday-preview-intro">Три настроения. Тот же ST VILLAGE. Здесь можно посмотреть оформление заранее — календарь и ваши настройки не изменятся.</p>
    <div className="holiday-preview-choices" role="group" aria-label="Тема предпросмотра">{choices.map(([value, label]) => <button className="holiday-preview-choice" key={value ?? "none"} type="button" disabled={!ready} aria-pressed={theme === value} onClick={() => setTheme(value)}>{label}</button>)}</div>
    <div className="holiday-preview" data-holiday-preview="">
      {theme && <HolidayBoundary resetKey={theme}><HolidayScene theme={theme} surface="edges" paused={false} /></HolidayBoundary>}
      <div className="holiday-preview-copy"><div className="eyebrow">ST VILLAGE / сезонная коллекция</div><h2>На одной орбите.<br />В любое время года.</h2><p>Лёгкие детали вокруг привычного интерфейса. Без лишнего шума — с вниманием к вам.</p><span className="holiday-preview-note">Предпросмотр · не меняет основной сайт</span></div>
      <div className="hero-visual holiday-preview-art">
        <Image src="/brand-emblem.webp" alt="Фирменная эмблема ST VILLAGE" width={450} height={450} unoptimized />
        {theme && <HolidayBoundary resetKey={theme}><HolidayScene theme={theme} surface="hero" paused={false} /></HolidayBoundary>}
      </div>
    </div>
    <p className="holiday-preview-intro">Автоматически: зима — 20 декабря–10 января · космос — 10–12 апреля · Хэллоуин — 25 октября–1 ноября. Часовой пояс — Москва. Уменьшение движения и высокая контрастность учитываются и здесь.</p>
  </section>;
}
