---
name: steward
description: Repo-specific guidance for driving an open pull request to green — what to do on a CI failure, a merge conflict, or a review comment in this repository. Use this whenever a session is subscribed to a PR's activity here, whether it opened the PR or was asked to watch one. It assumes the generic drive-to-green rules and only says where this repository differs; the generic rules still bind wherever this file is silent.
---

# Stewarding a pull request here

A session subscribed to a PR already knows the general drill: fix red CI,
resolve conflicts, answer reviewers, never skip a test to get green. What it
cannot know from those rules is that every gate in this repository reproduces
locally in seconds, that the doc gates need no install at all, that a
type error on a `packages/shared` PR is usually a stale build, and that a
"small" review ask can be a design call the design bible has to answer first.
Those are the differences. This file is deliberately short; `work-issue`
covers everything up to "open the PR", and this covers the gap between that
and merge.

## 1. Before touching anything, reproduce locally — cheapest failure first

Do not start from the job logs. Every CI gate is a command `CLAUDE.md` lists,
and locally they fail in seconds where a re-run costs six billed minutes. Run
them in the order they fail cheapest, and stop at the first one that reproduces
the red check:

```bash
npm run build:shared                                     # always, first
npm run gates -- --only=docs:lint,docs:links,docs:claude # the whole docs job
npm run type-check
npm run lint
npm run format:check
npm -w packages/backend exec -- node --import tsx --test test/<file>.test.ts
```

Three repo facts decide how to read what comes back:

- **`build:shared` comes first because it is the usual cause.** `frontend` and
  `backend` import `@echoes/shared` by its `dist/`, and the session-start hook
  built that once, at container start. A PR that edits `packages/shared` and
  then type-checks a workspace directly is checking against the old build. If
  the `build` job's type-check is red and the diff touches `packages/shared`,
  rebuild before believing the error — the fix is very often no code change at
  all. Root scripts (`type-check`, `test`, `build`) rebuild for you; workspace
  scripts do not.
- **A red `docs` job is a dead link or a markdownlint hit**, in `docs/` or in
  the prose this repository wrote under `.claude/`, and the `--only=` line above
  is that job's three gates and nothing else. They need no install and finish in
  well under a minute, so on a docs-touching PR they go before anything else.
  `gates.mjs` does not bail, so one run names every red gate rather than the
  first; the `--` is required, for the reason `CLAUDE.md`'s Commands section
  gives. The link check ignores this repo's own github.com URLs by config; any
  other dead link is real, and "Never link a doc that does not exist" is the
  rule that was broken.
- **A red `test` shard names its files.** The backend suite is dealt out
  file-by-file by `--test-shard`, deterministically, so the failing file is
  the same one every run. Run that one file with the command above, not
  `npm test`: the mission tests play whole missions at 60 Hz and a single file
  can take over a minute, so the full suite is the last thing to reach for.
  If the failure is in `shared` or `frontend`, those run on the last shard
  with `npm -w packages/<name> run test`.

If none of those reproduces, look at the `setup` step before the test body: a
`package.json` edited without its lockfile makes `npm ci` refuse the install,
and that is this PR's failure, not infrastructure.

## 2. Re-run almost nothing — a local run answers the same question sooner

A full run bills about six Actions minutes across its four jobs and takes about
two of wall clock, so a re-run is never the fast way to learn anything §1 can
tell you in seconds. The generic rules allow one re-run per failure; here the
rule is tighter:

- **A re-run is allowed only when the job died before any test body ran** —
  checkout, install, or the runner itself lost — and at most once. Everything
  else reproduces locally per §1, so a re-run tells you nothing a local run
  would not, and costs six minutes to say it.
- **Batch fixes into one push.** The workflow cancels a branch's in-progress
  run when a new push starts one, but the minutes already spent stay billed.
  Three speculative pushes start three runs; one validated push starts one.
  Run §1's gates on the whole change before pushing, not after.

### A three-second job is not a flake

The Actions minutes ran out once, on 2026-08-25, and that is fixed. Treat a red check
as this PR's failure. The signature, should it recur, is **every job finishing in about
three seconds with `runner_id: 0` and no log**. A healthy run has a runner and a log
per job: PR #482's took 21 to 72 seconds a job. On the three-second shape, comment once
with the job durations and `runner_id`, and stop; the fix is a person's.

## 3. Merge conflicts on `claude/` branches: merge `main` in, never rebase

```bash
git fetch origin main && git merge origin/main
```

`CONTRIBUTING.md` says to rebase freely on your own branch before review. A
`claude/` branch is never only yours: `work-issue` §1 reads pushed
`claude/issue-*` branches as claims, the claim comment on the issue names the
branch, and the person the comment invites to take over may already have it
fetched. A force-push replaces what that claim points at underneath all of
them, and a rebase is a force-push. So: merge commit in, no `--force`, no
`--amend` of anything already pushed. The merge commit costs nothing — every
PR here lands on `main` as one merge, and a merge of `main` into the branch
disappears into it.

Two things not to resolve by hand:

- **`package-lock.json`.** Take `main`'s copy and re-apply the intended change
  with `npm install` (the container's `npm` is fine for that). Then read
  `git diff --stat package-lock.json`: the session-start hook warns that the
  image's npm 10 silently drops the `libc` field from 42 optional platform
  entries on any write. If the diff is dozens of lines about packages the PR
  never touched, that is what happened — restore `main`'s file and redo only
  the dependency you meant.
- **Generated files.** `packages/shared/dist/` is not committed, so it never
  conflicts; the frames under `docs/screenshots/` and anything a `tools/` or
  skill script wrote are. Regenerate those with the tool that wrote them and
  commit the result, rather than picking hunks out of a binary or a bake.

Ask the author only when both sides changed the same logic and either
resolution loses behaviour. That is rare on a two-day branch; everything else
is yours to resolve and push.

## 4. Review asks that are design calls

The generic rule is "small, local ask → push it". Here the size of the diff is
not the test; **where the number comes from is**. `CLAUDE.md` puts every tuning
number in `packages/shared/src/constants.ts`, tagged `SPEC` or `TUNABLE`, and
the docs are canonical.

- **A `TUNABLE` move, a rename, a nit, an added test, a lint-bot finding** —
  push it. `TUNABLE` numbers are free to move by definition.
- **A `SPEC` number** — the doc changes first, then the constant, with the doc
  section cited in the comment. If the reviewer's ask names the doc section
  and the new value, doc plus constant in one commit is the documented
  procedure; push it. If the ask names only the constant, it is asking you to
  put a number into the design bible that the bible does not say. Do not.
- **"Make the docs and the code agree"**, or any ask that is a design call the
  reviewer has not settled: decide it the way `work-issue` §7 says. On a PR you
  opened, reply on the thread with the options and your recommendation, push the
  recommendation, and add the options to the body's Options section. On a PR you
  did not open, reply with the options and recommendation and let the author
  decide. Never on the balance freeze, the loop's bounds or a hard rule.
- **A reviewer picks a different option** from a PR's Options section: implement
  theirs, mark it taken in the body, and push. The reviewer's pick is the decision.
- **Never replace a derived value with a hard-coded one to make a test pass.**
  `BASE_THRESHOLD` is solved from the spec'd self-reveal radius; a reviewer
  asking for "just the number" is asking for that, and the answer is the
  sentence above, on the thread.

## 5. "Please add a screenshot"

The path is written down once, in `work-issue` §6 — the run-game capture, the
committed frames under `docs/screenshots/issue-<n>/`, the link by full commit
SHA because inline images are stripped from API-written PR bodies. Follow it
from there rather than from memory; the failure modes it lists were all
observed, not predicted.

The one thing that changes once review has started: **the frames must land in
the same push as any code change still pending**, and the PR body's links must
be updated in the same event. A screenshot commit that lands after the merge
button is pressed never reaches `main` — that is how #231 lost its frames.

## 6. When to stand down, and what the one comment says

A failure is not this PR's when the same check is red on `main`'s own run for
the current tip. `main` gets a `push` run per commit, so it always has a
verdict: read the check runs on `origin/main`'s head commit before deciding.
An error naming code the diff does not touch, reproducing identically, is the
other signal — but confirm it against `main` rather than against a re-run, for
the reason in §2.

When it is `main`'s failure:

1. **Port the fix if one exists** — a PR you have read that you expect to fix
   it, or the breaking commit's revert — into this branch and push. It no-ops
   once `main` carries it, and waiting for that other PR to merge is still
   waiting.
2. **Comment once on the PR**, naming the failing check, the `main` commit it
   is red on, and either the fix you ported or that none exists yet. That
   comment is the whole of standing down; it is never silent.
3. Keep the PR watched. When `main` recovers, merge it in per §3 and let CI
   re-run against the fixed base — one run, not a re-run of the old one.

Everything else is this PR's to root-cause, and §1 is where that starts.

Every comment in this file — the stand-down, a reply to a reviewer, a status
refresh — is under 100 words and in short sentences, per `CLAUDE.md`'s "Write
short on GitHub". Name the check, the commit, the fix. A reviewer reading a
thread is mid-task; give them the fact and let them get back to it.

## Related

- `.claude/skills/work-issue/SKILL.md` — the loop that opens the PR; §6 for
  the gates, the body and the screenshot path, §7 for deciding a design call
- `.claude/skills/dev-loop/SKILL.md` — the rounds that produced the PR. A
  review ask that is really a fresh change goes back through them; §4 is still
  what decides that it is a design call, and §6 is still this file's own bound
- `.claude/skills/run-game/SKILL.md` — producing the screenshot a visual PR
  needs
- `CLAUDE.md` — build order, where constants live, CI layout
- `packages/backend/CLAUDE.md` — the two clocks, and the Colyseus import rule
- `CONTRIBUTING.md` — branch and commit conventions, the gate list
- `.github/workflows/ci.yml` — the jobs, the shard split, and the header note
  recording the 2026-08-25 incident and its fix
