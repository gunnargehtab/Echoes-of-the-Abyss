/**
 * The Light Scout, the Klaxon's — 60 m (docs/units.md; the Light Scout
 * block of docs/asset-prompts-3d.md Block 3, read with the Bathyarch FACTION
 * block).
 *
 * "Tiny, very fast recon vessel, fragile and nearly silent (SIG 6 idle).
 * Sleek darting silhouette built for kelp and thermal-vein cover; nearly
 * black, navigation marks only" — said the Klaxon's way: "boxy, riveted,
 * over-engineered rectangles and cylinders; no curve unless a pressure
 * vessel demanded it. Visibly patchworked repairs". A twenty-sided pressure
 * drum capped astern, a square wedge and a boxed tip for a nose, a boxed
 * sensor head with a brow, an aperture, two cheeks and two whips, a spine
 * plate and a keel skid, three patches — two to starboard, one to port, one
 * on top — twelve rivets in two ranks, a shrouded three-bladed screw, four
 * fins, two hazard stencils, and three amber domes and two amber strips,
 * which are the whole resting light of a hull that idles at SIG 6.
 *
 * A port of the approved export
 * (docs/concept-art/models/light-scout-bathyarch.glb at 3a303c9), part for
 * part in its order, every number the export's own. Every part comes from
 * `factions/bathyarch.mjs` or is a kit box. Nothing here is a shape
 * decision; where the export is odd the script is odd with it: the `_p`
 * parts sit at the export's +x, which is the kit's -z once the file is
 * turned onto its length, and the one rust cheek is the port one.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds: drawn along Z, 23.20 units long, hull axis at y = 2.6; built
 * here metre-true at 60 m along +X, centred on its length, the axis at
 * y = 0. Every number below is the export's, through kit.mjs `drawn`.
 */
import { THREE, box, part, drawn, metreTrue, exportGlb } from '../kit.mjs';
import * as bathyarch from '../factions/bathyarch.mjs';

const L = 60;
const DRAWN = 23.2;
const DATUM = 2.6;

const black = bathyarch.scoutInk.hullBlack();
const grey = bathyarch.scoutInk.ironGrey();
const rust = bathyarch.scoutInk.oxideRust();
const amber = bathyarch.scoutInk.hazardAmber();
const lamp = bathyarch.scoutInk.amberLamp();

const root = new THREE.Group();
root.name = 'consortium_light_scout';
const bar = (name, mat, size, t, e) => part(root, name, box(...size), mat, drawn(t, e));
// The export's drums stand on y and each node lays its own along the keel.
const ALONG_KEEL = [Math.PI / 2, 0, 0];

// The pressure vessel: the drum, the cap that closes it astern, the square
// wedge of a nose and the boxed tip on it.
bathyarch.drum(root, black, {
  name: 'pressure_hull',
  radii: [1.5, 1.5],
  length: 15,
  ...drawn([0, 2.6, 0], ALONG_KEEL),
});
bathyarch.drum(root, black, {
  name: 'hull_cap_aft',
  radii: [1.5, 0.95],
  length: 1.6,
  ...drawn([0, 2.6, -8.3], ALONG_KEEL),
});
bathyarch.squareWedge(root, grey, { radii: [0.45, 1.55], length: 4.6, ...drawn([0, 2.6, 9.7]) });
bar('nose_tip', rust, [0.7, 0.7, 1.4], [0, 2.6, 12.5]);

// The sensor head on top forward: a box with a brow over it, a slot of an
// aperture in its face, a cheek each side — the port one older plate — and
// two whip aerials standing off it, neither where the other is.
bar('sensor_head', grey, [2.6, 1.7, 3.4], [0, 4.6, 6.2]);
bar('sensor_brow', black, [2.9, 0.4, 1.2], [0, 5.6, 7.2]);
bar('sensor_aperture', black, [1.9, 0.7, 0.14], [0, 4.5, 7.94]);
bar('sensor_cheek_p', rust, [0.35, 1, 1.8], [1.5, 4.4, 5.8]);
bar('sensor_cheek_s', black, [0.35, 1, 1.8], [-1.5, 4.4, 5.8]);
bathyarch.whips(root, grey, {
  whips: [
    ['whip_a', 0.06, 2.8, drawn([0.7, 6.9, 5.4])],
    ['whip_b', 0.05, 2, drawn([-0.8, 6.4, 6.6])],
  ],
});

// A spine plate along the back and a skid under the keel.
bar('spine_plate', grey, [1.6, 0.3, 11], [0, 4.15, -0.5]);
bar('keel_skid', black, [0.7, 0.7, 8], [0, 0.85, -1]);

// The patchwork: three patches, not six — one to port, two to starboard, one
// on top, in older plate but for the after starboard one — and a rank of six
// rivets down each flank.
bar('patch_p1', rust, [0.12, 1.3, 2.6], [1.47, 2.9, -2]);
bar('patch_s1', rust, [0.12, 1, 1.9], [-1.47, 2.3, 2.5]);
bar('patch_s2', grey, [0.12, 0.8, 1.3], [-1.45, 3.1, -5]);
bar('patch_top', rust, [1.1, 0.12, 2], [0.4, 4.32, -4.5]);
const STATIONS = [-6, -3.6, -1.2, 1.2, 3.6, 6];
bathyarch.flankRivets(root, black, {
  y: 2.6,
  rows: [
    { side: 'p', z: -1.5, stations: STATIONS },
    { side: 's', z: 1.5, stations: STATIONS },
  ],
});

// The screw: a shroud ring, a hub tapering forward, and three blades fanned
// a third of a turn apart.
bathyarch.shroud(root, grey, { R: 1.05, tube: 0.28, ...drawn([0, 2.6, -9.4]) });
bathyarch.drum(root, black, {
  name: 'prop_hub',
  radii: [0.25, 0.5],
  length: 1.2,
  facets: 12,
  ...drawn([0, 2.6, -9.4], ALONG_KEEL),
});
bathyarch.screwBlades(root, black, { size: [0.14, 1.8, 0.5], at: drawn([0, 2.6, -9.5]).at });

// Four fins astern, and the hazard stencils: one on the port bow, canted
// with the hull's flare, one on the dorsal fin.
bar('fin_dorsal', grey, [0.25, 2.2, 1.9], [0, 4.4, -7.6]);
bar('fin_ventral', grey, [0.25, 1.6, 1.6], [0, 1, -7.4]);
bar('fin_p', grey, [2, 0.25, 1.7], [1.9, 2.6, -7.5]);
bar('fin_s', grey, [2, 0.25, 1.7], [-1.9, 2.6, -7.5]);
bar('stencil_nose', amber, [0.1, 0.55, 1.5], [1.28, 2.8, 8.6], [0, 0, -0.22]);
bar('stencil_fin', amber, [0.27, 0.5, 0.5], [0, 5.2, -7.3]);

// "Nearly black, navigation marks only": a dome on the mast and one each
// side, a strip on the spine and one across the stern.
bathyarch.domes(root, lamp, {
  r: 0.34,
  domes: [
    ['nav_dome_mast', drawn([0, 5.9, 6.2])],
    ['nav_dome_p', drawn([1.55, 3.3, 3.2])],
    ['nav_dome_s', drawn([-1.55, 3.3, 3.2])],
  ],
});
bar('nav_strip_spine', lamp, [0.5, 0.22, 3.2], [0, 4.36, -1]);
bar('nav_strip_stern', lamp, [1.4, 0.28, 0.24], [0, 3.8, -8.9]);

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'light-scout-bathyarch.glb');
