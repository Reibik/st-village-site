"use client";

import Link from "next/link";
import { useState } from "react";
import { plans } from "@/src/config/content";

export function PricingCatalog() {
  const [devices, setDevices] = useState(1);
  const [selected, setSelected] = useState("half-year");
  return <>
    <div className="notice"><span aria-hidden="true">ⓘ</span><div><strong>Каталог ещё не подключён</strong>Цены, скидки и лимиты не подменяются демонстрационными цифрами. Интерфейс готов к данным из API.</div></div>
    <div className="pricing-controls glass-card"><div><span>Количество устройств</span><div className="segmented-control">{[1,2,3,5].map((count) => <button className={devices === count ? "active" : ""} type="button" onClick={() => setDevices(count)} key={count}>{count}</button>)}</div></div><div className="catalog-caption">Выбрано: {devices} {devices === 1 ? "устройство" : devices < 5 ? "устройства" : "устройств"}</div></div>
    <div className="pricing-grid pricing-page-grid">{plans.map((plan) => <article className={`price-card${selected === plan.id ? " price-card-featured" : ""}`} key={plan.id} onClick={() => setSelected(plan.id)}><span className="plan-kicker">{plan.kicker}</span><h3>{plan.name}</h3><div className="price-placeholder"><strong>Стоимость уточняется</strong><small>Будет загружена из каталога</small></div><p>{plan.description}</p><ul className="plan-list"><li>Выбранное число устройств: {devices}</li><li>Управление из личного кабинета</li><li>Инструкции для основных платформ</li></ul><Link className={selected === plan.id ? "button button-primary" : "button button-secondary"} href="/login">Перейти к оформлению <span>→</span></Link></article>)}</div>
    <style>{`.pricing-controls{display:flex;justify-content:space-between;align-items:center;margin-bottom:22px}.pricing-controls>div:first-child{display:flex;align-items:center;gap:18px}.pricing-controls span{font-size:13px;font-weight:680}.segmented-control{display:flex;padding:4px;border:1px solid var(--line);border-radius:12px;background:var(--surface-raised)}.segmented-control button{width:43px;height:35px;border:0;border-radius:8px;background:transparent;color:var(--muted);cursor:pointer}.segmented-control button.active{background:var(--accent);color:#04111d;font-weight:800;box-shadow:0 4px 18px var(--glow)}.catalog-caption{color:var(--muted);font-size:12px}.pricing-page-grid .price-card{cursor:pointer}.price-placeholder strong,.price-placeholder small{display:block}.price-placeholder strong{color:var(--foreground)}.price-placeholder small{margin-top:4px}.plan-list{list-style:none;padding:0;margin:20px 0;color:var(--muted);font-size:12px}.plan-list li{padding:8px 0;border-bottom:1px solid var(--line)}@media(max-width:680px){.pricing-controls,.pricing-controls>div:first-child{align-items:flex-start;flex-direction:column}.segmented-control{width:100%}.segmented-control button{flex:1}}`}</style>
  </>;
}
