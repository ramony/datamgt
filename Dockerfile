FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++ tzdata
COPY package.json package-lock.json* ./
RUN npm install

FROM node:22-alpine AS builder
WORKDIR /app
ENV TZ=Asia/Shanghai
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV TZ=Asia/Shanghai
RUN apk add --no-cache tzdata
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
VOLUME ["/app/data"]
EXPOSE 3000
CMD ["node", "server.js"]
