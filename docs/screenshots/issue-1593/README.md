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

The table is not from a drive. It is an uncommitted headless render: the server's own view
at T+13:40 (`Match` on the prologue, seed 1) drawn by the real `MissionPanel` in the shipped
stylesheets. On `main` at `bec590f65` it held the body to 313 px and overflowed it by 158 px. The withheld list
sat wholly under the foot ([ui-ux.md](../../ui-ux.md) §2).

| Change | Overflow at 1,440 × 900 |
| --- | --- |
| None | 158 px |
| The list folded by hand | 20 px |
| The station's met gloss dropped | 120 px |
| No row gap between a reading and its gloss | 126 px |
| That, and the room between strip and console as the only cap | 0 px |

The room between the strip and the hint line is itself shorter than this panel's content
in six measured cases: 1,440 × 900 at 150% and 200% (55 and 161 px over), 1,366 × 768 at
125%, 150% and 200% (77, 143 and 227 px), and 1,920 × 1,080 at 200% (71 px).
