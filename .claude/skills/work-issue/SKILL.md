---
name: work-issue
description: Pick one open issue off the backlog, work it end to end, and open a pull request — the unattended loop. When nothing is eligible, file the next sub-issues off an epic instead, so the following runs have work. Use this when asked to work the backlog, pick up an issue, make progress on open issues, or when a scheduled Routine fires with no human watching. Prefer this over improvising a selection rule; the claim check, the self-assignment, and the open-PR cap are what keep two firings from colliding and what keep CI spend bounded.
---

# Working one issue, unattended

This is the loop a scheduled Routine runs several times a day with nobody
watching. It picks **one** issue, assigns it to itself so everyone can see it
is taken, takes it to a pull request, and stops. The selection rule, the claim,
and the cap below are the whole reason the loop is safe to leave running —
skipping them is how you get two sessions on the same issue, or six open PRs
each burning a twenty-minute CI run.

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

- **If a write comes back 401, 403 or 404** — assigning an issue, commenting
  on it, creating one, linking a sub-issue, opening a pull request — **stop and
  say so plainly.** Do not retry against a different credential and do not
  carry on with the half of the job that works. An issue filed but never linked to its epic is worse than no issue
  at all: step 4's dedup reads the epic's children, so an unlinked issue gets
  filed again on the next firing, and again after that.

Git itself is authenticated separately and independently: `git fetch` and
`git push` over HTTPS work regardless of API access. That leaves one useful
degraded mode — you can still branch, commit, and push. If the work is done and
only the PR creation fails, push the branch anyway and report its name, so the
run is recoverable by hand rather than lost.

## 1. Take stock before you take an issue

Two questions, in this order: what is in flight, and what merely *looks* like it.

```bash
git fetch origin main
git ls-remote --heads origin 'refs/heads/claude/issue-*' | sed 's|.*refs/heads/||'
```

**An open pull request is a claim.** List them and read both halves — their head
refs and their `Fixes #<n>` lines — because a PR whose branch was renamed leaves
no matching ref, and the issue number in the body is the thing that is actually
being closed.

**An assignee is a claim, and the earliest one there is.** Step 3 reads it. It
exists from the moment somebody, person or loop, decides to start; a branch
exists only once something has been pushed, and a session that dies before
pushing leaves no branch at all.

**A branch on its own is not a claim.** This repository does not delete a head
branch when its pull request merges, so the refs accumulate — 86 of them by
September — and under the old rule every one of them marked its issue claimed
forever. #286 and #518 sat open and unassigned for days while this loop passed
over them at every firing and filed new work instead, because their branches had
outlived merged pull requests #519 and #523. So a `claude/issue-<n>-*` ref counts
as a claim only when one of these holds:

- an **open** pull request has it as its head, or
- **no** pull request was ever opened from it *and* its tip commit is under 24
  hours old — that is a run still going, or one that died mid-flight.

You need the second test only for the issue you are about to take, so it is one
command rather than eighty-six:

```bash
git fetch --depth=1 origin claude/issue-<n>-<slug> && git log -1 --format=%cI FETCH_HEAD
```

Do **not** try to settle this with `git merge-base --is-ancestor`. Some pull
requests here are squash-merged, so 62 of those 86 branch tips are unreachable
from `main` even though their work landed; the ancestry test calls them live and
you are back where you started.

## 2. Stop early if the backlog is already saturated

Count the open pull requests **this loop opened** — the ones carrying the
`routine` label, which step 6 puts on every pull request it opens.
**If there are two or more, do nothing and end the run.** Say so plainly and exit
— do not fall through to step 4 and file an issue instead. A saturated backlog
means stop.

The label is the marker because a branch prefix is not one. This count used to
read head refs beginning `claude/issue-`, on the reasoning that the prefix was
the loop's own and a human working in parallel should not be able to throttle
it. That reasoning was wrong: an interactive session working an issue in this
account pushes `claude/issue-<n>-<rand>` too, and three such pull requests
(#449, #475, #492) sat inside this count while a person drove them. Count what
you can prove is yours.

If the label is missing or a label write fails, fall back to counting
`claude/issue-` head refs and say in the run summary that you did. That count is
too *broad*, never too narrow, so falling back can only make the loop stop
earlier than it needed to — which is the safe direction.

This cap, not the schedule, is what bounds cost. A full CI run bills around six
Actions minutes across its four jobs, and this account has run out of Actions
minutes before — the incident is recorded in the header comment of
`.github/workflows/ci.yml`.

Do not read the cap as the loop's usual exit, though. Across the twenty-one
firings measured in September it never once bound: at most one of the loop's own
pull requests was open at any firing time, and its fourteen pull requests
accounted for fourteen of the 181 CI runs the repository spent in that window —
one run each, all green. What keeps the loop cheap is step 6, not this step.
Raising the cap is still a real spending decision; raising the cron frequency is
not.

## 3. Choose one issue

From the open issues that are **not** claimed, **not** assigned, and **not**
labelled `epic`, take the oldest. Three exclusions, for different reasons:

- `epic` issues are trackers for work spanning many PRs (#212 is twenty-eight
  campaign missions). There is no single PR that closes one, so an agent that
  takes it produces a PR that cannot honestly say `Fixes`. Step 4 is what to do
  with them instead.
- Anything already claimed is someone else's — including an earlier you.
- **An issue with an assignee is taken, whoever took it.** A person who
  assigned themselves is on it, and so is an earlier firing of this loop, which
  assigns itself in step 5 before it does anything else. This is the cheapest
  exclusion to honour and the most valuable, because it is the only signal that
  exists *before* a branch or a pull request does: step 1's claim check can
  only see work that has already been pushed. Do not try to tell the two apart
  from the assignee's name — the loop runs under the repository owner's own
  login, so the name is the same either way, and it makes no difference to
  eligibility. The claim comment (step 5) is what says which it is.

An assigned issue can also be a **stale claim**: a firing that assigned itself
and then died before pushing leaves the assignee behind with no branch and no
pull request. If the latest comment from this loop on such an issue is a claim
rather than a release, and it is more than a day old, say so in the end-of-run
summary — issue number, claim time — so a person can clear it. **Still skip it,
and do not clear it yourself.** The same login could be a person who took the
issue over after the run died, and a wrong guess here recreates the collision
this whole rule exists to prevent.

Prefer `bug` over `enhancement` when the ages are close: a bug is a statement
about behaviour that is already wrong, and its acceptance criteria are usually
in the issue rather than in your judgement.

**Taking anything other than the oldest is a judgement call, and it goes in the
claim comment.** Sometimes it is the right call — an issue can need hardware no
container has (#286 says so in its own comments), or carry a live investigation
somebody is mid-way through (#518). But on the first firing after step 1 was
loosened, the loop took an issue thirteen minutes old and left #286, nine days
old and eligible, untouched and unexplained. From the outside that is
indistinguishable from the rule not working. So name the older eligible issues
you passed over, one clause each, where the next person to look will find them.

**Found one? Skip to step 5.** Only when step 3 comes up empty do you do step 4.

## 4. When nothing is eligible, file the next sub-issues off an epic

An epic is not a reason to idle. `#212` carries eleven items under a
`## Sub-issues` heading, and every one of them is a markdown checkbox rather
than a real issue — `has_children` is false and the sub-issue list is empty. The
author's intent is plain from the heading; nobody has done the filing. So do the
next few pieces of it, and stop.

1. Take the oldest open `epic`. Read its **existing sub-issues** — that list, not
   the checkbox ticks, is the record of what has already been filed. A ticked box
   means *done*; an unticked box with a sub-issue already linked means *filed*.
   Never tick a box yourself.
2. Walk its unchecked, unfiled boxes in order and take **up to three** that are
   **concrete enough**: you can state the acceptance criteria, name the files or
   docs each touches, and believe each is one PR's worth of work.
3. Open a normal issue for each. Title and body in the register of the epic, the
   epic's constraints restated where they bind, and a line saying which epic
   box it came from. Label them by their nature — `enhancement`, `docs`, `infra`,
   `bug` — and **never `epic`**, or the next run will skip them too. Leave them
   **unassigned** for the same reason: an assignee means taken, and you are not
   taking them.
4. Link each to the epic with the sub-issue API. This is what stops the next
   firing re-filing the same box, so it is not optional bookkeeping.
5. **Stop.** Do not then work what you just filed. The gap until the next firing
   is the window in which a human can look at the scope you chose, and it only
   exists if you end the run here.

Three rather than one, because the loop was otherwise spending every second
firing on this step. Over the eight firings before this rule was written it
alternated exactly — file #534, work #534, file #546, work #546 — and the gap it
was protecting went unused every time: nobody commented on any of the four before
the next firing claimed it. Keep the gap, so still stop here. But one filing run
should stock the next three firings rather than the next one; a filing run costs
a few dollars and a working run around twenty, and the cheap one should not be
half of what the loop does.

Three is a ceiling, not a quota. File one if only one box clears the bar above,
and none if none do — the last paragraph of this step is what to do then.

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

### Say what you passed over

Reaching this step at all means you decided that nothing in the backlog was
eligible, and that decision is invisible unless you write it down. Put it in the
comment on the epic you filed against: every open issue you considered and the
one reason each was excluded — assigned, `epic`, an open pull request, a live
branch. A line each is enough.

This is not bookkeeping. Step 1's blindness went unnoticed for four days
precisely because no run ever said "#518 — skipped, branch
`claude/issue-518-xx5501`"; from the outside, a correct skip and a broken rule
look identical, and the loop is the only thing in a position to tell them apart.

**Every run owes this list, not only the ones that reach this step.** A run that
files puts it on the epic, a run that stops puts it in the stopping comment of
step 7, and a run that takes an issue puts it in the claim comment of step 5.
The run that most needs to explain itself is the one that skipped four older
issues and worked the fifth quite happily — it is the one nobody has any reason
to look at.

## 5. Claim it, then work it like any other change

Before you touch a file, put the claim where the next firing — and a person
opening the issue — will see it first. Two writes, in this order:

1. **Assign the issue to the account you are running as.** `get_me` (or
   `GET /user`) tells you the login; it is the repository owner's. This is what
   step 3 keys on, and it is visible from the moment you decide rather than
   from the moment you push — the #275 collision happened inside a seven-minute
   gap that no branch scan could have closed.
2. **Comment on the issue saying the Routine took it.** The assignee alone
   cannot say *who*, because the loop and the owner share one login; the
   comment can. Keep it to the facts a person needs in order to decide whether
   to step in:

   > Taken by the work-issue Routine, unattended. Branch
   > `claude/issue-<n>-<slug>`; session <link, when you have one>.
   > Passed over: <older eligible issues, one clause each, or "nothing older">.
   > To take this over, unassign the issue or say so in a comment — the run
   > re-reads the issue before it opens a pull request and stands down.

   Assigning without the comment is worse than not assigning: it makes the
   issue look like a person's, and nobody can tell it is safe to reclaim.

If either write fails, stop per step 0 — do not carry on unclaimed.

Then branch **`claude/issue-<n>-<slug>`**. The issue number in the branch name
is not cosmetic — step 1 is how the next firing sees your claim in git, and it
only works if the number is there. Push the branch early, before the work is
finished, so the claim is visible to a firing that starts while you are still
going, and so the branch named in your claim comment actually exists.

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
git ls-files -z ':(glob)docs/**/*.md' \
  | xargs -0 npx -y markdown-link-check --config .markdown-link-check.json
```

All of these are blocking in CI, both doc gates included, so a dead link in
`docs/` fails the build exactly as a failing test does. The suite is slow —
single test files run over a minute — which is the argument for running it here
rather than learning the same thing from a red PR a few minutes later.

### Run the claim check again before you open the PR

Step 1 told you the issue was free **when you started**. That was potentially an
hour ago, and it does not stay true. So before opening, repeat it: list the open
pull requests and look for another one that closes your issue — its `Fixes #<n>`
line, or a title that describes the work you just did.

**Re-read the issue too.** If the assignee you set is gone, or a comment newer
than your claim says a person is taking it, they have taken it over exactly as
your claim comment invited them to. Treat that the same as finding a PR.

This is not hypothetical. On #275 the loop selected at 12:13, a person's session
opened its own PR for the same issue at 12:20, and the loop opened a duplicate at
12:55 and merged it at 14:04 — the person's 558-line branch was closed unmerged.
Seven minutes decided it, and nothing looked again in the forty that followed.

Their branch was `claude/continue-212-8hrtxn`, with no issue number in it, so
step 1's `claude/issue-*` scan was blind to it even at the second look. That is
why this re-check reads **open pull requests** rather than branch names: a PR
declares its issue in a way a branch name need not.

**If another pull request now covers your issue, or a person has taken it
over, you yield. Always.** Not a judgement call, and not a comparison of whose
diff is better:

1. Do not open your PR.
2. **Delete the branch you pushed in step 5.** A branch pushed in the last 24
   hours is exactly what step 1 reads as a live run, so one left behind holds
   the issue shut against the next firing or two — and it used to hold it shut
   forever, which is how #286 and #518 were lost.
3. **Release the claim.** Unassign the issue if it is still assigned and nobody
   has said they are taking it; if a person has, the assignee is theirs now and
   you leave it alone. Either way, post a one-line comment saying the Routine
   stood down and why (the PR number, or the takeover) — that comment is what
   step 3 reads as a release, so a later firing knows the assignee is not a
   dead run's leftover.
4. Say plainly what you found, which PR you yielded to, and that your work was
   discarded. A run that discovers a collision and stands down is a *successful*
   run; it spent an hour and saved a person's afternoon.

Yield even when you were first to select and even when your work looks more
complete. A person's in-flight branch is worth more than yours because they are
not going to get another firing in four hours, and you are.

Then open the PR against `main`, filling `.github/PULL_REQUEST_TEMPLATE.md` and
referencing `Fixes #<n>`. Not a draft. **Label it `routine`** — that label is how
step 2 counts the loop's own open pull requests, and one you forget to label is
one the next firing cannot see when it budgets.

### The screenshot, when the change is visual

`docs/graphics-standards.md`'s review checklist asks for a "Screenshot in the PR,
taken via the **run-game** skill — a visual change is reviewed by looking at it,
not by reading its diff." That gate is not satisfied by describing the frame, and
it is not satisfied by a capture that stayed in `/tmp`.

**You cannot put an image *inline* in a pull request from here, and two things
that look like they should work do not.** GitHub's attachment upload is a browser
endpoint no cloud session reaches. And the API write path sanitises image sources
both ways — this was tested on #231, not assumed:

- markdown `![alt](url)` comes back with the URL wrapped in backticks, so it
  renders as literal text;
- an HTML `<img src=…>` comes back with `src` stripped, so it renders as nothing.

Ordinary markdown **links survive intact**. So the strongest form available is a
committed file plus a link to it:

1. Capture with the run-game skill, as the gate requires. Look at the frames —
   that is the point of them, and #231's own draw-order bug was found in a
   screenshot rather than in the diff.
2. **Commit the frames in the same push as the code**, under
   `docs/screenshots/issue-<n>/`, named for what they show
   (`scope-accumulation.png`, not `shot1.png`). Same push, not a follow-up: a
   screenshot commit pushed after review has started can miss the merge entirely,
   which is exactly what happened on #231 — the frames landed on the branch a few
   minutes after it merged, so they never reached `main` at all.
3. Link them from the PR body by full commit SHA, not by branch name — a branch
   is deleted after merge and takes the link with it:
   `[the scope](https://github.com/gunnargehtab/Echoes-of-the-Abyss/blob/<sha>/docs/screenshots/issue-<n>/<file>.png)`
4. **Say in the PR that the link is a link.** A reviewer clicking through is
   weaker than a rendered frame, and the gate's author should be able to see that
   trade rather than discover it.

Prefer one composed image over several loose ones — a strip of the same instrument
at three times, say — since each link is a click the reviewer has to spend. Keep
them small and cropped to the instrument under review. `docs/concept-art/` is the
precedent that images belong in this repository; the cost is honest, those PNGs
merge into `main` and stay there.

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
issue open — **and unassigned**. Release the claim exactly as in step 6: take
the assignee off, delete the branch if you pushed one, and say in the stopping
comment that the Routine has let go of the issue. A stopped run that stays
assigned looks, to the next firing and to every person, like work in progress
that will never arrive.

Then say what you passed over, as step 4 describes — the issues you considered
before taking this one, and the one reason each was excluded. A run that stops
is the run with the most to say about the state of the backlog, and it is the
one whose reasoning nobody can otherwise see.

## Related

- `CONTRIBUTING.md` — branch and commit conventions, the gate list, labels
- `CLAUDE.md` — architecture, build order, budgets, and the gotchas behind them
- `.claude/skills/run-game/SKILL.md` — verifying a change in the real client
- `docs/ROADMAP.md` — what the backlog is for
