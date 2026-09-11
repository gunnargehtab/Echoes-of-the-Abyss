# The client, built and served as static files.
#
# Build context is the repository **root** — see packages/backend/Dockerfile
# for why. The client is a terminal, not a simulation, so this image is nginx
# over a Vite build with no server-side anything.
#
#   docker build -f packages/frontend/Dockerfile \
#     --build-arg VITE_SERVER_URL=wss://games.example:3000 -t echoes-frontend .
#
# The build argument is optional. Left off, the client derives its endpoint from
# the page it is served by — see net/GameClient.ts `defaultEndpoint`.

FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

RUN npm ci --include-workspace-root -w packages/shared -w packages/frontend

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

# The approved models, and the table that says how many there should be.
#
# docs/concept-art/models/ is the only home of the runtime GLBs — the two globs
# in src/game/{rosterModels,environmentModels}.ts reach across the tree into it,
# so a context without it builds a client with no models and says nothing (#624).
# tools/hull-maps/models.mjs is what the build's manifest gate counts against;
# without it the gate cannot run, which is the same silence one step removed.
# .dockerignore re-includes both paths; if either re-inclusion stops taking, the
# COPY below fails rather than the bundle quietly shipping empty.
COPY docs/concept-art/models docs/concept-art/models
COPY tools/hull-maps/models.mjs tools/hull-maps/models.mjs

# Where the browser should look for the game server. Vite substitutes
# `import.meta.env.VITE_SERVER_URL` at compile time, so this is baked into the
# bundle and cannot be changed by an env var on the running container — a
# different server means a different image.
#
# **No default, deliberately.** One used to be `ws://localhost:3000`, which is
# every player's own machine, and because it was always set the fallback in
# net/GameClient.ts could never run. Unset, `ENV` bakes the empty string, which
# `defaultEndpoint` reads as absent and answers with the page's own host and
# scheme — the right answer for every deployment that serves client and server
# from one name, and the only safe one for an image built without an argument.
ARG VITE_SERVER_URL=
ENV VITE_SERVER_URL=$VITE_SERVER_URL

RUN npm run build:shared && npm -w packages/frontend run build

# ---------------------------------------------------------------------------

FROM nginx:alpine AS runtime

COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/packages/frontend/dist /usr/share/nginx/html

EXPOSE 80
