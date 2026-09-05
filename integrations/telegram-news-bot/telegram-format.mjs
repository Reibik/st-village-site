const entityTags = {
  bold: ["<b>", "</b>"],
  italic: ["<i>", "</i>"],
  underline: ["<u>", "</u>"],
  strikethrough: ["<s>", "</s>"],
  spoiler: ["<tg-spoiler>", "</tg-spoiler>"],
  code: ["<code>", "</code>"],
  pre: ["<pre>", "</pre>"],
  blockquote: ["<blockquote>", "</blockquote>"],
  expandable_blockquote: ["<blockquote expandable>", "</blockquote>"],
};

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function richTextToPlain(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(richTextToPlain).join("");
  if (!value || typeof value !== "object") return "";
  if (value.type === "custom_emoji") return value.alternative_text ?? "";
  if (value.type === "mathematical_expression") return value.expression ?? "";
  if (value.type === "anchor") return "";
  if (value.type === "button") return richTextToPlain(value.button?.text);
  return richTextToPlain(value.text);
}

function richTextToHtml(value, depth = 0) {
  if (depth > 20) return "";
  if (typeof value === "string") return escapeHtml(value);
  if (Array.isArray(value)) return value.map((item) => richTextToHtml(item, depth + 1)).join("");
  if (!value || typeof value !== "object") return "";

  const content = richTextToHtml(value.text, depth + 1);
  const wrappers = {
    bold: ["<b>", "</b>"], italic: ["<i>", "</i>"], underline: ["<u>", "</u>"],
    strikethrough: ["<s>", "</s>"], spoiler: ["<tg-spoiler>", "</tg-spoiler>"],
    subscript: ["<sub>", "</sub>"], superscript: ["<sup>", "</sup>"],
    marked: ["<mark>", "</mark>"], code: ["<code>", "</code>"],
  };
  if (wrappers[value.type]) return `${wrappers[value.type][0]}${content}${wrappers[value.type][1]}`;
  if (value.type === "custom_emoji") {
    return `<tg-emoji emoji-id="${escapeAttribute(value.custom_emoji_id ?? "")}">${escapeHtml(value.alternative_text ?? "")}</tg-emoji>`;
  }
  if (value.type === "mathematical_expression") return `<code>${escapeHtml(value.expression ?? "")}</code>`;
  if (value.type === "url" && value.url) return `<a href="${escapeAttribute(value.url)}">${content}</a>`;
  if (value.type === "email_address" && value.email_address) return `<a href="mailto:${escapeAttribute(value.email_address)}">${content}</a>`;
  if (value.type === "phone_number" && value.phone_number) return `<a href="tel:${escapeAttribute(value.phone_number)}">${content}</a>`;
  if (value.type === "text_mention" && value.user?.id) return `<a href="tg://user?id=${value.user.id}">${content}</a>`;
  if (value.type === "mention" && value.username) return `<a href="https://t.me/${escapeAttribute(String(value.username).replace(/^@/, ""))}">${content}</a>`;
  if (value.type === "anchor_link") return `<a href="#${escapeAttribute(value.anchor_name ?? "")}">${content}</a>`;
  if (value.type === "reference_link") return `<a href="#reference-${escapeAttribute(value.reference_name ?? "")}">${content}</a>`;
  if (value.type === "reference") return `<span>${content}</span>`;
  if (value.type === "button") return richTextToHtml(value.button?.text, depth + 1);
  if (value.type === "anchor") return "";
  return content || escapeHtml(value.alternative_text ?? value.expression ?? "");
}

function tagsForEntity(entity, text) {
  if (entityTags[entity.type]) return entityTags[entity.type];
  if (entity.type === "text_link" && entity.url) return [`<a href="${escapeAttribute(entity.url)}">`, "</a>"];
  if (entity.type === "text_mention" && entity.user?.id) return [`<a href="tg://user?id=${entity.user.id}">`, "</a>"];
  if (entity.type === "custom_emoji" && entity.custom_emoji_id) return [`<tg-emoji emoji-id="${escapeAttribute(entity.custom_emoji_id)}">`, "</tg-emoji>"];
  const raw = text.slice(entity.offset, entity.offset + entity.length);
  if (entity.type === "url") return [`<a href="${escapeAttribute(raw)}">`, "</a>"];
  if (entity.type === "email") return [`<a href="mailto:${escapeAttribute(raw)}">`, "</a>"];
  if (entity.type === "phone_number") return [`<a href="tel:${escapeAttribute(raw)}">`, "</a>"];
  return null;
}

export function telegramEntitiesToHtml(text = "", entities = []) {
  if (!text) return "";
  const supported = entities.flatMap((entity) => {
    const tags = tagsForEntity(entity, text);
    return tags && Number.isInteger(entity.offset) && Number.isInteger(entity.length) && entity.offset >= 0 && entity.length > 0
      ? [{ ...entity, tags, end: Math.min(text.length, entity.offset + entity.length) }]
      : [];
  }).filter((entity) => entity.offset < entity.end);
  const boundaries = new Set([0, text.length]);
  for (const entity of supported) {
    boundaries.add(entity.offset);
    boundaries.add(entity.end);
  }
  const points = [...boundaries].sort((left, right) => left - right);
  let html = "";
  for (let index = 0; index < points.length - 1; index += 1) {
    const point = points[index];
    const closing = supported.filter((entity) => entity.end === point).sort((left, right) => right.offset - left.offset);
    const opening = supported.filter((entity) => entity.offset === point).sort((left, right) => right.end - left.end);
    html += closing.map((entity) => entity.tags[1]).join("");
    html += opening.map((entity) => entity.tags[0]).join("");
    html += escapeHtml(text.slice(point, points[index + 1]));
  }
  html += supported.filter((entity) => entity.end === text.length).sort((left, right) => right.offset - left.offset).map((entity) => entity.tags[1]).join("");
  return html;
}

function filePayload(value, type, overrides = {}) {
  return {
    type,
    fileId: value.file_id,
    fileUniqueId: value.file_unique_id,
    mimeType: overrides.mimeType ?? value.mime_type ?? null,
    fileName: overrides.fileName ?? value.file_name ?? null,
    width: value.width ?? null,
    height: value.height ?? null,
    duration: value.duration ?? null,
    hasSpoiler: overrides.hasSpoiler ?? false,
  };
}

function messageMedia(message) {
  if (message.photo?.length) return [filePayload(message.photo.at(-1), "photo", { mimeType: "image/jpeg", hasSpoiler: Boolean(message.has_media_spoiler) })];
  if (message.video) return [filePayload(message.video, "video", { hasSpoiler: Boolean(message.has_media_spoiler) })];
  if (message.animation) return [filePayload(message.animation, "animation", { hasSpoiler: Boolean(message.has_media_spoiler) })];
  if (message.document) return [filePayload(message.document, "document")];
  if (message.audio) return [filePayload(message.audio, "audio")];
  if (message.voice) return [filePayload(message.voice, "voice")];
  if (message.video_note) return [filePayload(message.video_note, "video_note")];
  if (message.sticker) {
    const mimeType = message.sticker.is_animated ? "application/x-tgsticker" : message.sticker.is_video ? "video/webm" : "image/webp";
    return [filePayload(message.sticker, "sticker", { mimeType })];
  }
  return [];
}

function richCaptionToHtml(caption) {
  if (!caption) return "";
  const text = richTextToHtml(caption.text);
  const credit = richTextToHtml(caption.credit);
  return text || credit ? `<figcaption>${text}${credit ? ` <cite>${credit}</cite>` : ""}</figcaption>` : "";
}

function richMessageContent(richMessage) {
  const media = [];
  const buttons = [];

  function addMedia(value, type, overrides = {}) {
    if (!value?.file_id || !value?.file_unique_id) return;
    media.push(filePayload(value, type, overrides));
  }

  function addButton(button) {
    const url = button?.url ?? button?.web_app?.url ?? button?.login_url?.url;
    const label = richTextToPlain(button?.text).trim();
    if (url && label) buttons.push({ label, url });
  }

  function blocksToHtml(blocks, depth = 0) {
    if (!Array.isArray(blocks) || depth > 20) return "";
    return blocks.map((block) => blockToHtml(block, depth + 1)).join("");
  }

  function blockToHtml(block, depth) {
    if (!block || typeof block !== "object" || depth > 20) return "";
    switch (block.type) {
      case "paragraph": return `<p>${richTextToHtml(block.text)}</p>`;
      case "heading": {
        const size = Math.min(6, Math.max(1, Number(block.size) || 2));
        return `<h${size}>${richTextToHtml(block.text)}</h${size}>`;
      }
      case "pre": return `<pre><code>${escapeHtml(richTextToPlain(block.text))}</code></pre>`;
      case "footer": return `<footer>${richTextToHtml(block.text)}</footer>`;
      case "divider": return "<hr>";
      case "mathematical_expression": return `<pre><code>${escapeHtml(block.expression ?? "")}</code></pre>`;
      case "anchor": return "";
      case "list": {
        const items = Array.isArray(block.items) ? block.items : [];
        const ordered = items.some((item) => Number.isInteger(item?.value));
        const tag = ordered ? "ol" : "ul";
        const content = items.map((item) => {
          const checkbox = item?.has_checkbox ? `<span>${item.is_checked ? "☑" : "☐"}</span> ` : "";
          const label = item?.label ? `<b>${escapeHtml(item.label)}</b> ` : "";
          return `<li>${checkbox}${label}${blocksToHtml(item?.blocks, depth + 1)}</li>`;
        }).join("");
        return `<${tag}>${content}</${tag}>`;
      }
      case "blockquote": {
        const credit = richTextToHtml(block.credit);
        return `<blockquote>${blocksToHtml(block.blocks, depth + 1)}${credit ? `<footer>${credit}</footer>` : ""}</blockquote>`;
      }
      case "expandable_blockquote": {
        const credit = richTextToHtml(block.credit);
        return `<blockquote expandable>${richTextToHtml(block.text)}${credit ? `<footer>${credit}</footer>` : ""}</blockquote>`;
      }
      case "pullquote": {
        const credit = richTextToHtml(block.credit);
        return `<blockquote>${richTextToHtml(block.text)}${credit ? `<footer>${credit}</footer>` : ""}</blockquote>`;
      }
      case "collage":
      case "slideshow": return `${blocksToHtml(block.blocks, depth + 1)}${richCaptionToHtml(block.caption)}`;
      case "table": {
        const rows = (block.cells ?? []).map((row) => `<tr>${(row ?? []).map((cell) => {
          const tag = cell?.is_header ? "th" : "td";
          return `<${tag}>${richTextToHtml(cell?.text)}</${tag}>`;
        }).join("")}</tr>`).join("");
        const caption = block.caption ? `<figcaption>${richTextToHtml(block.caption)}</figcaption>` : "";
        return `<figure><table>${rows}</table>${caption}</figure>`;
      }
      case "details": return `<details${block.is_open ? " open" : ""}><summary>${richTextToHtml(block.summary)}</summary>${blocksToHtml(block.blocks, depth + 1)}</details>`;
      case "map": {
        const latitude = Number(block.location?.latitude);
        const longitude = Number(block.location?.longitude);
        const caption = richCaptionToHtml(block.caption);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
          ? `<p><a href="https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${Math.min(19, Math.max(1, Number(block.zoom) || 14))}/${latitude}/${longitude}">Открыть место на карте</a></p>${caption}`
          : caption;
      }
      case "buttons":
        (block.buttons ?? []).forEach(addButton);
        return "";
      case "photo":
        if (block.photo?.length) addMedia(block.photo.at(-1), "photo", { mimeType: "image/jpeg", hasSpoiler: Boolean(block.has_spoiler) });
        return richCaptionToHtml(block.caption);
      case "video":
        addMedia(block.video, "video", { hasSpoiler: Boolean(block.has_spoiler) });
        return richCaptionToHtml(block.caption);
      case "animation":
        addMedia(block.animation, "animation", { hasSpoiler: Boolean(block.has_spoiler) });
        return richCaptionToHtml(block.caption);
      case "audio":
        addMedia(block.audio, "audio");
        return richCaptionToHtml(block.caption);
      case "document":
        addMedia(block.document, "document");
        return richCaptionToHtml(block.caption);
      case "voice_note":
        addMedia(block.voice_note, "voice");
        return richCaptionToHtml(block.caption);
      case "thinking": return `<p>${richTextToHtml(block.text)}</p>`;
      default:
        return richTextToHtml(block.text) || blocksToHtml(block.blocks, depth + 1);
    }
  }

  const html = blocksToHtml(richMessage?.blocks);
  return {
    html,
    media: media.filter((item, index, all) => all.findIndex((candidate) => candidate.fileUniqueId === item.fileUniqueId) === index),
    buttons: buttons.filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url && candidate.label === item.label) === index),
  };
}

function messageButtons(message) {
  return (message.reply_markup?.inline_keyboard ?? []).flatMap((row) => row.flatMap((button) => {
    const url = button.url ?? button.web_app?.url ?? button.login_url?.url;
    return url ? [{ label: button.text, url }] : [];
  }));
}

function messagePoll(message) {
  if (!message.poll) return null;
  return {
    question: message.poll.question,
    options: message.poll.options.map((option) => ({ text: option.text, voterCount: option.voter_count ?? 0 })),
    totalVoterCount: message.poll.total_voter_count ?? 0,
    isClosed: Boolean(message.poll.is_closed),
    allowsMultipleAnswers: Boolean(message.poll.allows_multiple_answers),
  };
}

export function telegramMessageToNewsPayload(message, channel, edited = false) {
  const text = message.text ?? message.caption ?? "";
  const entities = message.text ? message.entities : message.caption_entities;
  const rich = richMessageContent(message.rich_message);
  const regularButtons = messageButtons(message);
  return {
    id: String(message.message_id),
    channel,
    html: rich.html || telegramEntitiesToHtml(text, entities ?? []),
    buttons: [...rich.buttons, ...regularButtons].filter((item, index, all) => all.findIndex((candidate) => candidate.url === item.url && candidate.label === item.label) === index),
    media: rich.media.length ? rich.media : messageMedia(message),
    poll: messagePoll(message),
    mediaGroupId: message.media_group_id ?? null,
    publishedAt: new Date(message.date * 1_000).toISOString(),
    edited,
  };
}
