FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV METRICS_SCRAPE_INTERVAL_SECONDS=15
ENV METRICS_SIDECAR_PORT=9101

EXPOSE 9101

CMD ["node", "index.js"]
