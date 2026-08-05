const targets = [
  { name: "Сайт", url: "https://stvillage.ru/api/health", expect: /"status"\s*:\s*"ok"/ },
  { name: "Страница статуса", url: "https://stvillage.ru/status", expect: /ST VILLAGE|Статус|Состояние/i },
  { name: "Личный кабинет", url: "https://cabinet.stvillage.ru", expect: /ST VILLAGE|cabinet|кабинет/i },
  { name: "Telegram-бот", url: "https://t.me/st_village_vpn_bot", expect: /st_village_vpn_bot|Telegram/i },
];

async function probe(target) {
  let lastError = "unknown";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(target.url, {
        redirect: "follow",
        signal: AbortSignal.timeout(12_000),
        headers: { "User-Agent": "ST-VILLAGE-External-Uptime/1.0" },
      });
      const text = (await response.text()).slice(0, 250_000);
      if (response.ok && target.expect.test(text)) return { name: target.name, url: target.url, ok: true, status: response.status };
      lastError = `HTTP ${response.status} или неожиданный ответ`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 2_000));
  }
  return { name: target.name, url: target.url, ok: false, error: lastError };
}

async function notify(failures) {
  const token = process.env.UPTIME_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.UPTIME_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;
  const lines = failures.map((item) => `• ${item.name}: ${item.error}`).join("\n");
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: `⚠️ Внешняя проверка ST VILLAGE обнаружила проблему\n\n${lines}`, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.ok;
}

const results = await Promise.all(targets.map(probe));
for (const result of results) console.log(`${result.ok ? "OK" : "FAIL"}: ${result.name}${result.ok ? ` (${result.status})` : ` — ${result.error}`}`);
const failures = results.filter((result) => !result.ok);
if (failures.length) {
  console.log(`Telegram alert: ${(await notify(failures)) ? "sent" : "not configured"}`);
  process.exitCode = 1;
}
