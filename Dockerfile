FROM node:22-alpine

WORKDIR /app

# Копируем все package.json воркспейсов
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm install

# Копируем исходники
COPY server/src ./server/src
COPY server/tsconfig.json ./server/
COPY tsconfig.base.json ./
COPY shared/ ./shared/

RUN npm run build:server

# Проверка что файл реально собрался
RUN ls -la server/dist/

EXPOSE 8080
CMD ["node", "server/dist/index.js"]