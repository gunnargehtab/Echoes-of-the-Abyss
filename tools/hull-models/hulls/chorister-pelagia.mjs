/**
 * The Chorister, the Commune's — 50 m (docs/units.md; the Chorister block of
 * docs/asset-prompts-3d.md Block 3, which pairs the kind with the
 * Directorate and lets each navy field it in its own shape language, read
 * with the Pelagia FACTION block).
 *
 * "The cohort hull, 50 m — the shortest and cheapest hull in the roster,
 * grown chitin over a pressure bladder (SIG 16 idle, 24 cruise). Three
 * overlapping segments with the bladder showing through the middle one as a
 * paler dome, a rostrum, a telson, folded walking limbs, one small dorsal
 * spine-gun off the centreline. Dim: a short row of photophores along one
 * flank and one on the other, in a pattern that repeats on neither side" —
 * said the Commune's way: three lobes along the keel, each a squashed orb
 * with a growth ring lathed round it, the middle one membrane where the
 * bladder shows and a pale bud on its crown; a rostrum of ridge drawn to a
 * point; a tail cone; two pectorals and two flukes of membrane, flat; a leaf
 * of ridge standing on the back; the spine-gun, a five-sided spike two units
 * to port of the keel line; a vein of biolight along the middle lobe's
 * crest; and two nav marks, bow and dorsal, which is the whole resting light
 * of a hull that idles at SIG 16.
 *
 * A port of the approved export (docs/concept-art/models/chorister-pelagia.glb
 * at 3e15409), part for part in its order, every number the export's own,
 * read off its nodes and its buffers with tools/hull-models/parts.mjs. It is
 * an export of the early pass — three r169, the Sower's and Spinner's own
 * materials (`ink`) and their own constructions: the rings are `ridgeRing`
 * lathes, the plates `plan` extrusions, the cones `nose`. Every part comes
 * from `factions/pelagia.mjs`. Nothing here is a shape decision; where the
 * export is odd the script is odd with it:
 *
 * - THE FILE IS X-LONG, 61 units for a 50 m hull, bow on +X, so nothing here
 *   is yawed: every node's numbers go in verbatim and every primitive
 *   un-turned, as the Sower's and Spinner's do. `metreTrue` still scales
 *   and centres it.
 * - THE SIDES ARE RELABELLED (#642). The export names its fins the way the
 *   eleven `bothSides` hulls of the same pass did, `_p` at +z; +z is
 *   starboard, so the fins are relabelled exactly as those eleven were:
 *   every buffer stays in the file's order and only the names turn round.
 *   The plate that was `pectoral_p` at +z is written `pectoral_s`, the
 *   `fluke_p` at +z `fluke_s`, and the pair at −z `pectoral_p` and
 *   `fluke_p` — `fins` with `bySide`, starboard first, which is the file's
 *   order.
 * - The plates stand on their nodes' heights rather than straddling them
 *   (`stand`): the early pass never re-centred its extrusions.
 * - `stem_tail` is a cone with its apex forward, buried in the last lobe,
 *   so the stern is a transom and not a point — the same way round as the
 *   Dredge's telson (#630), and kept.
 *
 * THE SCALE is the one hulls/light-scout-pelagia.mjs states for all six
 * shared kinds, applied to a file that needs no yaw: `DRAWN` is 61.0, the
 * rostrum's apex at x 30.5 to the tail cone's base at −30.5, as intake
 * measures it — nothing overhangs at either end, both cones being turned a
 * quarter with exact boxes — and `DATUM` is 0.
 */
import { THREE, metreTrue, exportGlb } from '../kit.mjs';
import * as pelagia from '../factions/pelagia.mjs';

const L = 50;
const DRAWN = 61;
const DATUM = 0;

const chitin = pelagia.ink.chitinHull();
const ridge = pelagia.ink.growthRidge();
const membrane = pelagia.ink.algaeMembrane();
const spore = pelagia.ink.sporePod();
const vein = pelagia.ink.bioVein();
const light = pelagia.ink.bioLight();

const root = new THREE.Group();
root.name = 'commune_chorister';

// "Three overlapping segments with the bladder showing through the middle
// one": three lobes down the keel, the fore and aft ones 8 long, 4 tall and
// 7 across in chitin, a little to starboard of the line; the middle one
// larger, in membrane, a little to port; each ringed two units ahead of its
// centre with a ridge cresting at 0.9 of its beam from a shoulder at 0.82.
// Lobe then ring, as the file orders them.
pelagia.cohortLobes(root, ridge, {
  lobes: [
    {
      skin: chitin,
      at: [15, 0, -0.4],
      radii: [8, 4, 7],
      ring: { dx: 2, crown: 6.3, shoulder: 5.74 },
    },
    {
      skin: membrane,
      at: [0, 0, 0.6],
      radii: [9.5, 5.4, 8.5],
      ring: { dx: 2, crown: 7.65, shoulder: 6.97 },
    },
    {
      skin: chitin,
      at: [-16, 0, -0.4],
      radii: [8, 4, 7],
      ring: { dx: 2, crown: 6.3, shoulder: 5.74 },
    },
  ],
});
// The bladder's crown showing as a paler dome, off the centreline.
pelagia.bud(root, spore, {
  name: 'bladder_bud',
  facets: [10, 6],
  x: 1,
  y: 5.2,
  z: 1.5,
  r: 2.4,
  squash: 1.6 / 2.4,
});

// The rostrum, a six-sided cone of ridge drawn to a point at the bow, and
// the tail cone behind the last lobe with its point forward (see the
// header).
pelagia.nose(root, ridge, { name: 'rostrum', tip: 30.5, r: 2.4, length: 9 });
pelagia.nose(root, chitin, { name: 'stem_tail', tip: -23.5, r: 2, length: 7 });

// "Folded walking limbs", grown as fins: a pectoral and a fluke a side, flat
// plates of membrane, the pectorals 0.5 thick standing on y 0.2 and the
// flukes 0.4 thick on y 0.1, starboard pair first (see the header). Corners
// on the starboard side, in the export's own edge order.
pelagia.fins(root, membrane, {
  bySide: true,
  stand: true,
  pairs: [
    [
      'pectoral',
      [
        [2, 7],
        [10, 7],
        [11, 12],
        [7, 13],
      ],
      { t: 0.5, y: 0.2 },
    ],
    [
      'fluke',
      [
        [-24, 1.5],
        [-20, 2],
        [-24, 6],
        [-28, 6.5],
      ],
      { t: 0.4, y: 0.1 },
    ],
  ],
});

// A leaf of ridge standing on the back over the after lobe, and the
// spine-gun: a five-sided spike, ten long, two units to port of the keel
// line on the fore lobe's back.
pelagia.dorsalBlade(root, ridge, {
  name: 'dorsal_leaf',
  from: -12,
  to: -4,
  y: 4,
  height: 4,
  stand: true,
});
pelagia.nose(root, ridge, {
  name: 'spine_gun',
  tip: 27,
  y: 3.4,
  z: -2,
  r: 0.7,
  length: 10,
  facets: 5,
});

// "Dim": a vein along the middle lobe's crest, and two nav marks — the bow
// and the dorsal, the dorsal a hair narrower.
pelagia.vein(root, vein, { from: -6, to: 6, y: 5.45, z: 0.6, w: 0.4 });
pelagia.navMarks(root, light, { marks: [['nav_bow', 23, 1.5, 0]], w: 1, h: 0.4, d: 0.8 });
pelagia.navMarks(root, light, { marks: [['nav_dorsal', -8, 8.1, 0]], w: 0.9, h: 0.4, d: 0.8 });

metreTrue(root, L, { drawn: DRAWN, datum: DATUM });
await exportGlb(root, 'chorister-pelagia.glb');
