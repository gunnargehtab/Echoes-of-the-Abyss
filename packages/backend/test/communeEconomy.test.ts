/**
 * The Commune's quiet economy (#570) — docs/economy.md §6.
 *
 * §6 opens their section with two numbers, and the simulation has never had
 * either of them:
 *
 *   Most efficient, least defensible. **Harvest SIG 18** where others sit at
 *   50, and **organic refineries that run at 30–40** instead of 55–75.
 *
 * Everything else about the Commune was built — the kelp they move freely
 * through, the bloom-share anchored to the most exposed ground on the map,
 * the bed it is now paid out of (#568) — while the one figure that makes them
 * *the quiet navy while working* was the roster's, the same as anybody's. A
 * Commune player extracting nodules sounded exactly like a Consortium one,
 * which deletes the doctrine at the only place a player would ever hear it.
 *
 * So what is pinned here is the pair of figures and the shape around them:
 * the throttle stays a ladder rather than collapsing into one number, the
 * rock's own premium is not scaled with the gear, and nobody else's economy
 * moves at all.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  COMMUNE_ECONOMY,
  Faction,
  HARVEST_THROTTLE,
  HarvestThrottle,
  ResourceKind,
  SIM,
  StructureKind,
  UnitKind,
  harvestSigFor,
  structureSigFor,
  structureStatsFor,
} from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { Acoustic, Harvester, HarvestMode } from '../src/sim/components.ts';
import { spawnStructure } from '../src/sim/world.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;
const X = 4000;
const Y = 4000;

/** The other three navies, for every "and nobody else moves" claim. */
const EVERYONE_ELSE = [Faction.Bathyarch, Faction.Directorate, Faction.Hadron];

/**
 * A hull actually working a node, as the acoustics pass sees one.
 *
 * The starting force's own harvester, driven by the harvest system rather
 * than posed: `Harvester.mode` is that system's to own, and a mode poked in
 * from outside is overwritten within the tick — the same lesson the flora
 * suite learned about `environmentalDeaths`. So the match is stepped until
 * the hauler is cutting and the sample is taken on that tick.
 *
 * On that tick and not averaged over a round trip, because what is under test
 * is the loudness of *cutting*. Averaging is exactly the effect
 * docs/economy.md §3's own measured table records, and it is the one thing
 * that would hide this figure.
 */
function cutting(faction: Faction, throttle = HarvestThrottle.Standard): number {
  const m = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 51 });
  m.addPlayer(0, faction);
  let harvester = 0;
  for (let i = 0; i < 120 * SIM.TICK_HZ; i++) {
    const snapshots = m.update(STEP_MS);
    if (harvester === 0) {
      const own = snapshots?.get(0)?.units.find((u) => u.kind === UnitKind.Harvester);
      if (own !== undefined) {
        harvester = own.id;
        m.setThrottle(0, harvester, throttle);
      }
      continue;
    }
    if (Harvester.mode[harvester] === HarvestMode.Mining) return Acoustic.sig[harvester]!;
  }
  assert.fail('the hauler never got to work');
}

/** A commissioned refinery's sustained figure. */
function refinery(faction: Faction): number {
  const m = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 51 });
  const eid = spawnStructure(m.world, {
    kind: StructureKind.Refinery,
    slot: 0,
    faction,
    x: X,
    y: Y,
    prebuilt: true,
  });
  m.update(STEP_MS);
  return Acoustic.sig[eid]!;
}

describe('a Commune hull works at the figure the doc gives them', () => {
  it('cuts nodules at 18 where everybody else is at the throttle', () => {
    // The Harvester's own idle figure is also 18, so this case alone could
    // pass on a bug that ignored the mining branch entirely. What rules that
    // out is the ladder below — a Commune hull at Trickle is 10, which is
    // nobody's idle — and the 45 the other three still read here.
    assert.equal(cutting(Faction.Pelagia), COMMUNE_ECONOMY.HARVEST_SIG);
    for (const faction of EVERYONE_ELSE) {
      assert.equal(
        cutting(faction),
        HARVEST_THROTTLE[HarvestThrottle.Standard].sig,
        `${Faction[faction]} still works at the roster's figure`
      );
    }
    // And not merely the hull's idle figure by coincidence: a Commune hauler
    // at Trickle is 10, which is nobody's idle and nobody's throttle.
    assert.equal(
      cutting(Faction.Pelagia, HarvestThrottle.Trickle),
      HARVEST_THROTTLE[HarvestThrottle.Trickle].sig *
        (COMMUNE_ECONOMY.HARVEST_SIG / HARVEST_THROTTLE[HarvestThrottle.Standard].sig)
    );
  });

  it('is the number mission-tend teaches by feel', () => {
    // docs/mission-tend.md §3: "18 is the Commune's whole economic identity in
    // one number — the figure everyone else harvests at fifty against". The
    // mission authored it as a scripted lift's loudness because the sim had
    // no way to produce it; a Commune harvester now produces it on its own.
    assert.equal(COMMUNE_ECONOMY.HARVEST_SIG, 18);
    assert.ok(
      HARVEST_THROTTLE[HarvestThrottle.Standard].sig >= 40 &&
        HARVEST_THROTTLE[HarvestThrottle.Standard].sig <= 50,
      "and everyone else is inside §3's Standard band"
    );
  });

  it('keeps the throttle a ladder rather than one flat number', () => {
    // The whole curve moves down; it does not collapse. §3's decision surface
    // has to survive the doctrine, or a Commune player has a lever with no
    // effect and Trickle becomes a strictly worse Standard.
    //
    // Through the rule rather than through four more three-minute matches:
    // the case above is what proves the rule is the one acoustics reads.
    const ladder = [
      HarvestThrottle.Idle,
      HarvestThrottle.Trickle,
      HarvestThrottle.Standard,
      HarvestThrottle.Overburden,
    ];
    for (let i = 1; i < ladder.length; i++) {
      const quieter = harvestSigFor(Faction.Pelagia, ladder[i - 1]!, ResourceKind.Nodule);
      const louder = harvestSigFor(Faction.Pelagia, ladder[i]!, ResourceKind.Nodule);
      assert.ok(
        louder > quieter,
        `${HarvestThrottle[ladder[i]!]} must still cost more noise than ${HarvestThrottle[ladder[i - 1]!]}: ${louder} against ${quieter}`
      );
    }
  });

  it('does not make the rock quieter, only the gear', () => {
    // `miningSigPremium` is crystal coming apart, and rock does not care whose
    // dredge is on it. So a Commune hull cutting crystal at Standard is
    // 18 + 20, not a quieter 26 — and the premium costs them what it costs
    // anybody, which is what keeps crystal a commitment for every navy.
    const premiumFor = (faction: Faction): number =>
      harvestSigFor(faction, HarvestThrottle.Standard, ResourceKind.ResonanceCrystal) -
      harvestSigFor(faction, HarvestThrottle.Standard, ResourceKind.Nodule);
    assert.ok(premiumFor(Faction.Pelagia) > 0, 'crystal costs something to cut');
    for (const faction of EVERYONE_ELSE) {
      assert.equal(
        premiumFor(Faction.Pelagia),
        premiumFor(faction),
        `the rock costs the Commune what it costs ${Faction[faction]}`
      );
    }
  });
});

describe('and their refinery hums instead of broadcasting', () => {
  it('sits in the doc’s 30–40 band where the roster sits at 65', () => {
    const ours = refinery(Faction.Pelagia);
    assert.ok(ours >= 30 && ours <= 40, `§6's organic refinery band: ${ours}`);
    for (const faction of EVERYONE_ELSE) {
      assert.equal(
        refinery(faction),
        structureStatsFor(StructureKind.Refinery).sigIdle,
        `${faction} keeps the loudest permanent thing they own`
      );
    }
  });

  it('is quiet in both states, because a refinery hums forever', () => {
    // docs/economy.md §4: the Refinery is 65 idle *and* active — "loud whether
    // or not a harvester is docked; that is its identity". So the Commune's
    // figure is one number too, and neither state is the roster's.
    const stats = structureStatsFor(StructureKind.Refinery);
    assert.equal(stats.sigIdle, stats.sigActive, 'the roster refinery has one figure');
    for (const active of [false, true]) {
      assert.equal(
        structureSigFor(Faction.Pelagia, StructureKind.Refinery, active),
        COMMUNE_ECONOMY.REFINERY_SIG
      );
    }
  });

  it('bends exactly one row of a faction-blind roster', () => {
    // The doctrine is carried by the rate, never by a special case
    // (docs/units.md design notes) — and §6 names the refinery and nothing
    // else. A general "Commune buildings are quieter" rule would be a
    // doctrine change wearing a transcription's clothes.
    for (const kind of Object.values(StructureKind).filter(
      (k): k is StructureKind => typeof k === 'number' && k !== StructureKind.Refinery
    )) {
      const stats = structureStatsFor(kind);
      assert.equal(structureSigFor(Faction.Pelagia, kind, false), stats.sigIdle);
      assert.equal(structureSigFor(Faction.Pelagia, kind, true), stats.sigActive);
    }
  });
});

describe('the rule lives in one place', () => {
  it('derives the Commune ratio from the throttle it is anchored to', () => {
    // Not a stored multiplier: the balance CLI can `--set
    // HARVEST_THROTTLE.Standard.sig`, and a cached ratio would quietly stop
    // meaning "the Commune's 18".
    const standard = HARVEST_THROTTLE[HarvestThrottle.Standard];
    const before = standard.sig;
    try {
      standard.sig = before * 2;
      assert.equal(
        harvestSigFor(Faction.Pelagia, HarvestThrottle.Standard, ResourceKind.Nodule),
        COMMUNE_ECONOMY.HARVEST_SIG,
        'retuning the Standard throttle must not move the Commune off their figure'
      );
    } finally {
      standard.sig = before;
    }
  });
});
