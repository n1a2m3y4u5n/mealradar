FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY src/data/ ./src/data/
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server/index.js"]
