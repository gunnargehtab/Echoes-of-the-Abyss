# The mission log's foot and the hint line (#1762)

Evidence for [ui-ux.md §2](../../ui-ux.md#2-screen-layout): the hint line has a row of
its own, and the mission log's foot now stands on `HINT_ROW_UNITS` rather than 8 units
inside that row. Sorrowgate at 1,440 × 900 and 125% UI scale, one hull selected so the
hint runs under the log.

```bash
SETTINGS_JSON='{"uiScale":1.25}' node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?mission=prologue-sorrowgate' \
  --out docs/screenshots/issue-1762/after --steps docs/screenshots/issue-1762/frames.mjs
```

`before/` is the same run with the base commit's `App.css`. `02-corner-crop.png` is the
bottom-right 560 × 230 px of each frame.

| | Log's foot | Hint row's top | Foot in the row | Hint's end |
| --- | --- | --- | --- | --- |
| Before | 625 px | 615 px | 10 px | 1,078 px |
| After | 610 px | 615 px | 0 px | 1,078 px |

The log's left edge is at 1,000 px in both, so the hint's last clause, `SPACE silent`,
ran under the log's foot before and is whole after.
