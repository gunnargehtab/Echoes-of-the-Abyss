# Abyss Render Stack — first-increment checkpoint

The first lighting increment, with one correction found on review: the faction glow
is added after tone mapping (see [Glow after tone mapping](#glow-after-tone-mapping)).
Visually approved by the owner on GTX 1070 frames.

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
The remaining seven upgrades are filed as #1001–#1007 and linked to #974.

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

The first run could not view its own frames: a pre-tool hook rejected image reads
on that Windows machine. Every camera pair was later reviewed from a Linux container,
which is how the faded glow below was found.

## Glow after tone mapping

ACES on the summed colour faded the Consortium's amber lamps toward cream. Bright
pixels (max channel above 0.8, world area above the HUD) lost most of their
saturation. GTX 1070 frames, with the container's SwiftShader reading in brackets:

| Ventfront camera | No tone mapping | ACES on everything | ACES on surfaces, glow after |
| --- | --- | --- | --- |
| Home | 0.65 | 0.40 (0.41) | 0.62 (0.67) |
| Close | 0.66 | 0.39 (0.38) | 0.64 (0.67) |
| Low | 0.64 | 0.53 (0.58) | 0.56 (0.69) |

The low camera has few bright pixels, and tone-mapped surface highlights are among them,
so it moves least. The owner chose to tone-map surface light only and add emission back
afterwards (`keepGlowOutsideToneMapping` in `modelLighting.ts`, on every hull's and
structure's cloned lamp materials, and on glowing environment props). Three.js's Neutral
curve was also measured on SwiftShader: 0.52 at the close camera, with amber shifted
toward peach. The glow term reaches the screen as it did before this increment, so gate
3's resting brightness is unchanged by construction.

[`after-glow-standard`](after-glow-standard/03-close.png) and
[`after-glow-tutorial`](after-glow-tutorial/02-close.png) are the GTX 1070 frames, with
[standard readings](after-glow-standard/readings.json) and
[tutorial readings](after-glow-tutorial/readings.json). The owner approved them.
[`aces-container`](aces-container/03-close.png) holds the SwiftShader ACES frames used to
diagnose the fade; their frame times are not valid. Every station held about 60 fps at
54–55 calls and 148,290 triangles (Ventfront) or 45–46 calls and 47,422 triangles
(Sorrowgate), with conn CPU 0.61–1.03 ms on average. Every capture, the 1df288a
baseline included, shows one slow frame at the low camera (22–31 ms, almost all in
the conn view). This run's was 50.5 ms; it is not new to this change.

## Quiet and loud own-unit readings

[art-direction.md](../../art-direction.md#shared-model-lighting--abyss-render-stack) asks this
increment's evidence for quiet and loud own-unit readings. They were taken afterwards by
`tools/render-stack/lamps.mjs`, on `ecbc9a17` with the reading's development-only hook
added. It frames one own hull at a 500 m dolly and 55° pitch, stages each state with the
player's own keys, and reads it twice: the strengths the game applied, through the hook, and
a crop of the hull with the HUD hidden. Every lamp sat exactly on the runtime's curve in
`glow.ts`, `rest × clamp(e^((SIG − rest) / 14), 0.05, 6)`, with its glow added after the
tone curve. GTX 1070, headed Edge, 1440 × 900.

| Hull | State | SIG | Lamp factor | Max v | Pixels over 0.8 | Brightest 1 %: hue, saturation |
| --- | --- | --- | --- | --- | --- | --- |
| Caisson, Consortium | at rest | 64 | 1 | 1.00 | 557 | 39.7°, 0.71 |
| Caisson | silent (Space) | 8 | 0.05, the floor | 0.40 | 0 | 44.9°, 0.45 |
| Light Scout, Consortium | at rest | 6 | 1 | 1.00 | 93 | 58.3°, 0.62 |
| Light Scout | engine off (Q) | 1.75 | 0.74 | 1.00 | 93 | 57.4°, 0.66 |
| Light Scout | pinging (P) | 95 | 6, the cap | 1.00 | 93 | 57.8°, 0.29 |
| Light Scout, Commune (Sorrowgate) | at rest | 6 | 1 | 1.00 | 5 | the water's |
| Light Scout, Commune | silent (Space) | 3.5 | 0.84 | 0.93 | 5 | the water's |
| Light Scout, Commune | engine off (Q) | 1.75 | 0.74 | 0.89 | 5 | the water's |

The Consortium's lamp ink is `#F2B233`: hue 39.9° as stored, 28.9° in linear light. The
Commune's is `#8FE36B`: 102° and 107.7°.

- **The Caisson keeps its ink loud and goes dark quiet.** Its brightest pixels at rest sit
  0.2° from the amber ink, and its rest-minus-silent emission, differenced in linear light,
  sits 1° from the ink's linear hue (29.9° against 28.9°). Running silent leaves a maximum of
  0.40 and nothing over 0.5, so the 0.05 floor does not leave a silent hull glowing.
- **The Consortium scout's lamp does not encode its loudness.** It rests at 3.5 times its
  ink, so its red and green stay past 1 at every state the scout reaches. With its engine
  off (×0.74) it is as bright as at rest: the same 93 pixels over 0.8 and 85 clipped, and red
  unchanged. The ping (×6) can raise only blue, which whitens it (saturation 0.62 to 0.29),
  and its differences are teal and blue for the same reason. Gate 3's "glow encodes
  loudness — always" does not hold for this hull (#1021). Its resting strength is the model's own,
  kept through the recolour (`packages/frontend/src/game/rosterModels.ts`), and #1001
  decides whether glow is compressed.
- **Sorrowgate's quiet side holds.** Its Commune scout shows five pixels over 0.8 at rest,
  falling to a maximum of 0.89 with its engine off, and its rest-minus-engine-off emission
  is green (114.9° against the ink's linear 107.7°). Sorrowgate strikes the ping, so the
  loud side is the standard match's. At the owner's call there is no scripted dive, which
  would breach its silence order, and no reading at `1df288a`.

Frames, HUD-free crops and each state's numbers: [standard](lamps-standard/lamps.json),
[tutorial](lamps-tutorial/lamps.json).

## Reproduction and remaining acceptance

Use the `run-game` skill to start the servers. On Windows, this run used an owned
`npm run dev` process after confirming both ports were free, because Bash was
unavailable. Do not rebuild shared or run gates during a capture.

```powershell
$env:CAPTURE_DIR='docs\screenshots\issue-974\after-standard'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge `
  --url 'http://localhost:5173/?map=ventfront-divide' --out $env:CAPTURE_DIR `
  --steps tools\render-stack\capture.mjs
```

For the tutorial use `?mission=prologue-sorrowgate` and a separate output directory.
For the original pictures run the same capture script against `1df288a`. The lamp
readings are `--steps tools/render-stack/lamps.mjs` against a development build.

Frontend type-check passed. The focused model-lighting, renderer-smoke, loudness
and GameCanvas suite passed **102 tests**. The full `npm run gates` passed 11 of
12 gates; documentation lint caught an issue reference starting a line as a heading.
That wording was corrected in the checkpoint follow-up.
Captured on the GTX 1070 and approved by the owner.

## Related

- [Art direction](../../art-direction.md)
- [Graphics gates](../../graphics-standards.md)
- [Tutorial blueprint](../../visual-reboot.md)
