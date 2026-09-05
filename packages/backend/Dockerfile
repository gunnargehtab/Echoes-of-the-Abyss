# The game server, as a container.
#
# Build context is the repository **root**, not this directory: the backend
# imports @echoes/shared by its build output rather than its source, so the
# image has to compile shared first, and that needs the workspace lockfile that
# only exists at the root.
#
#   docker build -f packages/backend/Dockerfile -t echoes-backend .
#   docker run -p 3000:3000 -e CORS_ORIGIN=http://localhost:8080 echoes-backend

FROM node:22-alpine AS build
WORKDIR /repo

# Manifests before sources, so editing a simulation file reuses the install
# layer instead of paying for `npm ci` again. The frontend's manifest is copied
# even though this image never builds the frontend: npm validates the lockfile
# against every declared workspace and refuses to install with one missing.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json

# Only the two workspaces the server needs. The frontend's dependencies are
# three.js, Pixi and React, and none of them are linked into the bundle.
RUN npm ci --include-workspace-root -w packages/shared -w packages/backend

COPY packages/shared packages/shared
COPY packages/backend packages/backend

RUN npm run build:shared && npm -w packages/backend run build

# ---------------------------------------------------------------------------

FROM node:22-alpine AS runtime
WORKDIR /srv

# Production, so the origin lock in src/http/cors.ts is armed: this image will
# refuse to start unless CORS_ORIGIN names the origin the client is served
# from. That is the intended behaviour, not an oversight — a server that comes
# up answering every origin on the internet does so silently.
ENV NODE_ENV=production
ENV PORT=3000

# esbuild inlines express, Colyseus and bitecs into one file, which the
# standalone bundle test in the PR confirmed runs with no node_modules beside
# it. So the runtime image carries the bundle and nothing else.
COPY --from=build /repo/packages/backend/dist/index.js ./index.js

USER node
EXPOSE 3000

# Node 22 has global fetch, so the check needs no curl in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"]

CMD ["node", "index.js"]
