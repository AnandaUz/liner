# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy root manifests
COPY package.json package-lock.json ./
# Copy workspace manifests
COPY server/package.json ./server/
COPY client/package.json ./client/
# Copy local dependency manifest
COPY _base/package.json ./_base/

# Install ALL dependencies (including devDeps for building)
RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
# Copy all source files
COPY . .

# Build server workspace
RUN npm run build --workspace=server

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 8080

# Copy manifests for production install
COPY package.json package-lock.json ./
COPY server/package.json ./server/
# Copy the local dependency folder (required for npm to link @base/shared)
COPY --from=builder /app/_base/ ./_base/
# Copy any other shared folders if necessary
COPY --from=builder /app/shared/ ./shared/
# Copy the built server code
COPY --from=builder /app/server/dist ./server/dist

# Install only production dependencies
# This will find @base/shared in ./_base
RUN npm ci --omit=dev --ignore-scripts

# Expose port (Cloud Run will override this with its own PORT, but 8080 is conventional)
EXPOSE 8080

# Start the server
# Path based on tsc output structure: server/dist/server/src/index.js
CMD ["node", "server/dist/server/src/index.js"]

