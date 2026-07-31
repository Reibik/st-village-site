"use client";

/* Telegram media has dynamic signed URLs and dimensions, so it is intentionally
   served directly from Telegram's allowlisted image CDN without the optimizer. */
/* eslint-disable @next/next/no-img-element */

interface TelegramPost {
  id: string;
  url: string;
  html: string;
  images: Array<{ url: string; alt: string }>;
  publishedAt: string | null;
  views: string | null;
  buttons: Array<{ label: string; url: string }>;
}

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Moscow" }).format(date);
}

export function TelegramPostCard({ post }: { post: TelegramPost }) {
  return (
    <article className="telegram-post-card">
      <div className="telegram-post-accent" aria-hidden="true" />
      <header className="telegram-post-header">
        <span className="telegram-post-logo" aria-hidden="true">ST</span>
        <div><strong>ST VILLAGE</strong><small>{formatDate(post.publishedAt)}</small></div>
        <span className="telegram-paper-plane" aria-hidden="true">↗</span>
      </header>
      {post.images.length > 0 && (
        <div className={`telegram-media telegram-media-${Math.min(post.images.length, 4)}`}>
          {post.images.map((image) => <a href={post.url} target="_blank" rel="noreferrer" key={image.url}><img src={image.url} alt={image.alt} loading="lazy" /></a>)}
        </div>
      )}
      {post.html && <div className="telegram-message" dangerouslySetInnerHTML={{ __html: post.html }} />}
      {post.buttons.length > 0 && <div className="telegram-inline-buttons">{post.buttons.map((button) => <a href={button.url} target="_blank" rel="noreferrer" key={`${button.url}-${button.label}`}>{button.label}</a>)}</div>}
      <footer className="telegram-post-footer">
        <span>{post.views ? `${post.views} просмотров` : "Telegram"}</span>
        <a href={post.url} target="_blank" rel="noreferrer">Открыть публикацию <span aria-hidden="true">↗</span></a>
      </footer>
    </article>
  );
}
