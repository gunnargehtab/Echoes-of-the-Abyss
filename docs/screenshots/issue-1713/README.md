# Free-water integration

The development-only `?study=free-water` entry selects the authored crater, three
Pelagia hulls and 184 public decorative instances. Production refuses this entry.
This is integration evidence, not completion of the full
[contract](../../free-water-slice.md#7-acceptance-and-evidence).

## Reproduce

Run `npm run dev`, then use the repository's driver:

```powershell
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\interaction --steps docs\screenshots\issue-1713\steps.mjs
$env:UNPACED='1'
$env:GPU_STATIONS='home'
$env:VIEW_DPR='1'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\dpr-1 --steps docs\screenshots\issue-1713\gpu.mjs
$env:VIEW_DPR='1.5'
node .claude\skills\run-game\scripts\drive.mjs --headed --channel msedge --url "http://localhost:5173/?study=free-water" --out docs\screenshots\issue-1713\dpr-1.5 --steps docs\screenshots\issue-1713\gpu.mjs
```

`steps.mjs` checks authoritative on-course descent and ascent while the scout remains
at 300 m; invalid columns, a queued PR warning, independent camera movement, Home,
real loaded batches, a local ground delta, reduced motion, palette uniforms, reset,
rebuild and teardown during pending loads. The loaded fixture spends 387,952 prop
triangles in 13 batches including the 48 photophores. Disabled delta slots remain
zero-scaled submissions and still count against that reservation.

The Node regressions also compare the decoration with an existing Hollow and opposing
observer in the deep pocket, using normal detection. Any low-tier contacts retain their
ambiguity; no decorative data depends on those contacts. GLBs are unchanged. The owner
chose body-axis swim depths rather than fin-tip origins; the exact anchor offsets and
closed paths are recorded in the contract.

## Hardware and gates

The committed GPU readings cover **home only**, on an NVIDIA GeForce GTX 1070 through
Edge/ANGLE D3D11, unpaced and with animation running. Each queued reading includes
240 samples. Both frames submit 43 calls and 405,088 triangles; the existing environment,
halo and split targets are retained. The non-target Kelp Labyrinth capture has no
fixture instances or decorative photophores.

| DPR | Unqueued GPU ms | Queued GPU ms | Queue load ms |
| --- | --- | --- | --- |
| 1 | 1.01 | 0.98 | 7.25 |
| 1.5 | 1.58 | 1.64 | 7.41 |

Omit `GPU_STATIONS` to attempt the complete four-station run. The queued garden station
stopped returning timer samples at 228 (DPR 1) and 206 (DPR 1.5), while frames continued;
reloading between stations did not resolve it. Those incomplete windows are not passing
GPU evidence. Low and survey screenshots establish appearance and counts, not GPU timing.

The full `npm run gates` run passed 11 of 12 gates, including the complete test suite,
types, lint, formatting and production build. `check:models` remains blocked by unchanged
Bower and Directorate-refinery transform rounding on Windows, reproduced under Node 22
and 24 and recorded in #1742; no GLB was regenerated. The final photophore-seat correction
then passed 74 focused asset/lifecycle tests, frontend types, ESLint and formatting:
the six named seats contain baked vertices, so node origins incorrectly collapsed them
to one position. The new distinct-seat regression failed before that correction.

The independent loop critic could not start: its configured `opus` model was rejected
as unavailable by the agent runtime. There is no critic verdict and no self-review
substituted for that gate.

## Acceptance still open

The complete route and depth-checkpoint journey, incurred unhealable crush, a completed
mixed-selection queued leg, all-axis pole sweeps and the one-handed fleet layout still
need integrated captures. A preview of an order is not its execution. Close wildlife
frames must also be judged against the Lampfry scatter and Ashgrazer ambiguity controls.
The remaining queued GPU stations and a wholly green gate run remain open too.

## Related

- [Contract](../../free-water-slice.md)
- [Graphics gates](../../graphics-standards.md)
