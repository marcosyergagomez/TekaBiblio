FROM node:20-bookworm-slim

WORKDIR /workspace
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json

RUN pnpm install --frozen-lockfile --filter api-tmp...

COPY apps/api apps/api

RUN pnpm -C apps/api build

EXPOSE 3000

CMD ["node", "apps/api/dist/main.js"]
