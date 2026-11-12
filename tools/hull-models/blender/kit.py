"""
Hull models built in headless Blender: the shared kit (#1802, a spike).

`tools/hull-models/kit.mjs` assembles three.js primitives, and a primitive has
no bevel, no subdivision and no map but the occlusion one. This kit is the
same three layers with another generator under them: Blender as a Python
module (`bpy`, pinned in requirements.txt), no window and no GPU.

    python tools/hull-models/blender/<hull>.py

A hull script here does not restate a hull. It reads the approved GLB as its
blockout (`Reference`) and rebuilds each part to a higher surface bar inside
that part's own frame, so the kit script stays the shape of record and the
two files cannot drift: every part keeps its name and its node's rotation
and translation, and the hull keeps the length intake measures it by.

What this kit adds that kit.mjs cannot:

- **Bevels**, on any edge of any part (`bevel`), where kit.mjs has one
  chamfer and only on a plate.
- **Subdivision**, on cages moved until the smooth surface passes through
  the points they were laid on (`fit_limit`), not inside them.
- **Baked maps.** One tangent-space normal map and one occlusion map a hull,
  on one atlas on the second UV set, as the kit's occlusion map is
  (art-direction.md, "Bevels and baked occlusion"), baked by Cycles on the
  CPU from the script's own
  procedural surface (`bake`). The normal map is what a material's height
  field says; the occlusion map is what the parts shade of one another.
- **A lamp measured as gate 3 sees it** (`seen_from_above`): the plan area
  nothing stands over, read off the blockout and owed by the rebuild.

`finish_glb` then puts the exporter's file the way glb.mjs reads one.

Frame: Blender's, which the glTF exporter turns into the kit's. Bow on +X,
+Z up, and +Y is port, since the kit's +z is starboard (kit.mjs `bothSides`).
Metres throughout.
"""

import json
import math
import struct
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree


def reset(samples=64):
    """An empty file with Cycles on the CPU. Fixed seed: a bake is a build
    step, and a build step that differs run to run cannot be checked."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.seed = 0
    scene.cycles.use_animated_seed = False
    scene.cycles.use_denoising = False
    scene.world = bpy.data.worlds.new("bake")
    return scene


class Part:
    """One mesh of the blockout, read in the frame the rebuilt part keeps:
    the node's translation and rotation, with its scale folded into the
    vertices. `local` is those vertices; `box` their bounds, which through
    `frame` is the loose box intake and the runtime measure a model by."""

    def __init__(self, obj):
        loc, rot, _ = obj.matrix_world.decompose()
        self.name = obj.name
        self.frame = Matrix.Translation(loc) @ rot.to_matrix().to_4x4()
        to_local = self.frame.inverted() @ obj.matrix_world
        self.local = [to_local @ v.co for v in obj.data.vertices]
        self.world = [obj.matrix_world @ v.co for v in obj.data.vertices]
        self.faces = [tuple(p.vertices) for p in obj.data.polygons]
        self.material = obj.data.materials[0].name if obj.data.materials else None
        self.parent = obj.parent.name if obj.parent else None
        lo = Vector(min(v[i] for v in self.local) for i in range(3))
        hi = Vector(max(v[i] for v in self.local) for i in range(3))
        self.box = (lo, hi)
        self.centre = (lo + hi) / 2
        self.half = (hi - lo) / 2

    def bvh(self):
        return BVHTree.FromPolygons(self.world, self.faces)


class Reference:
    """The approved GLB as a blockout: its parts by name, in file order, and
    its materials' values. The import is removed again, so nothing of the
    blockout's geometry reaches the export. `keep` leaves it standing
    instead, lights apart, as `objects` by name: the control that wears a
    rebuild's surface on the blockout's own geometry."""

    def __init__(self, path, keep=False):
        bpy.ops.import_scene.gltf(filepath=str(path))
        objs = list(bpy.context.scene.objects)
        self.root = next(o.name for o in objs if o.parent is None)
        self.parts = {o.name: Part(o) for o in objs if o.type == "MESH"}
        # The nodes that only group: a launcher over its sheath and seeds.
        self.groups = {}
        for o in objs:
            if o.type == "EMPTY" and o.parent is not None:
                loc, rot, _ = o.matrix_world.decompose()
                self.groups[o.name] = Matrix.Translation(loc) @ rot.to_matrix().to_4x4()
        self.finish = {}
        for m in bpy.data.materials:
            b = m.node_tree.nodes["Principled BSDF"].inputs
            self.finish[m.name] = dict(
                base=tuple(b["Base Color"].default_value),
                metallic=b["Metallic"].default_value,
                roughness=b["Roughness"].default_value,
                emission=tuple(b["Emission Color"].default_value),
                strength=b["Emission Strength"].default_value,
            )
        # What each lamp shows from above, before the blockout goes: gate 3
        # sums light over the plan, so that area is what a rebuild owes it.
        self.shows = {
            o.name: seen_from_above(o)
            for o in objs
            if o.type == "MESH" and self.finish[o.data.materials[0].name]["strength"] > 0
        }
        self.objects = {}
        if keep:
            for o in objs:
                if o.type == "LIGHT":
                    bpy.data.objects.remove(o, do_unlink=True)
                else:
                    self.objects[o.name] = o
            return
        for o in objs:
            bpy.data.objects.remove(o, do_unlink=True)
        for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights):
            for item in list(block):
                block.remove(item)

    def __getitem__(self, name):
        return self.parts[name]


class Fin:
    """A membrane of the blockout read as a fin: a slab extruded from an
    outline, thin on one axis, long on another, its root at the node's
    origin. `chord_at` is the outline's two edges at a span, and `place`
    where a point of the slab sits on the fin as (span, chord), each 0 to 1:
    what the rays of a membrane's height field run along."""

    def __init__(self, part):
        self.part = part
        lo, hi = part.box
        self.thin = thin = min(range(3), key=lambda i: part.half[i])
        self.span = span = max(range(3), key=lambda i: part.half[i])
        self.chord = chord = 3 - thin - span
        self.root, self.tip = (
            (lo[span], hi[span]) if abs(lo[span]) < abs(hi[span]) else (hi[span], lo[span])
        )

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
        self.outline = [e for e, count in owners.items() if count == 1]

    def chord_at(self, s):
        cuts = []
        for (s0, c0), (s1, c1) in self.outline:
            if (s0 - s) * (s1 - s) <= 0 and s0 != s1:
                cuts.append(c0 + (c1 - c0) * (s - s0) / (s1 - s0))
        assert len(cuts) >= 2, f"{self.part.name}: no chord at span {s:.3f}"
        return min(cuts), max(cuts)

    def place(self, p):
        t = (p[self.span] - self.root) / (self.tip - self.root)
        c0, c1 = self.chord_at(self.root + (self.tip - self.root) * min(max(t, 0.012), 0.988))
        return min(max(t, 0.0), 1.0), min(max((p[self.chord] - c0) / (c1 - c0), 0.0), 1.0)


def seen_from_above(obj, step=0.02):
    """The plan area of `obj` nothing stands over, in square metres: rays
    straight down on a grid, counted where the first thing met is the part.
    The maps are top-down, so this is the area a lamp lights them with."""
    bpy.context.view_layer.update()
    deps = bpy.context.evaluated_depsgraph_get()
    scene = bpy.context.scene
    pts = [obj.matrix_world @ v.co for v in obj.data.vertices]
    x0, x1 = min(p.x for p in pts), max(p.x for p in pts)
    y0, y1 = min(p.y for p in pts), max(p.y for p in pts)
    count = 0
    for i in range(int((x1 - x0) / step) + 1):
        for j in range(int((y1 - y0) / step) + 1):
            hit = scene.ray_cast(
                deps,
                Vector((x0 + (i + 0.5) * step, y0 + (j + 0.5) * step, 1000.0)),
                Vector((0, 0, -1)),
            )
            if hit[0] and hit[4].name == obj.name:
                count += 1
    return count * step * step


# --- cages -------------------------------------------------------------------


def box_lattice(nx, ny, nz):
    """The surface of an nx × ny × nz lattice box: all quads, eight corners of
    valence three and nothing worse, which is what Catmull-Clark wants. A UV
    sphere's poles pinch under subdivision; this has none. Returns lattice
    coordinates in [-1, 1] and quads."""
    index = {}
    coords = []

    def vert(i, j, k):
        key = (i, j, k)
        if key not in index:
            index[key] = len(coords)
            coords.append((2 * i / nx - 1, 2 * j / ny - 1, 2 * k / nz - 1))
        return index[key]

    quads = []
    for i in range(nx):
        for j in range(ny):
            quads.append(
                [vert(i, j, 0), vert(i, j + 1, 0), vert(i + 1, j + 1, 0), vert(i + 1, j, 0)]
            )
            quads.append(
                [vert(i, j, nz), vert(i + 1, j, nz), vert(i + 1, j + 1, nz), vert(i, j + 1, nz)]
            )
        for k in range(nz):
            quads.append(
                [vert(i, 0, k), vert(i + 1, 0, k), vert(i + 1, 0, k + 1), vert(i, 0, k + 1)]
            )
            quads.append(
                [vert(i, ny, k), vert(i, ny, k + 1), vert(i + 1, ny, k + 1), vert(i + 1, ny, k)]
            )
    for j in range(ny):
        for k in range(nz):
            quads.append(
                [vert(0, j, k), vert(0, j, k + 1), vert(0, j + 1, k + 1), vert(0, j + 1, k)]
            )
            quads.append(
                [vert(nx, j, k), vert(nx, j + 1, k), vert(nx, j + 1, k + 1), vert(nx, j, k + 1)]
            )
    return coords, quads


def capsule_rays(coords, length, radius, nose=1.5, axis=(0.0, 0.0)):
    """A ray a lattice vertex, for a body long on X: square to the axis along
    the middle, fanned from a point inside each end over the last
    `nose × radius` of it. The side rings stay planar stations, so a body
    re-skinned by these rays keeps its sections where the blockout has them.
    `axis` stands the rays' line off the box's own, across it: a body pushed
    out of round has its two tips off that line, and a ray that passes a
    sharp tip by a hand lands well short of it."""
    reach = max(length - nose * radius, 0.0)
    off = Vector((0.0, axis[0], axis[1]))
    rays = []
    for a, b, c in coords:
        # The square's rim onto a circle, so rings come out round, not boxed.
        y, z = b * math.sqrt(1 - c * c / 2), c * math.sqrt(1 - b * b / 2)
        if abs(a) < 1:
            rays.append((Vector((a * reach, 0, 0)) + off, Vector((0, y, z)).normalized()))
        else:
            rho2 = min(y * y + z * z, 1.0)
            forward = math.copysign(nose * math.sqrt(1 - rho2), a)
            rays.append((Vector((a * reach, 0, 0)) + off, Vector((forward, y, z)).normalized()))
    return rays


def ball_rays(coords):
    """A ray a lattice vertex, for a part near round: from its centre, evenly
    over the sphere. `capsule_rays` on a short body sends every side ring
    out square at one height and the caps up past 45 degrees, and leaves the
    shoulders between them to a straight chord."""
    rays = []
    for a, b, c in coords:
        aim = Vector(
            (
                a * math.sqrt(1 - b * b / 2 - c * c / 2 + b * b * c * c / 3),
                b * math.sqrt(1 - c * c / 2 - a * a / 2 + c * c * a * a / 3),
                c * math.sqrt(1 - a * a / 2 - b * b / 2 + a * a * b * b / 3),
            )
        )
        rays.append((Vector((0, 0, 0)), aim.normalized()))
    return rays


def fit_limit(points, quads, targets, rounds=60):
    """Move a cage until its Catmull-Clark limit surface passes through
    `targets`. Subdividing a cage laid on a surface lands inside it, by a
    hand's width on a 13 m beam; this is the correction, from the limit
    position of a vertex of valence n in an all-quad mesh:
    (n² v + 4 Σ edge neighbours + Σ face diagonals) / n(n + 5). A coarse
    cage's whole shape is its highest frequency, which a round closes by a
    ninth, so the default runs long; a cage fitted to a faceted blockout
    runs short on purpose, to leave the facets behind."""
    edge = [set() for _ in points]
    diag = [[] for _ in points]
    for q in quads:
        for s in range(4):
            v = q[s]
            edge[v].update((q[s - 1], q[(s + 1) % 4]))
            diag[v].append(q[(s + 2) % 4])
    cage = [p.copy() for p in points]
    for _ in range(rounds):
        moved = []
        for v, p in enumerate(cage):
            n = len(edge[v])
            limit = (
                n * n * p
                + 4 * sum((cage[e] for e in edge[v]), Vector())
                + sum((cage[d] for d in diag[v]), Vector())
            ) / (n * (n + 5))
            moved.append(p + (targets[v] - limit))
        cage = moved
    return cage


def ellipsoid_hit(radii, power=2.0):
    """Where a ray from inside an axis-aligned ellipsoid leaves it, its long
    axis first. With `power` above 2 it is a barrel: still round about the
    long axis, and fuller in the shoulders along it,
    (y²/b² + z²/c²)^(p/2) + |x/a|^p = 1."""

    def level(p):
        across = (p[1] / radii[1]) ** 2 + (p[2] / radii[2]) ** 2
        return across ** (power / 2) + abs(p[0] / radii[0]) ** power

    def hit(origin, direction):
        lo, hi = 0.0, 4 * max(radii)
        for _ in range(48):
            mid = (lo + hi) / 2
            if level(origin + direction * mid) < 1:
                lo = mid
            else:
                hi = mid
        return origin + direction * lo

    return hit


# --- parts -------------------------------------------------------------------


def group(name, frame, root):
    """An empty node in the blockout's frame, for the parts it groups."""
    obj = bpy.data.objects.new(name, None)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = root
    obj.matrix_world = frame
    return obj


def add_part(name, frame, verts, faces, material, root, levels=0, seams=()):
    """A named mesh in its blockout's frame. `verts` are local to it."""
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces])
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.verts.ensure_lookup_table()
    for a, b in seams:
        e = bm.edges.get((bm.verts[a], bm.verts[b]))
        if e is not None:
            e.seam = True
    bm.to_mesh(mesh)
    bm.free()
    mesh.shade_smooth()
    if material is not None:
        mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent = root
    obj.matrix_world = frame
    if levels:
        sub = obj.modifiers.new("subdivision", "SUBSURF")
        sub.levels = sub.render_levels = levels
    return obj


def capsule_part(
    name,
    part,
    material,
    root,
    hit=None,
    lattice=(4, 2, 2),
    levels=2,
    nose=1.5,
    rounds=60,
    axis=(0.0, 0.0),
    power=2.0,
    ball=False,
):
    """A round part rebuilt as a fitted subdivision cage: the lattice box,
    its long side on the part's longest axis, thrown onto the part by
    `capsule_rays`. `hit(origin, direction)` says where a ray lands, in the
    part's frame about its box centre; without one the part is the ellipsoid
    its box holds, which is what a scaled sphere was meant to be, or at a
    `power` above 2 the barrel `ellipsoid_hit` describes. `ball` throws the
    lattice from the centre instead, for a part as wide as it is long."""
    order = sorted(range(3), key=lambda i: -part.half[i])
    radii = [part.half[i] for i in order]
    hit = hit or ellipsoid_hit(radii, power)
    coords, quads = box_lattice(*lattice)
    if ball:
        rays = ball_rays(coords)
    else:
        rays = capsule_rays(coords, radii[0], max(radii[1], radii[2]), nose, axis)
    targets = [hit(o, d) for o, d in rays]
    # Unsubdivided, the cage is the surface, and it stands on its targets.
    cage = fit_limit(targets, quads, targets, rounds) if levels else targets

    def back(p):
        v = Vector((0, 0, 0))
        for slot, axis in enumerate(order):
            v[axis] = p[slot]
        return v + part.centre

    nx, ny, nz = lattice
    seams = _capsule_seams(coords, quads, ny)
    return add_part(name, part.frame, [back(p) for p in cage], quads, material, root, levels, seams)


def _capsule_seams(coords, quads, ny):
    """Three islands: the sides unrolled from a cut along the lattice's
    underside, and the two ends."""
    seams = set()
    for q in quads:
        for s in range(4):
            a, b = q[s], q[(s + 1) % 4]
            pa, pb = coords[a], coords[b]
            end = (
                abs(pa[0]) == 1
                and pa[0] == pb[0]
                and (max(abs(pa[1]), abs(pa[2])) == 1 and max(abs(pb[1]), abs(pb[2])) == 1)
            )
            keel = pa[2] == -1 and pb[2] == -1 and abs(pa[1]) < 1e-9 and abs(pb[1]) < 1e-9
            if end or (keel and ny % 2 == 0):
                seams.add((min(a, b), max(a, b)))
    return seams


def sweep_part(name, frame, rings, material, root, levels=1, around=True, tube=True, caps=False):
    """A surface swept through `rings`, each a list of points local to
    `frame`. `around` joins the last ring to the first and `tube` closes
    each ring on itself: a band round a hull is the first alone, a collar
    both, and a stalk the second with `caps`. The seams cut it to one
    rectangle, plus the caps."""
    n, m = len(rings), len(rings[0])
    verts = [p for ring in rings for p in ring]
    faces = []
    seams = set()
    for i in range(n if around else n - 1):
        j = (i + 1) % n
        for k in range(m if tube else m - 1):
            l = (k + 1) % m
            faces.append([i * m + k, j * m + k, j * m + l, i * m + l])
        if tube:
            seams.add((i * m, j * m))
    for k in range(m if tube else m - 1):
        l = (k + 1) % m
        if around:
            seams.add((k, l))
        elif caps:
            seams.add((k, l))
            seams.add(((n - 1) * m + k, (n - 1) * m + l))
    if caps:
        faces.append(list(range(m)))
        faces.append(list(range((n - 1) * m, n * m)))
    seams = {(min(a, b), max(a, b)) for a, b in seams}
    return add_part(name, frame, verts, faces, material, root, levels, seams)


def bevel(obj, width, segments=2, sharper_than=25.0):
    """Round every edge sharper than an angle, `width` metres back from it.
    kit.mjs chamfers a plate's rim and nothing else (art-direction.md,
    "Bevels and baked occlusion"); this takes any edge of any part."""
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    mod.limit_method = "ANGLE"
    mod.angle_limit = math.radians(sharper_than)
    return obj


def realise(obj):
    """Apply the modifiers, so what is unwrapped and baked is what ships."""
    deps = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(obj.evaluated_get(deps))
    old = obj.data
    obj.modifiers.clear()
    obj.data = mesh
    mesh.name = obj.name
    bpy.data.meshes.remove(old)
    mesh.shade_smooth()
    return obj


def meets(a, b):
    """Whether two parts' surfaces cross: the question contacts.mjs asks of a
    finished file, asked while the script can still act on the answer."""
    return bool(world_bvh(a).overlap(world_bvh(b)))


def world_bvh(obj):
    mesh = obj.data
    verts = [obj.matrix_world @ v.co for v in mesh.vertices]
    return BVHTree.FromPolygons(verts, [tuple(p.vertices) for p in mesh.polygons])


# --- materials ---------------------------------------------------------------


def material(name, finish):
    """A material at the blockout's own values: the navy's ink is the kit
    module's (#888), and this reads it off the file rather than restating
    it. Returns the material and its Principled node."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.use_backface_culling = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = finish["base"]
    bsdf.inputs["Metallic"].default_value = finish["metallic"]
    bsdf.inputs["Roughness"].default_value = finish["roughness"]
    if finish["strength"] > 0:
        bsdf.inputs["Emission Color"].default_value = finish["emission"]
        bsdf.inputs["Emission Strength"].default_value = finish["strength"]
    return mat


class Height:
    """A material's height field as shader nodes, in metres, read through a
    Bump node while the maps bake. Thin sugar: each method adds one node and
    returns its output socket."""

    def __init__(self, mat):
        self.mat = mat
        self.tree = mat.node_tree
        self.nodes = self.tree.nodes
        self.links = self.tree.links

    def node(self, kind, **props):
        n = self.nodes.new(kind)
        for key, value in props.items():
            setattr(n, key, value)
        return n

    def _feed(self, socket, value):
        if isinstance(value, (int, float)):
            socket.default_value = value
        elif isinstance(value, (tuple, list, Vector)):
            socket.default_value = tuple(value)
        else:
            self.links.new(value, socket)

    def position(self):
        """Model space, metres: one field runs unbroken across every part
        that wears the material."""
        return self.node("ShaderNodeNewGeometry").outputs["Position"]

    def uv(self, layer):
        return self.node("ShaderNodeUVMap", uv_map=layer).outputs["UV"]

    def scaled(self, vector, scale):
        n = self.node("ShaderNodeMapping")
        self.links.new(vector, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        return n.outputs["Vector"]

    def axis(self, vector, index):
        n = self.node("ShaderNodeSeparateXYZ")
        self.links.new(vector, n.inputs[0])
        return n.outputs[index]

    def math(self, op, a, b=None, c=None):
        n = self.node("ShaderNodeMath", operation=op)
        for socket, value in zip(n.inputs, (a, b, c)):
            if value is not None:
                self._feed(socket, value)
        return n.outputs[0]

    def noise(self, vector, scale, detail=2.0):
        n = self.node("ShaderNodeTexNoise")
        self.links.new(vector, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        n.inputs["Detail"].default_value = detail
        return n.outputs["Fac"] if "Fac" in n.outputs else n.outputs[0]

    def cells(self, vector, scale, feature):
        n = self.node("ShaderNodeTexVoronoi", feature=feature)
        self.links.new(vector, n.inputs["Vector"])
        n.inputs["Scale"].default_value = scale
        return n.outputs["Distance"]

    def ramp(self, value, lo, hi):
        """0 below lo, 1 above hi, smooth between."""
        n = self.node("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP")
        self._feed(n.inputs["Value"], value)
        n.inputs["From Min"].default_value = lo
        n.inputs["From Max"].default_value = hi
        return n.outputs["Result"]

    def total(self, *terms):
        acc = terms[0]
        for term in terms[1:]:
            acc = self.math("ADD", acc, term)
        return acc

    def bump(self, height):
        """Wire the field into the surface. Distance 1: height is metres."""
        n = self.node("ShaderNodeBump")
        n.inputs["Strength"].default_value = 1.0
        n.inputs["Distance"].default_value = 1.0
        self.links.new(height, n.inputs["Height"])
        self.links.new(n.outputs["Normal"], self.nodes["Principled BSDF"].inputs["Normal"])


# --- the atlas, the bake, the export -----------------------------------------


def _edit(objs, fn):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    fn()
    bpy.ops.object.mode_set(mode="OBJECT")


def atlas(objs, bare=(), margin=0.003, smart=False):
    """Two UV sets a part, as art-direction.md's SPECs divide them. `uv0` is
    the part unwrapped along the seams its builder marked and left at that:
    the set a navy's trim sheet reads, which a hull laid for its sheet would
    fill with trim.mjs's layout. `atlas` is the same islands brought to one
    texel density and packed over every mapped part: the set the baked maps
    read, glTF's TEXCOORD_1. `bare` parts, the lamps, take `uv0` alone.
    `smart` is for geometry no builder here marked: a part keeps the `uv0`
    it came with, and its atlas is cut by angle instead of along seams."""
    for o in list(objs) + list(bare):
        if "uv0" in o.data.uv_layers:
            continue
        o.data.uv_layers.new(name="uv0")
        o.data.uv_layers["uv0"].active = True
        _edit([o], lambda: bpy.ops.uv.unwrap(method="ANGLE_BASED", margin=0.0))
    for o in objs:
        o.data.uv_layers["uv0"].active = True
        o.data.uv_layers.new(name="atlas")  # a copy of the active set
        o.data.uv_layers["atlas"].active = True
        o.data.uv_layers["atlas"].active_render = True
        if smart:
            _edit([o], lambda: bpy.ops.uv.smart_project(angle_limit=math.radians(66)))

    def pack():
        bpy.ops.uv.average_islands_scale()
        bpy.ops.uv.pack_islands(margin=margin, rotate=True)

    _edit(objs, pack)


def texel_density(objs, size):
    """Texels a metre, the atlas over: √(UV area ÷ surface area) × size. A
    part's area is taken through its node's scale, so one left at the
    blockout's own scale counts in metres too."""
    uv_area = surface = 0.0
    for o in objs:
        mesh = o.data
        uv = mesh.uv_layers["atlas"].data
        grown = abs(o.matrix_world.to_3x3().determinant()) ** (2 / 3)
        for p in mesh.polygons:
            loops = list(p.loop_indices)
            pts = [uv[i].uv for i in loops]
            uv_area += (
                abs(
                    sum(
                        pts[i].x * pts[(i + 1) % len(pts)].y - pts[(i + 1) % len(pts)].x * pts[i].y
                        for i in range(len(pts))
                    )
                )
                / 2
            )
            surface += p.area * grown
    return math.sqrt(uv_area / surface) * size, uv_area


def _target(objs, name, size, fill):
    image = bpy.data.images.new(name, size, size, alpha=False)
    image.generated_color = fill
    image.colorspace_settings.name = "Non-Color"
    for mat in {m for o in objs for m in o.data.materials}:
        node = mat.node_tree.nodes.new("ShaderNodeTexImage")
        node.name = name
        node.image = image
        mat.node_tree.nodes.active = node
    return image


def bake(objs, normal_size=1024, occlusion_size=512, reach=10.0):
    """Bake the two maps, each part from its own surface. Several parts in
    one call are never cleared between (Blender clears only for one), so the
    images start at the value an unbaked texel should hold: a flat normal,
    and unoccluded."""
    scene = bpy.context.scene
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    settings = scene.render.bake
    settings.use_selected_to_active = False
    settings.use_clear = False
    settings.margin_type = "EXTEND"

    normal = _target(objs, "normal", normal_size, (0.5, 0.5, 1.0, 1.0))
    settings.margin = max(2, normal_size // 512)
    bpy.ops.object.bake(type="NORMAL", normal_space="TANGENT")

    # The parts' shade of one another is the bulk of this map. Cycles casts
    # from the bumped normal, so a groove of the height field shows faintly.
    scene.world.light_settings.distance = reach
    occlusion = _target(objs, "occlusion", occlusion_size, (1.0, 1.0, 1.0, 1.0))
    settings.margin = max(2, occlusion_size // 512)
    bpy.ops.object.bake(type="AO")
    return normal, occlusion


def wire_maps(objs, normal, occlusion):
    """Swap each material from the field it baked from to the maps it
    ships with. The exporter reads occlusion off a node group by this name."""
    group = bpy.data.node_groups.new("glTF Material Output", "ShaderNodeTree")
    group.interface.new_socket(name="Occlusion", in_out="INPUT", socket_type="NodeSocketFloat")
    for mat in {m for o in objs for m in o.data.materials}:
        tree = mat.node_tree
        bsdf = tree.nodes["Principled BSDF"]
        for link in list(bsdf.inputs["Normal"].links):
            tree.links.remove(link)
        # Both maps read the atlas by name, so the exporter gives them its set.
        chart = tree.nodes.new("ShaderNodeUVMap")
        chart.uv_map = "atlas"
        for image in (normal, occlusion):
            tree.links.new(chart.outputs["UV"], tree.nodes[image.name].inputs["Vector"])
        to_normal = tree.nodes.new("ShaderNodeNormalMap")
        to_normal.uv_map = "atlas"
        tree.links.new(tree.nodes[normal.name].outputs["Color"], to_normal.inputs["Color"])
        tree.links.new(to_normal.outputs["Normal"], bsdf.inputs["Normal"])
        out = tree.nodes.new("ShaderNodeGroup")
        out.node_tree = group
        tree.links.new(tree.nodes[occlusion.name].outputs["Color"], out.inputs["Occlusion"])


def export_glb(path, objs, root):
    """GLB, Y up, `uv0` as TEXCOORD_0 and the atlas as TEXCOORD_1 and
    nothing else per vertex: no tangents (three derives them a pixel), no
    helper UV layers. Every node under `root` goes, groups included."""
    for o in objs:
        for layer in [l for l in o.data.uv_layers if l.name not in ("uv0", "atlas")]:
            o.data.uv_layers.remove(layer)
        o.data.uv_layers["uv0"].active_render = True
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for o in root.children_recursive:
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_tangents=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
        export_cameras=False,
        export_lights=False,
        export_extras=False,
    )


def finish_glb(path, finish):
    """Three things the exporter writes its own way, put the way the rest of
    tools/hull-models reads a file. It names a texture per material where
    glb.mjs wants one a map; it folds a lamp's strength into its colour,
    where the navy's ink keeps the token and a strength beside it (#888);
    and it carries a finish as the float32 it held, 0.6000000238 for 0.6."""
    data = Path(path).read_bytes()
    size = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20 : 20 + size])
    rest = data[20 + size :]

    slot_of, kept, remap = {}, [], {}
    for i, texture in enumerate(doc["textures"]):
        key = (texture.get("sampler"), texture["source"])
        if key not in slot_of:
            slot_of[key] = len(kept)
            kept.append(texture)
        remap[i] = slot_of[key]
    doc["textures"] = kept
    for m in doc["materials"]:
        for slot in ("normalTexture", "occlusionTexture"):
            if slot in m:
                m[slot]["index"] = remap[m[slot]["index"]]
                assert m[slot].get("texCoord") == 1, f"{m['name']}: {slot} is not on the atlas"
        f = finish[m["name"]]
        pbr = m.setdefault("pbrMetallicRoughness", {})
        pbr["metallicFactor"] = round(f["metallic"], 6)
        pbr["roughnessFactor"] = round(f["roughness"], 6)
        if f["strength"] > 0:
            m["emissiveFactor"] = [round(c, 6) for c in f["emission"][:3]]
            m.setdefault("extensions", {})["KHR_materials_emissive_strength"] = {
                "emissiveStrength": round(f["strength"], 6)
            }
            used = doc.setdefault("extensionsUsed", [])
            if "KHR_materials_emissive_strength" not in used:
                used.append("KHR_materials_emissive_strength")

    body = json.dumps(doc, separators=(",", ":")).encode()
    body += b" " * (-len(body) % 4)
    total = 12 + 8 + len(body) + len(rest)
    Path(path).write_bytes(
        struct.pack("<4sII", b"glTF", 2, total)
        + struct.pack("<I4s", len(body), b"JSON")
        + body
        + rest
    )


def moved(ref, tolerance=0.05):
    """What the rebuild changed about each blockout part's box, in metres:
    the reading tools/hull-models/diff.mjs takes of a port, for a file that
    has no earlier self in git to be read against."""
    rows = []
    for name, part in ref.parts.items():
        obj = bpy.data.objects[name]
        now = [obj.matrix_world @ v.co for v in obj.data.vertices]
        deltas = []
        for i in range(3):
            deltas.append(min(p[i] for p in now) - min(p[i] for p in part.world))
            deltas.append(max(p[i] for p in now) - max(p[i] for p in part.world))
        worst = max(abs(d) for d in deltas)
        if worst > tolerance:
            rows.append((worst, name, deltas))
    return sorted(rows, reverse=True)


def triangles(objs):
    return sum(len(p.vertices) - 2 for o in objs for p in o.data.polygons)
