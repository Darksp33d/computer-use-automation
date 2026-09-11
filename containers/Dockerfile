FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack yarn install --immutable
COPY tsconfig.json ./
COPY src ./src
COPY demo ./demo
COPY ui ./ui
COPY scripts/assets.mjs ./scripts/assets.mjs
RUN corepack yarn build

FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS target
WORKDIR /app
COPY --from=build /app/dist/demo ./dist/demo
COPY --from=build /app/dist/src/http ./dist/src/http
COPY containers/target.mjs ./target.mjs
USER node
CMD ["node", "target.mjs"]

FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS browser
WORKDIR /app
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
COPY --from=build /app/node_modules/playwright ./node_modules/playwright
COPY --from=build /app/node_modules/playwright-core ./node_modules/playwright-core
RUN node node_modules/playwright/cli.js install --with-deps chromium && rm -rf /var/lib/apt/lists/*
COPY containers/browser.mjs containers/control-pipe.mjs ./
USER node
CMD ["node", "browser.mjs"]

FROM node:24.21.0-bookworm-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS receiver
WORKDIR /app
COPY containers/receiver.mjs ./receiver.mjs
USER node
CMD ["node", "receiver.mjs"]
