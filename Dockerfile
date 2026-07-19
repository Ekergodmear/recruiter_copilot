# TECH / Deploy — Founder Alpha production image
# Foundation Freeze intact — no business logic in this file.
# Build-time overlay: Prisma provider → postgresql (repo stays sqlite for local/tests).

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
COPY feature-flags ./feature-flags
COPY telemetry ./telemetry
COPY contracts ./contracts
COPY evaluation ./evaluation
# Production image targets Postgres (compose). Does not modify host checkout.
RUN sed -i 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma \
  && pnpm exec prisma generate \
  && pnpm run build \
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
COPY scripts/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh \
  && PRISMA_CLI="$(find /app/node_modules/.pnpm -path '*/prisma@*/node_modules/prisma/build/index.js' | head -n1)" \
  && test -n "$PRISMA_CLI" \
  && ln -sf "$PRISMA_CLI" /app/prisma-cli.js \
  && chown -R node:node /app

EXPOSE 3000
USER node
ENTRYPOINT ["/entrypoint.sh"]
