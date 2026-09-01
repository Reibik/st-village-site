import { TELEGRAM_BOT_URL } from "@/src/config/links";

const DEFAULT_COUPONS = [
  "https://t.me/st_village_vpn_bot?start=coupon_13b4fcb03b8b92269cdca1cee7d95640",
  "https://t.me/st_village_vpn_bot?start=coupon_56959415404f853b29c96fa48dc62b1b",
  "https://t.me/st_village_vpn_bot?start=coupon_7df7bd12928a4afa39f304505f05a762",
  "https://t.me/st_village_vpn_bot?start=coupon_6ea30787bc7f2beb9bca401d9800e7e5",
  "https://t.me/st_village_vpn_bot?start=coupon_51f1d1037c3dc370db9bc0747bcb6f03",
] as const;

const DEFAULT_CAMPAIGN_START = "2026-09-01T09:00:00.000Z";
const DEFAULT_ACTIVE_HOURS = 24;
const DEFAULT_INTERVAL_HOURS = 48;

export type CouponDropStatus = "active" | "upcoming" | "ended";

export type CouponDropSnapshot = {
  status: CouponDropStatus;
  dropNumber: number;
  totalDrops: number;
  completedDrops: number;
  campaignStartsAt: string;
  startsAt: string | null;
  endsAt: string | null;
  nextAt: string | null;
  couponUrl: string | null;
  botUrl: string;
  refreshAfterSeconds: number;
};

function positiveHours(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function campaignCoupons() {
  const configured = process.env.COUPON_URLS
    ?.split(/[\n,;]+/)
    .map((value) => value.trim())
    .filter((value) => /^https:\/\/t\.me\/st_village_vpn_bot\?start=coupon_[a-z0-9]+$/i.test(value));

  return configured?.length ? configured : [...DEFAULT_COUPONS];
}

function iso(timestamp: number) {
  return new Date(timestamp).toISOString();
}

export function getCouponDropSnapshot(now = new Date()): CouponDropSnapshot {
  const coupons = campaignCoupons();
  const configuredStart = Date.parse(process.env.COUPON_CAMPAIGN_START || DEFAULT_CAMPAIGN_START);
  const campaignStart = Number.isFinite(configuredStart) ? configuredStart : Date.parse(DEFAULT_CAMPAIGN_START);
  const activeMs = positiveHours(process.env.COUPON_DROP_ACTIVE_HOURS, DEFAULT_ACTIVE_HOURS) * 60 * 60 * 1000;
  const intervalMs = Math.max(activeMs, positiveHours(process.env.COUPON_DROP_INTERVAL_HOURS, DEFAULT_INTERVAL_HOURS) * 60 * 60 * 1000);
  const nowMs = now.getTime();
  const totalDrops = coupons.length;

  if (nowMs < campaignStart) {
    return {
      status: "upcoming",
      dropNumber: 1,
      totalDrops,
      completedDrops: 0,
      campaignStartsAt: iso(campaignStart),
      startsAt: null,
      endsAt: null,
      nextAt: iso(campaignStart),
      couponUrl: null,
      botUrl: TELEGRAM_BOT_URL,
      refreshAfterSeconds: 60,
    };
  }

  const cycleIndex = Math.floor((nowMs - campaignStart) / intervalMs);
  if (cycleIndex >= totalDrops) {
    return {
      status: "ended",
      dropNumber: totalDrops,
      totalDrops,
      completedDrops: totalDrops,
      campaignStartsAt: iso(campaignStart),
      startsAt: null,
      endsAt: null,
      nextAt: null,
      couponUrl: null,
      botUrl: TELEGRAM_BOT_URL,
      refreshAfterSeconds: 300,
    };
  }

  const startsAt = campaignStart + cycleIndex * intervalMs;
  const endsAt = startsAt + activeMs;
  if (nowMs < endsAt) {
    return {
      status: "active",
      dropNumber: cycleIndex + 1,
      totalDrops,
      completedDrops: cycleIndex,
      campaignStartsAt: iso(campaignStart),
      startsAt: iso(startsAt),
      endsAt: iso(endsAt),
      nextAt: cycleIndex + 1 < totalDrops ? iso(campaignStart + (cycleIndex + 1) * intervalMs) : null,
      couponUrl: coupons[cycleIndex],
      botUrl: TELEGRAM_BOT_URL,
      refreshAfterSeconds: 60,
    };
  }

  const nextIndex = cycleIndex + 1;
  return {
    status: nextIndex < totalDrops ? "upcoming" : "ended",
    dropNumber: Math.min(nextIndex + 1, totalDrops),
    totalDrops,
    completedDrops: nextIndex,
    campaignStartsAt: iso(campaignStart),
    startsAt: null,
    endsAt: null,
    nextAt: nextIndex < totalDrops ? iso(campaignStart + nextIndex * intervalMs) : null,
    couponUrl: null,
    botUrl: TELEGRAM_BOT_URL,
    refreshAfterSeconds: nextIndex < totalDrops ? 60 : 300,
  };
}
