FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV PRODUCT_SERVICE_PORT=3002
ENV SERVICE_NAME=product-service

EXPOSE 3002

CMD ["node", "index.js"]
