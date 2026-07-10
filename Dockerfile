FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY feature-flags ./feature-flags
COPY telemetry ./telemetry
COPY contracts ./contracts
COPY evaluation ./evaluation
RUN mkdir -p /app/data/resumes
EXPOSE 3000
CMD ["node", "dist/app/server.js"]
