# WebGPU and TSL — a feasibility note

*Box 8 of [#974](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/974), written
for [#1007](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1007).* This is the
reading a migration decision is taken from, and it takes none. It lists what moving the conn
view to `WebGPURenderer` and TSL would touch, what each shader patch becomes, and where the
new renderer behaves differently enough to break a SPEC. [art-direction.md](art-direction.md)
row 8 defers the migration until that decision. Nothing here changes the shipped renderer.

**Read against** three **r169**: `packages/frontend/package.json` asks for `^0.169.0` and
`node_modules/three` resolves 0.169.0. The client is read at `9e3bfae`. Every renderer fact
below names a file under `node_modules/three/src`. A migration on a later release re-reads
each one there.

## The answer

Every patch has a TSL equivalent, and none is hard to write. The cost is elsewhere. Under
r169's WebGPU renderer, three things the SPEC depends on change underneath the patches:

1. **Tone mapping belongs to the frame, not the material.** No material can opt out of the
   curve or add its glow after it, and the shared rig's SPEC and gate 3 require both.
2. **A point is one pixel.** Marine snow, the public-life stipple and the vent embers all
   draw sized points.
3. **The halo's depth copy fails on the 4× canvas.** WebGPU cannot copy a multisampled depth
   into a single-sampled texture, so r169's copy has nothing to resolve it with.

Each has a route through, below. The first holds gate 3 only if every material carries its
own curve; the second costs gate 6 triangles, and the third a call or a target. So the
migration is not a renderer-constructor swap, as row 8 says. Nor is it a port, patch by
patch: it changes how every material in the conn view ends, and it redraws three layers as
geometry.

## What depends on WebGL today

### The eight `onBeforeCompile` patches

Five ship; three belong to the development-only Dream Loop study. Each string-replaces a
`#include <…>` line of three's built-in GLSL and keys its program apart with
`customProgramCacheKey`. Four chain onto an earlier hook; four replace it.

| # | Site | Patches | Rewrites | What it draws |
| --- | --- | --- | --- | --- |
| 1 | `surveyInk.ts:305`, `installSurveyInk` | The ground's `MeshBasicMaterial`; replaces | vertex `common`, `begin_vertex`; fragment `common`, `color_fragment` | Isobaths and coastlines inside the ground's own shader ([map-visuals.md](map-visuals.md) §4) |
| 2 | `tutorialLook.ts:101`, `installSurface` | Pelagia hull and Sorrowgate prop `MeshStandardMaterial`s; chains | vertex `common`, `begin_vertex`; fragment `common`, `color_fragment`, `roughnessmap_fragment`, `normal_fragment_maps` | Triplanar laminate and stone: shade, roughness and a derivative bump ([visual-reboot.md](visual-reboot.md)) |
| 3 | `tutorialLook.ts:189`, `installGroundSurface` | Sorrowgate's ground, after #1; chains | fragment `common`, `color_fragment` | Paving, shaded before the ink |
| 4 | `modelLighting.ts:88`, `keepGlowOutsideToneMapping` | Own lamp clones (`rosterModels.ts:577`) and glowing props (`environmentModels.ts:246`); chains | fragment `tonemapping_fragment` | Gate 3's pixel half: the curve on surface light only, emission added after it and scaled along its hue |
| 5 | `environmentModels.ts:128`, `patchSway` | Kelp prop materials; replaces | vertex `common`, `begin_vertex` | Object-space sway before the instance matrix, phased by each instance's translation |
| 6 | `dreamLoop.ts:25`, `installDreamLamp` | Dev only; replaces | fragment `opaque_fragment` | Lamp light compressed by its peak |
| 7 | `seabedDetail.ts:330`, `installGroundDetail` | The ground, dev only until promoted, after #1; chains | fragment `common`, `color_fragment` | Silt dunes, ripples, scours and grain, from a lattice texture, shaded before the ink |
| 8 | `dreamLoop.ts:60`, `installDreamSteel` | Dev only; replaces | vertex `common`, `begin_vertex`; fragment `common`, `color_fragment`, `normal_fragment_maps`, `roughnessmap_fragment`, `opaque_fragment` | Plate seams, rivets and a rim term |

All paths are under `packages/frontend/src/game/`.

### The same dependency without a hook

Row 8 names the water, which is not an `onBeforeCompile` patch. These sites are bound to
WebGL just as firmly:

| Site | What it is | What binds it to WebGL |
| --- | --- | --- |
| `water.ts:275`, `installWaterFog` | Rewrites three's global `fog_pars_vertex`, `fog_vertex`, `fog_pars_fragment` and `fog_fragment` chunks | `ShaderChunk` feeds only WebGL programs |
| `water.ts:380` and `:546` | The backdrop and the marine snow, two `ShaderMaterial`s | GLSL source; the snow draws sized points |
| `faunaStipple.ts:215` | The public-life stipple, one `ShaderMaterial` per kind | GLSL source, sized points |
| `lampHaloPass.ts:244`, `:267`, `:276`, `:290` | The halo's splat, copy, blur and composite `ShaderMaterial`s | GLSL source |
| `lampHaloPass.ts:515` and `:530` | The halo's depth blit and capability probe | Raw WebGL 2 calls, and a target's `__webglFramebuffer` |
| `PerspectiveView.ts:1536` | The vent embers' `PointsMaterial`, size 55, attenuated | Sized points |
| `PerspectiveView.ts:381` and `:750` | The renderer and its context-loss listeners | `WebGLRenderer`, `webglcontextlost` |
| `gpuTimer.ts:97` | Gate 6's GPU reading | `EXT_disjoint_timer_query_webgl2` |
| `modelLighting.ts:46` | The environment's PMREM bake | `PMREMGenerator` takes a `WebGLRenderer` |
| `dreamLightHalos.ts:62` | The Dream Loop's own halos, dev only | GLSL source, sized points |

Five frontend tests read shader source as text: `modelLighting.test.ts`,
`tutorialLook.test.mjs`, `water.test.ts`, `faunaStipple.test.ts` and
`faunaAgentStipple.test.ts`. A port rewrites what they hold, not only the code they test.

## What r169's WebGPU renderer does differently

### Patches are dropped without an error

`WebGPURenderer` draws only node materials. `NodeLibrary.fromMaterial`
(`renderers/common/nodes/NodeLibrary.js`) converts a built-in material by copying every
property onto its node class, `onBeforeCompile` included, and nothing outside
`WebGLRenderer.js` ever calls that hook. `customProgramCacheKey` is still read
(`renderers/common/RenderObject.js:285`), so a patched material compiles as its unpatched
self under its own key. A `ShaderMaterial` has no node class: `nodes/core/NodeBuilder.js:1307`
logs that it "is not compatible" and draws a default `NodeMaterial` instead.

The fallback is no escape. Without WebGPU, `WebGPURenderer` runs its own WebGL 2 backend
(`renderers/webgpu/WebGPURenderer.js`), which builds the same node materials and drops the
same patches.

### Tone mapping is one pass over the frame

With tone mapping on, or an sRGB output, r169 draws the scene into a half-float target. One
output pass then applies the curve and the encode to the whole frame (`_getFrameBufferTarget`
in `renderers/common/Renderer.js`; `renderOutput` at `renderers/common/nodes/Nodes.js:452`).
The `toneMapped` flag is read only on the WebGL side. Under the renderer's own setting:

- every unlit layer takes ACES, which the shared rig's SPEC forbids
  ([art-direction.md](art-direction.md#shared-model-lighting--abyss-render-stack));
- a lamp's emission is summed before the curve, so ACES fades it toward white, which gate 3's
  lamp core exists to prevent;
- every transparent layer blends in the linear target, where today it blends in encoded
  space on the canvas. The stipple's dot gains and the halo's screen composite are set in
  encoded space, and so is the loudness ladder that measures them
  ([map-visuals.md](map-visuals.md) §5). The survey ink is not among them: it mixes inside the
  ground's opaque shader with its own encode and decode (`surveyInk.ts:280`), so only the
  curve in the first bullet reaches it.

The route through leaves the renderer at `NoToneMapping` with a linear output, so no output
pass runs. Every conn-view material then ends in its own `outputNode`: a lit surface through
`toneMapping()` and then `workingToColorSpace()`, an unlit layer through the encode alone.
r169 ships both in TSL (`nodes/display/ToneMappingNode.js`, `nodes/display/ColorSpaceNode.js`).
The canvas then holds encoded values, and blending stays where the ladder measured it. The
cost is that the curve stops being a renderer setting and becomes a line every material must
carry. A material without one writes linear values to an encoded canvas, and draws too dark.

### Fog mixes before the encode

r169 mixes fog in `NodeMaterial.setupOutput` (`materials/nodes/NodeMaterial.js:509`), in
working space, before any output conversion. WebGL mixes it after `colorspace_fragment`, in
encoded space, and the water ramp is encoded to match (`water.ts`, #1016). A `scene.fogNode`
built with `fog(colorNode, factorNode)`, its colour the ramp at the fragment's world height,
is as global as the chunk rewrite. It reaches every material with `fog` on, but it fades in
linear, so the far seabed grades differently. Under the output route, the water fog moves
into each `outputNode`, after the encode, with `fog` off on the material. It stops being one
patch.

### A point is one pixel

r169 stores `PointsNodeMaterial.sizeNode` and never reads it. Its WebGL 2 backend writes
`gl_PointSize = 1.0` (`renderers/webgl-fallback/nodes/GLSLNodeBuilder.js:811`), and WebGPU's
point-list primitive has no size at all (the WebGPU specification's `"point-list"`
topology draws each vertex as one point). Four layers draw sized points: marine snow (7,000
motes), the public-life stipple (432 dots a Tetherjelly field, 72 a Lampfry shoal), the vent
embers (400 at `VENT_EMBER_CAP`) and the Dream Loop's halos.

Each becomes an instanced quad: `InstancedPointsNodeMaterial`
(`materials/nodes/InstancedPointsNodeMaterial.js`), or a sprite node material on an instanced
mesh, with `uv()` in place of `gl_PointCoord`. Each cloud keeps its one draw call. The
triangles do not hold: the snow alone becomes 14,000, where gate 6 says the water spends
none. Ventfront read 143–148 k against the 250 k ceiling (#836).

### The halo's depth copy

Step 1 of the halo blits the canvas's 4× multisampled depth into a single-sampled
`DEPTH24_STENCIL8` texture, which resolves it. r169's equivalent is
`copyFramebufferToTexture`, which copies the canvas depth with `copyTextureToTexture`
(`renderers/webgpu/WebGPUBackend.js:1421`). The WebGPU specification lets that copy run only
between textures of equal sample count, and core WebGPU has no depth resolve, so it fails here
only because the canvas is 4× MSAA. The copy becomes one of two things:

- a full-screen draw that reads the multisampled depth and writes depth: one call toward
  gate 6's 150, and new GPU time against its 0.40 ms bound at ratio 1;
- a canvas pass drawn into a target whose depth texture the splats sample directly. That
  adds a drawing-buffer-sized colour target and a full-screen copy of it onto the canvas.

The rest of the halo ports. Half-float colour targets are core in WebGPU, and the composite's
stencil test is read from the material (`renderers/webgpu/utils/WebGPUPipelineUtils.js:73`).
The capability probe becomes a check of the adapter's features rather than of `STENCIL_BITS`
and `checkFramebufferStatus`.

### Start-up, timing and loss

- **Start-up.** `WebGPURenderer.init()` is asynchronous, and a `render()` before it warns and
  falls back to `renderAsync` (`renderers/common/Renderer.js:485`). `PerspectiveView.mount`
  returns a boolean synchronously today.
- **Timing.** Gate 6's GPU time comes from `EXT_disjoint_timer_query_webgl2`. r169's
  equivalent is `trackTimestamp: true`, which needs the adapter's `timestamp-query` feature
  (`renderers/webgpu/WebGPUBackend.js:111`). The backend resolves the timestamps only inside
  `renderAsync()` (`renderers/common/Renderer.js:394`), so the reading also needs the
  asynchronous frame above. Every GPU reading in gate 6 is a WebGL reading and would be taken
  again.
- **Loss.** r169's WebGPU backend listens for no device loss. The halo's restore path listens
  for `webglcontextrestored`.
- **Environment.** The PMREM moves from `PMREMGenerator(renderer)` to r169's node path
  (`pmremTexture`; `renderers/common/extras/PMREMGenerator.js`), and gate 6's 1 MiB bound on
  the retained target is measured again.
- **Counting.** r169's common `Info` keeps `autoReset` (`renderers/common/Info.js`), so gate
  6's whole-frame count carries over.

### A derivative in a branch

WGSL rejects `fwidth`, `dpdx` (TSL's `dFdx`) and implicitly differentiated texture samples
in non-uniform control flow by default. r169 turns that check off in every fragment shader outside Firefox
(`diagnostic( off, derivative_uniformity )`,
`renderers/webgpu/nodes/WGSLNodeBuilder.js:157`). So a TSL `If` wrapped around a derivative
compiles on Edge, gate 6's named browser, and gives an undefined result there, as in GLSL; only
Firefox refuses it. The survey ink already takes its derivatives outside every branch
(`surveyInk.ts:252`), and every other patch takes its own in straight-line code.

## Each patch in TSL

What each becomes against r169's node API. All of them assume the output route above.

1. **Survey ink.** A `colorNode` on the ground's `MeshBasicNodeMaterial`. `surveyFloor` is
   `attribute('surveyFloor', 'float')` and the ground position is `positionWorld.xz`, each
   passed with `.varying()`. `texelFetch` is `textureLoad(cells, ivec2)`. The constant array
   of majors unrolls in TypeScript, since `MAJOR_ISOBATHS_M` is known when the material is
   built. **The trap:** r169 multiplies vertex colours *after* `colorNode`
   (`materials/nodes/NodeMaterial.js:314`), so the acoustic veil would dim the ink, which
   [map-visuals.md](map-visuals.md) §4's rule 5 forbids. The ground turns `vertexColors` off
   and multiplies `attribute('color')` into its base itself, before the ink.
2. **Sorrowgate surface, hulls and props.** A `colorNode` for the shade and seams and a
   `roughnessNode` for the variation. The object-space position is
   `positionGeometry.mul(uniform(metres)).varying()`, and the triplanar sample is three
   `texture()` calls weighted by the normal. r169's `bumpMap` samples a texture at offset UVs
   (`nodes/display/BumpMapNode.js`), so it cannot take the computed height; the patch's own
   derivative perturbation ports line for line into a `normalNode` with `dFdx` and `dFdy`.
3. **Sorrowgate ground.** Part of the ground's one `colorNode`. Installed after the ink but
   shading before it, the patch's ordering becomes the order of two calls: `ink(surface(base))`.
   A node graph composes by calling, so there is no hook chain to keep straight.
4. **Glow after tone mapping.** The lamp material's `outputNode`: the curve on
   `output.rgb − emissive`, then `emissive` added, then the sum divided by its brightest
   channel wherever that passes 1, then the encode. r169 exposes the emissive term as the
   `emissive` property node (`nodes/core/PropertyNode.js:62`). It is exact for
   `MeshStandardNodeMaterial` for the reason it is exact today.
5. **Kelp sway.** A `positionNode`, with a trap: r169 applies `positionNode` after the
   instance matrix (`materials/nodes/NodeMaterial.js:295`), and the sway is object-space
   before it, so that each instance's yaw turns the current. The node starts from
   `positionGeometry`, adds the sway, and applies the instance matrix itself, built as
   `nodes/accessors/InstanceNode.js` builds it: `buffer(…, 'mat4', count).element(instanceIndex)`
   up to 1,000 instances, instanced attributes past that. The matrix's translation gives the
   phase, as today. Time and amplitude are `uniform()`s, and `swayWeight` is an attribute.
6. **Dream Loop study (#6–#8).** `outputNode` for the lamp compression and the steel's rim,
   `colorNode` for the dune and plate shading, `roughnessNode`, and a `normalNode` for the
   plate height. It is development-only, so a migration may drop it rather than port it.

Beyond the patches:

- **The water fog** becomes `scene.fogNode`, or a line in each `outputNode` (above).
- **The backdrop** becomes a node material whose `vertexNode` writes clip space, as the GLSL
  does: two triangles. r169's `scene.backgroundNode` would do it too, but draws a 32 × 32
  sphere (`renderers/common/Background.js:77`), 1,984 triangles where today's backdrop has
  two.
- **The snow, the stipple and the embers** become instanced quads (above).
- **The halo** becomes four node materials whose `vertexNode`s write clip space, so its
  full-screen draws still never use the conn camera.

## What the gates say

- **Gate 3** holds only under the output route. Under the renderer's own tone mapping, the
  lamp core is lost.
- **Gate 6** holds WebGL readings; a migration takes every one again. Some costs are known in
  advance. The quads add two triangles a point: 14,000 for the snow, 800 for the embers at the
  cap, 864 a Tetherjelly field and 144 a Lampfry shoal. The halo's depth copy costs either one
  call, or a drawing-buffer-sized target and a full-screen copy. The PMREM's 1 MiB bound and
  every GPU time are read again.
- **Gate 8** is untouched. There is still one camera, and every full-screen draw writes clip
  space.

## What the decision weighs

This note is the input, not the call. A migration touches the eight patches, the global
fog-chunk rewrite, eight shader-material sites (seven ship), one points material, the
renderer, the timer, the PMREM bake, and the halo's depth blit and probe. On top of that it
adds an `outputNode` to every conn-view material. Against that cost, none of
the other seven upgrades in [art-direction.md](art-direction.md)'s ranked audit needs WebGPU;
the audit says so.

## Related

- [art-direction.md](art-direction.md) — the shared rig and the lamp halo SPECs, and the
  ranked audit whose row 8 this answers
- [graphics-standards.md](graphics-standards.md) — gates 3, 6 and 8, which bind any migration
- [map-visuals.md](map-visuals.md) — the survey ink (§4) and the ladder it is measured on (§5)
- [visual-reboot.md](visual-reboot.md) — Sorrowgate's surface slice
- [tech-stack.md](tech-stack.md) — the frontend stack this sits in
- [README.md](README.md) — the rest of the design bible
