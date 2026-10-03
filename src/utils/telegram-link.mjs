export function normalizeTelegramHref(href, base, repairedHosts = []) {
  try {
    const raw = href.trim();
    if (!raw) return null;
    const bareDomain = /^(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}(?:[/?#][^\s]*)?$/i.test(raw);
    const url = new URL(bareDomain ? `https://${raw}` : raw, base);
    if (!["http:", "https:", "tg:"].includes(url.protocol)) return null;
    // Narrow read-time repair for links stored before bare-domain handling.
    // Other Telegram URLs and relative channel links keep their original meaning.
    if (url.hostname === "t.me" && url.pathname.startsWith("/s/")) {
      const legacyHost = url.pathname.slice(3);
      if (repairedHosts.includes(legacyHost)) return `https://${legacyHost}/${url.search}${url.hash}`;
    }
    return url.toString();
  } catch { return null; }
}
