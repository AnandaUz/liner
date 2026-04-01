FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY shared/ ./shared/

# Устанавливаем ВСЕ зависимости из корня
RUN npm install

COPY server/src ./server/src
COPY server/tsconfig.json ./server/
COPY tsconfig.base.json ./

RUN npm run build:server

EXPOSE 8080
CMD ["node", "server/dist/index.js"]