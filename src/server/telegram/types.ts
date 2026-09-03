export type TelegramNewsButton = { label: string; url: string };

export type TelegramNewsMediaType =
  | "photo"
  | "video"
  | "animation"
  | "document"
  | "audio"
  | "voice"
  | "video_note"
  | "sticker";

export type StoredTelegramNewsMedia = {
  id: string;
  type: TelegramNewsMediaType;
  fileId: string;
  fileUniqueId: string;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  hasSpoiler: boolean;
};

export type TelegramNewsPoll = {
  question: string;
  options: Array<{ text: string; voterCount: number }>;
  totalVoterCount: number;
  isClosed: boolean;
  allowsMultipleAnswers: boolean;
};

export type StoredTelegramNewsPost = {
  id: string;
  channel: string;
  url: string;
  html: string;
  buttons: TelegramNewsButton[];
  media: StoredTelegramNewsMedia[];
  poll: TelegramNewsPoll | null;
  mediaGroupId: string | null;
  publishedAt: string;
  updatedAt: string;
};

export type TelegramNewsAttachment = {
  id: string;
  type: TelegramNewsMediaType;
  url: string;
  mimeType: string | null;
  fileName: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  hasSpoiler: boolean;
};

export interface TelegramPost {
  id: string;
  url: string;
  html: string;
  images: Array<{ url: string; alt: string }>;
  attachments: TelegramNewsAttachment[];
  poll: TelegramNewsPoll | null;
  publishedAt: string | null;
  views: string | null;
  buttons: TelegramNewsButton[];
  unsupported: boolean;
  source: "bot" | "public";
}
