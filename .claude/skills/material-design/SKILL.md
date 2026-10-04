---
name: material-design
description: Develop runtime materials and textures for Echoes of the Abyss from an approved visual brief. Use for surface look development, roughness, normals, material families or texture budgets. Preserve faction ink, SIG emission, shader composition and the non-target rendering path.
---

# Developing a surface, not repainting an export

Read the shared brief, `docs/graphics-standards.md` gates 3, 4 and 6, and the runtime
material path. `rosterModels.ts` replaces model colours and `environmentModels.ts`
normalises prop luminance: an attractive export is not evidence of an attractive game.

## Define the family before the texture

Record the substrate, construction and wear in concrete terms. Pelagia's overlapping
laminate is not Bathyarch's riveted steel. Preserve the approved silhouette and let the
material describe the existing surface rather than draw a second hull on top of it.

Choose reused maps, an atlas, or a bounded procedural texture. Record its dimensions,
channels, colour space, mip policy, memory, owner and lifetime.
`createWaterEnvironment` (`packages/frontend/src/game/modelLighting.ts`) is the worked
example: its float source and PMREM generator are disposed in a `finally` once baked, and
the one retained target, the probe's `environmentBytes`, goes with the view (gate 6).
Search the existing material helpers first. Reuse the vendored three.js skills where they
agree with three 0.169, and prefer this repository's own shader patches to any skill's
example; do not install another rendering stack.

## Implement in the actual material pipeline

- Colour textures use sRGB; height, roughness and noise are linear data.
- Coordinates stay attached to the model, independently of motion and the far-view
  readability scale. Filter or fade subpixel detail; a screenshot cannot prove no shimmer.
- Chain shader hooks and cache keys: capture the earlier `onBeforeCompile` and
  `customProgramCacheKey()` and suffix the key, because three's default key is the hook's
  own source text, which a wrapper shares with every material it wraps. Ground cosmetics
  run before survey ink; fog, vertex-colour veil, instancing and sway must still run.
- Never alter a lamp's approved resting energy, placement, hue or live-SIG curve, on
  screen as well as in the material: ACES faded amber lamps toward cream in #974 with
  every lamp value untouched. The one exception is gate 3's lamp core, which holds a lamp
  past white at white along its faction hue; no material compresses glow any other way. A
  cosmetic rim is not a new light source.
- Key cached templates by every look-changing input. A tutorial palette or material
  must not contaminate a later skirmish, including after a palette switch.
- Keep normal materials on their original path outside the approved slice. Surface
  detail does not add geometry, hidden state or a per-frame texture bake.

## The render stack

`docs/art-direction.md` (Shared model lighting) and gates 3, 6 and 8 of
`docs/graphics-standards.md` hold the numbers; these are the three.js mechanics under them.

- **Glow goes after the curve.** `keepGlowOutsideToneMapping` (`modelLighting.ts`) maps
  surface light, adds a lamp's emission back unmapped, and scales a pixel past white along
  its hue (gate 3's lamp core; `lampCoreRest` in `glow.ts` holds the rest). Install it on the
  material that draws: after any `clone()`, since three's `Material.copy` drops shader
  hooks; after a hook that replaces rather than chains, such as `patchSway`; and before the
  material first compiles, or with `needsUpdate` set, since the patch sets none. It is
  exact for `MeshStandardMaterial` only: clearcoat or sheen attenuate emission first, yet
  a physical material passes an `instanceof MeshStandardMaterial` guard. It does nothing
  where three defines no `TONE_MAPPING`, and its comment says where.
- **A lamp's halo follows its entity, not its export.** The lamp halo
  (`lampHaloPass.ts`, fed by `haloSource.ts`) gives each own entity one energy from its
  live SIG and shares it among its lamp sites by area times resting luminance, so never
  retune a lamp's strength or area to change its halo. It never changes a lamp pixel: own
  lamps mark the canvas stencil while it is on, and its screen composite skips them. Its
  mechanics are a depth-only blit of the canvas depth, instanced splats into a half-float
  source, a three-level half-float chain and that masked composite.
- **The chromatic split copies the finished frame.** It runs last (`chromaticSplit.ts`):
  a resolving blit of the canvas colour into a target of the canvas's own format, RGB8
  under three's default context, then one full-screen draw back. Its texels are already
  tone-mapped and encoded, so the draw leaves out `<colorspace_fragment>`; a second
  encode would lift every pixel it writes. It discards the middle of the frame, so those
  pixels keep their samples.
- **Unlit layers stay off the curve.** A built-in material sets `toneMapped: false`, which
  `packages/frontend/test/modelLighting.test.ts` checks as flags over the canned match,
  not as pixels. A `ShaderMaterial` ends on `<colorspace_fragment>` without
  `<tonemapping_fragment>`, as the water backdrop does, and no test checks that.
- **One environment, owned by the view.** The PMREM above is `scene.environment`, at
  `scene.environmentIntensity`; a material without its own `envMap` ignores its
  `envMapIntensity` there. Templates outlive a view (`rosterModels.ts`), so none takes the
  environment as its own `envMap`. It is never the background, and never a capture of the
  match: it reflects no entity, accent or hidden state.
- **UV0 is not a layout, unless a script laid one.** A map reads the UV set its texture's
  `channel` names: `uv`, then `uv1`, so `uv2` is the third. `aoMap` darkens indirect light
  only. `uvAlike` writes zeros; a script that opts into a trim sheet has
  `tools/hull-models/trim.mjs` lay every part's UV0 in metres and tag each solid unlit
  material for its navy's sheet, one grey PNG a navy in `src/assets/trim/` that
  `trimSheets.ts` attaches as `map` at load, multiplying the recoloured ink and never
  reaching `emissive` (#1005, the Bulwark first). `node tools/render-stack/audit.mjs`
  counts what the library carries.

## Prove the surface

Exercise real material compilation in Chromium. A string comparison alone cannot catch
a GLSL error. Also hold hue/luminance bounds, lamp invariance, texture ownership,
template separation and hook order in the smallest relevant frontend tests.

Use [run-game](../run-game/SKILL.md) at close, home, survey and low pitch, and move the
camera. Capture actual texture, call and triangle counts alongside the full composited
frame. `tools/render-stack/capture.mjs` holds those four cameras as a run-game `--steps`
module, with the probe's readings beside the frames. A fallback must be named as a
fallback, never accepted as the new material.

Return the material family, implementation, memory ledger and evidence to
[art direction](../art-direction/SKILL.md).

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Graphics gates](../../../docs/graphics-standards.md)
- [Three.js materials](../threejs-materials/SKILL.md), vendored;
  `.claude/VENDORED-SKILLS.md` lists where it predates three 0.169
