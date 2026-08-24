FROM node:24-alpine AS base
LABEL authors="sahil"
# 1. Enable Corepack to manage pnpm
RUN corepack enable pnpm

# 2. Configure home and system path for pnpm binaries
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /app

COPY package.json ./
COPY pnpm-*.yaml ./

RUN pnpm install

COPY . .
RUN pnpm prisma migrate deploy
RUN pnpm run build

EXPOSE 3300

ENTRYPOINT ["node", "./dist/src/main.js"]
