import type { TelegramPost } from "@/src/server/telegram/types";

export function mergePosts(first: TelegramPost[], second: TelegramPost[], limit?: number) {
  // The first collection is freshest. Older cached copies must not undo edits.
  const merged = [...new Map([...second, ...first].map((post) => [post.id, post])).values()]
    .sort((left, right) => Number(right.id) - Number(left.id));
  return limit === undefined ? merged : merged.slice(0, limit);
}
