---
name: roadmap-sync
description: Bring docs/ROADMAP.md up to date with the tracker — place new open issues and recently closed work in rows, add groups and phases, close a finished Now phase — and take it to one pull request. Use when the roadmap sync Routine fires, or when asked to update, re-plan or tidy the roadmap.
---

# Syncing the roadmap with the tracker

The roadmap site renders `docs/ROADMAP.md` against live issue state, and the doc
owns the structure: an issue is on the page only when a table row names it
(`tools/roadmap/README.md`, "Whose words these are"). Nothing wrote those rows
but people, so new issues piled up under "not yet placed". A Routine runs this
daily, an hour before "Republish the private roadmap artifact" builds `main`,
so a merged sync is on the next page.

**It edits the plan, not the game.** Two files change: `docs/ROADMAP.md` and
`tools/roadmap/lib/content.mjs`. Never code, never another doc, never an issue's
own text. The balance freeze binds here too: a balance issue goes under Later's
"Parked under the balance freeze", never into Now.

## 1. Take stock

GitHub access is `work-issue` §0's: the `mcp__github__*` tools when present,
else the REST API with `GITHUB_TOKEN`, and a refused write is a stop.

First look for an open pull request from a `claude/roadmap-sync` branch. **One
exists:** check it out, merge `origin/main` in (`steward` §3, never rebase),
and add today's work to it. **None:** branch `claude/roadmap-sync-<yyyy-mm-dd>`
from `origin/main`. One sync PR at a time, so a phase change waiting on a person
does not stop placements: they ride the same PR. Then build from that branch,
so what it already places is not placed twice:

```bash
NODE_USE_ENV_PROXY=1 node tools/roadmap/build.mjs --private <scratch>/rp --single-file \
  --drift <scratch>/drift.json
```

**Stop** when the log says "No GITHUB_TOKEN" or the JSON says
`"tokenless": true`. Without a token the tracker reads empty, which looks
exactly like a roadmap with nothing left to place.

Read the whole of `docs/ROADMAP.md` from "How the phases work" to the end of
Later, and its "Ground rules". Read each issue you place: its body and labels,
and its parent.

## 2. What to place

- **Every `unplaced` issue** in `drift.json`. These are open work in no row and
  under no epic that has a row. Epics, `routine-log` ledgers and `standing`
  issues are already left out.
- **Recent `unrecorded` issues only:** closed in the last 7 days, and not closed
  as a duplicate or as not planned (the build drops those). The loop closes most
  issues within hours, so this is how its work reaches the record. Older
  unrecorded issues are a person's call: leave them, and count them in the body.

A sub-issue whose parent has a row is placed already. An issue whose parent has
no row: place the parent, an epic, not the sub-issue.

## 3. Where a row goes

Take the first that fits, and give one reason in the body:

1. **The Now phase**, when the issue serves its **Done when** test, or it is a
   `finding` or `bug` the Now phase's work produced or found.
2. **The Next phase**, when it serves Next's test.
3. **A closed issue:** the phase that was Now on the day it closed. That is
   almost always today's Now; `git log -p docs/ROADMAP.md` shows when the verdicts
   last moved.
4. **Later**, under the group that already says why it waits: the balance freeze,
   held for a person, built when a branch wants it, after the game ships. Open
   work that serves no dated test also goes here, with a new group if none fits.

A row goes in the group whose label fits. When none does, add a group: a bold
`**Label**` line, then a `| Work | Issue |` table. Copy the shapes the doc
already uses exactly: `lib/parse.mjs` reads only those and ignores the rest.

The **Work** cell is the issue's work in the doc's own register, shorter than the
title, never a copy of it. The **Issue** cell links
`[#n](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/n)`.

## 4. Phases: close, promote, create

Change a phase's verdict only on evidence, and only these ways:

- **Close Now** when every row in it is closed **and** its Done-when test holds,
  read from the tracker and the repository. A test that needs a person, such as
  "a stranger reaches a win", holds only when an issue or comment records it.
  Write **Closed.** and one sentence on what closed it.
- **Promote Next to Now** in the same edit, and write **Now.** with its opening
  sentence changed to match.
- **Create a phase** when Next becomes Now, or when placed work serves no test
  in Now or Next and does not belong in Later. Use the next number. Write the
  verdict (**Next.**), at most five sentences on what it is and what it does not
  do, a **Done when:** line a tracker or a test can check, and its rows. Draw it
  from Later's rows and open epics, citing the design doc each one answers to.
  Move a row from Later; never copy it.

Never reopen or renumber a closed phase, never delete a row, and never edit
another phase's prose beyond a sentence that the change makes false. The
sprints, sequencing notes and ground rules are not this skill's.

## 5. The player's words

Every row, group, phase and Done-when test needs copy in
`tools/roadmap/lib/content.mjs`, or `npm run test:roadmap` fails:

- `items[n]`: one sentence a player understands, with no engineering terms.
  Look at how the neighbouring entries are written.
- `groups[label]`: the fan-facing label.
- `phases[key]`: `title`, `blurb`, and `done` for a Now or Next phase. Change a
  blurb that names the phase as current when its verdict moves.

Every fact in the copy is transcribed from `docs/`. When the doc does not say
it, leave it out.

## 6. Gates, then the pull request

```bash
npm run test:roadmap && npm run gates
```

Build again with `--drift`. Every issue you placed is gone from `unplaced`, and
from `unrecorded` when it was closed. **Nothing placed:** no pull request, and
delete the branch if you created it.

Commit `docs: sync the roadmap with the tracker (<date>)`, push, and open or
update the pull request against `main`. It is not a draft, and it carries the
`routine` label. Use the template's shape:

- **Problem:** how many issues were placed, and how many old unrecorded ones
  were left.
- **Options:** only for a phase change. Name the evidence that the test holds,
  and mark the change **(recommended, taken)**.
- **Solution:** one line per placement, `#n → Phase N / group: reason`.

Add **`automerge`** only when the diff only adds rows, groups and their copy.
A phase closed, promoted or created waits for a person: the plan is the owner's.
`steward` §9 then merges it once CI is green. It holds the same conditions as
for `work-issue`.

Subscribe to the pull request and drive it with `steward`.

## 7. End with one line

Name the pull request and the count placed, or say why it stopped. Nothing goes
on the `routine-log`: that log is `work-issue`'s, and the PR is this run's
record.

## Related

- `docs/ROADMAP.md`: "How the phases work" and "Ground rules"
- `tools/roadmap/README.md`: who owns which words, and the publishing Routine
- `.claude/skills/steward/SKILL.md`: §3 for merging `main` in, §9 for `automerge`
- `.claude/skills/work-issue/SKILL.md`: §6's pull request shape
