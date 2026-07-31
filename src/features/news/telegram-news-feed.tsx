"use client";

import { useCallback, useEffect, useState } from "react";
import { TELEGRAM_NEWS_CHANNEL, TELEGRAM_NEWS_URL } from "@/src/config/links";
import { TelegramPostEmbed } from "./telegram-post-embed";

interface TelegramPost { id: string; url: string }
interface TelegramNewsPayload { channel: string; posts: TelegramPost[] }
interface TelegramNewsFeedProps { limit?: number; compact?: boolean }

const REFRESH_INTERVAL_MS = 180_000;

export function TelegramNewsFeed({ limit = 8, compact = false }: TelegramNewsFeedProps) {
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/news?limit=${limit}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("News feed is unavailable");
      const payload = (await response.json()) as TelegramNewsPayload;
      if (!Array.isArray(payload.posts)) throw new Error("Invalid news response");
      setPosts(payload.posts);
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(true), REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  if (loading && posts.length === 0) {
    return <div className={`telegram-feed-grid${compact ? " telegram-feed-compact" : ""}`} aria-label="Загрузка новостей">{Array.from({ length: compact ? 2 : 4 }, (_, index) => <div className="telegram-post-skeleton" key={index} aria-hidden="true" />)}</div>;
  }

  if (unavailable && posts.length === 0) {
    return <div className="news-unavailable"><div className="news-unavailable-icon" aria-hidden="true">↗</div><h2>Новости доступны в Telegram</h2><p>Telegram временно не передал ленту сайту. Все публикации остаются доступны в официальном канале.</p><a className="button button-primary" href={TELEGRAM_NEWS_URL} target="_blank" rel="noreferrer">Открыть канал</a></div>;
  }

  return (
    <>
      <div className={`telegram-feed-grid${compact ? " telegram-feed-compact" : ""}`}>
        {posts.map((post) => <TelegramPostEmbed channel={TELEGRAM_NEWS_CHANNEL} postId={post.id} postUrl={post.url} key={post.id} />)}
      </div>
      {unavailable && <p className="telegram-feed-note">Показываем последние загруженные новости. Обновление ленты временно задерживается.</p>}
    </>
  );
}
