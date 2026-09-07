/**
 * Tuning constants for the Echo Layer and Depth systems.
 *
 * Values marked SPEC are taken directly from the design docs and should only
 * change when the docs change. Values marked TUNABLE are prototype numbers the
 * docs do not pin down; they exist so the simulation can run and are expected
 * to move during playtesting (see docs/units.md "Playtest plan").
 */

import { Biome, DepthBand, Faction, HarvestThrottle, ResourceKind } from './types.js';

/** SPEC — docs/systems-depth.md §1. Metres. */
export const DEPTH_BANDS: Record<DepthBand, { min: number; max: number }> = {
  [DepthBand.Shelf]: { min: 0, max: 400 },
  [DepthBand.MidWater]: { min: 400, max: 1800 },
  [DepthBand.Abyssal]: { min: 1800, max: Number.POSITIVE_INFINITY },
};

/**
 * SPEC — docs/systems-echo.md §3. Multiplied into SIG when resolving detection.
 * Below 1.0 masks the emitter; above 1.0 carries them further than open water.
 */
export const PROPAGATION_FACTOR: Record<Biome, number> = {
  [Biome.OpenWater]: 1.0,
  [Biome.ThermalVein]: 0.45,
  [Biome.KelpForest]: 0.55,
  [Biome.AbyssalTrench]: 1.6,
  [Biome.ResonanceField]: 0.7,
  [Biome.CoralRuins]: 0.8,
};

/**
 * Derived — the loudest water on the map. The Echo Layer's broadphase must
 * bound the audible range of a path it has not walked yet, and the only safe
 * bound is "the whole path is trench". Derived so a new biome cannot
 * silently break the bound.
 */
export const MAX_PROPAGATION_FACTOR = Math.max(...Object.values(PROPAGATION_FACTOR));

/**
 * SPEC — docs/systems-echo.md §3 "Scattered water". The one row of the PF
 * table that is not a scalar: Resonance Fields are "0.7, scattered". The 0.7
 * prices *how loud* a path is exactly as any other biome's factor does; this
 * marks the water that also lies about *where* the sound came from.
 *
 * A flag beside the factor rather than a second factor, because scatter is
 * not a loudness. It never moves a tier — a hull in the Fields is heard from
 * precisely as far as PF 0.7 says — it moves the bearing a resolved contact is
 * reported on, and a ping transmitted from inside it returns phantoms. Both
 * are priced in `SCATTER`.
 */
export const SCATTERED_BIOME: Record<Biome, boolean> = {
  [Biome.OpenWater]: false,
  [Biome.ThermalVein]: false,
  [Biome.KelpForest]: false,
  [Biome.AbyssalTrench]: false,
  [Biome.ResonanceField]: true,
  [Biome.CoralRuins]: false,
};

/**
 * SPEC — Standing Wave (docs/systems-echo.md §7, Hadron Knights; docs/factions.md).
 * The Order's unique: two Sounding Spires that pair into a corridor.
 */
export const STANDING_WAVE = {
  /**
   * A second node placed within this range of the first pairs with it.
   * Deliberately the same number as `CONSTRUCTION.BUILD_RADIUS_M` (#372): a
   * node a commander can site off its partner is a node that pairs, so the
   * longest corridor the doctrine describes is also the longest one that can
   * be built. Two constants rather than one alias because the docs state them
   * separately and each can be cited on its own.
   */
  PAIR_RANGE_M: 1500,
  /**
   * PF inside a standing corridor — above every biome's baseline on purpose,
   * the trench axis included. The corridor is a megaphone, not a place, and
   * the whole lesson of Knights mission 2 (docs/mission-standing-wave.md §7)
   * is that it out-carries the loudest water on the map.
   */
  CORRIDOR_PF: 2.0,
  /**
   * Half the corridor's width — how far either side of the line between two
   * paired nodes the PF write and the damage reach.
   *
   * TUNABLE. Half a cell, so the line is one cell of water wide, which is the
   * finest thing the PF grid can draw and the coarsest thing the mission that
   * teaches it can afford: docs/mission-standing-wave.md §11's "nodes set in
   * from the walls leave a gap, and a gap is a road" needs the gap to be at
   * least a cell for the road to exist.
   */
  CORRIDOR_HALF_WIDTH_M: 125,
  /**
   * Hull lost per second by anything standing in a standing corridor.
   *
   * TUNABLE — docs/systems-echo.md §7 and docs/factions.md specify "a line of
   * sonic damage" and price it nowhere. Chosen against the roster's TTK bands
   * (docs/systems-combat.md §9): a Corvette crossing one cell of it at cruise
   * pays about six per cent of its hull, a Corvette that stands in it is gone
   * inside a minute, and a Cruiser inside three. A kill-line is a place you
   * do not stop, not a wall you cannot cross. Applied to every hull and every
   * creature, whoever raised the line — "harming everyone equally, including
   * them" is the mechanic and not a flavour note.
   */
  CORRIDOR_DAMAGE_PER_S: 8,
  /**
   * SPEC — docs/mission-standing-wave.md §8: a node under fire "detunes below
   * 40% of its HP". A paired node under this fraction of its hull reads as
   * sour on the panel; the `build` predicate's `detuned` flag counts them.
   */
  DETUNE_HP_FRACTION: 0.4,
} as const;

/**
 * Derived — the loudest any *cell* can be made, corridor included: the
 * loudest biome or the corridor, whichever is louder. This is the clamp on a
 * modified cell; `MAX_PROPAGATION_FACTOR` stays the biome table's own ceiling
 * and is not raised to meet it.
 *
 * Nothing sizes a search from this number (#372). The Echo pass and every
 * other broadphase bound from `Terrain.peakPf` — the loudest cell actually on
 * the grid right now — so a match with no corridor standing pays nothing for
 * the corridor existing, and one with a corridor pays only while it stands.
 */
export const MAX_MODIFIED_PROPAGATION_FACTOR = Math.max(
  MAX_PROPAGATION_FACTOR,
  STANDING_WAVE.CORRIDOR_PF
);

/**
 * Floor for a modified cell's PF — docs/bestiary.md §4 (Tetherjelly):
 * "floored at 0.05 — sound never stops entirely." Only additive modifiers can
 * reach it; no biome baseline is anywhere near, and a floor of zero would let
 * stacked jelly fields cut holes in the propagation model that the detection
 * maths (a division by perceived loudness) was never asked to survive.
 */
export const MIN_PROPAGATION_FACTOR = 0.05;

/**
 * SPEC (the factors) / TUNABLE (the depth) — docs/systems-echo.md §3.
 *
 * The one row in §3's PropagationFactor table that is not a biome. A biome is a
 * footprint on the sea floor, so it lives in the terrain grid; the thermocline
 * is a horizontal surface in the water column, and that grid has no vertical
 * axis to put it in. It is priced per emitter-listener *pair* from the two
 * endpoint depths — which is the honest model anyway, because a crossing is a
 * property of the pair's vertical geometry and not of the water in any cell.
 *
 * §3 spec'd the factors and never spec'd where the layer sits; see its "Where
 * the layer sits" for why 1,200 m, and why nothing the game seats by default
 * begins a match split across it.
 */
export const THERMOCLINE = {
  DEPTH_M: 1200,
  DUCT_HALF_WIDTH_M: 100,
  ACROSS: 0.3,
  ALONG: 1.2,
} as const;

/** Derived, so the zone test compares against numbers rather than expressions. */
export const THERMOCLINE_DUCT_TOP_M = THERMOCLINE.DEPTH_M - THERMOCLINE.DUCT_HALF_WIDTH_M;
export const THERMOCLINE_DUCT_BOTTOM_M = THERMOCLINE.DEPTH_M + THERMOCLINE.DUCT_HALF_WIDTH_M;

/**
 * The pair factor, indexed `zoneA * 3 + zoneB`.
 *
 * Symmetric by construction: a path is a property of the pair, so the layer
 * hides them from you exactly as much as it hides you from them. Duct-to-
 * outside is 1.0 rather than ALONG, because a sound channel needs both ends
 * inside it — a duct that made you louder to everyone would be a trap rather
 * than a decision.
 */
const THERMOCLINE_ROWS: readonly (readonly number[])[] = [
  // Rows are the emitter's zone, columns the listener's, both in the order of
  // ThermoclineZone: Above, Duct, Below.
  /* Above */ [1, 1, THERMOCLINE.ACROSS],
  /* Duct  */ [1, THERMOCLINE.ALONG, 1],
  /* Below */ [THERMOCLINE.ACROSS, 1, 1],
];

export const THERMOCLINE_PAIR_FACTOR = Float64Array.from(THERMOCLINE_ROWS.flat());

/**
 * Derived — the loudest a path *from* each zone can be, over every listener
 * zone. Row maxima, so a new entry in the table above cannot silently outgrow
 * the broadphase bounds that read this.
 */
export const THERMOCLINE_ZONE_MAX = Float64Array.from(
  THERMOCLINE_ROWS.map((row) => Math.max(...row))
);

/**
 * Derived — the loudest an emitter-listener *pair* can be: the loudest cell
 * times the loudest pair multiplier.
 *
 * **A different question from MAX_PROPAGATION_FACTOR, with a different answer**
 * (1.92 against 1.6). That one bounds a *cell*: it keeps the path walk's
 * early-out honest and clamps hazard-modified PF, and raising it would tax
 * every walk in the match to fix a bound that matters for one depth band. This
 * one bounds a *path*, and is what a broadphase reaching for "the loudest this
 * could possibly be" wants. Conflating them is how contacts go quietly missing.
 *
 * Static, and a bound on unmodified water. The passes themselves read
 * `Terrain.peakPf` in place of the cell ceiling — the live counterpart that
 * rises above it only while a Standing Wave corridor stands (#372).
 */
export const MAX_PATH_PROPAGATION_FACTOR =
  MAX_PROPAGATION_FACTOR * Math.max(...THERMOCLINE_ZONE_MAX);

/**
 * SPEC — docs/systems-echo.md §8. The Hadron Knights' doctrine, as a term in
 * the detection formula.
 *
 * A Knight hull's SIG is multiplied by where the listener stands relative to
 * that hull's own **bow**, and the circle divides into quarters: one ahead, one
 * either beam, one astern. It multiplies into the same product as biome PF and
 * the thermocline pair factor — a fourth term in the arithmetic the game
 * already has, not a second kind of it.
 *
 * **WAKE is derived, not chosen.** docs/audio-direction.md already placed
 * Knight emissions off-axis at *up to −20 dB*, and that document's second law
 * is that the mix may never sound more certain than the server is. 0.10 is
 * −20 dB, so the instruction the audio doc was already carrying becomes a
 * rendering of this model rather than a decoration on top of one. Rounding it
 * to 0.1-something friendlier would make the loudest channel in the game a
 * liar. FLANK is then the level the mix owed a name to and never had: −9.1 dB.
 *
 * **The compass average is 0.45** — one quarter at 1.00, two at 0.35, one at
 * 0.10 — which is §8's balance clause. A Knight is an ordinary hull with its
 * loudness *moved*, not a quiet one, and a Knight roster (which does not exist
 * yet) is expected to carry roughly 2.2× a comparable hull's SIG so the two
 * land at parity.
 *
 * **Emitter-side only.** Unlike the thermocline, which is symmetric because a
 * path is a property of the pair, this belongs to the emitter alone: a Knight
 * showing its wake to a listener is quiet to that listener and hears it exactly
 * as well as before. Applying it to the listener's side by symmetry with
 * `thermoclineFactor` is the natural mistake and would be wrong.
 */
export const DIRECTIONAL_SIGNATURE = {
  /** Within 45° either side of the bow. The SIG the hull lists. 0 dB. */
  CONE: 1.0,
  /** 45° to 135°, either beam. −9.1 dB. */
  FLANK: 0.35,
  /** Beyond 135°. −20 dB exactly, and the figure the whole table is solved from. */
  WAKE: 0.1,
  /** Half-angle of the cone, degrees — a quarter of the circle ahead. */
  CONE_HALF_ANGLE_DEG: 45,
  /** Where the flank ends and the wake begins, degrees off the bow. */
  WAKE_HALF_ANGLE_DEG: 135,
} as const;

/**
 * Derived — the sector boundaries as cosines, so the hot loop compares a dot
 * product instead of calling `Math.acos` per pair.
 *
 * Derived from the degrees above rather than written as 0.7071 so the two
 * cannot drift apart, which is the same reason `THERMOCLINE_DUCT_TOP_M` is
 * derived from the layer depth.
 */
export const DIRECTIONAL_CONE_COS = Math.cos(
  (DIRECTIONAL_SIGNATURE.CONE_HALF_ANGLE_DEG * Math.PI) / 180
);
export const DIRECTIONAL_WAKE_COS = Math.cos(
  (DIRECTIONAL_SIGNATURE.WAKE_HALF_ANGLE_DEG * Math.PI) / 180
);

/**
 * Derived — the term averaged over the compass: one quarter of the circle at
 * the cone factor, two at the flank, one at the wake.
 *
 * docs/systems-echo.md §8 states it as 0.45 and calls it the balance clause:
 * "a Knight hull is an ordinary hull with its loudness moved, not a quiet
 * one", so a Knight entry's listed *cone* SIG runs 1/this — about 2.2× — of a
 * comparable generic hull's, and the two land at parity averaged over the
 * compass. The Clarion is solved from it (docs/units.md), and `units.test.ts`
 * holds the roster to it, so it is computed from the sector table rather than
 * transcribed: a table edit that moved the average would otherwise leave the
 * roster quietly out of balance with the model it was solved from.
 */
export const DIRECTIONAL_COMPASS_AVERAGE =
  (DIRECTIONAL_SIGNATURE.CONE + 2 * DIRECTIONAL_SIGNATURE.FLANK + DIRECTIONAL_SIGNATURE.WAKE) / 4;

/**
 * SPEC — docs/systems-echo.md §4. A contact resolves to a tier when the
 * perceived loudness reaches this multiple of the listener's threshold.
 */
export const TIER_THRESHOLD_MULTIPLIER = {
  CONTACT: 1.0,
  BEARING: 1.5,
  CLASSIFICATION: 2.5,
  TRACK: 4.0,
} as const;

/** SPEC — docs/systems-echo.md §5. The big red button. */
export const ACTIVE_SONAR = {
  /** Instant Tier-4 resolution inside this radius, in metres. */
  REVEAL_RADIUS_M: 900,
  /** ...and every enemy listener this far away resolves YOU to Tier 4. */
  SELF_REVEAL_RADIUS_M: 2400,
  /** Omnidirectional SIG emitted by the pinger. */
  EMITTER_SIG: 95,
  /** How long the reveal lasts, seconds. */
  REVEAL_DURATION_S: 3,
  /** SIG contribution to fauna aggro is tripled for a ping. */
  FAUNA_AGGRO_MULTIPLIER: 3,
  /** Offensive incentive so the button is worth pressing. */
  ALLY_ACCURACY_BONUS: 0.2,
} as const;

/**
 * Depth as an ordered state. docs/systems-depth.md §2.
 *
 * The *asymmetry* is SPEC and load-bearing — "descent is fast and deafening,
 * ascent is slow and silent" — because it is what makes depth the axis of
 * commitment (§5): a raid that goes deep arrives announced and cannot leave in
 * a hurry. The numbers realising it are TUNABLE; the doc pins the shape only.
 *
 * DESCENT_SIG is a *floor* rather than a replacement value: blowing ballast is
 * the loudest thing a hull does short of an active ping, and it must never
 * make a unit that was already louder somehow quieter. It sits above every
 * cruise SIG in the roster (loudest: Cruiser, 65) and below the ping's 95.
 */
export const DEPTH = {
  /** Metres per second while diving. */
  DESCENT_RATE_MPS: 45,
  /** Metres per second while rising — deliberately a third of the descent. */
  ASCENT_RATE_MPS: 15,
  /** Sustained SIG floor while descending. Ascent adds nothing at all. */
  DESCENT_SIG: 72,
  /** Close enough to the ordered depth to count as arrived, metres. */
  ARRIVAL_EPSILON_M: 2,
  /** Shallowest orderable depth: the surface. */
  MIN_M: 0,
  /**
   * Deepest orderable depth — the map floor. TUNABLE, and temporary: it
   * belongs to the map rather than to the ruleset, and moves into map data
   * when authored maps land (see docs/ROADMAP.md, Phase 3).
   */
  MAX_M: 3000,
} as const;

/**
 * SPEC — docs/systems-depth.md §3, the "Baseline PR" column.
 *
 * The depth each navy is born rated for, before it buys, projects or
 * terraforms a single metre. A **floor**, not an override: a hull whose own
 * rating is higher keeps it, because the baseline is where a faction starts
 * rather than where it stops.
 *
 * §3 has published this table since the doc existed and nothing read it, which
 * made four documented depth identities into prose. It is also what makes the
 * Directorate's weakness coherent at all: their PR-3 baseline is the other
 * half of "shallow water poisons them". Without it a Directorate Light Scout
 * is a PR-1 hull that crushes below 400 m and is poisoned above it — a unit
 * with no depth in the entire water column where it is neither dying nor
 * bleeding, which is not a trade-off, it is a hole.
 */
export const FACTION_PRESSURE_BASELINE: Record<Faction, number> = {
  // "Buys access — cheapest refits in the game, but pays for every metre."
  [Faction.Bathyarch]: 2,
  // "Terraforms access — poor refits; they don't survive the deep, they change it."
  [Faction.Pelagia]: 1,
  // "Born to it — no refit needed, free access to the map's richest third."
  [Faction.Directorate]: 3,
  // "Projects access — instant refits paid in Resonance."
  [Faction.Hadron]: 2,
};

/**
 * SPEC (the penalties) / TUNABLE (how fast the hull half lands) — docs/factions.md
 * "Abyssal Directorate → Weakness", docs/systems-depth.md §3.
 *
 * "Shallow water poisons them": −20% speed and −15% HP above 400 m. The speed
 * half is a straight multiplier. The hull half is a **bleed with a floor**
 * rather than a max-HP debuff, because a hull that loses 15% the instant it
 * crosses a line gives the player nothing to read — a bar draining while a
 * fleet loiters shallow says *leave* in a way a step change does not. It is
 * also the only reading of "poisons" that is a poison.
 *
 * The 400 m line is deliberately not restated here. It is DEPTH_BANDS' Shelf /
 * Mid-Water boundary, and the test is `depthBandFor() === Shelf`, so moving the
 * band moves the penalty with it.
 */
export const DIRECTORATE_SHALLOW = {
  /** Movement speed multiplier while above the Shelf line (-20%). */
  SPEED_MULTIPLIER: 0.8,
  /**
   * Hull floor as a fraction of max. The bleed stops here, which is what makes
   * the penalty a cost rather than a countdown: shallow water can take 15% of a
   * Directorate hull and never the sixteenth percent, so it can never kill.
   */
  HULL_FLOOR: 0.85,
  /**
   * TUNABLE — seconds a full hull takes to reach the floor. Sized so a raid
   * above the line feels it and survives it: the Directorate can strike shallow
   * and pull out having paid, which is the trade the doc describes. Fast enough
   * that loitering is punished, slow enough that crossing is not.
   */
  BLEED_S: 20,
} as const;

/**
 * Derived, so the rate and the floor cannot drift apart — a fraction of max
 * hull per second. Retuning BLEED_S retunes the rate and nothing else.
 */
export const DIRECTORATE_SHALLOW_BLEED_PER_S =
  (1 - DIRECTORATE_SHALLOW.HULL_FLOOR) / DIRECTORATE_SHALLOW.BLEED_S;

/**
 * SPEC — docs/systems-depth.md §2 "The other end of the column", docs/world.md
 * "The Lid". The sour top of the ocean: universal, faction-blind, and — unlike
 * the Directorate's shallows — allowed to kill, because the Salinity Collapse
 * was not a tax. The boundary depth is the world's (~150 m, stable for two
 * centuries); grace, rate and recovery are TUNABLE, and the doc pins the
 * mirror-with-crush design rather than the numbers.
 */
export const LID = {
  /** Depth of the sour boundary, metres. Shallower than this is the Lid. */
  DEPTH_M: 150,
  /** TUNABLE — seconds a hull may hold in the Lid before the water bites. */
  GRACE_S: 20,
  /** TUNABLE — unhealable bleed past the grace: fraction of max hull per second. */
  BLEED_FRACTION_PER_S: 0.01,
  /** TUNABLE — seconds of clean water below the Lid to win the full grace back. */
  RECOVERY_S: 30,
} as const;

/**
 * Derived — grace seconds recovered per second below the Lid, so bobbing along
 * the boundary spends more grace than it buys. Retuning RECOVERY_S retunes
 * this and nothing else.
 */
export const LID_GRACE_RECOVERY_PER_S = LID.GRACE_S / LID.RECOVERY_S;

/**
 * SPEC — docs/systems-depth.md §2 "Steering along the ground". The standing
 * order's held clearance above the local floor. Comfortably above
 * DEPTH.ARRIVAL_EPSILON_M so station keeping cannot chatter against the
 * arrival snap.
 */
export const FOLLOW_FLOOR = {
  /** TUNABLE — metres held above the seabed while following. */
  CLEARANCE_M: 30,
} as const;

/** SPEC — docs/systems-echo.md §6. */
export const SILENT_RUNNING = {
  /** Movement speed multiplier while silent (-45%). */
  SPEED_MULTIPLIER: 0.55,
  /** Pelagia pay only -20%. See docs/factions.md. */
  PELAGIA_SPEED_MULTIPLIER: 0.8,
  SIG_MIN: 3,
  SIG_MAX: 8,
  /** Breaking silence to fire is the loudest moment of an ambush. */
  BREAK_SILENCE_SIG_SPIKE: 40,
  BREAK_SILENCE_DURATION_S: 2,
} as const;

/**
 * Engine off — the state below Silent Running. docs/systems-echo.md §6.
 *
 * Silent Running trades weapons for quiet; this trades *movement* for it. A
 * third posture rather than a second flag on the first: it is read by movement
 * and by acoustics, and it is the one state in which a hull is not under power
 * at all.
 *
 * **SIG_FACTOR is a factor on the Silent Running figure, not on idle**, and
 * that is the whole reason the state is coherent. Derived from the quieter of
 * the two postures a hull can already reach, "below silence" holds for every
 * hull in the roster by construction — a Cruiser's engine-off figure is 3.8
 * against the 7.6 it runs silent at, and stays below it whatever the roster
 * does to idle SIG later. A factor on *idle* would have put the same Cruiser
 * at 13.8, louder than the silence it is supposed to sit under, and the bug
 * would have been four correct numbers and one wrong hull.
 */
export const ENGINE_OFF = {
  /** Half of what the hull manages with its drive still turning. */
  SIG_FACTOR: 0.5,
  /** Nothing in the water is truly silent; a hull at rest is still a shape. */
  SIG_FLOOR: 1,
} as const;

/**
 * A commander's one authored act — docs/characters.md, the seven *Commander
 * ability* entries (Varr-Kest, Osk, Marr, Anholt, Korrin, Adze, Sull), of which
 * Marr's is the only one with a mechanism behind it. These are campaign
 * abilities — the act a mission hands its commander — and not hero-unit kit:
 * skirmish picks a navy, never a commander, and characters.md stopped claiming
 * otherwise in #416.
 *
 * Here rather than in a mission literal for the rule `CLAUDE.md` states about
 * both: a mission's authored figures (a sounding's 400 m, a row's ceiling) live
 * in the literal because they are one mission's arithmetic, and these are not —
 * `characters.md` states Convocation's radius, its bonus and its duration as
 * facts about *Ysolde Marr*, which every mission she commands would have to
 * agree with. A second Commune mission that authored 2,100 m would not be a
 * tuning decision; it would be a different woman.
 *
 * What is *not* here is the SIG the act broadcasts. That figure is
 * docs/mission-convocation.md §4's — "every bell at once is authored at SIG 70",
 * and the word is the document's — because what a convocation costs is a fact
 * about the terrace it is rung on, and the same bell on a plateau with three
 * rows is a different invoice. It stays in the literal, beside the walk it
 * rings.
 */
export const COMMANDER_ABILITY = {
  /**
   * SPEC — docs/characters.md, Marr: "All Commune units within 2,000 m gain
   * +25% speed and immunity to Silent Running penalties for 15 s. Usable once
   * per match."
   */
  CONVOCATION_RADIUS_M: 2000,
  CONVOCATION_SPEED_MULTIPLIER: 1.25,
  CONVOCATION_DURATION_S: 15,
} as const;

/**
 * Ordnance — docs/systems-combat.md.
 *
 * The combat doc's §3 table is the acoustic contract for everything a weapon
 * puts in the water, and it is SPEC: a weapon in this game is differentiated by
 * *loudness, direction and delivery* rather than by a damage type, so these
 * numbers are the mechanic and not a tuning of it.
 *
 * The rule the whole group answers to is §1's second: **nothing lethal is
 * inaudible**. A torpedo runs at SIG 60 for its entire twenty seconds, which is
 * louder than every cruise SIG in the roster — that is what makes a short
 * time-to-kill survivable rather than arbitrary, and it is asserted by test
 * rather than left as an intention. §9.5 goes one step further and prices the
 * seconds: every band is also a count of Echo snapshots, and the verbs a
 * player can use inside them are listed against it. `combatBeat.test.ts`
 * measures those counts by playing the fights out.
 */
export const ORDNANCE = {
  /** SPEC — §5. The alpha-strike weapon, and the reason silence is a defence. */
  TORPEDO: {
    /** Sustained SIG of a running torpedo. §3. */
    SIG_RUNNING: 60,
    /** Burst added at the launcher on release. §3. */
    LAUNCH_SIG: 25,
    /** Metres per second — faster than every hull in the roster. §5. */
    SPEED_MPS: 160,
    /** Seconds before it goes inert. 20 s x 160 m/s is the 3,200 m run. §5. */
    RUN_TIME_S: 20,
    /** Full angle of the seeker's forward cone, degrees. §5. */
    SEEKER_CONE_DEG: 60,
    /** Baseline seeker sensitivity. Factions differ — §11. */
    SEEKER_HYD: 50,
    /**
     * §5, and §9's band: a Corvette survives one, wounded, and dies to two; a
     * Cruiser survives three and dies to four.
     *
     * Was 700 — one hit on a Corvette — until #463 asked what a player could
     * *do* between hearing a torpedo and losing the hull to it. A one-hit
     * kill gave the defender verbs (decoy, dive, silence, a mine astern) and
     * no reason to learn them: get one wrong and the fight was over before the
     * next snapshot. Half the damage keeps the torpedo the alpha-strike weapon
     * — two of a magazine of two still delete a Corvette — and makes the first
     * hit a lesson rather than an obituary.
     */
    DAMAGE: 350,
    /** §5 — one or two gun cycles kill it, if the gun is free. */
    MAX_HP: 40,
    /** Torpedoes aboard a launcher. Scarcity is the class identity. §5. */
    MAGAZINE: 2,
    /** TUNABLE — §5 puts rearm at a Bastion or Foundry, at this reach. */
    REARM_RANGE_M: 300,
    /** TUNABLE — seconds per torpedo taken aboard. §5. */
    REARM_TIME_S: 15,
    /**
     * TUNABLE — how sharply it can turn, degrees per second.
     *
     * Not decoration: at 160 m/s this is a turn radius of about 150 m, so a
     * hull that breaks across the seeker's nose late can make it overshoot.
     * A torpedo that turned instantly would be a hitscan weapon with travel
     * time, and §2's counter cycle needs it to be dodgeable as well as
     * decoyable.
     */
    TURN_RATE_DEG_S: 60,
    /** TUNABLE — metres per second it changes depth to follow a target. */
    DEPTH_RATE_MPS: 60,
    /** TUNABLE — proximity fuse margin beyond the target's own hull radius. */
    FUSE_MARGIN_M: 25,
    /**
     * Seconds between seeker re-evaluations.
     *
     * Deliberately the Echo Layer's own beat (1 / SIM.ECHO_HZ): a seeker is a
     * detection pass, detection is the expensive thing in this simulation, and
     * a torpedo has no more right to resolve the world at 60 Hz than a player
     * does. It also means a decoy deployed now is heard by the seeker within
     * the same 200 ms window a listener would have taken to notice it.
     */
    SEEKER_INTERVAL_S: 0.2,
    /** TUNABLE — seconds between wake marks laid along the run. */
    WAKE_MARK_INTERVAL_S: 1,
    /** TUNABLE — intensity each of those adds. A wake is faint by design. */
    WAKE_MARK_INTENSITY: 0.05,
  },

  /**
   * SPEC — §5. The decoy, and the reason a seeker re-acquires every pass.
   *
   * A noisemaker works by being **louder than the hull it protects** — SIG 70
   * against a Cruiser's 65 — which is also its whole cost: it is real noise at
   * your real position, so saving the hull spends the formation's quiet. Every
   * other listener on the map hears it too.
   */
  NOISEMAKER: {
    /** Sustained SIG for its short life. §3. */
    SIG: 70,
    /** Seconds it stays loud. §5. */
    DURATION_S: 8,
    /** Seconds before the same hull can deploy another. TUNABLE. */
    COOLDOWN_S: 20,
    /** TUNABLE — how far behind the hull it is released, metres. */
    DEPLOY_OFFSET_M: 60,
  },

  /**
   * SPEC — §5, "A screen, laid". The same emitter used as a weapon.
   *
   * Not a second `OrdnanceKind`: a laid decoy *is* a noisemaker, and has to be,
   * or a seeker would have to learn which decoys to believe. What differs is
   * who fires it and what it is asked to pretend, and both figures follow from
   * that.
   *
   * **Quieter and longer than the countermeasure**, which reads backwards until
   * you ask what each lie is for. A countermeasure must out-shout its own hull
   * for a few seconds to break a lock, so it is 70 for 8. A laid decoy must be
   * mistaken for a *hull* for as long as an approach takes, so it is 45 for 25
   * — 45 being the roster's cruise band, between a Corvette's 28 and a
   * Cruiser's 65. A decoy at 70 would announce itself as ordnance; one at 12
   * would be beneath notice. The lie has to be plausible, not loud.
   */
  LAID_DECOY: {
    /** Sustained SIG — inside the roster's cruise band, on purpose. */
    SIG: 45,
    /** Seconds it stays loud. Long enough to cover an approach. */
    LIFETIME_S: 25,
    /** Decoys aboard a Weaver (docs/units.md). */
    MAGAZINE: 3,
    /**
     * Seconds between lays, so a magazine strings out along the track rather
     * than arriving as one event. Three lays take 6 s, which at the Weaver's
     * 75 m/s is 450 m of screen — a front, not a point.
     */
    INTERVAL_S: 3,
  },

  /**
   * SPEC — §5. Point defence: a gun choosing to shoot at ordnance.
   *
   * "Not a shield; a gun *choosing*" — every cycle spent on a torpedo is a
   * cycle not spent on the hull that launched it, which is what keeps a
   * saturation volley a real answer to it.
   */
  POINT_DEFENCE: {
    /** Terminal range at which a gun may engage inbound ordnance. §5. */
    RANGE_M: 250,
  },

  /**
   * SPEC — §6. The detection formula pointed backwards.
   *
   * A mine does not emit and then wait to be found; it **listens, and waits for
   * you to be loud**. That inversion is the third pole of the weapon triangle:
   * silence walks through a minefield and a committed push does not. A
   * running torpedo is the loudest committed thing in the water, so it trips
   * mines too (§6, #463) — which is what makes a mine dropped astern the
   * hull-sized answer to the alpha strike.
   *
   * See `MINE_TRIGGER_LOUDNESS` below for the derivation, which is the
   * interesting part — the trigger is *solved* from two behaviours the doc
   * fixes, not chosen and hoped over.
   */
  MINE: {
    /** SIG while armed — the powered-down band. §3. */
    SIG_ARMED: 2,
    /** Burst on detonation. §3. */
    SIG_DETONATION: 90,
    /** Sustained SIG at the layer while a mine arms. Construction-grade. §6. */
    SIG_LAYING: 55,
    /**
     * Seconds a mine takes to arm, and that the laying hull broadcasts for. §6.
     *
     * Was 10 s. Shortened (#463) so a mine dropped astern is an answer to a
     * torpedo: a seeker passes the drop point `distance / 160` seconds after
     * the drop, so at 10 s nothing launched from inside 1,600 m — every
     * launch that can actually catch a running hull — met an armed mine. At
     * 3 s the drop works against anything still 480 m or more astern, which
     * is the read §9.5 asks the defender to make. A field of twelve is now laid
     * in 36 s of construction-grade broadcast rather than 120, which is the
     * price §6 pays for it and says so.
     */
    ARMING_S: 3,
    /** It hears out to here, and no further. §6. */
    TRIGGER_RADIUS_M: 150,
    /** Damage at the centre of the blast. §6. */
    DAMAGE: 300,
    /** ...falling linearly to zero at this radius. §6. */
    BLAST_RADIUS_M: 200,
    /** Live mines one player may hold. §6. */
    CAP_PER_PLAYER: 12,
    /** Seconds an armed mine survives before it is scuttled. §6. */
    LIFETIME_S: 300,
    /** Seconds between a mine re-checking what it can hear. TUNABLE. */
    SENSE_INTERVAL_S: 0.2,
    /**
     * Seconds a detonation keeps ringing, TUNABLE.
     *
     * Long enough for the Echo Layer to resolve it at least once: the pass runs
     * at SIM.ECHO_HZ, so an event that existed for a single 60 Hz tick would
     * carry a SPEC'd SIG of 90 that no listener in the game could ever hear.
     * The bang outliving the bomb by half a second is also simply true.
     */
    DETONATION_ECHO_S: 0.6,
    /**
     * The SIG the trigger is calibrated against — a Corvette at cruise.
     *
     * Written here rather than imported from the roster so this module stays
     * dependency-free, and guarded by a test that fails if the roster moves:
     * a trigger calibrated against a hull that no longer emits this much would
     * be a derivation from a number nobody could find.
     */
    TRIGGER_REFERENCE_SIG: 28,
  },

  /**
   * §8. The weapon that crosses depth bands.
   *
   * The cross-band *role* is SPEC and the numbers are TUNABLE, per §8. It
   * travels only in depth — it is dropped, not thrown — at the standard
   * descent and ascent rates from `DEPTH`, which are deliberately not
   * re-authored here: that asymmetry is docs/systems-depth.md's to own, and a
   * second copy of it would eventually disagree.
   *
   * This is the shallow factions' answer to the PR-3 sanctuary: a Directorate
   * hull below you is safe from guns and not from ordnance that falls.
   */
  DEPTH_CHARGE: {
    /** §8. */
    DAMAGE: 200,
    /** §8 — and the blast is measured in three dimensions, unlike a mine's. */
    BLAST_RADIUS_M: 180,
    /** Burst at detonation depth. §3. */
    SIG_DETONATION: 85,
    /** Sustained while it falls. Audible: the defender hears it coming down. */
    SIG_FALLING: 30,
    /**
     * Seconds before an un-detonated charge is scuttled — a fuse-failure
     * backstop, and **derived so it can never be shorter than the fall**.
     *
     * Sized against the **ascent** rate, which is the slow direction and
     * therefore the worst case. §8 says a charge is "dropped (or floated) into
     * the band above or below", and floating is the half that nearly did not
     * work: two drafts of this number were too short. A flat 30 s could not
     * reach the Abyssal band going down; deriving it from the descent rate gave
     * 91 s, which is still two seconds less than the 93 s a charge needs to
     * float up one band. Both failures looked identical from the outside — the
     * charge simply never arrived.
     *
     * Long, and harmlessly so: this is a fuse-failure backstop, not a travel
     * budget. A charge that reaches its set depth detonates there, and one that
     * cannot is imploding rather than idling.
     */
    LIFETIME_S: Math.ceil((DEPTH.MAX_M / DEPTH.ASCENT_RATE_MPS) * 1.35),
    /** Burst at the launcher on release. TUNABLE. */
    LAUNCH_SIG: 20,
    /** Seconds the detonation keeps ringing — see the mine's note. */
    DETONATION_ECHO_S: 0.6,
    /** Seconds before the same hull can drop another. TUNABLE. */
    COOLDOWN_S: 12,
  },
} as const;

/**
 * Per-faction combat doctrine — docs/systems-combat.md §11, docs/factions.md.
 *
 * Four traits, one per navy, and each is an argument about sound rather than a
 * stat bonus wearing a faction's colours. That is the bar `CLAUDE.md` sets for
 * a faction trait existing at all, and it is why these are here rather than in
 * the roster: they are doctrine, and doctrine belongs beside the rules it bends.
 *
 * Everything absent from a table below falls back to the general case, so a
 * faction with no entry is not penalised — it simply has no opinion.
 */
export const FACTION_COMBAT = {
  /**
   * SPEC — §11 and docs/factions.md: "+12% damage while SIG > 60."
   *
   * Reads the hull's *live* signature rather than a stat, so the Consortium
   * turns this on by being loud — descending, firing, working, or standing in a
   * storm. It is the one damage bonus in the design that a player switches on
   * by accepting a cost, which is the whole of the Klaxon doctrine: they win by
   * being found and being fine about it.
   */
  KLAXON: {
    FACTION: Faction.Bathyarch,
    SIG_THRESHOLD: 60,
    DAMAGE_MULTIPLIER: 1.12,
  },

  /**
   * SPEC — §3 and §11. The Knights fight with energy weapons, and an energy
   * discharge is the quiet class: +10 burst against the kinetic +25.
   *
   * A faction modifier rather than a per-hull stat because it *is* a faction
   * fact — the Order builds resonance weapons, whatever it hangs them on, and
   * a Knight-rigged Corvette discharges exactly as the Order's own Clarion
   * does. It replaces the hull's
   * own firing burst rather than scaling it, so a Knight discharge is quiet in
   * absolute terms and not merely quieter than it would have been.
   */
  ENERGY: {
    FACTION: Faction.Hadron,
    FIRING_SIG: 10,
  },

  /**
   * SPEC — §11: the Directorate's torpedoes carry "the best mobile ears in the
   * game, miniaturised".
   *
   * Kept clear of `PROPAGATION_MODEL.MAX_EXPECTED_HYD` (90), which the Echo
   * broadphase trusts as a hard ceiling — a faction that exceeded it would
   * quietly break the bound that keeps detection off an all-pairs comparison.
   */
  SEEKER_HYD: {
    [Faction.Directorate]: 70,
  } as Partial<Record<Faction, number>>,

  /**
   * TUNABLE — §11 makes the Commune the mine faction: "grown, living mines,
   * cheaper and more of them".
   */
  MINE_CAP: {
    [Faction.Pelagia]: 18,
  } as Partial<Record<Faction, number>>,
} as const;

/**
 * TUNABLE — how loud a piece of acoustic residue is, and how it merges.
 *
 * Echo Marks are priced through the same propagation model as everything else
 * (docs/systems-echo.md §7): a mark is an emitter whose SIG is its intensity
 * times the figure below, so a mark in a Thermal Vein is as hard to find as a
 * unit in one. Anything else would make residue a second, parallel detection
 * system that biomes did not apply to.
 *
 * The SIG figures are low on purpose, and the rule behind them is that
 * **residue is always quieter than the thing that made it**. An idle Corvette
 * is audible to a Light Scout at roughly 3.3 km; the echo of a destroyed
 * building reaches about 2.5 km, and a battle site under 2 km. A mark must be
 * findable by a scout that *goes there* and invisible to one that does not —
 * the doc calls this "the scouting economy", and it stops being one if the map
 * announces every fight to every base.
 *
 * The first draft had these at 32/46, which made the echo of a fight carry
 * further than the ships that fought it. That is not faint residue; that is a
 * second, louder detection system.
 */
export const ECHO_MARKS = {
  /** SIG a fresh battle site radiates at full intensity. ~1.9 km to HYD 70. */
  BATTLE_SIG: 12,
  /** A destroyed structure: bigger event, longer memory, ~2.5 km. */
  DESTROYED_STRUCTURE_SIG: 18,
  /**
   * Ceiling for the industrial hum.
   *
   * docs/economy.md §5 wants a listener to "estimate income within roughly
   * ±20% without ever seeing a structure", so the hum has to be loud enough to
   * find and its intensity has to mean something. It is capped below a
   * destroyed structure because an economy is a state, not an event.
   */
  HUM_SIG: 14,
  /**
   * A torpedo wake — the faintest residue there is, ~1.2 km to HYD 70.
   *
   * Quieter than a battle site because a wake is disturbed water rather than an
   * event: it should be readable by a scout that crosses the track and
   * invisible to one a kilometre off it, or the map would draw every torpedo
   * run for everybody and §12's inference stops being work.
   */
  TORPEDO_WAKE_SIG: 8,
  /**
   * Intensity one delivered cargo adds to the hum, as a fraction of full.
   *
   * Throughput, not existence: a refinery nobody hauls to is quiet, and
   * throttling to Trickle collapses the hum within seconds because the
   * deposits stop arriving. That is the counter-play docs/economy.md §5
   * promises, and it falls out of hooking this to the deposit rather than to
   * the building.
   */
  HUM_PER_DELIVERY: 0.5,
  /**
   * Seconds an unreinforced hum survives before the mark is dropped, and — at
   * a third of that — the time constant its level bleeds away on.
   *
   * The two together are what make the hum a measurement of a *rate*. It is a
   * leaky integrator: deliveries push the level up, time bleeds it down, and
   * where it settles is throughput. With the tau at 15 s, one harvester on a
   * forty-second round trip rests near 0.2 and four on a ten-second one rest
   * near 0.75, which is the spread §5 needs for "estimate income within
   * roughly ±20% without ever seeing a structure".
   */
  HUM_DECAY_S: 45,
  /**
   * Below this, a mark is dropped rather than kept as an inaudible entry.
   *
   * The residue read walks a path integral per mark per listener inside the
   * 2 ms Echo budget (#90, #106), so a mark radiating 0.3 SIG is pure cost.
   */
  MIN_AUDIBLE_INTENSITY: 0.02,
  /**
   * Marks of one kind within this radius reinforce rather than accumulate.
   *
   * Without it a long fight leaves hundreds of overlapping marks and the
   * residue layer becomes both a performance problem and an unreadable smear.
   */
  MERGE_RADIUS_M: 320,
  /** Hard cap on live marks, so a pathological match cannot unbound the pass. */
  MAX_MARKS: 256,
} as const;

/**
 * The Hadron tithe — docs/economy.md §6.
 *
 * "Knights take a tithe: fixed periodic income from each chapter-house,
 * independent of extraction, plus crystal cut at unmatched efficiency."
 *
 * **Flat, not per-structure**, and that is forced rather than chosen. §6's next
 * sentence is that they are "the only faction whose economy does not scale
 * with map control", and an income paid per Sounding Spire would scale with
 * exactly that. The chapter-houses are the Order's nine home institutions in
 * Resonance Fields (docs/factions.md), not battlefield buildings: they tithe to
 * the Order, the Order funds the expedition, and taking ground does not change
 * the stipend. It stops when the Bastion falls, because that is the expedition
 * ending rather than the Order's income drying up.
 */
export const HADRON = {
  /**
   * Nodules per second, paid while a Knight commander's Bastion stands.
   *
   * TUNABLE, and set by measurement rather than by taste. §6 makes their
   * economy "the thinnest in the game" and §9 makes their ceiling low and
   * their win condition early, so this has to be a floor that does not fall
   * rather than an income that competes.
   *
   * Swept against a Consortium opponent, three seeds each, reading gross
   * income per minute (Hadron against Consortium):
   *
   *     0.0/s ->  29 v 275      1.5/s -> 165-181 v ~276
   *     0.5/s ->  59 v ~280     2.0/s -> 148-176 v ~275
   *     1.0/s ->  89 v 283
   *
   * 1.5 looked like the knee there and was wrong, for a reason worth keeping:
   * **a flat income is proportionally larger in a poorer game.** That sweep is
   * a duel, where the field earns about 275 a minute. The four-faction
   * baseline earns 165, so the same 90-a-minute tithe took the Knights to 177
   * — the *richest* faction on the map, which flatly contradicts §6's
   * "thinnest economy in the game". Calibrating a flat number against a single
   * matchup is how you ship that mistake.
   *
   * At 1.0 they land on 108 in the four-faction baseline: the poorest of the
   * four (against 191, 178 and 145) and well clear of the 65 they starved at,
   * which is what §6's "thinnest economy in the game" should look like. Their
   * win rate comes out level with the two richest factions, and the guard-rail
   * reads held at 66% of the field's income across long matches — a floor,
   * not a competitor.
   *
   * The step from 0.5 to 1.0 is superlinear, and that is the mechanism §6
   * describes: it is the point where the budget covers a hull, and a hull
   * earns. "Their economy is really a budget, spent once."
   */
  TITHE_PER_S: 1,
  /**
   * SPEC — §6: crystal "cut at unmatched efficiency (2.2x everyone else's
   * yield per node)".
   *
   * Per *node*, so the field depletes by what was cut and the Knights bank
   * 2.2x the value of it. A better cut, not faster mining — which also keeps
   * the Abyssal round trip exactly as expensive for them as for anybody, and
   * that trip is the whole reason crystal is worth having.
   */
  CRYSTAL_YIELD_MULTIPLIER: 2.2,
  /**
   * SPEC — §6: the haulers are not an industry. Nodules are banked at half
   * the field's yield per load, applied at the deposit exactly as the crystal
   * premium is, so the field depletes by the full cut and the Order keeps
   * half. The tithe was calibrated in a baseline where nobody's haulers lived
   * long enough to matter (#440); once matches decided, tithe plus a full
   * extraction economy made the Knights the richest navy on the map and an
   * 80–100% duel winner against every other (#454). This is where "30,000
   * people cannot run an industrial base" becomes a number.
   */
  NODULE_YIELD_MULTIPLIER: 0.5,
} as const;

/**
 * Bloom-share — docs/economy.md §6, the Commune's economy.
 *
 * "Plateau blooms yield continuously, without a harvester loop, provided the
 * plateau is theirs." The tithe's idea anchored to ground
 * (docs/mission-tend.md §13): no drive-mine-haul-deposit cycle, no throttle,
 * no cargo — a node pays while a live Commune hull *tends* it, and stops the
 * tick it is untended. "Held" is tended, not possessed (docs/mission-tend.md
 * §4): a hull driven off, killed, or running silent stops the share, because
 * Silent Running stops the work (docs/systems-echo.md §6 — "SIG falls to
 * single digits, the share stops accruing", docs/mission-tend.md §3).
 *
 * The shape is SPEC; both numbers are TUNABLE. The balance guard-rail
 * (docs/systems-echo.md §10) prices the exposure rather than the rate:
 * bloom nodes are *surface plateau* ground — Shelf band, where everyone can
 * see them and almost anyone can reach them — so the quietest faction earns
 * its living on the most reachable ground on the map. maps.test.ts holds
 * authored nodes to that band, because the exposure is the mechanic.
 */
export const BLOOM_SHARE = {
  /**
   * Nodules per second, per tended node. TUNABLE.
   *
   * Set with the tithe's measurement lesson in mind — a flat income is
   * proportionally larger in a poorer game — but not yet measured, because no
   * skirmish map authors bloom nodes today; the balance harness prices this
   * the day one does. Three tended nodes at 0.8/s are 144 nodules a minute,
   * inside the 165-275/min band the harvester economies were measured at
   * (docs/economy.md §6), for a faction that still runs harvesters.
   */
  PER_NODE_PER_S: 0.8,
  /**
   * How close a hull must stand to tend a node, metres. TUNABLE.
   *
   * Horizontal, like the Echo Layer's own geometry: the Shelf is 400 m of
   * water at most, so a column check would price nothing the map does not
   * already price. Sized to a garden rather than a territory — holding a
   * plateau's nodes takes hulls *on* them, not a picket within earshot.
   */
  TEND_RADIUS_M: 400,
} as const;

/**
 * Scuttling — docs/game-identity.md "Match Structure".
 *
 * The second way a commander leaves a match. Killing a Bastion is the first
 * and the one the game is about; this is the rule that stops a commander who
 * has already lost — no harvester, no queue, no bank, no income — from
 * standing in the water for the rest of the clock because nobody has got
 * around to finishing them.
 *
 * The doc states the window and states why it is a window rather than an
 * instant: the position has to be a state, not a frame. Everything else the
 * rule reads is the simulation's own (a harvester is alive or it is not), so
 * this is the only number the rule needs.
 */
export const CONCESSION = {
  /**
   * SPEC — docs/game-identity.md: the position must hold continuously for
   * sixty seconds of match time before the crew scuttles.
   */
  WINDOW_S: 60,
} as const;

/**
 * Match lifecycle — docs/tech-stack.md.
 *
 * TUNABLE. The one number with an argument behind it is the reconnection
 * grace window: long enough to survive a dropped connection or a browser
 * refresh, short enough that a match is not held hostage by someone who has
 * closed the tab and gone to lunch.
 */
export const LIFECYCLE = {
  /** Seconds a dropped player keeps their slot and their fleet. */
  RECONNECT_GRACE_S: 90,
  /**
   * Players a lobby needs before it will start.
   *
   * One, not two, and deliberately. It was written when there was no AI
   * opponent and a solo lobby was the only way to exercise the game at all;
   * a skirmish commander exists now, and one seat is still right, because a
   * mission seats exactly one player and concludes on its own authored terms
   * (docs/campaign.md). Raising this to 2 would refuse the campaign.
   */
  MIN_PLAYERS: 1,
  /**
   * Seconds a resolved match lingers before the room closes itself.
   *
   * Long enough to read the result and call a rematch; short enough that an
   * abandoned room does not hold a slot on the server forever.
   */
  POST_MATCH_S: 180,
} as const;

/**
 * Mission conventions — docs/campaign.md §10.
 *
 * The conventions the doc states for *every* mission, so a mission literal is
 * held to them at build time rather than remembered by whoever writes the next
 * one. `missions.test.ts` reads these; nothing at runtime does.
 */
export const MISSION = {
  /**
   * SPEC — §10: "no mission fails on a timer alone; every failure state is
   * something the player can hear coming for at least sixty seconds". The test
   * asserts the gap between a mission's resolving beat and the loud beat before
   * it, which is the only way a prose rule of this shape can be enforced.
   */
  FAILURE_TELEGRAPH_S: 60,
  /** SPEC — §10: 12–25 minutes, the two authored sieges excepted. */
  LENGTH_MIN_S: 720,
  LENGTH_MAX_S: 1500,
  /**
   * SPEC — docs/mission-tend.md §6: a sweep that hears something on its lane
   * files it, "and the pair's course bends a few degrees toward what it heard".
   *
   * A few degrees, and not a re-aim. The runtime used to answer a filing by
   * ordering the sweeping hulls to the position they heard, which is a
   * different mechanic wearing the same word: on docs/mission-nineteen.md's map
   * it flew both watch hulls off their chart, across the north wall's coils and
   * into six armed Knight hulls, so a run in which the player gave no order at
   * all had no watch left by 02:30 — and the watch is that mission's only
   * observer, so §8's count could never be met.
   *
   * The bend is what the design asks for and is also the safe shape: it shows
   * the player they were heard without handing a mission's scripted transit to
   * whoever is loudest.
   */
  SWEEP_BEND_DEG: 5,
} as const;

/**
 * The Drift — docs/bestiary.md §2, §5, §6.
 *
 * The aggro ladder's durations are SPEC (§2's table); the population and yield
 * figures are TUNABLE prototype numbers.
 */
export const DRIFT = {
  /** SPEC — §2. Seconds at or above Interest before a creature turns toward you. */
  INTEREST_DWELL_S: 4,
  /** SPEC — §2. An Interested creature commits after this long regardless. */
  COMMIT_AFTER_INTERESTED_S: 20,
  /** SPEC — §2. Below Interest for this long and it starts to disengage. */
  COOL_AFTER_S: 30,
  /** SPEC — §2. How long disengaging takes. */
  COOLING_S: 45,
  /** SPEC — §2. An Interested creature closes to about here. */
  INTEREST_APPROACH_M: 1200,
  /** SPEC — §2. "Fresh kill or wreck within 800 m: +15 flat." */
  WRECK_RADIUS_M: 800,
  WRECK_AGGRO_BONUS: 15,
  /** SPEC — §2. "Target is a Directorate unit: ×0.4." They taste worse. */
  DIRECTORATE_AGGRO_MULTIPLIER: 0.4,

  /**
   * How fast a creature changes depth while chasing, in metres per second.
   *
   * Slower than any hull's descent (45 m/s): a fish repositions, it does not
   * blow ballast. Fast enough that a pack closing horizontally arrives at the
   * right depth around the same time it arrives at all.
   */
  VERTICAL_SPEED_MPS: 12,

  /*
   * Transit damage is deliberately *not* a constant of its own: a Sounder
   * grinding through a building does what a Sounder does, at its own
   * `damagePerS`, and the only difference from a bite is that transit needs no
   * aggro. Applied per tick while overlapping, so how badly a structure fares
   * is how long the colossus spends inside it — which is its radius, and
   * therefore how big a thing you built in its way.
   *
   * At 220/s and 30 m/s of swim, a centre-line pass gives roughly: Sentinel
   * Turret 6.5 s (destroyed), Refinery 11.8 s (destroyed), Foundry 13.2 s
   * (destroyed), Bastion 17.2 s for 3,784 of 5,000 — badly hurt, still
   * standing. A glancing pass costs less. That is docs/bestiary.md §4's
   * "destroys structures by transit" with the elimination condition surviving
   * one crossing, which is the line between dread and a coin nobody flipped.
   */
  /**
   * Hull length at or above which a hull is in the Sounder's way at all.
   *
   * "Ignores small units" (§4). Set so the Cruiser and the Abyssal Submersible
   * are hit and nothing else is — the same reading of "large" that kelp uses,
   * and for the same reason: it is the roster's own break point.
   */
  TRANSIT_MIN_HULL_M: 95,
  /**
   * SIG spike on something a Sounder just ground through.
   *
   * A building coming apart under a colossus is the loudest thing that can
   * happen to it, and the map should hear it — the same argument the eruption
   * makes with CAUGHT_SIG, one step louder because this is structural failure
   * rather than a battering.
   */
  TRANSIT_SIG: 70,

  /**
   * Hard cap on live fauna.
   *
   * Fauna are entities in the Echo pass, which owns a 2 ms budget that #90
   * already had to fight for. The issue that asked for the Drift was explicit:
   * do not merge a population that pushes a normal match over budget. The cap
   * is what makes that a guarantee rather than a hope, and the PR reports the
   * measured cost at the cap.
   */
  MAX_POPULATION: 48,
  /** How often a creature re-evaluates what it can hear, in seconds. */
  SENSE_INTERVAL_S: 0.5,

  /**
   * No creature is seeded within this of a starting position.
   *
   * A creature that begins the match on top of a base was not *drawn* to
   * anything — it was placed there, and the opening becomes a siege nobody
   * chose. §5's proposition is that fauna answer your noise, which needs them
   * to start somewhere else and come to you.
   *
   * Measured: without this, a Draymaw pack had the Ventfront Divide's opening
   * Bastion down to 3,051 of 5,000 hull inside a minute of a fresh match.
   */
  SPAWN_EXCLUSION_M: 2600,

  /** SPEC — §5. Non-Directorate players sell remains through rendering contracts. */
  RENDERING_CONTRACT_RATE: 0.3,

  /**
   * How far a Rasp swarm smells residue, in metres — docs/bestiary.md §4.
   *
   * A proximity test like WRECK_RADIUS_M above, and for the same reason: being
   * drawn to a wreck is scent, not hearing, so the thermocline and terrain do
   * not gate it. TUNABLE, but sized against the swarm's speed so §4's "arrive
   * at battle sites roughly 40 s after the battle" is distance over speed
   * (2,000 m at 48 m/s) rather than a timer pretending to be behaviour.
   */
  SCAVENGE_RANGE_M: 2000,
  /** Close enough to feed. Inside this the swarm stops travelling and strips. */
  SCAVENGE_FEED_RADIUS_M: 150,
  /**
   * How many times faster a fed-on mark decays than one left alone.
   *
   * SPEC in shape — docs/bestiary.md §4 resolves the swarm's salvage-stripping
   * as an acoustic act: the residue is eaten "roughly four times faster" while
   * the feeding SIG stands in its place. The figure itself is TUNABLE.
   */
  SCAVENGE_STRIP_FACTOR: 4,

  /**
   * SPEC — §4. "Lampfry scatter from any entity within 300 m regardless of
   * SIG, including a silent-running scout."
   *
   * A proximity test in three dimensions, and deliberately **not** routed
   * through the Echo Layer: the trigger exists precisely so that silence
   * cannot suppress it, and a SIG gate anywhere in this path would quietly
   * reintroduce the thing it answers.
   */
  LAMPFRY_SCATTER_RADIUS_M: 300,
  /** SPEC — §4. "Scattered shoals reform 25 s after the last intruder leaves." */
  LAMPFRY_REFORM_S: 25,

  /** SPEC — §4. "A Tetherjelly cluster lowers local PF by 0.10 in a 250 m radius." */
  JELLY_PF_DELTA: 0.1,
  JELLY_RADIUS_M: 250,
  /**
   * Hull points a cluster loses per second in Failing water — §6's
   * "Tetherjelly fields thinning: local PF rises toward baseline", as a rate.
   * TUNABLE: at 40 hp a cluster survives ~40 s of failing water, so a field
   * thins over a minute or two rather than vanishing on a threshold tick.
   */
  JELLY_WITHER_HP_PER_S: 1,

  /**
   * SPEC — §4. A Hollow "does not move until something loud passes within
   * 500 m." Measured in three dimensions, like a bite: a convoy 500 m
   * horizontally *and* 400 m vertically from the ambush is not passing it.
   */
  HOLLOW_TRIGGER_RANGE_M: 500,

  /**
   * Drift Health — §6. "The map can be killed."
   *
   * A coarse region grid rather than per-biome, because health is a thing that
   * happens to *places*: you can strip one vent field bare while the trench a
   * kilometre away is untouched.
   */
  HEALTH_REGIONS: 4,
  HEALTH_START: 88,
  /** Health lost per fauna kill in a region. */
  HEALTH_PER_KILL: 4,
  /** Health lost per second per unit of SIG above the threshold, in a region. */
  HEALTH_SIG_THRESHOLD: 60,
  HEALTH_SIG_DRAIN_PER_S: 0.02,
  /**
   * Recovery, per second, for a cell whose SIG sum is under the threshold.
   *
   * TUNABLE, but bounded by the design: §6 says the map "recovers slowly — far
   * more slowly than a match lasts", and campaign.md §2 rule 5 carries Drift
   * Health between missions on the same map, so what a match does to the
   * ground has to outlast the match. 0.02 puts Dead-to-Failing at about 42
   * minutes and Dead-to-Healthy past an hour against `MISSION.LENGTH_MAX_S`'s
   * 25, and heals a kill's 4 in about three and a half. The previous 0.06 had
   * a stripped cell Healthy before a long mission ended (#365).
   *
   * Recovery and drain never apply in the same tick — a cell over the
   * threshold wears and one under it heals — so the threshold is exactly the
   * 60 the documents state, not 60 plus whatever recovery would cancel.
   */
  HEALTH_RECOVERY_PER_S: 0.02,
  /**
   * How much a region heals in the gap between two campaign missions on the
   * same map — TUNABLE, and **zero on purpose**.
   *
   * campaign.md §2 rule 5 wants the return to be a *reading*: "a quieter,
   * deader, more legible version of it, and nobody tells them why". The
   * cheapest way to break that is to heal the ground behind the player's back,
   * because they cannot see the heal either.
   *
   * Zero rather than a small number, for two reasons that are not about taste.
   * There is no clock between missions — the board has no calendar and the
   * campaign has no elapsed time (§1: the prologue first, then the order is
   * free), so a rate has nothing to integrate against. And the record is held
   * *client-side*, so any elapsed-time input to a recovery would be a number
   * the client chooses: "wait a week and the map comes back" is a lever, and a
   * lever is the one thing the seeding validation exists to refuse.
   *
   * So the carry is exact and this constant is the lever if that is ever
   * wrong. Applied only to a region still living, because §6's table makes
   * Dead permanent and `DriftHealth.tick` already honours that within a match.
   */
  HEALTH_CARRY_RECOVERY: 0,
  /** §6's table, as thresholds. */
  HEALTH_STRAINED: 75,
  HEALTH_FAILING: 50,
  HEALTH_COLLAPSING: 25,
} as const;

/**
 * Thermal Draw — docs/economy.md §2.
 *
 * The only resource in the design that is a **rate**. SPEC fixes the tap's
 * sustained signature at 55-75; everything else here is TUNABLE.
 *
 * The numbers are sized so a player who builds nothing but a Bastion never has
 * a deficit, and a player running a Foundry and a Refinery needs one tap.
 * Power should be a thing you plan for, not a tax you pay for existing.
 */
export const THERMAL_DRAW = {
  /** Capacity one working tap provides. */
  CAPACITY_PER_TAP: 6,
  /**
   * Floor on how slowly a starved consumer runs.
   *
   * Not zero. A deficit has to be a setback the player can trade their way out
   * of, and a production line frozen solid is a spiral: you cannot build the
   * tap that would fix it.
   */
  MIN_SATISFACTION: 0.25,
  /**
   * Bonus capacity a Bathyarch hull earns by stabilising a vent.
   *
   * docs/hazards.md §1: "Bathyarch can stabilize vents for energy boosts."
   * *Energy* — so the boost is draw capacity, which is the power resource,
   * rather than the nodule trickle the first implementation paid out before
   * Thermal Draw existed.
   */
  STABILISE_CAPACITY: 4,
} as const;

/**
 * Environmental hazards — docs/hazards.md §1 and §5.
 *
 * TUNABLE throughout: the doc specifies behaviour and faction interactions,
 * not numbers. The one figure that is a *design* constraint rather than a
 * tuning knob is the warning duration, and it is long on purpose — `CLAUDE.md`
 * makes the target emotion dread rather than confusion, and a hazard the
 * player cannot walk out of is confusion.
 */
export const HAZARDS = {
  ERUPTION: {
    /** Quiet between eruptions. */
    DORMANT_S: 55,
    /**
     * Telegraph.
     *
     * Sized against the *slowest* hull in the roster clearing the *largest*
     * authored plume: a Bulwark at 30 m/s needs 23.3 s to cross 700 m from
     * the centre (it was 20 s for the Harvester's 40 m/s, until the rung's
     * roster brought a slower hull, #461). The first draft was 9 s, which
     * meant a Harvester parked on a vent could not escape however early it
     * started — a warning nobody can act on is not a warning, and `CLAUDE.md`
     * calls that confusion rather than dread. There is a test that keeps this
     * honest, against whichever hull is slowest.
     */
    WARNING_S: 25,
    /** Erupting. */
    ACTIVE_S: 4,
    /** Subsiding: damage tapers rather than stopping dead. */
    DECAY_S: 5,
    /**
     * Hull damage per second at the centre, falling off linearly to the rim.
     *
     * Solved rather than picked, from the rule the number should express: **one
     * full pass at the centre of a plume is lethal to the most fragile hull in
     * the roster.** A pass is ACTIVE_S at full rate plus DECAY_S at half, so
     * `damage x (4 + 5/2) = damage x 6.5`, and a Harvester is 300 HP —
     * 300 / 6.5 = 46.2, rounded up so the centre actually kills.
     *
     * It was 90, which is 585 at the centre: not "lethal to a Harvester" but
     * lethal to nearly everything, twice over. That surfaced as a map problem
     * rather than a tuning one (#179). On Ventfront Divide the Resonance
     * Crystal field sits 500 m inside *both* authored plumes, where the falloff
     * is 0.286 — and 90 put a combined pass at 334 HP against a 300 HP hull, so
     * the resource that gates the tech tree could not be worked at all by a
     * standing order. At this figure the same combined pass is 175, which
     * wounds badly and leaves the trip possible.
     *
     * TUNABLE, like the rest of this group: docs/hazards.md fixes the
     * behaviour and the faction interactions, never the figures. What it does
     * fix is that the warning must be actionable (§ "the warning phase is a
     * design constraint"), and this is the other half of that bargain — acting
     * on the warning saves you, ignoring it costs you the hull.
     *
     * `hazards.test.ts` pins the derivation, so a change to the roster's
     * frailest hull or to the phase durations fails loudly instead of quietly
     * making eruptions toothless.
     */
    DAMAGE_PER_S: 47,
    /** Structures "take reduced damage (but still vulnerable)" — doc §1. */
    STRUCTURE_DAMAGE_MULTIPLIER: 0.35,
    /** Metres per second a caught hull is pushed outward. */
    KNOCKBACK_MPS: 110,
    /**
     * SIG added to a hull caught in the plume.
     *
     * The reason an eruption is an *acoustic* event and not just damage: a
     * unit battered by a vent rings like a struck bell, and the whole map can
     * hear it. Being hurt and being found are the same moment.
     */
    CAUGHT_SIG: 55,
    /** Pelagia "suffers extra damage (organic hulls)" — doc §1. */
    PELAGIA_DAMAGE_MULTIPLIER: 1.5,
    /** Directorate "units resist knockback" — doc §1. */
    DIRECTORATE_KNOCKBACK_MULTIPLIER: 0.25,
    /** Hadron "can predict eruptions via resonance sensors" — doc §1. */
    HADRON_WARNING_BONUS_S: 6,
    /** Bathyarch "can stabilize vents for energy boosts" — doc §1. */
    BATHYARCH_STABILISE_S: 30,
    BATHYARCH_ENERGY_PER_S: 1.5,
  },
  STORM: {
    DORMANT_S: 100,
    WARNING_S: 12,
    ACTIVE_S: 30,
    DECAY_S: 8,
    /**
     * What the storm multiplies PropagationFactor by inside its area.
     *
     * Below 1, so sound scatters and resolution collapses: the storm is an
     * attack on *information*, not on hulls, which is what makes it a
     * different shape of hazard from an eruption. It reaches the Echo Layer as
     * a write to the per-cell PF array rather than as a new code path, so
     * biome and storm compose for free.
     */
    PF_MULTIPLIER: 0.35,
    /** Light damage from "random sonic shockwaves" — doc §5. */
    DAMAGE_PER_S: 12,
    STRUCTURE_DAMAGE_MULTIPLIER: 0.35,
    /** Hadron Knights "gain temporary buffs" — doc §5. Added HYD. */
    HADRON_HYD_BONUS: 25,
    /** Pelagia "organic tech becomes unstable" — doc §5. Added SIG. */
    PELAGIA_SIG_PENALTY: 20,
    /** Bathyarch "machinery malfunctions" — doc §5. Speed multiplier. */
    BATHYARCH_SPEED_MULTIPLIER: 0.7,
  },
  COLD_SHOCK: {
    DORMANT_S: 70,
    /**
     * Telegraph, sized the way the eruption's is: the *slowest* hull clearing
     * the *largest* authored current from its centre. A Bulwark at 30 m/s
     * covers 660 m in this window against a 600 m site (18 s was enough for
     * the Harvester's 40 m/s, until #461), so leaving is always possible for a
     * player who starts when told. A current does no damage, so this is not a
     * matter of survival — but doc "Readability" asks every hazard to
     * telegraph, and a current you cannot see coming is one you can only
     * discover by having already lost your line.
     */
    WARNING_S: 22,
    /**
     * Long, and that is the design. An eruption is an event you flee; a
     * current is a condition you route around, and it has to outlast a
     * crossing for routing to mean anything.
     */
    ACTIVE_S: 40,
    DECAY_S: 8,
    /**
     * Metres per second the water carries a hull along the site's bearing.
     *
     * A quarter of the slowest hull's speed (Harvester, 40 m/s): enough that
     * riding the flow is visibly faster and driving into it is visibly slower,
     * without a current ever being a wall. Applied as displacement per tick,
     * never as momentum — see the note in hazards.ts.
     */
    DRIFT_MPS: 10,
    /** "Sudden movement speed reduction" — doc §8. Everyone but Hadron. */
    SPEED_MULTIPLIER: 0.8,
    /** "Pelagia slows dramatically" — doc §8. */
    PELAGIA_SPEED_MULTIPLIER: 0.55,
    /**
     * SIG added to a hull driving *straight into* the flow, tapering to zero
     * as its heading comes round to the current's.
     *
     * The sound argument, and the reason a current is a decision rather than a
     * toll (doc §8, "Holding station against a current is loud"). Pitched
     * between a storm's Pelagia penalty (20) and nothing: loud enough that a
     * scout crossing head-on gives away a bearing it would rather keep, quiet
     * enough that it is not an eruption's klaxon at 55.
     */
    FIGHTING_SIG: 18,
  },
  KELP: {
    /**
     * "Bathyarch can burn kelp with thermal cutters" — doc §4, and note that
     * cutting is *all* they get: the Consortium answer to kelp is to destroy
     * it, not to swim better, so their own drag is the plain one.
     *
     * There is no faction without an opinion about kelp — §4 gives all four an
     * interaction — so there is no neutral multiplier to fall back on.
     */
    BATHYARCH_SPEED_MULTIPLIER: 0.7,
    /**
     * Hull length at or above which "large units" begins — docs/hazards.md §4.
     *
     * Catches the Cruiser (130 m) and the Abyssal Submersible (95 m) and
     * nothing else, which is the roster reading of "large". The Submersible is
     * Directorate, and the Directorate tear through kelp anyway, so in practice
     * this is the Cruiser's problem and the doc's "big things do badly in kelp"
     * lands on exactly the hull it should.
     */
    LARGE_HULL_M: 95,
    /**
     * The floor a large hull drags at. Deliberately a floor and not a stop:
     * §4 declines to model immobilisation, and something that never quite
     * halts is the honest version of what that clause is for.
     */
    LARGE_SPEED_MULTIPLIER: 0.4,
    /** "Pelagia moves freely" — doc §4. Untouched, and so also unheard. */
    PELAGIA_SPEED_MULTIPLIER: 1,
    /** "Abyssal bio-units tear through kelp" — doc §4. */
    DIRECTORATE_SPEED_MULTIPLIER: 0.9,
    /**
     * "Hadron units get stuck more easily (sharp fins)" — doc §4.
     *
     * With immobilisation unmodelled, "stuck more easily" is the worst drag in
     * the game rather than a seizure: sharp fins catch, and catching costs both
     * speed and quiet.
     */
    HADRON_SPEED_MULTIPLIER: 0.5,
    /**
     * SIG added to a hull *moving* in a gripping field, scaled by how hard the
     * field is actually dragging on it (1 - its own multiplier).
     *
     * The sound argument, and the trade the biome exists for: kelp is PF 0.55
     * and hides you, but pushing through it is work and work is noise. A hull
     * that stops is silent. Pelagia pay nothing because nothing drags on them.
     */
    DRAG_SIG: 30,
    /** How long a blast holds the canopy open — doc §4. */
    BLAST_CLEAR_S: 12,
    /**
     * Seconds of continuous Bathyarch presence needed to open a field, and the
     * seconds it takes to close again once they leave.
     *
     * Cutting is deliberately *not* instant. Presence-suppression made a lone
     * scout switch off a twelve-hundred-metre field by passing through it, and
     * left the Consortium better in kelp than the faction whose doctrine is
     * kelp. Charging up means burning a path is what §4 says it is: a
     * commitment to stand in the quietest biome on the map, being loud, while
     * the canopy comes apart.
     */
    BATHYARCH_BURN_S: 6,
    /**
     * SIG added to a Bathyarch hull inside a field, cutters running.
     *
     * The sound argument for their interaction, and what stops burning being a
     * free counter to the map: thermal cutters are industrial machinery in the
     * one biome built for hiding, so clearing the maze core announces that you
     * are clearing the maze core. Paid whether the hull is moving or not —
     * unlike drag, cutting is work you are doing on purpose.
     */
    CUTTER_SIG: 40,
  },
} as const;

/** SPEC — docs/systems-echo.md §4 and §7. Seconds. */
export const PERSISTENCE = {
  /** Tier 1-2 contacts linger as ghost markers, then fade. */
  GHOST_MARKER_DECAY_S: 20,
  /**
   * TUNABLE — what one "engagement" is, for the under-fire alert
   * (docs/ui-ux.md §5, §11): a hull hit again within this many seconds is the
   * same fight, and raises nothing new. The log records the first blow of an
   * engagement rather than every round of it, and the cue and the log share
   * this number so the ear and the record cannot disagree.
   */
  UNDER_FIRE_REARM_S: 10,
  /** Echo Marks: acoustic residue left on the terrain layer. */
  BATTLE_SITE_S: 90,
  DESTROYED_STRUCTURE_S: 180,
  /**
   * A torpedo wake — TUNABLE, and the shortest memory the layer keeps.
   *
   * Half a battle site: a wake is water that was pushed aside and is already
   * closing again, and a track that outlived the fight it belonged to would
   * tell a scout where ordnance flew long after that stopped being news.
   */
  TORPEDO_WAKE_S: 45,
  /** Minimum HYD required to read Echo Marks at all. */
  ECHO_MARK_MIN_HYD: 40,
} as const;

/**
 * TUNABLE — the propagation model itself.
 *
 * docs/systems-echo.md gives the detection *relationship*
 * (`SIG x PF >= Threshold(distance, HYD)`) and the tier multipliers, but never
 * defines Threshold(). This is our prototype implementation of it; see echo.ts
 * for the formula.
 */
const REFERENCE_DISTANCE_M = 100;
const ATTENUATION_EXPONENT = 1.6;
const BASELINE_HYD = 50;

/**
 * The model's single free parameter — the perceived loudness a baseline
 * listener needs to register Tier 1.
 *
 * Rather than picking a number and hoping, it is *derived* from a figure the
 * design docs do pin down: active sonar reveals the pinger at Tier 4 to
 * listeners exactly 2,400 m away (docs/systems-echo.md §5). Solving the
 * propagation formula for that case fixes the threshold and makes the spec'd
 * ping radii fall out of the general model instead of being special-cased.
 *
 * Consequence: changing REFERENCE_DISTANCE_M or ATTENUATION_EXPONENT
 * automatically recalibrates the whole detection curve to keep the ping honest.
 */
const BASE_THRESHOLD =
  (ACTIVE_SONAR.EMITTER_SIG *
    Math.pow(REFERENCE_DISTANCE_M / ACTIVE_SONAR.SELF_REVEAL_RADIUS_M, ATTENUATION_EXPONENT)) /
  TIER_THRESHOLD_MULTIPLIER.TRACK;

/**
 * The picket's ping — a second set of figures for the same mechanism, and
 * **derived from the first rather than authored beside it**.
 * docs/systems-echo.md §5, "A ping a hull fires itself".
 *
 * One number is chosen: the emitter SIG, which docs/units.md fixes at 80 for
 * the Beacon against the 95 a commander's button costs. Everything else falls
 * out of the propagation model at that loudness. The range scale is the
 * attenuation curve solved for the ratio of the two emitters, so:
 *
 *   - the Tier-4 reveal drops from 900 m to about 808 m, and
 *   - the self-reveal from 2,400 m to about 2,156 m.
 *
 * The self-reveal figure is *not* applied anywhere in code, and that is the
 * point: a quieter emitter is heard less far by the general detection pass,
 * with no rule of its own. It is stated here because the doc quotes it, and
 * there is a test that the model actually produces it.
 *
 * Consequence, and the reason for deriving: move ATTENUATION_EXPONENT or the
 * spec'd 2,400 m and the cheap ping recalibrates with the expensive one,
 * instead of quietly becoming the better button.
 */
const CADENCE_EMITTER_SIG = 80;

const CADENCE_RANGE_SCALE = Math.pow(
  CADENCE_EMITTER_SIG / ACTIVE_SONAR.EMITTER_SIG,
  1 / ATTENUATION_EXPONENT
);

export const CADENCE_PING = {
  /** SPEC — docs/units.md, Beacon. The one chosen number. */
  EMITTER_SIG: CADENCE_EMITTER_SIG,
  /** Derived: the hard Tier-4 radius, scaled by the attenuation curve. */
  REVEAL_RADIUS_M: ACTIVE_SONAR.REVEAL_RADIUS_M * CADENCE_RANGE_SCALE,
  /**
   * Derived, and documentation rather than a rule — the general pass produces
   * this radius on its own from EMITTER_SIG. Held by a test.
   */
  SELF_REVEAL_RADIUS_M: ACTIVE_SONAR.SELF_REVEAL_RADIUS_M * CADENCE_RANGE_SCALE,
  /** The transmission is the same length; only its reach and cost differ. */
  REVEAL_DURATION_S: ACTIVE_SONAR.REVEAL_DURATION_S,
} as const;

/**
 * The loudness a mine triggers at — **derived, not chosen**.
 *
 * docs/systems-combat.md §6 fixes two behaviours and leaves the number to fall
 * out of them, exactly as `BASE_THRESHOLD` is solved from the spec'd 2,400 m
 * self-reveal rather than picked:
 *
 *   1. a mine must **never** trigger on a Silent Running hull, at any range;
 *   2. a mine **must** trigger on a cruising Corvette inside its 150 m radius.
 *
 * Solving (2) at exactly the trigger radius fixes the bar, and (1) then holds
 * as a consequence rather than as a second rule: `perceivedLoudness` clamps
 * distance at the reference distance, so the loudest a SIG-8 hull can ever read
 * is 8 — and the bar lands at 14.7. There is a test that asserts that margin,
 * because it is the whole reason silence is a way through a minefield.
 *
 * Consequence, and the point of deriving rather than choosing: widen the
 * trigger radius or change the attenuation exponent and the bar recalibrates
 * itself, instead of silently starting to eat scouts.
 */
export const MINE_TRIGGER_LOUDNESS =
  ORDNANCE.MINE.TRIGGER_REFERENCE_SIG *
  Math.pow(REFERENCE_DISTANCE_M / ORDNANCE.MINE.TRIGGER_RADIUS_M, ATTENUATION_EXPONENT);

export const PROPAGATION_MODEL = {
  /** Distance at which SIG is taken at face value, metres. */
  REFERENCE_DISTANCE_M,
  /** Attenuation exponent. 2.0 is inverse-square; water carries sound better. */
  ATTENUATION_EXPONENT,
  /** Derived — see above. */
  BASE_THRESHOLD,
  /** HYD at which BASE_THRESHOLD applies; higher HYD lowers the threshold. */
  BASELINE_HYD,
  /** Ceiling used to size broadphase queries conservatively. */
  MAX_EXPECTED_HYD: 90,
} as const;

/** SPEC — docs/tech-stack.md "Echo Layer Implementation Notes". */
export const SIM = {
  /** Fixed simulation step. */
  TICK_HZ: 60,
  /** The Echo Layer runs far slower than the sim; detection is not per-frame. */
  ECHO_HZ: 5,
  /** Hard budget for a full detection pass, milliseconds. */
  ECHO_BUDGET_MS: 2,
  /** Spatial hash cell size, metres. TUNABLE. */
  SPATIAL_CELL_M: 600,
} as const;

/**
 * Horizontal movement.
 *
 * TUNABLE. Deliberately not shared with DEPTH.ARRIVAL_EPSILON_M: the two axes
 * move at different speeds and answer to different orders, so one number
 * serving both would couple two tunings that have no reason to agree.
 */
export const MOVEMENT = {
  /** Close enough to a move target to count as arrived, in metres. */
  ARRIVAL_EPSILON_M: 5,
  /**
   * Routing around ground (#431) — TUNABLE throughout. The docs specify what
   * ground does to a hull (docs/systems-depth.md §2), not how a hull finds
   * its way round it; these are the prototype's numbers for that.
   */
  /** A route waypoint counts as reached inside this radius, in metres. */
  WAYPOINT_REACH_M: 40,
  /**
   * A move target that shifts by less than this keeps its route. A pursued
   * hull creeps a couple of metres a tick; re-searching for every creep would
   * make a chase the most expensive thing on the 60 Hz path.
   */
  ROUTE_RETARGET_M: 125,
  /**
   * Ticks between route checks — the Echo beat, so a hull re-reads the ground
   * no more often than the world it steers through is redrawn.
   */
  ROUTE_REVALIDATE_TICKS: 12,
  /** Depth change that invalidates a route: passability is a function of depth. */
  ROUTE_DEPTH_TOLERANCE_M: 50,
} as const;

/**
 * Keeping hulls out of each other's water.
 *
 * TUNABLE throughout — the docs never specify collision, and they would not,
 * because this is not a mechanic. What it protects *is* spec'd, though: a
 * stack of hulls at one coordinate is one acoustic position, which would let
 * the renderer and the Echo Layer disagree with each other about how large a
 * force is (docs/systems-echo.md §4).
 */
export const SEPARATION = {
  /**
   * Fraction of an overlap resolved per tick. Below 1 so a crowd settles
   * instead of oscillating; high enough that a fleet spreads within a second.
   */
  STIFFNESS: 0.45,
  /** Closer than this counts as exactly stacked, with no axis to push along. */
  COINCIDENT_EPSILON_M: 0.01,
  /** Spatial-hash cell for the separation query. A few hull lengths. */
  CELL_M: 200,
} as const;

/** TUNABLE — Tier 2 reports position blurred by this fraction. SPEC says 15%. */
export const BEARING_BLUR_FRACTION = 0.15;

/**
 * Scattered water — docs/systems-echo.md §3 "Scattered water".
 *
 * A contact resolved through Resonance Field cells is reported on a bearing
 * that lies and at a range that reads long, at every tier that carries a
 * bearing — Classification names the hull, the Fields still misplace it. Both
 * errors scale with the fraction of the listener-to-emitter path that crosses
 * scattered cells, so a hull one cell into the Fields is barely misplaced and
 * one heard across a kilometre of crystal is misplaced by the full figure.
 *
 * The lie is hashed off the match seed, the pair and the tick — never drawn
 * from `world.rng` — so a replay and both clients agree and adding a contact
 * shifts nobody else's dice. See `scatterContact` for the shape of it.
 *
 * One listener cannot solve it and two can (§3 "Two ears"): a player holding
 * the emitter from two hulls on a cross bearing is told the truth. That is
 * what makes the Fields a rule rather than dice — the lie is bounded, and the
 * way out costs a second hull committed to the water.
 */
export const SCATTER = {
  /** SPEC — §3: up to ±30° on a path that is all crystal. */
  MAX_BEARING_ERROR_RAD: (30 * Math.PI) / 180,
  /**
   * SPEC — §3: range reads up to 15% long, and never short. A scattered
   * return is a multipath return — it arrived late and from the wrong side —
   * so the lie is outward only. It is also what makes the bearing lie a wall
   * rather than a puzzle: with the range exact, a program that knew which of
   * its hulls listened could intersect two range circles from a moving
   * listener and recover a stationary target in two Echo ticks.
   *
   * Deliberately its own constant beside `BEARING_BLUR_FRACTION`'s 15%: that
   * one is symmetric and this one is not, and a shared number would invite a
   * shared sign.
   */
  MAX_RANGE_STRETCH: 0.15,
  /**
   * TUNABLE — the share of the lie that stands for the whole match, per
   * observer-and-emitter pair. The rest drifts. Neither half is enough on its
   * own: a lie that only stood could be solved from two Echo ticks of a
   * moving listener, and one that only drifted would average back to the
   * truth over a long enough watch. Together, no number of samples from one
   * listener recovers the truth; `CROSS_BEARING_RAD` below is the way out.
   */
  STANDING_FRACTION: 0.5,
  /**
   * TUNABLE — seconds between the drift's re-rolls. The reported bearing
   * eases from one hashed value to the next over this interval
   * (docs/audio-direction.md §9: "slow phase drift"), so a contact in the
   * Fields slides rather than jumps. A jump every Echo tick would read as
   * noise; the target emotion is dread, not confusion.
   */
  DRIFT_PERIOD_S: 2,
  /**
   * SPEC — §3 "Two ears": the Fields cannot lie to a player who holds a
   * bearing on the emitter from two listeners at least this far apart, seen
   * from the emitter. Deliberately the same figure as the bearing bound, so
   * the rule a player carries is one number — the Fields lie by up to 30°,
   * and two ears 30° apart tell the truth. Two hulls in convoy are one ear:
   * a pair 100 m apart hearing something 1,000 m away are 6° apart.
   */
  CROSS_BEARING_RAD: (30 * Math.PI) / 180,
  /**
   * SPEC — docs/audio-direction.md §5: on a ping in a Resonance Field "one to
   * three of them are false". Per transmission, from a pinger standing in a
   * scattered cell.
   */
  PHANTOMS_MIN: 1,
  PHANTOMS_MAX: 3,
  /** TUNABLE — a phantom is never nearer the pinger than this, metres. */
  PHANTOM_MIN_RANGE_M: 200,
  /**
   * TUNABLE — nor this near anything real inside the reveal, metres. A
   * phantom on top of a true return would be a true return with a second
   * marker, which is a rendering bug and not a lie.
   */
  PHANTOM_CLEARANCE_M: 150,
  /** TUNABLE — placements tried before a phantom is given up on. */
  PHANTOM_PLACEMENT_TRIES: 8,
} as const;

/**
 * The classic RTS economic loop: node -> mine (loudly) -> haul home -> deposit.
 * All TUNABLE except where noted; the *shape* — that income is a continuous
 * noise source — is SPEC (docs/economy.md §1).
 */
export const ECONOMY = {
  /** Nodules each player holds at match start. */
  STARTING_NODULES: 600,
  /** Nodules a harvester carries per trip at Standard throttle. */
  CARGO_CAPACITY_NODULES: 50,
  /** Fill rate on the node, nodules per second. Throttle-independent. */
  MINING_RATE_PER_S: 10,
  /** Close enough to a node to mine it, metres. */
  MINING_RANGE_M: 80,
  /** Extra reach beyond a depot structure's footprint to dock and deposit. */
  DEPOSIT_RANGE_M: 60,
  /** Nodules in a field at match start. */
  NODE_STARTING_AMOUNT: 3000,
} as const;

/**
 * Per-resource extraction character. docs/economy.md §2 and §7.
 *
 * The crystal's whole argument is depth: it is worth having only because
 * reaching it costs a commitment. So it is slower to cut, louder to cut, and
 * lives in water that bills you for standing in it — SPEC in shape, TUNABLE in
 * number.
 *
 * `miningSigPremium` is added to whatever the throttle is already emitting
 * (§3), which lands Standard-throttle crystal work at 65 SIG — the middle of
 * the doc's 60-70 band — while keeping the throttle a live decision surface
 * rather than something the resource overrides.
 */
export const RESOURCE: Record<
  ResourceKind,
  { name: string; miningSigPremium: number; rateMultiplier: number }
> = {
  [ResourceKind.Nodule]: { name: 'Nodule', miningSigPremium: 0, rateMultiplier: 1 },
  [ResourceKind.ResonanceCrystal]: {
    name: 'Resonance Crystal',
    miningSigPremium: 20,
    rateMultiplier: 0.45,
  },
};

/**
 * The Abyssal crystal economy. docs/economy.md §7 — "a round trip with a clock
 * on it", run as raids rather than expansions by everyone but the Directorate.
 */
export const CRYSTAL = {
  /** Working depth of a crystal field. Abyssal band, so PR-3 or crush. */
  FIELD_DEPTH_M: 2400,
  /** Units in a crystal field at match start. Scarcity is the match clock. */
  FIELD_STARTING_AMOUNT: 900,
  /** A hold carries less crystal than nodules — it is dense, awkward cargo. */
  CARGO_CAPACITY: 20,
  /** Crystal nodes ignore the depth check within this tolerance, metres. */
  WORKING_DEPTH_TOLERANCE_M: 60,
} as const;

/**
 * SPEC — docs/economy.md §3, the noise curve: yield and SIG are tied, and a
 * harvester that takes less is quieter. SIG values are the mid-points of the
 * doc's bands.
 *
 * The multiplier scales *how much a trip brings home*, not how fast the hold
 * fills. Scaling the fill rate was the obvious reading and was measurably
 * wrong: cargo is capped per trip and a round trip is dominated by travel, so
 * Overburden saved about a second out of forty-five and earned Standard's
 * income for Standard-plus-23 SIG — strictly dominated, with no upside at all.
 * Against cargo the lever bites directly, and the time cost survives too: the
 * fill rate is fixed, so a bigger hold means longer on the node at the louder
 * setting.
 */
export const HARVEST_THROTTLE: Record<HarvestThrottle, { cargoMultiplier: number; sig: number }> = {
  [HarvestThrottle.Idle]: { cargoMultiplier: 0, sig: 12 },
  [HarvestThrottle.Trickle]: { cargoMultiplier: 0.4, sig: 25 },
  [HarvestThrottle.Standard]: { cargoMultiplier: 1.0, sig: 45 },
  [HarvestThrottle.Overburden]: { cargoMultiplier: 1.4, sig: 68 },
};

/** Base building. Construction is loud — SPEC in kind (docs/systems-echo.md §2), TUNABLE in number. */
/**
 * Berths — the population cap (docs/economy.md §10). SPEC throughout.
 *
 * A hull occupies `UnitStats.berths` from the moment it is queued; the grant
 * is what the commander's standing Bastion and commissioned Foundries add up
 * to, capped at the ceiling. Capacity is loud: the only way to raise the
 * grant is a Foundry, and a Foundry hums. The ceiling is also the engine's
 * promise — at forty berths a four-commander match is at most 160 hulls, the
 * entity count the Echo pass is budgeted against (docs/tech-stack.md).
 */
export const BERTHS = {
  /** Berths the Bastion grants by standing. */
  BASTION: 16,
  /** Berths each commissioned Foundry adds. A site under construction adds none. */
  FOUNDRY: 8,
  /**
   * SPEC — docs/units.md, the Slipway: "+8 berths while commissioned, to the
   * ceiling of 40". The Foundry's grant, so the ceiling is a Bastion, two
   * Foundries and a Slipway.
   */
  SLIPWAY: 8,
  /** The most any commander may hold, however many Foundries stand. */
  CEILING: 40,
} as const;

export const CONSTRUCTION = {
  /**
   * The depth a structure sits at, and the depth the ground must admit it at.
   *
   * Mid-Water, where a PR-2 hull is at home. Lives here because three places
   * need to agree about it now that ground can refuse: the spawn that seats a
   * structure, the placement rule that rejects one over shallow ground, and the
   * map tests that hold authored maps to the same bar. A structure cannot rise
   * the way a hull can, so a disagreement here is a building inside a plateau.
   */
  WORKING_DEPTH_M: 600,
  /** Sustained SIG at the site while a structure is being commissioned. */
  SITE_SIG: 70,
  /**
   * New structures must rise within this range of an existing own structure.
   *
   * SPEC — docs/economy.md ("Reaching a tap is a commitment") and docs/units.md
   * (construction rules). 1,500 m rather than the 1,200 m it started at, and
   * the same number as `STANDING_WAVE.PAIR_RANGE_M` by decision rather than
   * coincidence (#372): a Spire chained off its partner always pairs.
   */
  BUILD_RADIUS_M: 1500,
  /** Fraction of max HP a structure has the moment the site is placed. */
  INITIAL_HP_FRACTION: 0.1,
} as const;

/**
 * Faction signature structure auras (docs/units.md, faction structures).
 * Each is an argument about sound or depth: the Barge bends propagation, the
 * Cantor sharpens ears, the Spire rents out depth. All apply to completed,
 * allied structures only — a construction site projects nothing.
 */
export const STRUCTURE_AURAS = {
  /** SPEC — Baffle Barge: allied units inside emit through PF × this. */
  BAFFLE_BARGE: {
    RADIUS_M: 400,
    PF_FACTOR: 0.6,
  },
  /** SPEC — Cantor: allied units inside listen at HYD + bonus, capped. */
  CANTOR: {
    RADIUS_M: 1200,
    HYD_BONUS: 25,
    HYD_CAP: 95,
  },
  /** SPEC — Sounding Spire: allied units inside operate at PR + 1. */
  SOUNDING_SPIRE: {
    RADIUS_M: 600,
    PR_BONUS: 1,
  },
  /**
   * SPEC — Spore Veil (docs/systems-echo.md §8): SYMMETRIC, unlike the other
   * three — everything inside, friend or foe, emits at SIG_FACTOR and
   * listens at BLIND_HYD. It hides them from you and you from them.
   */
  SPORE_VEIL: {
    /** TUNABLE — the cloud's reach; the doc pins the effect, not the size. */
    RADIUS_M: 350,
    SIG_FACTOR: 0.4,
    /** Hydrophone-blind: threshold 10× baseline; deaf past point blank. */
    BLIND_HYD: 5,
  },
} as const;

/**
 * The effect hulls of docs/units.md's rung roster (#461) — each the mechanism
 * one of the signature structures already has, on a hull: the Precentor's
 * dome is the Cantor's, the Cantus's and the Sower's grant is the Spire's, the
 * Spinner's magazine is the mine cap's, and the Tender is the one mechanism
 * the simulation did not have. All SPEC, cited to the hull's stat block.
 */
export const HULL_EFFECTS = {
  /** SPEC — Tender: "15 HP/s to one allied hull within 300 m, nearest first". */
  TENDER: {
    REPAIR_HP_PER_S: 15,
    RADIUS_M: 300,
  },
  /**
   * SPEC — Spinner: "carries 4 mines against the roster's one, and regrows one
   * every 40 s while inside a Spore Veil or within 300 m of a Bastion".
   */
  SPINNER: {
    MAGAZINE: 4,
    REGROW_S: 40,
    BASTION_RADIUS_M: 300,
  },
  /**
   * SPEC — Precentor: "+10 HYD within 500 m to allied hulls, capped at 95". The
   * cap is the Cantor's: under a dome as well it adds nothing.
   */
  PRECENTOR: {
    RADIUS_M: 500,
    HYD_BONUS: 10,
  },
  /**
   * SPEC — Cantus: "Stationary for 10 s it sings: +1 PR within 300 m, and SIG
   * 80 in every quarter. Moving, it is silent and grants nothing."
   */
  CANTUS: {
    RADIUS_M: 300,
    PR_BONUS: 1,
    STATIONARY_S: 10,
  },
  /**
   * SPEC — Sower: "After 20 s stationary it is seeded, and grants +1 PR within
   * 400 m to allied hulls for as long as it stands there." The grant does not
   * stack with the Spire's, exactly as the Spire's does not with itself.
   */
  SOWER: {
    RADIUS_M: 400,
    PR_BONUS: 1,
    STATIONARY_S: 20,
  },
  /**
   * SPEC — Antiphon: "Every hull it disembarks carries +1 PR for 20 s, the
   * Spire's grant on a clock. It does not stack with a Spire, a Cantus or a
   * Sower — one band rented, never two — and it does not renew."
   */
  /**
   * The Blight's spore — docs/systems-combat.md §9, "A weapon that is not a
   * weapon". A Deepbloom strain seeded on a structure.
   *
   * A percentage of *maximum* hull rather than of current, so it is linear and
   * finite: 1% a second for 60 s is 60% of the wall and never the last of it.
   * A percentage of current hull would decay asymptotically and never finish,
   * which reads as the same sentence and is a different weapon — one that can
   * be left running instead of followed up.
   *
   * The silence is the design claim (§9): a structure under a spore emits
   * exactly what it emitted before, so the first sign is the hull falling.
   * There is a test that the target's SIG does not move while it dies.
   */
  BLIGHT: {
    /** Fraction of maximum hull taken each second. */
    PER_S: 0.01,
    /** Seconds the strain lives. 60% of the wall, and then nothing. */
    DURATION_S: 60,
    /** How close the Blight must be to seed one, metres. */
    RANGE_M: 350,
    /** Seconds before the same hull can seed another. */
    COOLDOWN_S: 45,
  },

  /**
   * The Lure's song — docs/systems-combat.md §9, and docs/bestiary.md §2's
   * modifier table with a source, a radius and a clock.
   *
   * The Directorate does not knock a wall down; it tells the Drift where the
   * wall is. Worth nothing against a base nothing lives near, which is what a
   * Biomass price should buy.
   */
  LURE: {
    /** Seconds the song runs. */
    SONG_S: 60,
    /** What fauna hear from anything inside the radius, multiplied. */
    AGGRO_MULTIPLIER: 2,
    /** How far from the sung point the weighting reaches, metres. */
    RADIUS_M: 500,
    /** Seconds before the same hull can sing again. */
    COOLDOWN_S: 90,
  },

  ANTIPHON: {
    PR_BONUS: 1,
    GRANT_S: 20,
  },
} as const;

/**
 * A hull in a hold — docs/systems-echo.md §3, docs/units.md "The transports".
 *
 * A transport carries hulls; a carried hull is not in the water and is heard
 * only as the load on its carrier. The load is the one SPEC figure here. The
 * boarding distances are the doc's too, but as a description of the
 * mechanism rather than a balance number — TUNABLE, expected to move.
 */
export const HOLD = {
  /**
   * SPEC — systems-echo.md §3: "+3 per berth carried, at every posture,
   * Silent Running included". Added after the posture chain, so a hold
   * cannot be hushed, and before the veil's cut, so a cloud still muffles it.
   */
  SIG_PER_BERTH: 3,
  /** TUNABLE — a hull boards its carrier from within this range... */
  BOARD_RANGE_M: 150,
  /** ...and this close to its depth. A Freighter loads shallow or not at all. */
  BOARD_DEPTH_M: 100,
  /**
   * TUNABLE — the ring a disembarking hold lands in, as a multiple of the
   * carrier's own radius. Wide enough that separation does not have to
   * untangle a Bulwark from the hull that brought it.
   */
  LANDING_RING_RADII: 2.5,
} as const;
