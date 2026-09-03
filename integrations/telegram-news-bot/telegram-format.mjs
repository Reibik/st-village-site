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
  return {
    id: String(message.message_id),
    channel,
    html: telegramEntitiesToHtml(text, entities ?? []),
    buttons: messageButtons(message),
    media: messageMedia(message),
    poll: messagePoll(message),
    mediaGroupId: message.media_group_id ?? null,
    publishedAt: new Date(message.date * 1_000).toISOString(),
    edited,
  };
}
