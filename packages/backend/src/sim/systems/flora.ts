/**
 * The flora economy — docs/systems-flora.md §2 and §3.
 *
 * Waves 1 and 2 gave a kelp bed a standing crop and made it grow back. This
 * is the pass that lets somebody **spend** it, and the sentence the whole
 * design hangs on is a property of this file:
 *
 *   **The crop is the cover.** A bio-reactor renders the canopy around itself
 *   into hulls, so the water over a working reactor un-hides as it runs. A
 *   mature one stands in open water, loudly, having made the hole it sits in.
 *   Nothing else in the game builds its own vulnerability that literally.
 *
 * Three things happen per reactor per tick, and all three are the same act:
 * the owner banks Biomass, the bed loses canopy (which is PF, and drag, and
 * what the herd eats — wave 1 and wave 2 read the same number), and the
 * region loses Drift Health at the rate a rendered creature costs it. That
 * last one is §8's guard-rail arriving with the thing it guards against
 * rather than bolted on beside it: strip your own ground and you push it
 * toward the band where the crop grows back at less than half speed and the
 * animals stop arriving.
 *
 * On the 60 Hz budget: reactors × beds distance checks, both in single
 * digits, no path integrals and no allocation. A map with no reactor standing
 * pays one query and returns.
 */

import { FLORA, Faction, StructureKind } from '@echoes/shared';
import { addComponent, defineQuery, hasComponent, removeComponent } from 'bitecs';
import {
  Health,
  Owner,
  Position,
  SilentRunning,
  Sowing,
  Structure,
  UnderConstruction,
  Unit,
  Velocity,
} from '../components.ts';
import { economyFor, type SimWorld } from '../world.ts';
import { bedAt, setKelpCrop } from './hazards.ts';

const plants = defineQuery([Structure, Position, Owner, Health]);

/**
 * Beds within reach of a point, nearest first.
 *
 * Reach is disc overlap rather than centre-in-range: a field is an area, and
 * a reactor on the edge of a twelve-hundred-metre bed is standing *in* it
 * however far away its centre happens to be. Held in a module-level scratch
 * array because this runs sixty times a second and the answer is three beds
 * on the only map that authors any.
 */
const inReach: { index: number; distanceSq: number }[] = [];

function bedsInReach(world: SimWorld, x: number, y: number): typeof inReach {
  inReach.length = 0;
  for (let i = 0; i < world.hazards.length; i++) {
    const bed = world.hazards[i]!;
    if (bed.kind !== 'kelp-entanglement') continue;
    if (bed.crop <= 0) continue;
    const dx = bed.x - x;
    const dy = bed.y - y;
    const distanceSq = dx * dx + dy * dy;
    const reach = FLORA.REACTOR_RADIUS_M + bed.radiusM;
    if (distanceSq > reach * reach) continue;
    inReach.push({ index: i, distanceSq });
  }
  // Nearest first, and that ordering is the mechanic rather than an
  // optimisation: §2's reactor "consumes the crop around itself first", which
  // is what makes the hole appear under the reactor rather than at the far
  // edge of a field it can reach.
  inReach.sort((a, b) => a.distanceSq - b.distanceSq);
  return inReach;
}

/**
 * Render standing crop into Biomass — docs/systems-flora.md §2.
 *
 * `world.reactorActive` is this pass's output as much as the Biomass is: the
 * acoustics pass reads it to decide whether a reactor is sitting at its
 * spec'd SIG 50 or merely ticking over, so a reactor that has eaten its bed
 * goes quiet on the tick it runs out. The same set is what makes "loud
 * exactly while it works" true of a structure whose work is invisible.
 */
export function bioReactorSystem(world: SimWorld): void {
  world.reactorActive.clear();
  if (world.hazards.length === 0) return;

  const structures = plants(world);
  if (structures.length === 0) return;

  // A flat rate while there is crop in reach — see FLORA.REACTOR_BIOMASS_PER_MIN
  // for why it does not taper with the canopy.
  const wanted = (FLORA.REACTOR_BIOMASS_PER_MIN / 60) * world.dt;

  for (let i = 0; i < structures.length; i++) {
    const eid = structures[i]!;
    if (Structure.kind[eid] !== StructureKind.BioReactor) continue;
    if (Health.hp[eid]! <= 0) continue;
    // A site is not a plant. A half-built reactor is loud as a building site
    // and renders nothing, which acoustics already says and this must agree
    // with.
    if (hasComponent(world, UnderConstruction, eid)) continue;

    const x = Position.x[eid]!;
    const y = Position.y[eid]!;
    const beds = bedsInReach(world, x, y);
    if (beds.length === 0) continue;

    let remaining = wanted;
    let rendered = 0;
    for (let b = 0; b < beds.length && remaining > 0; b++) {
      const bed = world.hazards[beds[b]!.index]!;
      // What this bed can still give, in Biomass.
      const standing = bed.crop * FLORA.FULL_CROP_BIOMASS;
      const taken = Math.min(remaining, standing);
      if (taken <= 0) continue;
      setKelpCrop(world, bed, bed.crop - taken / FLORA.FULL_CROP_BIOMASS);
      // The band the *crop* stands in, not the one the reactor does: a
      // reactor on the edge of a region renders the water it reaches into,
      // and that water is what pays and what wears.
      const yieldScale = world.drift.yieldMultiplier(bed.x, bed.y);
      world.drift.recordHarvest(bed.x, bed.y, taken);
      rendered += taken * yieldScale;
      remaining -= taken;
    }

    if (rendered <= 0) continue;
    // No faction rate here, deliberately. The Directorate's ×1 against
    // everyone else's ×0.3 is the *rendering contract* on dead animals
    // (docs/bestiary.md §5); §2 and §6 give the reactor to every navy at one
    // rate, and a second split invented here would be a doctrine change
    // wearing a transcription's clothes.
    economyFor(world, Owner.slot[eid]!).biomass += rendered;
    world.reactorActive.add(eid);
  }
}

const sowers = defineQuery([Sowing, Position, Owner, Health]);

/**
 * May this hull start a sowing here — docs/systems-flora.md §2.
 *
 * Everything the order is refused for, in one place, because the room and the
 * tests both have to ask the same question. The rules are the doc's two
 * limits plus the one every worked act in this game shares:
 *
 * - **Commune only.** §6 gives sowing to the one navy whose doctrine is cover;
 *   it is the only entry in that table that puts something back.
 * - **A hull, in a bed.** Sowing *restores* a bed and never creates one, so
 *   there must already be a field under the hull. A skirmish player who could
 *   grow cover on open water would be editing the map's acoustics at will,
 *   which §2 rules out in as many words.
 * - **Alive, and not silent.** Silence stops the work
 *   (docs/systems-echo.md §6) — the same clause that stops a bloom-share and
 *   a thermal cutter.
 */
export function canSow(world: SimWorld, eid: number): boolean {
  if (!hasComponent(world, Unit, eid)) return false;
  if (Owner.faction[eid] !== Faction.Pelagia) return false;
  if (Health.hp[eid]! <= 0) return false;
  if (SilentRunning.active[eid] === 1) return false;
  return bedAt(world, Position.x[eid]!, Position.y[eid]!) !== undefined;
}

/**
 * Begin a sowing. Returns whether the order took.
 *
 * Re-ordering a sowing that is already running is a no-op rather than a
 * restart: a player spamming the key would otherwise hold a hull at
 * forty-four seconds forever, paying SIG 18 the whole time and never
 * finishing.
 */
export function startSowing(world: SimWorld, eid: number): boolean {
  if (!canSow(world, eid)) return false;
  if (hasComponent(world, Sowing, eid) && Sowing.remainingS[eid]! > 0) return false;
  addComponent(world, Sowing, eid);
  Sowing.remainingS[eid] = FLORA.SOW_TIME_S;
  Sowing.x[eid] = Position.x[eid]!;
  Sowing.y[eid] = Position.y[eid]!;
  return true;
}

/**
 * Serve the sowings in progress — docs/systems-flora.md §2.
 *
 * Forty-five seconds on station, and *on station* is the load-bearing half:
 * moving breaks it, going silent breaks it, dying breaks it, and a broken
 * sowing credits nothing at all. That is what makes it a commitment to a
 * piece of water rather than a button — the cutter's burn at seven times the
 * length and a third of the noise.
 *
 * What it buys is not applied here. The bed is *owed* a quarter of a canopy
 * and lays it down over the two minutes that follow (`hazardsSystem`), so the
 * hull that sowed is gone before the cover it bought arrives. Sowing is never
 * an escape and never a defence; it is a thing done for the next fight.
 *
 * On the 60 Hz budget: one query over a component almost nothing carries, and
 * a bed lookup per sower. Empty in every match where nobody sows.
 */
export function sowingSystem(world: SimWorld): void {
  const hulls = sowers(world);
  for (let i = 0; i < hulls.length; i++) {
    const eid = hulls[i]!;
    if (Sowing.remainingS[eid]! <= 0) continue;

    // Off station, gone quiet, or dead: the seed does not go in. Velocity
    // rather than a distance from the start, because a hull under way is not
    // working whatever its displacement adds up to — the same test the drag
    // SIG uses for "pushing" (hazards.ts).
    const moving = Velocity.x[eid]! !== 0 || Velocity.y[eid]! !== 0;
    if (moving || !canSow(world, eid)) {
      Sowing.remainingS[eid] = 0;
      removeComponent(world, Sowing, eid);
      continue;
    }

    Sowing.remainingS[eid] = Sowing.remainingS[eid]! - world.dt;
    if (Sowing.remainingS[eid]! > 0) continue;

    // Served. The bed it started over, not the one it might have drifted to —
    // `canSow` has already established there is one here, and a hull that has
    // not moved is over the same field it began on.
    const bed = bedAt(world, Sowing.x[eid]!, Sowing.y[eid]!);
    if (bed !== undefined) bed.sownRemaining += FLORA.SOW_RESTORE;
    Sowing.remainingS[eid] = 0;
    removeComponent(world, Sowing, eid);
  }
}
