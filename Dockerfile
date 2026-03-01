# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Установка всех зависимостей (включая devDependencies) для сборки
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Копирование исходного кода проекта
COPY . .

# Сборка проекта (компиляция TypeScript)
RUN npm run build

# ---- Stage 2: Runtime ----
FROM node:20-alpine

WORKDIR /app

# Копируем только необходимые файлы из этапа сборки
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
# Если есть статические файлы в public или views, их тоже нужно скопировать
COPY --from=builder /app/public ./public
COPY --from=builder /app/views ./views

# Установка только production зависимостей
# Используем --omit=dev, но убеждаемся, что все runtime зависимости в dependencies
RUN npm ci --omit=dev --legacy-peer-deps

# Переменные окружения
ENV NODE_ENV production
ENV PORT 8080

EXPOSE 8080

# Добавляем проверку наличия файлов перед запуском
RUN ls -la /app && ls -la /app/dist && ls -la /app/dist/server

# Запуск скомпилированного кода
CMD [ "node", "dist/server/index.js" ]


