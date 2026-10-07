FROM oven/bun:1.3.13-debian

RUN apt-get update && apt-get install -y python3 build-essential jq && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock bunfig.toml tsconfig.json turbo.json ./
COPY patches/ ./patches/
COPY packages/ ./packages/
COPY .github/TEAM_MEMBERS ./.github/TEAM_MEMBERS

RUN jq 'del(.workspaces.packages[] | select(. == "packages/app" or . == "packages/console/*" or . == "packages/stats/*" or . == "packages/slack"))' package.json > package.json.tmp && mv package.json.tmp package.json

RUN bun install

ENV CODO_VERSION=2.23.6-sec-test
ENV CODO_CHANNEL=latest

WORKDIR /app/packages/codo
RUN bun run script/build.ts --skip-embed-web-ui 2>&1
