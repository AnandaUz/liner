# ---- Stage 1: Runtime ----
FROM node:20-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

# Копирование исходного кода проекта
COPY . .

# Переменные окружения (будут перекрыты файлом .env или настройками в Jenkins/Docker)
ENV NODE_ENV production
ENV PORT 2000

EXPOSE 2000

# Запуск вашего основного файла index.mjs
CMD [ "node", "index.mjs" ]
