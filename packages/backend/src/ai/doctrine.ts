/**
 * What each navy is *for*, as numbers a commander can act on.
 *
 * docs/factions.md gives every faction a doctrine and a weakness, and those
 * are the parameters below. Not flavour: the Consortium's line is "stealth is
 * a rounding error", so its commander harvests on Overburden, never runs
 * silent and pings without hesitating — and pays for it by being heard from
 * four minutes out. The Commune's line is "lowest SIG in the game", so its
 * commander trickles the moment a bearing sticks, runs silent by default,
 * expands wider and commits later.
 *
 * Every field here is an argument about **sound**. If a doctrine number could
 * not be justified by a sentence in docs/factions.md about being heard or
 * hearing, it does not belong in this table.
 *
 * Difficulty is a *separate* table, and deliberately so: doctrine says how a
 * faction fights, difficulty says how well it is being commanded. Mixing them
 * would make "harder" and "louder" the same axis, which is a different game.
 */

import { Faction, HarvestThrottle, UnitKind } from '@echoes/shared';
import { AiDifficulty } from './types.ts';

/**
 * What a navy does to its economy when it hears that it is being heard.
 *
 * Two fields, because dropping the throttle is two decisions and only one of
 * them used to be written down. *How quiet* is the doctrine's trade — the
 * Commune is built to be poor and unheard. *When to believe it* is the harder
 * half, and it is per-faction for the same reason: a bearing is worth more to
 * some navies than to others.
 *
 * The price is what makes the second field necessary. Since the throttle began
 * scaling the load (docs/economy.md §3), Trickle is 46% of Standard's income —
 * so a commander that drops the instant anything holds a bearing is spending
 * half its economy on a fact that, on its own, means only that somebody knows
 * roughly where it is.
 */
export interface ExposureResponse {
  /** Throttle its harvesters drop to once it believes the bearing. */
  throttle: HarvestThrottle;
  /**
   * Seconds a bearing must be *held* on this navy before its commander
   * believes it is danger rather than a sweep.
   *
   * An argument about hearing, like every other number here, and the field
   * where the two navies that hide differ most. The Commune loses any fight it
   * did not choose, so a line held on it for a few seconds is already worth
   * paying to break. The Directorate hears a tier further than anyone else and
   * is therefore the one navy that can afford to wait and find out whether the
   * bearing is being converted into an approach: if something is coming, it
   * will hear it coming, and if nothing is, it kept its income.
   *
   * Not zero for anyone. Zero is the reflex this replaced.
   */
  holdS: number;
}

export interface Doctrine {
  /** Throttle a harvester runs at when nobody is holding a bearing on it. */
  restingThrottle: HarvestThrottle;
  /**
   * How it answers being heard, or `null` for a navy that answers by not
   * caring — the Consortium is heard regardless and the Knights are meant to
   * be heard in front. A navy with no response never touches its throttle.
   */
  exposureResponse: ExposureResponse | null;
  /** Whether the army runs silent while approaching. */
  approachesSilently: boolean;
  /**
   * Whether the army pays the loud descent to attack from under the
   * thermocline (docs/systems-echo.md §3, docs/systems-depth.md §3).
   *
   * An argument about sound, like every other field here. A pair straddling
   * 1,200 m is cut to 0.3×, so crossing is the cheapest hiding place in the
   * game — but the crossing itself runs at DEPTH.DESCENT_SIG 72, louder than
   * every cruise SIG in the roster, and the climb back is three times slower
   * than the dive. It buys quiet at the price of announcing yourself once and
   * then being unable to leave in a hurry, which is why it belongs to the
   * factions whose doctrine already accepts that trade.
   *
   * Note what it is *not*: a stealth toggle. It is spent on the attack run and
   * given back on contact, so it prices a commitment rather than a reflex.
   */
  crossesTheLayer: boolean;
  /**
   * Seconds between active sonar transmissions this faction will accept.
   *
   * The Directorate's is enormous because it already hears a tier further than
   * anyone else — a ping buys it least and costs it the same. The Consortium's
   * is short because it is being heard regardless, so the information is
   * nearly free to it.
   */
  pingIntervalS: number;
  /** Hulls it wants in the water before it commits to an attack. */
  attackAtArmySize: number;
  /** Harvesters it wants working before it stops building them. */
  harvesterTarget: number;
  /**
   * What the yards build, cycled in order.
   *
   * The rung's roster (#461) puts two hulls a navy on this list where the
   * commander can use them: the armed Slipway hulls and the passive grants —
   * a Precentor's dome and a Tender's weld work on a force that is simply
   * standing near them. A Slipway hull with no Slipway standing has no yard
   * and costs nothing to skip — the commander takes the doctrine's next entry
   * — so the list can name the second hull before the commander has bought
   * the rung.
   *
   * The **Spinner** joined the list once the commander learned to lay (#467):
   * docs/systems-combat.md §11 makes the Commune the mine navy and
   * docs/units.md calls the Spinner "the way to reach" its cap of 18, so a
   * Commune that never fielded one was the one navy on this table missing the
   * hull its own doctrine sentence names. It is unarmed, which the commander
   * has to handle specially — see `commandLayers` and the Spinner gate in
   * `commandProduction`.
   *
   * The **Sower** joined it once the commander learned to go to the bottom
   * (#467), and it took two corrections above this table to make the entry
   * mean anything. It is a Slipway hull, and both the yard and the hull were
   * priced in crystal that sits in the Abyssal band — which no navy but the
   * Directorate has a harvester rated for. So the Commune needed the crystal
   * to buy the key to the crystal, and neither price was in what
   * docs/economy.md §8 actually specifies; both are nodules now (#491). The
   * other half is docs/economy.md §7's own answer for a navy that has not
   * bought the key yet: "abyssal extraction is run as raids, not as expansions,
   * by everyone except the Directorate." `commandCrystal` runs that raid, and
   * the Sower is what ends it for this navy.
   */
  composition: readonly UnitKind[];
}

export const DOCTRINE: Record<Faction, Doctrine> = {
  // "Stealth is a rounding error." Loudest in the game, built to survive being
  // heard: it takes the loud money, never bothers hiding, and pushes early
  // with heavy hulls because out-repairing the exchange is its whole plan.
  [Faction.Bathyarch]: {
    restingThrottle: HarvestThrottle.Overburden,
    // Heard from four minutes out whatever it does, so a bearing on it is not
    // news and quiet it cannot keep is not worth half its income.
    exposureResponse: null,
    approachesSilently: false,
    // Heard regardless, and it knows it. Quiet bought at the cost of a 47 s
    // climb is quiet it cannot spend, and PR-2 refits it pays for by the metre.
    crossesTheLayer: false,
    pingIntervalS: 25,
    attackAtArmySize: 4,
    harvesterTarget: 4,
    // The Tender behind the first Corvette: repair is the navy's identity,
    // and it only counts once there is something to weld. The Bulwark once
    // the rung stands.
    composition: [
      UnitKind.Corvette,
      UnitKind.Tender,
      UnitKind.Cruiser,
      UnitKind.Bulwark,
      UnitKind.Cruiser,
    ],
  },
  // "The Veil." Harvests at 18 where others harvest at 50, and loses any fight
  // it did not choose — so it takes the quiet money, runs silent, and waits
  // for a bigger force than anyone else needs.
  [Faction.Pelagia]: {
    restingThrottle: HarvestThrottle.Standard,
    // Six seconds: the shortest hold in the game, because the Veil loses any
    // fight it did not choose and a line held that long is already the start
    // of one. Short, not absent — a sweep that passes over it and keeps going
    // is not worth 54% of its income.
    exposureResponse: { throttle: HarvestThrottle.Trickle, holdS: 6 },
    approachesSilently: true,
    // "They don't survive the deep; they terraform it." PR-1 baseline and the
    // worst refits in the game — the Commune's answer to deep water is to
    // change it, not to visit it, and its quiet already comes from harvesting
    // at 18 SIG rather than from where it stands.
    crossesTheLayer: false,
    pingIntervalS: 60,
    attackAtArmySize: 6,
    harvesterTarget: 6,
    // The Spinner third: after the scout that finds the approach and the
    // Corvette that can hold it, because a wall is worth laying only where
    // the commander already knows something walks. §6's counter-play is
    // hearing a field being built, and the Spinner's laying is silent — so
    // the Commune can wall where a Corvette could not.
    //
    // The Sower last, and it is the entry this navy's whole doctrine line
    // points at: "they don't survive the deep, they change it." Both of the
    // unarmed hulls here are bought by a gate rather than by the cycle — see
    // `WANTED_SEPARATELY` in the commander — so their position on this list
    // declares that the navy fields them, not when.
    composition: [
      UnitKind.LightScout,
      UnitKind.Corvette,
      UnitKind.Spinner,
      UnitKind.Corvette,
      UnitKind.Sower,
    ],
  },
  // "The Listening." Best hydrophones by a wide margin, so it pings least and
  // scouts most, and it arrives in numbers rather than in quality.
  [Faction.Directorate]: {
    restingThrottle: HarvestThrottle.Standard,
    // Twenty-five seconds, four times the Commune's, and the difference *is*
    // the doctrine: the Listening is the one navy that can tell a bearing from
    // an approach without paying to find out, because whatever is converting
    // one into the other it will hear first. Waiting is what its ears buy it.
    exposureResponse: { throttle: HarvestThrottle.Trickle, holdS: 25 },
    approachesSilently: true,
    // PR-3 baseline, no refit needed. The layer costs them nothing to cross
    // and hides them from ears that already hear less than theirs — and since
    // #154, the water above 400 m actively poisons them, so down is simply
    // where they belong.
    crossesTheLayer: true,
    pingIntervalS: 120,
    attackAtArmySize: 7,
    harvesterTarget: 5,
    // A Precentor with the first pair: the swarm "has to know first where it
    // is going", and the dome is the cheapest ears it can add. The Dredge
    // once the rung stands.
    composition: [
      UnitKind.Corvette,
      UnitKind.Corvette,
      UnitKind.Precentor,
      UnitKind.LightScout,
      UnitKind.Dredge,
    ],
  },
  // "The Score." Elite, expensive, few — deafening in front and quiet on the
  // flank. It masses the longest and fields the least.
  [Faction.Hadron]: {
    restingThrottle: HarvestThrottle.Standard,
    // The Score's quiet is a property of where it attacks from, not of how
    // hard its haulers are working — and it fields too few hulls as it is to
    // fund them on 46% of an economy.
    exposureResponse: null,
    approachesSilently: false,
    // "Deafening in front and quiet on the flank." Instant refits paid in
    // Resonance make depth a thing they project rather than buy, so the one
    // approach they can make quietly is the one that goes under.
    crossesTheLayer: true,
    pingIntervalS: 40,
    attackAtArmySize: 5,
    harvesterTarget: 4,
    // The Cantus is the Order's early tempo tool (docs/units.md): a Spire's
    // grant on a hull, at the Foundry, so the force that masses at the rally
    // masses with a band of depth under it. The Reciter once the rung stands.
    composition: [
      UnitKind.Cruiser,
      UnitKind.Corvette,
      UnitKind.Cantus,
      UnitKind.Reciter,
      UnitKind.Cruiser,
    ],
  },
};

/**
 * How well the navy is being commanded.
 *
 * Note what is absent: there is no field here that could widen what the
 * commander perceives. Every one is about acting on what it already heard —
 * how often it thinks, whether it bothers managing its own loudness, how
 * disciplined it is about massing before it commits. That absence is the
 * design constraint made structural: a difficulty that cheats would have to
 * add a field to this interface, and adding one would be visible.
 */
export interface AiTuning {
  /** Echo ticks between decisions. The Echo Layer runs at 5 Hz. */
  cadenceTicks: number;
  /** Whether it drops throttle when something is holding a bearing on it. */
  managesExposure: boolean;
  /** Whether it uses Silent Running at all. */
  usesSilentRunning: boolean;
  /** Whether it pings to classify an ambiguous contact near its force. */
  pingsToClassify: boolean;
  /** Multiplier on the doctrine's attack threshold. Above 1 is more patient. */
  patience: number;
}

export const TUNING: Record<AiDifficulty, AiTuning> = {
  [AiDifficulty.Recruit]: {
    // Three seconds between decisions: it will finish a bad plan before it
    // notices a better one, which is exactly what being new looks like.
    cadenceTicks: 15,
    managesExposure: false,
    usesSilentRunning: false,
    pingsToClassify: false,
    // Attacks with whatever is standing, and often with too little.
    patience: 0.7,
  },
  [AiDifficulty.Veteran]: {
    cadenceTicks: 3,
    managesExposure: true,
    usesSilentRunning: true,
    pingsToClassify: true,
    patience: 1,
  },
};

export function doctrineFor(faction: Faction): Doctrine {
  return DOCTRINE[faction];
}

export function tuningFor(difficulty: AiDifficulty): AiTuning {
  return TUNING[difficulty];
}
