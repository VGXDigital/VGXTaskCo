# Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.
# VGXTaskCo — Frontend multi-stage Dockerfile

# ---------- Stage 1: Build ----------
FROM node:22-alpine AS builder

WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# VITE_API_URL is empty in prod — nginx proxies /api to the backend container
RUN VITE_API_URL="" pnpm build

# ---------- Stage 2: nginx serve ----------
FROM nginx:alpine AS runtime

LABEL maintainer="VGX Consulting <info@vgx.digital>"
LABEL org.opencontainers.image.source="https://github.com/vgxconsulting/vgx-taskco"
LABEL org.opencontainers.image.description="VGXTaskCo — Task management frontend"

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget -q -O- http://localhost:80/ || exit 1
