"""
The Commune's surfaces, as height fields a material (#1802, a spike).

The navy's module, as tools/hull-models/factions/pelagia.mjs is for the kit:
what a Commune hull's skin is made of, kept apart from any one hull so that
two scripts bake the same surface. corvette_pelagia.py wears it on rebuilt
geometry and corvette_pelagia_surface.py on the approved hull's own, and the
pair is only a fair comparison while both read this file.

Each field is in metres, in model space, and is read through a Bump node
while the maps bake (kit.py `Height`). The membranes' field runs along a fin,
so a part that wears it carries its place on the fin in a `param` UV layer.
"""

import math

import kit

TAU = 2 * math.pi


def surfaces(chitin, ridge, spore, membrane):
    """Wire the four height fields into the navy's four clad materials."""
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
        "MULTIPLY",
        h.math("SUBTRACT", 1.0, h.ramp(h.math("PINGPONG", station, 0.5), 0.0, 0.05)),
        0.08,
    )
    midrib = h.math("MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(turn, 0.0, 0.08)), 0.10)
    keel = h.math(
        "MULTIPLY",
        h.math("SUBTRACT", 1.0, h.ramp(h.math("SUBTRACT", math.pi, turn), 0.0, 0.08)),
        0.06,
    )
    net = h.cells(h.scaled(p, (1 / 2.2, 1 / 1.4, 1 / 1.4)), 1.0, "DISTANCE_TO_EDGE")
    veinlet = h.math("MULTIPLY", h.math("SUBTRACT", 1.0, h.ramp(net, 0.0, 0.06)), 0.014)
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
            "POWER",
            h.math("ABSOLUTE", h.math("SINE", h.math("MULTIPLY", across, math.pi * 8))),
            8.0,
        ),
        0.07,
    )
    web = h.math("MULTIPLY", h.math("SINE", h.math("MULTIPLY", along, TAU * 30)), 0.006)
    h.bump(h.total(ray, web))
