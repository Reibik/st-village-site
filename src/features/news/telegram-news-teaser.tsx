"use client";

import type { TelegramPost } from "@/src/server/telegram/types";
import { newsExcerpt, newsPreviewImage } from "./news-excerpt";

/* eslint-disable @next/next/no-img-element */
export function TelegramNewsTeaser({ post }: { post: TelegramPost }) {
  const excerpt = newsExcerpt(post.html);
  const image = newsPreviewImage(post);
  const date = post.publishedAt && !Number.isNaN(Date.parse(post.publishedAt))
    ? new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" }).format(new Date(post.publishedAt)) : "Из Telegram";
  return <article className="news-teaser">
    <a className="news-teaser-image" href={`/news#post-${encodeURIComponent(post.id)}`} tabIndex={-1} aria-hidden="true">
      {image ? <img src={image.url} alt="" loading="lazy" /> : <span className="news-teaser-monogram">ST<span>VILLAGE / JOURNAL</span></span>}
      <span className="news-teaser-tag">Новости сервиса</span>
    </a>
    <div className="news-teaser-copy">
      <small>{date}</small>
      <h3>{post.html ? excerpt.title : post.poll?.question ?? (post.attachments.length ? "Новая публикация с вложением" : "Новость ST VILLAGE")}</h3>
      {excerpt.text && <p>{excerpt.text}</p>}
      <a className="text-link" href={`/news#post-${encodeURIComponent(post.id)}`}>Читать новость <span aria-hidden="true">→</span></a>
    </div>
  </article>;
}
