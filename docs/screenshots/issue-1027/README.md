# #1027 — the conn view at the berth ceiling

Gate 6 ([graphics-standards.md](../../graphics-standards.md) §6) budgeted the own force as
five hulls and a dozen structures. A commander may hold forty berths (`BERTHS.CEILING`), and
`mergeByMaterial` draws a hull as one mesh per material. These readings put the ceiling on
screen on the named GPU. Gate 6's "The berth ceiling" paragraph is what they decided.

Hardware: GTX 1070 through ANGLE/Direct3D 11, Edge headed at 1440×900, on 4 October 2026.
The client was `main` at `9d83c95c`, and `capture.mjs` as on this branch, except that
every run but `pel-dozen-r15-b` checked triangles against the old 250,000: their
`breaches` name triangle breaches the 400 k check would not, and their calls, triangles
and timings are the same either way. Every reading had
`gpuTimer: timing`, 240 GPU frames in each average, no result dropped to a disjoint event,
and the lamp halo drawn.

```bash
STAGE_FILE=<file> npm run dev   # with staging.patch applied
QUEUE_STEPS=40000 UNPACED=1 OVER_BUDGET=record \
  node .claude/skills/run-game/scripts/drive.mjs --headed --channel msedge \
  --url 'http://localhost:5173/?map=ventfront-divide' --out <dir> \
  --steps tools/render-stack/capture.mjs
```

`VIEW_DPR=1.5` takes the second ratio. The default queue load, 12,000 steps, read 3.52 ms
and ran out before the ceiling's unqueued frame at 6.43 ms, so these runs used 40,000
(11.8–12.5 ms). `OVER_BUDGET=record` logs a breach instead of failing on it.

## The forces

No opening fields the ceiling, so the force is a local stand-in, never committed:
`staging.patch` reads `<Faction> <UnitKind> [count] [Structure,...]` from `STAGE_FILE` and
gives slot 0 that force in place of its escort and harvester. Each force stands on the
Bastion and Foundry the opening already builds.

| Force | Navy | Hulls | Structures |
| --- | --- | --- | --- |
| Opening | Bathyarch, Pelagia | Light Scout, two line hulls, Harvester | Bastion, Foundry |
| 40 Scouts | Bathyarch | 40 Light Scouts: 1 berth, 5 materials, 696 triangles | Bastion, two Foundries, Slipway: the four that grant 40 berths |
| 40 Beacons | Bathyarch | 40 Beacons: 1 berth, 6 materials, 2,952 triangles | The same four |
| 40 Beacons, dozen | Bathyarch | The same | The four, three Refineries, two Vent Taps, Baffle Barge, Sentinel Turret, Bio-Reactor |
| 20 Submersibles, dozen | Pelagia | 20 Abyssal Submersibles: 2 berths, 5 materials, 7,116 triangles | The same dozen, Spore Veil for the Baffle Barge |

The Beacon is Bathyarch's most calls per berth, and the Submersible the roster's most
triangles per berth (`count.mjs`, below). The dozen is one sample base, not a worst case:
nothing caps what a base builds.

## The counts

Calls and triangles at `capture.mjs`'s four cameras (home, close, low at 12°, survey),
with the own hulls and structures on screen. Both ratios read the same counts, within a
few calls between runs: one Submersible run read 168 calls at close, the others 164.

| Force | Home, low, survey: calls / triangles | Close: calls / triangles | On screen |
| --- | --- | --- | --- |
| Opening, Bathyarch | 64 / 150,676–150,696 | 63 / 150,696 | 4 hulls, 2 structures |
| Opening, Pelagia | 61 / 171,136–171,172 | 60 / 171,172 | 4, 2 |
| 40 Scouts | 251–252 / 183,880–183,920 | 250 / 183,876 | 40, 4 |
| 40 Beacons | 291–292 / 291,940–291,980 | 290 / 291,934–291,962 | 40, 4 |
| 40 Beacons, dozen | 336 / 314,120–314,174 | 242 / 263,324 | 40, 12; close 32, 4 |
| 20 Submersibles, dozen | 200 / 381,384–381,910 | 164–168 / 351,594–352,314 | 20, 12; close 16, 8 |

Every ceiling breaches 150 calls, and every ceiling but the 40 Scouts breaches the old
250 k triangles. Ventfront's prop layer read 99,520 triangles of its 105 k reservation, and
Ventfront and the Kelp Labyrinth have the largest shipped heightfield, 32,768 triangles. So
the Pelagia frame with the reservation full is 387,390, and gate 6's 400 k is that and
12.6 k of margin. It bounds this sample dozen and not every dozen: a Bastion and eleven
Pelagia Foundries count to 172,622 triangles against the sample's 102,734, about 457 k in
all, and gate 6 records that edge rather than budgeting it.

Instancing hulls per kind would draw the 40 Beacons as 6 calls rather than 240. Counted,
not measured: the Beacons with a dozen structures would read 336 − 240 + 6 = 102
([#1079](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1079)). It draws every
triangle it drew before.

## The time

Unpaced, in milliseconds; each range spans the four cameras and every run of the force.
Queued GPU is gate 6's reading, the unqueued bracket includes the handover, `avgConnMs`
is the conn view's CPU time and `avgOverlayMs` the Pixi overlay's.

| Force, ratio, runs | Queued GPU | Unqueued GPU | Conn | Overlay |
| --- | --- | --- | --- | --- |
| Opening, Bathyarch, 1, two | 0.68–0.83 | 1.29–2.37 | 0.74–1.06 | 1.14–1.49 |
| 40 Beacons, 1, two | 0.80–1.03 | 5.50–6.59 | 1.94–2.49 | 1.88–2.17 |
| Opening, Bathyarch, 1.5, two | 1.23–1.56 | 1.55–1.74 | 0.75–0.81 | 1.10–1.23 |
| 40 Beacons, 1.5, two | 1.33–1.69 | 5.29–6.21 | 1.86–2.07 | 1.87–2.10 |
| 40 Scouts, 1, one | 0.82–0.94 | 4.00–4.70 | 1.47–1.69 | 1.64–1.81 |
| 40 Beacons, dozen, 1, one | 0.79–0.94 | 5.93–7.03 | 1.81–2.26 | 2.04–2.25 |
| Opening, Pelagia, 1, one | 0.69–0.80 | 1.05–1.40 | 0.71–0.84 | 1.14–1.23 |
| 20 Submersibles, dozen, 1, two | 0.79–0.99 | 3.86–5.22 | 1.43–1.83 | 1.50–1.70 |
| 20 Submersibles, dozen, 1.5, two | 1.40–1.79 | 3.71–5.22 | 1.41–1.71 | 1.41–1.74 |

Camera by camera, the mean of two runs, 40 Beacons against the opening: queued GPU rose
0.05–0.17 ms, `avgConnMs` 1.07–1.45 ms and the unqueued bracket 3.77–4.74 ms, at both
ratios. The GPU draws the extra 141 k triangles almost free. The 227 extra calls cost CPU,
in the renderer and in the browser's GPU process. The overlay rose 0.69–0.85 ms as well,
drawing marks for forty hulls rather than four, and instancing does not touch it.

## Counted

`count.mjs` reads the committed GLBs (run `npm run build:shared` first). Calls per berth
top out at six: Bathyarch's Chorister and Beacon, Pelagia's Chorister and Glider, and
Hadron's Herald; the Directorate's are five. Triangles per berth top out at Pelagia's Abyssal
Submersible, 3,558, then its Harvester at 3,396; Bathyarch's Beacon is 2,952. Pelagia's
structures are the heaviest: its Foundry is 14,592 triangles and its Slipway 14,156, and
the four that grant the ceiling come to 55,450 against Bathyarch's 10,266.

## Files

- `readings/*.json`: each run's `readings.json`, named force, ratio and run.
- `opening-home.png`, `beacons-home.png`, `beacons-dozen-home.png`,
  `submersibles-dozen-home.png`: the home camera of each, at ratio 1.
- `staging.patch`: the local stand-in. Apply it, read, and revert; it is not code.
- `count.mjs`: the counted half.

## Related

- [graphics-standards.md](../../graphics-standards.md) §6, "The berth ceiling"
- [issue-1001](../issue-1001/README.md), where the queued reading comes from
- [three-layer-ocean.md](../../three-layer-ocean.md), where the first budgets came from
