/**
 * The arch study's light and motion, increment B — docs/sorrowgate-arch-study.md
 * §8; docs/style-neon-noir.md "The arch study's licence"; docs/habitats-art-brief.md
 * §5 "The arch study's licence"; docs/graphics-standards.md gate 6's study line
 * (#1637).
 *
 * What a GPU-less runner can hold: the lamps' guttering schedule against the
 * licence's four bounds, the pools' radius and the shader text each patch
 * lays, the hung fittings' weights, axes and periods laid on the committed
 * file's vertices, the debris's attributes from the file's extras, the sift's
 * and the cloud's caps and the sink-only shape of the sift, the collapse
 * sequence starting on a ground change this layer received and never on a
 * first ground that already holds the ruin, and reduced motion holding all
 * four. How it looks is the run-game evidence in docs/screenshots/issue-1637/.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Group, MeshStandardMaterial, type Material } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { paintGround, PUBLIC_LANDMARKS, SIM, SORROWGATE_GROUND } from '@echoes/shared';
import { PUBLIC_LANDMARK_SPECS, standLandmarks } from '../src/game/environment.ts';
import {
  buildLandmarkTemplate,
  lampCentres,
  primeLandmarkTemplate,
  resetLandmarkModels,
  siftSites,
} from '../src/game/landmarkModels.ts';
import {
  DIP_WINDOW_BUCKETS,
  FALL_ATTRIBUTE,
  FALL_SECONDS,
  HANG_AMPLITUDE_M,
  HANG_ATTRIBUTE,
  HANG_PERIOD_S,
  hangMotion,
  LAMP_COUNT,
  LAMP_DIP,
  LAMP_INDEX_ATTRIBUTE,
  lampLevels,
  POOL_RADIUS_M,
} from '../src/game/landmarkLight.ts';
import {
  CLOUD_MOTE_CAP,
  CLOUD_OUT_M,
  CLOUD_SECONDS,
  CLOUD_UP_M,
  CollapseCloud,
  LandmarkSift,
  SIFT_MOTE_CAP,
  SIFT_SINK_RATIO,
  SIFT_SINK_WORLD_PER_S,
  SIFT_SITE_CAP,
  SILT_LEVEL_CAP,
} from '../src/game/landmarkSift.ts';
import { SNOW_SINK_WORLD_PER_S } from '../src/game/water.ts';
import { EnvironmentLayer } from '../src/game/environmentLayer.ts';

const ARCH = PUBLIC_LANDMARKS['sorrowgate']![0]!;
const SPEC = PUBLIC_LANDMARK_SPECS[0]!;
const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);
const BUCKET_MS = 1000 / SIM.ECHO_HZ;
const DIP = Math.fround(LAMP_DIP);

async function parseArch(): Promise<Group> {
  const bytes = readFileSync(new URL(`${SPEC.slug}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

function sorrowgate() {
  const cells = paintGround(SORROWGATE_GROUND);
  return {
    cols: cells.cols,
    rows: cells.rows,
    cellM: cells.cellM,
    biomes: Array.from(cells.biomes),
    floor: Array.from(cells.floor),
    ceiling: Array.from(cells.ceiling),
  };
}

function collapse(terrain: ReturnType<typeof sorrowgate>): void {
  for (let col = 0; col < terrain.cols; col++) {
    const index = ARCH.cells.row * terrain.cols + col;
    terrain.ceiling[index] = terrain.floor[index]! + 1;
  }
}

/** The shader text a material's chained patches produce, from three's own chunks. */
function compiled(material: Material): { vertex: string; fragment: string } {
  const shader = {
    uniforms: {} as Record<string, unknown>,
    vertexShader:
      '#include <common>\n#include <beginnormal_vertex>\n#include <begin_vertex>\n#include <project_vertex>\n',
    fragmentShader:
      '#include <common>\n#include <color_fragment>\n#include <emissivemap_fragment>\n#include <lights_fragment_end>\n#include <tonemapping_fragment>\n',
  };
  material.onBeforeCompile(shader as never, null as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

describe('the lamps’ guttering (§8, licence rule 3)', () => {
  it('dips to 60 % for one or two buckets, at most once in any 2 s, never two lamps at once', () => {
    const dipsAt: number[][] = Array.from({ length: LAMP_COUNT }, () => []);
    let dipped = 0;
    for (let bucket = 0; bucket < 20_000; bucket++) {
      const levels = lampLevels(bucket);
      let dippingNow = 0;
      levels.forEach((level, i) => {
        assert.ok(level === 1 || level === DIP, `level ${level} is neither steady nor the dip`);
        if (level === DIP) {
          dippingNow++;
          dipped++;
          const last = dipsAt[i]!.at(-1);
          if (last !== bucket - 1) dipsAt[i]!.push(bucket);
          else dipsAt[i]!.push(bucket);
        }
      });
      assert.ok(dippingNow <= 1, `two lamps dip in bucket ${bucket}`);
    }
    assert.ok(dipped > 0, 'the lamps never gutter');
    for (const [i, buckets] of dipsAt.entries()) {
      // Runs of consecutive buckets are one dip: one or two long, and starts
      // at least ten buckets (2 s) apart.
      const starts: number[] = [];
      let runLength = 0;
      for (let k = 0; k < buckets.length; k++) {
        if (k === 0 || buckets[k] !== buckets[k - 1]! + 1) {
          if (k > 0) assert.ok(runLength <= 2, `lamp ${i} dips ${runLength} buckets`);
          starts.push(buckets[k]!);
          runLength = 1;
        } else runLength++;
      }
      for (let k = 1; k < starts.length; k++) {
        assert.ok(starts[k]! - starts[k - 1]! >= DIP_WINDOW_BUCKETS, `lamp ${i} dips twice in 2 s`);
      }
    }
  });

  it('is a hash of the lamp and the bucket: the same on every client', () => {
    assert.deepEqual(lampLevels(4321), lampLevels(4321));
  });
});

describe('the template’s light and motion', () => {
  it('lays the pools, the sway, the drop and the levels on the right materials, inside the licence', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    assert.ok(template.uniforms !== null, 'the prologue look carries the study');
    const { uniforms } = template;
    // Four lamps at the glass centres, at the steady level.
    assert.equal(uniforms.uPoolCount.value, LAMP_COUNT);
    const lamps = lampCentres(template.states.intact);
    lamps.forEach((at, i) => {
      const pool = Array.from(uniforms.uPool.value.slice(i * 4, i * 4 + 4));
      [at.x, at.y, at.z, 1].forEach((v, k) =>
        assert.ok(Math.abs(pool[k]! - v) < 1e-3, `lamp ${i} at float precision`)
      );
    });
    for (const { material } of template.states.intact.parts) {
      const { vertex, fragment } = compiled(material);
      if (material.name === 'civic_lamp') {
        assert.ok(fragment.includes('uLampLevel'), 'the glass takes its level');
        assert.ok(!fragment.includes('uPool['), 'the glass takes no pool');
      } else {
        assert.ok(
          fragment.includes(`/ ${POOL_RADIUS_M.toFixed(1)}`),
          `${material.name} pools fall to nothing at 20 m`
        );
        assert.ok(vertex.includes(FALL_ATTRIBUTE), `${material.name} drops its debris`);
        assert.equal(
          vertex.includes(HANG_ATTRIBUTE),
          material.name === 'structure_rib',
          `${material.name} sway`
        );
      }
    }
    // No light outside the arch: the patches are on the template's own
    // clones, never on a prop's or a hull's material.
    assert.ok(!compiled(new MeshStandardMaterial()).fragment.includes('uPool'));
    // Off the prologue's look there is no licence and no patch.
    const standard = buildLandmarkTemplate(await parseArch(), SPEC, 'standard');
    assert.equal(standard.uniforms, null);
    for (const { material } of standard.states.intact.parts) {
      assert.ok(
        !compiled(material).fragment.includes('uPool'),
        `${material.name} under the standard look`
      );
    }
  });

  it('weights each hung fitting from its pivot to its free end on its own axis and period', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    const rib = template.states.intact.parts.find((p) => p.material.name === 'structure_rib')!;
    const hang = rib.geometry.getAttribute(HANG_ATTRIBUTE);
    const position = rib.geometry.getAttribute('position');
    const perFitting = new Map<
      number,
      { top: number; low: number; axis: [number, number]; wMax: number }
    >();
    for (let i = 0; i < hang.count; i++) {
      const period = hang.getZ(i);
      if (period === 0) continue;
      const entry = perFitting.get(period) ?? {
        top: -Infinity,
        low: Infinity,
        axis: [hang.getX(i), hang.getY(i)],
        wMax: 0,
      };
      entry.top = Math.max(entry.top, position.getY(i));
      entry.low = Math.min(entry.low, position.getY(i));
      entry.wMax = Math.max(entry.wMax, hang.getW(i));
      perFitting.set(period, entry);
    }
    assert.equal(perFitting.size, 6, 'six fittings hang');
    const bearings: number[] = [];
    for (const [period, { top, low, axis, wMax }] of perFitting) {
      assert.ok(period >= HANG_PERIOD_S[0] && period <= HANG_PERIOD_S[1], `period ${period}`);
      assert.ok(Math.abs(wMax - 1) < 1e-6, 'the free end takes the whole amplitude');
      assert.ok(low >= 60, `a fitting ends at ${low}, under +60`);
      assert.ok(top > low + 30, 'the cable hangs from the pivot');
      bearings.push(Math.atan2(axis[1], axis[0]));
    }
    const spread = Math.max(...bearings) - Math.min(...bearings);
    assert.ok(spread >= (2 * Math.PI) / 3, `axes spread ${spread} rad, under 120°`);
    assert.ok(HANG_AMPLITUDE_M <= 1.5);
    // Pivot weight zero: the vertex at the top of each cable does not move.
    for (let i = 0; i < hang.count; i++) {
      if (hang.getZ(i) > 0 && position.getY(i) >= perFitting.get(hang.getZ(i))!.top - 0.01) {
        assert.ok(hang.getW(i) < 0.01, 'the pivot moves');
      }
    }
    for (let i = 0; i < 6; i++) assert.equal(hangMotion(i, 6).periodS >= 9, true);
  });

  it('gives each fall piece its recorded start height and index, and the lamp glass its index', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    const { ruined, intact } = template.states;
    const starts = new Set<number>();
    for (const { geometry } of ruined.parts) {
      const fall = geometry.getAttribute(FALL_ATTRIBUTE);
      for (let i = 0; i < fall.count; i++) if (fall.getX(i) > 0) starts.add(fall.getY(i));
    }
    assert.equal(starts.size, 12, 'twelve pieces fall');
    for (let i = 0; i < 12; i++) {
      const recorded = ruined.extras.get(`fall_${i}`)?.['startAboveRestM'];
      assert.ok(typeof recorded === 'number' && recorded > 0);
    }
    const glass = intact.parts.find((p) => p.material.name === 'civic_lamp')!;
    const index = glass.geometry.getAttribute(LAMP_INDEX_ATTRIBUTE);
    const indices = new Set<number>();
    for (let i = 0; i < index.count; i++) indices.add(index.getX(i));
    assert.deepEqual([...indices].sort(), [0, 1, 2, 3]);
    assert.equal(siftSites(intact, 'intact').length, 8);
    assert.equal(siftSites(ruined, 'ruined').length, 4);
  });
});

describe('the sift and the cloud (§8, gate 6)', () => {
  it('sinks only, under the cap, at no more than twice the snow’s rate, a tenth of the silt', () => {
    assert.ok(SIFT_SINK_RATIO <= 2 && SIFT_SINK_WORLD_PER_S <= 2 * SNOW_SINK_WORLD_PER_S);
    assert.ok(SILT_LEVEL_CAP <= 0.1);
    const sift = new LandmarkSift();
    const sites = Array.from({ length: 8 }, (_, i) => ({ x: i * 10, y: 100, z: 0, xM: 0, yM: 0 }));
    sift.build(sites);
    assert.equal(sift.motes, SIFT_MOTE_CAP);
    assert.equal(SIFT_SITE_CAP.intact, 8);
    assert.equal(SIFT_SITE_CAP.ruined, 4);
    const { vertex } = compiled(sift.points.material as Material);
    assert.ok(vertex.includes('transformed.y -= siftT * aSift.y'), 'a mote only sinks');
    assert.ok(!/transformed\.x\s*[+-]=/.test(vertex), 'no lateral motion: a current is a mechanic');
    // The clock steps on the bucket and holds under reduced motion.
    sift.tick(1234);
    assert.equal(sift.clockS, (Math.floor(1234 / BUCKET_MS) * BUCKET_MS) / 1000);
    sift.setReducedMotion(true);
    const held = (sift.tick(5000), sift.clockS);
    sift.tick(9000);
    assert.equal(sift.clockS, held);
  });

  it('raises at most 384 motes, 40 m out and 30 m up, and is gone by 14 s', () => {
    const cloud = new CollapseCloud();
    cloud.build(
      [{ x: 0, y: 0, z: 0 } as never, { x: 100, y: 0, z: 0 } as never],
      { x: 0, y: 0, z: 1 } as never,
      10_000
    );
    assert.equal(cloud.motes, CLOUD_MOTE_CAP);
    const attr = cloud.points.geometry.getAttribute('aCloud');
    const start = cloud.points.geometry.getAttribute('position');
    for (let i = 0; i < attr.count; i++) {
      // A mote starts on the foot itself, so its rise alone is its height.
      assert.equal(start.getY(i), 0);
      assert.ok(attr.getX(i) <= CLOUD_OUT_M && start.getY(i) + attr.getY(i) <= CLOUD_UP_M);
    }
    assert.equal(cloud.tick(1000), false);
    assert.equal(cloud.tick(1000 + CLOUD_SECONDS * 1000 - 1), false);
    assert.equal(cloud.tick(1000 + CLOUD_SECONDS * 1000 + BUCKET_MS), true);
    assert.equal(cloud.motes, 0);
  });
});

describe('the layer’s sequence', () => {
  const ground = () => -999;
  const stand = (layer: EnvironmentLayer, terrain: ReturnType<typeof sorrowgate>) =>
    layer.rebuild(terrain, ground);

  it('starts the collapse on the ground change it received, lamps dark, cloud up, settled by 14 s', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    primeLandmarkTemplate(template, 'sorrowgate');
    const lampParts = (layer: EnvironmentLayer) =>
      layer.group.children.filter((child) => child.name.endsWith(':civic_lamp')).length;
    try {
      const layer = new EnvironmentLayer('sorrowgate');
      layer.setLandmarks([ARCH]);
      const terrain = sorrowgate();
      stand(layer, terrain);
      assert.equal(layer.stats().landmarks, 1);
      assert.equal(layer.stats().siftMotes, SIFT_MOTE_CAP);
      assert.equal(layer.stats().cloudMotes, 0);
      layer.tick(0);
      assert.equal(lampParts(layer), 1, 'the intact state stands its glass');
      assert.equal(template.uniforms?.uPoolCount.value, LAMP_COUNT);
      // The change arrives: the ruin stands, the sequence starts, the lamps
      // are the ruined state's, which has none, and the pools go with them.
      collapse(terrain);
      stand(layer, terrain);
      assert.equal(layer.collapsing, true);
      assert.equal(lampParts(layer), 0, 'no glass stands on the ruin');
      assert.equal(layer.lampPositions().length, 0);
      assert.equal(template.uniforms?.uPoolCount.value, 0, 'the pools are off on the ruin');
      assert.equal(layer.stats().cloudMotes, CLOUD_MOTE_CAP);
      assert.equal(
        layer.stats().siftMotes,
        SIFT_SITE_CAP.ruined * Math.floor(SIFT_MOTE_CAP / SIFT_SITE_CAP.ruined)
      );
      assert.ok(layer.group.children.includes(layer.cloud.points));
      layer.tick(10_000);
      layer.tick(10_000 + FALL_SECONDS * 1000 + BUCKET_MS);
      assert.equal(layer.collapsing, false, 'the debris is down within 4 s');
      layer.tick(10_000 + CLOUD_SECONDS * 1000 + 2 * BUCKET_MS);
      assert.equal(layer.stats().cloudMotes, 0);
      assert.ok(!layer.group.children.includes(layer.cloud.points), 'the cloud leaves the group');
    } finally {
      resetLandmarkModels();
    }
  });

  it('plays no sequence on a first ground that already holds the ruin, nor under reduced motion', async () => {
    primeLandmarkTemplate(
      buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate'),
      'sorrowgate'
    );
    try {
      const reloaded = new EnvironmentLayer('sorrowgate');
      reloaded.setLandmarks([ARCH]);
      const terrain = sorrowgate();
      collapse(terrain);
      stand(reloaded, terrain);
      assert.equal(reloaded.collapsing, false);
      assert.equal(reloaded.stats().cloudMotes, 0);
      assert.equal(standLandmarks(terrain, [ARCH])[0]!.state, 'ruined');

      const still = new EnvironmentLayer('sorrowgate');
      still.setLandmarks([ARCH]);
      still.setReducedMotion(true);
      const fresh = sorrowgate();
      stand(still, fresh);
      collapse(fresh);
      stand(still, fresh);
      assert.equal(still.collapsing, false, 'reduced motion cuts to the ruin');
      assert.equal(still.stats().cloudMotes, 0);
    } finally {
      resetLandmarkModels();
    }
  });

  it('flips the pools and the glass for the harness, and tells it where the lamps stand', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    primeLandmarkTemplate(template, 'sorrowgate');
    try {
      const layer = new EnvironmentLayer('sorrowgate');
      layer.setLandmarks([ARCH]);
      stand(layer, sorrowgate());
      const u = template.uniforms!;
      assert.equal(u.uPoolCount.value, LAMP_COUNT);
      const flipped = layer.setStudySwitches({ pools: false });
      assert.deepEqual([flipped.pools, flipped.lamps], [false, true]);
      assert.equal(u.uPoolCount.value, 0, 'pools off at once');
      layer.setStudySwitches({ pools: true, lamps: false });
      assert.equal(u.uPoolCount.value, LAMP_COUNT);
      layer.tick(BUCKET_MS * 7);
      assert.deepEqual(
        Array.from(u.uLampLevel.value),
        [0, 0, 0, 0],
        'the glass dark on the next bucket'
      );
      layer.setStudySwitches({ lamps: true });
      layer.tick(BUCKET_MS * 8);
      assert.ok(Array.from(u.uLampLevel.value).every((l) => l > 0));
      // The lamps in world units: the anchor plus each glass centre, at the
      // literal's floor plus its height.
      const lamps = layer.lampPositions();
      const centres = lampCentres(template.states.intact);
      assert.equal(lamps.length, centres.length);
      lamps.forEach((at, i) => {
        assert.ok(Math.abs(at.x - (ARCH.anchorXM + centres[i]!.x)) < 1e-3);
        assert.ok(Math.abs(at.z - (ARCH.anchorYM + centres[i]!.z)) < 1e-3);
        assert.ok(Math.abs(at.y - (-352 + centres[i]!.y)) < 1e-3);
      });
    } finally {
      resetLandmarkModels();
    }
  });

  it('holds the lamps steady and the sway still under reduced motion, and steps them otherwise', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    primeLandmarkTemplate(template, 'sorrowgate');
    try {
      const layer = new EnvironmentLayer('sorrowgate');
      layer.setLandmarks([ARCH]);
      stand(layer, sorrowgate());
      const u = template.uniforms!;
      // Find a bucket where a lamp dips, and check the pool steps with it.
      let dipBucket = -1;
      for (let b = 0; b < 2000 && dipBucket < 0; b++) {
        if (lampLevels(b).some((l) => l === DIP)) dipBucket = b;
      }
      layer.tick(dipBucket * BUCKET_MS);
      const dipped = Array.from(u.uLampLevel.value).findIndex((l) => l === DIP);
      assert.ok(dipped >= 0);
      assert.equal(u.uPool.value[dipped * 4 + 3], DIP, 'the pool steps with its lamp');
      assert.equal(u.uHangTime.value, (dipBucket * BUCKET_MS) / 1000);
      layer.setReducedMotion(true);
      layer.tick(dipBucket * BUCKET_MS + BUCKET_MS);
      assert.deepEqual(Array.from(u.uLampLevel.value), [1, 1, 1, 1]);
      const heldTime = u.uHangTime.value;
      layer.tick(dipBucket * BUCKET_MS + 5000);
      assert.equal(u.uHangTime.value, heldTime, 'the sway is held');
    } finally {
      resetLandmarkModels();
    }
  });
});
