"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CouponDropSnapshot } from "@/src/server/coupons/schedule";

type Countdown = { days: string; hours: string; minutes: string; seconds: string };

function countdownUntil(target: string | null, now: number): Countdown {
  const remaining = target ? Math.max(0, Date.parse(target) - now) : 0;
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: String(Math.floor(totalSeconds / 86_400)).padStart(2, "0"),
    hours: String(Math.floor((totalSeconds % 86_400) / 3_600)).padStart(2, "0"),
    minutes: String(Math.floor((totalSeconds % 3_600) / 60)).padStart(2, "0"),
    seconds: String(totalSeconds % 60).padStart(2, "0"),
  };
}

function CountdownClock({ snapshot, now }: { snapshot: CouponDropSnapshot; now: number }) {
  const target = snapshot.status === "active" ? snapshot.endsAt : snapshot.nextAt;
  const countdown = countdownUntil(target, now);
  const cells = [[countdown.days, "дней"], [countdown.hours, "часов"], [countdown.minutes, "минут"], [countdown.seconds, "секунд"]] as const;
  return <div className="coupon-countdown" aria-label={snapshot.status === "active" ? "До завершения текущей раздачи" : "До следующей раздачи"}>
    {cells.map(([value, label]) => <div className="coupon-time-cell" key={label}><strong>{value}</strong><span>{label}</span></div>)}
  </div>;
}

export function CouponDrop({ initialSnapshot, compact = false }: { initialSnapshot: CouponDropSnapshot; compact?: boolean }) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/coupons/current", { cache: "no-store" });
        if (response.ok && active) setSnapshot(await response.json() as CouponDropSnapshot);
      } catch {
        // The server-rendered snapshot remains usable during a short network interruption.
      }
    };
    refresh();
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    const sync = window.setInterval(refresh, 60_000);
    return () => { active = false; window.clearInterval(clock); window.clearInterval(sync); };
  }, []);

  const target = snapshot.status === "active" ? snapshot.endsAt : snapshot.nextAt;
  const targetReached = useMemo(() => Boolean(target && Date.parse(target) <= now), [target, now]);
  useEffect(() => {
    if (!targetReached) return;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/coupons/current", { cache: "no-store" });
        if (response.ok) setSnapshot(await response.json() as CouponDropSnapshot);
      } catch {
        // The next minute sync retries automatically.
      }
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [targetReached]);

  const isActive = snapshot.status === "active" && Boolean(snapshot.couponUrl);
  const title = isActive ? "Купон уже ждёт" : snapshot.status === "upcoming" ? "Следующий подарок скоро" : "Раздача завершена";
  const description = isActive
    ? "Откройте официальный Telegram-бот и активируйте подарок, пока текущий дроп доступен."
    : snapshot.status === "upcoming"
      ? "Возвращайтесь к началу следующего дропа — новая кнопка появится здесь автоматически."
      : "Все купоны этой серии распределены. Следите за новостями — впереди будут новые подарки.";

  if (compact) return <aside className={`coupon-spotlight coupon-${snapshot.status}`} aria-labelledby="coupon-spotlight-title">
    <span className="coupon-spark coupon-spark-one" aria-hidden="true">✦</span><span className="coupon-spark coupon-spark-two" aria-hidden="true">✦</span>
    <div className="coupon-spotlight-copy">
      <div className="coupon-kicker"><span className="coupon-live-dot" /> Купонный дроп</div>
      <h2 id="coupon-spotlight-title">{title}</h2>
      <p>{description}</p>
      <div className="coupon-spotlight-actions">
        <Link className="button button-primary" href="/coupons">Открыть раздачу <span aria-hidden="true">→</span></Link>
        <span>Дроп {snapshot.dropNumber} из {snapshot.totalDrops}</span>
      </div>
    </div>
    {snapshot.status !== "ended" && <CountdownClock snapshot={snapshot} now={now} />}
  </aside>;

  return <div className={`coupon-drop coupon-${snapshot.status}`}>
    <section className="coupon-stage" aria-labelledby="coupon-stage-title">
      <div className="coupon-stage-grid" aria-hidden="true" />
      <span className="coupon-stage-orbit coupon-stage-orbit-one" aria-hidden="true" /><span className="coupon-stage-orbit coupon-stage-orbit-two" aria-hidden="true" />
      <div className="coupon-stage-copy">
        <div className="coupon-kicker"><span className="coupon-live-dot" /> {isActive ? "Раздача открыта" : snapshot.status === "upcoming" ? "Ожидаем следующий дроп" : "Серия завершена"}</div>
        <h2 id="coupon-stage-title">{title}</h2>
        <p>{description}</p>
        {snapshot.status !== "ended" && <><small className="coupon-countdown-label">{isActive ? "До закрытия купона" : "До появления купона"}</small><CountdownClock snapshot={snapshot} now={now} /></>}
        <div className="coupon-stage-actions">
          {isActive && snapshot.couponUrl
            ? <a className="button button-primary coupon-claim" href={snapshot.couponUrl} target="_blank" rel="noreferrer">Забрать купон в Telegram <span aria-hidden="true">↗</span></a>
            : snapshot.status === "ended"
              ? <a className="button button-secondary" href={snapshot.botUrl} target="_blank" rel="noreferrer">Следить в Telegram <span aria-hidden="true">↗</span></a>
              : <span className="button coupon-waiting" aria-disabled="true">Купон появится автоматически</span>}
        </div>
      </div>
      <div className="coupon-ticket" aria-hidden="true">
        <div className="coupon-ticket-top"><span>ST</span><small>VILLAGE DROP</small></div>
        <strong>GIFT</strong><b>COUPON</b>
        <div className="coupon-ticket-code">DROP-{String(snapshot.dropNumber).padStart(2, "0")}</div>
        <div className="coupon-ticket-cut coupon-ticket-cut-left" /><div className="coupon-ticket-cut coupon-ticket-cut-right" />
      </div>
    </section>

    <div className="coupon-progress" aria-label={`Прогресс раздачи: ${snapshot.completedDrops} из ${snapshot.totalDrops}`}>
      {Array.from({ length: snapshot.totalDrops }, (_, index) => {
        const number = index + 1;
        const state = index < snapshot.completedDrops ? "complete" : number === snapshot.dropNumber && snapshot.status !== "ended" ? snapshot.status : "waiting";
        return <div className={`coupon-progress-item coupon-progress-${state}`} key={number}><span>{index < snapshot.completedDrops ? "✓" : number}</span><small>Дроп {number}</small></div>;
      })}
    </div>

    <section className="coupon-rules" aria-labelledby="coupon-rules-title">
      <div><div className="eyebrow">Как это работает</div><h2 id="coupon-rules-title">Один клик до подарка</h2><p>Сайт сам следит за расписанием и показывает только актуальный купон.</p></div>
      <ol>
        <li><span>01</span><div><strong>Дождитесь дропа</strong><p>Обратный отсчёт обновляется в реальном времени.</p></div></li>
        <li><span>02</span><div><strong>Откройте Telegram</strong><p>Кнопка ведёт только в официальный бот ST VILLAGE.</p></div></li>
        <li><span>03</span><div><strong>Активируйте купон</strong><p>Условия и результат активации бот покажет сразу.</p></div></li>
      </ol>
    </section>

    <p className="coupon-note">Количество активаций может быть ограничено. Купон действует по правилам, указанным в Telegram-боте, и может закончиться раньше времени.</p>
  </div>;
}
