"use client";

import { useCallback, useEffect, useState } from "react";
import { TELEGRAM_NEWS_URL } from "@/src/config/links";
import type { TelegramPost } from "@/src/server/telegram/types";
import { TelegramPostCard } from "./telegram-post-card";
interface TelegramNewsPayload { channel: string; posts: TelegramPost[]; nextBefore: string | null; hasMore: boolean }
interface TelegramNewsFeedProps { limit?: number; compact?: boolean }

const REFRESH_INTERVAL_MS = 180_000;

function mergePosts(first: TelegramPost[], second: TelegramPost[]) {
  return [...new Map([...first, ...second].map((post) => [post.id, post])).values()]
    .sort((left, right) => Number(right.id) - Number(left.id));
}

export function TelegramNewsFeed({ limit = 8, compact = false }: TelegramNewsFeedProps) {
  const [posts, setPosts] = useState<TelegramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState(false);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch(`/api/news?limit=${limit}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("News feed is unavailable");
      const payload = (await response.json()) as TelegramNewsPayload;
      if (!Array.isArray(payload.posts)) throw new Error("Invalid news response");
      setPosts((current) => quiet ? mergePosts(payload.posts, current) : payload.posts);
      if (!quiet) {
        setNextBefore(payload.nextBefore);
        setHasMore(payload.hasMore);
      }
      setUnavailable(false);
    } catch {
      setUnavailable(true);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const loadMore = useCallback(async () => {
    if (!nextBefore || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError(false);
    try {
      const response = await fetch(`/api/news?limit=${limit}&before=${encodeURIComponent(nextBefore)}`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("Older news is unavailable");
      const payload = (await response.json()) as TelegramNewsPayload;
      if (!Array.isArray(payload.posts)) throw new Error("Invalid news response");
      setPosts((current) => mergePosts(current, payload.posts));
      setNextBefore(payload.nextBefore);
      setHasMore(payload.hasMore && payload.posts.length > 0);
    } catch {
      setLoadMoreError(true);
    } finally {
      setLoadingMore(false);
    }
  }, [limit, loadingMore, nextBefore]);

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
        {posts.map((post) => <TelegramPostCard post={post} key={post.id} />)}
      </div>
      {!compact && hasMore && <div className="telegram-feed-more">
        <button className="button button-secondary" type="button" onClick={() => void loadMore()} disabled={loadingMore} aria-busy={loadingMore}>
          {loadingMore ? "Загружаем публикации…" : "Показать ещё новости"}
        </button>
        <small>Сейчас показано: {posts.length}</small>
      </div>}
      {!compact && !hasMore && posts.length > 0 && <p className="telegram-feed-complete">Вы просмотрели все доступные публикации канала.</p>}
      {loadMoreError && <p className="telegram-feed-note">Не удалось загрузить предыдущие публикации. Попробуйте ещё раз.</p>}
      {unavailable && <p className="telegram-feed-note">Показываем последние загруженные новости. Обновление ленты временно задерживается.</p>}
    </>
  );
}
