# The tenders, named and sent

Evidence for [#1585](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1585): the
prologue's orders panel in real time, headless at 1,440 × 900, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" \
  --out <dir> --steps docs/screenshots/issue-1585/frames.mjs
```

| Frame | Clock | What it shows |
| --- | --- | --- |
| `station.png` | T+00:40 | The station gloss naming the two Harvester hulls as the tenders |
| `tender-one.png` | T+11:27 | Tender One's row, its reading underlined, its gloss naming the escort and the Concourse |
| `concourse-jump.png` | T+11:38 | That row pressed: the camera on the Concourse, which the chart does not yet label |
| `tender-two.png` | T+13:46 | Both tender rows and their glosses inside the panel; the withheld list is under its foot, as on `main` |

The same moments on `main` are `04-tender-reads-harvester.png` and
`05-concourse-jump.png` in #1577's walk (#1590).
