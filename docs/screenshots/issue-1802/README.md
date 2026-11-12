# A hull built in headless Blender (#1802)

A spike. It asks whether a script running Blender with no window can lift a hull to a
higher surface bar than `tools/hull-models/kit.mjs` reaches, and still pass through
`hull-intake`. It replaces no shipped model: `docs/concept-art/models/` is untouched, and
adopting any of this changes the pipeline of record in
[graphics-standards.md](../../graphics-standards.md#the-pipeline-of-record), which is the
owner's decision.

The hull is the Commune's Corvette, one of the three in the free-water crater
([free-water-slice.md](../../free-water-slice.md)), so it stands where the High slice's
Close camera will look. The script is `tools/hull-models/blender/corvette_pelagia.py`, on
`tools/hull-models/blender/kit.py`, and its output is
`docs/concept-art/spikes/corvette-pelagia-blender.glb`.

## What was built

The script reads the approved `docs/concept-art/models/corvette-pelagia.glb` as its
blockout and rebuilds each part inside that part's own frame. Nothing is a new hull: 80 m,
the 33 parts by their names, the five materials at the navy's values, the seven lamps at
their sites. It adds 18 small rings, a collar under each seed and a calyx under each lamp,
which no block of [asset-prompts-3d.md](../../asset-prompts-3d.md) names.

| | Current | Spike |
| --- | --- | --- |
| Generator | three.js r169 primitives | Blender 5.3.0 as `bpy`, Cycles on the CPU |
| Parts | 33 | 51 |
| Triangles | 2,652 | 44,924 |
| Materials | 5 | 5, the same names and values |
| Maps | none | normal 1,024², occlusion 512², one atlas at 15.7 texels a metre |
| File | 100,964 bytes, 26,156 gzipped | 2,856,728 bytes, 2,470,183 gzipped |

Subdivision carries the hull, the jaw, the sheaths, the seeds and the peduncle. The three
growth rings are bands with a lip, their edges bevelled 0.12 m. The membranes are a lens
with a round rim where they were a slab. The normal map is baked
from a height field a material: scutes with growth lines on the chitin, a grain on the
ridge, rays on the membranes. The occlusion map is the parts' shade of one another.

![The two baked maps: normal, then occlusion](baked-maps.png)

## On the lit table

`tools/hull-renders/inspect.mjs`, the current hull on the left and the spike on the right,
from cameras that do not move between them. This sheet shows shape and authored finish. Its
lamps are bloomed, so glow is not read here.

```bash
node tools/hull-renders/inspect.mjs corvette-pelagia \
  --with docs/concept-art/spikes/corvette-pelagia-blender.glb
```

![Four views, current and spike](lit-table.png)

![Flank, stern and bow, closer](lit-close.png)

## In the game

**A software rasteriser drew these frames** (SwiftShader, the container's only one). They
show what the Low renderer does with the file and are not offered for acceptance. The
shipped model was swapped for the spike for the run and restored after, as
`tools/hull-models/blender/frames.mjs` describes. Left is current, right is the spike.

The nearest the conn camera comes, a low eye off the port quarter and off the bow:

![Near, port quarter](conn-near-port.png)

![Near, bow](conn-near-bow.png)

The whole frame of the first, HUD on:
[current](conn-near-port-current-full.png) · [spike](conn-near-port-spike-full.png).

The study's opening pose, and gate 6's close station at 1,800 m and 55° of pitch, each
enlarged twice:

![Home](conn-home.png)

![Gate 6's close station](conn-station.png)

The High slice's own Close camera is not fixed yet
([issue-1799](../issue-1799/README.md#cameras)), so the two near frames stand in for it.

| Camera | Draw calls | Triangles, current | Triangles, spike |
| --- | --- | --- | --- |
| Home | 44 | 593,684 | 635,956 |
| Gate 6's close station | 43 | 593,674 | 635,946 |
| Near, port | 39 | 589,674 | 631,946 |
| Near, bow | 36 | 588,378 | 630,650 |

Draw calls do not move, since the conn view merges a model by material and the spike has
the same five. One Corvette adds 42,272 triangles to a frame. `readings-current.json` and
`readings-spike.json` hold the probe's figures.

## Through intake

```bash
node .claude/skills/hull-intake/scripts/bake.mjs \
  docs/concept-art/spikes/corvette-pelagia-blender.glb --length-m 80 --out <dir>
```

The bake is warning-free: 80.0 m by 25.2 m at a scale of ×1.00002, length on X, 7 emissive
materials by intake's count of 51, and no material whose meshes disagree on attributes. The current hull reads
80.0 m by 24.9 m.

![Intake's four maps at 8 px/m](intake-maps.png)

Each lamp shows from above the plan area its blockout showed, to a thousandth of a square
metre: the script measures both. Gate 3's raw energy then agrees from 8 px/m up and differs
below it, where a lamp is a pixel or two wide and a round one samples differently from a
pentagon.

| Map density | Raw E, current | Raw E, spike |
| --- | --- | --- |
| 2 px/m | 3.41 | 3.01 |
| 4 px/m, the shipped density | 3.35 | 3.04 |
| 8 px/m | 3.31 | 3.32 |
| 16 px/m | 3.36 | 3.37 |

Calibrated at 4 px/m to the Corvette's SIG 28, a target of 3.33, the current hull takes a
gain of ×0.993 and the spike ×1.095, against a cap of ×64.

The script prints what moved against the blockout, part by part. The growth rings move up
to 0.66 m, since each now lies on the skin where its torus floated up to 1.23 m off it and
sank up to 0.32 m into it. The hull's bow tip sits 0.24 m aft. The membranes are 0.19 m
thicker a side at the root. Every other box is within 0.17 m.

## What it costs

- **The toolchain.** `bpy` 5.3.0 installs from PyPI into Python 3.13: a 427.5 MB wheel,
  1.1 GB installed. It imports, bakes and exports in the cloud container with no display
  and no GPU.
- **Time.** 81 s a hull on four threads: 3 s to build, 78 s to bake at 64 samples.
- **Bytes.** 28 times the current file. The 128 approved models are 12,671,968 bytes
  together at `5f2a23404`, so five hulls like this one outweigh the library. The PNGs are
  1,791,600 bytes of it. The wheel carries no Draco or meshopt library, so the exporter
  cannot compress the geometry.
- **Triangles.** One hull is a ninth of Low's 400,000 a frame, and a fleet at the berth
  ceiling of forty would be 1.8 million. It is a High asset.
- **Texture memory.** 6.7 MiB a hull kind on the GPU as three uploads it, RGBA8 with
  mipmaps, against the 1.33 MiB a 512² occlusion map costs.

## What it does not prove

- **That `npm run check:models` can hold it.** Three builds on one machine gave one
  SHA-256. Another machine was not tried, and CI installs no `bpy`.
- **That it reads at High.** High's lighting is not built (#1801). Under Low's rig at the
  nearest camera the gain is visible and small. The lit table is the fairer reading of
  what the surface holds.
- **A second navy.** The Commune is the navy primitives serve worst. A plated hull would
  lean on bevels, which this hull uses on three lips and nowhere else.
- **A frame on the named GPU.** Every frame here is a software rasteriser's.

## Related

- [graphics-standards.md](../../graphics-standards.md) — the pipeline of record and the
  gates
- [art-direction.md](../../art-direction.md#two-layers-two-laws) — what the world layer
  may do at High
- [asset-prompts-3d.md](../../asset-prompts-3d.md) — the Corvette and Pelagia blocks the
  hull answers to
- [issue-1799](../issue-1799/README.md) — the High slice's target frame and its cameras
