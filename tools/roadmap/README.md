# Roadmap site

`docs/ROADMAP.md` rendered against live GitHub issue state, for GitHub Pages — the public
face of the project until there is more to show than the roadmap.

```bash
node tools/roadmap/build.mjs --out dist/roadmap
open dist/roadmap/index.html
npm run test:roadmap
```

## What is on the page

One page, written for a player rather than for the people building the game, in the
neon-noir register of `docs/style-neon-noir.md` under the Mouth lockup from `docs/naming.md`:

- **The lockup**, with the sounding: every seven seconds a pulse descends the bands, the
  throat answers, and one echo comes back out. The bands' resting order never changes —
  the mark still brightens downward, always — and the whole animation is off under
  `prefers-reduced-motion`.
- **The game in numbers** — campaign missions, navies, maps (all counted from the
  repository at build time), roadmap percentage, phases finished.
- **What kind of game this is** — the five rules everything descends from.
- **Four navies, one argument** — a card per faction, in its own accent colour.
- **What you can play today**, then **Known rough edges** — the doc's status table, each
  row in player terms and linked to the issue that tracks it, with that issue's live state.
  A rough edge whose issue has closed reads as fixed, never as current.
- **What is next** — every phase with something still open, as a collapsible card with a
  player-facing title, its live count and its rows; group labels become sub-headings.
  Filter by planned or done, search, expand all; `#phase-N` deep-links open the phase.
- **The road so far** — the finished phases, folded, then the milestone record.

## Whose words these are

Three sources, and the split is the design:

- **`docs/ROADMAP.md` owns the structure.** Which phases exist, which issues sit in each,
  the status rows, the sprints. **Adding a row to a phase table is how you add an item to
  the site.**
- **GitHub owns the state.** Whether an issue is open or closed is not something a
  checked-in file can know.
- **`lib/content.mjs` owns the words.** The roadmap is written for engineers — "Echo pass
  scaling", "replace the O(maxEid) scans" — and a fan cares about neither. The content
  module carries a player-facing sentence for every row, keyed by issue number, plus the
  sections a fan actually came for. Every fact in it is transcribed from `docs/`; when a
  number moves in a doc, it moves here. A row with no sentence renders in the doc's own
  words and the build says so by name, and `test/parse.test.mjs` fails if any row of the
  real roadmap is uncovered — so a new row cannot reach the public page in engineering-speak.

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

Nothing about progress is stored anywhere. The page is a view.

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
   — on the **Variables** tab, not Secrets; at the repository level or on the
   `github-pages` environment, either works.

Until both are done the workflow is still green — an un-enabled Pages setup should not be
a red X on every push. The deploy job's first step prints what the check saw, so a skipped
deploy says why in its log.

## What gets published

Only what is already in `docs/ROADMAP.md`, the titles and numbers of the issues it links,
the player-facing copy in `lib/content.mjs` (itself transcribed from the design docs), the
mission and map counts, the logo, and the display font. No source, no design bible, no
internal notes. Worth re-reading before enabling, because that is the moment it becomes
public.

Gameplay footage, screenshots and lore are for later; the page's footer says so, and the
sections are laid out so they can take them.

Related: `docs/ROADMAP.md` · `docs/naming.md` (the logo) · `docs/style-neon-noir.md`
(the palette the page uses) · `.github/workflows/pages.yml`
