import * as Sentry from "@sentry/cloudflare";
import app, { type Env } from "./app";

const security = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://static.cloudflareinsights.com https://*.sentry.io",
    "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.com https://*.sentry.io https://cloudflareinsights.com",
    "img-src 'self' data: blob: https://img.clerk.com https://*.clerk.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "frame-src https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  "X-Frame-Options": "DENY",
};

const handler = {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    const response = url.pathname.startsWith("/api/")
      ? await app.fetch(request, env, ctx)
      : await env.ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(security)) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
} satisfies ExportedHandler<Env>;

export default Sentry.withSentry<Env>((env) => ({ dsn: env.SENTRY_DSN }), handler);
