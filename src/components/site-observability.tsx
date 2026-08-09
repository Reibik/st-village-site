"use client";

import { useEffect } from "react";

type MetricName = "CLS" | "FCP" | "INP" | "LCP" | "TTFB";

function send(payload: Record<string, unknown>) {
  const body = JSON.stringify({ ...payload, page: window.location.pathname });
  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
  } else {
    void fetch("/api/analytics", { method: "POST", body, keepalive: true, headers: { "Content-Type": "application/json" } });
  }
}
export function SiteObservability() {
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      try {
        const url = new URL(anchor.href, window.location.href);
        const destination = url.hostname === "cabinet.stvillage.ru"
          ? "cabinet"
          : url.hostname === "t.me" && url.pathname.includes("st_village_vpn_bot") ? "telegram" : null;
        if (destination) send({ eventType: "outbound_click", destination });
      } catch {
        // Invalid links are ignored; no browsing data is retained.
      }
    };
    document.addEventListener("click", onClick, { capture: true });

    const sent = new Set<MetricName>();
    const report = (name: MetricName, value: number) => {
      if (sent.has(name) || !Number.isFinite(value) || value < 0) return;
      sent.add(name);
      send({ eventType: "web_vital", metricName: name, metricValue: Math.round(value * 1000) / 1000 });
    };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) report("TTFB", navigation.responseStart);

    const observers: PerformanceObserver[] = [];
    try {
      const paint = new PerformanceObserver((list) => {
        const fcp = list.getEntries().find((entry) => entry.name === "first-contentful-paint");
        if (fcp) report("FCP", fcp.startTime);
      });
      paint.observe({ type: "paint", buffered: true });
      observers.push(paint);

      let lcpValue = 0;
      const lcp = new PerformanceObserver((list) => {
        const last = list.getEntries().at(-1);
        if (last) lcpValue = last.startTime;
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(lcp);

      let clsValue = 0;
      const cls = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput) clsValue += shift.value ?? 0;
        }
      });
      cls.observe({ type: "layout-shift", buffered: true });
      observers.push(cls);

      let inpValue = 0;
      const inp = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) inpValue = Math.max(inpValue, entry.duration);
      });
      inp.observe({ type: "event", buffered: true, durationThreshold: 40 } as PerformanceObserverInit);
      observers.push(inp);

      const flush = () => {
        if (lcpValue) report("LCP", lcpValue);
        report("CLS", clsValue);
        if (inpValue) report("INP", inpValue);
      };
      const timer = window.setTimeout(flush, 8_000);
      window.addEventListener("pagehide", flush, { once: true });
      return () => {
        document.removeEventListener("click", onClick, { capture: true });
        window.clearTimeout(timer);
        observers.forEach((observer) => observer.disconnect());
      };
    } catch {
      return () => document.removeEventListener("click", onClick, { capture: true });
    }
  }, []);

  return null;
}
