FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV LOG_AGGREGATOR_PORT=8080

EXPOSE 8080

CMD ["node", "index.js"]
