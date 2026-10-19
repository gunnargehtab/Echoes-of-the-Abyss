# #1495 — the join's held frame, without the stall

A board launch froze the held home frame twice at the join
([#1495](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1495)). The first
freeze was the seabed bake, which #1499 removed by cutting the session's skins from the
baseline the board had baked. This reading is the second: the first draw of the session's
materials, which waited on the driver to link their programs.

**Where and how.** A GTX 1070 through ANGLE and Direct3D 11, system Chrome driven headed
at 1440×900, ratio 1, unpaced, with the dev server on the same machine. The drive is
[`join.mjs`](join.mjs), and its header has the command: the board, then three entries
and exits. `main` is `dbbb9e2b`, which carries #1499; the branch adds the precompile.
[`readings-main.json`](readings-main.json) and
[`readings-branch.json`](readings-branch.json) are every reading the two drives took.

## What the join blocked on

*Link waits* sum the reads of a program's status or log that blocked over 2 ms, for the
conn view's programs; the HUD's Pixi programs, which link before the ground arrives on
both, are left out. *Worst frame* is the longest interval between the page's frames once
the room's ground had arrived.

| Entry | Link waits, main | Link waits, branch | Worst frame, main | Worst frame, branch |
| --- | ---: | ---: | ---: | ---: |
| First | 1,052 ms | 75 ms | 804 ms | 138 ms |
| Second | 57 ms | 60 ms | 128 ms | 75 ms |
| Third | 45 ms | 65 ms | 97 ms | 73 ms |

On `main` the first entry's 804 ms frame was the session's ground, its props and lines
linking in the draw, and a later 290 ms frame the first hulls' two programs. On the
branch the view links them with `renderer.compile` the moment they join the scene and
holds the canvas pass until the driver reports them ready: 124 frames in the first entry,
then 2 and 6. The page answers meanwhile and the canvas shows the frame it last drew.
Two programs an entry still link in the draw on the branch, a `MeshBasicMaterial` with a
`LineBasicMaterial` or a second `MeshBasicMaterial`, 60 to 75 ms between them, as the
later entries' three or four did on `main`. What makes them is not traced here.

The branch links 33 programs in the first entry against `main`'s 20, and 14 against 9 in
the others. `compile` reaches every material in the scene, the hidden ones included, so
it also links programs a frame later draws or none does. They link on the driver's
threads, not in a frame.

The frames over 50 ms before the ground arrives, 65 to 160 ms on both, are the travel's
end and the HUD mounting, with the HUD's Pixi programs. Nothing this change adds runs
before a session's ground does.

## Related

- [#1463's acceptance](../issue-1463/README.md), "Where the long frames are", which found
  both freezes
- [world-map.md](../../world-map.md) §7.6, the entry the frame is held through
