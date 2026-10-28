# The orders panel, at every scale

Evidence for [#1634](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1634): the
prologue in real time, headless, read at four screens and five UI scales once Tender Two loads
at 13:40, driven by `frames.mjs`:

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" \
  --out <dir> --steps docs/screenshots/issue-1634/frames.mjs
```

Each cell is the body's overflow, then the scale the HUD drew at and the panel's type as drawn
on screen. Every case shows all four rows and the withheld list, open, and none scrolls
([ui-ux.md](../../ui-ux.md) §2, §11).

| Screen | 100% | 125% | 150% | 175% | 200% |
| --- | --- | --- | --- | --- | --- |
| 1,440 × 900 | 0 · 1.00 · 1.00 | 0 · 1.25 · 1.12 | 0 · 1.50 · 1.00 | 0 · 1.54 · 1.00 | 0 · 1.54 · 1.00 |
| 1,366 × 768 | 0 · 1.00 · 1.00 | 0 · 1.25 · 0.90 | 0 · 1.32 · 0.85 | 0 · 1.32 · 0.85 | 0 · 1.32 · 0.85 |
| 1,920 × 1,080 | 0 · 1.00 · 1.00 | 0 · 1.25 · 1.12 | 0 · 1.50 · 1.22 | 0 · 1.75 · 1.27 | 0 · 1.85 · 1.20 |
| 1,280 × 720 | 0 · 1.00 · 0.96 | 0 · 1.23 · 0.80 | 0 · 1.23 · 0.80 | 0 · 1.23 · 0.80 | 0 · 1.23 · 0.80 |

On `main` at `dbc16b32c`, the server's view at 13:40 drawn by the real `MissionPanel` in the
shipped stylesheets, headless and uncommitted as #1593's table was, overflowed in fourteen, by up to 262 px at
1,280 × 720 and 200%. Only the 100% column fitted on every screen but 1,280 × 720, which was
40 px over, plus 1,440 × 900 at 125% and 1,920 × 1,080 at 125% and 150%.

`yield-1366x768-125.png` is the panel's type yielding to 0.9x at 125%, a scale the window
carries. `held-1366x768-200.png` is the setting at 200%, drawn at the 132% the window holds it
to.
