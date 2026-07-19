import type { FastifyReply } from "fastify";

/** Reasonable Alpha defaults — must not break JSON API clients. */
export function applySecurityHeaders(reply: FastifyReply): void {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("Referrer-Policy", "no-referrer");
  // Allow same-origin HTML review UI (inline script/style) while blocking framing.
  reply.header(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  reply.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  );
  reply.removeHeader("X-Powered-By");
  reply.removeHeader("x-powered-by");
}
