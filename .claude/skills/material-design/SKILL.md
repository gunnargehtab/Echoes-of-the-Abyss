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
channels, colour space, mip policy, memory, owner and lifetime. Search the existing
material helpers first. Reuse the available three.js material/texture/shader guidance;
do not install another rendering stack.

## Implement in the actual material pipeline

- Colour textures use sRGB; height, roughness and noise are linear data.
- Coordinates stay attached to the model, independently of motion and the far-view
  readability scale. Filter or fade subpixel detail; a screenshot cannot prove no shimmer.
- Chain shader hooks and cache keys. Ground cosmetics run before survey ink; fog,
  vertex-colour veil, instancing and sway must still run.
- Never alter a lamp's approved resting energy, placement, hue or live-SIG curve.
  A cosmetic rim is not a new light source.
- Key cached templates by every look-changing input. A tutorial palette or material
  must not contaminate a later skirmish, including after a palette switch.
- Keep normal materials on their original path outside the approved slice. Surface
  detail does not add geometry, hidden state or a per-frame texture bake.

## Prove the surface

Exercise real material compilation in Chromium. A string comparison alone cannot catch
a GLSL error. Also hold hue/luminance bounds, lamp invariance, texture ownership,
template separation and hook order in the smallest relevant frontend tests.

Use [run-game](../run-game/SKILL.md) at close, home, survey and low pitch, and move the
camera. Capture actual texture, call and triangle counts alongside the full composited
frame. A fallback must be named as a fallback, never accepted as the new material.

Return the material family, implementation, memory ledger and evidence to
[art direction](../art-direction/SKILL.md).

## Related

- [Visual reboot brief](../../../docs/visual-reboot.md)
- [Graphics gates](../../../docs/graphics-standards.md)
- [Three.js materials](../threejs-materials/SKILL.md)
