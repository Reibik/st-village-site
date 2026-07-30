"use client";

import Link from "next/link";
import { useState } from "react";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";

const devices = ["iPhone / iPad", "Android", "Windows", "macOS", "Linux", "Android TV"] as const;
const apps: Record<string, readonly string[]> = {
  "iPhone / iPad": ["Streisand", "Happ"], Android: ["Happ", "v2rayNG"], Windows: ["Hiddify", "Happ"], macOS: ["Streisand", "Hiddify"], Linux: ["Hiddify", "Системный клиент"], "Android TV": ["Happ", "v2rayNG"],
};

export function ConnectionWizard() {
  const [step, setStep] = useState(1);
  const [device, setDevice] = useState<string>("");
  const [app, setApp] = useState<string>("");
  const steps = ["Устройство", "Приложение", "Кабинет", "Проверка"];
  function chooseDevice(value: string) { setDevice(value); setApp(""); }
  return <div className="wizard">
    <aside className="wizard-progress glass-card" aria-label="Этапы подключения">{steps.map((label,index) => <div className={`wizard-step${step === index + 1 ? " active" : ""}`} key={label}><span>{index + 1}</span>{label}</div>)}</aside>
    <div className="wizard-panel glass-card">
      {step === 1 && <><div className="eyebrow">Шаг 1 из 4</div><h2>Выберите устройство</h2><p className="wizard-copy">Инструкция адаптируется под выбранную платформу.</p><div className="choice-grid">{devices.map((item) => <button className={`choice-button${device === item ? " selected" : ""}`} type="button" onClick={() => chooseDevice(item)} key={item}><span aria-hidden="true">◇</span><strong>{item}</strong><small>Пошаговая настройка</small></button>)}</div><div className="wizard-actions"><span /><button className="button button-primary" disabled={!device} onClick={() => setStep(2)}>Продолжить →</button></div></>}
      {step === 2 && <><div className="eyebrow">Шаг 2 из 4</div><h2>Выберите приложение</h2><p className="wizard-copy">Доступные варианты для {device}.</p><div className="choice-grid">{apps[device]?.map((item) => <button className={`choice-button${app === item ? " selected" : ""}`} type="button" onClick={() => setApp(item)} key={item}><span aria-hidden="true">⌘</span><strong>{item}</strong><small>Совместимый клиент</small></button>)}</div><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(1)}>← Назад</button><button className="button button-primary" disabled={!app} onClick={() => setStep(3)}>Продолжить →</button></div></>}
      {step === 3 && <><div className="eyebrow">Шаг 3 из 4</div><h2>Получите данные подключения</h2><p className="wizard-copy">Персональные данные подключения доступны в отдельном клиентском кабинете, связанном с Telegram-ботом.</p><div className="empty-state wizard-empty"><div className="empty-symbol">⌁</div><h3>Откройте личный кабинет</h3><p>Перейдите в кабинет ST VILLAGE, чтобы продолжить настройку в {app}.</p><a className="button button-primary" href={CABINET_URL} target="_blank" rel="noreferrer">Открыть кабинет ↗</a><a className="text-link wizard-bot-link" href={TELEGRAM_BOT_URL} target="_blank" rel="noreferrer">Или перейти в Telegram-бота ↗</a></div><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(2)}>← Назад</button><button className="button button-secondary" onClick={() => setStep(4)}>Как проверить?</button></div></>}
      {step === 4 && <><div className="eyebrow">Шаг 4 из 4</div><h2>Проверьте состояние</h2><p className="wizard-copy">После добавления данных откройте приложение, активируйте подключение и при необходимости вернитесь в кабинет или бот.</p><div className="notice"><span>ⓘ</span><div><strong>Клиентские данные остаются в кабинете</strong>Публичный сайт не запрашивает и не отображает персональные параметры подключения.</div></div><div className="wizard-actions"><button className="button button-secondary" onClick={() => setStep(3)}>← Назад</button><Link className="button button-primary" href="/status">Статус инфраструктуры →</Link></div></>}
      <style>{`.wizard-panel h2{margin:14px 0 8px;font-size:30px;letter-spacing:-.04em}.wizard-copy{margin:0;color:var(--muted)}.wizard-empty{margin-top:28px;padding:38px 20px}.wizard-empty .button{margin-top:24px}.wizard-bot-link{justify-content:center;margin:18px auto 0}.wizard-actions button:disabled{opacity:.42;cursor:not-allowed;transform:none}`}</style>
    </div>
  </div>;
}
