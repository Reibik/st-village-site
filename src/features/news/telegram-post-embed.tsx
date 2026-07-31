"use client";

import { useEffect, useRef, useState } from "react";

interface TelegramPostEmbedProps {
  channel: string;
  postId: string;
  postUrl: string;
}

function getDarkTheme() {
  return typeof document !== "undefined" && document.documentElement.dataset.theme === "dark";
}

export function TelegramPostEmbed({ channel, postId, postUrl }: TelegramPostEmbedProps) {
  const embedRoot = useRef<HTMLDivElement>(null);
  const [dark, setDark] = useState(getDarkTheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setDark(getDarkTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = embedRoot.current;
    if (!root) return;
    root.replaceChildren();
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.dataset.telegramPost = `${channel}/${postId}`;
    script.dataset.width = "100%";
    script.dataset.userpic = "false";
    script.dataset.color = "38BDF8";
    script.dataset.darkColor = "38BDF8";
    if (dark) script.dataset.dark = "1";
    root.appendChild(script);
    return () => root.replaceChildren();
  }, [channel, dark, postId]);

  return (
    <article className="telegram-post-card">
      <div className="telegram-post-accent" aria-hidden="true" />
      <div className="telegram-embed" ref={embedRoot} aria-label={`Публикация Telegram №${postId}`} />
      <a className="telegram-post-fallback" href={postUrl} target="_blank" rel="noreferrer">
        Открыть публикацию в Telegram <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
