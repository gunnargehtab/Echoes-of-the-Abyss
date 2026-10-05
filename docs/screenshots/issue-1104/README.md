# The thermocline isobath

Evidence for [#1104](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1104). The
ground carries a major isobath at `THERMOCLINE.DEPTH_M`, 1,200 m, drawn as a double rule. The
specification is [map-visuals.md](../../map-visuals.md#4-survey-ink--spec) §4.

## Files

| File | What it is |
| --- | --- |
| `close-before.png`, `close-after.png` | The close camera, 1,500 m at 55°, over the 700 → 1,400 m step at cells (7, 7)–(8, 7), with `main`'s `surveyInk.ts` and this branch's |
| `close-pair-x3.png` | The same crop of both, before left: tripled, and stretched from 0–90 to 0–255 in both alike. A viewing aid, never a reading of brightness |
| `mid-after.png`, `low-after.png`, `survey-after.png` | The 4,000 m home dolly, a 15° low angle and the 18,000 m survey dolly, over the same point |
| `thermo.mjs` | The `--steps` module that framed them |

## How the frames were taken

A solo Abyssal Rift Corridor match, headless Chromium at 1440 × 900, ratio 1:

```bash
node .claude/skills/run-game/scripts/drive.mjs \
  --url 'http://localhost:5173/?map=abyssal-rift-corridor' \
  --out <dir> --steps docs/screenshots/issue-1104/thermo.mjs
```

The before set swapped `main`'s `surveyInk.ts` into the served tree between drives, then
restored it. No console error occurred.

## What they show

- **The close camera reads the rule.** In `close-pair-x3.png` the after frame carries two strokes
  4 px apart where the before frame has one minor line, and the gap between them is clear.
- **On a packed scarp it merges.** At the 4,000 m dolly the minors on the wall below the step
  stand about 5 px apart, near the rule's own spacing, and it is not told apart from them.
- **At the survey dolly no single ink line is legible** in `survey-after.png`.

## Gate 6

No draw call, triangle or texture fetch is added, so no on − off `avgGpuMs` pair was taken. The
ground's fragment gains about 15–20 operations: two distance chains, two smoothsteps, and a
multiply and a max. Over a full 1920 × 1080 view at ratio 1.5 that is near 0.02–0.03 ms on the
GeForce GTX 1070. Issue-1103's paired runs at one station differ by up to 0.08 ms on − off
([README](../issue-1103/README.md)), so a pair could not resolve it. The close camera at ratio
1.5 already reads 1.82–1.84 ms, over the 1.7 ms line
([#1114](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1114)), and this adds work
below that resolution there.
