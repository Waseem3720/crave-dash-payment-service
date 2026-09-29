# ─── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency files
COPY package*.json tsconfig.json ./

# Install all dependencies including devDependencies for building
RUN npm ci

# Copy source files
COPY src ./src

# Compile TypeScript to JavaScript (dist)
RUN npm run build

# Prune devDependencies to keep only production dependencies
RUN npm prune --omit=dev

# ─── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Run as non-root user
ENV NODE_ENV=production

# Copy built artifacts and production dependencies from builder stage
COPY package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Use the pre-existing node user in the alpine image
USER node

# Expose service port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4004/health || exit 1

# Start the service
CMD ["node", "dist/server.js"]
