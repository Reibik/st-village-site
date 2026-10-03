import type { TelegramPost } from "@/src/server/telegram/types";

function hideSpoilers(html: string) {
  let depth = 0;
  return (html.match(/<[^>]*>|[^<]+/g) ?? []).map((token) => {
    if (/^<span\b/i.test(token)) {
      if (depth) { depth++; return ""; }
      if (/\bclass="[^"]*\btg-spoiler\b[^"]*"/i.test(token)) { depth = 1; return "[Спойлер]"; }
    }
    if (/^<\/span\s*>/i.test(token) && depth) { depth--; return ""; }
    return depth ? "" : token;
  }).join("");
}

export function newsPreviewImage(post: TelegramPost) {
  return post.images.find((image) => !post.attachments.some((attachment) => attachment.url === image.url && attachment.hasSpoiler));
}

function plainText(html: string) {
  const entities: Record<string, string> = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
  return hideSpoilers(html)
    .replace(/<\/?(?:p|h[1-6]|li|blockquote|br|hr)\b[^>]*>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (whole, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? whole;
      const point = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : "";
    });
}

function shorten(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length).replace(/\s+\S*$/, "")}…` : text;
}

export function newsExcerpt(html: string) {
  const paragraphs = plainText(html).split(/\n+/).map((text) => text.replace(/\s+/g, " ").trim()).filter(Boolean);
  const first = paragraphs[0] ?? "Новость ST VILLAGE";
  return { title: shorten(first, 100), text: shorten(paragraphs.length > 1 ? paragraphs.slice(1).join(" ") : first.length > 100 ? first.slice(100).trim() : "", 160) };
}
