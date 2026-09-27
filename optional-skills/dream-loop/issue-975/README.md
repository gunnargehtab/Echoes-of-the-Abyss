# Dream-loop run: the 16:9 key-art scene

Targets and run notes for [#975](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/975).

| File | What it is |
| --- | --- |
| `target.png` | The supplied 1920×1080 visual target. |
| `target.html` | The supplied standalone scene export. |

Keep both files unchanged. The authorized Pro run locks a copy at
`.dream-loop/target.png`; the HTML is the source of the authored scene, not a screenshot
to paint onto a canvas.

## Run decisions

The one-hour run started on 27 September 2026 at 23:18:05 CEST and ends at 00:18:05.
The owner chose Pro and asked for creativity without changing normal play or approved
assets. This is a separate key-art diorama, not an exception to the shipped graphics
standards.

Two locations were considered: a development-only frontend page, or a standalone
prototype here. The standalone prototype is the recommendation taken while the owner
was unavailable: no game import, build entry, server state or approved GLB is involved.
The supplied scene already contains the carrier, small craft, wildlife, textures and
lighting; preserve that authored detail rather than replacing it with newly generated
assets. No paid services, asset downloads or external image generation are used.

The target is a locked 1920x1080 frame at DPR 1. Follow the Pro rubric and the repository's
three-round cap; the exit is an independent score of at least 8/10 and acceptable
measured GPU rendering performance, not a smooth animation callback over a static image.
Record real render work separately from the time spent displaying a finished still.

## Run locally

From the repository root, with Node 22+:

```powershell
node optional-skills\dream-loop\issue-975\serve.mjs
```

Open `http://127.0.0.1:4175/`. This is a frozen instant that can be explored in depth:
drag or use arrow keys to drift the camera, scroll to move closer, press R to recover
the locked frame, and S to export the actual 1920x1080 canvas. A changed view resolves
64 thin-lens samples, then stops rendering; it does not spend GPU time repainting a still.
The image stays 16:9 and letterboxes on a portrait screen.

The original scene runs at `http://127.0.0.1:4175/reference/?capture=1`. Both versions
load Three.js r184 from the supplied HTML archive, including its MIT attribution;
there is no CDN or new dependency. The server exposes an explicit scene-file allowlist,
not the repository or either target image.

Capture and exercise the prototype with the browser setup from the `run-game` skill:

```powershell
node optional-skills\dream-loop\issue-975\capture.mjs --headed --channel msedge `
  --url 'http://127.0.0.1:4175/?capture=1' --measure --verify `
  --out .dream-loop\issue-975\capture
node --test optional-skills\dream-loop\issue-975\prototype.test.mjs
```

`?capture=1` only hides the controls. The capture checks real geometry, local-only
requests with no PNG backdrop, idle suspension, camera movement, reset, PNG export,
portrait letterboxing and visible invalid-input errors. Reset allows at most one
8-bit step per channel and a mean difference of 0.001/255 for GPU rounding.
The separate ten-second measurement renders the full scene, volume, effects,
accumulation, bloom and grade every frame, with a GPU fence; it is not idle RAF timing.

## Implementation

The five scene modules in `prototype/` were decoded from the supplied export and
formatted for editing. The composition, authored textures, wildlife, lighting and
64-sample lens remain; the new viewer adds camera exploration, deterministic shutter
samples, progress, export and an explicit failure surface. The first accumulation
sample replaces history rather than blending against the previous camera's HDR values.

Static opaque parts sharing a material and render state are batched while preserving
their world-space geometry, UVs, normals and materials. Moving torpedoes, custom translucent shaders,
existing instances and coloured terrain are excluded. `geometry.mjs` shares the
export's UV merge with its fauna; tests hold batching to world bounds, triangle counts,
shadow state and exclusions. This is still a key-art renderer, not a proposed gameplay
asset pipeline.

## First-round evidence

| File | What it records |
| --- | --- |
| [baseline.png](../../../docs/screenshots/issue-975/baseline.png) | The supplied HTML scene rendered on this machine, before prototype changes. |
| [baseline-metrics.json](../../../docs/screenshots/issue-975/baseline-metrics.json) | That scene in the unbatched viewer, measured through the full-render path. |
| [prototype-1.png](../../../docs/screenshots/issue-975/prototype-1.png) | The locked frame in the standalone viewer after batching. |
| [prototype-1-drift.png](../../../docs/screenshots/issue-975/prototype-1-drift.png) | A real camera move, not a displaced flat image. |
| [prototype-1-metrics.json](../../../docs/screenshots/issue-975/prototype-1-metrics.json) | GPU reading, geometry inventory, local requests and browser verification. |

At 1920x1080, DPR 1, headed Edge on an NVIDIA GTX 1070 through ANGLE/D3D11, the complete
pipeline measured **37.4 FPS** over 375 GPU-fenced frames in 10.017 seconds. This is an
explorable still, not a claim of 60 FPS gameplay. The initial cold load took 21.8 seconds,
including geometry, generated textures, shader compilation and the 64-sample resolve.
The frame stops consuming render work once resolved.

Batching reduced measured draw calls from **1,568 to 697**, and allocated geometry
objects from 804 to 271; it did not materially change GPU throughput (37.5 FPS before).
The final frame still draws 3,224,266 triangles and 45,245 points, including all the
authored wildlife. Its mean absolute RGB-channel difference from the supplied PNG is
2.043/255; the supplied HTML's same-GPU reference differs by 0.00129/255 on average.
Those are pixel readings, not an independent visual score.

The browser verification passed. After drifting and returning, only 270 RGB channels
changed, each by one 8-bit step, for a mean of 0.0000434/255; keyboard movement, full-size
PNG export, portrait layout, idle suspension and visible invalid-input errors also held.

## Related

- [#967](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/967) — the first conn-view dream loop.
- [Dream Loop guidance](../../README.md) — registering and running the opt-in skill.
