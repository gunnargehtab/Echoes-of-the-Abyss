# Contributing

The working conventions for this repository, in one place. [CLAUDE.md](CLAUDE.md) is the
deep companion (architecture, gotchas, and the reasoning behind these rules — it is
written for AI agents but everything in it is true for humans too); this file is the
short contract every change is reviewed against.

## Ground rules

1. **The docs are canonical.** `docs/` came first and remains the source of every tuning
   number. Code transcribes the docs; when they disagree, that is a bug in one of them —
   your PR says which one you are changing and why.
2. **Server-authoritative is a hard rule.** The whole game is hidden information. Never
   send the client anything it has not resolved — not "temporarily", not behind a debug
   flag that ships.
3. **Every mechanic is an argument about sound or depth.** A unit ability or faction
   trait anchored to neither is arbitrary; reconsider it before implementing it.
4. **Visual changes clear the gates** in
   [docs/graphics-standards.md](docs/graphics-standards.md), including a screenshot in
   the PR.

## Branches and commits

- Branch names use `feat/`, `fix/`, `ci/`, `docs/` prefixes: `feat/harvest-throttle`,
  `docs/bestiary-drift-health`.
- Commit subjects use the matching prefixes (`feat:`, `fix:`, `ci:`, `docs:`, plus
  `test:` and `refactor:` where they fit), imperative mood, and say what the change
  *does*: `feat: bake structure sprites from the approved 3D models`.
- Keep commits small and focused; a commit that needs "and" in its subject is usually two.

## Pull requests

- One concern per PR, referencing the issue it closes (`Fixes #30`).
- Fill in the template in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
- Run the CI gates locally first — the full sequence is cheap:

  ```bash
  npm run build:shared
  npm run type-check
  npm run lint
  npm run format:check
  npm test
  npm run build
  npx -y markdownlint-cli "docs/**/*.md" "docs/*.md" --ignore node_modules
  git ls-files ':(glob)docs/**/*.md' | while read -r f; do
    npx -y markdown-link-check --config .markdown-link-check.json "$f" || exit 1
  done
  ```

  All of these are blocking in CI (`.github/workflows/ci.yml`) — including both doc
  gates, so a dead link in `docs/` fails the build.

## Labels

The label set lives in [.github/labels.yml](.github/labels.yml) and is synced by a
workflow. Add, remove, or recolor labels by editing that file — never in the GitHub UI,
where the sync will overwrite you.

## Code conventions

- **Constants live in exactly one place**: `packages/shared/src/constants.ts`, tagged
  **SPEC** (from a design doc — change the doc first, cite the section) or **TUNABLE**
  (prototype number, free to move). Never replace a *derived* value with a hard-coded one
  to make a test pass. If a constant would exist in two packages, it belongs in shared.
- **Import extensions differ by package, deliberately.** `packages/shared` uses `.js`
  extensions on relative imports (NodeNext); backend and frontend use the real `.ts`
  extension (bundler resolution). Copying an import line between packages will break it.
- **Colyseus**: import from `@colyseus/core`, never the `colyseus` meta-package, and
  leave `useDefineForClassFields` alone in the backend tsconfig. The reasons are runtime
  gotchas, spelled out in [CLAUDE.md](CLAUDE.md).
- **Budgets are part of correctness.** Per-tick code is on the 60 Hz budget; anything
  touching detection is on the 2 ms Echo budget, and `Match` tracks the rolling
  worst case.
- **Comments explain *why*, not *what***, and several encode hard-won runtime gotchas —
  match that register and don't strip them when refactoring.
- **Style is Prettier's job** (100 columns, single quotes, ES5 trailing commas,
  semicolons): `npm run format` and stop thinking about it.

## Docs conventions

- [docs/glossary.md](docs/glossary.md) is authoritative. A term that means two things in
  two docs gets fixed in the glossary first, then everywhere.
- **Never link a doc that does not exist** — the link check is blocking. Planned work
  goes in the "Planned / Not Yet Written" section of [docs/README.md](docs/README.md) as
  plain text.
- Cross-link rather than restate; every doc ends with a "Related" section.
- Use concrete numbers: "45 SIG while idle with systems live", not "moderate SIG".

## Project skills

Repeatable workflows are captured as Claude Code skills in `.claude/skills/`, so the
process lives in the repo instead of in one person's head:

- **run-game** — boots both dev servers as a stoppable unit and drives the game in a
  headless browser; the way to verify a change in the real client and to produce the
  screenshot an art PR needs.
- **hull-intake** — validates a 3D model export (GLB) and bakes the review maps; the
  intake gate in [docs/graphics-standards.md](docs/graphics-standards.md).

When you find yourself re-explaining a workflow a second time — a bake step, a test
harness, a review checklist — turn it into a skill next to these two rather than a wiki
page nobody runs.

## Verifying on Android

The whole game runs on-device in Termux ([SETUP-ANDROID.md](SETUP-ANDROID.md)). One
command proves a phone can run it, and doubles as a pass/fail gate after a `git pull`:

```bash
node tools/android-check.mjs
```

## Related

- [CLAUDE.md](CLAUDE.md) — architecture, build order, and the reasoning behind these rules
- [README.md](README.md) — what the game is
- [SETUP.md](SETUP.md) — full development setup
- [docs/README.md](docs/README.md) — the design bible's index and editing rules
- [docs/graphics-standards.md](docs/graphics-standards.md) — the acceptance bar for anything visual
