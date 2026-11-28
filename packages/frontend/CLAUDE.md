# packages/frontend/CLAUDE.md

What is true only inside the client. It loads for a session working here; the root
`CLAUDE.md` keeps what binds two or more packages — the wire, the per-package import
extensions, where constants live, and the rule that this side draws only what the server
has already resolved.

The shape of the package: a React shell over a two-canvas renderer — the three.js conn
view (the world) under a transparent PixiJS HUD, on one shared camera
(`EchoRenderer.setConn`). A terminal, not a simulation.

Outside the development-only Dream Loop study, the conn view lights its models with the
shared `MODEL_LIGHTING` rig and a static PMREM water environment, baked once per mounted
view, and tone-maps each material with ACES as it draws to the canvas (#974). Emission is
added back after the curve (`packages/frontend/src/game/modelLighting.ts`), held at white
along its hue by gate 3's lamp core (#1021), and unlit layers stay off it. A composer
undoes both: behind a `RenderPass` that feeds later passes no material tone-maps itself,
and `OutputPass` maps glow and unlit layers with the rest. So a full-screen pass is
specified in `docs/art-direction.md` before it is built, and the `material-design` skill
has the three.js rules. Two are built, each drawn after the canvas pass with no composer:
the lamp halo (`lampHaloPass.ts`), then the chromatic split (`chromaticSplit.ts`, #1003).
Each copy binds `READ_FRAMEBUFFER` with raw GL and rebinds `FRAMEBUFFER` after, since
three's cache never tracks READ, and each pass runs with `autoClear` off, restored after;
the halo's also clear with alpha 0. The split's copy is the encoded canvas, so its draw
writes texels back without `<colorspace_fragment>`. The view counts the frame whole:
`renderer.info.autoReset` is off and reset once a frame.

That is the Low graphics quality, the default. High (`highFrame.ts`, behind the Graphics
quality setting, in development since #1801) draws the same scene as two layers
(`docs/art-direction.md`, "Two layers, two laws"): the world layer into a linear
half-float target, one composite to the canvas that adds the water's light, runs the
curve and lays the world's depth, then everything else on the canvas exactly as Low
draws it. An object is the world pass's by its three layer (`WORLD_LAYER`); a material
drawn there outputs scene-referred light, and the fog chunk's High half only attenuates
(`water.ts`). The tactical layer is unchanged by construction: a mark, a lamp or the
survey ink never moves into the world pass. A mark stands bare on the lit world (#1801,
D2): nothing holds the world's light under one, and no pass knows where a mark is.
An own model's cladding is the world pass's at High (#1814), on a template of its own
(`rosterModels.ts` `highVariant`), so Low's is never patched. It takes the Lid's glow and
the pools beside the rig (`hullLight.ts`) and wears its navy's surface (#1811,
`navySurface.ts`). Its lamps, and a contact's whole model, stay in the tactical pass.
Each loud own hull throws a searchlight (#1836, `searchlights.ts`): one set of uniforms
for the page, read by the lit ground, the cladding and the scatter pass's cones, with its
shadow read from the ground's heights rather than rendered. It throws one from each lamp
its class carries (#1845, `hullLamps`): bow, mast, then a flood pair, six a frame with
every bow beam first. The fine snow inside a beam
is lit by the same uniforms (#1855, `beamMotes.ts`): one instanced cloud of the world
pass over a lattice fixed in the world, and never the canvas's snow. The crater's decorative
bodies draw from a High template too (#1837, `lifeLight.ts`), in the light a hull takes,
and its fry carry a point of their own in the world pass (`lifeGlow.ts`), as each
photophore seat of a deep fish does there in place of its stipple dot (#1857). A drifting
jelly is a lantern there and no lit body (`jellyLight.ts`): its file drawn as a membrane
that adds its light, blended and still the world pass's, over beads of light hung from
its lip. The far bloom over the crater's bowl is 120 more of that jelly (#1859), the last
slots of High's list on the fixture's one elliptical loop: no draw of its own, and a
softer wave of light, told to the membrane by where the river starts in its instances.
A comb jelly is the deep body, under 400 m (#1858, `combLight.ts`): a fainter membrane in
a second token, `comb-light`, whose eight comb rows its file marks are the light, as
ridges and as points hung along them in a cloud of their own, one more draw.
The manta is a lit body with three things more (#1867, `mantaWing.ts`): its skin is
smoothed across its belly and back, its wings stroke in the vertex program, and a face
that looks down takes the Lid's glow through the body by its thickness there. A
chimney's steam leaves the canvas wherever High draws, since #1853: `ventSmoke.ts`
draws it in the world pass as matter lit by the vent, the Lid and the beams, one plume
a stack. Past the survey knee the crater's floors also lose
light to the water over them (#1891, `water.ts` `waterColumnDensity`, on the fog sign's
green), the lit bake's alpha holds the glow its walls hide (`lidShade.ts`), and the ink
overlay fades by the same column: the one tactical draw High changes, by the owner's call.
The crater's ground also runs on past the map's edge there (`outerGround.ts`): one more
lit draw of the world pass, the edge's own ground read on, with no cell under it.

A world-light family's token is the active palette's (`palette.ts` `WORLD_LIGHT`, #1854),
at both qualities, and nothing copies one into a constant. The ember cloud reads it on its
5 Hz bucket, the steam and the smoke on a tick, and the view stands High's pools again when
the palette changes. A prop's file holds the standard token, so the layer lays the palette's
on its licensed emissive as it stands and again on that change (`environmentLayer.ts`
`wearWorldLight`).

## Tests run under a Vite shim

Two Vite idioms are build-time transforms, not runtime APIs: `import url from
'./thing.png'` and `import.meta.glob(...)`. Node has neither, so `packages/frontend`'s
test script passes loader hooks (`packages/frontend/test/support/viteAssets.mjs`) alongside
tsx. A hand-rolled `node --test` reaching `EchoRenderer` or `PerspectiveView` needs them,
or the import throws first.

Four rules hold over every test in `packages/frontend/test/`:

- **Boot the real class.** A test of a stub tests the stub.
- **Stub only what the runner genuinely lacks**, and model it rather than swallow it
  (`packages/frontend/test/support/`).
- **Assert counted work, never a stopwatch.** `AUDIO_BUDGET_MS` is wall clock; nodes
  built per tick is the assertion.
- **Assert what a doc section promises, never what the JSX says.** A test mirroring
  markup is a change detector; screenshots cover how it looks.

Why there is no jsdom is at the foot of `packages/frontend/test/support/screen.ts`.

Six production seams exist for these and have no other caller: an optional `Application`
on `EchoRenderer`, renderer/environment factories on `PerspectiveView.mount`, `Client` on `GameClient`,
`harness` on `GameCanvas` — which *constructs* the other three, so a GPU-less boot
without it stops at `mount()` — `devices` on `WorldBackdrop`, the same factories for the
board's world, and `listRooms` on `BrowseScreen`. All default to the real thing; none is a
feature.

## Words on screen

A string a player sees names what they see and do, never a doc section or an issue number
(#1883); `bindings.test.ts` holds the reserved-key reasons to it. An
objective's status word comes from `objectiveWords.ts`, which words a task, a rule and a
budget differently, and never from a table of its own.

Related: `CLAUDE.md` (the root file — the wire, import extensions, constants, CI) ·
`docs/graphics-standards.md` (the gates anything visual clears, screenshot included) ·
`.claude/skills/run-game/SKILL.md` (driving the real client headless)
