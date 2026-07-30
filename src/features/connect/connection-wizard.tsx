"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CONNECTION_APPS,
  DEVICE_OPTIONS,
  getDevice,
  type ConnectionAppId,
  type DeviceId,
} from "@/src/config/connection-apps";
import { CABINET_URL, TELEGRAM_BOT_URL } from "@/src/config/links";

const STEP_LABELS = ["Устройство", "Приложение", "Подписка", "Проверка"];

const TROUBLESHOOTING = [
  {
    title: "Ссылка на подписку не импортируется",
    text: "Скопируйте ссылку из кабинета ещё раз целиком, обновите приложение до последней версии и повторите импорт через пункт добавления подписки из URL или буфера обмена.",
  },
  {
    title: "Подключение включено, но сайты не открываются",
    text: "Смените локацию в приложении, отключите другие VPN- и proxy-приложения, затем выключите и снова включите подключение.",
  },
  {
    title: "Система не запрашивает разрешение на VPN-профиль",
    text: "Проверьте разрешения приложения и раздел VPN в системных настройках. Если профиль остался от старой установки, удалите его и повторите добавление.",
  },
  {
    title: "Подписка или список локаций не обновляются",
    text: "Запустите обновление подписки вручную в приложении и проверьте срок доступа в личном кабинете. При сохранении ошибки обратитесь в поддержку.",
  },
];

function detectDevice(): DeviceId | null {
  if (typeof navigator === "undefined") return null;
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  const isTouchMac = platform === "MacIntel" && navigator.maxTouchPoints > 1;
  if (/iPhone|iPad|iPod/i.test(userAgent) || isTouchMac) return "ios";
  if (/Android/i.test(userAgent)) {
    return /TV|AFT|BRAVIA|SmartTV|SMART-TV/i.test(userAgent) ? "android-tv" : "android";
  }
  if (/Windows/i.test(userAgent) || /Win/i.test(platform)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent) || /Mac/i.test(platform)) return "macos";
  if (/Linux/i.test(userAgent) || /Linux/i.test(platform)) return "linux";
  return null;
}

export function ConnectionWizard() {
  const [step, setStep] = useState(1);
  const [deviceId, setDeviceId] = useState<DeviceId | null>(null);
  const [appId, setAppId] = useState<ConnectionAppId>("happ");
  const [autoDetected, setAutoDetected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const detected = detectDevice();
      if (!detected) return;
      const detectedDevice = getDevice(detected);
      setDeviceId(detected);
      setAppId(detectedDevice.recommendedApp);
      setAutoDetected(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const device = deviceId ? getDevice(deviceId) : null;
  const selectedApp = CONNECTION_APPS[appId];
  const downloads = deviceId ? selectedApp.downloads[deviceId] : [];
  const recommendedAppId = device?.recommendedApp ?? "happ";
  const supportContext = device
    ? `Здравствуйте! Нужна помощь с подключением ST VILLAGE. Устройство: ${device.name}. Приложение: ${selectedApp.name}.`
    : "Здравствуйте! Нужна помощь с подключением ST VILLAGE.";
  const supportUrl = useMemo(() => {
    const url = new URL(TELEGRAM_BOT_URL);
    if (deviceId) url.searchParams.set("start", `support_${deviceId.replace("-", "_")}_${appId}`);
    return url.toString();
  }, [deviceId, appId]);

  function chooseDevice(value: DeviceId) {
    const nextDevice = getDevice(value);
    setDeviceId(value);
    setAppId(nextDevice.recommendedApp);
    setAutoDetected(false);
  }

  async function copySupportContext() {
    try {
      await navigator.clipboard.writeText(supportContext);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }

  return <div className="wizard">
    <aside className="wizard-progress glass-card" aria-label="Этапы подключения">
      {STEP_LABELS.map((label, index) => <div className={`wizard-step${step === index + 1 ? " active" : ""}${step > index + 1 ? " complete" : ""}`} key={label}>
        <span>{step > index + 1 ? "✓" : index + 1}</span>{label}
      </div>)}
    </aside>

    <div className="wizard-panel glass-card">
      {step === 1 && <>
        <div className="eyebrow">Шаг 1 из 4</div>
        <h2>Выберите устройство</h2>
        <p className="wizard-copy">Мы постараемся определить платформу автоматически. Вы всегда можете выбрать другую.</p>

        {autoDetected && device && <div className="auto-device-notice" role="status">
          <span aria-hidden="true">◎</span>
          <div><strong>Похоже, у вас {device.name}</strong><small>Автоматически рекомендуем {CONNECTION_APPS[device.recommendedApp].name}</small></div>
        </div>}

        <div className="choice-grid device-choice-grid">
          {DEVICE_OPTIONS.map((item) => <button
            className={`choice-button${deviceId === item.id ? " selected" : ""}`}
            type="button"
            aria-pressed={deviceId === item.id}
            onClick={() => chooseDevice(item.id)}
            key={item.id}
          >
            <span className="device-choice-icon" aria-hidden="true">{item.icon}</span>
            <strong>{item.name}</strong>
            <small>{item.hint}</small>
          </button>)}
        </div>
        <div className="wizard-actions"><span /><button className="button button-primary" type="button" disabled={!deviceId} onClick={() => setStep(2)}>Продолжить →</button></div>
      </>}

      {step === 2 && device && <>
        <div className="eyebrow">Шаг 2 из 4 · {device.shortName}</div>
        <h2>Скачайте Happ или INCY</h2>
        <p className="wizard-copy">Подходящий вариант уже выбран автоматически. При желании переключитесь на второе приложение.</p>

        <div className="choice-grid choice-grid-apps">
          {(Object.values(CONNECTION_APPS)).map((client) => <button
            className={`choice-button app-choice-button${appId === client.id ? " selected" : ""}`}
            type="button"
            aria-pressed={appId === client.id}
            onClick={() => setAppId(client.id)}
            key={client.id}
          >
            <span className={`app-choice-mark${client.id === "incy" ? " app-choice-mark-alt" : ""}`} aria-hidden="true">{client.mark}</span>
            <span>
              {recommendedAppId === client.id && <small className="recommendation-label">Рекомендуем для {device.shortName}</small>}
              <strong>{client.name}</strong>
              <small>{client.description}</small>
            </span>
          </button>)}
        </div>

        <div className="download-panel" aria-live="polite">
          <div className="download-panel-heading">
            <div><span className="connect-app-label">Официальная загрузка</span><h3>{selectedApp.name} для {device.shortName}</h3></div>
            <a className="text-link" href={selectedApp.officialUrl} target="_blank" rel="noreferrer">Сайт разработчика ↗</a>
          </div>
          <div className="download-buttons">
            {downloads.map((download, index) => <a className={index === 0 ? "button button-primary" : "button button-secondary"} href={download.url} target="_blank" rel="noreferrer" key={download.url}>
              <span>{download.label}</span>{download.note && <small>{download.note}</small>}
            </a>)}
          </div>
          <p className="download-safety">Проверьте имя приложения перед установкой. Ссылки ведут только на официальный магазин, сайт или GitHub разработчика.</p>
        </div>

        <div className="wizard-actions"><button className="button button-secondary" type="button" onClick={() => setStep(1)}>← Назад</button><button className="button button-primary" type="button" onClick={() => setStep(3)}>Приложение установлено →</button></div>
      </>}

      {step === 3 && device && <>
        <div className="eyebrow">Шаг 3 из 4 · {selectedApp.name}</div>
        <h2>Добавьте подписку из кабинета</h2>
        <p className="wizard-copy">Откройте личный кабинет, скопируйте персональную ссылку подписки и импортируйте её в {selectedApp.name}. Не публикуйте эту ссылку и не передавайте её другим людям.</p>

        <ol className="visual-guide">
          <li className="guide-card">
            <GuideVisual type="cabinet" />
            <div><span>01</span><h3>Откройте кабинет</h3><p>Авторизуйтесь и откройте активную подписку ST VILLAGE.</p><a className="text-link" href={CABINET_URL} target="_blank" rel="noreferrer">Перейти в кабинет ↗</a></div>
          </li>
          <li className="guide-card">
            <GuideVisual type="copy" />
            <div><span>02</span><h3>Скопируйте ссылку</h3><p>Нажмите кнопку копирования рядом со ссылкой подписки в кабинете.</p></div>
          </li>
          <li className="guide-card">
            <GuideVisual type="import" appName={selectedApp.name} />
            <div><span>03</span><h3>Импортируйте в {selectedApp.name}</h3><p>Выберите добавление подписки из URL или буфера обмена и вставьте ссылку.</p></div>
          </li>
          <li className="guide-card">
            <GuideVisual type="connect" />
            <div><span>04</span><h3>Разрешите подключение</h3><p>Подтвердите создание системного VPN-профиля и включите подключение.</p></div>
          </li>
        </ol>

        <div className="notice connect-security-notice"><span>ⓘ</span><div><strong>Персональные данные остаются в кабинете</strong>Публичный сайт не запрашивает и не отображает ссылку вашей подписки.</div></div>
        <div className="wizard-actions"><button className="button button-secondary" type="button" onClick={() => setStep(2)}>← Назад</button><button className="button button-primary" type="button" onClick={() => setStep(4)}>Проверить подключение →</button></div>
      </>}

      {step === 4 && device && <>
        <div className="eyebrow">Шаг 4 из 4 · {device.shortName} + {selectedApp.name}</div>
        <h2>Проверьте подключение</h2>
        <p className="wizard-copy">Включите подключение в {selectedApp.name}, откройте любой сайт и при необходимости смените локацию.</p>

        <div className="connection-checklist">
          <div><span>1</span><strong>Подписка добавлена</strong><small>В приложении появился список локаций</small></div>
          <div><span>2</span><strong>Профиль разрешён</strong><small>Система разрешила VPN-подключение</small></div>
          <div><span>3</span><strong>Сайт открывается</strong><small>После включения доступ в интернет работает</small></div>
        </div>

        <section className="troubleshooting" aria-labelledby="troubleshooting-title">
          <div className="download-panel-heading"><div><span className="connect-app-label">Самодиагностика</span><h3 id="troubleshooting-title">Типовые ошибки</h3></div><Link className="text-link" href="/status">Проверить статус →</Link></div>
          <div className="troubleshooting-list">
            {TROUBLESHOOTING.map((item) => <details key={item.title}><summary>{item.title}<span aria-hidden="true">+</span></summary><p>{item.text}</p></details>)}
          </div>
        </section>

        <div className="support-context-card">
          <div><span className="connect-app-label">Если не получилось</span><h3>Поддержка уже знает ваш выбор</h3><p>{supportContext}</p><small>{copied ? "Описание скопировано — вставьте его в чат с ботом." : "При переходе описание также будет скопировано в буфер обмена."}</small></div>
          <a className="button button-primary" href={supportUrl} target="_blank" rel="noreferrer" onClick={() => void copySupportContext()}>{copied ? "Скопировано · открыть бота ↗" : "Открыть поддержку ↗"}</a>
        </div>

        <div className="wizard-actions"><button className="button button-secondary" type="button" onClick={() => setStep(3)}>← Назад</button><button className="button button-secondary" type="button" onClick={() => { setStep(1); setCopied(false); }}>Начать заново</button></div>
      </>}
    </div>
  </div>;
}

function GuideVisual({ type, appName = "App" }: { type: "cabinet" | "copy" | "import" | "connect"; appName?: string }) {
  if (type === "cabinet") return <figure className="guide-visual" aria-label="Иллюстрация личного кабинета">
    <div className="visual-browser-bar"><i /><i /><i /></div><div className="visual-cabinet"><span>ST</span><b>Моя подписка</b><em>Активна</em></div>
  </figure>;
  if (type === "copy") return <figure className="guide-visual" aria-label="Иллюстрация копирования ссылки">
    <div className="visual-browser-bar"><i /><i /><i /></div><div className="visual-link-row"><span>https://••••••••••</span><b>Копировать</b></div><div className="visual-toast">✓ Ссылка скопирована</div>
  </figure>;
  if (type === "import") return <figure className="guide-visual visual-phone" aria-label={`Иллюстрация импорта подписки в ${appName}`}>
    <div className="visual-phone-head"><b>{appName}</b><span>＋</span></div><div className="visual-import"><small>Добавить подписку</small><span>Из буфера обмена</span><span>Из URL</span></div>
  </figure>;
  return <figure className="guide-visual visual-phone" aria-label="Иллюстрация включённого подключения">
    <div className="visual-phone-head"><b>ST VILLAGE</b><i>●</i></div><div className="visual-connected"><span>✓</span><b>Подключено</b><small>Локация выбрана</small></div>
  </figure>;
}
