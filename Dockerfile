# Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
# VGXTaskCo — Backend multi-stage Dockerfile

# ---------- Stage 1: Dependencies ----------
FROM node:22-alpine AS deps

WORKDIR /build
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ---------- Stage 2: Build ----------
FROM node:22-alpine AS builder

WORKDIR /build
COPY --from=deps /build/node_modules ./node_modules
COPY . .
RUN npm install -g pnpm && pnpm build

# ---------- Stage 3: Runtime ----------
FROM node:22-alpine AS runtime

LABEL maintainer="VGX Consulting <info@vgx.digital>"
LABEL org.opencontainers.image.source="https://github.com/vgxconsulting/vgx-taskco"
LABEL org.opencontainers.image.description="VGXTaskCo — Task management API"

WORKDIR /app

RUN addgroup -S vgx && adduser -S vgx -G vgx && chown -R vgx:vgx /app

COPY --from=builder --chown=vgx:vgx /build/dist ./dist
COPY --from=deps --chown=vgx:vgx /build/node_modules ./node_modules
COPY --chown=vgx:vgx package.json ./

USER vgx
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 --start-period=15s \
    CMD wget -q -O- http://localhost:4000/ || exit 1

CMD ["node", "dist/index.js"]
