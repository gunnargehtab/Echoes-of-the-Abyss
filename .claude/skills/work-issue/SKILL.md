---
name: work-issue
description: Pick one open issue off the backlog, work it end to end, and open a pull request — the unattended loop. When nothing is eligible, file one sub-issue off an epic instead, so the next run has work. Use this when asked to work the backlog, pick up an issue, make progress on open issues, or when a scheduled Routine fires with no human watching. Prefer this over improvising a selection rule; the claim check and the open-PR cap are what keep two firings from colliding and what keep CI spend bounded.
---

# Working one issue, unattended

This is the loop a scheduled Routine runs several times a day with nobody
watching. It picks **one** issue, takes it to a pull request, and stops. The
selection rule and the cap below are the whole reason the loop is safe to leave
running — skipping them is how you get two sessions on the same issue, or six
open PRs each burning a twenty-minute CI run.

**The one thing this loop must not do is guess.** `docs/` is canonical and code
transcribes it; when they disagree, that is a bug in one of them, and which one
is a design call. An unattended session that picks a side and ships it has
written a plausible wrong answer into the design bible. Step 7 is how you stop
instead — and stopping with a good comment on the issue is a *successful* run,
not a failed one.

## 0. Establish what GitHub access you have, before anything else

A scheduled firing does not necessarily get the same tools an interactive
session has. The `mcp__github__*` tools here come from the environment rather
than from a connector, and a Routine created outside a session holding them may
fire without them — the create call warns about this explicitly. So find out
first, rather than discovering it half way through step 4 with an issue
half-filed.

- **If the `mcp__github__*` tools are present, use them.** They are the
  supported path and the rest of this skill assumes them.
- **If they are not,** fall back to the REST API with the `GITHUB_TOKEN` (or
  `GH_TOKEN`) in the environment:

  ```bash
  curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/repos/gunnargehtab/Echoes-of-the-Abyss/issues?state=open
  ```

- **If a write comes back 401, 403 or 404** — creating an issue, linking a
  sub-issue, opening a pull request — **stop and say so plainly.** Do not retry
  against a different credential and do not carry on with the half of the job
  that works. An issue filed but never linked to its epic is worse than no issue
  at all: step 4's dedup reads the epic's children, so an unlinked issue gets
  filed again on the next firing, and again after that.

Git itself is authenticated separately and independently: `git fetch` and
`git push` over HTTPS work regardless of API access. That leaves one useful
degraded mode — you can still branch, commit, and push. If the work is done and
only the PR creation fails, push the branch anyway and report its name, so the
run is recoverable by hand rather than lost.

## 1. Take stock before you take an issue

```bash
git fetch origin main && git ls-remote --heads origin 'refs/heads/claude/issue-*' \
  | sed 's|.*refs/heads/||'
```

That lists every issue branch an earlier firing created. Combine it with the
open pull requests (their head refs and their `Fixes #<n>` lines) to get the set
of **claimed** issue numbers. Both halves matter: a session that died before
pushing leaves no branch, and a PR whose branch was renamed leaves no matching
ref, so either source alone will let you collide with work already in flight.

## 2. Stop early if the backlog is already saturated

Count the open pull requests whose head ref starts with `claude/`. **If there
are two or more, do nothing and end the run.** Say so plainly and exit — do not
fall through to step 4 and file an issue instead. A saturated backlog means stop.

This cap, not the schedule, is what bounds cost. A full CI run is 15–22 minutes
and this account has run out of Actions minutes before — the incident is
recorded in the header comment of `.github/workflows/ci.yml`. The loop is
allowed to fire often precisely *because* it usually finds the cap reached and
returns immediately. Raising the cap is a real spending decision; raising the
cron frequency is not.

## 3. Choose one issue

From the open issues that are **not** claimed and **not** labelled `epic`, take
the oldest. Two exclusions, for different reasons:

- `epic` issues are trackers for work spanning many PRs (#212 is twenty-eight
  campaign missions). There is no single PR that closes one, so an agent that
  takes it produces a PR that cannot honestly say `Fixes`. Step 4 is what to do
  with them instead.
- Anything already claimed is someone else's — including an earlier you.

Prefer `bug` over `enhancement` when the ages are close: a bug is a statement
about behaviour that is already wrong, and its acceptance criteria are usually
in the issue rather than in your judgement.

**Found one? Skip to step 5.** Only when step 3 comes up empty do you do step 4.

## 4. When nothing is eligible, file one sub-issue off an epic

An epic is not a reason to idle. `#212` carries eleven items under a
`## Sub-issues` heading, and every one of them is a markdown checkbox rather
than a real issue — `has_children` is false and the sub-issue list is empty. The
author's intent is plain from the heading; nobody has done the filing. So do
exactly one piece of it, and stop.

1. Take the oldest open `epic`. Read its **existing sub-issues** — that list, not
   the checkbox ticks, is the record of what has already been filed. A ticked box
   means *done*; an unticked box with a sub-issue already linked means *filed*.
   Never tick a box yourself.
2. Walk its unchecked, unfiled boxes in order and take the first one that is
   **concrete enough**: you can state its acceptance criteria, name the files or
   docs it touches, and believe it is one PR's worth of work.
3. Open a normal issue for it. Title and body in the register of the epic, the
   epic's constraints restated where they bind, and a line saying which epic
   box it came from. Label it by its nature — `enhancement`, `docs`, `infra`,
   `bug` — and **never `epic`**, or the next run will skip it too.
4. Link it to the epic with the sub-issue API. This is what stops the next
   firing re-filing the same box, so it is not optional bookkeeping.
5. **Stop.** Do not then work the issue you just filed. The gap until the next
   firing is the window in which a human can look at the scope you chose, and
   it only exists if you end the run here.

Those boxes are wildly uneven, and telling them apart is the whole skill in this
step. "Coral Ruins mid-match biome change" is a scoped system with a named write
path and a doc that marks it unbuilt. "The twenty-eight mission definitions" is
not an issue. "Faction campaign specifications — the documents first" says in its
own title that prose comes before code, so the issue it deserves is a doc issue
for *one* specification, not a code one.

When no box is concrete enough, **comment on the epic** naming the box you would
have taken and the scoping decision it needs from a human, and end the run. That
comment is a good outcome. Filing a vague issue is not — it converts a design
question into a work item that some later run will treat as settled.

## 5. Work it like any other change

Branch **`claude/issue-<n>-<slug>`**. The issue number in the branch name is not
cosmetic — step 1 is how the next firing sees your claim, and it only works if
the number is there. Push the branch early, before the work is finished, so the
claim is visible to a firing that starts while you are still going.

Commit subjects take the `feat:` / `fix:` / `docs:` / `test:` / `refactor:`
prefixes from `CONTRIBUTING.md`, imperative mood. Read `CLAUDE.md` before
touching simulation code: the build order, the two clocks and their budgets, the
per-package import extensions, and the rule that tuning numbers live only in
`packages/shared/src/constants.ts` are all things that look like style until
they break the build.

## 6. Run every gate locally before you push

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

All of these are blocking in CI, both doc gates included, so a dead link in
`docs/` fails the build exactly as a failing test does. The suite is slow —
single test files run over a minute — which is the argument for running it here
rather than learning the same thing from a red PR twenty minutes later.

Then open the PR against `main`, filling `.github/PULL_REQUEST_TEMPLATE.md` and
referencing `Fixes #<n>`. Not a draft. Anything visual needs the screenshot that
`docs/graphics-standards.md` requires — the **run-game** skill produces it.

## 7. When to stop instead, and how

Open no PR, comment on the issue, and end the run when:

- **The docs and the code disagree** and the issue does not say which is wrong.
  Write up both readings and what each would cost. That comment is the run's
  output.
- **The issue is a design question wearing a bug's clothes** — a balance
  guard-rail reading breached, a mechanic that feels wrong. `CLAUDE.md` asks
  every mechanic to be an argument about sound or depth; if answering the issue
  means deciding what the mechanic *should* argue, that is not an unattended
  call.
- **The fix does not converge.** If the gates in step 6 keep failing in new
  places, stop and report what you learned. A half-landed change on a green
  `main` is worse than an issue that stayed open another day.

A comment that sharpens an issue is worth more than a PR that guesses at it.
State the finding, name what you would need in order to proceed, and leave the
issue open.

## Related

- `CONTRIBUTING.md` — branch and commit conventions, the gate list, labels
- `CLAUDE.md` — architecture, build order, budgets, and the gotchas behind them
- `.claude/skills/run-game/SKILL.md` — verifying a change in the real client
- `docs/ROADMAP.md` — what the backlog is for
