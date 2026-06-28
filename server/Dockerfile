# Build context is the repo root (workspace deps live in packages/).
FROM oven/bun:1.3-alpine

WORKDIR /app

# Install deps using the workspace manifests first (better layer caching).
COPY package.json ./
COPY packages/shared-types/package.json packages/shared-types/
COPY server/package.json server/
RUN bun install

# Copy source.
COPY packages ./packages
COPY server ./server

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3000

# Apply migrations, then start. db must be reachable (compose depends_on healthy).
CMD ["sh", "-c", "bun run db:migrate && bun run start"]
