# Roadmap site

`docs/ROADMAP.md` rendered against live GitHub issue state, for GitHub Pages — the public
face of the project until there is more to show than the roadmap.

```bash
node tools/roadmap/build.mjs --out dist/roadmap
open dist/roadmap/index.html
npm run test:roadmap
```

## What is on the page

One page, in the neon-noir register of `docs/style-neon-noir.md`, under the Mouth lockup
from `docs/naming.md`:

- **The lockup**, with the sounding: every seven seconds a pulse descends the bands, the
  throat answers, and one echo comes back out. The bands' resting order never changes —
  the mark still brightens downward, always — and the whole animation is off under
  `prefers-reduced-motion`.
- **The build in numbers** — phases complete, roadmap items done, and the repository's
  closed issues, merged pull requests and open issues.
- **Where the build actually stands** — the status table from the doc, each row linked to
  the issue that tracks it, with that issue's live state.
- **What is built** — the doc's bullet list of what stands.
- **The roadmap** — every phase as a collapsible card with its verdict, its live count and
  its rows; Phase 10's group labels become sub-headings. Filter by open or done, search,
  expand all; `#phase-N` deep-links open the phase they point at.
- **What gates what** — the sequencing notes.
- **Completed sprints** — the milestone record.

## Where the data comes from

Two sources, and the split is the design:

- **`docs/ROADMAP.md` owns the structure and the reasoning** — phases, what belongs in
  each, why it is ordered that way, what is built, what gates what. This repository's
  first rule is that the docs are canonical, so the generator parses the doc rather than
  keeping a second copy that would drift by Thursday. **Adding a row to a phase table is
  how you add an item to the site.**
- **GitHub owns the state.** Whether an issue is open or closed is not something a
  checked-in file can know, and a hand-maintained checkbox is wrong the moment somebody
  closes an issue from their phone.

Nothing about progress is stored anywhere. The page is a view.

The parser (`lib/parse.mjs`) is small and strict on purpose: it reads exactly the shapes
the doc already uses — `## Phase N — Title` headings with `[#123](url)` table rows, a bold
`**Group label**` line between two tables, the `**Closed.**` verdict a phase opens with,
the `| Question | Reading | Tracked |` table and the `- **lead** — detail` bullets under
"Where the build actually stands", `## Completed — Sprint N (when)` headings, and the
numbered sequencing notes — and ignores anything it does not recognise rather than
guessing. A generator that invented structure out of prose would put things on a public
page that nobody wrote. `test/parse.test.mjs` pins every one of those shapes, and also
parses the real roadmap so a doc edit that breaks the site fails `npm test` rather than
the Pages build.

Repository counts come from repository-scoped endpoints only, paged, never from the
search API: a token scoped to one repository may not be allowed to search, and a count
that works in one place and not another is worse than one that pages. Anything that could
not be read is left off the page rather than shown as zero.

The generator is dependency-free by design — three plain modules under `lib/` — so the
site cannot fail to build because of something in `node_modules`. The two brand assets it
ships (the display font and the favicon) are copied from where the frontend already keeps
them, so there is one source for the logo.

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

Only what is already in `docs/ROADMAP.md`, the titles and numbers of the issues it links,
the repository's issue and pull-request counts, the two-line pitch from the root README,
the logo, and the display font. No source, no design bible, no internal notes. Worth
re-reading before enabling, because that is the moment it becomes public.

Gameplay footage, screenshots, lore and the rest are for later; the page's footer says
so, and the sections are laid out so they can take them.

Related: `docs/ROADMAP.md` · `docs/naming.md` (the logo) · `docs/style-neon-noir.md`
(the palette the page uses) · `.github/workflows/pages.yml`
