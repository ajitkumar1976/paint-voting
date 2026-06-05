FROM node:22-bookworm-slim AS base

# better-sqlite3 native build
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Persist SQLite DB + uploaded images in /app/data
VOLUME ["/app/data"]

CMD ["npm", "run", "start:lan"]
