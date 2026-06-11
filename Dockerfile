# Etapa 1: instalar dependências
FROM node:lts-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Etapa 2: build
FROM node:lts-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Etapa 3: baixar supercronic
FROM alpine AS supercronic
RUN apk add --no-cache curl && \
    curl -fsSL https://github.com/aptible/supercronic/releases/latest/download/supercronic-linux-amd64 \
      -o /usr/local/bin/supercronic && \
    chmod +x /usr/local/bin/supercronic

# Etapa 4: imagem de produção mínima
FROM node:lts-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache curl && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=supercronic /usr/local/bin/supercronic /usr/local/bin/supercronic
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --chmod=755 cron.sh /cron.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
