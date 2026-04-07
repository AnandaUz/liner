# Stage 1: Dependencies
FROM node:22-alpine AS deps
# Установлен git для возможности клонирования репозитория
RUN apk add --no-cache libc6-compat git 
WORKDIR /app

# Копирование манифестов
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
# Клонирование локальной зависимости [cite: 1]
RUN git clone https://github.com/AnandaUz/_base.git _base

RUN npm ci

# Stage 2: Builder
FROM node:22-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build --workspace=server

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app

# Исправлен синтаксис ENV на формат key=value
ENV NODE_ENV=production
ENV PORT=8080

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY --from=builder /app/_base/ ./_base/
COPY --from=builder /app/shared/ ./shared/
COPY --from=builder /app/server/dist ./server/dist

RUN npm ci --omit=dev --ignore-scripts

EXPOSE 8080

# Путь запуска согласно структуре проекта [cite: 3]
CMD ["node", "server/dist/server/src/index.js"]