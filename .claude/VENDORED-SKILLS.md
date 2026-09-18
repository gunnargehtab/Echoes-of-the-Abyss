# Vendored skills

Eleven of the skills in `.claude/skills/` were not written here. They are copies
of public Agent Skills, taken from the marketplaces indexed by
[skills.sh](https://skills.sh), and they sit beside this repository's own six
(`balance-run`, `dev-loop`, `hull-intake`, `run-game`, `steward`, `work-issue`).

## Why they are copied rather than installed

A skill costs context whether or not it fires: every installed skill's
`description` is loaded into every session. The PixiJS collection is
twenty-six skills, and several of its descriptions run to a hundred and fifty
words of trigger keywords. Installing it as a plugin is all-or-nothing — both
`pixijs/pixijs-skills` and `addyosmani/web-quality-skills` declare a single
plugin covering their whole tree — so the only way to take the five that match
this codebase and leave the other twenty-one is to copy them.

The selection rule was **what the code actually imports**, not what looked
useful. `packages/frontend` imports exactly five names from `pixi.js`
(`Application`, `Container`, `Graphics`, `Text`, `Texture`) and drives the HUD
off `app.ticker`; its three.js side loads GLBs through `GLTFLoader` and merges
geometry through `BufferGeometryUtils`, and the only `EffectComposer` chain in
the tree — render, bloom and output passes — is the beauty-render rig in
`tools/hull-renders/scene.html`. The vendored set is those surfaces and nothing
else.

## What is here

| Skill | Upstream | Commit | Licence |
| --- | --- | --- | --- |
| `pixijs` (router) | `pixijs/pixijs-skills` | `6aae70d` | MIT |
| `pixijs-scene-graphics` | `pixijs/pixijs-skills` | `6aae70d` | MIT |
| `pixijs-scene-text` | `pixijs/pixijs-skills` | `6aae70d` | MIT |
| `pixijs-performance` | `pixijs/pixijs-skills` | `6aae70d` | MIT |
| `pixijs-ticker` | `pixijs/pixijs-skills` | `6aae70d` | MIT |
| `threejs-geometry` | `cloudai-x/threejs-skills` | `b1c6230` | MIT |
| `threejs-materials` | `cloudai-x/threejs-skills` | `b1c6230` | MIT |
| `threejs-loaders` | `cloudai-x/threejs-skills` | `b1c6230` | MIT |
| `threejs-postprocessing` | `cloudai-x/threejs-skills` | `b1c6230` | MIT |
| `accessibility` | `addyosmani/web-quality-skills` | `afa8da9` | MIT |
| `colyseus` | `colyseus/skill` | `9e3ce13` | MIT |

Licence texts are in `.claude/vendor-licenses/`. `cloudai-x/threejs-skills`
ships no `LICENSE` file; its README states MIT, and that statement is quoted in
`threejs-skills.NOTICE`.

Why each one earns its context:

- **PixiJS** is official, written against v8, and `pixi.js` is pinned to `^8.2.0`
  — so it will not hand back the v7 `beginFill`/`endFill` idiom that model
  recall reaches for. `EchoRenderer` constructs `Text` at 25 call sites
  (`grep -c 'new Text(' packages/frontend/src/game/EchoRenderer.ts` at
  `8cf4be6`) and draws through `Graphics` throughout, which is what the two scene skills cover.
  `pixijs-performance` is the one that argues for `BitmapText` on per-frame
  labels; that argument has now been measured against this HUD and **does not
  currently apply** — see below.
- **three.js** is plain three, with no react-three-fiber assumptions, and it
  uses the post-r152 colour-space API, so it agrees with `three@^0.169`. Geometry
  and materials are the conn view's own surface — `BufferGeometry`, `InstancedMesh`
  and the standard/basic materials account for most of what it builds — and
  loaders is how hull and environment GLBs reach it. Post-processing serves
  `tools/hull-renders` rather than the client, and imports through
  `three/addons/postprocessing/`, the same path that rig uses. The set does
  **not** cover `GLTFExporter`, so it does nothing for `tools/hull-models`,
  which is where the heaviest three.js authoring in this repository happens.
- **accessibility** is WCAG 2.2 with two reference files, and `docs/ui-ux.md`
  §11 already calls accessibility "a correctness requirement, not a feature
  tier". The overlap is direct: §11 owes contrast, motion and flash limits, a
  75–200% UI scale and full rebinding, and the skill carries the criteria those
  answer to (1.4.3, 2.3, 2.1, and 2.4.11 focus-not-obscured for the esc menu).
  Its method is an outside-in Lighthouse or axe audit, which this container can
  genuinely run against the dev client through `run-game` — a check the
  react-test-renderer suites cannot perform, because they assert what a doc
  section promises rather than what a browser computes.
- **colyseus** does not apply yet, and that is the point. It documents 0.18,
  and its own first step tells the reader to stop and follow the version's own
  docs when the project is on 0.16 or older. `@colyseus/core` here is pinned to
  `^0.15.57`. It is installed as a **guard**: the 0.17 and 0.18 API drift
  (the `Room` generic, the `onLeave` close code, the removal of `client.id`,
  `@filter` becoming views) is exactly what stale model recall writes into a
  0.15 room, and `CLAUDE.md`'s own Colyseus notes cover the meta-package import
  and the decorator flag but not that drift. Drop it if the noise outweighs the
  guard.

### The BitmapText argument, measured

This file used to say the HUD "does not yet use" `BitmapText`, which was true and
misleading: it implied a gap. The premise under the skill's argument is a label
re-assigned *every frame*, and `EchoRenderer` does look like that from the outside —
`drawHud` runs on the frame cadence by design (#432: contact freshness fades
continuously and the scope sweep animates by rule) and re-assigns nearly every label
as it goes.

What it costs is another question, and it is counted rather than assumed in
`rendererSmoke.test.ts`. `styleKey` is `text:style:resolution`, and `CanvasTextPipe`
regenerates the glyph canvas and re-uploads the texture exactly when it changes, so
transitions of that key are the cost the skill is talking about:

| Over 600 frames (10 s), 39 live `Text` objects | Rasterisations |
| --- | --- |
| A still match | **0** |
| A live one, fresh Echo pass every 12th frame, SIG and nodules moving | **154** (~15/s) |
| What a genuinely per-frame HUD would pay | 23,400 |

So about **0.7%** of the premise, and the churn is five labels — `sigLabel`,
`resourceLabel`, `bandLabel`, `loudLabel` at the Echo cadence, and `clockLabel` once a
second. The reason is that pixi.js 8.19 already does what the skill asks of canvas
`Text` as its fallback ("only update when the value actually changes"), without being
asked: `AbstractText`'s `set text` returns early on an equal string and `TextStyle`'s
`set fill` on an equal value. Glyph measurement is cached the same way, and that matters
as much — laying out the top strip reads `.width` thirteen times a frame across ten
labels, 7,800 reads over the same run, and they cost **62** `measureText` calls in
total.

Converting the five would trade ~15 canvas rasterisations a second for a glyph atlas,
on the most-read text in the game, and every one of those labels is inside the
screenshot gates in `docs/graphics-standards.md`. That is a real visual risk against a
benefit this container cannot measure — it has no GPU, and the upload is the half that
would matter. So it is not done, and the reason is written down rather than rediscovered.

**What would change the answer.** A label stamped with something that genuinely differs
every frame — a clock in milliseconds, a frame counter, a continuously interpolated
readout — puts the HUD back on the skill's premise, and `BitmapText` becomes the right
answer for that label. The budget in `rendererSmoke.test.ts` fails the moment that
happens, so the decision is re-opened by a red test rather than by anyone remembering
this paragraph. The other trigger is #286: a real reading on the Termux floor, where a
texture upload is priced very differently from a desktop GPU.

### A skill-eval probe on `pixijs-scene-text` (#724)

`#724` ("the top strip's readouts never say what they are") is directly in
`pixijs-scene-text`'s area. It landed in #737 with new readout content, a renderer→shell
bridge (`onReadouts`) and dedicated frontend content tests.

The probe is `.claude/skill-eval/724-text/` and was scored against the historical range
`94248a13..e59d28e`:

```bash
node .claude/skill-eval/score.mjs --experiment 724-text --selftest
node .claude/skill-eval/score.mjs --experiment 724-text --range 94248a13..e59d28e
```

Result: **0 blocking, 0 tell, 5 clean of 5.** The issue was completed without introducing
`BitmapText`, `SplitText`, `HTMLText` or `new TextStyle(...)` in added lines, while all
three criteria traps passed (renderer callback plus the two added files).

**Decision:** keep `pixijs-scene-text` for now. One clean probe says this issue did not
need that API surface, but it does not yet show redundancy across repeated text tasks.

## Rules

- **Do not edit a vendored skill.** Two exceptions exist, both marked `LOCAL`
  in place. The `pixijs` router carries a `LOCAL NOTE` block saying which five
  of its twenty-six rows exist on disk, because the rest of its router table and
  all of `references/index.md` point at skills this repository did not take. The
  `accessibility` skill has one reference row repointed at its upstream sibling
  `web-quality-audit`, which is not vendored here.
- **Do not link them from `docs/`.** Link checking on `docs/` is blocking in CI,
  and these files live outside it.
- To re-sync one, clone the upstream at a newer commit, copy the skill directory
  over, re-apply the `LOCAL NOTE` if it was the router, and update the table
  above:

```bash
git clone --depth 1 https://github.com/pixijs/pixijs-skills /tmp/pixijs-skills
cp -r /tmp/pixijs-skills/skills/pixijs-ticker .claude/skills/
```

## Considered and rejected

Recorded so the next search does not repeat this one.

- **Audio.** Nothing on the marketplaces is ahead of `packages/frontend/src/audio`
  and `tools/audio-meter`. The one Web Audio skill is written for its author's
  own assistant project, and the engine-neutral game-audio skill teaches bus
  layout, ducking and adaptive music, all of which the mix already implements
  and measures.
- **Balance.** Several game-balance skills exist. The freeze in `CLAUDE.md`
  makes them precisely the wrong thing to add.
- **The accessibility skill's siblings.** SEO and Core Web Vitals are about
  public pages ranking and loading; this is a game client behind a lobby.
- **Game-dev bundles** are Unity, Godot or Roblox shaped, and **code review,
  monorepo and vitest** skills duplicate what is already here. The backend suite
  runs on `node:test`, not vitest.
