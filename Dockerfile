# Multi-stage Dockerfile for Greenroom (Next.js + Prisma)

# -----------------------------------------------------------------------------
# Base: install dependencies and generate Prisma client
# -----------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Dummy URL for prisma generate (no DB connection during build)
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# -----------------------------------------------------------------------------
# Build: build the Next.js application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

# Dummy URLs for build (no DB connection during build; real URLs from .env at runtime)
ENV DIRECT_URL="postgresql://build:build@localhost:5432/build"
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Prisma client already generated in deps; ensure it exists for build
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# -----------------------------------------------------------------------------
# Run: production image (next start; no standalone output)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/package.json ./
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/src/app/generated ./src/app/generated

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]
