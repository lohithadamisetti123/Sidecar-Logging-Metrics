FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV LOG_FILE_PATH=/var/log/app/app.log
ENV LOG_POLL_INTERVAL_MS=1000

CMD ["node", "index.js"]
