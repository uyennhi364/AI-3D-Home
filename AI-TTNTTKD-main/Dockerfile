# =============================================================================
# DOCKERFILE — AI FENG SHUI STUDIO (Production Ready Multi-Stage Build)
# Baseline: v1.0.0-p9.1 | Node.js 22 Alpine | Non-Root User | Minimized Footprint
# =============================================================================

# --- Stage 1: Build Dependencies & Compile Application ---
FROM node:22-alpine AS builder

WORKDIR /app

# Install build prerequisites (Alpine)
RUN apk add --no-cache python3 make g++

# Install dependencies using lockfile
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY index.html tsconfig.json vite.config.ts server.ts ./
COPY public ./public
COPY src ./src

# Compile Vite client bundle and esbuild native ESM server bundle
ENV NODE_ENV=production
RUN npm run build

# --- Stage 2: Production Dependencies Only ---
FROM node:22-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

# --- Stage 3: Minimal Production Runtime ---
FROM node:22-alpine AS runner

WORKDIR /app

# Metadata labels
LABEL maintainer="AI DeepMind Engineering Team" \
      version="1.0.0-p9.1" \
      description="AI Feng Shui Studio - Production Container"

# Set runtime environment
ENV NODE_ENV=production \
    PORT=3000

# Copy production node_modules from prod-deps stage
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules

# Copy compiled bundles from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Switch to standard unprivileged user (node: uid=1000, gid=1000)
USER node

# Expose default HTTP application port
EXPOSE 3000

# Health check using native busybox wget on Alpine
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

# Start server in Native ESM mode
CMD ["node", "dist/server.js"]

