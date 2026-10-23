# Ground ink at the map's rim

Evidence for [#1556](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1556): from the
issue's own cameras, at the branch (`cut`) and with `PerspectiveView.inkBounds` forced to null
on the live conn view (`uncut`), which is how `main` drew. Headless, 1440×900, SwiftShader.

```bash
for map in ventfront-divide abyssal-rift-corridor; do
  node .claude/skills/run-game/scripts/drive.mjs --url "http://localhost:5173/?map=$map" \
    --out <dir>/$map --steps docs/screenshots/issue-1556/frames.mjs
done
```

The drive numbers its frames: `02-<map>-cut.png` and `03-<map>-uncut.png` were renamed below
for what they show.

| Frame | What it shows |
| --- | --- |
| `ventfront-reach-ring-uncut.png` | The fleet's reach ring rising past the pink rim into the void |
| `ventfront-reach-ring-cut.png` | The same ring ending on the rim |
| `corridor-storm-rings-uncut.png` | Two corner storm rings floating in the void at the horizon |
| `corridor-storm-rings-cut.png` | Only the storm rings' arcs on the map; the orange ring ends on the rim |

No frame shows the rim stroked in the reach ink. On a shipped map it takes a fleet that hears
the whole map, such as a hull at SIG 75 in trench water near the Rift Corridor's middle, and this
drive does not stage that. `rimClip.test.ts` stands in for it: on the canned
4 km map the fleet hears whole, the booted chart strokes the rim at all four corners in the
loudest ringed hull's ink and alpha.
