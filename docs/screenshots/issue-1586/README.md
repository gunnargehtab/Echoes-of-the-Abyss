# The prologue's strip, beside the orders panel

Evidence for [#1586](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1586): the
prologue in real time, headless at 1,440 × 900 and 100% UI scale, at T+00:46:

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url "http://localhost:5173/?mission=prologue-sorrowgate" --out <dir>
```

`prologue-strip.png` is the strip with nothing to build: no `NODULES`, `BERTHS` or `DRAW`
([ui-ux.md](../../ui-ux.md) §2), and the meter's second line reading `all 6 units · 0 loud`
beside the panel's `flight SIG 006 / 020` (§3). The frame before it is
[`03-two-sig-readings.png`](../issue-1577/03-two-sig-readings.png) in #1577's walk.

The debt gloss is not in a frame. It shows only while the flight owes a silence, and the
drive's moves under the arch did not dive. `silenceUnderWay.test.ts` drives the dive and holds
that the court charges every crossing.

## Related

[mission-sorrowgate.md](../../mission-sorrowgate.md) §9 · [ui-ux.md](../../ui-ux.md) §2, §3
