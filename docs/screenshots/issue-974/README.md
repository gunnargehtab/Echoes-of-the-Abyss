# Abyss Render Stack — first-increment checkpoint

**Not visually accepted.** Work paused at the user's request to save the run and
commit findings. The first lighting increment is implemented, but there has been
no independent critic round and no visual approval of the after frames.

## Decision and scope

The user chose an audit, graphics-rule updates and the first upgrade of
[#974](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/974), rather than
implementing its whole eight-part epic. The tutorial is the blueprint: its
0.75/1.8/1.6 ambient/key/rim rig becomes the shared production baseline, and both
standard matches and Sorrowgate receive ACES plus a static PMREM water environment.
Faction-specific surface work remains scoped. The development-only Dream Loop
study retains its existing lighting instead of becoming the production reference.

The authored target and ranked audit are in
[art-direction.md](../../art-direction.md#shared-model-lighting--abyss-render-stack).
No geometry, simulation, detection or gameplay numbers changed.

## Findings

- The production baseline at `1df288a` has no tone mapping, environment, shadow-map
  enable or post-processing composer. The offline portrait rig has all four.
- Bevel support already exists in `kit.mjs`; it needs coverage review, not a new
  primitive. All 108 source GLBs lack an occlusion texture.
- Most exported primitives already have UV0, but some kit UVs are placeholders.
  Attribute presence does not establish trim-sheet readiness.
- Source GLBs total 17,819,812 raw bytes and 2,211,283 default-gzip bytes.
  These are library totals, not an initial-load network measurement.
- Kelp sway and depth-graded water are already implemented; neither is camera sway.
  The opt-in Dream Loop material study is not the shipped production renderer.
- The historical 2.4 ms figure is not isolated GPU execution time. New material work
  adds no draws but still costs shading time.

Reproduce the asset counts with `node tools/render-stack/audit.mjs`.
The remaining seven upgrades still need linked follow-up issues; none was filed
before this checkpoint.

## Captured evidence

`before-standard` and `after-standard` are live Ventfront matches.
`before-tutorial` and `after-tutorial` are live Sorrowgate missions.
The same camera script captures home (55 degrees, 6,000 m), close (55 degrees,
1,800 m), low (12 degrees, 3,500 m) and survey (88 degrees, 18,000 m requested).
Sorrowgate clamps the survey distance to 14,087 m. All frames retain the HUD.
Each station records at least 240 frames from both painters.

Hardware: NVIDIA GTX 1070, ANGLE/Direct3D 11, headed Microsoft Edge, 1440 × 900,
development build with the backend on the same Windows machine.

| Scene | Before calls / triangles | After calls / triangles | Texture count before → after | After mean conn CPU ms, range over cameras |
| --- | --- | --- | --- | --- |
| Ventfront | 54–55 / 148,290 | 54–55 / 148,290 | 8 → 9 | 0.92–1.03 |
| Sorrowgate | 45–46 / 47,422 | 45–46 / 47,422 | 7 → 8 | 0.73–0.89 |

The retained environment is 344,064 bytes (RGBA half-float, no mip chain or depth
buffer). Steady-state draws and triangles are unchanged in the paired captures;
PMREM generation is one-time mount work, not included in these held stations.
The captures report approximately 60 fps and no browser console errors.
CPU submission times are not GPU timer-query measurements.

Raw observations: [standard before](before-standard/readings.json),
[standard after](after-standard/readings.json),
[tutorial before](before-tutorial/readings.json),
[tutorial after](after-tutorial/readings.json).

Close-frame pairs:
[standard before](before-standard/03-close.png) /
[standard after](after-standard/03-close.png);
[tutorial before](before-tutorial/02-close.png) /
[tutorial after](after-tutorial/02-close.png).

The repository's pre-tool hook rejected image viewing with an error. The user
attached the standard before frame, which was visible in the conversation; the
after frame and tutorial pair were not visually inspected. Capture success and
the table above therefore do **not** constitute art approval. Quiet/loud interaction
evidence, other faction/palette coverage and review of all camera pairs remain owed.

## Reproduction and remaining acceptance

Use the `run-game` skill to start the servers. On Windows, this run used an owned
`npm run dev` process after confirming both ports were free, because Bash was
unavailable. Do not rebuild shared or run gates during a capture.

```powershell
$env:CAPTURE_DIR='docs\screenshots\issue-974\after-standard'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge `
  --url 'http://localhost:5173/?map=ventfront' --out $env:CAPTURE_DIR `
  --steps tools\render-stack\capture.mjs
```

For the tutorial use `?mission=prologue-sorrowgate` and a separate output directory.
For the original pictures run the same capture script against `1df288a`.

Frontend type-check passed. The focused model-lighting, renderer-smoke, loudness
and GameCanvas suite passed **102 tests**. A full `npm run gates` was launched;
its result must be checked before this checkpoint is presented as gate-clean.
No critic has reviewed this increment. Resume with the missing evidence, file the
scoped follow-ups, run all gates, then submit the authored target and exact diff to
a fresh `loop-critic` before opening the first-increment PR.

## Related

- [Art direction](../../art-direction.md)
- [Graphics gates](../../graphics-standards.md)
- [Tutorial blueprint](../../visual-reboot.md)
