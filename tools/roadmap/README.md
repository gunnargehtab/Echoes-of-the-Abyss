# Roadmap site

`docs/ROADMAP.md` rendered against live GitHub issue state, for GitHub Pages.

```bash
node tools/roadmap/build.mjs --out dist/roadmap
open dist/roadmap/index.html
```

## Where the data comes from

Two sources, and the split is the design:

- **`docs/ROADMAP.md` owns the structure and the reasoning** — phases, what belongs in
  each, why it is ordered that way. This repository's first rule is that the docs are
  canonical, so the generator parses the doc rather than keeping a second copy that would
  drift by Thursday. **Adding a row to a phase table is how you add an item to the site.**
- **GitHub owns the state.** Whether an issue is open or closed is not something a
  checked-in file can know, and a hand-maintained checkbox is wrong the moment somebody
  closes an issue from their phone.

Nothing about progress is stored anywhere. The page is a view.

The parser is small and strict on purpose: it reads exactly the shape the doc already uses
— an `## Phase N — Title` heading followed by table rows containing `[#123](url)` — and
ignores anything it does not recognise rather than guessing. A generator that invented
structure out of prose would put things on a public page that nobody wrote.

## Running it without a token

It still builds. Every item renders as *unknown*, and the page says so at the top rather
than implying the work has not started. That keeps the generator runnable by anyone and
means a token outage produces an honest page instead of a broken build.

In this dev container, Node's `fetch` does not read the proxy environment that `curl`
uses, so a local run with a token needs `NODE_USE_ENV_PROXY=1`. GitHub Actions has no
proxy and needs nothing.

## Publishing is off by default

The repository is private; a Pages site is not. Merging a workflow should never be the
thing that decides to make part of a private repository public, so
`.github/workflows/pages.yml` builds and uploads an artifact on every relevant change and
**skips the deploy** until someone knowingly turns it on:

1. **Settings → Pages → Source:** *GitHub Actions*
2. **Settings → Secrets and variables → Actions → Variables:** add `PUBLISH_ROADMAP` = `true`

Until both are done the workflow is still green — an un-enabled Pages setup should not be
a red X on every push.

## What gets published

Only what is already in `docs/ROADMAP.md` and the titles and numbers of issues it links.
No source, no design bible, no internal notes. Worth re-reading before enabling, because
that is the moment it becomes public.

Related: `docs/ROADMAP.md` · `docs/style-neon-noir.md` (the palette the page uses) ·
`.github/workflows/pages.yml`
