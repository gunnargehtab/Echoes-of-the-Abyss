# The client, built and served as static files.
#
# Build context is the repository **root** — see packages/backend/Dockerfile
# for why. The client is a terminal, not a simulation, so this image is nginx
# over a Vite build with no server-side anything.
#
#   docker build -f packages/frontend/Dockerfile \
#     --build-arg VITE_SERVER_URL=ws://localhost:3000 -t echoes-frontend .

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm ci --include-workspace-root -w packages/shared -w packages/frontend

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

# Where the browser should look for the game server. Vite substitutes
# `import.meta.env.VITE_SERVER_URL` at compile time, so this is baked into the
# bundle and cannot be changed by an env var on the running container — a
# different server means a different image. The default matches the compose
# file; net/GameClient.ts falls back to the page's own hostname on :3000.
ARG VITE_SERVER_URL=ws://localhost:3000
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build:shared && npm -w packages/frontend run build

# ---------------------------------------------------------------------------

FROM nginx:alpine AS runtime

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80
