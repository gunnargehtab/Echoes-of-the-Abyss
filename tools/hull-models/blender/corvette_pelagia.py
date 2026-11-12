"""
The Commune's Corvette at a higher surface bar, built in headless Blender
(#1802, a spike: it replaces no shipped model).

    python tools/hull-models/blender/corvette_pelagia.py [--maps <dir>]

It answers to the same blocks as hulls/corvette-pelagia.mjs (the Corvette
block of docs/asset-prompts-3d.md Block 3, read with the Pelagia FACTION
block) and reads that script's GLB as its blockout, so nothing here is a
new hull: 80 m, the same 33 parts by name under the same nodes, the same
five materials, the same seven lamps. What changes is what a part is made
of, and each change below is a shape decision for the owner to take or
refuse with the spike.

- `hull`: the blockout's 16 × 11 table re-skinned as a fitted subdivision
  cage, its rays thrown from the line through the table's two tips. Its
  box is within 7 cm of the table's.
- `jaw_lobe` and the three sheaths: the ellipsoid each scaled sphere stood
  for, subdivided.
- `growth_ring_1..3`: a lipped band laid on the skin, steep astern and long
  forward, its edges bevelled 0.12 m, at the mean height its blockout torus
  stood proud. The torus was an ellipse round a hull that is not one, so it
  floated in places and sank in others; the band follows the skin, and its
  box moves up to 0.68 m. Where the blockout's rings run through a
  launcher the bands still do: that is the approved hull's, and kept.
- The six membranes: the blockout's own outline, as a lens that swells
  0.19 m a side at the root and thins to the tip, where the blockout had a
  0.42 m slab.
- `tail_peduncle`: the blockout's frustum, subdivided: its end caps kept
  flat and their rims rounded.
- The eleven seeds and the seven lamps: the facet rule cut each sphere to a
  spindle (#919), nearer a barrel than a ball. Each is rebuilt smooth as a
  barrel showing what the blockout showed along its pole, square to it and
  between (`round_part`). For a lamp the area from above is then read with
  everything near it in place, so gate 3 reads the light it read and the
  conn view draws the lamp the size it drew. Same material, same emission.
- Each lamp is moved along its seat's normal until it stands off the
  smoothed skin what it stood off the blockout's: a light placement moved.
  `bow_light` moves 0.20 m, since the table's nose under it was a
  two-vertex wedge and the smooth nose is not; the other six move 5 cm or
  less.
- Added, and in no block: a collar along the line where a seed leaves its
  sheath and a calyx where a lamp leaves the skin, 15 small rings of
  ridge, nine and six. A ring is not built where a growth ring would cross
  it (`launcher_starboard_seed_4`) or where less than 15% of it would show
  (`launcher_port_aft_seed_3`, which the hull covers, and
  `hullline_starboard_2`). The blockout's two unnamed point lights are not
  carried: the conn view keeps a model's meshes alone when it merges one
  (rosterModels.ts `mergeByMaterial`), and no map sees them.

Baked: a 1,024² normal map from each material's height field below (veins
as a leaf carries them over growth lines on the chitin, a grain on the
ridge, rays on the membranes) and a 512² occlusion map of the parts on one another, both
on the second UV set. The last lines the script prints are what moved
against the blockout, part by part.
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
TAU = 2 * math.pi


# --- the hull ----------------------------------------------------------------
def table_hit(part):
    """Rays against the blockout's own faces, in the part's box frame with
    its long axis first, as kit.capsule_part throws them. Also where the
    table's two tips stand off the box's axis, which is the line the rays
    must take to find them."""
    order = sorted(range(3), key=lambda i: -part.half[i])
    verts = [Vector((v - part.centre)[i] for i in order) for v in part.local]
    tree = BVHTree.FromPolygons(verts, part.faces)
    tips = [v for v in verts if abs(abs(v[0]) - part.half[order[0]]) < 1e-3]
    axis = (sum(v[1] for v in tips) / len(tips), sum(v[2] for v in tips) / len(tips))

    def hit(origin, direction):
        location = tree.ray_cast(origin, direction)[0]
        assert location is not None, f"{part.name}: a ray left the blockout"
        return location

    return hit, axis


on_table, tips = table_hit(ref["hull"])
hull = kit.capsule_part(
    "hull",
    ref["hull"],
    chitin,
    root,
    hit=on_table,
    lattice=(16, 6, 6),
    levels=2,
    rounds=60,
    axis=tips,
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


bands = [growth_ring(f"growth_ring_{n}") for n in (1, 2, 3)]
mapped.extend(bands)


def world(obj):
    return [obj.matrix_world @ v.co for v in obj.data.vertices]


def under(tree, p):
    """Whether a point is inside a closed part, by its nearest face."""
    foot, n, _, _ = tree.find_nearest(p)
    return (p - foot).dot(n) < 0


def showing(ring, *parts):
    """The share of a ring's vertices outside every part named: what of it
    a camera could see. A ring wholly under the hull meets no surface, so
    `kit.meets` passes it; the second review found one built 1.56 m under."""
    trees = [kit.world_bvh(part) for part in parts]
    points = world(ring)
    return sum(1 for p in points if not any(under(t, p) for t in trees)) / len(points)


# A ring is built to be seen. One that shows less than this is not built.
SHOWS = 0.15


# --- collars -----------------------------------------------------------------
def collar(name, bud, seat, minor, parent=None, around=16, tube=6):
    """A ring of ridge along the line where a round part leaves the surface
    it sits in, both read as built. From the bud's centre a ray swings from
    the way out of the seat toward the way in, and stops where the bud's own
    skin crosses the seat's; sixteen of those are the line. The first cut
    laid a circle on the seat instead, and a seed is not a sphere: three of
    the eleven rings stood off their seeds on the narrow side."""
    centre = sum((bud.matrix_world @ v.co for v in bud.data.vertices), Vector()) / len(
        bud.data.vertices
    )
    own, below = kit.world_bvh(bud), kit.world_bvh(seat)

    def leaves(direction):
        return own.ray_cast(centre, direction)[0]

    def inside(p):
        return under(below, p)

    foot, n, _, _ = below.find_nearest(centre)
    out = n if inside(centre) else (centre - foot).normalized()
    assert not inside(leaves(out)) and inside(leaves(-out)), f"{name}: no line to follow"
    e1 = out.orthogonal().normalized()
    e2 = out.cross(e1)
    rings = []
    for i in range(around):
        side = e1 * math.cos(TAU * i / around) + e2 * math.sin(TAU * i / around)
        lo, hi = 0.0, math.pi
        for _ in range(24):
            mid = (lo + hi) / 2
            if inside(leaves(out * math.cos(mid) + side * math.sin(mid))):
                hi = mid
            else:
                lo = mid
        p = leaves(out * math.cos(lo) + side * math.sin(lo))
        n = below.find_nearest(p)[1]
        away = p - centre
        away = (away - n * away.dot(n)).normalized()
        rings.append(
            [
                p
                - centre
                + (away * math.cos(TAU * k / tube) + n * math.sin(TAU * k / tube)) * minor
                for k in range(tube)
            ]
        )
    return kit.sweep_part(
        name,
        Matrix.Translation(centre),
        rings,
        ridge,
        parent or root,
        levels=0,
        around=True,
        tube=True,
    )


# --- seeds and lamps: the small round parts ----------------------------------
def outline_area(flat):
    ring = [flat[i] for i in convex_hull_2d(flat)]
    return abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(ring, ring[1:] + ring[:1]))) / 2


def seen(points, pole, elevation, views=8):
    """The outline area a convex part shows from `elevation` above the plane
    square to `pole`, the mean round the compass."""
    u = pole.orthogonal().normalized()
    v = pole.cross(u)
    total = 0.0
    for i in range(views):
        t = TAU * i / views
        look = (u * math.cos(t) + v * math.sin(t)) * math.cos(elevation) + pole * math.sin(
            elevation
        )
        a = look.orthogonal().normalized()
        b = look.cross(a)
        total += outline_area([(p.dot(a), p.dot(b)) for p in points])
    return total / views


ALONG, SQUARE = math.pi / 2, 0.0
# The pitches a conn camera looks down by: the free-water study opens at 15°
# and the home view is 55° (tools/render-stack/capture.mjs).
OBLIQUE = tuple(math.radians(deg) for deg in (15, 30, 45, 55))


def round_part(name, mat, levels, parent=None, power=None):
    """A sphere the facet rule cut to five by three (#919) is a spindle on
    its poles, and nearer a barrel than a ball: along the pole it shows a
    pentagon, well under the circle it was cut from, square to the pole
    nearly all of it, and between the two more than an ellipsoid would.
    Rebuilt smooth it is a barrel on the same box, round about the pole,
    scaled across until it shows what the blockout showed along the pole and
    lengthways until it shows the same square to it; `BARREL` is the power
    that then comes nearest at the pitches between. A lamp's pole is up, so
    those are the areas gate 3's maps and the conn view read. The first cut
    was an ellipsoid held from above alone, and its lamps drew a fifth
    smaller in the game. A seed is held to the same rule. The lattice is
    four a side: two could not hold the shoulders. Returns the part and its
    scale across."""
    part = ref[name]
    axis = max(range(3), key=lambda i: part.half[i])
    pole = Vector(1.0 if i == axis else 0.0 for i in range(3))
    showed = [v - part.centre for v in part.local]
    obj = kit.realise(
        kit.capsule_part(
            name,
            part,
            mat,
            parent or root,
            lattice=(4, 4, 4),
            levels=levels,
            ball=True,
            power=power or BARREL,
        )
    )

    def shows(elevation):
        return seen([v.co - part.centre for v in obj.data.vertices], pole, elevation)

    across = math.sqrt(seen(showed, pole, ALONG) / shows(ALONG))
    for vert in obj.data.vertices:
        d = vert.co - part.centre
        vert.co = part.centre + pole * d.dot(pole) + (d - pole * d.dot(pole)) * across
    along = seen(showed, pole, SQUARE) / shows(SQUARE)
    for vert in obj.data.vertices:
        d = vert.co - part.centre
        vert.co = part.centre + d + pole * (d.dot(pole) * (along - 1))
    obj["miss"] = max(abs(shows(e) / seen(showed, pole, e) - 1) for e in OBLIQUE)
    return obj, across


def barrel_power(name):
    """The power at which a rebuilt spindle shows most nearly what its
    blockout showed between along and square, tried on one part: every seed
    and lamp is the same 5 × 3 sphere at its own scale. An ellipsoid, power
    2, is tried first, to be seen losing."""
    tried = []
    for power in [2.0] + [2.4 + 0.2 * i for i in range(14)]:
        trial, _ = round_part(name, None, 0, power=power)
        tried.append((trial["miss"], power))
        bpy.data.objects.remove(trial, do_unlink=True)
    miss, power = min(tried)
    print(
        f"  seeds and lamps: power {power:.1f}, within {miss:.1%} of the blockout"
        f" from 15° to 55° (an ellipsoid, {tried[0][0]:.1%})"
    )
    return power


BARREL = barrel_power("bow_light")


# --- launchers ---------------------------------------------------------------
for launcher, seeds in (
    ("launcher_port_fwd", 4),
    ("launcher_port_aft", 3),
    ("launcher_starboard", 4),
):
    node = kit.group(launcher, ref.groups[launcher], root)
    sheath = kit.capsule_part(
        f"{launcher}_sheath", ref[f"{launcher}_sheath"], ridge, node, lattice=(4, 2, 2), levels=2
    )
    mapped.append(kit.realise(sheath))
    for n in range(1, seeds + 1):
        part = ref[f"{launcher}_seed_{n}"]
        seed, k = round_part(part.name, spore, levels=1, parent=node)
        mapped.append(seed)
        ring = collar(f"{launcher}_collar_{n}", seed, sheath, minor=0.14, parent=node)
        assert kit.meets(ring, seed), f"{ring.name} stands off its seed"
        # A growth ring already crosses the launchers at five pairs, as it
        # does in the blockout. Where the band runs over a seed, the seed gets
        # no collar: the ring would only be one more thing the band cuts. And
        # a launcher is rolled into the flank, so the hull takes part of some
        # collars as it takes part of their seeds; one it takes whole, or
        # nearly, is not built either.
        shows = showing(ring, hull, sheath, seed)
        if any(kit.meets(ring, band) for band in bands):
            print(f"  {ring.name}: not built, a growth ring crosses its seed")
            bpy.data.objects.remove(ring, do_unlink=True)
        elif shows < SHOWS:
            print(f"  {ring.name}: not built, {shows:.0%} of it would show")
            bpy.data.objects.remove(ring, do_unlink=True)
        else:
            print(f"  {ring.name}: {shows:.0%} shows, {showing(ring, hull):.0%} clear of the hull")
            mapped.append(ring)


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
    bud, k = round_part(name, light, levels=0)
    lamps.append(bud)
    seat = bpy.data.objects["tail_peduncle" if name == "tail_light" else "hull"]
    # A lamp rests on something (#894), and how deep is part of where it is.
    # The skin under a lamp moves when it is smoothed, most at the nose and
    # at the peduncle's rounded end, so each lamp is moved along its seat's
    # normal until its centre stands off the skin what it stood off the
    # blockout's. That is a light placement moved, and the script says by
    # how much.
    was, now = ref[seat.name].bvh(), kit.world_bvh(seat)
    at = part.frame @ part.centre
    foot, n, _, _ = was.find_nearest(at)
    stood = (at - foot).dot(n)
    moved = Vector((0, 0, 0))
    for _ in range(3):
        foot, n, _, _ = now.find_nearest(at + moved)
        moved += n * (stood - (at + moved - foot).dot(n))
    bud.matrix_world = Matrix.Translation(moved) @ bud.matrix_world
    print(f"  {name}: stands {stood:.2f} m off its seat, moved {moved.length:.2f} m to keep that")
    # A lip 7 cm high along the line the bud leaves the skin by: low, so it
    # hides none of the lamp it rings from any side.
    calyx = collar(f"{name}_calyx", bud, seat, minor=0.07)
    shows = showing(calyx, seat, bud)
    if shows < SHOWS:
        print(f"  {calyx.name}: not built, {shows:.0%} of it would show")
        bpy.data.objects.remove(calyx, do_unlink=True)
    else:
        mapped.append(calyx)


# The light a lamp owes gate 3 is the plan area it showed, with everything
# that now stands near it in place: each bud is widened onto the blockout's.
# A calyx does not scale with its bud, so the area is not quite the square
# of the scale: the step is damped, and stops inside half a percent. Each
# step widens the bud and leaves its height, then sets the height again from
# the side, so a lamp half under the skin is not made taller to show more.
UP = Vector((0, 0, 1))


def stretch(bud, across, upward):
    part = ref[bud.name]
    up = part.frame.to_3x3().inverted() @ Vector((0, 0, 1))
    for vert in bud.data.vertices:
        d = vert.co - part.centre
        rise = d.dot(up)
        vert.co = part.centre + (d - up * rise) * across + up * (rise * upward)


for _ in range(16):
    for bud in lamps:
        ratio = ref.shows[bud.name] / kit.seen_from_above(bud)
        if abs(ratio - 1) < 0.005:
            continue
        stretch(bud, ratio**0.35, 1.0)
        stretch(bud, 1.0, seen(ref[bud.name].world, UP, SQUARE) / seen(world(bud), UP, SQUARE))
for bud in lamps:
    # A lamp rests on something (#894): each bud still crosses the skin it
    # grew from. A smoothed nose that left the bow light in the water passed
    # every box check, since the lamp had not moved and the hull had.
    seat = bpy.data.objects["tail_peduncle" if bud.name == "tail_light" else "hull"]
    assert kit.meets(bud, seat), f"{bud.name} floats off {seat.name}"
    was, now = ref[bud.name].world, world(bud)
    print(
        f"  {bud.name}: seated, shows {kit.seen_from_above(bud):.3f} m² from above"
        f" (the blockout {ref.shows[bud.name]:.3f}),"
        f" {seen(now, UP, SQUARE):.3f} from the side ({seen(was, UP, SQUARE):.3f}),"
        f" {seen(now, UP, OBLIQUE[0]):.3f} from 15° ({seen(was, UP, OBLIQUE[0]):.3f}),"
        f" {seen(now, UP, OBLIQUE[3]):.3f} from 55° ({seen(was, UP, OBLIQUE[3]):.3f})"
    )


# --- what each material's surface is -----------------------------------------
h = kit.Height(chitin)
p = h.position()
# The block's two nouns for this skin: "growth rings and living ... veins".
# Veins as a leaf carries them: a midrib down the back and a lesser one down
# the keel, laterals leaving the midrib every 5.5 m and trailing aft as they
# run down the flank, and a fine net between them, over growth lines square
# to the keel. The second review read a net alone as scales. Relief only: a
# vein that glowed would be a lamp, and gate 3 counts lamps.
along, across, above = h.axis(p, 0), h.axis(p, 1), h.math("ADD", h.axis(p, 2), 0.5)
turn = h.math("ABSOLUTE", h.math("ARCTAN2", across, above))  # 0 on the back, π on the keel
wander = h.math("MULTIPLY", h.noise(p, 0.12), 3.0)
station = h.math("DIVIDE", h.total(along, h.math("MULTIPLY", turn, 5.4), wander), 5.5)
lateral = h.math(
    "MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(h.math("PINGPONG", station, 0.5), 0.0, 0.05)), 0.08
)
midrib = h.math("MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(turn, 0.0, 0.08)), 0.10)
keel = h.math(
    "MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(h.math("SUBTRACT", math.pi, turn), 0.0, 0.08)), 0.06
)
net = h.cells(h.scaled(p, (1 / 2.2, 1 / 1.4, 1 / 1.4)), 1.0, "DISTANCE_TO_EDGE")
veinlet = h.math("MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(net, 0.0, 0.06)), 0.025)
drift = h.math("MULTIPLY", h.noise(p, 0.3), 7.0)
growth = h.math(
    "MULTIPLY",
    h.math("SINE", h.math("ADD", h.math("MULTIPLY", along, TAU / 0.9), drift)),
    0.014,
)
pits = h.math("MULTIPLY", h.noise(p, 3.0, 3.0), 0.015)
h.bump(h.total(lateral, midrib, keel, veinlet, growth, pits))

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
kit.atlas(mapped, bare=lamps)
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
