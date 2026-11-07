# Free water: the rim ray banked for the opening (#1780)

Evidence for §5's ray as #1780 changed it
([free-water-slice.md §5](../../free-water-slice.md#5-place-to-kit-sheet-and-wildlife-licence),
the motion paragraph and "Life in the frames"). The ray rolls 30 degrees into its turn about
its body axis, stands at `765 / 2,158` when the match starts, and swings 250 ± 15 m (`RAY` in
`FREE_WATER_LIFE`, `packages/shared/src/constants.ts`; `decorationMatrix` in
`packages/frontend/src/game/freeWaterDecoration.ts`). The model is #1777's file, unchanged.
The owner chose the bank and the start on #1780, and the narrower swing when the banked
wingtip left §5's 200–300 m band. Gate 6 here also carries the GPU readings #1778 owed.

## Reproduce

Run the dev servers, then the loop module. It holds §9's opening pose and shoots it at six
match times across most of a loop, writing beside the frames the ray's loop angle, the share
of its plan the eye sees, its distance and its span on screen:

```bash
node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1780/after --steps docs/screenshots/issue-1780/loop.mjs
START_DEG=157 node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1780/before --steps docs/screenshots/issue-1780/loop.mjs
SETTINGS_JSON='{"reducedMotion":true,"reducedMotionChosen":true}' TIMES=0 HOLD_S=10 \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?study=free-water' \
  --out docs/screenshots/issue-1780/reduced-motion --steps docs/screenshots/issue-1780/loop.mjs
python -I docs/screenshots/issue-1780/sheet.py docs/screenshots/issue-1780
python -I docs/screenshots/issue-1780/body.py docs/screenshots/issue-1780/after
```

`before/` is `main` at `4abd233d`, whose seeded start put the ray 157 degrees round its loop
when the match began; `after/` and `reduced-motion/` are this branch. Every frame is the
GTX 1070 through Edge's ANGLE D3D11 at 1,440 × 900 and DPR 1, in the opening pose at
`709 / 1,710`, 1,200 m, 15 degrees, 300 m, `yawDeg` −34. The probe carries no match clock,
so `loop.mjs` reads the time off the ray's own loop angle, 1.2 degrees a second.

## The ray through a loop

[ray-loop.png](ray-loop.png), a link, crops every frame below at three times and at 1:1,
before above after.

| Match time | Before: loop, plan shown | After: loop, plan shown | What the after frame draws |
| --- | --- | --- | --- |
| T+15 s | [175°, 0.36](before/01-t015.png) | [318°, 0.75](after/01-t015.png) | A pale body against the dark water past the rim's edge |
| T+30 s | [193°, 0.36](before/02-t030.png) | [336°, 0.74](after/02-t030.png) | The same, on the far side of its loop |
| T+60 s | [229°, 0.34](before/03-t060.png) | [12°, 0.63](after/03-t060.png) | The same, past the far side |
| T+120 s | [301°, 0.32](before/04-t120.png) | [84°, 0.12](after/04-t120.png) | A pale crescent, swimming toward the eye |
| T+170 s | [1°, 0.33](before/05-t170.png) | [144°, −0.15](after/05-t170.png) | A dark silhouette on the paler rim floor, its belly to the eye |
| T+240 s | [85°, 0.36](before/06-t240.png) | [228°, 0.27](after/06-t240.png) | A faint sliver, swimming away from the eye |

"Plan shown" is the ray's back normal on the line to the eye: 1 is its whole plan face on, 0
edge-on, and a negative figure its belly. The loop angle runs clockwise from east, the near
side facing the eye at about 146 degrees and the far side at 326.

## What the frames show

`body.py` reads the body each frame draws: the largest group of pixels within 20 px of the
ray's projected point that stand more than 10 levels above the crop's median, snow excluded
by its blue cast, or with `--dark` more than 8 under it.

- **The first minute.** Before, the level ray draws 55 to 75 px of pale body, 16 to 20 px wide
  and 5 to 9 tall, at 1.7 to 1.8 times the rim floor behind it. After, the banked ray draws
  121 to 132 px, 13 to 19 px wide and 17 to 19 tall, at 2.5 to 4.2 times the water past the
  rim's edge: about twice the body, against water half as bright.
- **The rest of the loop is a trade.** Where it swims toward the eye the bank thins it to a
  44 px crescent, where the level ray drew 81 px on the same arc. On the near side it draws
  a 56 px dark silhouette at a third of the rim floor's luminance, rather than a pale shape.
  Where it swims away from the eye it is an 8 px sliver, where the level ray drew 55 px. The
  `--dark` reading at T+240 s, 183 px, is the rim's edge in the crop, not the ray.

## Motion and reduced motion

- **Motion.** The six after frames are one held camera through 240 s of match: the ray goes
  round its loop clockwise, its bank turning with it.
- **Reduced motion.** [reduced-motion/01](reduced-motion/01-t000.png) and
  [reduced-motion/02](reduced-motion/02-held.png), ten seconds apart, hold the ray at its
  start, 300 degrees round its loop and banked, showing the eye 0.71 of its plan: 104 px of
  pale body, and the 40 px box about it is pixel-identical between the two.

## No Kelp Labyrinth control

§9's sets carry an unchanged Kelp Labyrinth control; this one does not, because nothing it
touches runs on a shipped map. The bank and the authored start are poses of the fixture's
own list, built and ticked by `rebuildFixture` and `tickFixture`, which the layer enters only
when its look is `'free-water'` (`packages/frontend/src/game/environmentLayer.ts`). A shipped
map's props keep the heading-only matrices of the registry's scatter, which this change
leaves alone.

## What the probe read

The opening pose draws 44 calls and 568,596 triangles before and after: a bank is a
rotation in the instance matrix the ray already had, and the frame gains no part.

## Gate 6

`gpu.mjs` is `docs/screenshots/issue-1713/gpu.mjs`'s reading at the three stations that see
the ray, §9's opening pose first: unpaced, animation running, every window at least 240
samples, on the GTX 1070 through Edge's ANGLE D3D11. Each revision was read twice at each DPR,
interleaved by whole-tree checkout, and the tables give the mean of the two runs, in
[gpu/](gpu/) as `<revision>/dpr-{1,1.5}/run-{1,2}.json`; `table.py` prints them.

**#1778's ray**, owed by #1777: `no-ray` is `72dd2e73`, the commit #1778 started from, read with
`GPU_PROPS=290`, and `level-ray` its merge, `ce7c13ab`.

| Station | Calls | Triangles | DPR 1 GPU / queued ms | DPR 1.5 GPU / queued ms |
| --- | --- | --- | --- | --- |
| Opening pose | 43 → 45 | 568,010 → 568,596 | 1.32 / 1.21 → 1.33 / 1.25 | 2.14 / 2.05 → 2.16 / 2.07 |
| Home | 43 → 45 | 568,400 → 568,986 | 1.23 / 1.09 → 1.29 / 1.12 | 1.88 / 1.81 → 1.95 / 1.83 |
| Survey | 44 → 46 | 568,400 → 568,986 | 1.10 / 0.92 → 1.17 / 0.94 | 1.70 / 1.50 → 1.70 / 1.50 |

**This change**: `main` is `4abd233d` and `banked-ray` this branch.

| Station | Calls | Triangles | DPR 1 GPU / queued ms | DPR 1.5 GPU / queued ms |
| --- | --- | --- | --- | --- |
| Opening pose | 44 → 44 | 568,596 → 568,596 | 1.33 / 1.27 → 1.35 / 1.25 | 2.16 / 2.07 → 2.16 / 2.05 |
| Home | 44 → 44 | 568,986 → 568,986 | 1.53 / 1.12 → 1.27 / 1.11 | 1.89 / 1.81 → 1.92 / 1.81 |
| Survey | 45 → 45 | 568,986 → 568,986 | 1.21 / 0.93 → 1.21 / 0.94 | 1.67 / 1.51 → 1.67 / 1.50 |

The ray's 586 triangles and two calls move queued time by 0.00 to +0.04 ms; the bank moves it
by −0.02 to +0.01 ms. Two runs of one revision differ by up to 0.04 ms queued; unpaced time
scatters more, `main`'s home at DPR 1 reading 1.76 and 1.30 ms. Queue loads read 3.59 to
3.83 ms, each longer than the frame it measures, and the study's caps hold with room: 46 of
150 calls and 568,986 of 720,000 triangles at the most.

## Tests

`freeWaterDecoration.test.ts` holds the bank, the start and what the eye sees: the ray starts
at `765 / 2,158`, at every step of its loop its back leans 30 degrees toward the loop's centre
while its axis keeps its path, and through the first minute the opening's eye sees 0.62 to
0.76 of its plan, where the same path level shows less than 0.4. Its band test holds the
banked body inside §5's 200–300 m. Five controls, each a one-line swap, fail them: no bank,
the seeded start, the 30 m swing, a roll about the origin, and a bank to port.

## Related

[issue-1777](../issue-1777/README.md), the ray as #1778 placed it ·
[free-water-slice.md](../../free-water-slice.md) §5 and §7 ·
[asset-prompts-3d.md](../../asset-prompts-3d.md) Block 4
