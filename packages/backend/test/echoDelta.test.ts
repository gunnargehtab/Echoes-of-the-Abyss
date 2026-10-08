/**
 * What the delta channel (#433) saves on a real match, and that it never
 * loses anything: every reconstructed snapshot equals the one the server
 * assembled, over a match with hulls moving, fauna in the water, hazards
 * cycling and shots fired.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  Biome,
  Faction,
  SIM,
  UnitKind,
  applyEchoWire,
  encodeEcho,
  wireEqual,
} from '@echoes/shared';
import type { EchoSnapshot, EchoWire } from '@echoes/shared';
import { Match } from '../src/sim/match.ts';
import { VENTFRONT_DIVIDE } from '../src/sim/maps/index.ts';
import { Terrain } from '../src/sim/terrain.ts';
import { spawnUnit } from '../src/sim/world.ts';

const STEP_MS = 1000 / SIM.TICK_HZ;

/**
 * Drive `match` for `ticks`, carrying slot 0's Echo snapshots across the
 * channel the way a live room does, and check every pass on the way.
 *
 * The two ends hold different things, as they do live (#1224). The server
 * diffs against the snapshot object it sent last (`MatchRoom.echoWireFor`);
 * the client keeps what it rebuilt from what crossed the socket (`GameClient`),
 * so each wire message is serialised and parsed here, JSON standing in for the
 * socket's MessagePack, and the client never holds the server's object.
 * Diffing against the client's copy instead hid a server snapshot that changed
 * after it was sent, which left every patch empty of contacts and marks.
 */
function carry(
  match: Match,
  ticks: number,
  onPass: (snapshot: EchoSnapshot) => void = () => {}
): { passes: number; fullBytes: number; wireBytes: number } {
  let seq = 0;
  let sent: EchoSnapshot | null = null;
  let sentJson = '';
  let last: { seq: number; snapshot: EchoSnapshot } | null = null;
  let fullBytes = 0;
  let wireBytes = 0;
  for (let tick = 0; tick < ticks; tick++) {
    const snapshots = match.update(STEP_MS);
    if (snapshots === null) continue;
    const next = snapshots.get(0)!;
    // A snapshot is a value: the pass after it must not have rewritten it.
    if (sent !== null) {
      assert.equal(JSON.stringify(sent), sentJson, `pass ${seq} changed after it was sent`);
    }
    seq++;
    const json = JSON.stringify(encodeEcho(sent, next, seq));
    const got = applyEchoWire(last, JSON.parse(json) as EchoWire);
    assert.ok(got !== null, `pass ${seq} applied`);
    assert.ok(wireEqual(got, next), `pass ${seq} reconstructs the snapshot exactly`);
    fullBytes += JSON.stringify(next).length;
    wireBytes += json.length;
    sent = next;
    sentJson = JSON.stringify(next);
    last = { seq, snapshot: got };
    onPass(next);
  }
  return { passes: seq, fullBytes, wireBytes };
}

describe('the Echo delta on a live match', () => {
  it('reconstructs every snapshot exactly and sends a fraction of the bytes', () => {
    const match = new Match(undefined, { fauna: true, seed: 8 });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Directorate);
    // Two forces sent at each other, so contacts, shots and marks all happen.
    const raiders: number[] = [];
    for (let i = 0; i < 12; i++) {
      raiders.push(
        spawnUnit(match.world, {
          kind: i % 3 === 0 ? UnitKind.Cruiser : UnitKind.Corvette,
          slot: 0,
          faction: Faction.Bathyarch,
          x: 1500 + (i % 4) * 150,
          y: 1500 + Math.floor(i / 4) * 150,
          depth: 600,
        })
      );
      spawnUnit(match.world, {
        kind: UnitKind.Corvette,
        slot: 1,
        faction: Faction.Directorate,
        x: 6000 + (i % 4) * 150,
        y: 6000 + Math.floor(i / 4) * 150,
        depth: 600,
      });
    }
    for (const eid of raiders) match.orderAttackMove(0, eid, 6200, 6200);

    const { passes, fullBytes, wireBytes } = carry(match, 90 * SIM.TICK_HZ);
    assert.ok(passes > 400, `the match ran ${passes} Echo passes`);
    const ratio = wireBytes / fullBytes;
    console.log(
      `echo delta over ${passes} passes: ${(fullBytes / passes).toFixed(0)} B full, ` +
        `${(wireBytes / passes).toFixed(0)} B on the wire — ${(ratio * 100).toFixed(0)}%`
    );
    assert.ok(
      ratio < 0.5,
      `the wire should carry under half the bytes, got ${(ratio * 100).toFixed(0)}%`
    );
  });

  /**
   * #1224's second half. A ping in the Fields returns phantoms, and the layer
   * keeps a phantom's contact and rewrites it in place each pass, so a
   * snapshot that held the entry rather than a copy would change after it was
   * sent. A client would then see the phantoms hold still while the true
   * returns moved: the "equality test over two snapshots" docs/systems-echo.md
   * §3 says must not separate them.
   */
  it('carries a phantom as it carries a true return', () => {
    const terrain = new Terrain(8000, 8000, 250);
    terrain.fillRect(0, 0, 8000, 8000, Biome.ResonanceField);
    const match = new Match(VENTFRONT_DIVIDE, { fauna: false, seed: 31, terrain });
    match.addPlayer(0, Faction.Bathyarch);
    match.addPlayer(1, Faction.Pelagia);
    const pinger = spawnUnit(match.world, {
      kind: UnitKind.Corvette,
      slot: 0,
      faction: Faction.Bathyarch,
      x: 4000,
      y: 4000,
    });
    spawnUnit(match.world, {
      kind: UnitKind.Cruiser,
      slot: 1,
      faction: Faction.Pelagia,
      x: 4700,
      y: 4000,
    });
    match.activeSonar(0, pinger);

    let phantomPasses = 0;
    carry(match, 3 * SIM.TICK_HZ, (snapshot) => {
      const phantom = snapshot.contacts.some(
        (contact) => match.echo.entityForHandle(0, contact.id) === undefined
      );
      if (phantom) phantomPasses++;
    });
    // More than the keyframe: a phantom present on a later pass is one a patch
    // carried, which is what the array-only copy loses.
    assert.ok(phantomPasses > 1, 'the premise: a patch carried a phantom');
  });
});
