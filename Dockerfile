# Stage 1: Dependencies
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Копируем файлы конфигурации для установки зависимостей
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Устанавливаем ВСЕ зависимости для сборки (включая devDependencies)
RUN npm ci

# Stage 2: Builder
FROM node:24-alpine AS builder
WORKDIR /app

# Копируем node_modules из этапа deps
COPY --from=deps /app/node_modules ./node_modules


# Копируем исходники проекта
COPY package.json ./
COPY tsconfig.base.json ./
COPY shared/ ./shared/
COPY server/ ./server/

# Собираем сервер
RUN npm run build:server --workspace=server

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app

# Устанавливаем NODE_ENV
ENV NODE_ENV production
# Cloud Run ожидает порт 8080 по умолчанию
ENV PORT 8080

# Мы не используем .env в Cloud Run, переменные задаются в консоли Google Cloud
# Но если нужно, можно скопировать заглушку или использовать дефолты

# Копируем только необходимые файлы для запуска
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/server/package.json ./server/
COPY --from=builder /app/server/dist ./server/dist

# Устанавливаем только ПРОДАКШН зависимости (чтобы уменьшить размер образа)
RUN npm ci --omit=dev --ignore-scripts

# Открываем порт
EXPOSE 8080

# Запускаем сервер
CMD ["node", "server/dist/index.js"]