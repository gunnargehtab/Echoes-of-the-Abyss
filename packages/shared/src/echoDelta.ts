/**
 * Delta encoding for the Echo snapshot (#433).
 *
 * Every `EchoSnapshot` used to cross the wire whole, five times a second per
 * player: the full own-unit list, every structure and shot, every contact,
 * every hazard, the whole Drift Health grid, every shoal and jelly, every
 * mark. The terrain channel already had the right shape — a revision cursor
 * and only the cells the client has not seen — and this is the same idea for
 * the snapshot.
 *
 * A WebSocket delivers messages whole and in order, so the previous message
 * *is* the client's state and no acknowledgement is needed: the server keeps
 * the last snapshot it sent each client and sends the difference to the next.
 * The first message to a client is whole, so is every KEYFRAME_EVERY-th, and
 * so is any the server cannot relate to a previous one (a fresh seat, a
 * reconnection). A client that receives a patch it cannot apply — a sequence
 * gap, which can only be a bug — waits for the next keyframe rather than
 * guessing.
 *
 * The difference is taken at two grains. Collections keyed by id (units,
 * structures, shots, contacts, marks, hazards, shoals, jellies) send only the
 * entries that changed, and of those only the fields that changed, plus the
 * ids that left; their order is sent whole only when an entry came or went,
 * because the server's order is part of the contract (own lists ascend by
 * id, and the client keeps them that way). Scalars and small objects are sent
 * when they differ. Self events are per-tick and always sent whole. Drift
 * Health is sent as the regions that moved.
 *
 * Nothing here decides *what* a client may know: the delta of a snapshot the
 * observer would have been sent whole carries exactly what that snapshot
 * did, and a client reconstructs the identical object. `applyEchoPatch`
 * returns a fresh snapshot with fresh entry objects, never mutating the
 * previous one — the renderer keeps the last two snapshots' units to glide
 * between, and an entry rewritten in place would move the past.
 */

import type {
  BerthReport,
  Contact,
  DrawReport,
  EchoMarkInfo,
  EchoSnapshot,
  ExposureReport,
  HazardState,
  JellyCluster,
  OwnOrdnance,
  OwnStructure,
  OwnUnit,
  SelfEvent,
  ShoalTell,
} from './types.js';

/** Snapshots between whole resends. Ten seconds at ECHO_HZ 5: insurance, not correctness. */
export const KEYFRAME_EVERY = 50;

/**
 * Field-level change to one entry. `id` is always present; every other key
 * is a field whose value differs, with `null` standing for "the field is
 * gone" — no wire field is ever legitimately null, so the encoding is
 * unambiguous.
 */
export type EntryPatch<T extends { id: number }> = { id: number } & {
  [K in keyof T]?: T[K] | null;
};

export interface CollectionPatch<T extends { id: number }> {
  /** Entries that are new, or whose fields changed (changed fields only). */
  set?: EntryPatch<T>[];
  /** Ids that left. */
  del?: number[];
  /** The whole id order, sent only when an entry came or went. */
  order?: number[];
}

export interface EchoPatch {
  kind: 'patch';
  /** The message sequence; the client applies `seq` only onto `seq - 1`. */
  seq: number;
  tick: number;
  units?: CollectionPatch<OwnUnit>;
  structures?: CollectionPatch<OwnStructure>;
  ordnance?: CollectionPatch<OwnOrdnance>;
  contacts?: CollectionPatch<Contact>;
  marks?: CollectionPatch<EchoMarkInfo>;
  hazards?: CollectionPatch<HazardState>;
  shoals?: CollectionPatch<ShoalTell>;
  jellies?: CollectionPatch<JellyCluster>;
  peakSig?: number;
  nodules?: number;
  crystal?: number;
  biomass?: number;
  berths?: BerthReport;
  exposure?: ExposureReport;
  draw?: DrawReport;
  /** [index, value] pairs for the regions that moved. */
  driftHealth?: number[];
  selfEvents: SelfEvent[];
}

export interface EchoKeyframe {
  kind: 'full';
  seq: number;
  snapshot: EchoSnapshot;
}

export type EchoWire = EchoKeyframe | EchoPatch;

type Keyed = { id: number };

/** Deep equality over plain wire data: primitives, arrays and plain objects. */
export function wireEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const other = b as unknown[];
    if (a.length !== other.length) return false;
    for (let i = 0; i < a.length; i++) if (!wireEqual(a[i], other[i])) return false;
    return true;
  }
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  for (const key in ra) {
    if (ra[key] === undefined) continue;
    if (!wireEqual(ra[key], rb[key])) return false;
  }
  for (const key in rb) {
    if (rb[key] !== undefined && ra[key] === undefined) return false;
  }
  return true;
}

function diffEntry<T extends Keyed>(prev: T, next: T): EntryPatch<T> | null {
  let patch: EntryPatch<T> | null = null;
  const p = prev as Record<string, unknown>;
  const n = next as Record<string, unknown>;
  for (const key in n) {
    if (key === 'id' || n[key] === undefined) continue;
    if (!wireEqual(p[key], n[key])) {
      patch ??= { id: next.id } as EntryPatch<T>;
      (patch as Record<string, unknown>)[key] = n[key];
    }
  }
  for (const key in p) {
    if (key === 'id' || p[key] === undefined || n[key] !== undefined) continue;
    patch ??= { id: next.id } as EntryPatch<T>;
    (patch as Record<string, unknown>)[key] = null;
  }
  return patch;
}

function diffCollection<T extends Keyed>(
  prev: readonly T[],
  next: readonly T[]
): CollectionPatch<T> | undefined {
  const before = new Map<number, T>();
  for (const entry of prev) before.set(entry.id, entry);
  const set: EntryPatch<T>[] = [];
  let membership = prev.length !== next.length;
  for (let i = 0; i < next.length; i++) {
    const entry = next[i]!;
    const old = before.get(entry.id);
    if (old === undefined) {
      membership = true;
      set.push({ ...entry } as EntryPatch<T>);
      continue;
    }
    if (!membership && prev[i]!.id !== entry.id) membership = true;
    const patch = diffEntry(old, entry);
    if (patch !== null) set.push(patch);
  }
  const del: number[] = [];
  if (membership) {
    const after = new Set(next.map((entry) => entry.id));
    for (const entry of prev) if (!after.has(entry.id)) del.push(entry.id);
  }
  if (set.length === 0 && del.length === 0 && !membership) return undefined;
  const out: CollectionPatch<T> = {};
  if (set.length > 0) out.set = set;
  if (del.length > 0) out.del = del;
  if (membership) out.order = next.map((entry) => entry.id);
  return out;
}

function applyCollection<T extends Keyed>(
  prev: readonly T[],
  patch: CollectionPatch<T> | undefined
): T[] {
  if (patch === undefined) return prev.slice();
  const byId = new Map<number, T>();
  for (const entry of prev) byId.set(entry.id, entry);
  if (patch.del !== undefined) for (const id of patch.del) byId.delete(id);
  if (patch.set !== undefined) {
    for (const change of patch.set) {
      const old = byId.get(change.id);
      const merged: Record<string, unknown> = old === undefined ? {} : { ...old };
      const fields = change as Record<string, unknown>;
      for (const key in fields) {
        if (fields[key] === null) delete merged[key];
        else merged[key] = fields[key];
      }
      byId.set(change.id, merged as T);
    }
  }
  if (patch.order !== undefined) {
    const out: T[] = [];
    for (const id of patch.order) {
      const entry = byId.get(id);
      if (entry !== undefined) out.push(entry);
    }
    return out;
  }
  // Membership unchanged: the previous order stands, entries replaced in place.
  return prev.map((entry) => byId.get(entry.id) ?? entry);
}

/**
 * The wire form of `next`, given the last snapshot the same client was sent.
 * `prev` null, or a keyframe turn, yields the whole snapshot.
 */
export function encodeEcho(
  prev: EchoSnapshot | null,
  next: EchoSnapshot,
  seq: number,
  keyframe = seq % KEYFRAME_EVERY === 0
): EchoWire {
  if (prev === null || keyframe) return { kind: 'full', seq, snapshot: next };
  const patch: EchoPatch = { kind: 'patch', seq, tick: next.tick, selfEvents: next.selfEvents };
  const units = diffCollection(prev.units, next.units);
  if (units !== undefined) patch.units = units;
  const structures = diffCollection(prev.structures, next.structures);
  if (structures !== undefined) patch.structures = structures;
  const ordnance = diffCollection(prev.ordnance, next.ordnance);
  if (ordnance !== undefined) patch.ordnance = ordnance;
  const contacts = diffCollection(prev.contacts, next.contacts);
  if (contacts !== undefined) patch.contacts = contacts;
  const marks = diffCollection(prev.marks, next.marks);
  if (marks !== undefined) patch.marks = marks;
  const hazards = diffCollection(prev.hazards, next.hazards);
  if (hazards !== undefined) patch.hazards = hazards;
  const shoals = diffCollection(prev.shoals, next.shoals);
  if (shoals !== undefined) patch.shoals = shoals;
  const jellies = diffCollection(prev.jellies, next.jellies);
  if (jellies !== undefined) patch.jellies = jellies;
  if (prev.peakSig !== next.peakSig) patch.peakSig = next.peakSig;
  if (prev.nodules !== next.nodules) patch.nodules = next.nodules;
  if (prev.crystal !== next.crystal) patch.crystal = next.crystal;
  if (prev.biomass !== next.biomass) patch.biomass = next.biomass;
  if (!wireEqual(prev.berths, next.berths)) patch.berths = next.berths;
  if (!wireEqual(prev.exposure, next.exposure)) patch.exposure = next.exposure;
  if (!wireEqual(prev.draw, next.draw)) patch.draw = next.draw;
  if (prev.driftHealth.length !== next.driftHealth.length) {
    patch.driftHealth = next.driftHealth.flatMap((value, index) => [index, value]);
  } else {
    const moved: number[] = [];
    for (let i = 0; i < next.driftHealth.length; i++) {
      if (prev.driftHealth[i] !== next.driftHealth[i]) moved.push(i, next.driftHealth[i]!);
    }
    if (moved.length > 0) patch.driftHealth = moved;
  }
  return patch;
}

/**
 * The snapshot a wire message stands for. A keyframe is its own answer; a
 * patch needs the snapshot before it, at the sequence before it, or it is
 * refused with null and the client waits for the next keyframe.
 */
export function applyEchoWire(
  prev: { seq: number; snapshot: EchoSnapshot } | null,
  wire: EchoWire
): EchoSnapshot | null {
  if (wire.kind === 'full') return wire.snapshot;
  if (prev === null || prev.seq !== wire.seq - 1) return null;
  const base = prev.snapshot;
  const driftHealth = base.driftHealth.slice();
  if (wire.driftHealth !== undefined) {
    for (let i = 0; i < wire.driftHealth.length; i += 2) {
      driftHealth[wire.driftHealth[i]!] = wire.driftHealth[i + 1]!;
    }
  }
  return {
    tick: wire.tick,
    units: applyCollection(base.units, wire.units),
    structures: applyCollection(base.structures, wire.structures),
    ordnance: applyCollection(base.ordnance, wire.ordnance),
    contacts: applyCollection(base.contacts, wire.contacts),
    marks: applyCollection(base.marks, wire.marks),
    hazards: applyCollection(base.hazards, wire.hazards),
    shoals: applyCollection(base.shoals, wire.shoals),
    jellies: applyCollection(base.jellies, wire.jellies),
    peakSig: wire.peakSig ?? base.peakSig,
    nodules: wire.nodules ?? base.nodules,
    crystal: wire.crystal ?? base.crystal,
    biomass: wire.biomass ?? base.biomass,
    berths: wire.berths ?? base.berths,
    exposure: wire.exposure ?? base.exposure,
    draw: wire.draw ?? base.draw,
    driftHealth,
    selfEvents: wire.selfEvents,
  };
}
