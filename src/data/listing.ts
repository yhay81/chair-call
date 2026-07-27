import {
  AREAS,
  HAIR_LENGTHS,
  KINDS,
  MENUS,
  type AreaId,
  type HairId,
  type KindId,
  type MenuId,
} from "../config/product";

export type ListingInput = {
  salonName: string;
  kind: KindId;
  menus: MenuId[];
  area: AreaId;
  station: string;
  price: number;
  hair: HairId;
  slots: string[];
  note: string;
  contactUrl: string;
  confirmed: true;
};

export type PublicListing = Omit<ListingInput, "confirmed"> & {
  id: string;
  status: "active" | "closed" | "hidden";
  createdAt: string;
  expiresAt: string;
};

export type ListingRow = {
  id: string;
  status: "active" | "closed" | "hidden";
  salon_name: string;
  kind: KindId;
  menus_json: string;
  area: AreaId;
  station: string;
  price: number;
  hair: HairId;
  slots_json: string;
  note: string;
  contact_url: string;
  created_at: string;
  expires_at: string;
};

type ValidationResult = { ok: true; value: ListingInput } | { ok: false; error: string };

const areaIds = new Set(AREAS.map((area) => area.id));
const kindIds = new Set(KINDS.map((kind) => kind.id));
const menuIds = new Set(MENUS.map((menu) => menu.id));
const hairIds = new Set(HAIR_LENGTHS.map((hair) => hair.id));
const expectedKeys = [
  "salonName",
  "kind",
  "menus",
  "area",
  "station",
  "price",
  "hair",
  "slots",
  "note",
  "contactUrl",
  "confirmed",
].sort();
const contactHosts = new Set([
  "instagram.com",
  "www.instagram.com",
  "line.me",
  "lin.ee",
  "x.com",
  "www.x.com",
  "twitter.com",
  "www.twitter.com",
]);

function compactText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const compact = value.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!compact || compact.length > maxLength || /[<>]/.test(compact)) return null;
  return compact;
}

function containsPrivateData(value: string): boolean {
  return (
    /https?:\/\/|www\./i.test(value) ||
    /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(value) ||
    /〒?\d{3}-?\d{4}/.test(value) ||
    /0\d{1,4}[-ー―\s]?\d{1,4}[-ー―\s]?\d{3,4}/.test(value) ||
    /\d+\s*(?:丁目|番地|番|号)/.test(value)
  );
}

function validContactUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 240) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !contactHosts.has(url.hostname.toLowerCase()) ||
      url.username ||
      url.password ||
      url.pathname === "/"
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function validSlot(value: unknown, now: Date): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const time = Date.parse(`${value}:00+09:00`);
  return (
    Number.isFinite(time) &&
    time >= now.getTime() - 60 * 60 * 1000 &&
    time <= now.getTime() + 14 * 24 * 60 * 60 * 1000
  );
}

export function validateListingInput(value: unknown, now = new Date()): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_listing" };
  }
  const input = value as Record<string, unknown>;
  if (JSON.stringify(Object.keys(input).sort()) !== JSON.stringify(expectedKeys)) {
    return { ok: false, error: "invalid_fields" };
  }

  const salonName = compactText(input.salonName, 40);
  const station = compactText(input.station, 40);
  const note =
    typeof input.note === "string"
      ? input.note.normalize("NFKC").replace(/\s+/g, " ").trim()
      : null;
  const contactUrl = validContactUrl(input.contactUrl);

  if (!salonName || !station || note === null || note.length > 160 || /[<>]/.test(note)) {
    return { ok: false, error: "invalid_text" };
  }
  if (containsPrivateData(salonName) || containsPrivateData(station) || containsPrivateData(note)) {
    return { ok: false, error: "personal_data" };
  }
  if (!contactUrl) return { ok: false, error: "invalid_contact" };
  if (typeof input.kind !== "string" || !kindIds.has(input.kind as KindId)) {
    return { ok: false, error: "invalid_kind" };
  }
  if (typeof input.area !== "string" || !areaIds.has(input.area as AreaId)) {
    return { ok: false, error: "invalid_area" };
  }
  if (typeof input.hair !== "string" || !hairIds.has(input.hair as HairId)) {
    return { ok: false, error: "invalid_hair" };
  }
  if (
    !Array.isArray(input.menus) ||
    input.menus.length < 1 ||
    input.menus.length > 3 ||
    new Set(input.menus).size !== input.menus.length ||
    !input.menus.every((menu) => typeof menu === "string" && menuIds.has(menu as MenuId))
  ) {
    return { ok: false, error: "invalid_menus" };
  }
  if (
    !Array.isArray(input.slots) ||
    input.slots.length < 1 ||
    input.slots.length > 5 ||
    new Set(input.slots).size !== input.slots.length ||
    !input.slots.every((slot) => validSlot(slot, now))
  ) {
    return { ok: false, error: "invalid_slots" };
  }
  if (!Number.isInteger(input.price) || Number(input.price) < 0 || Number(input.price) > 8000) {
    return { ok: false, error: "invalid_price" };
  }
  if (input.confirmed !== true) return { ok: false, error: "confirmation_required" };

  return {
    ok: true,
    value: {
      salonName,
      kind: input.kind as KindId,
      menus: input.menus as MenuId[],
      area: input.area as AreaId,
      station,
      price: Number(input.price),
      hair: input.hair as HairId,
      slots: [...(input.slots as string[])].sort(),
      note,
      contactUrl,
      confirmed: true,
    },
  };
}

export function publicListingFromRow(row: ListingRow): PublicListing {
  return {
    id: row.id,
    status: row.status,
    salonName: row.salon_name,
    kind: row.kind,
    menus: JSON.parse(row.menus_json) as MenuId[],
    area: row.area,
    station: row.station,
    price: row.price,
    hair: row.hair,
    slots: JSON.parse(row.slots_json) as string[],
    note: row.note,
    contactUrl: row.contact_url,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  };
}

export function isAllowedContactUrl(value: string): boolean {
  return validContactUrl(value) !== null;
}
