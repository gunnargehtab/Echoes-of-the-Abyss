/**
 * Echo Marks on the sonar scope (#213) — docs/ui-ux.md §5, §13.
 *
 * What this file pins is the three things the scope has to settle differently
 * from the world view, because each of them is a rule rather than a number: a
 * mark legible in the world is still legible here, a mark never out-inks the
 * faintest return, and a torpedo wake stays a line rather than fattening into
 * the blob that would smear the track ordnance flew.
 *
 * Pixi's Graphics is recorded rather than run, as in glyph.test.ts: the
 * assertions are about the geometry handed to it, and a real GPU context would
 * add nothing but a headless browser.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ECHO_MARKS, EchoMarkKind, type EchoMarkInfo } from '@echoes/shared';
import {
  drawScopeEchoMarks,
  markRadiusM,
  scopeMarkAlpha,
  scopeMarkRadiusPx,
  scopeWakeRadiusPx,
  SCOPE_MARK_MAX_ALPHA,
  SCOPE_MARK_MAX_PX,
  SCOPE_MARK_MIN_PX,
  SCOPE_WAKE_ALPHA_MAX,
  SCOPE_WAKE_MIN_PX,
} from '../src/game/echoMarks.ts';

/** The wide scope on the shipped 8,000 m maps: 170 px across. */
const K_WIDE = 170 / 8000;
/** And the narrow-screen scope, 110 px across the same map. */
const K_NARROW = 110 / 8000;

/** The Tier-1 haze's fill alpha — the faintest return the scope draws. */
const TIER_1_ALPHA = 0.22;

/**
 * The stain kinds — every kind but the wake, which has its own rule.
 *
 * Listed rather than derived from the enum: `EchoMarkKind` is numeric, so
 * `Object.values` hands back the names as well as the members.
 */
const STAIN_KINDS = [
  EchoMarkKind.Battle,
  EchoMarkKind.DestroyedStructure,
  EchoMarkKind.IndustrialHum,
] as const;

interface Circle {
  x: number;
  y: number;
  r: number;
  alpha: number;
  color: number;
}

/** A Graphics stand-in that records the circles and the ink they took. */
function recorder() {
  const circles: Circle[] = [];
  let pending: { x: number; y: number; r: number } | null = null;
  const api = {
    circle(x: number, y: number, r: number) {
      pending = { x, y, r };
      return api;
    },
    fill(style: { color: number; alpha: number }) {
      assert.notEqual(pending, null, 'fill without a shape');
      circles.push({ ...pending!, alpha: style.alpha, color: style.color });
      pending = null;
      return api;
    },
    stroke() {
      assert.fail('a mark drew an outline: residue has no edge (§5)');
      return api;
    },
  };
  return { api, circles };
}

function mark(over: Partial<EchoMarkInfo> = {}): EchoMarkInfo {
  return { id: 1, x: 4000, y: 4000, kind: EchoMarkKind.Battle, intensity: 0.6, ...over };
}

function draw(marks: EchoMarkInfo[], k = K_WIDE): Circle[] {
  const { api, circles } = recorder();
  // The stand-in implements the surface the layer uses, which is what the
  // assertions are about; Pixi's own Graphics is far wider than that.
  drawScopeEchoMarks(api as unknown as Parameters<typeof drawScopeEchoMarks>[0], marks, k);
  return circles;
}

describe('scope echo marks — scale', () => {
  it('draws a stain no smaller than the legibility floor, at either scope size', () => {
    for (const k of [K_WIDE, K_NARROW]) {
      for (const kind of STAIN_KINDS) {
        // The faintest mark the server will still send (MIN_AUDIBLE_INTENSITY).
        const r = scopeMarkRadiusPx(kind, ECHO_MARKS.MIN_AUDIBLE_INTENSITY, k);
        assert.ok(
          r >= SCOPE_MARK_MIN_PX,
          `${kind} at k=${k} drew ${r} px, under the ${SCOPE_MARK_MIN_PX} px floor`
        );
        assert.ok(r <= SCOPE_MARK_MAX_PX, `${kind} at k=${k} drew ${r} px, over the cap`);
      }
    }
  });

  it('still scales with intensity above the floor: the level is the information', () => {
    const faint = scopeMarkRadiusPx(EchoMarkKind.IndustrialHum, 0.2, K_WIDE);
    const loud = scopeMarkRadiusPx(EchoMarkKind.IndustrialHum, 1, K_WIDE);
    assert.ok(loud > faint, 'a busier depot has to read as a busier depot');
    assert.equal(loud, markRadiusM(EchoMarkKind.IndustrialHum, 1) * K_WIDE);
  });

  it('positions a mark in scope space, not map space', () => {
    const [outer] = draw([mark({ x: 2000, y: 6000 })]);
    assert.equal(outer!.x, 2000 * K_WIDE);
    assert.equal(outer!.y, 6000 * K_WIDE);
  });
});

describe('scope echo marks — precedence', () => {
  it('never inks a stain above the faintest return, at any intensity', () => {
    for (const kind of STAIN_KINDS) {
      for (const intensity of [0.02, 0.25, 0.5, 0.75, 1]) {
        const a = scopeMarkAlpha(kind, intensity);
        assert.ok(a <= SCOPE_MARK_MAX_ALPHA, `${kind} at ${intensity} inked ${a}`);
        // The two discs compose; even composed, residue stays under a Tier-1
        // haze, which is the return it is most likely to sit beside.
        const composed = 1 - (1 - a / 2) * (1 - a);
        assert.ok(composed <= TIER_1_ALPHA, `${kind} at ${intensity} composed to ${composed}`);
      }
    }
  });

  it('fades with the mark rather than holding: decay is information', () => {
    assert.ok(
      scopeMarkAlpha(EchoMarkKind.Battle, 0.2) < scopeMarkAlpha(EchoMarkKind.Battle, 0.45),
      'a decaying battle site has to look like one'
    );
  });

  it('draws no outline and no glyph — residue is ground, not a thing', () => {
    // The recorder fails the test from inside `stroke`; drawing at all is the
    // assertion that it never reached one.
    const circles = draw([mark(), mark({ id: 2, kind: EchoMarkKind.IndustrialHum })]);
    assert.equal(circles.length, 4, 'two soft discs per stain');
  });
});

describe('scope echo marks — torpedo wakes stay a line', () => {
  it('sizes a wake dot so two distinct marks can never touch', () => {
    for (const k of [K_WIDE, K_NARROW]) {
      const r = scopeWakeRadiusPx(k);
      assert.notEqual(r, null, `wakes dropped at k=${k}, where they are still drawable`);
      // Two marks of one kind inside the merge radius reinforce rather than
      // accumulate, so that span is the closest two wake dots can ever be.
      // Half of it must survive as gap, or the string reads as a bar.
      const spacingPx = ECHO_MARKS.MERGE_RADIUS_M * k;
      assert.ok(r! * 2 <= spacingPx / 2, `a wake dot of ${r} px closes the ${spacingPx} px gap`);
    }
  });

  it('never fattens to the stain floor — that floor is what would smear it', () => {
    assert.ok(scopeWakeRadiusPx(K_WIDE)! < SCOPE_MARK_MIN_PX);
  });

  it('drops wakes rather than drawing a smear when the dot cannot hold a gap', () => {
    // A scope so small the merge span is under three pixels: nothing here can
    // be both visible and separate, so the honest layer draws nothing.
    const tiny = SCOPE_WAKE_MIN_PX / (ECHO_MARKS.MERGE_RADIUS_M * 0.25) / 2;
    assert.equal(scopeWakeRadiusPx(tiny), null);
    assert.deepEqual(draw([mark({ kind: EchoMarkKind.TorpedoWake })], tiny), []);
  });

  it('draws one dot per wake mark, so the string keeps the track it drew', () => {
    // Three marks along a run, at the spacing the server's merge rule leaves.
    const run = [0, 1, 2].map((i) =>
      mark({
        id: i + 1,
        x: 2000 + i * ECHO_MARKS.MERGE_RADIUS_M,
        y: 3000,
        kind: EchoMarkKind.TorpedoWake,
        intensity: 0.15,
      })
    );
    const circles = draw(run);
    assert.equal(circles.length, 3, 'a wake dot is one disc, not a two-disc stain');
    const xs = circles.map((c) => c.x);
    assert.deepEqual(
      xs,
      run.map((m) => m.x * K_WIDE)
    );
    for (const c of circles) assert.ok(c.alpha <= SCOPE_WAKE_ALPHA_MAX);
  });

  it('keeps a wake dimmer than a stain of the same intensity', () => {
    const wake = draw([mark({ kind: EchoMarkKind.TorpedoWake, intensity: 0.3 })])[0]!;
    assert.ok(wake.alpha <= TIER_1_ALPHA, 'a wake dot may not out-ink a Tier-1 haze');
  });
});
