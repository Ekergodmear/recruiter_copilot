# Production image — PostgreSQL via Prisma (schema provider = postgresql).

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml tsconfig.json tsconfig.build.json ./
COPY prisma ./prisma
COPY src ./src
COPY web ./web
COPY feature-flags ./feature-flags
COPY telemetry ./telemetry
COPY contracts ./contracts
COPY evaluation ./evaluation
# prisma seed needs tsx in image for optional RUN_DB_SEED
ENV DATABASE_URL="postgresql://recruiter:recruiter@localhost:5432/recruiter_copilot?schema=public"
RUN pnpm exec prisma generate \
  && pnpm run build \
  && pnpm run build:web \
  && pnpm prune --prod


FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends wget \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /app/data/resumes /app/data/telemetry

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/feature-flags ./feature-flags
COPY --from=build /app/telemetry ./telemetry
COPY --from=build /app/contracts ./contracts
COPY prisma/seed.mjs ./prisma/seed.mjs
COPY scripts/docker-entrypoint.sh /entrypoint.sh
ENV WEB_STATIC_DIR=/app/dist/web
RUN chmod +x /entrypoint.sh \
  && PRISMA_CLI="$(find /app/node_modules/.pnpm -path '*/prisma@*/node_modules/prisma/build/index.js' | head -n1)" \
  && test -n "$PRISMA_CLI" \
  && ln -sf "$PRISMA_CLI" /app/prisma-cli.js \
  && test -f /app/dist/web/index.html \
  && chown -R node:node /app

EXPOSE 3000
USER node
ENTRYPOINT ["/entrypoint.sh"]
