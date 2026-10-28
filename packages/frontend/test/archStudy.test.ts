/**
 * The arch study, increment A — docs/sorrowgate-arch-study.md §7 "Placement
 * contract" and "Isolation"; docs/graphics-standards.md gate 1 "Public
 * landmarks" (five rules) and gate 6's study line; docs/asset-prompts-3d.md
 * Block 4b (#1637).
 *
 * What a GPU-less runner can hold: the flag, the registry row against Block
 * 4b, the landmark's state and plan from a grid, the budget spent before the
 * scatter and the room the scatter makes, the template built from the
 * committed file (merged to the row's calls, origin kept, named nodes
 * recorded), and the layer standing it in the state its cells give at the
 * literal's floor. How it looks is the run-game evidence in
 * docs/screenshots/issue-1637/.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { Group, InstancedMesh, Matrix4, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Biome, paintGround, PUBLIC_LANDMARKS, SORROWGATE_GROUND } from '@echoes/shared';
import { archStudyEnabled } from '../src/game/archStudy.ts';
import {
  ENVIRONMENT_PROPS,
  LANDMARK_TRI_CAP,
  mapPlacements,
  mapProps,
  placeAll,
  placeProps,
  PROP_TRI_RESERVATION,
  PUBLIC_LANDMARK_SPECS,
  scatterProps,
  standLandmarks,
  type PropSpec,
} from '../src/game/environment.ts';
import {
  buildLandmarkTemplate,
  primeLandmarkTemplate,
  resetLandmarkModels,
  stateBounds,
} from '../src/game/landmarkModels.ts';
import { EnvironmentLayer } from '../src/game/environmentLayer.ts';
import { depthToWorldY } from '../src/game/perspectiveTerrain.ts';
import { keepsGlowOutsideToneMapping } from '../src/game/modelLighting.ts';
import { readsPropVeil } from '../src/game/veilShading.ts';

const ARCH = PUBLIC_LANDMARKS['sorrowgate']![0]!;
const SPEC = PUBLIC_LANDMARK_SPECS[0]!;
const MODELS = new URL('../../../docs/concept-art/models/', import.meta.url);

async function parseArch(): Promise<Group> {
  const bytes = readFileSync(new URL(`${SPEC.slug}.glb`, MODELS));
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return (await new GLTFLoader().parseAsync(buffer, '')).scene;
}

/** Sorrowgate's literal as a terrain payload, with mutable cells. */
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

/** The 10:40 beat: the whole of row 8 solid, as sorrowgate.ts writes `arch-span`. */
function collapse(terrain: ReturnType<typeof sorrowgate>): void {
  for (let col = 0; col < terrain.cols; col++) {
    const index = ARCH.cells.row * terrain.cols + col;
    terrain.ceiling[index] = terrain.floor[index]! + 1;
  }
}

describe('the study’s flag', () => {
  it('is on for a development build opened with ?arch-study=1 and off otherwise (§7)', () => {
    assert.equal(archStudyEnabled(true, '?arch-study=1'), true);
    assert.equal(archStudyEnabled(true, '?arch-study=0'), false);
    assert.equal(archStudyEnabled(true, ''), false);
    assert.equal(archStudyEnabled(false, '?arch-study=1'), false, 'no shipped build turns it on');
  });
});

describe('the registry row', () => {
  it('is Block 4b’s: the arch, 570 m, four calls, at most 12,000 triangles a state', () => {
    assert.equal(PUBLIC_LANDMARK_SPECS.length, 1);
    assert.equal(SPEC.slug, ARCH.slug);
    assert.equal(SPEC.footprintM, 570);
    assert.equal(SPEC.calls, 4);
    for (const state of ['intact', 'ruined'] as const) {
      assert.ok(SPEC.triBudget[state] > 0 && SPEC.triBudget[state] <= LANDMARK_TRI_CAP, state);
    }
    // §6's plans: intact X ±285, Z ±80; ruined X ±285, Z +115 to +150.
    assert.deepEqual(SPEC.plan.intact, { x: [-285, 285], z: [-80, 80] });
    assert.deepEqual(SPEC.plan.ruined, { x: [-285, 285], z: [115, 150] });
  });
});

describe('standing a landmark from the grid', () => {
  it('reads the state off the anchor cells and puts the plan on the map', () => {
    const terrain = sorrowgate();
    const [intact] = standLandmarks(terrain, [ARCH]);
    assert.equal(intact!.state, 'intact');
    assert.deepEqual(intact!.plan, { x0: 2265, x1: 2835, y0: 2045, y1: 2205 });
    collapse(terrain);
    const [ruined] = standLandmarks(terrain, [ARCH]);
    assert.equal(ruined!.state, 'ruined');
    assert.deepEqual(ruined!.plan, { x0: 2265, x1: 2835, y0: 2240, y1: 2275 });
  });

  it('stays local: both plans lie inside the anchor cells and their one-cell ring (rule 2)', () => {
    const terrain = sorrowgate();
    for (const state of ['intact', 'ruined'] as const) {
      if (state === 'ruined') collapse(terrain);
      const [stand] = standLandmarks(terrain, [ARCH]);
      const { x0, x1, y0, y1 } = stand!.plan;
      const { cellM } = terrain;
      assert.ok(Math.floor(x0 / cellM) >= ARCH.cells.col0 - 1, `${state} west`);
      assert.ok(Math.floor(x1 / cellM) <= ARCH.cells.col1 + 1, `${state} east`);
      assert.ok(Math.floor(y0 / cellM) >= ARCH.cells.row - 1, `${state} north`);
      assert.ok(Math.floor(y1 / cellM) <= ARCH.cells.row + 1, `${state} south`);
    }
  });

  it('stands nothing for a landmark with no registry row', () => {
    assert.deepEqual(standLandmarks(sorrowgate(), [{ ...ARCH, slug: 'env-nothing' }]), []);
  });
});

describe('the budget and the room the scatter makes', () => {
  it('spends the drawn state’s triangles from the reservation before the scatter (rule 3)', () => {
    // A greedy row that would fill the reservation on its own, so the
    // landmark's spend shows as fewer scattered instances.
    const greedy: PropSpec = {
      ...ENVIRONMENT_PROPS.find((s) => s.slug === 'env-rock-crag-a')!,
      stands: [Biome.OpenWater, Biome.CoralRuins, Biome.AbyssalTrench, Biome.KelpForest],
      nearRock: 'any',
      maxSlopeM: Infinity,
      excludeRoofed: false,
      density: 3,
      triBudget: 799,
    };
    const terrain = sorrowgate();
    const alone = placeProps(terrain, [greedy], 'standard');
    const withArch = placeProps(terrain, [greedy], 'standard', [], [ARCH]);
    const spent = (list: typeof alone) => list.length * greedy.triBudget;
    assert.ok(
      spent(alone) > PROP_TRI_RESERVATION - greedy.triBudget,
      'the row fills the reservation'
    );
    assert.ok(
      spent(withArch) + SPEC.triBudget.intact <= PROP_TRI_RESERVATION,
      'the arch is inside the reservation'
    );
    assert.ok(withArch.length < alone.length, 'the landmark was spent');
    assert.equal(placeAll(terrain, [greedy], 'standard', [], [ARCH]).landmarks.length, 1);
  });

  it('refuses a landmark the reservation cannot hold, and stands only what it admitted', () => {
    const terrain = sorrowgate();
    const dear = {
      ...SPEC,
      triBudget: { intact: PROP_TRI_RESERVATION + 1, ruined: PROP_TRI_RESERVATION + 1 },
    };
    const stands = standLandmarks(terrain, [ARCH], [dear]);
    assert.equal(stands.length, 1, 'the row stands it');
    // Through the spend, the caps refuse it: admitted lists nothing.
    const admitted = placeAll(terrain, [], 'standard', [], [ARCH]).landmarks;
    assert.equal(admitted.length, 1, 'the real row is admitted');
    assert.ok(admitted[0]!.spec.triBudget.intact <= PROP_TRI_RESERVATION);
  });

  it('keeps every scattered prop off the drawn state’s plan (rule 4)', () => {
    const terrain = sorrowgate();
    // A row dense enough to land in the anchor cells.
    const dense: PropSpec = {
      ...ENVIRONMENT_PROPS.find((s) => s.slug === 'env-ruin-block')!,
      stands: [Biome.OpenWater, Biome.CoralRuins],
      nearRock: 'any',
      maxSlopeM: Infinity,
      density: 3,
    };
    const stands = standLandmarks(terrain, [ARCH]);
    const { plan } = stands[0]!;
    const meets = (xM: number, yM: number, r: number) => {
      const dx = Math.max(plan.x0 - xM, 0, xM - plan.x1);
      const dy = Math.max(plan.y0 - yM, 0, yM - plan.y1);
      return dx * dx + dy * dy < r * r;
    };
    const unbudgeted = [...scatterProps(terrain, [dense], 'standard')];
    const onPlan = unbudgeted.filter(({ placement, spec }) =>
      meets(placement.xM, placement.yM, (spec.footprintM * placement.scale) / 2)
    );
    assert.ok(onPlan.length > 0, 'the control stands something on the plan');
    const placed = placeProps(terrain, [dense], 'standard', [], [ARCH]);
    for (const placement of placed) {
      assert.ok(
        !meets(placement.xM, placement.yM, (dense.footprintM * placement.scale) / 2),
        `${placement.xM}, ${placement.yM} meets the plan`
      );
    }
    // A prop that stands on rock is not on open ground, so the rule leaves
    // it: a crag whose footprint meets the plan keeps its place.
    collapse(terrain);
    const crag: PropSpec = {
      ...ENVIRONMENT_PROPS.find((s) => s.slug === 'env-rock-crag-a')!,
      footprintM: 60,
      scaleJitter: [1, 1],
      density: 3,
    };
    assert.equal(crag.stands, 'rock');
    const ruinedPlan = standLandmarks(terrain, [ARCH])[0]!.plan;
    const onRock = placeProps(terrain, [crag], 'standard');
    assert.ok(
      onRock.some((p) => meets(p.xM, p.yM, 30) && p.cellIndex >= 0),
      'the control: a crag on the wall meets the plan'
    );
    void ruinedPlan;
    assert.deepEqual(placeProps(terrain, [crag], 'standard', [], [ARCH]), onRock);
  });

  it('removes nothing from the prologue’s own scatter today, intact or ruined (§7 “Scatter”)', () => {
    const without = mapProps('sorrowgate', 'sorrowgate');
    const withArch = mapProps('sorrowgate', 'sorrowgate', [ARCH]);
    assert.deepEqual(withArch, without);
    assert.equal(mapPlacements('sorrowgate', 'sorrowgate', [ARCH]).landmarks[0]?.state, 'intact');
    // The grid after 10:40, as the session's layer sees it.
    const terrain = sorrowgate();
    collapse(terrain);
    const ruinedWithout = placeProps(terrain, ENVIRONMENT_PROPS, 'sorrowgate');
    const ruinedWith = placeAll(terrain, ENVIRONMENT_PROPS, 'sorrowgate', [], [ARCH]);
    assert.deepEqual(ruinedWith.placements, ruinedWithout);
    assert.equal(ruinedWith.landmarks[0]?.state, 'ruined');
  });
});

describe('the template from the committed file', () => {
  it('merges each state to the row’s calls, keeps the origin, and records the named nodes', async () => {
    const template = buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate');
    const { intact, ruined } = template.states;
    assert.ok(intact.parts.length <= SPEC.calls, `${intact.parts.length} calls intact`);
    assert.ok(ruined.parts.length <= SPEC.calls, `${ruined.parts.length} calls ruined`);
    // Intake's counts, which the row carries.
    assert.equal(intact.triangles, SPEC.triBudget.intact);
    assert.equal(ruined.triangles, SPEC.triBudget.ruined);
    // The origin is the anchor floor: foundations 30 m under it, the top 150
    // over, the span ±285 along X (§6), at scale 1.
    const box = stateBounds(intact);
    assert.ok(Math.abs(box.min.y + 30) < 0.5, `foundations at ${box.min.y}`);
    assert.ok(Math.abs(box.max.y - 150) < 0.5, `top at ${box.max.y}`);
    assert.ok(Math.abs(box.max.x - 285) < 0.5 && Math.abs(box.min.x + 285) < 0.5, 'span');
    const ruin = stateBounds(ruined);
    assert.ok(ruin.min.z >= 115 && ruin.max.z <= 150, `ruin Z ${ruin.min.z}..${ruin.max.z}`);
    // Block 4b's runtime names, with the lamps on the south face 20–40 m up
    // and the fall pieces carrying their start heights.
    for (let i = 0; i < 4; i++) {
      const lamp = intact.nodes.get(`lamp_${i}`);
      assert.ok(lamp !== undefined, `lamp_${i}`);
      assert.ok(lamp.y >= 20 && lamp.y <= 40 && lamp.z > 0, `lamp_${i} at ${lamp.toArray()}`);
    }
    for (let i = 0; i < 6; i++) assert.ok(intact.nodes.has(`hang_${i}`), `hang_${i}`);
    for (let i = 0; i < 8; i++) assert.ok(intact.nodes.has(`sift_${i}`), `sift_${i}`);
    for (let i = 0; i < 4; i++) assert.ok(ruined.nodes.has(`sift_r${i}`), `sift_r${i}`);
    for (let i = 0; i < 12; i++) {
      assert.ok(ruined.nodes.has(`fall_${i}`), `fall_${i}`);
      const start = ruined.extras.get(`fall_${i}`)?.['startAboveRestM'];
      assert.ok(typeof start === 'number' && start > 0, `fall_${i} start height`);
    }
    assert.ok(!ruined.nodes.has('lamp_0'), 'no lamp on the ruined state');
    // The materials took the prop hooks: glow outside the curve on the lamp
    // glass alone, the veil on every one.
    for (const state of [intact, ruined]) {
      for (const { material } of state.parts) {
        assert.ok(readsPropVeil(material), `${material.name} takes the veil`);
        assert.equal(
          keepsGlowOutsideToneMapping(material as never),
          material.name === 'civic_lamp',
          `${material.name} glow`
        );
      }
    }
  });
});

describe('the layer stands the landmark', () => {
  const place = (terrain: ReturnType<typeof sorrowgate>) => {
    const layer = new EnvironmentLayer('sorrowgate');
    layer.setLandmarks([ARCH]);
    // No scattered props, so no prop template loads: the landmark alone,
    // admitted beside an empty list as a caller hands them in together.
    layer.rebuild(terrain, () => -999, [], standLandmarks(terrain, [ARCH]));
    const meshes = layer.group.children.filter(
      (child): child is InstancedMesh =>
        child instanceof InstancedMesh && child.name.startsWith(ARCH.slug)
    );
    return { layer, meshes };
  };

  it('in the state its cells give, at the anchor and the literal’s floor, never the drawn ground', async () => {
    primeLandmarkTemplate(
      buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate'),
      'sorrowgate'
    );
    try {
      const terrain = sorrowgate();
      const { layer, meshes } = place(terrain);
      assert.ok(meshes.length > 0 && meshes.length <= SPEC.calls, `${meshes.length} meshes`);
      for (const mesh of meshes) assert.match(mesh.name, /:intact:/);
      const matrix = new Matrix4();
      meshes[0]!.getMatrixAt(0, matrix);
      const at = new Vector3().setFromMatrixPosition(matrix);
      assert.equal(at.x, ARCH.anchorXM);
      assert.equal(at.z, ARCH.anchorYM);
      assert.equal(at.y, depthToWorldY(ARCH.originFloorM), 'the literal floor, not groundY');
      assert.equal(layer.stats().landmarks, 1);
      assert.equal(layer.stats().landmarkTris, SPEC.triBudget.intact);

      collapse(terrain);
      const ruined = place(terrain);
      for (const mesh of ruined.meshes) assert.match(mesh.name, /:ruined:/);
      assert.equal(ruined.layer.stats().landmarkTris, SPEC.triBudget.ruined);
    } finally {
      resetLandmarkModels();
    }
  });

  it('stands what a caller hands in beside its placements, as the baseline detail does', async () => {
    primeLandmarkTemplate(
      buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate'),
      'sorrowgate'
    );
    try {
      const layer = new EnvironmentLayer('sorrowgate');
      const stood = mapPlacements('sorrowgate', 'sorrowgate', [ARCH]);
      assert.ok(stood.placements.length > 0 && stood.landmarks.length === 1);
      // The prop templates are not primed here, so the props wait on their
      // loads; the landmark, primed, stands at once beside them.
      layer.rebuild(sorrowgate(), () => 0, stood.placements, stood.landmarks);
      assert.equal(layer.stats().landmarks, 1);
      assert.equal(layer.stats().landmarkTris, SPEC.triBudget.intact);
    } finally {
      resetLandmarkModels();
    }
  });

  it('stands nothing without the table, and nothing on a map with no row', async () => {
    primeLandmarkTemplate(
      buildLandmarkTemplate(await parseArch(), SPEC, 'sorrowgate'),
      'sorrowgate'
    );
    try {
      const layer = new EnvironmentLayer('sorrowgate');
      layer.rebuild(sorrowgate(), () => 0, []);
      assert.equal(layer.stats().landmarks, 0);
    } finally {
      resetLandmarkModels();
    }
  });
});
