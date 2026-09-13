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

## One of these was real work, and it has now landed

All four `lobby-callbacks` arms rebuilt the client's lobby subscription — fine-grained
schema listeners in place of the 5 Hz whole-state callback and its `JSON.stringify` guard —
and all four passed ten of ten gates. It was written to be measured rather than shipped,
and shipping it was a separate decision, taken in #699: **`lobby-callbacks-v2/arms/c` is on
`main`**, because it is the only arm that pins *both* replay knobs rather than inheriting a
default — `immediate: false` on each `listen`, `triggerAll: false` on `onAdd` with an
explicit `forEach` seed beside it.

The other three were read rather than discarded, and two of them changed what shipped.
`lobby-callbacks-v2/arms/a` supplied the reasoning about the decoder's initialisation that
the shipped fallbacks now carry, and `lobby-callbacks/arms/c` the note anchoring the
roster's replay behaviour to the installed @colyseus/schema. `lobby-callbacks/arms/a` is
the one to learn from rather than copy: it collects the per-seat unsubscribes in a flat
array and never releases one on `onRemove`, so a seat that empties leaves its listener
attached until the whole room is let go.

### The defect all four shared, and what it says about the harness

Three of the four arms — every one that reshaped `pushLobby` — dropped the
`?? MatchPhase.Lobby`, `?? ''` and `?? -1` fallbacks on the room's three primitives, and
all four passed ten of ten gates anyway. The fallbacks are load-bearing. `Reflection.decode`
auto-initialises only the root's *referenced* types, which is exactly what makes
`state.players` safe to subscribe to on join and leaves `phase`, `mapId` and `winnerSlot`
`undefined` until the first patch — and the join handshake fires `onJoin`, where `attach`
pushes its first view, before that patch arrives. Without them the client pushes a
`LobbyView` whose `phase` is `undefined` against a type that says `MatchPhase`.

Nothing caught it because **the stub was better initialised than the decoder it stands in
for**: every arm's `StubState` started its primitives at `0`, `''` and `-1`, so the one
push that reads them undecoded could not be observed. That is a lesson about the apparatus
rather than about any arm. A stub more complete than the real thing does not fail a test,
it deletes one, and a gate run over it reports ten of ten either way. The shipped stub
starts those fields undefined and `gameClient.test.ts` asserts the fallbacks directly.

It also sharpens the standing read below. Nine arms wrote no API drift, but this is the
second time a real defect has crossed a clean trap table untouched — arm B's
`Object.hasOwn` was the first. The traps measure what they were named for and nothing
else; the gates are what catch the rest, and only where the fixtures are honest.

```bash
git apply .claude/skill-eval/lobby-callbacks/arms/c.diff       # the diff
git fetch origin skill-eval/lobby-callbacks-arm-c              # or the branch, while it lasts
```
