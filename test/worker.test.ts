import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { validateListingInput, type ListingRow } from "../src/data/listing";
import { app, type Bindings } from "../src/worker";

const clientId = "7c0dbe70-8c47-4fc0-aa62-52427133c612";
const validListing = {
  salonName: "Studio Chair",
  kind: "practice",
  menus: ["cut", "color"],
  area: "central",
  station: "表参道駅",
  price: 1200,
  hair: "medium",
  slots: ["2026-08-01T19:00", "2026-08-03T20:00"],
  note: "鎖骨より長い方。履歴は連絡先で確認します。",
  contactUrl: "https://www.instagram.com/studiochair/",
  confirmed: true,
};

const listingRow: ListingRow = {
  id: "abc123def456",
  status: "active",
  salon_name: "Studio Chair",
  kind: "practice",
  menus_json: '["cut","color"]',
  area: "central",
  station: "表参道駅",
  price: 1200,
  hair: "medium",
  slots_json: '["2026-08-01T19:00","2026-08-03T20:00"]',
  note: "鎖骨より長い方。",
  contact_url: "https://www.instagram.com/studiochair/",
  created_at: "2026-07-27 00:00:00",
  expires_at: "2026-08-10T00:00:00.000Z",
};

type DatabaseOptions = {
  first?: (sql: string, values: unknown[]) => unknown;
  all?: (sql: string) => unknown[];
  run?: (sql: string, values: unknown[]) => void;
};

function makeBindings(options: DatabaseOptions = {}, rateSuccess = true): Bindings {
  const prepare = vi.fn((sql: string) => {
    const values: unknown[] = [];
    return {
      bind: (...next: unknown[]) => {
        values.push(...next);
        return {
          first: () => Promise.resolve(options.first?.(sql, values) ?? null),
          run: () => {
            options.run?.(sql, values);
            return Promise.resolve({ success: true });
          },
        };
      },
      all: () => Promise.resolve({ results: options.all?.(sql) ?? [] }),
      run: () => Promise.resolve({ success: true }),
    };
  });
  return {
    ASSETS: {
      fetch: () => Promise.resolve(new Response("not used")),
    },
    DB: {
      batch: () => Promise.resolve([]),
      prepare,
    },
    WRITE_LIMITER: {
      limit: () => Promise.resolve({ success: rateSuccess }),
    },
  } as unknown as Bindings;
}

function jsonRequest(path: string, body: unknown, headers: Record<string, string> = {}): Request {
  return new Request(`https://chair-call.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Chair-Client": clientId,
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

describe("Chair Call", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders a visual Japanese recruitment board without experiment copy", async () => {
    const response = await app.request("/", undefined, makeBindings());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
    expect(html).toContain('lang="ja"');
    expect(html).toContain('class="chair-stage"');
    expect(html).toContain('id="call-grid"');
    expect(html).toContain("モデル募集ボード");
    expect(html).not.toContain('class="hero"');
    expect(html).not.toContain("30日");
    expect(html).not.toContain("MVP");
  });

  it("renders the bounded publisher workbench", async () => {
    const response = await app.request("/create", undefined, makeBindings());
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('id="call-form"');
    expect(html).toContain('id="preview-slots"');
    expect(html).toContain("住所は書かない");
    expect(html).toContain("Instagram / LINE / X");
    expect(html).not.toContain('type="file"');
  });

  it("explains safety and privacy boundaries", async () => {
    const guide = await app.request("/guide", undefined, makeBindings());
    const privacy = await app.request("/privacy", undefined, makeBindings());
    const guideHtml = await guide.text();
    const privacyHtml = await privacy.text();

    expect(guideHtml).toContain("前払い案内");
    expect(guideHtml).toContain("応募者の情報");
    expect(privacyHtml).toContain("最大14日");
    expect(privacyHtml).toContain("応募文は端末内");
    expect(privacyHtml).toContain("35日後");
  });

  it("exposes health and sitemap endpoints", async () => {
    const health = await app.request("/healthz", undefined, makeBindings());
    const sitemap = await app.request("/sitemap.xml", undefined, makeBindings());

    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true, service: "chair-call" });
    expect(await sitemap.text()).toContain("https://chair-call.yusuke8h.workers.dev/create");
  });

  it("returns a noindex branded 404", async () => {
    const response = await app.request("/missing", undefined, makeBindings());
    const html = await response.text();

    expect(response.status).toBe(404);
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain("募集ボードへ戻る");
  });

  it("accepts a strictly bounded listing", () => {
    const result = validateListingInput(validListing, new Date("2026-07-27T00:00:00Z"));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.menus).toEqual(["cut", "color"]);
      expect(result.value.contactUrl).toBe("https://www.instagram.com/studiochair/");
    }
  });

  it("rejects extra listing fields", () => {
    const result = validateListingInput(
      { ...validListing, applicantName: "not accepted" },
      new Date("2026-07-27T00:00:00Z"),
    );

    expect(result).toEqual({ ok: false, error: "invalid_fields" });
  });

  it.each([
    "http://instagram.com/studiochair",
    "https://example.com/studiochair",
    "https://instagram.com/",
    "javascript:alert(1)",
  ])("rejects an unsafe contact URL: %s", (contactUrl) => {
    const result = validateListingInput(
      { ...validListing, contactUrl },
      new Date("2026-07-27T00:00:00Z"),
    );

    expect(result).toEqual({ ok: false, error: "invalid_contact" });
  });

  it.each([
    { station: "渋谷1丁目2番3号" },
    { note: "電話 090-1234-5678" },
    { note: "mail@example.comへ連絡" },
    { note: "https://example.com も見てください" },
  ])("rejects private contact data outside the URL field", (patch) => {
    const result = validateListingInput(
      { ...validListing, ...patch },
      new Date("2026-07-27T00:00:00Z"),
    );

    expect(result).toEqual({ ok: false, error: "personal_data" });
  });

  it("rejects cross-site listing creation", async () => {
    const response = await app.fetch(
      jsonRequest("/api/listings", validListing, {
        Origin: "https://example.com",
        "Sec-Fetch-Site": "cross-site",
      }),
      makeBindings(),
    );

    expect(response.status).toBe(403);
  });

  it("rejects a malformed client identifier", async () => {
    const response = await app.fetch(
      jsonRequest("/api/listings", validListing, { "X-Chair-Client": "bad" }),
      makeBindings(),
    );

    expect(response.status).toBe(400);
  });

  it("creates a listing and returns fragment-held management material", async () => {
    const response = await app.fetch(jsonRequest("/api/listings", validListing), makeBindings());
    const body = await response.json<{
      id: string;
      manageToken: string;
      url: string;
      manageUrl: string;
    }>();

    expect(response.status).toBe(201);
    expect(body.id).toMatch(/^[a-z0-9]{12}$/);
    expect(body.manageToken).toMatch(/^[0-9a-f]{64}$/);
    expect(body.url).toBe(`https://chair-call.test/calls/${body.id}`);
    expect(body.manageUrl).toBe(
      `https://chair-call.test/manage/${body.id}#token=${body.manageToken}`,
    );
  });

  it("renders an active call from D1 without exposing management data", async () => {
    const bindings = makeBindings({
      first: (sql) => (sql.includes("FROM listings") ? listingRow : null),
    });
    const response = await app.request("/calls/abc123def456", undefined, bindings);
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("Studio Chair");
    expect(html).toContain("表参道駅");
    expect(html).toContain("応募文をコピー");
    expect(html).toContain("noopener noreferrer");
    expect(html).not.toContain("manage_hash");
  });

  it("rejects an invalid management key", async () => {
    const response = await app.fetch(
      jsonRequest("/api/listings/abc123def456/close", {}, { "X-Chair-Manage": "0".repeat(64) }),
      makeBindings(),
    );

    expect(response.status).toBe(403);
  });

  it("rejects an unknown report reason", async () => {
    const response = await app.fetch(
      jsonRequest("/api/listings/abc123def456/report", { reason: "other" }),
      makeBindings(),
    );

    expect(response.status).toBe(400);
  });

  it("rejects additional telemetry fields", async () => {
    const response = await app.fetch(
      jsonRequest("/api/events", { event: "visited", listing: "abc123def456" }),
      makeBindings(),
    );

    expect(response.status).toBe(400);
  });

  it("marks automated verification separately from product use", async () => {
    let values: unknown[] = [];
    const bindings = makeBindings({
      run: (sql, bound) => {
        if (sql.includes("INSERT INTO events")) values = bound;
      },
    });
    const response = await app.fetch(
      jsonRequest("/api/events", { event: "visited" }, { "X-Chair-QA": "1" }),
      bindings,
    );

    expect(response.status).toBe(202);
    expect(values[2]).toBe(1);
  });

  it("enforces the write limiter before listing validation", async () => {
    const response = await app.fetch(
      jsonRequest("/api/listings", validListing),
      makeBindings({}, false),
    );

    expect(response.status).toBe(429);
  });
});
