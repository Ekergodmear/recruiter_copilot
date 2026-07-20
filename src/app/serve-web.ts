import { existsSync } from "node:fs";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";

/**
 * Serve the Vite-built recruiter SPA from dist/web when present.
 * API routes keep JSON 404; browser navigations fall back to index.html.
 */
export async function registerWebSpa(
  app: FastifyInstance,
  rootDir = process.env.WEB_STATIC_DIR?.trim() || join(process.cwd(), "dist", "web"),
): Promise<boolean> {
  const indexHtml = join(rootDir, "index.html");
  if (!existsSync(indexHtml)) {
    return false;
  }

  await app.register(fastifyStatic, {
    root: rootDir,
    wildcard: false,
    index: ["index.html"],
  });

  app.setNotFoundHandler((request, reply) => {
    const pathOnly = request.url.split("?")[0] ?? request.url;
    if (isApiOrInternalPath(pathOnly) || (request.method !== "GET" && request.method !== "HEAD")) {
      return reply.status(404).send({
        message: `Route ${request.method}:${pathOnly} not found`,
        error: "Not Found",
        statusCode: 404,
      });
    }
    return reply.type("text/html").sendFile("index.html");
  });

  return true;
}

function isApiOrInternalPath(path: string): boolean {
  return (
    path === "/health" ||
    path.startsWith("/health/") ||
    path.startsWith("/api/") ||
    path.startsWith("/internal/")
  );
}
