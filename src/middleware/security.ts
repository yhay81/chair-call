import type { MiddlewareHandler } from "hono";

const csp = [
  "default-src 'none'",
  "base-uri 'self'",
  "connect-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "img-src 'self' data:",
  "manifest-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
].join("; ");

export const securityHeaders: MiddlewareHandler = async (context, next) => {
  await next();
  context.header("Content-Security-Policy", csp);
  context.header("Cross-Origin-Opener-Policy", "same-origin");
  context.header("Cross-Origin-Resource-Policy", "same-origin");
  context.header("Permissions-Policy", "camera=(), geolocation=(), microphone=(), payment=()");
  context.header("Referrer-Policy", "strict-origin-when-cross-origin");
  context.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  context.header("X-Content-Type-Options", "nosniff");
  context.header("X-Frame-Options", "DENY");
};
