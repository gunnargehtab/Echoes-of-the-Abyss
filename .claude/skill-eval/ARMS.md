# The arms' own diffs

Each experiment's `arms/` directory holds what that arm actually wrote, as a diff against
the base every arm was cut from, restricted to `packages/`. The setup commits that make an
arm an arm — removing the skill, removing the `CLAUDE.md` paragraph, stripping the answer
key — are left out, because they are the apparatus rather than the result.

**They are here because the README records outcomes, and an outcome is not evidence.**
Traps tripped, gates, cost — every one of those is a claim *about code*. Anyone re-reading
one of them, that no arm ever wrote a 0.17 shape, that one arm failed `type-check` on
`Object.hasOwn`, that two arms named their teardown `unwatchLobby`, needs the code the
claim was made about.

**The `skill-eval/*` branches still exist**, and they are the fuller record: each carries
the arm's real commits and the setup commits above, which these diffs deliberately drop.
Reach for a branch when you care how an arm got there, and for the diff when you only care
what it wrote. The diffs are kept anyway because a branch is easy to delete by accident and
because they travel with the repository, where a branch is one `git push --delete` from
gone.

One hazard that comes with keeping them: `prepare-arm.sh` pushes `--force-with-lease`, so
re-running an experiment under a name already used **replaces that arm's branch**. The
diffs here are what survives that, which is the second reason to keep both. Give a re-run a
new experiment id rather than reusing one whose branches you still want.

| Experiment | Arm | What it was working under |
| --- | --- | --- |
| `627` | `b` | no colyseus skill, `CLAUDE.md` guard intact |
| `627` | `c` | neither skill nor guard |
| `lobby-callbacks` | `a` | skill and guard, version guard in the prompt |
| `lobby-callbacks` | `c` | neither, version guard in the prompt |
| `lobby-callbacks-v2` | `a` | skill and guard, no version guard anywhere |
| `lobby-callbacks-v2` | `c` | no guard of any kind |

`627` arm `a` has no diff: it was never run. #687 stands in for that cell, and is on `main`.

## One of these is real work that never landed

All four `lobby-callbacks` arms rebuilt the client's lobby subscription — fine-grained
schema listeners in place of the 5 Hz whole-state callback and its `JSON.stringify` guard —
and all four passed ten of ten gates. **None of it is on `main`.** It was written to be
measured, not to be shipped, and shipping it is a separate decision nobody has taken.

If it is ever wanted, take one of these four rather than starting again, and read the
others: they disagree in small ways worth choosing between. `lobby-callbacks-v2/arms/a`
passes `listen`'s `immediate` argument explicitly; `lobby-callbacks/arms/c` carries the
clearest note on schema 2.x replay semantics in the test stub.

```bash
git apply .claude/skill-eval/lobby-callbacks/arms/c.diff       # the diff
git fetch origin skill-eval/lobby-callbacks-arm-c              # or the branch, while it lasts
```
