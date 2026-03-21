FROM node:20-slim

RUN npm install -g pnpm@9

WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy only the packages we need
COPY packages/wot-core/ packages/wot-core/
COPY packages/adapter-yjs/ packages/adapter-yjs/
COPY packages/wot-cli/ packages/wot-cli/

# Install dependencies
RUN pnpm install --frozen-lockfile --filter @real-life/wot-cli...

# Build wot-core and adapter-yjs first (dependencies)
RUN pnpm --filter @real-life/wot-core build && \
    pnpm --filter @real-life/adapter-yjs build

# Data directory for SQLite + encrypted seed
RUN mkdir -p /app/data && chmod 700 /app/data

EXPOSE 8790

CMD ["pnpm", "--filter", "@real-life/wot-cli", "dev"]
