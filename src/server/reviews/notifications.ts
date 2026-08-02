type SubmittedReview = {
  id: string;
  displayName: string;
  rating: number;
  text: string;
};

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function notifyReviewSubmission(review: SubmittedReview, moderationUrl: string) {
  const token = process.env.STATUS_ALERT_TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.STATUS_ALERT_TELEGRAM_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  const text = [
    "📝 <b>Новый отзыв на ST VILLAGE</b>",
    `<b>Автор:</b> ${escapeHtml(review.displayName)}`,
    `<b>Оценка:</b> ${"⭐".repeat(review.rating)}`,
    `<b>Текст:</b> ${escapeHtml(review.text)}`,
    `<code>${escapeHtml(review.id)}</code>`,
  ].join("\n\n");

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть модерацию", url: moderationUrl }]],
        },
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
