# Dream-loop target: the conn view's home frame

Evidence for [#967](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/967): the locked
target the dream loop builds toward, how it was made, and what to watch for while the loop
runs.

![Baseline and the three Claude Design rounds](rounds.png)

## Files

| File | What it is |
| --- | --- |
| `target.png` | The locked target: round 3 of the Claude Design export, 1920×1080. |
| `target.html` | That export as downloaded. `render-target.cjs` turns it back into `target.png` byte for byte. |
| `baseline.png` | The game before the loop, in the same frame, HUD hidden. |
| `rounds.png` | The baseline and the three rounds, side by side. |
| `shoot.mjs` | A `run-game` steps module that shoots the loop's frame from the running game. |
| `render-target.cjs` | Renders a Claude Design export headless at 1920×1080, DPR 1. |

## The frame

- A solo match on the Ventfront Divide, from the Bathyarch Consortium seat, with the base as
  it opens.
- Camera: `window.__perspectiveCamera(1340, 1300, 1500, { yawDeg: 0, pitchDeg: 55, focusDepthM: null })`.
  That is a focus at x 1,340 m and z 1,300 m, a 1,500 dolly, 55° pitch, facing north,
  through the view's fixed 40° field of view.
- Viewport 1920×1080 at DPR 1. Wait 7 s for the GLBs to replace the baked sprites.
- No HUD toggle exists, so `shoot.mjs` hides every canvas after the first (the three.js
  world) and every DOM overlay.
- The Harvester works its field and moves between shots. Everything else holds still.

## Running the loop

1. Copy `target.png` to `.dream-loop/target.png`. That folder is gitignored scratch.
2. Register the skill as [optional-skills/README.md](../../../optional-skills/README.md)
   describes, and take the Pro workflow.
3. Each round, start the game with `.claude/skills/run-game/scripts/dev.sh start` and shoot:

   ```bash
   VIEW_W=1920 VIEW_H=1080 node .claude/skills/run-game/scripts/drive.mjs \
     --out .dream-loop/shots --steps docs/screenshots/issue-967/shoot.mjs
   ```

4. Judge each shot against `target.png`, as the skill's judge prompt says.

## How the target was made

Claude Design (`claude.ai/design`), three rounds in one conversation.

- **Template: Blank.** "3D object" is the prompt kit's single-model mode
  ([asset-prompts-3d.md](../../asset-prompts-3d.md)) and centres one model to orbit. The
  rest are interface, document or motion templates. There is no "Prototype → High fidelity"
  choice; guides that name one are out of date.
- **Model: Fable 5.1**, the series model (asset-prompts-3d.md, workflow rule 3).
- **No design system.** It carries UI tokens, and this frame has no UI (rule 5).
- **Attachments:** `baseline.png` and the
  [Bathyarch Harvester render](../../concept-art/renders/harvester-bathyarch.png), for
  material and light.
- **Size lives in the prompt.** Claude Design has no canvas setting.
- **Export as standalone HTML.** There is no PNG export, and a screenshot of the preview
  picks up browser zoom and display scaling. `render-target.cjs` renders the HTML instead.

The skill forbids "concept art" wording: the prompt asks for an in-engine screenshot.

Round 1, the prompt:

```text
Build one still frame: a real in-engine screenshot from the deep-sea RTS "Echoes of the Abyss", rendered with three.js (WebGL) on a single fixed 1920×1080 canvas. No UI, no HTML text, no orbit controls. It must render the identical frame on every load.

Start from the attached baseline.png. It is the game's current screenshot from exactly this camera. Keep its camera, framing, and the position and scale of every object. Make it look far better. Do not recompose it.

CAMERA (match the baseline exactly): PerspectiveCamera, 40° vertical FOV, pitched 55° below horizontal, facing north, focused on the seabed at frame centre.

SCENE (everything already in the baseline):
- A kelp-forest plateau about 700 m down. The Bathyarch Consortium's home base stands on it.
- Bastion, upper centre-left: a ribbed, riveted pressure dome with a lit cupola, an octagonal plated skirt with bolted-on modules and hatches, and a crane jib to its upper right with a lamp at the tip.
- Foundry, upper right: a boxy riveted hangar with twin gantry rails over a recessed launch bay.
- A Harvester idles just below the Foundry. A slim scout and two heavy, blunt Caisson line hulls sit in a row across the middle of the frame.
- The hulls hang in the water above the seabed. Each has a thin vertical plumb line down to a soft ground shadow.
- Along the top and right of the frame, the plateau edge breaks away into a trench of near-black water.

MATERIALS: welded, riveted steel plate, patchworked and pressure-scarred, rust bleeding from the seams, grime in the recesses. Rough, never glossy or plastic. Real normal detail on crisp low-to-mid-poly facets. Seabed: sculpted silt with current ripples, pressure-eroded stone outcrops, scattered boulders and low kelp clusters. Desaturated deep chlorophyll green (#0B241E) and cold stone; no rock brighter than #11161C.

LIGHT:
- A cold, dim ambient light, one low oblique key light and one hard cyan rim light (#35E0FF) catching every hull and structure edge.
- Faction light is sodium hazard amber (#F2B233): small work lamps, lit ports and the Foundry bay. The two Caissons run loud, so their deck floods burn. The scout is nearly dark. Light sits in points and seams, never in flooded areas; bloom stays tight around the emitters.
- Kelp tips carry dim grey-green points (#2E8C74). Never a glowing canopy.
- Water: one deep blue that only darkens with depth and distance, down to #03080E. Exponential-squared distance fog. Sparse marine snow sinks straight down.
- 85–90% of the frame is near-black. The lit seabed stays at 5–10% brightness. A slight vignette, and at most a 1 px chromatic split at the frame edges.

DO NOT include: HUD, range rings, selection marks, text or logos. No sunbeams, god-rays, caustics or water surface. No enemy ships, creatures or fish. No depth of field, motion blur or lens flare. No painterly or cinematic treatment: this is a game screenshot.
```

Round 2, a follow-up:

```text
Same scene, same camera, same layout. Fix only these:
1. Seabed: remove the diagonal stripe pattern. Replace it with sculpted relief: low silt dunes and current ripples running east–west, shallow scours around each rock, and enough height variation that the key light rakes across it. Keep it dark and desaturated (#0B241E).
2. Rocks: replace the round blobs with faceted, pressure-eroded stone, half-buried in silt, some clustered, a few flat slabs. No rock brighter than #11161C.
3. Kelp: low kelp clusters in drifts across the plateau, densest toward the left and bottom. Dark olive fronds (#2A2916) with dim grey-green tip points (#2E8C74).
4. Hulls: make the scout a slim riveted submarine, not a disc. Draw every plumb line as a thin, straight vertical line. Give every hull and structure a hard cyan rim light (#35E0FF) along its silhouette edges.
5. Over the trench, thin and soften the marine snow so the black water does not read as a starry sky.
Keep the darkness, the amber lights and everything else exactly as they are.
```

Round 3, a follow-up:

```text
Same scene, same camera, same layout. Two last fixes:
1. The cyan edges read as an outline drawn around every object. Make them a rim light instead: light from behind and above the scene, so the cyan catches only the top and far edges of each hull and structure, and fades to nothing on edges facing the camera or the ground. Thinner, and uneven along the edge the way real light is.
2. The rocks are still round blobs. Make them angular, faceted, pressure-eroded stone, half-buried in the silt, with a few flat slabs.
Keep everything else exactly as it is.
```

## Rounds

| Round | Got right | Left open |
| --- | --- | --- |
| v1 | The baseline's composition; a plated Bastion; amber ports | Diagonal stripes on the seabed; flat ground; blob rocks; almost no kelp; the scout a disc; zigzag plumb lines; no cyan rim; marine snow over the trench read as stars |
| v2 | Stripes, kelp, scout, plumb lines and trench fixed | Cyan drawn as an even outline round every object; rocks still blobs |
| v3 | Cyan as a rim light, thin and uneven on top and far edges; faceted rocks | A faint horizontal line pattern in the seabed, visible only at 2× |

[style-neon-noir.md](../../style-neon-noir.md) holds 85–90% of the frame dark. Measured as
the share of pixels under 10% luma:

| Frame | Mean luma | Under 10% luma |
| --- | --- | --- |
| baseline | 0.062 | 94% |
| v1 | 0.060 | 90% |
| v2 | 0.060 | 91% |
| v3, the target | 0.059 | 91% |

## Design calls taken

- **Rim light, not outline.** v2 drew the cyan as an even outline.
  [art-direction.md](../../art-direction.md) asks for a hard cyan rim light, and cyan is
  also the interface's voice, so an outline on every object could read as a selection. v3
  took the rim. Overturn it before the loop runs, not after.
- **Refine, don't recompose.** The target keeps the baseline's camera and layout, the
  skill's rule when a product already exists.

## What to watch while the loop runs

- **The target's hulls are simpler than the shipped GLBs.** Match light, material and
  ground. Do not reshape approved models to score on Details: the opt-in README keeps
  approved assets out of the prototype.
- **FPS needs a GPU.** Headless Chromium in a container drew this frame at 1.3 fps on
  software GL, so the skill's FPS exit cannot be judged there.
- **The world's rules still bind.** Water is one blue that only changes brightness, world
  light is points and seams, and the enemy never renders as a model. A judge pushing toward
  a pixel match must not talk the builder past them.

## Related

- [optional-skills/README.md](../../../optional-skills/README.md) — registering the
  opt-in skill.
- [optional-skills/dream-loop/SKILL.md](../../../optional-skills/dream-loop/SKILL.md) — the
  loop, its judge and its exit criteria.
- [art-direction.md](../../art-direction.md) — the camera and the light rig.
- [style-neon-noir.md](../../style-neon-noir.md) — the darkness budget and world-light rules.
- [graphics-standards.md](../../graphics-standards.md) — the gates a shipped result clears.
- [run-game](../../../.claude/skills/run-game/SKILL.md) — driving the game for each shot.
