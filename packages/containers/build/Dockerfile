FROM oven/bun:1.3.14

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ca-certificates \
    curl \
    git \
    python3 \
    ripgrep \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only source files needed for install (no node_modules, no dist)
COPY package.json bun.lock bunfig.toml ./
COPY packages/codo/package.json packages/codo/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/tui/package.json packages/tui/package.json
COPY packages/server/package.json packages/server/package.json
COPY packages/app/package.json packages/app/package.json
COPY packages/plugin/package.json packages/plugin/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/codo/script/package.json packages/codo/script/package.json

RUN mkdir -p packages/console/app packages/console/core packages/console/function packages/console/mail packages/console/resource packages/console/support packages/stats/app packages/stats/core packages/stats/server packages/identity packages/docs packages/function packages/slack packages/sdk

# Install deps without preload (bunfig.toml not copied, so preload not loaded)
RUN bun install 2>&1 | tail -10
RUN bun add --no-save drizzle-orm@0.44.2 --ignore-scripts 2>&1 | tail -3

# Copy source code (now node_modules exist in container)
COPY . .

ENTRYPOINT ["bash", "-c", "CODO_VERSION=${CODO_VERSION:-1.0.0} CODO_CHANNEL=${CODO_CHANNEL:-latest} bun run --cwd packages/codo script/build.ts"]
