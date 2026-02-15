FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --only=production

COPY . .

ENV USER_SERVICE_PORT=3001
ENV SERVICE_NAME=user-service

EXPOSE 3001

CMD ["node", "index.js"]
