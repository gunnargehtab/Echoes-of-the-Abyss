# The vignette and the sway

Evidence for [#1003](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1003):
the conn view's slight vignette and slow camera sway, specified in
[art-direction.md](../../art-direction.md#atmosphere-rides-on-top-in-screen-space).
Taken headless in a Linux container on Ventfront, so the frames come from SwiftShader:
they show what is drawn, and no millisecond here is a gate-6 reading.

```bash
node .claude/skills/run-game/scripts/drive.mjs --out <dir> \
  --url 'http://localhost:5173/?map=ventfront-divide' \
  --steps docs/screenshots/issue-1003/atmosphere.mjs
node docs/screenshots/issue-1003/pair.cjs <dir>
```

## The vignette

`vignette-on.png` is the opening view with the HUD; `vignette-off.png` is the same
view 3 s later with the vignette's layer hidden. `vignette-pair.png` sets the lower
world of each side by side, off on the left. The HUD, the hint line and every ring
keep their ink, because the layer sits under the glass.

Mean luma of the two frames, from `vignette-luma.json`:

| Region | Off | On | On ÷ off |
| --- | ---: | ---: | ---: |
| Centre, 400×300 | 26.47 | 26.06 | 0.984 |
| Left edge, 60×300 | 12.72 | 11.45 | 0.900 |
| Right edge, 60×300 | 11.00 | 10.11 | 0.919 |
| Lower-left world corner, 120×100 | 19.45 | 17.23 | 0.886 |

The centre is inside the clear 55%, so its 1.6% is the three seconds between the
frames: the sway, a gliding hull and the collars' crackle. The edges sink by about
a tenth.

## The sway

`sway-probe.json` is five probe readings 2.2–2.5 s apart with the sway on. Focus,
yaw, pitch and dolly hold still while the eye moves: 6 m across, 8 m along and 26 m
in depth, peak to peak, at a 2,600 m dolly. The 0.3% heave and 0.2% drift of a
1,893 m frame allow 7.6 m, 9.3 m and 29.7 m, with the heave's up axis tilted 55°, and
five samples need not land on the peaks. Draw calls stay at 55.
That the sway never turns the camera is held by
`packages/frontend/test/rendererSmoke.test.ts`, "sways by translation alone, and holds
still under reduced motion (#1003)".
