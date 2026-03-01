# ---- Stage 1: Build ----
# Используем полный образ для сборки, так как нам нужны инструменты компиляции
FROM node:20 AS builder

WORKDIR /app

# Копируем конфиги и устанавливаем ВСЕ зависимости (включая dev)
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Копируем исходники и собираем проект
COPY . .
RUN npm run build

# ---- Stage 2: Runtime ----
# Используем slim-образ: он намного стабильнее Alpine для бинарных модулей (sharp)
FROM node:20-slim

# Установка системных библиотек, необходимых для работы sharp в Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    libvips-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Копируем только то, что нужно для работы
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/views ./views

# Устанавливаем ТОЛЬКО production-зависимости
# Добавляем cross-env в production, так как он используется в вашем npm start
RUN npm install cross-env --omit=dev --legacy-peer-deps

# Переменные окружения для Google Cloud Run
ENV NODE_ENV production
ENV PORT 8080
EXPOSE 8080

# Запуск через npm start гарантирует выполнение вашей команды:
# "cross-env NODE_ENV=production node dist/server/index.js"
CMD [ "npm", "start" ]