Developer Quickstart

This quickstart is a brief guide for contributors to get a local dev environment running and to make small documentation or design changes.

Prerequisites

- Node.js 18.x, npm 8/9+
- Git

Repository layout

- Root uses npm workspaces: packages/frontend and packages/backend
- Design docs live in /docs

Setup

1. Clone the repo:
   git clone <https://github.com/gunnargehtab/Echoes-of-the-Abyss.git>
2. Install dependencies (from repo root):
   npm ci

Running the project

- Start both front- and back-end (dev):
  npm run dev
- Build all packages:
  npm run build
- Run tests:
  npm run test
- Lint (workspace):
  npm run lint

Run a single workspace directly

- Frontend dev server:
  npm -w packages/frontend run dev
- Backend dev server:
  npm -w packages/backend run dev

Echo simulator (optional)

- If present: cd tools/echo-sim && node sim.js

Docs and CI

- Docs live in /docs — edit and open PRs for doc updates
- CI workflow: .github/workflows/ci.yml — it runs lint and formatting checks. The repository also includes markdown checks in CI (markdownlint / markdown-link-check).

Contributing

- Use descriptive branch names (feat/, fix/, ci/, docs/)
- Keep PRs focused; reference the related issue (e.g., "Fixes #30")
- Update docs in /docs and link to related system docs when adding mechanics

Related docs

- systems-echo.md, systems-depth.md, ROADMAP.md
