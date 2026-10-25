# The withheld list, inside the panel

Evidence for [#1593](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1593): the
prologue in real time, headless at 1,440 × 900 and 100% UI scale, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" \
  --out <dir> --steps docs/screenshots/issue-1593/frames.mjs
```

`tender-two.png` is T+13:47: four rows, both tender glosses and all five withheld reasons
inside the panel. The drive printed
`fit: {"overflowPx":0,"clientHeight":439,"listShown":true}`.

The same moment on `main` at `bec590f65`, with the server's own view rendered into the
shipped stylesheet, held the body to 313 px and overflowed it by 158 px. The withheld list
sat wholly under the foot ([ui-ux.md](../../ui-ux.md) §2).

| Change | Overflow at 1,440 × 900 |
| --- | --- |
| None | 158 px |
| The list folded by hand | 20 px |
| The station's met gloss dropped | 120 px |
| No row gap between a reading and its gloss | 126 px |
| That, and the room between strip and console as the only cap | 0 px |

At 150% and 200% scale the room itself is shorter than the panel's content.
