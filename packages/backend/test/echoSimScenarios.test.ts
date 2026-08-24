/**
 * Echo-sim combat scenarios (#169) — docs/systems-combat.md §1 and §5.
 *
 * `tools/echo-sim` is the designer-facing harness: it answers "at what range
 * does a listener resolve this emitter" using the shipping propagation model,
 * so a tuning conclusion drawn there transfers to the game. Its scenarios ship
 * with `.expected.json` fixtures — and until now **nothing checked them**. A
 * fixture that silently went stale after a tuning change is worse than no
 * fixture, because it looks like a measurement and is a memory.
 *
 * So this file does two jobs:
 *
 *   1. re-runs each committed scenario through `@echoes/shared` and asserts the
 *      fixture still matches, which is drift detection for the tool;
 *   2. reads the combat claims *out of* those numbers — the propositions §1 and
 *      §5 make, stated as ranges rather than as intentions.
 *
 * The harness itself is CommonJS and not a workspace, so rather than reach
 * across the module boundary this recomputes with the same shared functions the
 * tool calls. If those two ever disagree the tool has grown physics of its own,
 * which its own header forbids.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ResolutionTier, detectionRatio, resolveTier } from '@echoes/shared';

interface Detection {
  distance: number;
  tier: number;
  tierName: string;
  ratio: number;
}
interface Run {
  name: string;
  sig: number;
  hyd: number;
  detections: Detection[];
}
interface Fixture {
  name: string;
  pf: number;
  hyd: number;
  runs: Run[];
}

function fixture(name: string): Fixture {
  const path = fileURLToPath(
    new URL(`../../../tools/echo-sim/scenarios/${name}.expected.json`, import.meta.url)
  );
  return JSON.parse(readFileSync(path, 'utf8')) as Fixture;
}

const SCENARIOS = ['simple-scenario', 'combat-ordnance', 'combat-torpedo-run'];

describe('echo-sim scenarios', () => {
  it('every committed fixture still matches the shipping model', () => {
    for (const name of SCENARIOS) {
      const expected = fixture(name);
      for (const run of expected.runs) {
        for (const row of run.detections) {
          assert.equal(
            resolveTier(run.sig, expected.pf, row.distance, run.hyd),
            row.tier,
            `${name}: ${run.name} at ${row.distance} m resolved differently than the fixture says`
          );
          assert.equal(
            Number(detectionRatio(run.sig, expected.pf, row.distance, run.hyd).toFixed(3)),
            row.ratio,
            `${name}: ${run.name} at ${row.distance} m — ratio drifted from the fixture`
          );
        }
      }
    }
  });

  it('a torpedo is audible across its whole run to any real listener', () => {
    // §1's second rule, read out of the sweep. The claim is scoped to the
    // *baseline* ear (HYD 50) and above, which is every combat hull in the
    // roster — and the sweep shows a comfortable Bearing at the far end of a
    // 3,200 m run rather than a marginal smudge.
    //
    // The Harvester is deliberately excluded, and its absence is the point
    // rather than a gap. At HYD 30 it is the only hull that cannot hear a
    // torpedo crossing the map at all, which is the same deafness that stops it
    // reading Echo Marks (docs/units.md: "a harvester cannot even read the
    // residue of a fight, so escorting the economy is a real job"). An unescorted
    // harvester genuinely does not hear what is coming for it.
    const sweep = fixture('combat-torpedo-run');
    let checked = 0;
    for (const run of sweep.runs) {
      const farthest = run.detections[run.detections.length - 1]!;
      assert.equal(farthest.distance, 3200, 'the sweep should reach the end of the run');
      if (run.hyd < 50) {
        assert.equal(
          farthest.tier,
          ResolutionTier.Silent,
          'the Harvester is supposed to be the hull that cannot hear this'
        );
        continue;
      }
      assert.ok(
        farthest.tier >= ResolutionTier.Bearing,
        `${run.name} should still hold a bearing at the end of a torpedo's run`
      );
      checked++;
    }
    assert.ok(checked >= 4, 'the sweep should cover every combat hull in the roster');
  });

  it('a decoy out-shouts the loudest hull it could be protecting', () => {
    // §5: a noisemaker works by being louder than the hull, which is what makes
    // a re-acquiring seeker take it. Read here as detection range rather than
    // as a raw SIG comparison, because "louder" in this game means "louder
    // where the listener is standing".
    const ordnance = fixture('combat-ordnance');
    const decoy = ordnance.runs.find((r) => r.name.startsWith('Noisemaker'))!;
    const cruiser = ordnance.runs.find((r) => r.name.startsWith('Cruiser at cruise'))!;

    for (let i = 0; i < decoy.detections.length; i++) {
      assert.ok(
        decoy.detections[i]!.ratio > cruiser.detections[i]!.ratio,
        `at ${decoy.detections[i]!.distance} m the decoy must read louder than the Cruiser`
      );
    }
  });

  it('an armed mine is quiet but not silent, and a detonation is neither', () => {
    // The sweep is what corrected §6 here. The doc used to say an armed mine was
    // "passively invisible in practice"; it is not, and what it actually does is
    // better. A mine reads as a smudge from about 400 m and classifies from
    // about 290 m — both outside its own 150 m trigger — so a commander creeping
    // forward can find a field and route around it, while a push at speed walks
    // into it. That is exactly the discrimination §2 asks mines to make.
    //
    // What must hold is the other end: a field never announces itself at map
    // scale, or active sonar's minesweeping job disappears.
    const ordnance = fixture('combat-ordnance');
    const armed = ordnance.runs.find((r) => r.name === 'Mine (armed)')!;
    const detonating = ordnance.runs.find((r) => r.name === 'Mine (detonating)')!;

    for (const row of armed.detections) {
      if (row.distance < 500) continue;
      assert.equal(
        row.tier,
        ResolutionTier.Silent,
        `an armed mine must be silent at ${row.distance} m — a field that carried across the ` +
          `map would make a ping's 900 m sweep pointless`
      );
    }

    // ...and it is the quietest thing in the sweep at every range, which is the
    // half of "quiet, not silent" that still has to be true.
    for (const run of ordnance.runs) {
      if (run.name === 'Mine (armed)') continue;
      for (let i = 0; i < armed.detections.length; i++) {
        assert.ok(
          armed.detections[i]!.ratio < run.detections[i]!.ratio,
          `an armed mine should read quieter than ${run.name} at every range`
        );
      }
    }

    assert.ok(
      detonating.detections[detonating.detections.length - 1]!.tier >= ResolutionTier.Contact,
      'and a detonation should carry to the far end of the sweep'
    );
  });
});
