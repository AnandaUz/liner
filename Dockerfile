FROM node:20-slim AS builder

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# root configs
COPY package*.json ./
COPY tsconfig*.json ./

# workspace configs
COPY server/package*.json ./server/
COPY server/tsconfig*.json ./server/

# install (npm увидит workspaces)
RUN npm install

# sources
COPY server ./server
COPY shared ./shared


RUN npm install

# build
RUN npm run build:server


# ---------- runtime ----------
FROM node:20-slim

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/package*.json ./

CMD ["node", "server/dist/server/src/index.js"]