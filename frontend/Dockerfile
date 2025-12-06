# --- Build stage ---
FROM node:20-alpine AS builder
WORKDIR /app

COPY index.html script.js style.css ./


# --- Runtime stage ---
FROM node:20-alpine AS runtime
WORKDIR /app

RUN npm install express@4

COPY --from=builder /app /app
COPY server.js /app/server.js

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

USER node

CMD ["node", "server.js"]
