/**
 * Rank chevrons (#1785) — docs/systems-progression.md §3, docs/ui-ux.md §4.
 *
 * §3: rank is "chevrons beside the health bar the world view already carries"
 * for the owner, and Tier 4 information for an enemy. The pure half is the
 * shape: one to three, pointing up, off the bar's right end. The renderer half
 * boots the real chart over the canned match and holds what it drew: chevrons
 * on a *whole* own veteran, whose bar is not drawn, and on a Track contact the
 * server told the rank of — and none on either at rank 0, the control.
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import type { Graphics } from 'pixi.js';
import { Faction } from '@echoes/shared';
import {
  createHost,
  HeadlessApplication,
  HeadlessWebGLRenderer,
  pumpAnimationFrames,
} from './support/headless.ts';
import { cannedMap, cannedNodes, cannedSnapshot, cannedTerrain } from './support/cannedMatch.ts';
import { EchoRenderer, type RendererCallbacks } from '../src/game/EchoRenderer.ts';
import { PerspectiveView } from '../src/game/PerspectiveView.ts';
import { RANK_CHEVRON_PX, rankChevrons } from '../src/game/rankChevrons.ts';

describe('the chevrons’ shape', () => {
  it('draws one to three, and nothing for a rank the server never sends', () => {
    for (const rank of [undefined, 0, 4, 1.5, -1]) {
      assert.deepEqual(rankChevrons(rank, 10, 0, 1), [], `rank ${rank}`);
    }
    for (const rank of [1, 2, 3]) assert.equal(rankChevrons(rank, 10, 0, 1).length, rank);
  });

  it('points each one up, off the bar’s right end, stacked about the bar’s line', () => {
    const scale = 0.5;
    const chevrons = rankChevrons(3, 10, 20, scale);
    for (const [x0, y0, x1, y1, x2, y2] of chevrons) {
      assert.ok(x0 > 10, 'clear of the bar');
      assert.equal(x0, 10 + RANK_CHEVRON_PX.gap * scale);
      assert.ok(y1 < y0 && y1 < y2, 'the peak is above both feet');
      assert.equal(x1, (x0 + x2) / 2, 'symmetric');
    }
    const top = chevrons[0]![3];
    const bottom = chevrons[2]![1];
    assert.ok(Math.abs((top + bottom) / 2 - 20) < 1e-9, 'centred on the bar');
  });
});

const views: PerspectiveView[] = [];
const charts: EchoRenderer[] = [];
afterEach(() => {
  for (const chart of charts.splice(0)) chart.destroy();
  for (const view of views.splice(0)) view.destroy();
});

const OWN = 12;
const TRACK = 104;

/**
 * Boot the chart over the canned match, with the own Light Scout whole and the
 * Track contact as given, and return both symbols as drawn.
 */
async function drawn(own: number | undefined, track: number | undefined) {
  const gl = new HeadlessWebGLRenderer();
  const app = new HeadlessApplication();
  const conn = new PerspectiveView();
  views.push(conn);
  conn.mount(
    createHost(1280, 720) as unknown as HTMLElement,
    () => gl.asRenderer(),
    gl.environment
  );
  conn.setActive(true);
  const callbacks = new Proxy({} as RendererCallbacks, { get: () => () => undefined });
  const chart = new EchoRenderer(callbacks, app.asApplication());
  charts.push(chart);
  await chart.init(createHost(1280, 720) as unknown as HTMLElement);
  chart.setConn(conn);
  const terrain = cannedTerrain();
  chart.setTerrain(terrain);
  conn.setTerrain(terrain);
  chart.setMap(cannedMap());
  chart.setNodes(cannedNodes());
  chart.setIdentity(0, Faction.Bathyarch);
  conn.setIdentity(0, Faction.Bathyarch);

  const snapshot = cannedSnapshot();
  snapshot.units = snapshot.units.map((u) =>
    u.id === OWN ? { ...u, hp: u.maxHp, ...(own === undefined ? {} : { rank: own }) } : u
  );
  snapshot.contacts = snapshot.contacts.map((c) =>
    c.id === TRACK && track !== undefined ? { ...c, rank: track } : c
  );
  chart.applySnapshot(snapshot);
  conn.applySnapshot(snapshot);
  for (let i = 0; i < 3; i++) {
    pumpAnimationFrames();
    app.frame();
  }
  // Read from the pools' own maps: `acquire` would clear what was drawn.
  type Pool = { held: Map<number, Graphics> };
  const pools = chart as unknown as { unitSymbols: Pool; contactSymbols: Pool };
  const ownSymbol = pools.unitSymbols.held.get(OWN);
  const trackSymbol = pools.contactSymbols.held.get(TRACK);
  assert.ok(ownSymbol?.visible, 'the premise: the own hull is on screen');
  assert.ok(trackSymbol?.visible, 'the premise: the Track contact is on screen');
  return { own: chevronsIn(ownSymbol), track: chevronsIn(trackSymbol) };
}

/**
 * The chevrons a symbol stroked: every three-point polyline, peak up, in a
 * stroke made of nothing but such polylines. Nothing else the world view
 * draws about a hull is one — the rings are circles and the bars are rects.
 */
function chevronsIn(g: Graphics): number {
  let found = 0;
  for (const instruction of g.context.instructions) {
    if (instruction.action !== 'stroke') continue;
    const path = (instruction.data as { path?: { instructions: unknown[] } }).path;
    const steps = (path?.instructions ?? []) as Array<{ action: string; data: number[] }>;
    if (steps.length === 0 || steps.length % 3 !== 0) continue;
    let chevrons = 0;
    for (let i = 0; i < steps.length; i += 3) {
      const [a, b, c] = [steps[i]!, steps[i + 1]!, steps[i + 2]!];
      if (a.action !== 'moveTo' || b.action !== 'lineTo' || c.action !== 'lineTo') {
        chevrons = 0;
        break;
      }
      if (b.data[1]! < a.data[1]! && b.data[1]! < c.data[1]!) chevrons++;
    }
    found += chevrons;
  }
  return found;
}

describe('the chevrons in the world view', () => {
  it('draws a whole own veteran’s rank, with no bar to sit beside', async () => {
    const ranked = await drawn(2, undefined);
    const control = await drawn(undefined, undefined);
    assert.equal(control.own, 0, 'a rank-0 hull wears none');
    assert.equal(ranked.own, 2, 'two chevrons for rank 2, the bar unshown');
  });

  it('draws an enemy’s rank only where the server told it, at Track', async () => {
    const told = await drawn(undefined, 3);
    const untold = await drawn(undefined, undefined);
    assert.equal(untold.track, 0, 'no field, no chevrons: the client infers nothing');
    assert.equal(told.track, 3, 'three for a rank-3 Track contact');
  });
});
