/**
 * facets.mjs reads a round primitive back as the counts a script gave it,
 * and facetsFor gives the counts Block 2c's rule says (#919). Every
 * geometry here is built by the constructor a script would use and read
 * through the same `ringsOf` the committed files go through, so a reading
 * that drifts from the constructor's own numbers fails here before it
 * mis-measures a fleet.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ringsOf, gridOf, turnOf, RULES } from '../facets.mjs';
import { facetsFor, capsule } from '../kit.mjs';

/** A part as readGlb hands one over, from a live geometry under a transform. */
function partOf(geo, { scale = [1, 1, 1], name = 'part' } = {}) {
  const mesh = new THREE.Mesh(geo);
  mesh.scale.set(...scale);
  mesh.updateMatrixWorld(true);
  return {
    name,
    finish: null,
    matrix: Array.from(mesh.matrixWorld.elements),
    local: {
      positions: geo.attributes.position.array,
      index: geo.index ? geo.index.array : null,
    },
  };
}

const byRole = (rings) => Object.fromEntries(rings.map((r) => [r.role, r]));

test('a cylinder is one rim at its widest radius, whatever way it is turned', () => {
  const r = ringsOf(partOf(new THREE.CylinderGeometry(1.2, 2, 3, 12)));
  assert.equal(r.kind, 'cylinder');
  assert.equal(r.rings.length, 1);
  assert.equal(r.rings[0].role, 'rim');
  assert.equal(r.rings[0].count, 12);
  assert.ok(Math.abs(r.rings[0].radius - 2) < 1e-6);
  const open = ringsOf(partOf(new THREE.CylinderGeometry(1, 1, 3, 8, 3, true)));
  assert.equal(open.rings[0].count, 8);
});

test('a cone to a point is a rim with a pole, and a half cylinder counts a full turn', () => {
  const cone = ringsOf(partOf(new THREE.CylinderGeometry(0, 1, 2, 6)));
  assert.equal(cone.kind, 'cone');
  assert.equal(cone.rings[0].count, 6);
  const half = ringsOf(partOf(new THREE.CylinderGeometry(1, 1, 2, 9, 1, false, 0, Math.PI)));
  assert.equal(half.rings[0].count, 18);
  assert.equal(half.rings[0].segs, 9);
});

test('an orb is parallels and meridians, both at its radius, squashed by its node', () => {
  const r = ringsOf(partOf(new THREE.SphereGeometry(2, 8, 6), { scale: [1, 0.5, 1] }));
  assert.equal(r.kind, 'sphere');
  const { parallels, meridians } = byRole(r.rings);
  assert.equal(parallels.count, 8);
  assert.equal(meridians.count, 12);
  assert.equal(meridians.segs, 6);
  // A 2 m orb pressed to half its height: the meridian's mean radius sits
  // between the equator's 2 and the pole's 1.
  assert.ok(meridians.radius > 1.4 && meridians.radius < 2, `${meridians.radius}`);
  const dome = ringsOf(partOf(new THREE.SphereGeometry(3, 10, 4, 0, Math.PI * 2, 0, Math.PI / 2)));
  assert.equal(dome.kind, 'sphere');
  assert.equal(byRole(dome.rings).meridians.count, 16);
});

test('a torus is a ring and a tube; an arc of one counts a full turn', () => {
  const r = ringsOf(partOf(new THREE.TorusGeometry(5, 0.5, 6, 20)));
  assert.equal(r.kind, 'torus');
  const { ring, tube } = byRole(r.rings);
  assert.equal(ring.count, 20);
  assert.ok(Math.abs(ring.radius - 5) < 1e-6);
  assert.equal(tube.count, 6);
  assert.ok(Math.abs(tube.radius - 0.5) < 1e-6);
  const arc = ringsOf(partOf(new THREE.TorusGeometry(5, 0.5, 6, 10, Math.PI / 2)));
  assert.equal(arc.kind, 'torus');
  assert.equal(byRole(arc.rings).ring.count, 40);
  assert.equal(byRole(arc.rings).ring.segs, 10);
});

test('a lathe is its widest rim, a capsule its radial count, a tube its facets', () => {
  // A lathe drawn to a point at one end has a pole there, and reads as a
  // cone; the count and the radius are the same reading either way.
  const pts = [0, 0.5, 1.2, 1.5, 0.8, 0.001].map((x, i) => new THREE.Vector2(x, i));
  const lathe = ringsOf(partOf(new THREE.LatheGeometry(pts, 7)));
  assert.equal(lathe.kind, 'cone');
  assert.equal(lathe.rings.length, 1);
  assert.equal(lathe.rings[0].count, 7);
  assert.ok(Math.abs(lathe.rings[0].radius - 1.5) < 1e-6);
  const open = ringsOf(partOf(new THREE.LatheGeometry(pts.slice(1), 7)));
  assert.equal(open.kind, 'cylinder');
  assert.equal(open.rings[0].count, 7);
  const pod = ringsOf(partOf(capsule(0.8, 3, 4, 9, 1)));
  assert.equal(pod.kind, 'cone');
  assert.equal(pod.rings.length, 1);
  assert.equal(pod.rings[0].count, 9);
  assert.ok(Math.abs(pod.rings[0].radius - 0.8) < 1e-6);
  const path = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(4, 0, 0));
  const cable = ringsOf(partOf(new THREE.TubeGeometry(path, 8, 0.15, 5, false)));
  assert.equal(cable.kind, 'cylinder');
  assert.equal(cable.rings[0].count, 5);
});

test('a box, a plate and a plane carry no ring', () => {
  assert.equal(ringsOf(partOf(new THREE.BoxGeometry(1, 2, 3))), null);
  assert.equal(ringsOf(partOf(new THREE.PlaneGeometry(4, 4, 6, 6))), null);
  const shape = new THREE.Shape([
    new THREE.Vector2(0, 0),
    new THREE.Vector2(3, 0),
    new THREE.Vector2(3, 1),
    new THREE.Vector2(0, 1),
  ]);
  const plate = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
  assert.equal(ringsOf(partOf(plate)), null);
});

test('a ring laid out profile-first reads the same as one laid out ring-first', () => {
  // The Commune's ridge rings (factions/pelagia.mjs `ridgeRing`): three
  // profile points a column, seventeen columns round, the profile the
  // fast index. The same ring as a lathe is three rows of seventeen.
  const n = 16;
  const profile = [
    [4, -0.5],
    [4.6, 0],
    [4, 0.5],
  ];
  const pos = [];
  for (let i = 0; i <= n; i++) {
    const a = (2 * Math.PI * i) / n;
    for (const [r, y] of profile) pos.push(r * Math.cos(a), y, r * Math.sin(a));
  }
  const idx = [];
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 2; k++) {
      const a = i * 3 + k, b = a + 3;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  const grid = gridOf(geo.attributes.position.array, geo.index.array);
  assert.deepEqual(grid, { L: 3, R: 17, caps: 0 });
  const r = ringsOf(partOf(geo));
  assert.equal(r.kind, 'cylinder');
  assert.equal(r.rings[0].count, 16);
  assert.ok(Math.abs(r.rings[0].radius - 4.6) < 1e-6);
});

test('a turn is closed on its seam, an arc on one circle in equal steps, and a spindle is neither', () => {
  const ring = (n, arc, r = 2) =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = (arc * i) / n;
      return [r * Math.cos(a), 0, r * Math.sin(a)];
    });
  assert.equal(turnOf(ring(8, Math.PI * 2)).kind, 'closed');
  assert.equal(turnOf(ring(8, Math.PI * 2)).count, 8);
  const arc = turnOf(ring(5, Math.PI / 2));
  assert.equal(arc.kind, 'arc');
  assert.equal(arc.count, 20);
  // A spindle's profile: on a circle through its three points within a
  // percent of a long radius, and not a turn.
  const spindle = [0, 1, 2, 3, 4, 5, 6].map((x) => [x, 0, Math.sin((Math.PI * x) / 6) * 1.5]);
  assert.equal(turnOf(spindle).kind, 'profile');
  assert.equal(turnOf([[1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0]]).kind, 'pole');
});

test('facetsFor cuts the chord, holds the floor and ceiling, and steps', () => {
  const rule = { edge: 1.4, floor: 4, ceiling: 28, step: 2 };
  assert.equal(facetsFor(rule, 0.3), 4); // 1.3 facets asked, a square given
  assert.equal(facetsFor(rule, 2), 8); // 8.98 → 9 → the even count nearest, 8
  assert.equal(facetsFor(rule, 2.5), 12); // 11.2 → 12
  assert.equal(facetsFor(rule, 40), 28);
  assert.equal(facetsFor({ ...rule, step: 1 }, 2), 9);
  // An arc takes its share of the turn, at least one segment.
  assert.equal(facetsFor(rule, 2.5, Math.PI), 6);
  assert.equal(facetsFor(rule, 2.5, Math.PI / 2), 3);
  assert.equal(facetsFor(rule, 0.3, 0.1), 1);
  for (const [navy, { facets, panels }] of Object.entries(RULES)) {
    assert.ok(facets.floor >= 3 && facets.ceiling >= facets.floor, navy);
    assert.equal(facetsFor(facets, 0), facets.floor, navy);
    assert.equal(facetsFor(facets, 1e6), facets.ceiling, navy);
    for (const count of Object.keys(facets.sections)) assert.ok(Number(count) >= 3, navy);
    for (const band of [panels.hulls, panels.structures]) assert.ok(band[0] < band[1], navy);
  }
});
