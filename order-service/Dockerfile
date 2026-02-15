FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV ORDER_SERVICE_PORT=3003
ENV SERVICE_NAME=order-service

EXPOSE 3003

CMD ["node", "index.js"]
