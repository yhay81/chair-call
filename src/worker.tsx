import { Hono } from "hono";
import {
  EVENT_NAMES,
  PRODUCT,
  REPORT_REASONS,
  type EventName,
  type ReportReason,
} from "./config/product";
import {
  publicListingFromRow,
  validateListingInput,
  type ListingRow,
  type PublicListing,
} from "./data/listing";
import { securityHeaders } from "./middleware/security";
import {
  CallPage,
  CreatePage,
  GuidePage,
  HomePage,
  ManagePage,
  NotFoundPage,
  PrivacyPage,
} from "./ui/pages";

type RateLimiter = {
  limit(input: { key: string }): Promise<{ success: boolean }>;
};

export type Bindings = {
  ASSETS: Fetcher;
  DB: D1Database;
  WRITE_LIMITER: RateLimiter;
};

type Variables = {
  requestId: string;
};

export const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const idPattern = /^[a-z0-9]{12}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isSameOriginWrite(request: Request): boolean {
  const origin = request.headers.get("Origin");
  const fetchSite = request.headers.get("Sec-Fetch-Site");
  return (!origin || origin === new URL(request.url).origin) && fetchSite !== "cross-site";
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength: number): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function randomId(): string {
  return randomHex(8).slice(0, 12);
}

function getClientId(request: Request): string | null {
  const clientId = request.headers.get("X-Chair-Client") ?? "";
  return uuidPattern.test(clientId) ? clientId : null;
}

async function readJson(request: Request, maximumBytes: number): Promise<unknown | null> {
  const contentType = request.headers.get("Content-Type") ?? "";
  const contentLength = Number(request.headers.get("Content-Length") ?? "0");
  if (!contentType.startsWith("application/json") || contentLength > maximumBytes) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function activeListing(env: Bindings, id: string): Promise<PublicListing | null> {
  const row = await env.DB.prepare(
    `SELECT id, status, salon_name, kind, menus_json, area, station, price, hair,
      slots_json, note, contact_url, created_at, expires_at
     FROM listings
     WHERE id = ? AND status = 'active' AND datetime(expires_at) > CURRENT_TIMESTAMP`,
  )
    .bind(id)
    .first<ListingRow>();
  return row ? publicListingFromRow(row) : null;
}

app.use("*", async (context, next) => {
  context.set("requestId", crypto.randomUUID());
  await next();
  context.header("X-Request-Id", context.get("requestId"));
});
app.use("*", securityHeaders);

app.get("/", (context) => {
  context.header("Cache-Control", "public, max-age=300");
  return context.html(<HomePage />);
});

app.get("/create", (context) => {
  context.header("Cache-Control", "public, max-age=3600");
  return context.html(<CreatePage />);
});

app.get("/calls/:id", async (context) => {
  const id = context.req.param("id");
  if (!idPattern.test(id)) return context.html(<NotFoundPage />, 404);
  const listing = await activeListing(context.env, id);
  if (!listing) {
    return context.html(<NotFoundPage message="この募集は終了したか、見つかりません。" />, 404);
  }
  context.header("Cache-Control", "public, max-age=60");
  return context.html(<CallPage listing={listing} />);
});

app.get("/manage/:id", (context) => {
  const id = context.req.param("id");
  if (!idPattern.test(id)) return context.html(<NotFoundPage />, 404);
  context.header("Cache-Control", "no-store");
  return context.html(<ManagePage id={id} />);
});

app.get("/guide", (context) => {
  context.header("Cache-Control", "public, max-age=3600");
  return context.html(<GuidePage />);
});

app.get("/privacy", (context) => {
  context.header("Cache-Control", "public, max-age=3600");
  return context.html(<PrivacyPage />);
});

app.get("/api/listings", async (context) => {
  const result = await context.env.DB.prepare(
    `SELECT id, status, salon_name, kind, menus_json, area, station, price, hair,
      slots_json, note, contact_url, created_at, expires_at
     FROM listings
     WHERE status = 'active' AND datetime(expires_at) > CURRENT_TIMESTAMP
     ORDER BY datetime(created_at) DESC
     LIMIT 50`,
  ).all<ListingRow>();
  context.header("Cache-Control", "no-store");
  return context.json({ listings: result.results.map(publicListingFromRow) });
});

app.get("/api/listings/:id", async (context) => {
  const id = context.req.param("id");
  if (!idPattern.test(id)) return context.json({ error: "not_found" }, 404);
  const listing = await activeListing(context.env, id);
  if (!listing) return context.json({ error: "not_found" }, 404);
  context.header("Cache-Control", "no-store");
  return context.json({ listing });
});

app.post("/api/listings", async (context) => {
  if (!isSameOriginWrite(context.req.raw)) return context.json({ error: "forbidden" }, 403);
  const clientId = getClientId(context.req.raw);
  if (!clientId) return context.json({ error: "invalid_client" }, 400);
  const rate = await context.env.WRITE_LIMITER.limit({ key: `create:${clientId}` });
  if (!rate.success) return context.json({ error: "rate_limited" }, 429);
  const body = await readJson(context.req.raw, 4096);
  if (body === null) return context.json({ error: "invalid_request" }, 400);
  const validation = validateListingInput(body);
  if (!validation.ok) return context.json({ error: validation.error }, 400);

  const id = randomId();
  const manageToken = randomHex(32);
  const manageHash = await sha256(manageToken);
  const expiresAt = new Date(Date.now() + PRODUCT.listingLifetimeDays * 86400_000).toISOString();
  const listing = validation.value;
  await context.env.DB.prepare(
    `INSERT INTO listings
      (id, manage_hash, salon_name, kind, menus_json, area, station, price, hair,
       slots_json, note, contact_url, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      manageHash,
      listing.salonName,
      listing.kind,
      JSON.stringify(listing.menus),
      listing.area,
      listing.station,
      listing.price,
      listing.hair,
      JSON.stringify(listing.slots),
      listing.note,
      listing.contactUrl,
      expiresAt,
    )
    .run();

  const userHash = await sha256(clientId);
  await context.env.DB.prepare(
    "INSERT INTO events (user_hash, event_name, is_qa) VALUES (?, 'listing_created', ?)",
  )
    .bind(userHash, context.req.header("X-Chair-QA") === "1" ? 1 : 0)
    .run();

  const requestOrigin = new URL(context.req.url).origin;
  const url = `${requestOrigin}/calls/${id}`;
  const manageUrl = `${requestOrigin}/manage/${id}#token=${manageToken}`;
  context.header("Location", url);
  return context.json({ id, manageToken, url, manageUrl }, 201);
});

app.post("/api/listings/:id/close", async (context) => {
  if (!isSameOriginWrite(context.req.raw)) return context.json({ error: "forbidden" }, 403);
  const id = context.req.param("id");
  const token = context.req.header("X-Chair-Manage") ?? "";
  if (!idPattern.test(id) || !/^[0-9a-f]{64}$/.test(token)) {
    return context.json({ error: "invalid_management_key" }, 400);
  }
  const row = await context.env.DB.prepare("SELECT manage_hash FROM listings WHERE id = ?")
    .bind(id)
    .first<{ manage_hash: string }>();
  if (!row || (await sha256(token)) !== row.manage_hash) {
    return context.json({ error: "invalid_management_key" }, 403);
  }
  await context.env.DB.prepare(
    "UPDATE listings SET status = 'closed', closed_at = CURRENT_TIMESTAMP WHERE id = ?",
  )
    .bind(id)
    .run();
  return context.body(null, 204);
});

app.post("/api/listings/:id/report", async (context) => {
  if (!isSameOriginWrite(context.req.raw)) return context.json({ error: "forbidden" }, 403);
  const id = context.req.param("id");
  const clientId = getClientId(context.req.raw);
  if (!idPattern.test(id) || !clientId) return context.json({ error: "invalid_request" }, 400);
  const rate = await context.env.WRITE_LIMITER.limit({ key: `report:${clientId}` });
  if (!rate.success) return context.json({ error: "rate_limited" }, 429);
  const body = await readJson(context.req.raw, 256);
  const reason =
    body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 1
      ? (body as { reason?: unknown }).reason
      : null;
  if (typeof reason !== "string" || !REPORT_REASONS.includes(reason as ReportReason)) {
    return context.json({ error: "invalid_reason" }, 400);
  }
  const reporterHash = await sha256(clientId);
  await context.env.DB.prepare(
    `INSERT OR IGNORE INTO listing_reports (listing_id, reporter_hash, reason)
     SELECT id, ?, ? FROM listings WHERE id = ? AND status = 'active'`,
  )
    .bind(reporterHash, reason, id)
    .run();
  const count = await context.env.DB.prepare(
    "SELECT COUNT(*) AS reports FROM listing_reports WHERE listing_id = ?",
  )
    .bind(id)
    .first<{ reports: number }>();
  if (Number(count?.reports ?? 0) >= 3) {
    await context.env.DB.prepare("UPDATE listings SET status = 'hidden' WHERE id = ?")
      .bind(id)
      .run();
  }
  return context.body(null, 202);
});

app.post("/api/events", async (context) => {
  if (!isSameOriginWrite(context.req.raw)) return context.json({ error: "forbidden" }, 403);
  const clientId = getClientId(context.req.raw);
  if (!clientId) return context.json({ error: "invalid_client" }, 400);
  const rate = await context.env.WRITE_LIMITER.limit({ key: `event:${clientId}` });
  if (!rate.success) return context.json({ error: "rate_limited" }, 429);
  const body = await readJson(context.req.raw, 256);
  const event =
    body && typeof body === "object" && !Array.isArray(body) && Object.keys(body).length === 1
      ? (body as { event?: unknown }).event
      : null;
  if (typeof event !== "string" || !EVENT_NAMES.includes(event as EventName)) {
    return context.json({ error: "invalid_event" }, 400);
  }
  const userHash = await sha256(clientId);
  await context.env.DB.prepare("INSERT INTO events (user_hash, event_name, is_qa) VALUES (?, ?, ?)")
    .bind(userHash, event, context.req.header("X-Chair-QA") === "1" ? 1 : 0)
    .run();
  return context.body(null, 202);
});

app.get("/healthz", (context) =>
  context.json({
    ok: true,
    service: "chair-call",
    listingLifetimeDays: PRODUCT.listingLifetimeDays,
  }),
);

app.get("/sitemap.xml", (context) => {
  context.header("Content-Type", "application/xml; charset=utf-8");
  context.header("Cache-Control", "public, max-age=86400");
  return context.body(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${PRODUCT.origin}/</loc></url>
  <url><loc>${PRODUCT.origin}/create</loc></url>
  <url><loc>${PRODUCT.origin}/guide</loc></url>
  <url><loc>${PRODUCT.origin}/privacy</loc></url>
</urlset>`);
});

app.notFound((context) => context.html(<NotFoundPage />, 404));

async function scheduled(_controller: ScheduledController, env: Bindings) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM events WHERE occurred_at < datetime('now', '-35 days')"),
    env.DB.prepare("DELETE FROM listings WHERE datetime(expires_at) < datetime('now', '-30 days')"),
  ]);
}

export default {
  fetch: (request: Request, env: Bindings, executionContext: ExecutionContext) =>
    app.fetch(request, env, executionContext),
  scheduled,
};
