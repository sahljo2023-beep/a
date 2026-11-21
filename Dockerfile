# ============================================================
# Stage 1: deps — تثبيت dependencies فقط
# ============================================================
FROM node:20-alpine AS deps

# argon2 يحتاج build tools
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# ============================================================
# Stage 2: builder — بناء التطبيق
# ============================================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# توليد Prisma client
RUN npx prisma generate

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# ============================================================
# Stage 3: runner — صورة الإنتاج النهائية
# ============================================================
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Amman

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# node_modules للـ Prisma runtime وargon2
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/argon2 ./node_modules/argon2

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
