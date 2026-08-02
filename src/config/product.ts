export const PRODUCT = {
  dataRetentionDays: 35,
  description: "練習モデル募集を、条件と候補日時が見える一枚のカードに。",
  listingLifetimeDays: 14,
  name: "Chair Call",
  origin: "https://chair-call.yhay81.com",
  repository: "https://github.com/yhay81/chair-call",
} as const;

export const AREAS = [
  { id: "central", label: "都心" },
  { id: "east", label: "東側" },
  { id: "west", label: "西側" },
  { id: "north", label: "北側" },
] as const;

export const KINDS = [
  { id: "practice", label: "練習モデル" },
  { id: "shoot", label: "撮影モデル" },
] as const;

export const MENUS = [
  { id: "cut", label: "カット" },
  { id: "color", label: "カラー" },
  { id: "perm", label: "パーマ" },
  { id: "straight", label: "縮毛矯正" },
  { id: "treatment", label: "トリートメント" },
] as const;

export const HAIR_LENGTHS = [
  { id: "any", label: "指定なし" },
  { id: "short", label: "ショート" },
  { id: "medium", label: "ミディアム" },
  { id: "long", label: "ロング" },
] as const;

export const EVENT_NAMES = [
  "visited",
  "listing_created",
  "message_copied",
  "contact_opened",
  "returned",
] as const;

export const REPORT_REASONS = ["unsafe_link", "inaccurate", "expired", "personal_data"] as const;

export type AreaId = (typeof AREAS)[number]["id"];
export type KindId = (typeof KINDS)[number]["id"];
export type MenuId = (typeof MENUS)[number]["id"];
export type HairId = (typeof HAIR_LENGTHS)[number]["id"];
export type EventName = (typeof EVENT_NAMES)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
