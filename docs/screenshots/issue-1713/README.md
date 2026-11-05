# Free-water integration

The development-only `?study=free-water` entry selects the authored crater, three
Pelagia hulls and 184 public decorative instances. Production refuses this entry.
The evidence below covers the
[contract](../../free-water-slice.md#7-acceptance-and-evidence) in a real server-authoritative
match, without changing unit speeds, pressure costs or approved assets.

## Reproduce

Run `npm run dev`, then use the repository's driver:

```powershell
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\interaction --steps docs\screenshots\issue-1713\steps.mjs
$env:SETTINGS_JSON='{"bindingLayout":"oneHanded"}'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\journey --steps docs\screenshots\issue-1713\journey.mjs
Remove-Item Env:\SETTINGS_JSON
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\lifecycle --steps docs\screenshots\issue-1713\lifecycle.mjs
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\parallel --steps docs\screenshots\issue-1713\parallel.mjs
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?map=kelp-labyrinth" --out docs\screenshots\issue-1713\control --steps docs\screenshots\issue-1713\control.mjs
$env:UNPACED='1'
Remove-Item Env:\GPU_STATIONS -ErrorAction SilentlyContinue
$env:VIEW_DPR='1'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\dpr-1 --steps docs\screenshots\issue-1713\gpu.mjs
$env:VIEW_DPR='1.5'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\dpr-1.5 --steps docs\screenshots\issue-1713\gpu.mjs
```

Since #1751, `gpu.mjs` expects 200 props under the 600,000 prop reservation; to read a
revision before it, set `GPU_PROPS=184` and `GPU_PROP_CAP=400000`. The readings below
predate that change.

`steps.mjs` checks authoritative on-course descent and ascent while the scout remains
at 300 m; invalid columns, a queued PR warning, independent camera movement, Home,
real loaded batches, a local ground delta, reduced motion, palette uniforms, reset,
rebuild and teardown during pending loads. The loaded fixture spends 387,952 prop
triangles in 13 batches including the 48 photophores. Disabled delta slots remain
zero-scaled submissions and still count against that reservation.

`journey.mjs` executes the garden and southern-cut routes, waiting at each depth
checkpoint, then returns around the west wall. It confirms both selected hulls receive
the direct rise while their queued 450 m leg survives and completes. The scout remains
at 300 m throughout. The Corvette deliberately incurs crush at D, keeps its permanent
loss after returning to 1,000 m, and holds at the 800 m roof despite a 700 m ascent order.
The read-only development probe reports only health and orders already received for
the player's own hulls; it adds no server/debug channel.

The Node regressions compare the decoration with an existing Hollow and opposing
observer in the deep pocket, using normal detection. Any low-tier contacts retain their
ambiguity; no decorative data depends on those contacts. GLBs are unchanged. The owner
chose body-axis swim depths rather than fin-tip origins; the exact anchor offsets and
closed paths are recorded in the contract.

## Acceptance matrix

| Contract row | Evidence |
| --- | --- |
| Painted map and routes | `freeWaterSlice.test.ts` asserts literal intervals and both route choices; [journey readings](journey/readings.json) record A-B-C-D-E-F-H-G and the shallow return. Existing footprint/separation tests remain green. |
| Input and projection | `flightCamera.test.ts` and `rendererSmoke.test.ts` cover swept clearance, poles, picking, NAV ownership and blur; the journey records each axis at 90/180/360 degrees, vertical bearing and Home. [Parallel-ray readings](parallel/readings.json) verify a horizontal centre-row ray, NO WATER TARGET, disabled confirmation and unchanged own orders. |
| Moving fleet | [Interaction readings](interaction/readings.json) prove on-course dive/rise; journey records acknowledged mixed selection, completed queued intent, an untouched scout and simultaneous low-camera/fleet movement. |
| Refused and costly actions | Interaction refuses the solid column; journey shows the warning before confirming 2,000 m, incurred permanent hull loss and the roof holding ascent. |
| Integrated views | Interaction has canonical-scale wildlife and rolled preview; both GPU directories contain home, close garden, low and survey; journey adds moving-low, inverted and vertical views with HUD/scope/depth present. |
| Information controls | `freeWaterDecoration.test.ts` compares normal/hidden-Hollow variants byte-for-byte; `faunaAgentStipple.test.ts`, `faunaStipple.test.ts` and `rendererSmoke.test.ts` retain Lampfry scatter and Tier-1/2 ambiguity. No wire fields changed. |
| Lifecycle and accessibility | Interaction checks actual asset arrival, retained batches, local deltas, all palettes, reduced motion and pending-load destruction. Journey uses keyboard-only preview, one-handed Q ping and NAV, then reconnects the socket. [Lifecycle readings](lifecycle/readings.json) verify actual leave, hook disposal, cleared study token and a fresh room. |
| Non-target | [Kelp Labyrinth readings](control/readings.json) show standard props and no study instances, with ordinary right-click/Rise and orbit pan. Existing mission/fauna suites remain green. |

The close crab and fry are non-emissive bodies, unlike the bestiary's luminous
Lampfry scatter and classified stipple channel. Their loops never scatter or react to
hulls. The deep fish's three visible near-side dots are public furniture, not a predator
classification or a contact. The persistent decorative-life legend distinguishes that
licence; the screenshot's contact log contains only the own fleet's genuine acoustic
events, not wildlife reports.

## Hardware and gates

The GPU readings cover **all four stations at both DPRs**, on an NVIDIA GeForce
GTX 1070 through Edge/ANGLE D3D11, unpaced and with animation running. Every unqueued
and queued window has at least 240 timer samples; the 12,000-step load is the existing
render-stack harness default and outlasts every measured frame. The earlier 24,000-step
attempt stalled timer delivery in the garden; those incomplete windows are not used.

| Station | Calls / triangles | DPR 1 GPU / queued ms | DPR 1.5 GPU / queued ms |
| --- | --- | --- | --- |
| Home | 43 / 405,088 | 1.04 / 0.94 | 1.71 / 1.66 |
| Garden close | 21 / 396,719 | 0.90 / 0.85 | 1.38 / 1.44 |
| Low | 24 / 397,119 | 0.88 / 0.82 | 1.37 / 1.28 |
| Survey | 44 / 405,088 | 1.10 / 0.80 | 1.78 / 1.35 |

Queue loads are 3.66..3.78 ms. All stations retain 184 instances and 48 photophores.
Environment memory is 344,064 bytes; halo/split targets are 22,422,976/5,184,000 bytes
at DPR 1 and 50,371,936/11,664,000 at DPR 1.5, matching the retained target sizes.
Uploaded textures vary with the station's visible models (6..15); there are no new
texture assets. The JSON files preserve the full per-station counts.

The full `npm run gates` run passed 11 of 12 gates, including the complete test suite,
types, lint, formatting and production build. Local `check:models` is blocked by unchanged
Bower and Directorate-refinery transform rounding on Windows, reproduced under Node 22
and 24 and recorded in #1742; no GLB was regenerated. All blocking Linux CI jobs on
PR #1743 passed, including models, both test shards, checks, docs and build.
The photophore-seat correction passed 74 focused asset/lifecycle tests:
the six named seats contain baked vertices, so node origins incorrectly collapsed them
to one position. The new distinct-seat regression failed before that correction.

The own-state probe follow-up passed frontend type-check, targeted ESLint/Prettier and
206 tests with this command:

```powershell
npm -w packages/frontend exec -- node --import tsx --import file:///D:/Claude/packages/frontend/test/support/viteAssets.mjs --test test\rendererSmoke.test.ts test\freeWaterDecoration.test.ts test\flightCamera.test.ts test\faunaAgentStipple.test.ts test\faunaStipple.test.ts
```

Independent code review found no significant issues. A separate read-only acceptance
audit opened the captures and mapped every matrix row; it found one missing observation,
the parallel-ray refusal. The new `parallel.mjs` capture and focused test above the
existing behind-eye case close that evidence gap without changing runtime behavior:

```powershell
npm -w packages/frontend exec -- node --import tsx --import file:///D:/Claude/packages/frontend/test/support/viteAssets.mjs --test --test-name-pattern='refuses invalid preview rays' test\rendererSmoke.test.ts
```

That command passed (1 test), including a forward-ray positive control, a verified
horizontal ray and no emitted move order; the browser drive passed without console errors.
The custom critic's configured `opus` alias was rejected by the runtime, so these are
supported-default independent reviewers, not a changed model configuration or author
self-review. PR #1743 records the final review verdict.

## Related

- [Contract](../../free-water-slice.md)
- [Graphics gates](../../graphics-standards.md)
