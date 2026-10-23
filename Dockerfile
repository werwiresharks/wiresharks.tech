# The Raptor session stream server. The site itself is static (Vercel builds
# dist/); this image is only the Node service in server/.
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8787
# Node strips TypeScript types at run time, so no build step is needed.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
# The live console streams a real review, so the Raptor package ships too.
COPY raptor ./raptor
COPY src/raptor ./src/raptor
EXPOSE 8787
# Persist the waitlist outside the container by mounting a volume here.
VOLUME ["/app/.data"]
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:8787/health || exit 1
CMD ["node", "server/main.ts"]
