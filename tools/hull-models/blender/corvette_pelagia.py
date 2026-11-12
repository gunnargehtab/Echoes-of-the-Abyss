"""
The Commune's Corvette at a higher surface bar, built in headless Blender
(#1802, a spike: it replaces no shipped model).

    python tools/hull-models/blender/corvette_pelagia.py [--maps <dir>]

It answers to the same blocks as hulls/corvette-pelagia.mjs (the Corvette
block of docs/asset-prompts-3d.md Block 3, read with the Pelagia FACTION
block) and reads that script's GLB as its blockout, so nothing here is a
new hull: 80 m, the same parts by name in the same frames, the same seven
lamps at the same sites. What changes is what a part is made of.

- `hull`: the blockout's 16 × 11 table re-skinned as a subdivision cage.
  The table is faceted, so the fit stops short of exact on purpose: the
  skin lies within 3 cm of the table's box in beam and height, and the bow
  tip 0.24 m aft of the table's two-vertex wedge.
- `jaw_lobe` and the three sheaths: the ellipsoid each scaled sphere stood
  for, subdivided.
- `growth_ring_1..3`: a lipped band laid on the skin, steep astern and long
  forward, its edges bevelled 0.12 m, at the mean height its blockout torus stood proud. The torus was
  an ellipse round a hull that is not one, so it floated in places and sank
  in others; the band follows the skin, and its box moves up to 0.66 m.
- The six membranes: the blockout's own outline, as a lens that swells
  0.19 m a side at the root and thins to the tip, where the blockout had a
  0.42 m slab.
- `tail_peduncle`: the blockout's frustum, subdivided.
- The eleven seeds and the seven lamps: the facet rule cut each sphere to a
  spindle (#919), and each is rebuilt smooth at the plan area the blockout
  showed from above (`round_part`). For a lamp that area is read with
  everything near it in place, so gate 3 reads the light it read. Same
  sites, same material, same emission.
- Added, and in no block: a collar where each seed sits in its sheath and a
  calyx where each lamp leaves the skin, 18 small rings of ridge. The
  blockout's two unnamed point lights are not carried: the conn view keeps
  a model's meshes alone when it merges one (rosterModels.ts
  `mergeByMaterial`), and no map sees them.

Baked: a 1,024² normal map from each material's height field below (scutes
with growth lines on the chitin, a grain on the ridge, rays on the
membranes) and a 512² occlusion map of the parts on one another. The last
lines the script prints are what moved against the blockout, part by part.
"""

import argparse
import math
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402
from mathutils.bvhtree import BVHTree  # noqa: E402
from mathutils.geometry import convex_hull_2d  # noqa: E402

import kit  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
BLOCKOUT = REPO / "docs/concept-art/models/corvette-pelagia.glb"
OUT = REPO / "docs/concept-art/spikes/corvette-pelagia-blender.glb"

parser = argparse.ArgumentParser()
parser.add_argument("--out", type=Path, default=OUT)
parser.add_argument("--maps", type=Path, help="also write the two maps here as PNGs")
parser.add_argument("--normal-size", type=int, default=1024)
parser.add_argument("--occlusion-size", type=int, default=512)
parser.add_argument("--samples", type=int, default=64)
args = parser.parse_args()

started = time.time()
kit.reset(samples=args.samples)
ref = kit.Reference(BLOCKOUT)

root = bpy.data.objects.new(ref.root, None)
bpy.context.scene.collection.objects.link(root)

chitin = kit.material("chitin_hull", ref.finish["chitin_hull"])
ridge = kit.material("growth_ridge", ref.finish["growth_ridge"])
spore = kit.material("spore_pod", ref.finish["spore_pod"])
membrane = kit.material("algae_membrane", ref.finish["algae_membrane"])
light = kit.material("bio_light", ref.finish["bio_light"])

mapped = []  # every part that takes the two maps: all but the lamps
lamps = []


# --- the hull ----------------------------------------------------------------
def table_hit(part):
    """Rays against the blockout's own faces, in the part's box frame with
    its long axis first, as kit.capsule_part throws them."""
    order = sorted(range(3), key=lambda i: -part.half[i])
    verts = [Vector((v - part.centre)[i] for i in order) for v in part.local]
    tree = BVHTree.FromPolygons(verts, part.faces)

    def hit(origin, direction):
        location = tree.ray_cast(origin, direction)[0]
        assert location is not None, f"{part.name}: a ray left the blockout"
        return location

    return hit


hull = kit.capsule_part(
    "hull",
    ref["hull"],
    chitin,
    root,
    hit=table_hit(ref["hull"]),
    lattice=(16, 6, 6),
    levels=2,
    rounds=14,
)
kit.realise(hull)
mapped.append(hull)
skin = kit.world_bvh(hull)

jaw = kit.capsule_part("jaw_lobe", ref["jaw_lobe"], chitin, root, lattice=(4, 2, 2), levels=2)
mapped.append(kit.realise(jaw))


# --- growth rings ------------------------------------------------------------
# A section through the band: (along the keel in half-widths, height in
# crests). Steep astern, long forward, both edges sunk under the skin.
LIP = [(-1.0, -0.6), (-0.9, 0.5), (-0.55, 1.0), (0.0, 0.85), (0.6, 0.4), (1.0, -0.6)]
SUNK = 0.4


def growth_ring(name, around=72):
    part = ref[name]
    thin = min(range(3), key=lambda i: part.half[i])
    u, v = [i for i in range(3) if i != thin]
    turn = part.frame.to_3x3()
    axis = turn @ Vector(1 if i == thin else 0 for i in range(3))
    if axis.x < 0:
        axis = -axis
    centre = part.frame @ part.centre
    spokes, proud = [], []
    for i in range(around):
        t = 2 * math.pi * i / around
        rim = Vector((0, 0, 0))
        rim[u], rim[v] = part.half[u] * math.cos(t), part.half[v] * math.sin(t)
        rim = turn @ rim
        out = rim.normalized()
        spokes.append(out)
        proud.append(rim.length - (skin.ray_cast(centre, out)[0] - centre).length)
    crest = min(max(sum(proud) / len(proud), 0.3), 1.2)
    width = part.half[thin]
    to_local = part.frame.inverted()
    rings = []
    for out in spokes:
        ring = []
        for s, p in LIP:
            foot = skin.ray_cast(centre + axis * (s * width), out)[0]
            ring.append(to_local @ (foot + out * (p * crest if p > 0 else p * SUNK)))
        rings.append(ring)
    obj = kit.sweep_part(name, part.frame, rings, ridge, root, levels=0, around=True, tube=False)
    # The lip keeps its section and loses its knife edges: a bevel, not a
    # subdivision, which would have rounded the steep face away with them.
    kit.bevel(obj, width=0.12)
    print(
        f"  {name}: crest {crest:.2f} m (blockout stood {min(proud):+.2f}..{max(proud):+.2f} m off the skin)"
    )
    return kit.realise(obj)


for n in (1, 2, 3):
    mapped.append(growth_ring(f"growth_ring_{n}"))


# --- collars -----------------------------------------------------------------
def collar(name, at, onto, major, minor=0.14, sink=0.04):
    """A ring of ridge where a round part leaves a surface: on the surface's
    nearest point to `at`, about its normal there."""
    foot, normal, _, _ = onto.find_nearest(at)
    frame = Matrix.Translation(foot)
    rings = kit.torus_rings(-normal * sink, normal, major, minor, around=16, tube=6)
    return kit.sweep_part(name, frame, rings, ridge, root, levels=0, around=True, tube=True)


# --- seeds and lamps: the small round parts ----------------------------------
def plan_area(points):
    flat = [(p.x, p.y) for p in points]
    ring = [flat[i] for i in convex_hull_2d(flat)]
    return (
        abs(
            sum(
                ring[i][0] * ring[(i + 1) % len(ring)][1]
                - ring[(i + 1) % len(ring)][0] * ring[i][1]
                for i in range(len(ring))
            )
        )
        / 2
    )


def round_part(name, mat, levels):
    """A sphere the facet rule cut to five by three (#919) is a spindle,
    fatter between its rings than the ellipsoid its box holds. Rebuilt
    smooth, it is that ellipsoid scaled until it shows the plan area the
    blockout showed from above: for a lamp that is gate 3's own measure,
    and a seed is held to the same rule. Returns the part and the scale."""
    part = ref[name]
    showed = plan_area(part.world)
    obj = kit.realise(
        kit.capsule_part(name, part, mat, root, lattice=(2, 2, 2), levels=levels, nose=1.0)
    )
    k = math.sqrt(showed / plan_area([obj.matrix_world @ v.co for v in obj.data.vertices]))
    for vert in obj.data.vertices:
        vert.co = part.centre + (vert.co - part.centre) * k
    return obj, k


# --- launchers ---------------------------------------------------------------
for launcher, seeds in (
    ("launcher_port_fwd", 4),
    ("launcher_port_aft", 3),
    ("launcher_starboard", 4),
):
    sheath = kit.capsule_part(
        f"{launcher}_sheath", ref[f"{launcher}_sheath"], ridge, root, lattice=(4, 2, 2), levels=2
    )
    mapped.append(kit.realise(sheath))
    back = kit.world_bvh(sheath)
    for n in range(1, seeds + 1):
        part = ref[f"{launcher}_seed_{n}"]
        seed, k = round_part(part.name, spore, levels=2)
        mapped.append(seed)
        girth = sorted(part.half)[1] * k
        mapped.append(
            collar(
                f"{launcher}_collar_{n}",
                part.frame @ part.centre,
                back,
                major=girth * 0.98,
                minor=0.16,
            )
        )


# --- membranes ---------------------------------------------------------------
def membrane_part(name, along=26, across=10):
    """A fin: the blockout's outline as a lens. Thickness is an ellipse
    across the chord, so the rim is round rather than a knife, and along the
    span it swells at the root and thins to the tip. Each vertex keeps its
    place on the fin as (span, chord) in a `param` UV layer, which is what
    the rays of the height field run along."""
    part = ref[name]
    lo, hi = part.box
    thin = min(range(3), key=lambda i: part.half[i])
    span = max(range(3), key=lambda i: part.half[i])
    chord = 3 - thin - span
    root_s, tip_s = (lo[span], hi[span]) if abs(lo[span]) < abs(hi[span]) else (hi[span], lo[span])

    # The outline: the edges one cap face owns alone.
    def key(i):
        return (round(part.local[i][span], 4), round(part.local[i][chord], 4))

    owners = {}
    for f in part.faces:
        if all(abs(part.local[i][thin] - lo[thin]) < 1e-4 for i in f):
            for s in range(len(f)):
                a, b = key(f[s]), key(f[(s + 1) % len(f)])
                if a != b:
                    owners[tuple(sorted((a, b)))] = owners.get(tuple(sorted((a, b))), 0) + 1
    outline = [e for e, count in owners.items() if count == 1]

    def chord_at(s):
        cuts = []
        for (s0, c0), (s1, c1) in outline:
            if (s0 - s) * (s1 - s) <= 0 and s0 != s1:
                cuts.append(c0 + (c1 - c0) * (s - s0) / (s1 - s0))
        assert len(cuts) >= 2, f"{name}: no chord at span {s:.3f}"
        return min(cuts), max(cuts)

    mid = part.centre[thin]
    verts, param, grid = [], [], {}

    def add(i, j, side, s, c, h, t, q):
        p = Vector((0, 0, 0))
        p[span], p[chord], p[thin] = s, c, mid + side * h
        grid[(i, j, side)] = len(verts)
        verts.append(p)
        param.append((t, q))

    for i in range(along):
        t = (1 - math.cos(math.pi * i / (along - 1))) / 2
        s = root_s + (tip_s - root_s) * t
        # The outline closes to a point at each end, and a lens cannot: the
        # last station stands on the blockout's own end, so the box intake
        # measures the hull by is kept, with the chord from a hair inboard.
        c0, c1 = chord_at(root_s + (tip_s - root_s) * min(max(t, 0.012), 0.988))
        swell = 1 + 0.9 * (1 - min(t / 0.16, 1.0)) ** 2
        taper = 1 - 0.62 * t
        for j in range(across + 1):
            q = (1 - math.cos(math.pi * j / across)) / 2
            h = part.half[thin] * swell * taper * math.sqrt(max(4 * q * (1 - q), 0.0))
            c = c0 + (c1 - c0) * q
            if j in (0, across):
                add(i, j, 0, s, c, 0.0, t, q)
                grid[(i, j, 1)] = grid[(i, j, -1)] = grid[(i, j, 0)]
            else:
                add(i, j, 1, s, c, h, t, q)
                add(i, j, -1, s, c, h, t, q)

    faces, seams = [], set()
    for i in range(along - 1):
        for j in range(across):
            for side in (1, -1):
                faces.append(
                    [
                        grid[(i, j, side)],
                        grid[(i + 1, j, side)],
                        grid[(i + 1, j + 1, side)],
                        grid[(i, j + 1, side)],
                    ]
                )
        for j in (0, across):
            seams.add(tuple(sorted((grid[(i, j, 0)], grid[(i + 1, j, 0)]))))
    for i in (0, along - 1):
        loop = [grid[(i, j, 1)] for j in range(across + 1)] + [
            grid[(i, j, -1)] for j in range(across - 1, 0, -1)
        ]
        faces.append(loop)
        seams |= {tuple(sorted((loop[k], loop[(k + 1) % len(loop)]))) for k in range(len(loop))}

    obj = kit.add_part(name, part.frame, verts, faces, membrane, root, seams=seams)
    layer = obj.data.uv_layers.new(name="param")
    for loop in obj.data.loops:
        layer.data[loop.index].uv = param[loop.vertex_index]
    return obj


FINS = [
    "dorsal_blade",
    "pectoral_port",
    "pectoral_starboard",
    "keel_blade",
    "tail_fluke_upper",
    "tail_fluke_lower",
]
for name in FINS[:4]:
    mapped.append(membrane_part(name))


# --- the tail ----------------------------------------------------------------
def stalk(name, around=16, stations=7):
    part = ref[name]
    long = max(range(3), key=lambda i: part.half[i])
    u, v = [i for i in range(3) if i != long]

    def radius_at(end):
        near = [p for p in part.local if abs(p[long] - end) < 1e-3]
        return max(math.hypot(p[u] - part.centre[u], p[v] - part.centre[v]) for p in near)

    lo, hi = part.box[0][long], part.box[1][long]
    r_lo, r_hi = radius_at(lo), radius_at(hi)
    rings = []
    # A ring a hair inside each end holds the cap flat under subdivision.
    for t in [0.0, 0.02] + [i / (stations - 1) for i in range(1, stations - 1)] + [0.98, 1.0]:
        r = r_lo + (r_hi - r_lo) * t
        ring = []
        for k in range(around):
            a = 2 * math.pi * k / around
            p = Vector((0, 0, 0))
            p[long] = lo + (hi - lo) * t
            p[u], p[v] = part.centre[u] + r * math.cos(a), part.centre[v] + r * math.sin(a)
            ring.append(p)
        rings.append(ring)
    return kit.realise(
        kit.sweep_part(
            name, part.frame, rings, chitin, root, levels=1, around=False, tube=True, caps=True
        )
    )


mapped.append(stalk("tail_peduncle"))
for name in FINS[4:]:
    mapped.append(membrane_part(name))


# --- lamps -------------------------------------------------------------------
LAMPS = (
    "bow_light",
    "hullline_port_1",
    "hullline_port_2",
    "hullline_port_3",
    "hullline_starboard_1",
    "hullline_starboard_2",
    "tail_light",
)
for name in LAMPS:
    part = ref[name]
    bud, k = round_part(name, light, levels=1)
    lamps.append(bud)
    seat = skin if name != "tail_light" else kit.world_bvh(bpy.data.objects["tail_peduncle"])
    # A low lip clear of the bud: on a sloped shoulder a tall calyx stands
    # over the lamp it rings, and the first cut hid a seventh of the light.
    mapped.append(
        collar(
            f"{name}_calyx",
            part.frame @ part.centre,
            seat,
            major=max(part.half) * k + 0.12,
            minor=0.09,
            sink=0.05,
        )
    )

# The light a lamp owes gate 3 is the plan area it showed, with everything
# that now stands near it in place. Each bud is scaled onto the blockout's.
for _ in range(3):
    for bud in lamps:
        k = math.sqrt(ref.shows[bud.name] / kit.seen_from_above(bud))
        centre = ref[bud.name].centre
        for vert in bud.data.vertices:
            vert.co = centre + (vert.co - centre) * k
for bud in lamps:
    print(
        f"  {bud.name}: shows {kit.seen_from_above(bud):.3f} m² from above, the blockout {ref.shows[bud.name]:.3f}"
    )


# --- what each material's surface is -----------------------------------------
TAU = 2 * math.pi

h = kit.Height(chitin)
p = h.position()
# Scutes about 5 m long and 3 across, a groove between, each domed and
# carrying its own growth lines: the navy's "growth rings", at plate scale.
d = h.cells(h.scaled(p, (1 / 5.0, 1 / 3.0, 1 / 3.0)), 1.0, "DISTANCE_TO_EDGE")
groove = h.math("MULTIPLY", h.math("SUBTRACT", h.ramp(d, 0.0, 0.07), 1.0), 0.10)
dome = h.math("MULTIPLY", h.ramp(d, 0.0, 0.45), 0.06)
lines = h.math(
    "MULTIPLY",
    h.math("MULTIPLY", h.math("SINE", h.math("MULTIPLY", d, TAU * 7)), h.ramp(d, 0.05, 0.15)),
    0.012,
)
drift = h.math("MULTIPLY", h.noise(p, 0.35), 6.0)
stria = h.math(
    "MULTIPLY",
    h.math("SINE", h.math("ADD", h.math("MULTIPLY", h.axis(p, 0), TAU / 1.1), drift)),
    0.010,
)
pits = h.math("MULTIPLY", h.noise(p, 3.0, 3.0), 0.02)
h.bump(h.total(groove, dome, lines, stria, pits))

h = kit.Height(ridge)
p = h.position()
# A grain round the hull: bands square to the keel, and a fibre along them.
drift = h.math("MULTIPLY", h.noise(p, 0.5), 5.0)
bands = h.math(
    "MULTIPLY",
    h.math("SINE", h.math("ADD", h.math("MULTIPLY", h.axis(p, 0), TAU / 0.55), drift)),
    0.03,
)
fibre = h.math("MULTIPLY", h.noise(h.scaled(p, (4.0, 0.6, 0.6)), 1.0, 3.0), 0.05)
h.bump(h.total(bands, fibre))

h = kit.Height(spore)
h.bump(h.math("MULTIPLY", h.noise(h.position(), 2.0), 0.015))

h = kit.Height(membrane)
uv = h.uv("param")
along, across = h.axis(uv, 0), h.axis(uv, 1)
# Eight rays from root to tip, a line of constant chord each, with the web
# between them finely crossed.
ray = h.math(
    "MULTIPLY",
    h.math(
        "POWER", h.math("ABSOLUTE", h.math("SINE", h.math("MULTIPLY", across, math.pi * 8))), 8.0
    ),
    0.07,
)
web = h.math("MULTIPLY", h.math("SINE", h.math("MULTIPLY", along, TAU * 30)), 0.006)
h.bump(h.total(ray, web))


# --- maps and file -----------------------------------------------------------
kit.atlas(mapped)
density, filled = kit.texel_density(mapped, args.normal_size)
built = time.time()
normal, occlusion = kit.bake(mapped, args.normal_size, args.occlusion_size)
baked = time.time()
kit.wire_maps(mapped, normal, occlusion)

if args.maps:
    args.maps.mkdir(parents=True, exist_ok=True)
    for image in (normal, occlusion):
        image.filepath_raw = str(args.maps / f"{image.name}.png")
        image.file_format = "PNG"
        image.save()

args.out.parent.mkdir(parents=True, exist_ok=True)
kit.export_glb(args.out, mapped + lamps, root)
kit.finish_glb(args.out, ref.finish)

print(f"{args.out.relative_to(REPO) if args.out.is_relative_to(REPO) else args.out}")
print(
    f"  {len(mapped) + len(lamps)} parts, {kit.triangles(mapped + lamps):,} triangles, {os.path.getsize(args.out):,} bytes"
)
print(f"  atlas {filled:.0%} filled, {density:.1f} texels a metre at {args.normal_size}²")
print(f"  build {built - started:.0f} s, bake {baked - built:.0f} s, on {os.cpu_count()} threads")
print("  boxes that moved more than 5 cm against the blockout:")
for worst, name, (x0, x1, y0, y1, z0, z1) in kit.moved(ref):
    print(
        f"    {name}: {worst:.2f} m  (x {x0:+.2f} {x1:+.2f}, y {y0:+.2f} {y1:+.2f}, z {z0:+.2f} {z1:+.2f})"
    )
