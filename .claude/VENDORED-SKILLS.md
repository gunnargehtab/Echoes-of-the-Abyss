# Vendored skills

Ten of the skills in `.claude/skills/` were not written here. They are copies
of public Agent Skills, taken from the marketplaces indexed by
[skills.sh](https://skills.sh), and they sit beside this repository's own workflows.
The authoritative authored/vendor split is in `tools/claude-docs/check.mjs`; the
art, unit, material, map, world and game design workflows are authored here, not copies.

## Why they are copied rather than installed

A skill costs context whether or not it fires: every installed skill's
`description` is loaded into every session. The PixiJS collection is
twenty-six skills, and several of its descriptions run to a hundred and fifty
words of trigger keywords. Installing it as a plugin is all-or-nothing — both
`pixijs/pixijs-skills` and `addyosmani/web-quality-skills` declare a single
plugin covering their whole tree — so the only way to take the five that match
this codebase and leave the other twenty-one is to copy them. #1187 dropped the
router, so four remain.

The selection rule was **what the code actually imports**, not what looked
useful. `packages/frontend` imports exactly five names from `pixi.js`
(`Application`, `Container`, `Graphics`, `Text`, `Texture`) and drives the HUD
off `app.ticker`; its three.js side loads GLBs through `GLTFLoader` and merges
geometry through `BufferGeometryUtils`, and the tree's `EffectComposer` chain —
render, bloom and output passes — is the inspect rig, `tools/hull-renders/inspect.html`
(#947); `tools/hull-renders/scene.html` dropped its own for the game's frame in #1015.
The vendored set is those surfaces and nothing else. The client's shader
patching, which since #974 includes the glow-after-tone-mapping hook in
`packages/frontend/src/game/modelLighting.ts`, has no vendored skill; its rules
are repo-authored, in the `material-design` skill.

## What is here

| Skill | Upstream | Commit | Licence |
| --- | --- | --- | --- |
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
- **three.js** is plain three, with no react-three-fiber assumptions, and its
  texture samples use the post-r152 colour-space API. Geometry and materials are
  the conn view's own surface — `BufferGeometry`, `InstancedMesh` and the
  standard/basic materials account for most of what it builds — and loaders is how
  hull and environment GLBs reach it. Post-processing serves `tools/hull-renders`
  rather than the client, and imports through `three/addons/postprocessing/`, the
  same path the inspect rig uses. The set does **not** cover `GLTFExporter`, so it
  reaches `tools/hull-models`, where the heaviest three.js authoring in this
  repository happens, only through the primitives `tools/hull-models/kit.mjs`
  builds from.

  Several samples predate `three@^0.169`. In materials, the `aoMap` sample copies
  UVs into `uv2`, which a map reads only when its texture's `channel` is 2, and the
  `ShaderMaterial` sample omits `<colorspace_fragment>`. Loaders sets a
  per-material `envMapIntensity` that `scene.environmentIntensity` overrides on
  any material without its own `envMap`. Post-processing ends a chain in
  `GammaCorrectionShader` rather than `OutputPass`, passes `FilmPass` four
  arguments where it takes two, and imports a `three/addons/nodes/Nodes.js` that
  does not exist. Geometry calls a `BufferGeometryUtils.computeTangents` that is
  not exported. Where the conn view's tone mapping departs from these samples is
  in `packages/frontend/CLAUDE.md` and the `material-design` skill.
- **accessibility** is WCAG 2.2 with two reference files, and `docs/ui-ux.md`
  §11 already calls accessibility "a correctness requirement, not a feature
  tier". The overlap is direct: §11 owes contrast, motion and flash limits, a
  75–200% UI scale and full rebinding, and the skill carries the criteria those
  answer to (1.4.3, 2.3, 2.1, and 2.4.11 focus-not-obscured for the esc menu).
  Its method is an outside-in Lighthouse or axe audit, which this container can
  genuinely run against the dev client through `run-game` — a check the
  react-test-renderer suites cannot perform, because they assert what a doc
  section promises rather than what a browser computes.
- **colyseus** documents 0.18, which is what this repository runs since #962:
  `@colyseus/core` `^0.18.17` and `@colyseus/schema` `^5.0.34` on the server,
  `@colyseus/sdk` `^0.18.4` on the client. It was vendored as a guard while the
  backend sat on 0.15; now it is the reference. Its table of what memory gets
  wrong — the `Room` generic, the `onLeave` close code, the removal of
  `client.id`, `@filter` becoming views — is exactly what pre-0.17 model recall
  writes into a 0.18 room. Its version check reads `colyseus`, which is not
  installed here, and its examples import from it;
  `packages/backend/CLAUDE.md`'s Colyseus notes give the local names, plus the
  decorator flag the skill does not cover.

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
this paragraph. The other trigger was #286's reading on the Termux floor, where a texture
upload is priced very differently from a desktop GPU; it retired with the phone (#1132).

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

### A skill-eval probe on `pixijs-scene-graphics` (#1086, #1187)

`#1086` (the scope's sweep drew past the minimap) is the newest change in reach that drew
through `Graphics` from scratch: `scopeSweep.ts` cuts the sweep, its trail and the range
rings to the scope's square. The probe is `.claude/skill-eval/1086-graphics/`, scored
against the landed range `164f2f9..4a97c96`:

```bash
node .claude/skill-eval/score.mjs --experiment 1086-graphics --selftest
node .claude/skill-eval/score.mjs --experiment 1086-graphics --range 164f2f9..4a97c96
```

Result: **0 blocking, 0 tell, 8 clean of 8.** No v7 idiom (`beginFill`, `drawRect`,
`lineStyle`, `beginHole`, `GraphicsGeometry`), no stencil mask, and both criteria met.

**The session that wrote it never loaded a PixiJS skill.** Its transcript, read for #1187
(519 assistant events), invokes `work-issue` and `dev-loop` and nothing else, reads no file
under `.claude/skills/pixijs*`, and fetches no PixiJS docs. It checked its one Pixi claim,
that a mask would cost the HUD stencil passes, against `pixi.js` in `node_modules`. So
unlike #724's probe this one is an unguarded arm, and it came back clean. The tree agrees:
`grep -rnE '\.(beginFill|endFill|lineStyle|drawRect|drawCircle)\(' packages/frontend/src`
finds nothing at `2598de0`, against about 200 v8 shape calls to copy from.

What the skill still guards is narrower than its labels. `pixi.js` 8.19 keeps `beginFill`,
`endFill`, `drawRect` and `lineStyle` as `@deprecated` shims, and no ESLint rule here
reads the tag, so a v7 call passes type-check, lint and every gate and runs with a console
warning. `beginHole` and `GraphicsGeometry` are gone, and type-check catches those.

One of its rules runs against this client on purpose. It calls clearing and redrawing a
`Graphics` every frame a [HIGH] mistake, and `drawHud` does exactly that, on the frame
cadence #432 chose. Nobody has measured what it costs, and nothing should change on the
skill's say-so.

**Decision:** keep `pixijs-scene-graphics`, for the deprecated shims no gate sees. One
clean unguarded arm is evidence against it, not yet proof; a second Graphics task that also
never loads it would make dropping it the honest call.

### Dropping the `pixijs` router (#1187)

The router was the costliest description here, 105 words in every session, and it told a
session to load it "first for ANY PixiJS v8 task". #1086 was such a task and it did not
fire. What it routed to:

- **Four skills that carry their own descriptions**, so a session can select each directly.
- **Twenty-one that are not on disk**, which its `LOCAL NOTE` told the reader to skip.
- **The `llms.txt` fallback** at `pixijs.download`, its one unique asset. A cloud session
  cannot reach it: on 8 October the agent proxy refused the host with a 403 and WebFetch
  could not resolve it. On the owner's machine a personal install wins over a project copy
  (Rules, below), so the project copy never served there.

So it was deleted. The four sub-skills keep their `pixijs-skills` licence, and none names
the router. Their "Related skills" lines point at absent skills, as they always did; only
the router's note said so, and a session that loaded a sub-skill directly never read it.

## Rules

- **Do not edit a vendored skill.** Four exceptions exist, each marked `LOCAL`
  in place. The `accessibility` skill has one reference row repointed at its
  upstream sibling `web-quality-audit`, which is not vendored here. Since #974,
  `threejs-postprocessing`, `threejs-loaders` and `threejs-materials` each open
  with a `LOCAL NOTE` on where this repository departs from their samples: a
  composer moves tone mapping, an environment belongs to the view that bakes it,
  and a lamp's emission goes after the curve. Each points at the `material-design`
  skill.
- **A personal copy wins.** Claude Code prefers a personal skill
  (`~/.claude/skills/`) to a project skill of the same name, and `skillOverrides`
  matches names only, so it cannot choose between them. On a machine that also
  installed these marketplaces personally, as the owner's has, the upstream text
  loads and the `LOCAL` edits here do not. Rules this repository needs live in a
  repo-authored skill or a `CLAUDE.md`; a `LOCAL` block only points there and
  names no repository path beyond this file, because `tools/claude-docs/check.mjs`
  checks nothing inside a vendored skill.
- **Do not link them from `docs/`.** Link checking on `docs/` is blocking in CI,
  and these files live outside it.
- To re-sync one, clone the upstream at a newer commit, copy the skill directory
  over, re-apply its `LOCAL` edit if it has one, and update the table above:

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
- **`threejs-lighting`** (`cloudai-x/threejs-skills`, `b1c6230`), checked for #974
  at `f3a21972`. The client builds one `AmbientLight`, two `DirectionalLight`s and
  one `PMREMGenerator`, plus a `PointLight` in the development-only Dream Loop
  study, and `grep -rE 'castShadow|receiveShadow|shadowMap' packages/frontend/src`
  finds nothing, because the shared rig adds no shadows. The rest — shadows,
  hemisphere and point lights — belongs to the two `tools/hull-renders` rigs, which
  are not a gate. The skill's IBL recipe also drops the render target that
  `packages/frontend/src/game/modelLighting.ts` keeps and disposes. Revisit if a
  production shadow map or a new runtime light type lands.
- **`threejs-shaders`** (same upstream and commit). It passes the import half: the
  client builds three `ShaderMaterial`s outside the Dream Loop study, patches
  built-in materials through `onBeforeCompile` at five sites and rewrites three's
  global fog chunks in `packages/frontend/src/game/water.ts`. It fails the half
  that earns context. Its extension example replaces an earlier patch and sets no
  `customProgramCacheKey`, it lists `output_fragment`, which r169 no longer has,
  and it sets WebGL1 extension flags r169 no longer reads. A vendored copy could
  be corrected only through another `LOCAL` exception, and the chaining rule
  already lives in `material-design` and in
  `packages/frontend/test/modelLighting.test.ts`. Revisit with a
  `.claude/skill-eval/` probe on a shader-patch issue.
