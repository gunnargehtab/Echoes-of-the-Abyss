"""
The control for corvette_pelagia.py (#1802, a spike: it replaces no shipped
model): the approved Corvette's own geometry, every vertex and normal as
hulls/corvette-pelagia.mjs wrote them, wearing the surface the spike bakes.

    python tools/hull-models/blender/corvette_pelagia_surface.py [--maps <dir>]

The spike changed two things at once: what a part is made of, and what its
skin carries. This file changes only the second, so the two can be told
apart. 2,652 triangles, the same five materials, the same lamps untouched,
and the same two maps from the same height fields (pelagia.py), baked onto
an atlas cut by angle since no builder here marked a seam.

It stands in for the cheaper route, a navy's surface drawn once and worn by
every kit hull as its trim sheet is: this bakes the surface a hull, which
costs a map a hull and reads the same on the table.
"""

import argparse
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402

import kit  # noqa: E402
import pelagia  # noqa: E402

REPO = Path(__file__).resolve().parents[3]
BLOCKOUT = REPO / "docs/concept-art/models/corvette-pelagia.glb"
OUT = REPO / "docs/concept-art/spikes/corvette-pelagia-surface.glb"
FINS = (
    "dorsal_blade",
    "pectoral_port",
    "pectoral_starboard",
    "keel_blade",
    "tail_fluke_upper",
    "tail_fluke_lower",
)

parser = argparse.ArgumentParser()
parser.add_argument("--out", type=Path, default=OUT)
parser.add_argument("--maps", type=Path, help="also write the two maps here as PNGs")
parser.add_argument("--normal-size", type=int, default=1024)
parser.add_argument("--occlusion-size", type=int, default=512)
parser.add_argument("--samples", type=int, default=64)
args = parser.parse_args()

started = time.time()
kit.reset(samples=args.samples)
ref = kit.Reference(BLOCKOUT, keep=True)
root = ref.objects[ref.root]
clad = {name: bpy.data.materials[name] for name in ref.finish if ref.finish[name]["strength"] == 0}

meshes = [o for o in ref.objects.values() if o.type == "MESH"]
mapped = [o for o in meshes if o.data.materials[0].name in clad]
lamps = [o for o in meshes if o.data.materials[0].name not in clad]

# The set each part came with is its `uv0`, as kit.atlas keeps it.
for obj in meshes:
    obj.data.uv_layers[0].name = "uv0"

# A fin's place on itself, for the membranes' rays: the blockout's slab has
# the outline the rebuilt lens has, so the same rays land on it.
for name in FINS:
    obj, fin = ref.objects[name], kit.Fin(ref[name])
    layer = obj.data.uv_layers.new(name="param")
    for loop in obj.data.loops:
        layer.data[loop.index].uv = fin.place(ref[name].local[loop.vertex_index])

pelagia.surfaces(
    clad["chitin_hull"], clad["growth_ridge"], clad["spore_pod"], clad["algae_membrane"]
)

kit.atlas(mapped, bare=lamps, smart=True)
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
    f"  {len(mapped) + len(lamps)} parts, {kit.triangles(mapped + lamps):,} triangles,"
    f" {os.path.getsize(args.out):,} bytes"
)
print(f"  atlas {filled:.0%} filled, {density:.1f} texels a metre at {args.normal_size}²")
print(f"  build {built - started:.0f} s, bake {baked - built:.0f} s, on {os.cpu_count()} threads")
