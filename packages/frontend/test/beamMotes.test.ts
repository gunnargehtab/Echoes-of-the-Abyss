/**
 * Marine snow in a searchlight at the High graphics quality
 * (docs/art-direction.md, "Snow in a beam"; #1855). What that section
 * promises: the fine snow is one lattice fixed in the world, which a beam
 * that moves sweeps over and never carries; it shows by an own hull's beam
 * alone, less what the ground and a hull hide; no mote is lit where the
 * lattice wraps; it sinks and only sinks, held under reduced motion; and no
 * beam draws none. What it looks like is the frames in
 * docs/screenshots/issue-1855.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CustomBlending,
  OneFactor,
  PointsMaterial,
  ShaderLib,
  ZeroFactor,
  type BufferAttribute,
  type InstancedBufferGeometry,
} from 'three';
import { HIGH_GRAPHICS } from '@echoes/shared';
import { BEAM_MOTE_ANCHORS, BeamMotes, moteAt, patchBeamMotes } from '../src/game/beamMotes.ts';
import { SNOW_SINK_WORLD_PER_S } from '../src/game/water.ts';

const SPEC = HIGH_GRAPHICS.MOTES;
const BEAM = HIGH_GRAPHICS.SEARCHLIGHT;

describe('snow in a beam (#1855)', () => {
  it('is matter in the world pass: light adds, alpha is left, and the water takes it', () => {
    const motes = new BeamMotes();
    const material = motes.points.material as PointsMaterial;
    assert.equal(material.blending, CustomBlending);
    assert.deepEqual(
      [material.blendSrc, material.blendDst, material.blendSrcAlpha, material.blendDstAlpha],
      [OneFactor, OneFactor, ZeroFactor, OneFactor]
    );
    assert.equal(material.depthWrite, false);
    assert.equal(material.fog, true);
    assert.equal(material.toneMapped, false, 'scene-referred: the composite runs the curve');
    assert.equal(material.sizeAttenuation, false, 'the patch is the whole of its size');
    assert.equal(motes.points.visible, false, 'no beam, no mote');
    assert.equal(motes.motes, 0);
    motes.dispose();
  });

  it("finds every anchor it patches in three's own points program", () => {
    const shader = {
      vertexShader: ShaderLib.points.vertexShader,
      fragmentShader: ShaderLib.points.fragmentShader,
    };
    for (const anchor of BEAM_MOTE_ANCHORS.vertex)
      assert.ok(shader.vertexShader.includes(anchor), `vertex: ${anchor}`);
    for (const anchor of BEAM_MOTE_ANCHORS.fragment)
      assert.ok(shader.fragmentShader.includes(anchor), `fragment: ${anchor}`);
    patchBeamMotes(shader);
    const v = shader.vertexShader;
    // The light on a mote is its own beam's, read from the searchlights'
    // uniforms, less what the ground and a hull hide of it.
    assert.match(v, /echoesSearchBeam\( moteBeam, transformed, moteToLamp \)/);
    assert.match(v, /echoesSearchShadeCoarse\( moteBeam, transformed \)/);
    // The coarsest mote sends on the albedo, the finest a share of it.
    assert.ok(
      v.includes(`* ${SPEC.ALBEDO.toFixed(6)} * mix( ${SPEC.FINE_SHARE.toFixed(6)}, 1.0, aMote )`)
    );
    // It sinks and only sinks: the clock reaches a mote's height alone.
    assert.match(v, /moteCell\.y -= uMoteSinkM;/);
    assert.equal(v.match(/uMoteSinkM/g)!.length, 2, 'declared, and read once');
    // A mote in no beam costs no fragment.
    assert.match(v, /gl_Position = vec4\( 2\.0, 2\.0, 2\.0, 1\.0 \);/);
    assert.match(shader.fragmentShader, /diffuseColor\.rgb = vMoteLight \* moteFall \* moteFall/);
  });

  it('is one lattice, fixed in the world: a beam that moves carries no mote', () => {
    const cells = [
      { x: 0.11, y: 0.52, z: 0.93 },
      { x: 0.74, y: 0.08, z: 0.31 },
      { x: 0.5, y: 0.99, z: 0.02 },
    ];
    const aim = { x: Math.cos(0.4) * Math.cos(0.3), y: -Math.sin(0.3), z: Math.sin(0.4) * 0.955 };
    const lamp = { x: 562, y: -66, z: 2018 };
    // A hull under way, a hull that has turned, and a hull a map away.
    const beams = [
      { lamp: { x: 569, y: -66, z: 2021 }, aim },
      { lamp, aim: { x: -aim.z, y: aim.y, z: aim.x } },
      { lamp: { x: 3120.5, y: -410, z: 77.25 }, aim },
    ];
    for (const cell of cells) {
      const first = moteAt(cell, 0, lamp, aim);
      for (const beam of beams) {
        const now = moteAt(cell, 0, beam.lamp, beam.aim);
        for (const axis of ['x', 'y', 'z'] as const) {
          // The same mote, or its copy whole cells off: never one that slid.
          const cellsOff = (now[axis] - first[axis]) / SPEC.CELL_M;
          assert.ok(Math.abs(cellsOff - Math.round(cellsOff)) < 1e-6, `${axis} slid ${cellsOff}`);
          // And the copy nearest the beam's centre.
          const centre = beam.lamp[axis] + beam.aim[axis] * SPEC.AHEAD_M;
          assert.ok(Math.abs(now[axis] - centre) <= SPEC.CELL_M / 2 + 1e-6);
        }
      }
      // The sink moves a mote down and nowhere else.
      const sunk = moteAt(cell, 7.5, lamp, aim);
      assert.equal(sunk.x, first.x);
      assert.equal(sunk.z, first.z);
      const fell = (first.y - sunk.y) / SPEC.CELL_M;
      assert.ok(Math.abs(fell - 7.5 / SPEC.CELL_M - Math.round(fell - 7.5 / SPEC.CELL_M)) < 1e-6);
    }
  });

  it('lights no mote where the lattice wraps, and every mote at the lamp', () => {
    const [whole, gone] = SPEC.FADE_M;
    // A mote wraps at half a cell from the beam's centre along an axis, and
    // it is gone by then at any bearing.
    assert.ok(gone <= SPEC.CELL_M / 2, `${gone} m of fade in a ${SPEC.CELL_M} m cell`);
    assert.ok(whole < gone);
    // The lamp, where the beam is brightest, is inside the whole of it.
    assert.ok(SPEC.AHEAD_M <= whole, 'the lamp stands in the fade');
    // And the lit snow ends inside the beam's own reach.
    assert.ok(SPEC.AHEAD_M + gone <= BEAM.REACH_M);
  });

  it('draws a cell a beam, and none with no beam', () => {
    const motes = new BeamMotes();
    const geometry = motes.points.geometry as InstancedBufferGeometry;
    assert.equal((geometry.getAttribute('position') as BufferAttribute).count, SPEC.COUNT);
    motes.update(1000, 2);
    assert.equal(motes.points.visible, true);
    assert.equal(geometry.instanceCount, 2);
    assert.equal(motes.motes, 2 * SPEC.COUNT);
    // Never more beams than the searchlights' uniforms hold.
    motes.update(1016, BEAM.MAX + 3);
    assert.equal(geometry.instanceCount, BEAM.MAX);
    motes.update(1032, 0);
    assert.equal(motes.points.visible, false, 'a fleet on Silent Running shows no mote');
    assert.equal(motes.motes, 0);
    // Nor does a view that has left High, whatever the last frame aimed.
    motes.update(1048, 3);
    motes.hide();
    assert.equal(motes.points.visible, false);
    assert.equal(motes.motes, 0);
    // The lattice is a fixed table: a second cloud is the same one.
    const again = new BeamMotes();
    assert.deepEqual(
      [...(again.points.geometry.getAttribute('position').array as Float32Array).slice(0, 300)],
      [...(geometry.getAttribute('position').array as Float32Array).slice(0, 300)]
    );
    for (const value of geometry.getAttribute('position').array as Float32Array) {
      assert.ok(value >= 0 && value < 1);
    }
    motes.dispose();
    again.dispose();
  });

  it("sinks at the snow's own rate, and stands still under reduced motion", () => {
    const motes = new BeamMotes();
    motes.update(10_000, 1);
    assert.equal(motes.sunkM, 0, 'the first frame has no last one');
    motes.update(10_100, 1);
    assert.ok(Math.abs(motes.sunkM - 0.1 * SNOW_SINK_WORLD_PER_S) < 1e-9);
    // A tab that was hidden does not drop the lattice a cell.
    motes.update(70_000, 1);
    assert.ok(Math.abs(motes.sunkM - 0.35 * SNOW_SINK_WORLD_PER_S) < 1e-9);
    motes.setReducedMotion(true);
    const held = motes.sunkM;
    motes.update(70_100, 1);
    motes.update(99_000, 1);
    assert.equal(motes.sunkM, held);
    assert.equal(motes.points.visible, true, 'held, and still in the beam');
    motes.dispose();
  });
});
