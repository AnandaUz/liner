# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

# Копируем исходники проекта
COPY package.json package-lock.json ./
COPY tsconfig.base.json ./
COPY shared/ ./shared/
COPY server/ ./server/

# Собираем сервер
RUN npm run build --workspace=server

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 8080

# Копируем только необходимые файлы для запуска
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/

COPY --from=builder /app/server/dist ./server/dist

# Устанавливаем только продакшн зависимости
RUN npm ci --omit=dev --ignore-scripts

EXPOSE 8080

CMD ["node", "server/dist/index.js"]
