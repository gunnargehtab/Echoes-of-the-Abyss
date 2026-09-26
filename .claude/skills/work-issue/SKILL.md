---
name: work-issue
description: Pick one open issue off the backlog, work it end to end, and open a pull request — the unattended loop. When the work needs a design call, write the options, take the recommended one and keep going. When nothing is eligible, file the next sub-issues off an epic instead, so the following runs have work. Use this when asked to work the backlog, pick up an issue, make progress on open issues, or when a scheduled Routine fires with no human watching. Prefer this over improvising a selection rule; the claim check, the self-assignment and the open-PR cap are what keep two firings from colliding and what keep CI spend bounded.
---

# Working one issue, unattended

A scheduled Routine runs this several times a day with nobody watching. It picks
**one** issue, claims it, takes it to a pull request, and stops. The claim, the
selection rule and the cap are what make it safe to leave running: skip them and
two sessions work one issue, or six pull requests each burn CI on every push.

**The loop decides; it does not guess.** `docs/` is canonical and code transcribes
it. When the work needs a call the issue does not make, §7 says how to decide it
in the open — options, a recommendation, the recommendation taken — so a
reviewer can overturn it in one comment. Deciding silently is the failure.
Stopping is kept for the few cases §7 lists.

The history behind each rule is in the run log (#580, then its successors) and in
`git log` on this file. This file keeps the rules and one reason each.

## 0. Check GitHub access first

- **`mcp__github__*` tools present:** use them; the rest of this file assumes them.
- **Absent:** use the REST API with `GITHUB_TOKEN` or `GH_TOKEN`:

  ```bash
  curl -sS -H "Authorization: Bearer $GITHUB_TOKEN" \
    -H "Accept: application/vnd.github+json" \
    https://api.github.com/repos/gunnargehtab/Echoes-of-the-Abyss/issues?state=open
  ```

- **A write returns 401, 403 or 404:** stop and say so. Do not retry with another
  credential or finish the half that works. An issue filed but not linked to its
  epic is re-filed by every later firing.

`git fetch` and `git push` authenticate separately. If only PR creation fails,
push the branch anyway and report its name.

## 1. Take stock

```bash
git fetch origin main
git ls-remote --heads origin 'refs/heads/claude/issue-*' | sed 's|.*refs/heads/||'
```

Read the latest entries of the run log, never the whole log. The log is the newest
open issue labelled `routine-log`; find it with `list_issues` by that label, not by
number. `issue_read` with `get` gives the comment count; `get_comments` with
`perPage: 5` on the last page gives the tail. It says what the last firings did
and left.

Three kinds of claim, strongest first:

- **An assignee** is a claim, and the earliest one: it exists from the moment
  somebody decides to start. §3 reads it.
- **An open pull request** is a claim. Read its head ref *and* its `Fixes #<n>`
  line; a renamed branch leaves only the second.
- **A `claude/issue-<n>-*` branch** is a claim only when an open pull request has
  it as head, or no pull request was ever opened from it and its tip is under 24
  hours old. Head branches are not deleted on merge here, so old refs are noise.
  Check just the issue you are about to take:

  ```bash
  git fetch --depth=1 origin claude/issue-<n>-<slug> && git log -1 --format=%cI FETCH_HEAD
  ```

  Do not use `git merge-base --is-ancestor`: squash-merged work is unreachable
  from `main` and would read as live.

## 2. Stop if the loop already has two pull requests open

Count open pull requests carrying the `routine` label, which §6 puts on every pull
request this loop opens. **Two or more: end the run** and say so. Do not fall
through to §4.

An open pull request without the label is somebody else's and does not count.
Only when the label itself is unavailable, count `claude/issue-` head refs instead
and say so in the run log; that count is too broad, which only stops the loop
early.

This cap bounds unattended CI spend. Raising it is a person's decision.

## 3. Choose one issue

Take the **oldest** open issue that is not claimed (§1), not assigned, and not
labelled:

| Label | Why it is skipped |
| --- | --- |
| `epic` | No single PR closes it; §4 files its sub-issues instead. |
| `routine-log` | The run log, this loop's own ledger. |
| `standing` | Open on purpose: code cites it by number. A person's to apply and remove. |
| `needs-hardware` | Needs a real GPU or device. A person's to apply. |
| `needs-decision` | A person reserved the call, or the rest is inside the balance freeze. |
| `fable-5.1` | Shape work, authored under the design model of record (`CONTRIBUTING.md`). The Routine is pinned to another model. Never apply or remove it. |
| `wontfix` | Parked: the finding stands, the build cannot act on it yet. A person's. |

**An assignee means taken, whoever it is.** The loop runs under the owner's login,
so the name cannot tell a person from an earlier firing; the claim comment can.

**A stale claim** — assigned, the loop's latest comment a claim rather than a
release, over a day old, no branch — goes in the run log's "Needs a person" line.
Still skip it; do not clear it.

**Balance work is frozen** (`CLAUDE.md`). An issue about a faction winning or
losing too much is not eligible, whatever its labels. A *correctness* fault the
harness surfaced is: a navy that cannot pay for its roster, a commander that never
builds a structure its waves gate on. If you cannot tell which it is, it is
balance. An issue whose remaining work is all inside the freeze takes
`needs-decision` per §7.

Prefer `bug` over `enhancement` when the ages are close. Taking anything but the
oldest is a judgement: name each older eligible issue you passed over, one clause
each, in the claim comment. An issue you pass over twice for the same reason wants
a label: apply `needs-decision` yourself only for the freeze case; propose the
others in the run log.

**Found one? Go to §5.** §4 is only for an empty backlog.

## 4. When nothing is eligible, file the next sub-issues off an epic

1. Take the oldest open `epic`. Read its **linked sub-issues**; that list, not the
   checkbox ticks, records what is filed. Never tick a box.
2. Walk its unchecked, unfiled boxes in order. Take **up to three** you can scope:
   acceptance criteria, the files or docs each touches, one PR each.
3. A box that needs a scoping call is not a reason to skip it: decide the scope
   per §7 and put the options in the new issue's body.
4. Open a normal issue per box — epic constraints restated where they bind, the
   box it came from named, labelled by nature (`enhancement`, `docs`, `infra`,
   `bug`), **never `epic`**, and **unassigned**.
5. Link each to the epic with the sub-issue API. Without the link the next firing
   files the same box again.
6. **Stop.** Do not work what you filed; the gap to the next firing is a person's
   window to adjust the scope.

Three is a ceiling, not a quota. When no box can be scoped even with a decision —
it is a prose document the design bible has not started, say — comment on the
epic naming the box and end the run.

In the epic comment, list every open issue you considered and why each was
excluded, a line each. From outside, a correct skip and a broken rule look the
same; only this list tells them apart.

### A finding of your own goes to #746

A defect found while working something else — a doc claim the code contradicts, a
rule here that failed in a run — is filed against #746, at the end of the run that
found it. Verify it against code at a named commit and cite file, line and commit;
never file from the prose describing the code. Filing is not taking: do not work
it. A finding inside the balance freeze stays in the run log.

A decision too wide for the pull request that needed it (§7) is the second kind:
file it against #746 with its options and recommendation, and do not take it.

## 5. Claim it, then work it through `dev-loop`

Before you touch a file, two writes, in this order:

1. **Assign the issue** to the login `get_me` (or `GET /user`) returns.
2. **Comment on it** (under 100 words):

   > Taken by the work-issue Routine, unattended. Branch
   > `claude/issue-<n>-<slug>`; session <link>.
   > Passed over: <older eligible issues, one clause each, or "nothing older">.
   > To take this over, unassign the issue or say so here; the run re-reads the
   > issue before it opens a pull request and stands down.

If either write fails, stop per §0. Then branch **`claude/issue-<n>-<slug>`** and
push it early, so the claim is visible in git.

**Then invoke `/dev-loop` and follow it.** Invoke it; do not just bear it in mind.
It owns the rounds: target, `npm run gates`, evidence, a fresh `loop-critic`,
exit or stall. Any run that changes a file goes through it, however small. A run
that changes none reports "no rounds" in §8. If the critic cannot be spawned, do
not review your own diff instead: write **critic unavailable** in §8 and say what
happened.

**Land it in instalments.** Commit and push at every self-contained step. Open the
pull request as soon as the branch carries one increment that stands on its own
and passes §6. When the session runs short, stop adding scope: push what is green
and say in the body what is left. An unpushed commit dies with the container.

Commit subjects take `feat:` / `fix:` / `docs:` / `test:` / `refactor:`,
imperative mood. Read `CLAUDE.md` before touching simulation code, and
`packages/backend/CLAUDE.md` for the server's own rules.

### When the issue is the loop's own

A firing may edit these files like any other work, **except the clauses that bound
it**:

- §2's open-PR cap and what counts against it;
- §3's exclusions, oldest-first, and both claim checks: §1's, and §6's re-check
  with its rule that the loop always yields;
- §7's limits on what the loop may decide, its stopping cases, and which labels a
  firing may apply;
- this section's instruction to invoke `dev-loop`, `loop-critic`'s separation from
  the author (its file, its missing edit tools) and §8's rounds line;
- `dev-loop`'s three-round cap and the verification pass that is not a round.

For those, **write the issue and stop**: what the rule costs and what you would
put in its place. A person decides. A generator that widens its own bounds is
grading itself (#540). The boundary is about authorship, not size. This list is
the only copy: `loop-critic`'s check 5 reads it here, and nothing else enforces it.

## 6. Gates, the second claim check, and the pull request

```bash
npm run gates
```

Every blocking CI check, one pass, one exit code. Use `-- --only=` while you
iterate on one gate; drop it before you push.

**Before opening the pull request, check the claim again.** List open pull
requests for another that closes your issue — by its closing line or by a title
describing your work — and re-read the issue. If another PR
covers it, or the assignee is gone, or a newer comment says a person is taking
it, **you yield, always**: do not open yours, delete your branch, unassign the
issue unless a person now holds it, and comment one line saying the Routine stood
down and why. A person's in-flight branch is worth more than a firing's.

Then open the pull request against `main`: not a draft, labelled **`routine`**,
the body in `.github/PULL_REQUEST_TEMPLATE.md`'s shape.

- **Problem**, at most three sentences.
- **Options**, only when the work needed a decision: at most three sentences each,
  the taken one marked **(recommended, taken)**.
- **Solution**, at most three sentences: what changed, how, and the test or
  evidence that proves it.
- The closing line (`Fixes #<n>`, or `Refs #<n>` for part of an issue).

Nothing else: no round history, no gate output, no narrative. Two optional
headings sit outside the sentence caps: **`## Open findings`**, when the loop
stopped with work left, listing them as the critic worded them, and
**`## Screenshots`** for a visual change. Check the reading before posting:

```bash
node tools/prose-budget/check.mjs --kind=pr --strict body.md
```

Every comment this skill asks for stays under 100 words.

### A screenshot, when the change is visual

`docs/graphics-standards.md` requires a screenshot taken through `run-game`. An
image cannot be inlined from here: the upload endpoint is browser-only, and the API
strips markdown image URLs and `<img src>` alike (tested on #231). So:

1. Capture with `run-game`, and look at the frames.
2. Commit them under `docs/screenshots/issue-<n>/`, named for what they show, **in
   the same push as the code** — frames pushed after review can miss the merge.
3. Put each URL under `## Screenshots`, bare on its own line, by full commit SHA
   rather than branch name, with one sentence above it saying what it shows and
   that it is a link.

## 7. Decide, and when to stop instead

### A design call: decide it, say so, keep working

When the work needs a call the issue does not make — the docs and the code
disagree, the target reads two ways, a mechanic's behaviour is unspecified, an
epic box needs scoping, the critic's verdict lists a call under DECISIONS — do not
stop. Unattended, take the recommendation as below. Interactively, put the options
and your recommendation to the person at the keyboard and take their answer.

1. **Write the options**, two or three, at most three sentences each: what it
   does, what it costs, and the doc or code line it rests on. The current
   behaviour is one of them when it is viable.
2. **Recommend one.** The design bible decides: the doc that is more specific
   and more recent wins, every mechanic is an argument about sound or depth
   (`CLAUDE.md`), and between two close options take the one cheaper to reverse.
3. **Take it and continue.** If it says the doc is wrong, change the doc section
   first, then the code, in the same pull request: the SPEC procedure.
4. **Show it.** The options go in the pull request's Options section as written,
   the taken one marked. A reviewer picks another by saying so, and `steward`
   implements it. The merge commit carries the body, so
   `git log --first-parent --grep='## Options'` lists every call the loop took.

A decision rides the pull request that needed it. One that would widen the change
beyond the issue is filed against #746 with its options instead.

**The loop never decides:**

- anything inside the balance freeze (`CLAUDE.md`);
- its own bounds (§5, "When the issue is the loop's own");
- against a hard rule: server authority, constants in one place, the wire;
- a call a person reserved: `needs-decision`, or a comment on the issue saying
  they will make it.

### Stop, comment, release

End the run with a comment on the issue (under 100 words) when:

- **The remaining work is inside the balance freeze.** Apply `needs-decision` and
  say the freeze is what stopped you; `wontfix` is a person's durable answer if the
  work is parked.
- **A person has reserved the call** mid-run. Leave their label and their
  assignee alone.
- **A hard rule blocks every option**, or the critic returns `stop`. Name the rule
  in the comment. No label, unless the rule is the freeze, which takes the first
  bullet. A change to the loop's own bounds instead takes §5's route: write the
  issue and stop.
- **The fix does not converge**: the gates keep failing in new places, or
  `dev-loop` stalls with nothing landable. No label: the next firing deserves its
  own attempt.

**No pull request open yet:** open none, and release the claim. Unassign unless a
person now holds the issue, delete the branch if you pushed one, and say in the
comment that the Routine let go and what is owed. A stopped run that stays
assigned reads as work in progress that will never arrive.

**A pull request already open:** keep it and its branch, since what is green in it
still stands. Name what stopped the run under its `## Open findings`, as the cap
does, and let the open pull request stand as the claim.

Either way, name what you passed over, as §3 says.

## 8. Write the run down, whatever the run was

End every firing with one comment on **the run log**, the open `routine-log`
issue (#936 since 25 September), including a firing that hit the cap, found
nothing, or stood down at once. Under 100 words:

> **HH:MM — took #n** / **filed #a, #b** / **stopped on #n** / **nothing to do**
> The branch and pull request, or the epic and its boxes, or why no pull request.
> Rounds: how many and the critic's last verdict, **at the cap** when the third
> was the last — or **no rounds** and why, or **critic unavailable** and what
> happened.
> Decided: each call taken, the option and the pull request — or "nothing".
> Passed over: older eligible issues, one clause each, or "nothing older".
> Needs a person: a stale claim, a `needs-decision` you applied and what it waits
> on, a label you would propose, a branch left behind — or "nothing". Each also
> goes on the issue it concerns.
> Found: a defect filed against #746, or an unverified lead, or "nothing".

**The rounds line is never omitted.** When the critic cannot run, `dev-loop`
degrades to self-review with no error: the gates pass and the pull request reads
like a reviewed one. This line is the only place that shows it. **At the cap** is
the only record of how often the three-round cap binds.

**When the pull request merges, edit your entry** — append "Merged as `<sha>`" —
rather than posting a second comment.

**Say when the log has a gap behind you.** A firing can be rejected before §0 and
write nothing. If the last entry is older than the Routine's interval, which its
prompt states, name the gap in your entry.

**Your final reply repeats the entry.** It is what the completion notification
shows a person. A notification is not a record, though; this log is.

**Roll the log over when it is full.** If it holds 150 comments or more when you
come to write your entry, open a successor first: the same title with the next
number, labelled `routine-log`, its body linking the old log. Post your entry
there, then close the old log as completed with one line naming the successor.
Nothing in this file changes, because the loop finds the log by label.

## Related

- `CLAUDE.md` — architecture, build order, the balance freeze, "Write short on GitHub"
- `.claude/skills/dev-loop/SKILL.md` — the rounds, once §5 has claimed the issue
- `.claude/skills/steward/SKILL.md` — the pull request from open to merged
- `.claude/skills/run-game/SKILL.md` — verifying a change in the real client
- `CONTRIBUTING.md` — branches, commits, labels
