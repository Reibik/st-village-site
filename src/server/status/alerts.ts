import { getAlertState, setAlertState } from "@/src/server/storage/database";
import type { StatusSnapshot } from "./types";

const ALERT_KEY = "overall-status";

function statusLabel(status: StatusSnapshot["status"]) {
  return ({
    operational: "работает штатно",
    degraded: "работает с ограничениями",
    outage: "частично недоступна",
    maintenance: "на технических работах",
    unknown: "не передаёт данные",
  } as const)[status];
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function notifyStatusChange(snapshot: StatusSnapshot) {
  const affectedItems = [...snapshot.services, ...snapshot.locations]
    .filter((item) => item.status !== "operational" && item.status !== "unknown")
    .sort((left, right) => left.id.localeCompare(right.id));
  const fingerprint = [snapshot.status, ...affectedItems.map((item) => `${item.id}:${item.status}`)].join("|");
  const previous = await getAlertState(ALERT_KEY);
  if (previous === fingerprint) return false;
  await setAlertState(ALERT_KEY, fingerprint);
  if (!previous || (snapshot.status === "unknown" && previous.startsWith("operational"))) return false;

  const token = process.env.STATUS_ALERT_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.STATUS_ALERT_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const affected = affectedItems
    .slice(0, 8)
    .map((item) => `• ${escapeHtml(item.name)} — ${escapeHtml(statusLabel(item.status))}`)
    .join("\n");
  const recovered = snapshot.status === "operational";
  const text = [
    recovered ? "✅ <b>ST VILLAGE: работа восстановлена</b>" : "⚠️ <b>ST VILLAGE: изменилось состояние</b>",
    `Инфраструктура ${statusLabel(snapshot.status)}.`,
    affected || "Все контролируемые компоненты отвечают.",
    `Проверено: ${escapeHtml(new Date(snapshot.generatedAt).toLocaleString("ru-RU", { timeZone: "Europe/Moscow" }))}`,
  ].join("\n\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
