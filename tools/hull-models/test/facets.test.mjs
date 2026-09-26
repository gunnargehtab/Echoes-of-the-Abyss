/**
 * facets.mjs reads a round primitive back as the counts a script gave it,
 * and `facetsFor` gives the counts Block 2c's rule says (#919). Every
 * geometry here is built by the constructor a script would use and read
 * through the same `ringsOf` the scripts' scenes go through, so a reading
 * that drifts from the constructor's own numbers fails here before it
 * mis-measures a fleet — and a part built through `facetsFor`, arcs
 * included, has to read back as on the rule, or the pass's Done-when cannot
 * be met.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ringsOf, keeps, facetsFor, orbFacets } from '../facets.mjs';
import { capsule } from '../kit.mjs';
import { facets as bathyarch } from '../factions/bathyarch.mjs';
import { facets as pelagia } from '../factions/pelagia.mjs';
import { facets as directorate } from '../factions/directorate.mjs';
import { facets as hadron } from '../factions/hadron.mjs';

const RULES = { bathyarch, pelagia, directorate, hadron };
const TAU = 2 * Math.PI;

/** A mesh as a script places one, its world matrix current, so `ringsOf` reads it in metres. */
function meshOf(geo, { scale = [1, 1, 1], name = 'part' } = {}) {
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial());
  mesh.name = name;
  mesh.scale.set(...scale);
  mesh.updateMatrixWorld(true);
  return mesh;
}

const byKind = (rings) => Object.fromEntries(rings.map((r) => [r.kind, r]));
const near = (a, b, tol = 1e-6) => assert.ok(Math.abs(a - b) < tol, `${a} is not ${b}`);

test('a cylinder is one ring at its wider rim, a half cylinder counts a full turn', () => {
  const [r] = ringsOf(meshOf(new THREE.CylinderGeometry(1.2, 2, 3, 12)));
  assert.equal(r.kind, 'cylinder');
  assert.equal(r.n, 12);
  assert.equal(r.turn, 12);
  near(r.radiusM, 2);
  const [half] = ringsOf(meshOf(new THREE.CylinderGeometry(2, 2, 1, 9, 1, false, 0, Math.PI)));
  assert.equal(half.n, 9);
  assert.equal(half.turn, 18);
  near(half.radiusM, 2);
  assert.equal(ringsOf(meshOf(new THREE.CylinderGeometry(0, 1, 2, 6))).length, 1);
});

test('an orb is a round and a meridian, both at its radius; a dome\'s meridian counts its turn', () => {
  const { 'sphere round': round, 'sphere meridian': meridian } = byKind(
    ringsOf(meshOf(new THREE.SphereGeometry(2, 8, 6)))
  );
  assert.equal(round.n, 8);
  assert.equal(round.turn, 8);
  near(round.radiusM, 2);
  assert.equal(meridian.n, 6);
  assert.equal(meridian.turn, 12);
  near(meridian.radiusM, 2);
  const dome = byKind(
    ringsOf(meshOf(new THREE.SphereGeometry(3, 10, 4, 0, TAU, 0, Math.PI / 2)))
  );
  assert.equal(dome['sphere meridian'].turn, 16);
  // Squashed by its node, the round is read at its major radius.
  const squashed = byKind(ringsOf(meshOf(new THREE.SphereGeometry(2, 8, 6), { scale: [1, 0.5, 1] })));
  near(squashed['sphere round'].radiusM, 2);
});

test('a torus is a ring at its outer radius and a tube; an arc of one counts a full turn', () => {
  const { 'torus ring': ring, 'torus tube': tube } = byKind(
    ringsOf(meshOf(new THREE.TorusGeometry(5, 0.5, 6, 20)))
  );
  assert.equal(ring.n, 20);
  near(ring.radiusM, 5.5);
  assert.equal(tube.n, 6);
  near(tube.radiusM, 0.5);
  const arc = byKind(ringsOf(meshOf(new THREE.TorusGeometry(5, 0.5, 6, 10, Math.PI / 2))));
  assert.equal(arc['torus ring'].n, 10);
  assert.equal(arc['torus ring'].turn, 40);
});

test('a lathe is its widest rim, a tube its facets, a capsule its rows and its caps', () => {
  const pts = [0.001, 0.5, 1.2, 1.5, 0.8, 0.001].map((x, i) => new THREE.Vector2(x, i));
  const [lathe] = ringsOf(meshOf(new THREE.LatheGeometry(pts, 7)));
  assert.equal(lathe.kind, 'lathe');
  assert.equal(lathe.n, 7);
  near(lathe.radiusM, 1.5);
  const path = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0, 0));
  const [tube] = ringsOf(meshOf(new THREE.TubeGeometry(path, 8, 0.15, 5, false)));
  assert.equal(tube.kind, 'tube');
  assert.equal(tube.n, 5);
  near(tube.radiusM, 0.15);
  const { 'capsule round': round, 'capsule meridian': meridian } = byKind(
    ringsOf(meshOf(capsule(0.8, 3, 4, 9, 1)))
  );
  assert.equal(round.n, 9);
  near(round.radiusM, 0.8);
  assert.equal(meridian.n, 8);
  assert.equal(meridian.turn, 16);
});

test('a box, a plate and a polyhedron carry no ring', () => {
  assert.equal(ringsOf(meshOf(new THREE.BoxGeometry(1, 2, 3))).length, 0);
  assert.equal(ringsOf(meshOf(new THREE.OctahedronGeometry(1, 0))).length, 0);
  const shape = new THREE.Shape([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(3, 0),
    new THREE.Vector2(3, 1),
    new THREE.Vector2(0, 1),
  ]);
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
  assert.equal(ringsOf(meshOf(plate)).length, 0);
});

test('facetsFor cuts the chord on the lattice, holds the floor and ceiling, and shares an arc', () => {
  const even = { chordM: 2.5, min: 6, max: 16, step: 2 };
  assert.equal(facetsFor(even, 0.3), 6);
  assert.equal(facetsFor(even, 3), 8); // 7.54 → 8 on the even lattice
  assert.equal(facetsFor(even, 4), 10); // 10.05 → 10
  assert.equal(facetsFor(even, 40), 16);
  const odd = { chordM: 2, min: 5, max: 21, step: 2, offset: 1 };
  assert.equal(facetsFor(odd, 2), 7); // 6.28 → the odd count nearest, 7
  assert.equal(facetsFor(odd, 3), 9);
  assert.equal(facetsFor(odd, 100), 21);
  // An arc takes its share of the turn, at least one segment.
  assert.equal(facetsFor(odd, 3, Math.PI), 5); // 4.5 → 5
  assert.equal(facetsFor(even, 4, Math.PI / 2), 3); // 2.5 → 3
  assert.equal(facetsFor(even, 0.3, 0.1), 1);
  for (const [navy, rule] of Object.entries(RULES)) {
    assert.ok(rule.min >= 3 && rule.max >= rule.min, navy);
    assert.equal(facetsFor(rule, 0), rule.min, navy);
    assert.equal(facetsFor(rule, 1e6), rule.max, navy);
  }
});

test('a part built through its navy\'s rule reads as on it, arcs included', () => {
  // `keeps` and a builder share one call, so a round of five with three
  // meridian segments over π — which read a turn at a time would be six —
  // is on the rule, and every part here comes back so for every navy.
  const parts = (f) => {
    // An orb is asked through orbFacets: with an odd count of meridian
    // segments its widest drawn ring is not its equator.
    const orb = (r, window = {}) => {
      const { thetaStart = 0, thetaLength = Math.PI, phiLength = TAU } = window;
      const { widthSegments, heightSegments } = orbFacets(f, r, window);
      return new THREE.SphereGeometry(r, widthSegments, heightSegments, 0, phiLength, thetaStart, thetaLength);
    };
    return [
      ['drum', new THREE.CylinderGeometry(2, 2, 1, facetsFor(f, 2))],
      ['cone', new THREE.CylinderGeometry(0, 2, 3, facetsFor(f, 2))],
      [
        'half_drum',
        new THREE.CylinderGeometry(2, 2, 1, facetsFor(f, 2, Math.PI), 1, false, 0, Math.PI),
      ],
      ['tank', new THREE.CylinderGeometry(6, 6, 20, facetsFor(f, 6))],
      ['orb', orb(2.5)],
      ['bud', orb(1.56)],
      ['cap', orb(3, { thetaLength: Math.PI / 2 })],
      ['pressure_dome', orb(121.47, { thetaLength: 0.52 * Math.PI })],
      // A window, as the Directorate's `patch` and the Commune's lobes cut one.
      ['patch', orb(4, { thetaStart: 0.3, thetaLength: 1.2, phiLength: Math.PI })],
      ['belt', orb(2.2, { thetaStart: 1.1, thetaLength: 0.9 })],
      // A torus is read at its outer radius, so it is asked for there.
      ['ring', new THREE.TorusGeometry(3, 0.5, facetsFor(f, 0.5), facetsFor(f, 3.5))],
      [
        'half_ring',
        new THREE.TorusGeometry(3, 0.5, facetsFor(f, 0.5), facetsFor(f, 3.5, Math.PI), Math.PI),
      ],
      [
        'spindle',
        new THREE.LatheGeometry(
          [0.001, 0.8, 1.5, 1.1, 0.001].map((x, i) => new THREE.Vector2(x, i)),
          facetsFor(f, 1.5)
        ),
      ],
    ];
  };
  for (const [navy, rule] of Object.entries(RULES)) {
    for (const [name, geo] of parts(rule)) {
      const rings = ringsOf(meshOf(geo, { name }));
      assert.ok(rings.length, `${navy}: ${name} has rings`);
      for (const r of rings)
        assert.ok(
          keeps(rule, r),
          `${navy}: ${name} ${r.kind} ${r.n} over ${r.arc.toFixed(3)} at r ${r.radiusM.toFixed(3)}, rule ${facetsFor(rule, r.radiusM, r.arc)}`
        );
    }
  }
  // And one built a segment over is named; so is a Knights orb of six asked
  // at its radius rather than at its widest drawn ring.
  const f = RULES.directorate;
  const over = new THREE.SphereGeometry(1.56, facetsFor(f, 1.56), facetsFor(f, 1.56, Math.PI) + 1);
  const { 'sphere meridian': meridian } = byKind(ringsOf(meshOf(over)));
  assert.equal(keeps(f, meridian), false);
  const k = RULES.hadron;
  const { widthSegments, heightSegments } = orbFacets(k, 2.5);
  assert.equal(heightSegments % 2, 1);
  assert.notEqual(widthSegments, facetsFor(k, 2.5));
  const atRadius = new THREE.SphereGeometry(2.5, facetsFor(k, 2.5), heightSegments);
  assert.equal(keeps(k, byKind(ringsOf(meshOf(atRadius)))['sphere round']), false);
});

test('a section keeps a spar\'s count and never an orb\'s', () => {
  const rule = { chordM: 3, min: 4, max: 12, step: 2, sections: [4, 6] };
  const [spar] = ringsOf(meshOf(new THREE.CylinderGeometry(2, 2, 10, 6)));
  assert.equal(keeps(rule, spar), true);
  const [drum] = ringsOf(meshOf(new THREE.CylinderGeometry(2, 2, 10, 8)));
  assert.equal(keeps(rule, drum), false);
  const { 'sphere round': orb } = byKind(ringsOf(meshOf(new THREE.SphereGeometry(2, 6, 4))));
  assert.equal(keeps(rule, orb), false);
});

test('a section keyed by part keeps its count on the parts it names, read as tokens', () => {
  const rule = {
    chordM: 2,
    min: 5,
    max: 17,
    step: 2,
    offset: 1,
    sections: [5, { turn: 4, parts: ['spike', 'head_shield', 'dog'] }],
  };
  const square = (name) => {
    const [r] = ringsOf(meshOf(new THREE.CylinderGeometry(0, 1.5, 6, 4), { name }));
    return { ...r, part: name };
  };
  // The count on a named part, whatever its suffix or its place in the name.
  assert.equal(keeps(rule, square('spike')), true);
  assert.equal(keeps(rule, square('spike_dorsal_2')), true);
  assert.equal(keeps(rule, square('hatch_s0_dog')), true);
  assert.equal(keeps(rule, square('head_shield')), true);
  // A token, not a substring: a spine is not a spike, and a dspike is its own name.
  assert.equal(keeps(rule, square('tergite_spine_0')), false);
  assert.equal(keeps(rule, square('dspike_p3')), false);
  assert.equal(keeps(rule, square('silo_1_seam')), false);
  assert.equal(keeps(rule, square('unnamed')), false);
  // The part is the ring's, or passed; a ring with no part is judged by the rule alone.
  const [bare] = ringsOf(meshOf(new THREE.CylinderGeometry(0, 1.5, 6, 4)));
  assert.equal(keeps(rule, bare), false);
  assert.equal(keeps(rule, bare, 'spike_flank_p1'), true);
  // The count, not the part: a spike of seven at this radius is the rule's, and off it.
  const [seven] = ringsOf(meshOf(new THREE.CylinderGeometry(0, 1.5, 6, 7), { name: 'spike' }));
  assert.equal(keeps(rule, { ...seven, part: 'spike' }), false);
  // A plain section still keeps its count on every part; an orb keeps neither.
  const [five] = ringsOf(
    meshOf(new THREE.CylinderGeometry(0, 1.5, 6, 5), { name: 'gantry_cable' })
  );
  assert.equal(keeps(rule, { ...five, part: 'gantry_cable' }), true);
  const orb = byKind(ringsOf(meshOf(new THREE.SphereGeometry(1.5, 4, 4), { name: 'spike' })));
  assert.equal(keeps(rule, { ...orb['sphere round'], part: 'spike' }), false);
  // The Directorate lists four so: its beaks keep it, its seam tubes and cables do not.
  const d = RULES.directorate;
  assert.equal(keeps(d, square('rostrum')), true);
  assert.equal(keeps(d, square('dspike_s4')), true);
  assert.equal(keeps(d, square('dock_main_mandible_0')), true);
  assert.equal(keeps(d, square('gantry_cable_1')), false);
  const [tube] = ringsOf(meshOf(new THREE.TorusGeometry(3, 0.4, 4, 9), { name: 'silo_1_seam' }));
  assert.equal(keeps(d, { ...tube, part: 'silo_1_seam' }), false);
});
