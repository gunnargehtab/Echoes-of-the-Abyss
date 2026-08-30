/**
 * PixiJS v8 renderer for the Echo Layer — since Phase 5 of
 * docs/three-layer-ocean.md, the HUD-and-marks half of the shipped picture.
 *
 * The world itself — terrain, water light, the player's own hulls — is the
 * three.js conn view (PerspectiveView.ts) on the canvas *under* this one.
 * This canvas is transparent and draws everything the chart language still
 * owes the player on top of it: contacts at earned fidelity, detection rings,
 * hazards, residue, routes, bars, and the whole screen-space HUD. Every
 * world-anchored mark is projected through the conn's one camera
 * (`projectPoint` / `resolveGround`), so the two painters can never disagree
 * about where the water is.
 *
 * Rendering principle, from docs/art-direction.md: the visual fidelity of a
 * contact must match the informational fidelity the player earned. A Tier-1
 * return is a directionless haze because that is genuinely all the server told
 * us; a Tier-4 track is crisp because it is genuinely exact. The renderer must
 * never make a low tier look more certain than it is.
 *
 * Scene graph is split into fixed layers so draw order is structural rather
 * than emergent from insertion order:
 *
 *   stage
 *   +- overlay      (screen space, redrawn per frame through the conn camera)
 *   |  +- ground    (cells the selection cannot enter)
 *   |  +- nodes     (survey-chart nodule fields)
 *   |  +- rings     (own units' detection radii, queued routes)
 *   |  +- symbols   (pooled per-entity marks: structures, contacts, units)
 *   +- hud          (screen space, never transformed)
 *
 * Two idioms inside the overlay, and the split is deliberate. *Measurements*
 * — range rings, hazard sites, residue, blocked ground — are facts about the
 * water, so they are projected vertex by vertex and lie on the terrain like
 * paint. *Symbols* — contact marks, bars, glyphs, selection rings — are facts
 * about the interface, so each lives in a pooled Graphics billboarded at its
 * entity's projected position and scaled by the local pixels-per-metre: the
 * old chart draw bodies port with the entity at the local origin and
 * `inverseScale = 1 / pxPerM`.
 */

import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  ACTIVE_SONAR,
  Biome,
  DEPTH,
  DEPTH_BANDS,
  inLid,
  LID,
  DepthBand,
  Faction,
  HarvestIdleReason,
  HarvestThrottle,
  PERSISTENCE,
  PRODUCIBLE,
  PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  ResolutionTier,
  ResourceKind,
  SIM,
  EchoMarkKind,
  SelfEventKind,
  StructureKind,
  THERMOCLINE,
  THERMOCLINE_DUCT_BOTTOM_M,
  THERMOCLINE_DUCT_TOP_M,
  THERMOCLINE_ZONE_MAX,
  ThermoclineZone,
  UnitKind,
  depthBandFor,
  effectivePressureRating,
  thermoclineZone,
  maxAudibleRangeM,
  requiredPressureRating,
  FaunaSpecies,
  faunaStatsFor,
  MissionOutcome,
  statsFor,
  structureStatsFor,
  FACTION_STRUCTURE,
  type AbilityLock,
  type Contact,
  HazardPhase,
  type DrawReport,
  type EchoMarkInfo,
  type HazardState,
  type EchoSnapshot,
  type ExposureReport,
  type GameOverPayload,
  type MissionAbility,
  type MissionResultPayload,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  BIOME_COLOR,
  FACTION_PALETTE,
  FAUNA_COLOR,
  RESOURCE_COLOR,
  setActivePalette,
  TIER_STYLE,
  UI,
  sigColor,
  type PaletteName,
} from './palette.ts';
import {
  actionFor,
  BUILD_ACTION_KIND,
  DEFAULT_BINDINGS,
  keyLabel,
  type Bindings,
} from '../input/bindings.ts';
import { FACTION_NAME } from './factions.ts';
import {
  drawScopeEchoMarks,
  markRadiusM,
  MARK_LABEL,
  MARK_STYLE,
  newlyAudibleMarks,
} from './echoMarks.ts';
import type { ContactAudioEntry, ContactAudioFrame } from '../audio/contactMixer.ts';
import type { PingReturn, SelfAudioFrame } from '../audio/selfMixer.ts';
import {
  PRECEDENCE_MS,
  markOpacity,
  precedenceTiming,
  type PrecedenceMode,
  type PrecedenceTiming,
} from '../audio/precedence.ts';
import { selfMixFor } from '../audio/selfNoise.ts';
import { stamp } from './clock.ts';
import {
  drawFactionGlyph,
  drawStructureSilhouette,
  drawUnitSilhouette,
  HULL_LENGTH_M,
} from './silhouettes.ts';
import { destroyHullTextures, loadHullArt } from './hullTextures.ts';
import { destroyStructureTextures, loadStructureArt } from './structureTextures.ts';
import type { MapPayload, TerrainPayload } from '../net/GameClient.ts';
import type { PerspectiveView, ProjectedPoint } from './PerspectiveView.ts';
import {
  COLUMN_RIBBONS,
  columnDepthsM,
  columnLayout,
  columnRibbon,
  distanceToColumn,
  type ColumnLayout,
  type ColumnPoint,
} from './contactColumn.ts';

/** A contact plus when we last actually heard it, for ghost decay. */
interface TrackedContact {
  contact: Contact;
  lastSeenMs: number;
  /**
   * When this contact first appeared, for the Precedence Law's fade-in.
   *
   * Distinct from `lastSeenMs` on purpose: the fade-in is a budget spent once,
   * when a mark *arrives*, so that the ear beats the eye (docs/audio-direction.md
   * §2). Keying it to the last refresh instead would re-fade a contact five
   * times a second and leave it invisible.
   */
  firstSeenMs: number;
}

export interface RendererCallbacks {
  onMoveOrder(unitIds: number[], x: number, y: number, queued: boolean): void;
  onToggleSilent(unitIds: number[], active: boolean): void;
  onPing(unitId: number): void;
  onAttackOrder(unitIds: number[], contactId: number, queued: boolean): void;
  /** docs/systems-combat.md §5 — launch at a contact this player has resolved. */
  onLaunchTorpedo(unitIds: number[], contactId: number): void;
  /** §5 — a decoy, aimed at nothing. */
  onDeployNoisemaker(unitIds: number[]): void;
  /** §6 — lay a mine where the hull is standing. */
  onLayMine(unitIds: number[]): void;
  /** §8 — drop a charge set to detonate at a depth. */
  onDepthCharge(unitIds: number[], depth: number): void;
  onHarvestOrder(unitIds: number[], nodeId: number, queued: boolean): void;
  onThrottle(unitIds: number[], throttle: HarvestThrottle): void;
  onBuild(kind: StructureKind, x: number, y: number): void;
  onProduce(structureId: number, kind: UnitKind): void;
  onDepthOrder(unitIds: number[], depth: number): void;
  /** Arm or disarm floor-following for the selection (docs/systems-depth.md §2). */
  onFollowFloor(unitIds: number[], active: boolean): void;
  /** A new detection event, for the contact log. */
  onContactEvent(entry: ContactLogEntry): void;
  /**
   * An `Escape` with nothing left to cancel (docs/ui-ux.md §9.5). The menu is
   * DOM, so the renderer only reports the press; the shell owns what a menu
   * is, and tells the renderer to stop listening via `setMenuOpen`.
   */
  onOpenMenu(): void;
  /**
   * The contact picture, reduced to what the mix may know, once per Echo tick.
   *
   * Emitted from here rather than assembled in the audio layer because this is
   * where the tracked-contact map, the terrain and the camera already live —
   * and because withholding Tier-1 bearing has to happen at the source, not at
   * the consumer.
   */
  onContactAudio(frame: ContactAudioFrame): void;
  /** What is true of the player's own force, once per Echo tick. */
  onSelfAudio(frame: SelfAudioFrame): void;
  /** How much residue of each kind the player can hear (§6). */
  onMarkAudio(intensityByKind: Map<EchoMarkKind, number>): void;
  /** Live hazards, once per Echo tick. Public to every player by design. */
  onHazards(hazards: HazardState[]): void;
}

/**
 * One line of the contact log (docs/ui-ux.md §10).
 *
 * Carries only what the tier earned. Bearing and range are absent at Tier 1
 * by construction, not by omission: a Tier-1 report *is* the listener's own
 * position, so there is no bearing in it to show.
 */
export interface ContactLogEntry {
  id: string;
  tick: number;
  tier: ResolutionTier;
  /** True when this contact had never been resolved before. */
  fresh: boolean;
  label: string;
  bearingDeg?: number;
  rangeM?: number;
  /** Where to send the camera, when the entry carries a real position. */
  focusX?: number;
  focusY?: number;
  /**
   * Residue heard rather than a contact detected — the `MARK` row of
   * docs/ui-ux.md §10.
   *
   * A separate flag rather than a fifth resolution tier because a mark is not
   * a *worse* detection than Tier 1, it is a different kind of thing: the past
   * rather than the present. The tier ramp is an ordered scale of how much a
   * player earned about a live emitter, and putting residue on it would invite
   * every consumer to compare the two.
   */
  mark?: boolean;
}

/** A world-frame bearing in radians, as the log's compass-north degrees. */
function compassDeg(bearing: number): number {
  return (((bearing * 180) / Math.PI + 450) % 360) | 0;
}

/**
 * How long the Tier-4 acquisition brackets stay on screen, milliseconds.
 *
 * The visual half of §3's lock tone. docs/audio-direction.md §11 makes
 * audio-only information a bug, and the lock tone is the one genuinely *new*
 * audible event this layer introduces — every other cue restates something
 * already drawn. So it gets a mark of its own, on the same one-shot rule: it
 * fires once per acquisition and never sustains.
 */
const LOCK_FLASH_MS = 700;

/**
 * How each hazard phase is drawn.
 *
 * Dormant is faint but never invisible: a hazard the player forgets is a
 * hazard that will surprise them, and surprise is the failure mode the warning
 * phase exists to prevent.
 */
const HAZARD_STYLE: Record<HazardPhase, { width: number; alpha: number }> = {
  [HazardPhase.Dormant]: { width: 2, alpha: 0.22 },
  [HazardPhase.Warning]: { width: 3, alpha: 0.7 },
  [HazardPhase.Active]: { width: 4, alpha: 0.95 },
  [HazardPhase.Decay]: { width: 3, alpha: 0.5 },
};

/**
 * How long the screen-edge exposure flash lasts, milliseconds.
 *
 * Matched to the audio tail (§5's two seconds) rather than chosen: the flash
 * and the strike are one event, and a flash that outlived the sound would keep
 * claiming the player is being lit after they have stopped being lit.
 */
const EXPOSURE_FLASH_MS = 2000;

/** How long a broken-silence ring stays on the hull that broke it. */
const BREAK_SILENCE_FLASH_MS = 2000;

/**
 * How long the under-fire pulse rings on the scope, milliseconds (§5).
 *
 * The pulse is news and lives two seconds like the other transients; the
 * engagement *window* is `PERSISTENCE.UNDER_FIRE_REARM_S` and lives on the
 * same timestamp — one clock, two readers.
 */
const UNDER_FIRE_PULSE_MS = 2000;

/**
 * The faction glyph's smallest half-extent on screen, pixels.
 *
 * TUNABLE. Sized so the four glyphs stay apart at the zoom a player surveys
 * a fight from: below this the Directorate's chevrons merge into the
 * Bathyarch's plate and the shape stops carrying what §11 asks it to carry.
 */
const GLYPH_MIN_PX = 7;

/**
 * Vertices per projected circle. Rings are facts about the water, so they lie
 * on the terrain — sampled and projected point by point rather than drawn as
 * screen ellipses. 48 keeps a 2,400 m detection ring visibly smooth at survey
 * zoom while staying far under the budget the old per-cell terrain pass spent.
 */
const CIRCLE_SEGMENTS = 48;

/**
 * A pool of per-entity symbol Graphics.
 *
 * Symbols — contact marks, bars, glyphs, selection rings — billboard at their
 * entity's projected position with `scale = pxPerM`, so their draw bodies stay
 * in world metres with the entity at the local origin, exactly as the flat
 * chart wrote them. Pooled by entity id so a mark keeps its Graphics across
 * frames instead of churning display objects at 60 Hz.
 */
class SymbolPool {
  readonly layer = new Container();
  private readonly held = new Map<number, Graphics>();
  private readonly used = new Set<number>();

  /** A cleared Graphics for this entity, positioned by the caller. */
  acquire(key: number): Graphics {
    let g = this.held.get(key);
    if (g === undefined) {
      g = new Graphics();
      this.held.set(key, g);
      this.layer.addChild(g);
    }
    g.clear();
    g.visible = true;
    this.used.add(key);
    return g;
  }

  /** Drop every symbol not acquired since the last sweep. */
  sweep(): void {
    for (const [key, g] of this.held) {
      if (!this.used.has(key)) {
        g.destroy();
        this.held.delete(key);
      }
    }
    this.used.clear();
  }

  destroy(): void {
    this.held.clear();
    this.used.clear();
    this.layer.destroy({ children: true });
  }
}

/**
 * How long one engagement lasts, in simulation ticks (docs/ui-ux.md §5).
 * The mixer derives the same number from the same constant, which is what
 * lets the log and the cue agree about what one fight is.
 */
const UNDER_FIRE_REARM_TICKS = PERSISTENCE.UNDER_FIRE_REARM_S * SIM.TICK_HZ;

/**
 * When a world-space contact mark fades in, milliseconds after it arrives.
 *
 * §2 fixes the start at 250 ms but names no end for the world layer, so the
 * ramp is given the same 250 ms width the minimap's is (150 -> 400). Derived
 * rather than invented: the two layers should feel like one rule.
 *
 * A function of the timing table in effect rather than a module constant,
 * because the visual-first preset (§11) swaps the whole table at runtime.
 */
function worldFadeMs(timing: PrecedenceTiming): { start: number; full: number } {
  return {
    start: timing.WORLD_FADE_START,
    full: timing.WORLD_FADE_START + (timing.MINIMAP_FADE_FULL - timing.MINIMAP_FADE_START),
  };
}

/**
 * A classified creature — docs/bestiary.md §3.
 *
 * Drawn in a colour of its own, and only ever at Tier 3 or above. Below that a
 * fauna contact goes through exactly the same haze and blob as a hull, which
 * is the whole mechanic: "at Tier 1 and Tier 2 there is no marker, colour, or
 * sound that distinguishes fauna from an army".
 *
 * Organic outlines rather than hull shapes, so classification is legible at a
 * glance — the relief (or the problem) should not need reading.
 */
function drawFaunaSilhouette(
  g: Graphics,
  species: FaunaSpecies,
  x: number,
  y: number,
  alpha: number,
  inverseScale: number
): void {
  const stats = faunaStatsFor(species);
  const r = stats.lengthM / 2;
  const body = { color: FAUNA_COLOR, alpha: alpha * 0.75 };
  const edge = { width: 1.5 * inverseScale, color: FAUNA_COLOR, alpha };

  switch (species) {
    case FaunaSpecies.Ashgrazer: {
      // Broad and armoured: a flattened shell.
      g.ellipse(x, y, r, r * 0.6).fill(body);
      g.ellipse(x, y, r, r * 0.6).stroke(edge);
      break;
    }
    case FaunaSpecies.Draymaw: {
      // A lean wedge, pack-shaped.
      g.poly([x - r, y - r * 0.5, x + r, y, x - r, y + r * 0.5]).fill(body);
      g.poly([x - r, y - r * 0.5, x + r, y, x - r, y + r * 0.5]).stroke(edge);
      break;
    }
    case FaunaSpecies.Sounder: {
      // The colossus, drawn as a long body with a resonance halo. Big enough
      // that finding one at Tier 3 is unmistakably a different kind of news.
      g.ellipse(x, y, r, r * 0.35).fill(body);
      g.ellipse(x, y, r, r * 0.35).stroke(edge);
      g.circle(x, y, r * 1.4).stroke({
        width: 1 * inverseScale,
        color: FAUNA_COLOR,
        alpha: alpha * 0.4,
      });
      break;
    }
  }
}

/**
 * Ground that admits nothing at any depth — how solid rock is spelled
 * (packages/backend/src/sim/terrain.ts).
 *
 * `admits` wants a depth between the ceiling and the floor, so a ceiling below
 * the floor leaves an empty interval. Read rather than sent as a flag: the
 * client already has both numbers, and a third field could disagree with them.
 */
function isRock(terrain: TerrainPayload, index: number): boolean {
  return terrain.ceiling[index]! > terrain.floor[index]!;
}

const SELECT_RADIUS_M = 140;
/** How close a right-click must land to a contact or node to mean it. */
const TARGET_RADIUS_M = 160;
/**
 * Aim floor in screen pixels. The two radii above are world metres and shrink
 * with the camera's pull-back; below this floor the screen distance wins, so
 * a survey-zoom click never has to be pixel-perfect.
 */
const AIM_FLOOR_PX = 18;

/** How long the hint bar holds the reason a locked key did nothing. */
const MISSION_REFUSAL_MS = 4000;

/**
 * The banner a mission ends under — docs/mission-sorrowgate.md §8.
 *
 * Not a victory and not a defeat: nobody was beaten, so nothing here reads
 * `winnerSlot`, which a mission never sets. Partial is drawn in the ink that
 * tells rather than the ink that warns, because the doc is explicit that it
 * is a result and not a soft failure.
 *
 * A function rather than a table because it reads the palette: a table built at
 * import time would hold whichever ink was active when the module loaded, and
 * a colour-vision palette moves two of these three (§11).
 */
function missionBanner(outcome: MissionOutcome): { text: string; fill: number } {
  switch (outcome) {
    case MissionOutcome.Complete:
      return { text: 'MISSION COMPLETE', fill: UI.friendly };
    case MissionOutcome.Partial:
      return { text: 'THE MISSION ENDS', fill: UI.accent };
    case MissionOutcome.Lost:
      return { text: 'MISSION LOST', fill: UI.threat };
  }
}

/** Production hotkeys 1-5, in docs/units.md roster order. */
/** Digit codes to control-group numbers. docs/ui-ux.md §9. */
const DIGIT_KEYS: Record<string, number> = {
  Digit1: 1,
  Digit2: 2,
  Digit3: 3,
  Digit4: 4,
  Digit5: 5,
  Digit6: 6,
  Digit7: 7,
  Digit8: 8,
  Digit9: 9,
};

// Build hotkeys used to live here as an `e.code` table. They are bindings now
// (`input/bindings.ts`), because §11 commits to full rebinding and a literal
// in a key handler is a binding no screen can edit. `BUILD_ACTION_KIND` maps
// the four build actions onto the structures they arm.

const THROTTLE_LABEL: Record<HarvestThrottle, string> = {
  [HarvestThrottle.Idle]: 'idle',
  [HarvestThrottle.Trickle]: 'trickle',
  [HarvestThrottle.Standard]: 'standard',
  [HarvestThrottle.Overburden]: 'OVERBURDEN',
};

/** Compact unit names for command-bar buttons on narrow screens. */
const UNIT_SHORT: Record<UnitKind, string> = {
  [UnitKind.LightScout]: 'SCT',
  [UnitKind.Corvette]: 'CRV',
  [UnitKind.Cruiser]: 'CRZ',
  [UnitKind.AbyssalSubmersible]: 'SUB',
  [UnitKind.Harvester]: 'HRV',
};

/** Compact structure names for the build buttons. */
const STRUCTURE_SHORT: Record<StructureKind, string> = {
  [StructureKind.Bastion]: 'BAS',
  [StructureKind.Refinery]: 'REF',
  [StructureKind.Foundry]: 'FND',
  [StructureKind.SentinelTurret]: 'TUR',
  [StructureKind.BaffleBarge]: 'BAF',
  [StructureKind.Cantor]: 'CAN',
  [StructureKind.VentTap]: 'TAP',
  [StructureKind.SoundingSpire]: 'SPI',
  [StructureKind.SporeVeil]: 'VEI',
};

/** One command-bar button: screen-space bounds plus what pressing it does. */
interface BarButton {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  enabled: boolean;
  /** Rendered highlighted (e.g. Silent Running currently on). */
  active: boolean;
  action: () => void;
}

/** Command panel geometry, CSS px. docs/art-direction.md "HUD Layout". */
const TAB_HEIGHT = 24;
const BUTTON_ROW_HEIGHT = 56;
const BAR_HEIGHT = TAB_HEIGHT + BUTTON_ROW_HEIGHT;
const BAR_BUTTON_HEIGHT = 40;
/** Top resource strip. */
const TOP_BAR_HEIGHT = 30;

/** Past this much pointer travel, a left drag is a marquee rather than a click. */
const DRAG_SLOP_PX = 6;
/** Two clicks inside this window on the same spot select all of that class. */
const DOUBLE_CLICK_MS = 320;
/** Recalling the same control group twice this fast centres the camera on it. */
const DOUBLE_TAP_MS = 400;

/**
 * Scope return sizes by tier, in scope pixels.
 *
 * Inverted on purpose: a Tier-1 return is the *largest* mark on the scope and
 * the softest, because its size is the uncertainty rather than the contact. A
 * Tier-4 track is a tight point, because that is what the player earned.
 */
const SCOPE_RETURN_RADIUS_PX: Record<1 | 2 | 3 | 4, number> = { 1: 7, 2: 4.5, 3: 2.5, 4: 2 };

/** One sweep revolution. Deliberately not a multiple of the 5 Hz Echo tick. */
const SCOPE_SWEEP_MS = 4000;

/** Depth ribbon geometry — a narrow strip down the left edge. */
const RIBBON_X = 12;
const RIBBON_WIDTH = 14;
const RIBBON_TOP_PAD = 18;
const RIBBON_BOTTOM_PAD = 16;
/**
 * Below this, the duct is drawn as its centre line alone.
 *
 * The duct is a fixed fraction of the strip, so its pixel height falls out of
 * the window: about 50 px on a 1080p screen and about 4 px at the 60 px
 * minimum the ribbon will draw at all. Four pixels of translucent fill under a
 * one-pixel line is not a band a player can see — it is a thicker line that
 * lies about having width.
 */
const RIBBON_DUCT_MIN_PX = 6;

/**
 * Where a hull sits when ordered into a band.
 *
 * Depth orders step band to band rather than metre to metre, because the bands
 * are what the player reasons about — docs/ui-ux.md §8 puts the boundaries on
 * the ribbon, not the absolute figure. These are the working depths inside
 * each band, kept clear of the boundaries so a unit is never ambiguously "at"
 * two bands at once.
 */
const BAND_STATION_DEPTH_M: Record<DepthBand, number> = {
  [DepthBand.Shelf]: 200,
  [DepthBand.MidWater]: 1000,
  [DepthBand.Abyssal]: 2400,
};

/**
 * The rungs a depth order steps between, shallow to deep.
 *
 * One per band, plus the thermocline — which is a rung and not a band, and is
 * the reason this is a list rather than the band enum. Sound whose emitter and
 * listener are *both* inside the duct is multiplied by 1.2 and carries further
 * than open water (docs/glossary.md, docs/systems-echo.md §3), and until this
 * rung existed no order a player could give could park a hull there: the three
 * band stations are 200 / 1,000 / 2,400 m and the duct is 1,100–1,300 m. The
 * server never had that limit — `Match.orderDepth` accepts any depth in range
 * — so this was a client-side hole in the game's vocabulary, not a rule.
 */
const DEPTH_STATIONS_M: readonly number[] = [
  BAND_STATION_DEPTH_M[DepthBand.Shelf],
  BAND_STATION_DEPTH_M[DepthBand.MidWater],
  THERMOCLINE.DEPTH_M,
  BAND_STATION_DEPTH_M[DepthBand.Abyssal],
];

/** Which rung a depth counts as standing on. */
const BAND_RUNG: Record<DepthBand, number> = {
  [DepthBand.Shelf]: 0,
  [DepthBand.MidWater]: 1,
  [DepthBand.Abyssal]: 3,
};

/**
 * The rung a hull at this depth is treated as occupying.
 *
 * Zone first, band second: a hull inside the duct is *on* the duct rung even
 * though the duct sits within Mid-Water, because the duct is what it is there
 * for. Everywhere else the ladder still steps band to band, so the only
 * behaviour change is that descending out of Mid-Water now stops at the layer
 * before continuing to the Abyssal.
 */
function rungFor(depthM: number): number {
  if (thermoclineZone(depthM) === ThermoclineZone.Duct) return 2;
  return BAND_RUNG[depthBandFor(depthM)];
}

const BAND_LABEL: Record<DepthBand, string> = {
  [DepthBand.Shelf]: 'SHELF',
  [DepthBand.MidWater]: 'MID',
  [DepthBand.Abyssal]: 'ABYSS',
};

/** The ribbon's vertical range. Past this the strip would imply map we lack. */
const RIBBON_MAX_DEPTH_M = DEPTH.MAX_M;

/** The command panel's three pages. 'squad' appears only while units are selected. */
type CommandTab = 'build' | 'units' | 'squad';

const TAB_LABEL: Record<CommandTab, string> = {
  build: 'BUILD',
  units: 'UNITS',
  squad: 'SQUAD',
};

export class EchoRenderer {
  private readonly app = new Application();
  /**
   * The conn camera — the three.js world under this canvas. Every world
   * coordinate this renderer draws or interprets goes through it; there is
   * one projection and it lives there (PerspectiveView.ts).
   */
  private conn: PerspectiveView | null = null;
  /**
   * World-anchored marks, drawn per frame in screen space through the conn
   * camera, under the HUD. The world itself is the GL canvas below.
   */
  private readonly overlay = new Container();
  /** Ground the current selection cannot enter. Dynamic: it depends on who is selected. */
  private readonly groundLayer = new Graphics();
  private readonly nodeLayer = new Graphics();
  private readonly ringLayer = new Graphics();
  private readonly contactLayer = new Graphics();
  /** Pooled per-entity symbol marks — see SymbolPool. */
  private readonly structureSymbols = new SymbolPool();
  private readonly contactSymbols = new SymbolPool();
  private readonly unitSymbols = new SymbolPool();
  private readonly hud = new Container();
  private readonly hudGraphics = new Graphics();
  private readonly barGraphics = new Graphics();
  /** Pooled Text objects for bar labels — button count varies per context. */
  private readonly barTexts: Text[] = [];
  /** Last frame's button layout, hit-tested by pressBarButton. */
  private barButtons: BarButton[] = [];
  private activeTab: CommandTab = 'build';

  /** Sonar scope. Terrain cached; overlay redrawn per frame. */
  private readonly minimapTerrainG = new Graphics();
  private readonly minimapOverlayG = new Graphics();
  private minimapCachedSize = 0;

  /** Selected-entity panel (wide screens). */
  private readonly ribbonGraphics = new Graphics();
  private readonly ribbonLabels: Text[] = [];
  private ribbonReadout!: Text;
  /**
   * The duct's own label, deliberately *not* a fourth entry in `ribbonLabels`.
   *
   * That array is positioned by index into a literal [Shelf, MidWater,
   * Abyssal] list, so a fourth push would silently park the Abyssal label on
   * the duct and leave one label unplaced. The duct is not a band; it does not
   * belong in the band array.
   */
  private ductLabel!: Text;

  private readonly infoGraphics = new Graphics();
  private infoName!: Text;
  private infoLine1!: Text;
  private infoLine2!: Text;
  private infoBadge!: Text;

  private sigLabel!: Text;
  /**
   * §4's band, in words.
   *
   * The visual equivalent of the self-noise bed: the bed says "you are hard
   * to hear past" and the meter alone does not, because the meter is a number
   * about the *world's* view of you while the bed is about your own hearing.
   * docs/audio-direction.md §11 makes an audible fact with no visible one a
   * bug, and "the world just got quieter" is very much an audible fact.
   */
  private bandLabel!: Text;
  /** "TRACKED" — the continuous half of the exposure report. */
  private exposureLabel!: Text;
  /** Thermal Draw, as capacity over demand. */
  private drawLabel!: Text;
  /** Biomass stockpile, shown only once a player has any. */
  private biomassLabel!: Text;
  /** The map's name, so a player can tell which ground they are on. */
  private mapLabel!: Text;
  /**
   * The match clock (#208) — the log's T+ axis, live. Fed by the server tick
   * through the same formatter the log's rows use, so the clock and the log
   * cannot disagree about what time it is.
   */
  private clockLabel!: Text;
  /** The newest snapshot's tick, which is the only time this HUD believes in. */
  private lastTick = 0;
  /**
   * Whether the map has told us its name yet. Kept apart from the label's own
   * `visible`, which `drawHud` reclaims each frame as the first thing to drop
   * when the top strip runs out of room.
   */
  private mapNamed = false;
  private resourceLabel!: Text;
  private crystalLabel!: Text;
  private statusLabel!: Text;
  private selectionLabel!: Text;
  private bannerLabel!: Text;

  private readonly callbacks: RendererCallbacks;

  private terrain: TerrainPayload | null = null;
  /**
   * The map this match is on.
   *
   * Kept for its name in the HUD and its hazard sites, which docs/maps.md
   * requires be *telegraphed*: "players must see danger before entering."
   * They carry no behaviour yet — the hazard framework is separate work — so
   * they are drawn as ground, not as threats.
   */
  private map: MapPayload | null = null;
  private units: OwnUnit[] = [];
  private structures: OwnStructure[] = [];
  private nodes: ResourceNodeInfo[] = [];
  private readonly tracked = new Map<number, TrackedContact>();
  private selected = new Set<number>();
  private peakSig = 0;
  /** Loudest SIG across own *units* — the self bed's input, see selfAudioFrame. */
  private fleetSig = 0;
  private fleetSilent = false;
  /** What the rest of the map currently holds on the player, server-sent. */
  private exposure: ExposureReport = { tier: ResolutionTier.Silent, trackedCount: 0 };
  /**
   * Acoustic residue this player can read (docs/systems-echo.md §7).
   *
   * Server-resolved: a client only ever holds marks its own units could
   * actually hear, so drawing all of them is correct by construction.
   */
  private marks: EchoMarkInfo[] = [];
  /**
   * Live hazards, public to every player.
   *
   * docs/maps.md makes hazard telegraphing a core principle — "players must
   * see danger before entering" — so this is the one channel in the game that
   * is deliberately not resolved per player. A telegraph only one side can
   * read is not a telegraph.
   */
  private hazards: HazardState[] = [];
  /**
   * Thermal Draw. A rate, so it is drawn as one — see `drawHud`.
   */
  private drawReport: DrawReport = { capacity: 0, demand: 0, satisfaction: 1 };
  private biomass = 0;
  /** Drift Health per region — docs/bestiary.md §6. Public, like terrain. */
  private driftHealth: number[] = [];
  private nodules = 0;
  private crystal = 0;
  private status = 'connecting';
  private slot = 0;
  private faction: Faction = Faction.Bathyarch;
  private gameOver: GameOverPayload | null = null;

  /**
   * Abilities this mission has taken off the hull, each with the reason to
   * say so — docs/ui-ux.md §7: a disabled action greys out *with a reason
   * attached*, never silently. Standing state rather than a reply to a
   * refused order, so the reason exists before the player reaches for the key.
   *
   * Empty in a skirmish, which is every match that is not a mission.
   */
  private missionLocks: AbilityLock[] = [];
  /**
   * The last locked key that was pressed anyway, and when. The panel carries
   * the standing list; this is what the hint bar says at the moment of the
   * press, so a key that does nothing still answers for itself.
   */
  private missionRefusal: { reason: string; atMs: number } | null = null;
  /** Non-null once a mission has concluded. A mission has no winner. */
  private missionOver: MissionResultPayload | null = null;

  /**
   * The Precedence Law timing in effect. The visual-first preset (§11) swaps
   * the whole table rather than branching at each fade site, which is the
   * shape precedence.ts promises — one toggle, no other behavioural change.
   */
  private precedence: PrecedenceTiming = PRECEDENCE_MS;

  /** True while the ping-cost preview is being shown. */
  /**
   * Ping preview moved from Shift to Alt.
   *
   * docs/ui-ux.md §9 specifies order queueing on Shift, which is the RTS
   * convention and the far more frequent action; the doc listed both on Shift,
   * which is a conflict in the doc rather than a choice. Alt was free.
   */
  private previewPing = false;
  /**
   * The live binding table — §11's full rebinding, as the renderer sees it.
   *
   * Defaults rather than undefined so a renderer constructed without the shell
   * ever calling `setBindings` still plays: the headless harness drives this
   * class directly, and a keyboard that does nothing would look like a
   * renderer bug rather than a missing call.
   */
  private bindings: Bindings = { ...DEFAULT_BINDINGS };

  /**
   * True while the esc menu is up (docs/ui-ux.md §9.5). Pointer input dies on
   * the menu's own glass, but the keyboard listens on `window`, so it is
   * guarded here — a slider adjusted mid-match must not also ping.
   */
  private menuOpen = false;

  /**
   * HUD magnification — docs/ui-ux.md §11's 75-200%, "independent of world
   * zoom".
   *
   * Applied as a scale on the `hud` container, which is what makes it
   * independent: the world layer keeps its own camera transform, so magnifying
   * the interface never magnifies the map or changes what is on screen. The
   * cost is that every HUD layout number is now in *virtual* pixels — see
   * `hudWidth`.
   */
  private uiScale = 1;
  /**
   * Reduced motion (§11). Replaces three animations with static equivalents
   * that carry the same information; it never simply removes one.
   */
  private reducedMotion = false;

  /** Drag-select rectangle in screen space, null when not dragging. */
  private marquee: { x0: number; y0: number; x1: number; y1: number } | null = null;
  /** Control groups 1-9, holding own entity ids. */
  private readonly controlGroups = new Map<number, number[]>();
  private lastGroupRecall = { group: -1, at: 0 };
  private lastClick = { at: 0, x: 0, y: 0 };
  /** Non-null while the next left-click places this structure. */
  private pendingBuild: StructureKind | null = null;
  /** Coarse pointer = phone/tablet: hints speak gestures, not keys. */
  private readonly isTouch =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  /** The camera opens on the player's own base exactly once. */
  private cameraCentered = false;
  /** Contact handle to the moment it reached Tier 4, for the lock brackets. */
  private readonly lockFlash = new Map<number, number>();
  /**
   * The player's own ping in flight: where it went out from and when.
   *
   * Kept so the returns can be ordered by range *from the pinging hull*, which
   * is the range that produced them — not from the camera, which happens to be
   * wherever the player was looking.
   */
  private ownPing: { x: number; y: number; atMs: number } | null = null;
  /** Live exposure strikes: bearing and the moment they landed. */
  private readonly exposureFlashes: { bearing: number; atMs: number }[] = [];
  /** Own units that broke silence, and when, for the visible transient. */
  private readonly brokeSilence = new Map<number, number>();
  /**
   * Own entities last hit by violence: the tick it happened on, the wall
   * clock for the animation, and where the hull was standing.
   *
   * Three fields because three different questions are asked of one event.
   * The engagement window is measured in *ticks*, which is the clock the
   * mixer is also handed — the two must agree about what one engagement is,
   * and no local clock is shared between them (docs/ui-ux.md §5). The pulse
   * is animated off `atMs`. And the position is resolved once, here, rather
   * than looked up at draw time: the blow that kills a hull is the one worth
   * drawing most, and by the next frame that hull is gone from the roster.
   */
  private readonly underFire = new Map<
    number,
    { tick: number; atMs: number; x: number; y: number }
  >();
  /**
   * Serial for own-force log rows. Contact rows key on `tick:id:tier`, which
   * is unique by construction; event rows have no tier to lean on, and two
   * pingers can light the same hull on one tick — so these rows carry a
   * serial instead of hoping.
   */
  private ownRowSeq = 0;

  /**
   * Mark ids the contact log has already written a row for, this match.
   *
   * See `newlyAudibleMarks`: a mark that goes quiet and comes back keeps its
   * id, so without this the log would report the player's own movement back
   * to them as if it were news.
   */
  private loggedMarks = new Set<number>();
  /**
   * The force as it stood at the previous snapshot.
   *
   * Self-events describe the interval that *ended* with the snapshot carrying
   * them, so the roster that can name their subject is the one from before
   * it — a hull destroyed by the blow being reported is already absent from
   * the roster that reports it.
   */
  private previousUnits: OwnUnit[] = [];
  private previousStructures: OwnStructure[] = [];

  private destroyed = false;
  private detachInput: (() => void) | null = null;

  constructor(callbacks: RendererCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * Ear-first (the law's default) or visual-first (docs/ui-ux.md §11: marks
   * arrive at ≤ 30 ms). Applies from the next mark drawn; marks already
   * fading keep the clock they started on.
   */
  setPrecedenceMode(mode: PrecedenceMode): void {
    this.precedence = precedenceTiming(mode);
  }

  /**
   * Swap the colour-vision palette (§11).
   *
   * The ink is module state rather than renderer state (see palette.ts for
   * why), so this call is the whole of it: the next frame reads the new
   * tables, and the baked hull and structure sprites re-bake because their
   * cache keys carry the palette's name.
   */
  setPalette(name: PaletteName): void {
    setActivePalette(name);
  }

  /**
   * Magnify the interface, 0.75-2.0 (§11).
   *
   * Clamped rather than trusted: this arrives from `localStorage`, and a HUD
   * scaled to zero is a HUD the player cannot use to fix the setting.
   */
  setUiScale(scale: number): void {
    const clamped = Number.isFinite(scale) ? Math.min(2, Math.max(0.75, scale)) : 1;
    this.uiScale = clamped;
    this.hud.scale.set(clamped);
  }

  /** Reduced motion (§11) — static equivalents, never removals. */
  setReducedMotion(reduced: boolean): void {
    this.reducedMotion = reduced;
  }

  /**
   * The HUD's own viewport, in the units its layout is written in.
   *
   * The `hud` container is scaled, so its children live in a coordinate space
   * `uiScale` times smaller than the canvas. Every HUD layout number goes
   * through here — a panel anchored to `app.screen.width` at 150% would sit a
   * third of the way off the right edge.
   */
  private hudWidth(): number {
    return this.app.screen.width / this.uiScale;
  }

  private hudHeight(): number {
    return this.app.screen.height / this.uiScale;
  }

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      // Transparent: the conn view's canvas below this one is the world, and
      // this canvas is the glass the marks are drawn on.
      backgroundAlpha: 0,
      resizeTo: host,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    // init() is async, so the host may already have been torn down by a
    // StrictMode double-mount by the time we get here.
    if (this.destroyed) {
      this.app.destroy(true, { children: true });
      return;
    }

    host.appendChild(this.app.canvas);

    // Contacts render above own structures: a tracked intruder inside your
    // base perimeter is the most urgent pixel on the screen, and must never
    // hide behind your own Bastion's marks. (The Bastion itself is the GL
    // canvas below everything here.)
    this.overlay.addChild(
      this.groundLayer,
      this.nodeLayer,
      this.ringLayer,
      this.structureSymbols.layer,
      this.contactLayer,
      this.contactSymbols.layer,
      this.unitSymbols.layer
    );
    this.hud.addChild(
      this.hudGraphics,
      this.ribbonGraphics,
      this.minimapTerrainG,
      this.minimapOverlayG,
      this.infoGraphics,
      this.barGraphics
    );
    this.app.stage.addChild(this.overlay, this.hud);

    this.buildHudText();
    this.attachInput();

    // Decode the concept-art plating in the background. Until it lands (or if
    // it never does), units and structures fall back to the vector shapes.
    loadHullArt().catch(() => {});
    loadStructureArt().catch(() => {});

    this.app.ticker.add(() => this.draw());
  }

  private buildHudText(): void {
    const mono = { fontFamily: 'ui-monospace, Consolas, monospace', fill: UI.text };

    // Top strip, left to right: nodules, SIG meter + value, contacts/status.
    this.resourceLabel = new Text({ text: '', style: { ...mono, fontSize: 13 } });
    this.resourceLabel.position.set(12, 8);

    this.crystalLabel = new Text({ text: '', style: { ...mono, fontSize: 13 } });
    this.crystalLabel.visible = false;

    this.sigLabel = new Text({ text: 'SIG --', style: { ...mono, fontSize: 13 } });

    this.bandLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 11, fill: UI.textDim },
    });

    this.exposureLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 11, fill: UI.threat },
    });
    this.exposureLabel.visible = false;

    this.mapLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 11, fill: UI.textDim },
    });
    this.mapLabel.visible = false;

    // Yields only after the map name has, and only to keep off §11's parity
    // readouts — see the ordering in `drawHud`.
    this.clockLabel = new Text({
      text: 'T+00:00',
      style: { ...mono, fontSize: 11, fill: UI.textDim },
    });

    this.drawLabel = new Text({ text: '', style: { ...mono, fontSize: 13 } });

    this.biomassLabel = new Text({ text: '', style: { ...mono, fontSize: 13 } });
    this.biomassLabel.visible = false;

    this.statusLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 12, fill: UI.textDim },
    });

    // Hint line sits just above the command panel.
    this.selectionLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 12, fill: UI.textDim },
    });

    this.bannerLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 28 },
    });
    this.bannerLabel.anchor.set(0.5);

    // The card's header takes the cyan "interface voice" (docs/style-neon-noir.md).
    this.infoName = new Text({ text: '', style: { ...mono, fontSize: 13, fill: UI.accent } });
    this.infoLine1 = new Text({ text: '', style: { ...mono, fontSize: 12, fill: UI.textDim } });
    this.infoLine2 = new Text({ text: '', style: { ...mono, fontSize: 12, fill: UI.textDim } });
    this.infoBadge = new Text({ text: '', style: { ...mono, fontSize: 10, fill: UI.textDim } });
    this.infoBadge.anchor.set(0.5);

    // One label per band, plus a readout under the strip for the selection's
    // actual depth — the bands are for reasoning, the number is for confirming.
    for (const band of [DepthBand.Shelf, DepthBand.MidWater, DepthBand.Abyssal]) {
      const label = new Text({
        text: BAND_LABEL[band],
        style: { ...mono, fontSize: 9, fill: UI.textDim },
      });
      this.ribbonLabels.push(label);
    }
    this.ribbonReadout = new Text({ text: '', style: { ...mono, fontSize: 10, fill: UI.accent } });

    // Cyan, like every passive readout — docs/style-neon-noir.md: "cyan tells
    // you, magenta asks you, red warns you". The band hairlines are the
    // magenta chrome token, so reusing that here would draw the layer as a
    // fourth band boundary: a different rule wearing the same ink.
    this.ductLabel = new Text({
      text: 'DUCT',
      style: { ...mono, fontSize: 8, fill: UI.accent },
    });
    this.ductLabel.visible = false;

    this.hud.addChild(
      this.sigLabel,
      this.bandLabel,
      this.exposureLabel,
      this.mapLabel,
      this.clockLabel,
      this.drawLabel,
      this.biomassLabel,
      this.resourceLabel,
      this.crystalLabel,
      this.statusLabel,
      this.selectionLabel,
      this.bannerLabel,
      this.infoName,
      this.infoLine1,
      this.infoLine2,
      this.infoBadge,
      this.ribbonReadout,
      this.ductLabel,
      ...this.ribbonLabels
    );
  }

  // --- The conn camera -------------------------------------------------------

  /**
   * Adopt the conn view whose camera this renderer draws and aims through.
   * Called once by the shell, before the first snapshot arrives; until then
   * the world-anchored overlays simply have nowhere to project and stay off.
   */
  setConn(conn: PerspectiveView): void {
    this.conn = conn;
  }

  /** The water under a pointer, or null before the conn view exists. */
  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } | null {
    return this.conn?.resolveGround(clientX, clientY) ?? null;
  }

  /** A world point as screen pixels, or null before the conn view exists. */
  private project(xM: number, yM: number, depthM: number | null): ProjectedPoint | null {
    return this.conn?.projectPoint(xM, yM, depthM) ?? null;
  }

  /**
   * How much larger than true scale the conn view is drawing own hulls and
   * structures (docs/art-direction.md "Far-zoom readability scale"). Only ink
   * *about* an own entity may read it; anything that measures water — range
   * rings, ping previews, aim reach — stays on true metres, which is why this
   * is a separate call and not folded into `project`.
   */
  private hullDrawScale(): number {
    return this.conn?.hullDrawScale() ?? 1;
  }

  /**
   * The water column a contact with no earned depth could be standing in,
   * projected top to bottom. Null when there is no conn view yet, or no
   * column worth drawing at that plan position.
   *
   * Below Tier 3 the server sends no depth, so the mark is a statement about
   * this column rather than a point at a height — see contactColumn.ts for
   * why the old 600 m reference had to go.
   *
   * True metres throughout, deliberately: the readability factor above is ink
   * *about an own hull*, and this measures water, exactly like a range ring.
   */
  private contactColumn(contact: Contact): ColumnPoint[] | null {
    const conn = this.conn;
    if (conn === null) return null;
    const depths = columnDepthsM(conn.seabedDepthAt(contact.x, contact.y));
    if (depths === null) return null;
    return depths.map((depthM) => conn.projectPoint(contact.x, contact.y, depthM));
  }

  /**
   * Trace a ground-lying circle into `g` as visible moveTo/lineTo runs; the
   * caller strokes it. Sampled rather than drawn as an ellipse because the
   * ring conforms to the terrain — a 2,400 m detection ring climbing a ridge
   * is the honest picture of a distance measured through the water.
   * Returns false when nothing was visible.
   */
  private traceCircle(
    g: Graphics,
    cx: number,
    cy: number,
    radiusM: number,
    depthM: number | null
  ): boolean {
    let open = false;
    let any = false;
    for (let i = 0; i <= CIRCLE_SEGMENTS; i++) {
      const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      const p = this.project(
        cx + Math.cos(angle) * radiusM,
        cy + Math.sin(angle) * radiusM,
        depthM
      );
      if (p === null) return false;
      if (!p.visible) {
        open = false;
        continue;
      }
      if (open) g.lineTo(p.x, p.y);
      else g.moveTo(p.x, p.y);
      open = true;
      any = true;
    }
    return any;
  }

  /** Fill a ground-lying circle as a projected polygon. Skipped when any
   * vertex leaves the frustum — a partial fill would invent an edge. */
  private fillCircle(
    g: Graphics,
    cx: number,
    cy: number,
    radiusM: number,
    depthM: number | null,
    fill: { color: number; alpha: number }
  ): void {
    const points: number[] = [];
    for (let i = 0; i < CIRCLE_SEGMENTS; i++) {
      const angle = (i / CIRCLE_SEGMENTS) * Math.PI * 2;
      const p = this.project(
        cx + Math.cos(angle) * radiusM,
        cy + Math.sin(angle) * radiusM,
        depthM
      );
      if (p === null || !p.visible) return;
      points.push(p.x, p.y);
    }
    g.poly(points).fill(fill);
  }

  /** A straight world segment on the ground — straight on screen too, so the
   * endpoints suffice. Dropped when either end leaves the frustum. */
  private traceLine(
    g: Graphics,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    depthM: number | null
  ): boolean {
    const a = this.project(x0, y0, depthM);
    const b = this.project(x1, y1, depthM);
    if (a === null || b === null || !a.visible || !b.visible) return false;
    g.moveTo(a.x, a.y).lineTo(b.x, b.y);
    return true;
  }

  /**
   * The view's footprint on the map in world metres, padded, for culling the
   * per-cell blocked-ground pass. Null before the conn view exists.
   */
  private viewBoundsM(
    padM: number
  ): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const quad = this.conn?.groundQuad() ?? [];
    if (quad.length < 4) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const corner of quad) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }
    return { minX: minX - padM, minY: minY - padM, maxX: maxX + padM, maxY: maxY + padM };
  }

  // --- Input ---------------------------------------------------------------

  private attachInput(): void {
    const canvas = this.app.canvas;
    // Two input dialects share this handler. Mouse keeps the classic RTS
    // bindings (LMB select, RMB order, MMB pan, wheel zoom). Touch gets one
    // vocabulary a phone can actually speak: tap = select-or-order, drag =
    // pan, pinch = zoom; everything else lives on the command bar.
    let panning = false;
    let lastX = 0;
    let lastY = 0;

    /** Live touch points, for one-finger pan and two-finger pinch. */
    const touches = new Map<number, { x: number; y: number }>();
    /** Candidate tap: cleared the moment the finger travels or a second lands. */
    let tapPointerId: number | null = null;
    let tapStartX = 0;
    let tapStartY = 0;
    /** Finger travel below this many CSS px still counts as a tap. */
    const TAP_SLOP_PX = 12;
    let pinchDistance = 0;

    const onContextMenu = (e: Event) => e.preventDefault();

    // A pointer can be gone before we capture it (lifted mid-handler, or a
    // synthetic event); losing the capture only costs drag-past-edge, never
    // the gesture itself, so it must not throw the handler dead.
    const capture = (pointerId: number) => {
      try {
        canvas.setPointerCapture(pointerId);
      } catch {
        /* no active pointer — nothing to capture */
      }
    };

    /** True while a press is scrubbing the sonar scope. */
    let minimapDrag = false;

    /**
     * End every in-flight gesture. Pointer capture retargets a held drag to
     * the canvas *through* the esc menu's glass, so the §9.5 guarantee that
     * pointer input dies there has to be enforced here too: a pan or scope
     * scrub held across the menu opening would otherwise keep driving the
     * camera under a menu that promised it would not.
     */
    const endGesture = (e: PointerEvent) => {
      touches.delete(e.pointerId);
      tapPointerId = null;
      pinchDistance = 0;
      minimapDrag = false;
      panning = false;
      this.marquee = null;
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (this.menuOpen) {
        endGesture(e);
        return;
      }
      // The sonar scope and the command bar swallow presses from every
      // pointer type before any world interpretation happens.
      if (e.button === 0 && this.pressMinimap(e.clientX, e.clientY)) {
        minimapDrag = true;
        capture(e.pointerId);
        return;
      }
      if (e.button === 0 && this.pressBarButton(e.clientX, e.clientY)) return;

      if (e.pointerType === 'touch') {
        touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        capture(e.pointerId);
        if (touches.size === 1) {
          tapPointerId = e.pointerId;
          tapStartX = e.clientX;
          tapStartY = e.clientY;
        } else {
          // A second finger is a gesture, never a tap.
          tapPointerId = null;
          if (touches.size === 2) {
            const [a, b] = [...touches.values()];
            pinchDistance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
          }
        }
        return;
      }

      if (e.button === 1) {
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        capture(e.pointerId);
        return;
      }

      if (e.button === 2) {
        // Shift queues the order behind whatever the unit is already doing.
        this.handleContextOrder(e.clientX, e.clientY, e.shiftKey, e.ctrlKey || e.metaKey);
        return;
      }

      // Left click while a build is pending: place it. The server rejects
      // illegal sites; the client does not pre-simulate placement rules.
      if (this.pendingBuild !== null) {
        const water = this.screenToWorld(e.clientX, e.clientY);
        if (water !== null) {
          this.callbacks.onBuild(this.pendingBuild, water.x, water.y);
          this.pendingBuild = null;
        }
        return;
      }

      // Left button starts a marquee. Whether it *is* one is decided on
      // release: under the slop threshold it was a click, and clicking is
      // still how you pick a single hull out of a crowd.
      this.marquee = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
      capture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (this.menuOpen) {
        endGesture(e);
        return;
      }
      if (minimapDrag) {
        this.pressMinimap(e.clientX, e.clientY);
        return;
      }

      if (this.marquee !== null) {
        this.marquee.x1 = e.clientX;
        this.marquee.y1 = e.clientY;
        return;
      }

      if (e.pointerType === 'touch') {
        const prev = touches.get(e.pointerId);
        if (prev === undefined) return;

        if (touches.size === 1) {
          if (
            tapPointerId === e.pointerId &&
            Math.hypot(e.clientX - tapStartX, e.clientY - tapStartY) > TAP_SLOP_PX
          ) {
            tapPointerId = null;
          }
          // One finger down and moving: pan. Harmless during a would-be tap —
          // sub-slop movement pans invisibly little.
          this.conn?.panBy(e.clientX - prev.x, e.clientY - prev.y);
        }

        prev.x = e.clientX;
        prev.y = e.clientY;

        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
          if (pinchDistance > 0 && distance > 0) {
            this.conn?.zoomAt((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, distance / pinchDistance);
          }
          pinchDistance = distance;
        }
        return;
      }

      if (!panning) return;
      this.conn?.panBy(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (this.menuOpen) {
        endGesture(e);
        return;
      }
      if (minimapDrag) {
        minimapDrag = false;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        return;
      }

      if (e.pointerType === 'touch') {
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        const wasTap = e.type === 'pointerup' && tapPointerId === e.pointerId;
        touches.delete(e.pointerId);
        tapPointerId = null;
        pinchDistance = 0;
        if (wasTap) this.handleTap(e.clientX, e.clientY);
        return;
      }

      if (this.marquee !== null) {
        const box = this.marquee;
        this.marquee = null;
        if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
        this.resolveSelection(box, e.shiftKey, e.ctrlKey || e.metaKey, e.altKey);
        return;
      }

      if (panning && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      panning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this.conn?.zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // The menu owns the keyboard while it is up (§9.5). Its own Escape
      // handling lives in the DOM beside the buttons it closes.
      if (this.menuOpen) return;
      // Escape first and unconditionally — it is not a binding (§9), it is the
      // way out of a pending build, and a way out you have to aim for is not
      // one. `RESERVED_CODES` is what stops a rebinder taking it.
      if (e.code === 'Escape') {
        if (this.pendingBuild !== null) {
          this.pendingBuild = null;
          return;
        }
        if (this.marquee !== null) {
          this.marquee = null;
          return;
        }
        // Nothing left to cancel: the same key is the way out of the water.
        this.callbacks.onOpenMenu();
        return;
      }
      // Digits are control groups (docs/ui-ux.md §9), Ctrl to assign. They
      // used to produce units; production keeps its command-bar buttons, and
      // the doc's binding wins because control groups have no alternative
      // route while production does. Also unbindable, for that reason.
      const digit = DIGIT_KEYS[e.code];
      if (digit !== undefined) {
        this.controlGroup(digit, e.ctrlKey || e.metaKey);
        return;
      }

      const action = actionFor(this.bindings, e.code);
      if (action === null) return;

      // Construction arms before the selection check: §9 gives the build keys
      // no selection requirement, and a player with nothing selected still
      // means to place a refinery.
      const buildKind =
        action === 'buildSignature' ? FACTION_STRUCTURE[this.faction] : BUILD_ACTION_KIND[action];
      if (buildKind !== undefined) {
        // Refused with the reason attached, rather than arming a placement
        // ghost for a click the server will drop. §7 forbids the silent drop,
        // and a ghost that follows the cursor to nothing is worse than silent:
        // it looks like it worked right up until it did not.
        if (this.refusedByMission('construction')) return;
        this.pendingBuild = buildKind;
        return;
      }
      // A faction with no signature structure has nothing to arm, and the key
      // is simply inert rather than arming somebody else's building.
      if (action === 'buildSignature') return;

      // The preview is a hold, and it is the one action that works with an
      // empty selection — it costs nothing to look.
      if (action === 'pingPreview') {
        e.preventDefault();
        this.previewPing = true;
        return;
      }

      if (this.selected.size === 0) return;

      switch (action) {
        case 'silentRunning':
          e.preventDefault();
          this.commandToggleSilent();
          return;
        case 'ping':
          this.commandPing();
          return;
        case 'throttle':
          this.commandCycleThrottle();
          return;
        case 'noisemaker':
          this.commandNoisemaker();
          return;
        case 'mine':
          this.commandLayMine();
          return;
        case 'depthCharge':
          this.commandDepthCharge();
          return;
        case 'dive':
          // Dive is down and rise is up. Mnemonic beats convention here: the
          // camera is on the middle mouse button and the wheel, so WASD is not
          // spoken for.
          this.commandDepthStep(1);
          return;
        case 'rise':
          this.commandDepthStep(-1);
          return;
        case 'followFloor':
          this.commandFollowFloor();
          return;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (this.menuOpen) return;
      if (actionFor(this.bindings, e.code) === 'pingPreview') this.previewPing = false;
    };

    canvas.addEventListener('contextmenu', onContextMenu);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    // A stolen gesture (browser navigation, notification shade) must clear
    // touch state or the next finger inherits a phantom pinch.
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.detachInput = () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  // --- Selection ------------------------------------------------------------

  /** Screen-space rect, normalised so x0/y0 is always the top-left corner. */
  private static normalise(box: { x0: number; y0: number; x1: number; y1: number }) {
    return {
      left: Math.min(box.x0, box.x1),
      right: Math.max(box.x0, box.x1),
      top: Math.min(box.y0, box.y1),
      bottom: Math.max(box.y0, box.y1),
    };
  }

  /**
   * Turn a completed drag into a selection.
   *
   * Under the slop threshold it was a click, not a drag — the two are the same
   * gesture until the mouse moves, and a player picking one hull out of a
   * crowd must not have their selection replaced by a one-pixel marquee.
   *
   * Selection carries no information risk: a player's own force is fully known
   * to them, so nothing here needs to be resolved server-side. Contacts are
   * deliberately not selectable — they are things heard, not things owned.
   */
  private resolveSelection(
    box: { x0: number; y0: number; x1: number; y1: number },
    add: boolean,
    subtract: boolean,
    selectAllOfType: boolean
  ): void {
    const rect = EchoRenderer.normalise(box);
    const dragged = Math.hypot(rect.right - rect.left, rect.bottom - rect.top) > DRAG_SLOP_PX;

    if (!dragged) {
      const now = performance.now();
      const doubled =
        now - this.lastClick.at < DOUBLE_CLICK_MS &&
        Math.hypot(box.x0 - this.lastClick.x, box.y0 - this.lastClick.y) < DRAG_SLOP_PX * 2;
      this.lastClick = { at: now, x: box.x0, y: box.y0 };

      const hit = this.nearestOwnEntityAt(box.x0, box.y0);

      if (hit === null) {
        if (!add && !subtract) this.selected.clear();
        this.onSelectionChanged();
        return;
      }

      // Double-click, or Alt-click, takes every visible hull of that class —
      // the standard "select all of type" without needing a second gesture.
      if (doubled || selectAllOfType) {
        const kind = this.units.find((u) => u.id === hit)?.kind;
        if (kind !== undefined) {
          if (!add) this.selected.clear();
          for (const unit of this.unitsOnScreen()) {
            if (unit.kind === kind) this.selected.add(unit.id);
          }
          this.onSelectionChanged();
          return;
        }
      }

      if (subtract) this.selected.delete(hit);
      else {
        if (!add) this.selected.clear();
        this.selected.add(hit);
      }
      this.onSelectionChanged();
      return;
    }

    // A real marquee. Structures are excluded: dragging across your own base
    // to grab an escort should not also grab the Bastion, and a mixed
    // selection makes the command panel meaningless. Inclusion is judged on
    // each hull's *drawn* position — projected at its depth — because the box
    // the player dragged was around what they saw, not around seabed plumbs.
    const canvasRect = this.app.canvas.getBoundingClientRect();
    const inside: number[] = [];
    for (const unit of this.units) {
      const p = this.project(unit.x, unit.y, unit.depth);
      if (p === null || !p.visible) continue;
      const sx = p.x + canvasRect.left;
      const sy = p.y + canvasRect.top;
      if (sx >= rect.left && sx <= rect.right && sy >= rect.top && sy <= rect.bottom) {
        inside.push(unit.id);
      }
    }

    if (subtract) {
      for (const id of inside) this.selected.delete(id);
    } else {
      if (!add) this.selected.clear();
      for (const id of inside) this.selected.add(id);
    }
    this.onSelectionChanged();
  }

  private unitsOnScreen(): OwnUnit[] {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    return this.units.filter((unit) => {
      const p = this.project(unit.x, unit.y, unit.depth);
      return p !== null && p.visible && p.x >= 0 && p.x <= width && p.y >= 0 && p.y <= height;
    });
  }

  // --- Control groups -------------------------------------------------------

  /**
   * Assign the live selection to a group, or recall one.
   *
   * Recalling twice in quick succession centres the camera on the group —
   * the binding every RTS player already has in their hands.
   */
  private controlGroup(group: number, assign: boolean): void {
    if (assign) {
      if (this.selected.size === 0) this.controlGroups.delete(group);
      else this.controlGroups.set(group, [...this.selected]);
      return;
    }

    const members = this.controlGroups.get(group);
    if (members === undefined) return;
    // Dead units are pruned on recall rather than on death: the snapshot is
    // the only place the client learns a hull is gone.
    const alive = members.filter(
      (id) => this.units.some((u) => u.id === id) || this.structures.some((st) => st.id === id)
    );
    if (alive.length === 0) {
      this.controlGroups.delete(group);
      return;
    }
    this.controlGroups.set(group, alive);

    this.selected.clear();
    for (const id of alive) this.selected.add(id);
    this.onSelectionChanged();

    const now = performance.now();
    if (this.lastGroupRecall.group === group && now - this.lastGroupRecall.at < DOUBLE_TAP_MS) {
      this.centreOnSelection();
    }
    this.lastGroupRecall = { group, at: now };
  }

  private centreOnSelection(): void {
    const members = [...this.selected];
    if (members.length === 0) return;
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (const id of members) {
      const entity =
        this.units.find((u) => u.id === id) ?? this.structures.find((st) => st.id === id);
      if (entity === undefined) continue;
      sx += entity.x;
      sy += entity.y;
      n++;
    }
    if (n === 0) return;
    this.conn?.focusWorld(sx / n, sy / n);
  }

  // --- Command bar ----------------------------------------------------------

  /**
   * Run the button under a screen point, if any. Returns true when the press
   * was consumed, so world input never fires through the bar.
   */
  private pressBarButton(clientX: number, clientY: number): boolean {
    const rect = this.app.canvas.getBoundingClientRect();
    // Back through the HUD's scale: the bar was laid out in virtual pixels, so
    // a click has to be expressed in them before it can be compared.
    const x = (clientX - rect.left) / this.uiScale;
    const y = (clientY - rect.top) / this.uiScale;
    if (y < this.hudHeight() - BAR_HEIGHT) return false;
    for (const button of this.barButtons) {
      if (x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h) {
        if (button.enabled) button.action();
        return true;
      }
    }
    // A press on the bar's dead space is still the bar's, not the world's.
    return true;
  }

  // --- Sonar scope (minimap) ------------------------------------------------

  /** The scope's screen rect. Sized down on narrow screens. */
  private minimapRect(): { x: number; y: number; size: number } {
    const size = this.hudWidth() < 700 ? 110 : 170;
    return { x: 10, y: this.hudHeight() - BAR_HEIGHT - size - 10, size };
  }

  /**
   * What the scope's rings and sweep are centred on: the player's Bastion,
   * falling back to their centre of mass. The rings measure the ping from
   * where the player actually is, which is the only place the numbers mean
   * anything.
   */
  private scopeAnchor(): { x: number; y: number } | null {
    const bastion = this.structures.find((st) => st.kind === StructureKind.Bastion);
    if (bastion !== undefined) return { x: bastion.x, y: bastion.y };
    if (this.units.length === 0) return null;
    let sx = 0;
    let sy = 0;
    for (const unit of this.units) {
      sx += unit.x;
      sy += unit.y;
    }
    return { x: sx / this.units.length, y: sy / this.units.length };
  }

  /** Map metres per scope pixel. */
  private minimapScale(size: number): number {
    const terrain = this.terrain;
    if (terrain === null) return 1;
    return size / Math.max(terrain.cols * terrain.cellM, terrain.rows * terrain.cellM);
  }

  /**
   * A press on the scope jumps the camera there; a drag scrubs it. Returns
   * true when the point was inside the scope.
   */
  private pressMinimap(clientX: number, clientY: number): boolean {
    const rect = this.app.canvas.getBoundingClientRect();
    const px = (clientX - rect.left) / this.uiScale;
    const py = (clientY - rect.top) / this.uiScale;
    const { x, y, size } = this.minimapRect();
    if (px < x || px > x + size || py < y || py > y + size) return false;
    const k = this.minimapScale(size);
    if (k <= 0) return true;
    this.conn?.focusWorld((px - x) / k, (py - y) / k);
    return true;
  }

  // --- Command panel model --------------------------------------------------

  /**
   * Where a produce order lands when no factory is selected: the classic
   * sidebar behaviour — the first completed structure able to build the kind,
   * preferring the Foundry (it builds everything) over the Bastion.
   */
  private produceTargetFor(kind: UnitKind): OwnStructure | undefined {
    const eligible = (s: OwnStructure) =>
      s.buildProgress >= 1 && (PRODUCIBLE[s.kind]?.includes(kind) ?? false);
    const selected = this.structures.find((s) => this.selected.has(s.id) && eligible(s));
    if (selected !== undefined) return selected;
    const foundry = this.structures.find((s) => s.kind === StructureKind.Foundry && eligible(s));
    return foundry ?? this.structures.find(eligible);
  }

  /**
   * The page actually shown, which is `activeTab` unless the mission has taken
   * construction away — then there is only one page there is anything to put
   * on. Read everywhere rather than coercing `activeTab` itself, so the
   * player's own last choice survives a mission that merely hid it.
   */
  private get shownTab(): CommandTab {
    return this.missionLock('construction') === null ? this.activeTab : 'squad';
  }

  /** Auto-open the page that matches what was just selected. */
  private onSelectionChanged(): void {
    const structure = this.structures.find((s) => this.selected.has(s.id));
    if (structure !== undefined && (PRODUCIBLE[structure.kind]?.length ?? 0) > 0) {
      this.activeTab = 'units';
    } else if (this.selectedUnits().length > 0) {
      this.activeTab = 'squad';
    } else if (this.selected.size === 0) {
      this.activeTab = 'build';
    }
  }

  /**
   * What the panel offers depends on the open tab — the C&C sidebar as one
   * contextual row under a tab strip. Every action here also has a keyboard
   * binding; the panel exists so a touchscreen can reach them at all.
   */
  private buildBarModel(): Array<Omit<BarButton, 'x' | 'y' | 'w' | 'h'>> {
    const buttons: Array<Omit<BarButton, 'x' | 'y' | 'w' | 'h'>> = [];

    if (this.pendingBuild !== null) {
      const stats = structureStatsFor(this.pendingBuild);
      buttons.push({
        label: `CANCEL ${STRUCTURE_SHORT[this.pendingBuild]} ${stats.cost}`,
        enabled: true,
        active: true,
        action: () => {
          this.pendingBuild = null;
        },
      });
      return buttons;
    }

    if (this.shownTab === 'units') {
      // One row of the whole roster; each button routes to a structure that
      // can actually build it, selected or not.
      const roster = PRODUCIBLE[StructureKind.Foundry] ?? [];
      for (const kind of roster) {
        const cost = statsFor(kind).cost;
        const target = this.produceTargetFor(kind);
        buttons.push({
          label: `${UNIT_SHORT[kind]} ${cost}`,
          enabled: target !== undefined && this.nodules >= cost,
          active: false,
          action: () => this.commandProduce(kind),
        });
      }
    } else if (this.shownTab === 'squad') {
      const units = this.selectedUnits();
      const first = units[0];
      buttons.push({
        label: 'SILENT',
        enabled: units.length > 0,
        active: first?.silentRunning ?? false,
        action: () => this.commandToggleSilent(),
      });
      // A locked ability is dead on the bar, not merely refused on the press.
      // §7 wants the affordance to be visibly gone *before* the player reaches
      // for it; the reason is already standing in the orders panel, so a
      // greyed button here is the second half of one statement rather than a
      // silent drop. Applies to the whole ordnance row below for the same
      // reason — every one of them is an ability a mission can withhold.
      buttons.push({
        label: 'PING',
        enabled: units.length > 0 && this.missionLock('activeSonar') === null,
        active: false,
        action: () => this.commandPing(),
      });
      buttons.push({
        label: 'DIVE',
        enabled: units.length > 0 && this.stepDepthTarget(units, 1) !== null,
        active: units.some((u) => u.depthOrder !== undefined && u.depthOrder > u.depth),
        action: () => this.commandDepthStep(1),
      });
      buttons.push({
        label: 'RISE',
        enabled: units.length > 0 && this.stepDepthTarget(units, -1) !== null,
        active: units.some((u) => u.depthOrder !== undefined && u.depthOrder < u.depth),
        action: () => this.commandDepthStep(-1),
      });
      buttons.push({
        // The standing order (docs/systems-depth.md §2): hug the seabed at
        // station keeping. Lit while any of the selection is following, so a
        // squad that half-disengaged at a PR edge is visible as exactly that.
        label: 'FOLLOW',
        enabled: units.length > 0,
        active: units.some((u) => u.followFloor === true),
        action: () => this.commandFollowFloor(),
      });
      // Ordnance, docs/systems-combat.md §5, §6, §8. Each button reports its
      // own scarcity rather than merely greying out: a torpedo count and a
      // decoy cooldown are decisions the player is supposed to be making, and
      // a weapon whose state is invisible is one they will reach for at the
      // moment it is not there.
      const armed = units.filter((u) => u.torpedoes !== undefined);
      if (armed.length > 0) {
        const aboard = armed[0]!.torpedoes ?? 0;
        buttons.push({
          label: `TORP ${aboard}`,
          // No action of its own: a launch needs a contact, so it is
          // CTRL+right-click. The button is the readout.
          enabled: false,
          active: aboard > 0,
          action: () => {},
        });
      }
      if (units.length > 0) {
        const cooling = first?.decoyCooldownS;
        buttons.push({
          label: cooling === undefined ? 'DECOY' : `DECOY ${Math.ceil(cooling)}`,
          enabled: cooling === undefined && this.missionLock('noisemakers') === null,
          active: false,
          action: () => this.commandNoisemaker(),
        });
        buttons.push({
          label: 'MINE',
          enabled: this.missionLock('mines') === null,
          active: false,
          action: () => this.commandLayMine(),
        });
        buttons.push({
          label: 'CHARGE',
          enabled:
            this.stepDepthTarget(units, 1) !== null && this.missionLock('depthCharges') === null,
          active: false,
          action: () => this.commandDepthCharge(),
        });
      }

      const harvester = units.find((u) => u.throttle !== undefined);
      if (harvester !== undefined) {
        buttons.push({
          label: `THR ${THROTTLE_LABEL[harvester.throttle!]}`,
          enabled: true,
          active: harvester.throttle === HarvestThrottle.Overburden,
          action: () => this.commandCycleThrottle(),
        });
      }
    } else {
      const roster = [
        StructureKind.Refinery,
        StructureKind.Foundry,
        StructureKind.SentinelTurret,
        StructureKind.VentTap,
      ];
      const signature = FACTION_STRUCTURE[this.faction];
      if (signature !== undefined) roster.push(signature);
      for (const kind of roster) {
        const stats = structureStatsFor(kind);
        buttons.push({
          label: `${STRUCTURE_SHORT[kind]} ${stats.cost}`,
          enabled: this.nodules >= stats.cost,
          active: false,
          action: () => {
            this.pendingBuild = kind;
          },
        });
      }
    }

    if (this.selected.size > 0) {
      buttons.push({
        label: '✕',
        enabled: true,
        active: false,
        action: () => {
          this.selected.clear();
          this.onSelectionChanged();
        },
      });
    }
    return buttons;
  }

  /**
   * The build keys as currently bound, for the hint bar.
   *
   * Read from the table rather than written as `R/F/T/B`, because a hint that
   * names a key the player has moved is worse than no hint: §7 rules out the
   * silent refusal, and a *confidently wrong* instruction is the same failure
   * wearing a better coat.
   */
  private buildKeyHint(): string {
    const codes = [
      this.bindings.buildRefinery,
      this.bindings.buildFoundry,
      this.bindings.buildTurret,
      this.bindings.buildVentTap,
    ];
    if (FACTION_STRUCTURE[this.faction] !== undefined) codes.push(this.bindings.buildSignature);
    return codes.map(keyLabel).join('/');
  }

  private barText(index: number): Text {
    let text = this.barTexts[index];
    if (text === undefined) {
      text = new Text({
        text: '',
        style: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 12, fill: UI.text },
      });
      text.anchor.set(0.5);
      this.barTexts.push(text);
      this.hud.addChild(text);
    }
    return text;
  }

  private drawCommandBar(): void {
    const g = this.barGraphics;
    g.clear();

    const screenWidth = this.hudWidth();
    const barY = this.hudHeight() - BAR_HEIGHT;
    g.rect(0, barY, screenWidth, BAR_HEIGHT).fill({ color: UI.glass, alpha: 0.92 });
    g.rect(0, barY, screenWidth, 1).fill({ color: UI.glassStroke });

    // Tab strip. 'squad' only exists while units are selected, and 'build' and
    // 'units' only exist where there is an economy to use them: a mission that
    // has locked construction has no yard, no stockpile and nothing to place,
    // so offering five structures nobody can afford is a menu of refusals. The
    // reason is not lost — it stands in the orders panel's lock list with the
    // other six, which is where docs/ui-ux.md §7 wants it.
    const canBuild = this.missionLock('construction') === null;
    const tabs: CommandTab[] = canBuild
      ? this.selectedUnits().length > 0
        ? ['build', 'units', 'squad']
        : ['build', 'units']
      : ['squad'];
    const tabButtons: BarButton[] = [];
    let tabX = 10;
    for (const tab of tabs) {
      const w = TAB_LABEL[tab].length * 7.5 + 22;
      tabButtons.push({
        x: tabX,
        y: barY,
        w,
        h: TAB_HEIGHT,
        label: TAB_LABEL[tab],
        enabled: true,
        active: this.shownTab === tab,
        action: () => {
          this.activeTab = tab;
        },
      });
      tabX += w + 4;
    }

    // §9.5's menu, reachable by a finger. Esc is the keyboard's door, and a
    // touchscreen has no Esc — the bar is how a touchscreen reaches anything
    // at all, so the way out sits on it like everything else does.
    const menuW = 'MENU'.length * 7.5 + 22;
    tabButtons.push({
      x: screenWidth - 10 - menuW,
      y: barY,
      w: menuW,
      h: TAB_HEIGHT,
      label: 'MENU',
      enabled: true,
      active: false,
      action: () => this.callbacks.onOpenMenu(),
    });

    const model = this.buildBarModel();
    const gap = 8;
    const buttonY = barY + TAB_HEIGHT + (BUTTON_ROW_HEIGHT - BAR_BUTTON_HEIGHT) / 2;

    const widthFor = (label: string) => Math.max(44, label.length * 7.5 + 18);
    // A full row must fit a phone: when it would overflow, drop the cost
    // suffix from every label ("CRV 120" -> "CRV") and keep the buttons.
    const total = model.reduce((sum, entry) => sum + widthFor(entry.label) + gap, 10);
    if (total > screenWidth) {
      for (const entry of model) entry.label = entry.label.split(' ')[0]!;
    }

    let x = 10;
    this.barButtons = model.map((entry) => {
      const w = widthFor(entry.label);
      const button: BarButton = { ...entry, x, y: buttonY, w, h: BAR_BUTTON_HEIGHT };
      x += w + gap;
      return button;
    });
    this.barButtons.push(...tabButtons);

    this.barButtons.forEach((button, i) => {
      const alpha = button.enabled ? 1 : 0.35;
      // Neon is edges, never fills (docs/style-neon-noir.md): activeness lives
      // in the bevel's brightness; inactive bevels dim to 40 %.
      g.roundRect(button.x, button.y, button.w, button.h, 6).fill({
        color: button.active ? UI.glass : 0x000000,
        alpha: alpha * (button.active ? 0.9 : 0.45),
      });
      g.roundRect(button.x, button.y, button.w, button.h, 6).stroke({
        width: 1,
        color: UI.glassStroke,
        alpha: alpha * (button.active ? 1 : 0.4),
      });
      const text = this.barText(i);
      text.visible = true;
      text.text = button.label;
      text.style.fill = button.enabled ? UI.text : UI.textDim;
      text.position.set(button.x + button.w / 2, button.y + button.h / 2);
    });
    for (let i = this.barButtons.length; i < this.barTexts.length; i++) {
      this.barTexts[i]!.visible = false;
    }
  }

  // --- Commands shared by keyboard and the command bar ----------------------

  private selectedUnits(): OwnUnit[] {
    return this.units.filter((u) => this.selected.has(u.id));
  }

  /**
   * Queue a unit: at every selected structure that can build it, else at the
   * sidebar's default factory (see produceTargetFor).
   */
  private commandProduce(kind: UnitKind): void {
    // Unreachable from the bar while construction is locked — the tab it lives
    // on is not offered — but the check belongs on the command rather than on
    // the button, which is where every other mission refusal sits.
    if (this.refusedByMission('construction')) return;
    const selectedTargets = this.structures.filter(
      (s) => this.selected.has(s.id) && (PRODUCIBLE[s.kind]?.includes(kind) ?? false)
    );
    if (selectedTargets.length > 0) {
      for (const structure of selectedTargets) this.callbacks.onProduce(structure.id, kind);
      return;
    }
    const target = this.produceTargetFor(kind);
    if (target !== undefined) this.callbacks.onProduce(target.id, kind);
  }

  private commandToggleSilent(): void {
    const units = this.selectedUnits();
    if (units.length === 0) return;
    // Toggle based on the first selected unit's current state.
    this.callbacks.onToggleSilent(
      units.map((u) => u.id),
      !(units[0]?.silentRunning ?? false)
    );
  }

  private commandPing(): void {
    // A struck array is not a cooldown: the hull has no transmitter, and the
    // mission says so on the hint bar rather than letting P do nothing.
    if (this.refusedByMission('activeSonar')) {
      this.previewPing = false;
      return;
    }
    const units = this.selectedUnits();
    if (units.length > 0) this.callbacks.onPing(units[0]!.id);
    this.previewPing = false;
  }

  /** Cycle the harvest throttle: how loud am I willing to be paid. */
  /**
   * The depth a step in `direction` would take the selection to (+1 deeper,
   * -1 shallower), or null when the whole selection is already at the end of
   * the stack. Orders step rung to rung; see DEPTH_STATIONS_M.
   *
   * The lead unit decides the target so a mixed-depth squad moves as one
   * formation rather than fanning out across two bands.
   */
  private stepDepthTarget(units: OwnUnit[], direction: 1 | -1): number | null {
    const lead = units[0];
    if (lead === undefined) return null;
    // Step from where the hull is headed if it is already moving, so repeated
    // presses queue deeper rather than re-issuing the same order.
    const reference = lead.depthOrder ?? lead.depth;
    const next = rungFor(reference) + direction;
    if (next < 0 || next >= DEPTH_STATIONS_M.length) return null;
    return DEPTH_STATIONS_M[next]!;
  }

  private commandDepthStep(direction: 1 | -1): void {
    const units = this.selectedUnits();
    if (units.length === 0) return;
    const target = this.stepDepthTarget(units, direction);
    if (target === null) return;
    this.callbacks.onDepthOrder(
      units.map((u) => u.id),
      target
    );
  }

  /**
   * The standing order (docs/systems-depth.md §2). Engage when any of the
   * selection is not yet following, disarm only when all are — the same
   * converge-then-toggle shape a mixed silent squad gets, so one press means
   * one thing for the whole selection.
   */
  private commandFollowFloor(): void {
    const units = this.selectedUnits();
    if (units.length === 0) return;
    const engage = !units.every((u) => u.followFloor === true);
    this.callbacks.onFollowFloor(
      units.map((u) => u.id),
      engage
    );
  }

  /**
   * Launch at whatever contact the cursor is on — docs/systems-combat.md §5.
   *
   * Reuses `nearestContact`, which already refuses anything below Tier 2
   * because a Tier-1 smudge carries no usable position. That is the same gate
   * the server enforces in `Match.orderLaunchTorpedo`, arrived at independently
   * from the same fact, so the button is never offered for a shot the server
   * would refuse.
   */
  private commandLaunchTorpedo(clientX: number, clientY: number): void {
    if (this.refusedByMission('torpedoes')) return;
    const units = this.selectedUnits().filter((u) => u.torpedoes !== undefined);
    if (units.length === 0) return;
    const contact = this.nearestContactAt(clientX, clientY);
    if (contact === null) return;
    this.callbacks.onLaunchTorpedo(
      units.filter((u) => (u.torpedoes ?? 0) > 0).map((u) => u.id),
      contact.id
    );
  }

  private commandNoisemaker(): void {
    // A decoy is a countermeasure and a shout at once, which is why a silence
    // order strikes it with the tubes rather than leaving it as the one loud
    // thing a stripped hull can still do (docs/mission-sorrowgate.md §3).
    if (this.refusedByMission('noisemakers')) return;
    const units = this.selectedUnits().filter((u) => u.decoyCooldownS === undefined);
    if (units.length === 0) return;
    this.callbacks.onDeployNoisemaker(units.map((u) => u.id));
  }

  private commandLayMine(): void {
    if (this.refusedByMission('mines')) return;
    const units = this.selectedUnits();
    if (units.length === 0) return;
    this.callbacks.onLayMine(units.map((u) => u.id));
  }

  /**
   * Drop a charge into the band below — §8.
   *
   * The band below rather than an arbitrary depth, because that is the decision
   * the weapon exists for: the hull under you is in the next band down, and
   * getting a charge to it is the whole of the vertical argument. Reuses the
   * same band stepping the dive order uses, so "one band down" means one thing.
   */
  private commandDepthCharge(): void {
    if (this.refusedByMission('depthCharges')) return;
    const units = this.selectedUnits();
    if (units.length === 0) return;
    const target = this.stepDepthTarget(units, 1);
    if (target === null) return;
    this.callbacks.onDepthCharge(
      units.map((u) => u.id),
      target
    );
  }

  private commandCycleThrottle(): void {
    const harvesters = this.selectedUnits().filter((u) => u.throttle !== undefined);
    if (harvesters.length === 0) return;
    const next = ((harvesters[0]!.throttle! + 1) % 4) as HarvestThrottle;
    this.callbacks.onThrottle(
      harvesters.map((u) => u.id),
      next
    );
  }

  /**
   * A touch tap collapses select and order into one gesture: tapping an own
   * entity selects it; tapping anywhere else with a selection issues the same
   * context order a right-click would. Deselection lives on the command bar,
   * because "tap empty water" already means "move there".
   */
  private handleTap(clientX: number, clientY: number): void {
    if (this.pendingBuild !== null) {
      const water = this.screenToWorld(clientX, clientY);
      if (water !== null) {
        this.callbacks.onBuild(this.pendingBuild, water.x, water.y);
        this.pendingBuild = null;
      }
      return;
    }
    const hit = this.nearestOwnEntityAt(clientX, clientY);
    if (hit !== null) {
      this.selected.clear();
      this.selected.add(hit);
      this.onSelectionChanged();
      return;
    }
    if (this.selected.size > 0) this.handleContextOrder(clientX, clientY, false);
  }

  /**
   * Right click is the classic RTS context order: a nodule field sends
   * harvesters to work, a heard contact is an attack order, open water is a
   * move. The server re-validates everything; this is only intent.
   */
  private handleContextOrder(
    clientX: number,
    clientY: number,
    queued = false,
    torpedo = false
  ): void {
    if (this.selected.size === 0) return;

    // Ctrl+right-click is the launch. A modifier on the order that already
    // means "engage that contact", rather than a key, because a torpedo needs
    // the one thing a key press does not carry: which contact you meant.
    if (torpedo) {
      this.commandLaunchTorpedo(clientX, clientY);
      return;
    }
    const selectedUnits = this.units.filter((u) => this.selected.has(u.id));
    const unitIds = selectedUnits.map((u) => u.id);
    const water = this.screenToWorld(clientX, clientY);

    const node = this.nearestNodeAt(clientX, clientY);
    const harvesterIds = selectedUnits.filter((u) => u.throttle !== undefined).map((u) => u.id);
    if (node !== null && harvesterIds.length > 0) {
      this.callbacks.onHarvestOrder(harvesterIds, node.id, queued);
      // Everything else in the selection escorts the harvesters.
      const rest = unitIds.filter((id) => !harvesterIds.includes(id));
      if (rest.length > 0 && water !== null)
        this.callbacks.onMoveOrder(rest, water.x, water.y, queued);
      return;
    }

    const contact = this.nearestContactAt(clientX, clientY);
    if (contact !== null && unitIds.length > 0) {
      // Weapons struck: the order that would have been an attack falls
      // through to the move it can still be, rather than being swallowed.
      // The hint bar says which of the two the player got, and why.
      if (!this.refusedByMission('weapons')) {
        this.callbacks.onAttackOrder(unitIds, contact.id, queued);
        return;
      }
    }

    if (unitIds.length > 0 && water !== null) {
      this.callbacks.onMoveOrder(unitIds, water.x, water.y, queued);
    }
  }

  /**
   * The pointer, expressed in this canvas's own pixels — the space
   * `projectPoint` answers in.
   */
  private pointerPx(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  /**
   * Aim tests are screen-space now: the player clicks what is *drawn*, and a
   * hull 600 m above its seabed plumb is drawn well away from the water the
   * ground ray lands on. The old world-metre radii still set the reach —
   * scaled to the local pixels-per-metre — with a pixel floor so a pulled-back
   * camera never demands pixel-perfect aim.
   */
  private nearestNodeAt(clientX: number, clientY: number): ResourceNodeInfo | null {
    const at = this.pointerPx(clientX, clientY);
    let best: ResourceNodeInfo | null = null;
    let bestDistance = Infinity;
    for (const node of this.nodes) {
      const p = this.project(node.x, node.y, null);
      if (p === null || !p.visible) continue;
      const reach = Math.max(TARGET_RADIUS_M * p.pxPerM, AIM_FLOOR_PX);
      const distance = Math.hypot(p.x - at.x, p.y - at.y);
      if (distance < reach && distance < bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }
    return best;
  }

  private nearestContactAt(clientX: number, clientY: number): Contact | null {
    const at = this.pointerPx(clientX, clientY);
    let best: Contact | null = null;
    let bestDistance = Infinity;
    for (const { contact } of this.tracked.values()) {
      // A Tier-1 smudge has no usable position to click on.
      if (contact.tier < ResolutionTier.Bearing) continue;
      let distance: number;
      let reach: number;
      if (contact.depth === undefined) {
        // No earned depth, so the mark *is* the column and the whole column
        // is the target. Aiming at one height down it would be aiming at a
        // place the screen never claimed the contact was.
        const points = this.contactColumn(contact);
        if (points === null) continue;
        const mid = points[(points.length - 1) >> 1]!;
        if (!mid.visible) continue;
        distance = distanceToColumn(at.x, at.y, points);
        reach = Math.max(TARGET_RADIUS_M * mid.pxPerM, AIM_FLOOR_PX);
      } else {
        const p = this.project(contact.x, contact.y, contact.depth);
        if (p === null || !p.visible) continue;
        distance = Math.hypot(p.x - at.x, p.y - at.y);
        reach = Math.max(TARGET_RADIUS_M * p.pxPerM, AIM_FLOOR_PX);
      }
      if (distance < reach && distance < bestDistance) {
        bestDistance = distance;
        best = contact;
      }
    }
    return best;
  }

  /** Nearest own unit or structure id under the pointer, for selection. */
  private nearestOwnEntityAt(clientX: number, clientY: number): number | null {
    const at = this.pointerPx(clientX, clientY);
    let best: number | null = null;
    let bestDistance = Infinity;
    for (const unit of this.units) {
      const p = this.project(unit.x, unit.y, unit.depth);
      if (p === null || !p.visible) continue;
      const reach = Math.max(SELECT_RADIUS_M * p.pxPerM, AIM_FLOOR_PX);
      const distance = Math.hypot(p.x - at.x, p.y - at.y);
      if (distance < reach && distance < bestDistance) {
        bestDistance = distance;
        best = unit.id;
      }
    }
    for (const structure of this.structures) {
      const p = this.project(structure.x, structure.y, null);
      if (p === null || !p.visible) continue;
      const reachM = structureStatsFor(structure.kind).radiusM + 40;
      const reach = Math.max(reachM * p.pxPerM, AIM_FLOOR_PX);
      const distance = Math.hypot(p.x - at.x, p.y - at.y);
      if (distance < reach && distance < bestDistance) {
        bestDistance = distance;
        best = structure.id;
      }
    }
    return best;
  }

  // --- State in ------------------------------------------------------------

  setStatus(status: string): void {
    this.status = status;
  }

  setIdentity(slot: number, faction: Faction): void {
    this.slot = slot;
    this.faction = faction;
  }

  setMap(map: MapPayload): void {
    this.map = map;
    this.mapLabel.text = map.name.toUpperCase();
    this.mapNamed = true;
    // Inert hazard sites draw per frame now (drawStaticHazardSites) — ground
    // you can read before you enter it, projected like the rest of the ground.
    this.minimapCachedSize = 0;
  }

  setTerrain(terrain: TerrainPayload): void {
    // The ground itself — seabed, routes, rim — is the conn view's. This
    // renderer keeps the payload for what the *instruments* read off it:
    // biome lookups, the scope's chart, blocked-ground cells.
    this.terrain = terrain;
    this.minimapCachedSize = 0;
  }

  /**
   * Ground that changed mid-match — docs/mission-sorrowgate.md §9 (#197), and
   * the biome with it (#259).
   *
   * Cells rather than a rectangle, so there is no metres-to-cells arithmetic
   * here to agree with the server about. The camera is deliberately *not*
   * refitted: the map did not get bigger, a span of it fell in, and yanking
   * the view at the moment the player is watching a colossus go through would
   * take the event away from them.
   *
   * The biome write matters twice over: the terrain layer paints from it, and
   * `biomeAt` answers from it — so a scope that did not take it would keep
   * naming the water by what used to be there.
   */
  applyGround(
    cells: readonly { index: number; floorM: number; ceilingM: number; biome: number }[]
  ): void {
    const terrain = this.terrain;
    if (terrain === null || cells.length === 0) return;
    for (const cell of cells) {
      if (cell.index < 0 || cell.index >= terrain.floor.length) continue;
      terrain.floor[cell.index] = cell.floorM;
      terrain.ceiling[cell.index] = cell.ceilingM;
      terrain.biomes[cell.index] = cell.biome;
    }
    // The scope caches its own terrain layer, and the ground it cached is the
    // ground that just stopped existing.
    this.minimapCachedSize = 0;
  }

  setNodes(nodes: ResourceNodeInfo[]): void {
    this.nodes = nodes;
    // Nodes are baked into the scope's cached terrain layer.
    this.minimapCachedSize = 0;
  }

  setGameOver(payload: GameOverPayload): void {
    this.gameOver = payload;
  }

  /**
   * What this mission has taken away, straight off the mission view.
   *
   * The server refuses a locked order regardless — this is not a permission
   * check, and the client is not where the rule lives. It is what lets the
   * HUD say *why* instead of a key press vanishing into the socket.
   */
  /**
   * Install a binding table (docs/ui-ux.md §11). Live: the settings store's
   * `subscribe` calls this mid-match, so a player who rebinds in the esc menu
   * does not have to leave the water to find out whether it suits them.
   */
  setBindings(bindings: Bindings): void {
    this.bindings = { ...bindings };
    // A preview held down when its key moved would stick on forever, because
    // the keyup that would have cleared it names a code nothing matches now.
    this.previewPing = false;
  }

  /**
   * The esc menu opened or closed (docs/ui-ux.md §9.5). While it is open the
   * water cannot hear the keyboard — see `menuOpen` on the field.
   */
  setMenuOpen(open: boolean): void {
    this.menuOpen = open;
    if (open) {
      // Holds do not survive the menu: the keyup that would have ended the
      // preview lands on the menu's glass, where this renderer is not
      // listening. A drag is the same story with a pointer.
      this.previewPing = false;
      this.marquee = null;
    }
  }

  setMissionLocks(locks: AbilityLock[]): void {
    this.missionLocks = locks;
  }

  setMissionOver(payload: MissionResultPayload): void {
    this.missionOver = payload;
  }

  /** The reason this ability is refused, or null while it is available. */
  private missionLock(ability: MissionAbility): string | null {
    return this.missionLocks.find((lock) => lock.ability === ability)?.reason ?? null;
  }

  /**
   * True when the mission has taken this ability away — and, on the way,
   * hands the reason to the hint bar. docs/ui-ux.md §7 forbids the silent
   * drop: an action that will not happen has to say what it is waiting on.
   */
  private refusedByMission(ability: MissionAbility): boolean {
    const reason = this.missionLock(ability);
    if (reason === null) return false;
    this.missionRefusal = { reason, atMs: performance.now() };
    return true;
  }

  /**
   * Forget the match that just ended, keeping the ground it was played on.
   *
   * A rematch builds a *new* ECS world, so every entity id the renderer is
   * holding — selections, control groups, tracked contacts, the residue it can
   * hear — now refers to something that no longer exists or, worse, to a
   * different thing that has been handed the same id. Terrain and the map
   * survive because they are the same ground; nodes do not, and arrive again.
   */
  resetForNewMatch(): void {
    this.gameOver = null;
    // Both of these, and this is not optional: a mission followed by another
    // run would otherwise keep a greyed-out ping key and a concluded mission's
    // banner over live water for the rest of the session.
    this.missionLocks = [];
    this.missionRefusal = null;
    this.missionOver = null;
    this.units = [];
    this.structures = [];
    this.previousUnits = [];
    this.previousStructures = [];
    // A rematch is T+00:00 again, and the water carries none of the last
    // match's blows into it.
    this.lastTick = 0;
    this.underFire.clear();
    this.exposureFlashes.length = 0;
    this.brokeSilence.clear();
    this.tracked.clear();
    this.selected.clear();
    this.controlGroups.clear();
    this.marks = [];
    this.loggedMarks.clear();
    this.hazards = [];
    this.peakSig = 0;
    this.fleetSig = 0;
    this.fleetSilent = false;
    this.exposure = { tier: ResolutionTier.Silent, trackedCount: 0 };
    this.drawReport = { capacity: 0, demand: 0, satisfaction: 1 };
    this.biomass = 0;
    this.nodules = 0;
    this.crystal = 0;
    this.pendingBuild = null;
  }

  applySnapshot(snapshot: EchoSnapshot): void {
    this.lastTick = snapshot.tick;
    this.previousUnits = this.units;
    this.previousStructures = this.structures;
    this.units = snapshot.units;
    this.structures = snapshot.structures;
    this.peakSig = snapshot.peakSig;
    this.exposure = snapshot.exposure;
    this.marks = snapshot.marks;
    this.hazards = snapshot.hazards;
    this.drawReport = snapshot.draw;
    this.biomass = snapshot.biomass;
    this.driftHealth = snapshot.driftHealth;
    this.callbacks.onHazards(snapshot.hazards);
    this.nodules = snapshot.nodules;
    this.crystal = snapshot.crystal;

    // First sight of our own force: open the camera on the base rather than
    // the whole map — a commander starts at home. The dolly distance shows
    // the base and its home field with water enough to read approach vectors;
    // left at map-fit until the conn view exists to take the order.
    if (!this.cameraCentered && (this.units.length > 0 || this.structures.length > 0)) {
      let cx = 0;
      let cy = 0;
      let count = 0;
      for (const u of this.units) {
        cx += u.x;
        cy += u.y;
        count++;
      }
      for (const s of this.structures) {
        cx += s.x;
        cy += s.y;
        count++;
      }
      if (this.conn !== null) {
        this.cameraCentered = true;
        this.conn.focusWorld(cx / count, cy / count, 2600);
      }
    }

    const now = performance.now();
    for (const contact of snapshot.contacts) {
      // Log an event when a contact is first heard, and again whenever what
      // the player knows about it *changes* tier. Re-reporting an unchanged
      // contact five times a second would bury the events that matter.
      const previous = this.tracked.get(contact.id);
      if (previous === undefined || previous.contact.tier !== contact.tier) {
        this.emitContactEvent(contact, snapshot.tick, previous === undefined);
      }
      // Acquisition, not merely "is a track": a contact that flickers at the
      // Tier-4 boundary must not strobe. Same one-shot rule the lock tone
      // follows, so the two cues stay in step.
      if (
        contact.tier >= ResolutionTier.Track &&
        (previous === undefined || previous.contact.tier < ResolutionTier.Track)
      ) {
        this.lockFlash.set(contact.id, now);
      }
      this.tracked.set(contact.id, {
        contact,
        lastSeenMs: now,
        firstSeenMs: previous?.firstSeenMs ?? now,
      });
    }

    // Residue the player has just come within earshot of. After the contact
    // loop so that a fight and the mark it left read in that order in the log,
    // which is the order they happened in.
    for (const mark of newlyAudibleMarks(snapshot.marks, this.loggedMarks)) {
      this.emitMarkEvent(mark, snapshot.tick);
    }

    this.callbacks.onContactAudio(this.contactAudioFrame(snapshot.tick, now));
    this.callbacks.onSelfAudio(this.selfAudioFrame(snapshot, now));
    this.callbacks.onMarkAudio(this.markIntensity());

    // Drop selections and motion history for entities that no longer exist.
    const alive = new Set<number>();
    for (const unit of this.units) alive.add(unit.id);
    for (const structure of this.structures) alive.add(structure.id);
    for (const id of this.selected) {
      if (!alive.has(id)) this.selected.delete(id);
    }
    // Pruned by age, never by aliveness: the blow that killed a hull outlives
    // it by design, and an entry is moot once its engagement window has run.
    for (const [id, hit] of this.underFire) {
      if (snapshot.tick - hit.tick >= UNDER_FIRE_REARM_TICKS) this.underFire.delete(id);
    }
  }

  /**
   * The player's own force, reduced to what the mix needs.
   *
   * Also where the server's self-events are turned into things the *screen*
   * shows, because §11 makes an audible fact with no visual equivalent a bug —
   * and the exposure strike is the one cue in the game the doc admits has "no
   * visual equivalent that arrives sooner". Sooner is not the same as never:
   * it gets a screen-edge flash on the same bearing, arriving with the sound
   * rather than before it.
   */
  private selfAudioFrame(snapshot: EchoSnapshot, now: number): SelfAudioFrame {
    for (const event of snapshot.selfEvents) {
      switch (event.kind) {
        case SelfEventKind.Ping: {
          const unit = this.units.find((u) => u.id === event.unitId);
          if (unit !== undefined) this.ownPing = { x: unit.x, y: unit.y, atMs: now };
          break;
        }
        case SelfEventKind.BreakSilence:
          this.brokeSilence.set(event.unitId, now);
          break;
        case SelfEventKind.Exposed:
          if (event.bearing !== undefined) {
            this.exposureFlashes.push({ bearing: event.bearing, atMs: now });
            // §10's long-pending row, now that the flag exists to write it
            // from. Logged at the fidelity sent: a bearing, never a position.
            this.callbacks.onContactEvent({
              id: `own:${this.ownRowSeq++}`,
              tick: snapshot.tick,
              tier: ResolutionTier.Silent,
              fresh: true,
              label: 'you were pinged',
              bearingDeg: compassDeg(event.bearing),
            });
          }
          break;
        case SelfEventKind.Damaged: {
          // The first blow of an engagement gets the row and the cue; the
          // rounds after it are the same fight (docs/ui-ux.md §5). The scope
          // pulse refreshes regardless — it is state, not news — and the
          // mixer measures this same window in the same ticks, so the ear and
          // the record cannot disagree about what one engagement is.
          const subject = this.ownEntity(event.unitId);
          const last = this.underFire.get(event.unitId);
          if (subject !== undefined) {
            this.underFire.set(event.unitId, {
              tick: snapshot.tick,
              atMs: now,
              x: subject.x,
              y: subject.y,
            });
          }
          if (last === undefined || snapshot.tick - last.tick >= UNDER_FIRE_REARM_TICKS) {
            this.emitOwnForceEvent(snapshot.tick, event.unitId, 'under fire');
          }
          break;
        }
        case SelfEventKind.HarvesterIdle:
          // The name prefix makes this read "Harvester idle — mined out".
          this.emitOwnForceEvent(
            snapshot.tick,
            event.unitId,
            event.idleReason === HarvestIdleReason.NoDepot ? 'idle — no yard' : 'idle — mined out'
          );
          break;
      }
    }

    // Fleet SIG, not `peakSig`: the HUD number folds in structures, and a base
    // six kilometres away would pin the self bed at "full plant" for the whole
    // match. See SelfAudioFrame.fleetSig.
    let fleetSig = 0;
    let allSilent = this.units.length > 0;
    for (const unit of this.units) {
      if (unit.sig > fleetSig) fleetSig = unit.sig;
      if (!unit.silentRunning) allSilent = false;
    }

    // Kept for the HUD too: the band label reads the same numbers the bed
    // does, so the words and the sound cannot disagree.
    this.fleetSig = fleetSig;
    this.fleetSilent = allSilent;

    return {
      tick: snapshot.tick,
      fleetSig,
      silentRunning: allSilent,
      events: snapshot.selfEvents,
      returns: this.pingReturns(now),
    };
  }

  /**
   * Echoes from the player's own ping, ranged from the hull that sent it.
   *
   * Only while a ping is actually resolving: outside that window a Tier-4
   * contact is one the player earned some other way, and giving it a return
   * would tell them a ping found something it never touched.
   */
  private pingReturns(now: number): PingReturn[] {
    const ping = this.ownPing;
    if (ping === null) return [];
    if (now - ping.atMs > ACTIVE_SONAR.REVEAL_DURATION_S * 1000) {
      this.ownPing = null;
      return [];
    }

    const out: PingReturn[] = [];
    for (const entry of this.tracked.values()) {
      const contact = entry.contact;
      if (contact.tier < ResolutionTier.Track) continue;
      const dx = contact.x - ping.x;
      const dy = contact.y - ping.y;
      const rangeM = Math.hypot(dx, dy);
      if (rangeM > ACTIVE_SONAR.REVEAL_RADIUS_M) continue;
      out.push({ rangeM, pan: rangeM === 0 ? 0 : dx / rangeM });
    }
    // Returns are only scheduled on the tick the sweep goes out; after that
    // the same contacts are still resolved, and replaying them every tick
    // would turn a sweep into a stutter.
    this.ownPing = null;
    return out;
  }

  /**
   * The contact picture as the mix is allowed to hear it.
   *
   * Two things this method exists to guarantee, both from
   * docs/audio-direction.md §3:
   *
   * - **Freshness is shared with the ghost markers.** It is computed here from
   *   the same `tracked` map and the same `PERSISTENCE.GHOST_MARKER_DECAY_S`
   *   that `drawContacts` fades on, so a voice and its marker cannot end up
   *   telling the player different things about how stale a contact is.
   * - **Tier 1 carries no bearing and no range.** Not blurred ones, not
   *   placeholder ones: the fields are absent. A Tier-1 contact's reported
   *   position *is* the listener's own, so there is genuinely nothing to
   *   report, and a consumer downstream cannot misuse a field that is not
   *   there.
   *
   * Bearing is measured from the camera centre, because the Tier-4 row of §3's
   * table asks for spatialisation "matched to the rendered position" — the ear
   * is where the player is looking.
   */
  private contactAudioFrame(tick: number, now: number): ContactAudioFrame {
    const decayMs = PERSISTENCE.GHOST_MARKER_DECAY_S * 1000;
    // The ear is where the player is looking: the water under the screen
    // centre, asked of the conn camera. Before the conn exists there is no
    // rendered position to match, and the map origin is as honest as any.
    const rect = this.app.canvas.getBoundingClientRect();
    const ear = this.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2) ?? {
      x: 0,
      y: 0,
    };

    const entries: ContactAudioEntry[] = [];
    for (const entry of this.tracked.values()) {
      const contact = entry.contact;
      if (contact.tier === ResolutionTier.Silent) continue;
      const age = now - entry.lastSeenMs;
      if (age > decayMs) continue;

      const audio: ContactAudioEntry = {
        id: contact.id,
        tier: contact.tier,
        biome: this.biomeAt(contact.x, contact.y),
        freshness: 1 - age / decayMs,
      };
      if (contact.faction !== undefined) audio.faction = contact.faction;
      if (contact.tier >= ResolutionTier.Bearing) {
        const dx = contact.x - ear.x;
        const dy = contact.y - ear.y;
        audio.bearing = Math.atan2(dy, dx);
        audio.rangeM = Math.hypot(dx, dy);
      }
      entries.push(audio);
    }

    return { tick, entries };
  }

  /**
   * Turn a resolution into a log line.
   *
   * The rule the whole log rests on: it reports what was told, at the
   * fidelity it was told, and never sharpens an old entry when a better
   * resolution of the same contact arrives later. A log that improved its own
   * history would let a player reconstruct positions they never earned, and
   * would also destroy the thing the log is *for* — reasoning about what was
   * knowable at the time (docs/ui-ux.md §10).
   */
  /**
   * An own hull or structure, from this snapshot or the one before it.
   *
   * The fallback is what makes a killing blow reportable: the event describes
   * the interval that ended with this snapshot, and a hull the blow destroyed
   * is no longer in it.
   */
  private ownEntity(entityId: number): { x: number; y: number; name: string } | undefined {
    const unit =
      this.units.find((u) => u.id === entityId) ??
      this.previousUnits.find((u) => u.id === entityId);
    if (unit !== undefined) return { x: unit.x, y: unit.y, name: statsFor(unit.kind).name };
    const structure =
      this.structures.find((s) => s.id === entityId) ??
      this.previousStructures.find((s) => s.id === entityId);
    if (structure === undefined) return undefined;
    return { x: structure.x, y: structure.y, name: structureStatsFor(structure.kind).name };
  }

  /**
   * A log row about the player's own force — an under-fire first blow, or a
   * harvester's stall (docs/ui-ux.md §5, §10). Bearing and range are measured
   * from the scope anchor like every contact row, and focus goes to the hull
   * itself: it is the player's own, fully known, so the camera may.
   */
  private emitOwnForceEvent(tick: number, entityId: number, what: string): void {
    const subject = this.ownEntity(entityId);
    if (subject === undefined) return;
    const name = subject.name;
    const entry: ContactLogEntry = {
      id: `own:${this.ownRowSeq++}`,
      tick,
      tier: ResolutionTier.Silent,
      fresh: true,
      label: `${name} ${what}`,
      focusX: subject.x,
      focusY: subject.y,
    };
    const from = this.scopeAnchor();
    if (from !== null) {
      const dx = subject.x - from.x;
      const dy = subject.y - from.y;
      entry.bearingDeg = (((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360) | 0;
      entry.rangeM = Math.hypot(dx, dy);
    }
    this.callbacks.onContactEvent(entry);
  }

  /**
   * A MARK row: residue that has just become audible (docs/ui-ux.md §10).
   *
   * Bearing comes off the scope anchor like every other row, and the row
   * focuses, because a mark carries a real position that the renderer is
   * already drawing at map scale — there is nothing to withhold that the
   * player is not looking at.
   *
   * What it does *not* carry is a range. §10's sample row spends that column
   * on `decaying` instead, and it is the better use of it: the distance to a
   * stain is the least interesting thing about it, while its intensity falling
   * is the reading — for the industrial hum, `shared/src/types.ts` notes that
   * intensity tracks throughput, so a hum the player watches fade is an
   * economy winding down.
   */
  private emitMarkEvent(mark: EchoMarkInfo, tick: number): void {
    // Guarded like the draw path in `echoMarks.ts`: a kind the client has no
    // word for is one the server added and this build has not learned, and a
    // row reading `undefined` is worse than a row the player never sees.
    const label = MARK_LABEL[mark.kind];
    if (label === undefined) return;
    const entry: ContactLogEntry = {
      // Once per mark id per match, so the id needs no tick in it — and must
      // not have one, or a re-heard mark would land as a second row.
      id: `mark:${mark.id}`,
      tick,
      // The `---` slot the log reserves for events that are not detections;
      // `mark` is what makes the column read MARK rather than dashes.
      tier: ResolutionTier.Silent,
      // A mark row is only ever written once, so it is always a first hearing.
      fresh: true,
      mark: true,
      label,
      focusX: mark.x,
      focusY: mark.y,
    };
    const from = this.scopeAnchor();
    if (from !== null) {
      const dx = mark.x - from.x;
      const dy = mark.y - from.y;
      entry.bearingDeg = compassDeg(Math.atan2(dy, dx));
    }
    this.callbacks.onContactEvent(entry);
  }

  private emitContactEvent(contact: Contact, tick: number, fresh: boolean): void {
    const entry: ContactLogEntry = {
      // Tier is part of the id: one contact climbing 1 -> 3 is two events.
      id: `${tick}:${contact.id}:${contact.tier}`,
      tick,
      tier: contact.tier,
      fresh,
      label: this.contactLabel(contact),
    };

    // A Tier-1 report carries the *listener's* position, not the emitter's,
    // so there is no bearing in it to show. Saying "bearing unknown" is the
    // honest rendering; inventing one from the listener would be a lie.
    if (contact.tier >= ResolutionTier.Bearing) {
      const from = this.scopeAnchor();
      if (from !== null) {
        const dx = contact.x - from.x;
        const dy = contact.y - from.y;
        entry.bearingDeg = (((Math.atan2(dy, dx) * 180) / Math.PI + 450) % 360) | 0;
        entry.rangeM = Math.hypot(dx, dy);
      }
      entry.focusX = contact.x;
      entry.focusY = contact.y;
    }

    this.callbacks.onContactEvent(entry);
  }

  private contactLabel(contact: Contact): string {
    if (contact.tier >= ResolutionTier.Classification) {
      // Fauna are named at Tier 3 and never before, which is the moment
      // docs/bestiary.md §3 calls "a genuine relief or a genuine problem".
      const name =
        contact.kind !== undefined
          ? statsFor(contact.kind).name
          : contact.structure !== undefined
            ? structureStatsFor(contact.structure).name
            : contact.fauna !== undefined
              ? faunaStatsFor(contact.fauna).name
              : 'contact';
      const faction = contact.faction !== undefined ? FACTION_NAME[contact.faction] : '';
      return faction === '' ? name : `${faction} ${name}`;
    }
    return 'contact';
  }

  /** Move the camera to a logged position. */
  focusOn(x: number, y: number): void {
    this.conn?.focusWorld(x, y);
  }

  // --- Draw ----------------------------------------------------------------

  private draw(): void {
    // The world under these marks — seabed, routes, rim, embers, own hulls —
    // is the conn view's. This pass draws only what the chart language owes
    // on top, everything projected through the one shared camera.
    this.drawBlockedGround();
    this.drawNodes();
    this.drawRings();
    this.drawContacts();
    this.drawStructures();
    this.drawUnits();
    this.drawOrderPlans();
    this.drawHud();
    // After the HUD, so the flash sits over the panels it warns through.
    this.drawExposureFlashes();
    this.drawMarquee();
    this.drawDepthRibbon();
    this.drawCommandBar();
    this.drawMinimap();
    this.drawInfoPanel();
  }

  /**
   * Ground the current selection cannot enter.
   *
   * Whether ground blocks you is not a property of the ground: it is a
   * relationship between the ground and *your* hulls, and a ridge that stops a
   * deep raider is open water to a scout (docs/environments.md, Pathing). So
   * this is drawn only while something is selected, and only for the depth
   * that selection is actually at.
   *
   * Cyan, because the HUD's cyan is the voice that tells you things
   * (docs/style-neon-noir.md). Never threat-red: being unable to cross a ridge
   * is information, not danger, and the same screen has to show both.
   *
   * The deepest hull in the selection decides. A mixed group moving together
   * is limited by the one that fits through least, and showing the optimistic
   * answer would draw a route half the group cannot take.
   */
  private drawBlockedGround(): void {
    const g = this.groundLayer;
    g.clear();
    const terrain = this.terrain;
    if (terrain === null || this.selected.size === 0) return;

    let depth = -1;
    for (const unit of this.units) {
      if (this.selected.has(unit.id) && unit.depth > depth) depth = unit.depth;
    }
    if (depth < 0) return;

    // Only the cells the camera can see: this is the one per-cell pass left
    // in the frame, and projecting a whole map of quads for the slice on
    // screen would spend the budget the conn view's 2 ms pass protects.
    const bounds = this.viewBoundsM(terrain.cellM);
    if (bounds === null) return;
    const colFrom = Math.max(0, Math.floor(bounds.minX / terrain.cellM));
    const colTo = Math.min(terrain.cols - 1, Math.ceil(bounds.maxX / terrain.cellM));
    const rowFrom = Math.max(0, Math.floor(bounds.minY / terrain.cellM));
    const rowTo = Math.min(terrain.rows - 1, Math.ceil(bounds.maxY / terrain.cellM));

    for (let row = rowFrom; row <= rowTo; row++) {
      for (let col = colFrom; col <= colTo; col++) {
        const index = row * terrain.cols + col;
        if (depth >= terrain.ceiling[index]! && depth <= terrain.floor[index]!) continue;
        const x = col * terrain.cellM;
        const y = row * terrain.cellM;
        const p00 = this.project(x, y, null);
        const p10 = this.project(x + terrain.cellM, y, null);
        const p11 = this.project(x + terrain.cellM, y + terrain.cellM, null);
        const p01 = this.project(x, y + terrain.cellM, null);
        if (p00 === null || p10 === null || p11 === null || p01 === null) return;
        if (!p00.visible || !p10.visible || !p11.visible || !p01.visible) continue;
        // Hatched rather than filled: a solid block would bury the ground
        // underneath it, and the ground is what the player reads sound by.
        // Terrain must stay quieter than contacts.
        g.poly([p00.x, p00.y, p10.x, p10.y, p11.x, p11.y, p01.x, p01.y]).fill({
          color: UI.accent,
          alpha: 0.07,
        });
        g.moveTo(p01.x, p01.y)
          .lineTo(p10.x, p10.y)
          .stroke({ width: 1, color: UI.accent, alpha: 0.16 });
      }
    }
  }

  /**
   * Nodule fields — public survey-chart data, laid on the seabed. Deliberately
   * dim: they are geography, not intel.
   */
  private drawNodes(): void {
    const g = this.nodeLayer;
    g.clear();
    for (const node of this.nodes) {
      const crystal = node.kind === ResourceKind.ResonanceCrystal;
      const color = RESOURCE_COLOR[node.kind];
      const radius = 60 + (node.initialAmount / 3000) * 40;
      this.fillCircle(g, node.x, node.y, radius, null, { color, alpha: 0.1 });
      if (this.traceCircle(g, node.x, node.y, radius, null)) {
        g.stroke({ width: 2, color, alpha: 0.3 });
      }
      // A scatter of ore, deterministic per node so the map is stable. Each
      // grain is metres across — a screen dot at its projected point says the
      // same thing without sampling a circle nobody can see the shape of.
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + node.id;
        const r = radius * 0.55 * (0.4 + ((i * 37 + node.id * 13) % 10) / 16);
        const p = this.project(node.x + Math.cos(angle) * r, node.y + Math.sin(angle) * r, null);
        if (p === null || !p.visible) continue;
        g.circle(p.x, p.y, 6 * p.pxPerM).fill({ color, alpha: 0.45 });
      }
      // A field you cannot reach without diving reads as a depth, not just a
      // colour: the dashed ring says "this is somewhere else vertically".
      if (crystal) {
        const dashes = 24;
        for (let i = 0; i < dashes; i += 2) {
          const a0 = (i / dashes) * Math.PI * 2;
          const a1 = ((i + 1) / dashes) * Math.PI * 2;
          if (
            this.traceLine(
              g,
              node.x + Math.cos(a0) * (radius + 14),
              node.y + Math.sin(a0) * (radius + 14),
              node.x + Math.cos(a1) * (radius + 14),
              node.y + Math.sin(a1) * (radius + 14),
              null
            )
          ) {
            g.stroke({ width: 2, color, alpha: 0.55 });
          }
        }
      }
    }
  }

  private drawStructures(): void {
    const palette = FACTION_PALETTE[this.faction];

    for (const structure of this.structures) {
      const p = this.project(structure.x, structure.y, null);
      if (p === null) break;
      const g = this.structureSymbols.acquire(structure.id);
      if (!p.visible) {
        g.visible = false;
        continue;
      }
      g.position.set(p.x, p.y);
      g.scale.set(p.pxPerM);
      const inverseScale = 1 / p.pxPerM;

      // Same readability factor the conn view draws the architecture at, for
      // the same reason it applies to a hull's ink.
      const radius = structureStatsFor(structure.kind).radiusM * this.hullDrawScale();
      const isSelected = this.selected.has(structure.id);
      const building = structure.buildProgress < 1;
      const alpha = building ? 0.35 : 0.9;

      if (isSelected) {
        g.circle(0, 0, radius + 14).stroke({
          width: 2 * inverseScale,
          color: UI.text,
          alpha: 0.8,
        });
      }

      // The conn view owns the architecture: the commissioned model, and the
      // dim schematic for a site. What stays here is the scaffold register a
      // construction site reads by — a half-built structure is a drawing of
      // intent, and the chart's dashed vectors say so over the GL ghost.
      if (building) {
        drawStructureSilhouette(
          g,
          structure.kind,
          0,
          0,
          radius,
          { color: palette.primary, accent: palette.accent, alpha, detail: false },
          2 * inverseScale
        );
      }

      // The structure's own loudness ring, same language as units.
      g.circle(0, 0, radius + 10 + structure.sig * 0.35).stroke({
        width: 1 * inverseScale,
        color: sigColor(structure.sig),
        alpha: 0.25,
      });

      const barWidth = radius * 2;
      const barY = -radius - 14 * inverseScale;
      if (building) {
        g.rect(-radius, barY, barWidth, 6 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(-radius, barY, barWidth * structure.buildProgress, 6 * inverseScale).fill({
          color: UI.sigMid,
        });
      } else if (structure.queue.length > 0) {
        // Production progress plus how deep the queue runs.
        g.rect(-radius, barY, barWidth, 6 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(-radius, barY, barWidth * structure.queueProgress, 6 * inverseScale).fill({
          color: UI.friendly,
        });
      }

      if (structure.hp < structure.maxHp) {
        const hpY = radius + 8 * inverseScale;
        const fraction = Math.max(0, structure.hp / structure.maxHp);
        g.rect(-radius, hpY, barWidth, 4 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(-radius, hpY, barWidth * fraction, 4 * inverseScale).fill({
          color: UI.friendly,
        });
      }
    }
    this.structureSymbols.sweep();
  }

  /**
   * Detection rings for selected units — "selected-unit detection radius
   * renders as a soft ring on the terrain" (docs/art-direction.md).
   *
   * This is one of the few things the client may compute itself, because it is
   * a statement about the player's OWN units against a known terrain factor.
   * It reveals nothing about the enemy.
   */
  private drawRings(): void {
    const g = this.ringLayer;
    g.clear();
    if (this.terrain === null) return;

    for (const unit of this.units) {
      if (!this.selected.has(unit.id)) continue;

      // The server prices detection along each emitter-listener path, so the
      // true audible region is anisotropic; a circle at local PF is the
      // honest isotropic preview of it (and all this client is entitled to).
      //
      // The thermocline's *pair* factor is left out for a stronger reason than
      // bearing: it depends on the listener's depth, which is the enemy's,
      // which is precisely the hidden information this client must not hold.
      //
      // What is included is the row maximum for the hull's *own* zone — the
      // loudest any pair starting from where this hull is standing could be.
      // That computes from own depth alone, so it reveals nothing, and it is
      // the same quantity the server's own broadphase bounds with.
      //
      // It has to be here. This comment used to claim that crossing the layer
      // "can only ever make you quieter than it draws", which is true Above
      // and Below and false in the duct: a duct-to-duct pair is 1.2x, so a
      // hull in the duct is about 12% further audible than an unpriced ring
      // shows. A preview that under-draws the danger is the one kind of
      // inaccuracy this HUD may not have.
      const pf = this.propagationAt(unit.x, unit.y);
      const range = maxAudibleRangeM(
        unit.sig,
        pf * THERMOCLINE_ZONE_MAX[thermoclineZone(unit.depth)]!,
        PROPAGATION_MODEL.BASELINE_HYD
      );

      // These rings' *radii* must stay world-space — 2,400 m is a fact about
      // the water, not about the interface — which is why they are projected
      // vertex by vertex onto the ground: a ring climbing a ridge is the
      // honest shape of a distance measured through the water. Their stroke
      // is the opposite: a line on an instrument, drawn in screen pixels and
      // carrying the UI scale (§11 names the ping preview as one of the two
      // things to scale first).
      if (this.traceCircle(g, unit.x, unit.y, range, null)) {
        g.stroke({
          width: 2 * this.uiScale,
          color: sigColor(unit.sig),
          alpha: 0.35,
        });
      }

      // Hold the preview key to see exactly how badly a ping would expose you.
      if (this.previewPing) {
        if (this.traceCircle(g, unit.x, unit.y, ACTIVE_SONAR.REVEAL_RADIUS_M, null)) {
          g.stroke({ width: 2 * this.uiScale, color: UI.friendly, alpha: 0.5 });
        }
        if (this.traceCircle(g, unit.x, unit.y, ACTIVE_SONAR.SELF_REVEAL_RADIUS_M, null)) {
          g.stroke({ width: 3 * this.uiScale, color: UI.threat, alpha: 0.8 });
        }
      }
    }
  }

  /**
   * Live hazards — docs/hazards.md, docs/maps.md core principles.
   *
   * The warning phase is the reason this method exists. `CLAUDE.md` fixes the
   * target emotion as dread rather than confusion, and dread requires the
   * player to *see it coming*: a countdown ring that closes as the eruption
   * approaches, so leaving is a decision they get to make and regret.
   *
   * Dormant sites stay drawn — faintly — because a hazard you can forget about
   * is a hazard that will surprise you, and surprise is the failure mode.
   */
  /**
   * Inert hazard sites off the map payload, telegraphed. docs/maps.md's core
   * principles list "hazard telegraphing — players must see danger before
   * entering": this ground is dangerous from the moment the map loads, so it
   * draws every frame like the rest of the ground language, hatched rather
   * than filled — the sites carry no behaviour yet, and a solid marker would
   * imply an effect that does not exist.
   */
  private drawStaticHazardSites(g: Graphics): void {
    for (const site of this.map?.hazards ?? []) {
      // Simulated hazards are drawn live, with a phase and a countdown.
      if (site.simulated) continue;
      if (this.traceCircle(g, site.x, site.y, site.radiusM, null)) {
        g.stroke({ width: 3, color: UI.threat, alpha: 0.28 });
      }
      const step = Math.max(60, site.radiusM / 4);
      for (let offset = -site.radiusM; offset <= site.radiusM; offset += step) {
        // Chord length at this offset, so the hatching stays inside the ring.
        const half = Math.sqrt(Math.max(0, site.radiusM * site.radiusM - offset * offset));
        if (
          this.traceLine(
            g,
            site.x + offset - half,
            site.y + offset + half,
            site.x + offset + half,
            site.y + offset - half,
            null
          )
        ) {
          g.stroke({ width: 1.5, color: UI.threat, alpha: 0.12 });
        }
      }
    }
  }

  private drawHazards(g: Graphics): void {
    for (const hazard of this.hazards) {
      const style = HAZARD_STYLE[hazard.phase];
      // Red warns you, cyan tells you (docs/style-neon-noir.md). An eruption
      // will kill you; a storm and a cold shock current will not — they are
      // statements about the water, and a current painted as a threat would be
      // the screen lying about what the simulation does.
      const color = hazard.kind === 'geothermal-eruption' ? UI.threat : UI.accent;
      const isCurrent = hazard.kind === 'cold-shock';

      // A kelp field is permanent, so it is chart data rather than an event and
      // has to be drawn much quieter than one (docs/art-direction.md: "Terrain
      // must stay quieter than contacts"). Two of them overlap the current at
      // the centre of the Kelp Labyrinth, and three episodic treatments stacked
      // there would be a wall of cyan for the whole match. It gets a soft rim
      // and almost no fill; gripping is a slightly firmer rim than suppressed,
      // which is the only state change it has.
      if (hazard.kind === 'kelp-entanglement') {
        const gripping = hazard.phase === HazardPhase.Active;
        this.fillCircle(g, hazard.x, hazard.y, hazard.radiusM, null, {
          color,
          alpha: gripping ? 0.05 : 0.02,
        });
        if (this.traceCircle(g, hazard.x, hazard.y, hazard.radiusM, null)) {
          g.stroke({
            width: gripping ? 2 : 1,
            color,
            alpha: gripping ? 0.3 : 0.14,
          });
        }
        continue;
      }

      if (this.traceCircle(g, hazard.x, hazard.y, hazard.radiusM, null)) {
        g.stroke({ width: style.width, color, alpha: style.alpha });
      }

      if (hazard.phase === HazardPhase.Warning) {
        // The countdown: a second ring closing on the first. When they meet,
        // it fires. Nothing else on screen behaves like this, so it does not
        // have to be learned twice.
        const closing = hazard.radiusM * (1.9 - 0.9 * hazard.progress);
        if (this.traceCircle(g, hazard.x, hazard.y, closing, null)) {
          g.stroke({ width: 2, color, alpha: 0.35 + hazard.progress * 0.5 });
        }
      }

      if (hazard.phase === HazardPhase.Active || hazard.phase === HazardPhase.Decay) {
        const heat = hazard.phase === HazardPhase.Active ? 1 : 1 - hazard.progress;
        this.fillCircle(g, hazard.x, hazard.y, hazard.radiusM, null, {
          color,
          alpha: 0.18 * heat,
        });
        if (isCurrent) {
          // A current is the only hazard with a direction, and direction is the
          // whole decision it offers — ride it, cross it, or pay to fight it
          // (docs/hazards.md §8). Rings radiating from a centre would say the
          // opposite: that the danger comes from a point. Streaks along the
          // flow are what §8's Visual Cues ask for, and they are unmistakable
          // against every other hazard at a glance, which is gate 7's bar.
          this.drawFlowStreaks(g, hazard, heat);
        } else {
          for (let ring = 1; ring <= 3; ring++) {
            if (this.traceCircle(g, hazard.x, hazard.y, hazard.radiusM * (ring / 3), null)) {
              g.stroke({ width: 1.5, color, alpha: 0.3 * heat });
            }
          }
        }
      }
    }
  }

  /**
   * Chevrons along a current's bearing — which way the water is going.
   *
   * Laid out on a grid rotated into the flow's frame so the streaks stay
   * parallel however the site is turned, and clipped to the circle so the
   * hazard keeps one silhouette. Nothing here is animated: the renderer draws
   * simulation state, and a current's state is its direction, not a phase the
   * client invents.
   */
  private drawFlowStreaks(g: Graphics, hazard: HazardState, heat: number): void {
    const flow = hazard.flowRad ?? 0;
    const fx = Math.cos(flow);
    const fy = Math.sin(flow);
    // Across-flow unit vector, for spacing the lanes.
    const ax = -fy;
    const ay = fx;
    const r = hazard.radiusM;
    const lanes = 5;
    const spacing = (r * 2) / (lanes + 1);
    const length = r * 0.34;
    const head = length * 0.3;

    for (let lane = 0; lane < lanes; lane++) {
      // Offset of this lane from the centre line, across the flow.
      const across = -r + spacing * (lane + 1);
      // Half-chord of the circle at this offset, so a streak never pokes out.
      const half = Math.sqrt(Math.max(0, r * r - across * across));
      if (half < length) continue;
      const cx = hazard.x + ax * across;
      const cy = hazard.y + ay * across;
      const tailX = cx - fx * length * 0.5;
      const tailY = cy - fy * length * 0.5;
      const tipX = cx + fx * length * 0.5;
      const tipY = cy + fy * length * 0.5;

      let drew = this.traceLine(g, tailX, tailY, tipX, tipY, null);
      // An arrowhead, so the streak reads as a direction rather than a hatch.
      drew =
        this.traceLine(
          g,
          tipX,
          tipY,
          tipX - fx * head + ax * head * 0.6,
          tipY - fy * head + ay * head * 0.6,
          null
        ) || drew;
      drew =
        this.traceLine(
          g,
          tipX,
          tipY,
          tipX - fx * head - ax * head * 0.6,
          tipY - fy * head - ay * head * 0.6,
          null
        ) || drew;
      if (drew) g.stroke({ width: 2, color: UI.accent, alpha: 0.55 * heat });
    }
  }

  /**
   * Summed intensity per kind, for the residue beds.
   *
   * A sum and not a list: §6 makes marks reverb-only with no transients, so
   * the mix asks "how much of the past is around me" rather than "where is
   * each piece of it". Where they are is on screen, which is where the
   * accessibility rule wants it.
   */
  private markIntensity(): Map<EchoMarkKind, number> {
    const totals = new Map<EchoMarkKind, number>();
    for (const mark of this.marks) {
      totals.set(mark.kind, (totals.get(mark.kind) ?? 0) + mark.intensity);
    }
    return totals;
  }

  /**
   * Acoustic residue — docs/systems-echo.md §7.
   *
   * Drawn as a stain rather than a marker, and drawn *before* live contacts so
   * a contact always sits on top of the residue near it. The distinction the
   * mix makes in docs/audio-direction.md §6 — "if a player can mistake a mark
   * for a contact, the mark is mixed wrong" — has to hold visually too, so
   * marks get no outline, no glyph and no crisp edge: nothing that reads as a
   * *thing*, only as ground that remembers.
   *
   * The intensity is the information. For a battle site it is how much
   * shooting happened; for the industrial hum it is throughput, which
   * docs/economy.md §5 wants a player to read income off. So the drawing
   * scales with it rather than merely fading.
   */
  private drawEchoMarks(g: Graphics): void {
    for (const mark of this.marks) {
      const style = MARK_STYLE[mark.kind];
      if (style === undefined) continue;
      const radius = markRadiusM(mark.kind, mark.intensity);

      // Three soft rings rather than a disc: residue has no edge, and a disc
      // at any alpha reads as an object sitting on the seabed.
      for (let ring = 0; ring < 3; ring++) {
        const t = (ring + 1) / 3;
        this.fillCircle(g, mark.x, mark.y, radius * t, null, {
          color: style.color,
          alpha: mark.intensity * style.alpha * (1 - t * 0.6),
        });
      }
      // A dashed arc, so a mark is still findable at low intensity without
      // being drawn as something solid.
      const dashes = 10;
      for (let i = 0; i < dashes; i++) {
        const a0 = (i / dashes) * Math.PI * 2;
        const a1 = a0 + Math.PI / dashes;
        if (
          this.traceLine(
            g,
            mark.x + Math.cos(a0) * radius,
            mark.y + Math.sin(a0) * radius,
            mark.x + Math.cos(a1) * radius,
            mark.y + Math.sin(a1) * radius,
            null
          )
        ) {
          g.stroke({ width: 1, color: style.color, alpha: mark.intensity * 0.5 });
        }
      }
    }
  }

  /**
   * The exposure flash — docs/audio-direction.md §11.
   *
   * "The 'you have been pinged' cue also renders as a screen-edge flash on the
   * bearing of the pinging emitter." A band of light on the edge the strike
   * came from, and nothing else: the server sent a bearing, so the screen may
   * show a direction and must not show a place.
   *
   * Drawn in screen space rather than world space on purpose. A world-space
   * marker would sit at a *position*, which is precisely the thing that was
   * not sent.
   */
  private drawExposureFlashes(): void {
    const g = this.hudGraphics;
    const now = performance.now();
    const width = this.hudWidth();
    const height = this.hudHeight();

    for (let i = this.exposureFlashes.length - 1; i >= 0; i--) {
      const flash = this.exposureFlashes[i]!;
      const t = (now - flash.atMs) / EXPOSURE_FLASH_MS;
      if (t >= 1) {
        this.exposureFlashes.splice(i, 1);
        continue;
      }

      // Hard on arrival, then a long decay — the shape of the sound. Under
      // reduced motion it holds level for the same two seconds and then cuts:
      // the two facts the strike carries are the bearing and that it is *live*,
      // and a hold-then-cut keeps both without a ramp (docs/ui-ux.md §11).
      const alpha = this.reducedMotion ? 0.45 : Math.pow(1 - t, 2) * 0.55;
      const cx = width / 2;
      const cy = height / 2;
      const dx = Math.cos(flash.bearing);
      const dy = Math.sin(flash.bearing);
      // Where a ray on this bearing leaves the screen. Scaling by the larger
      // of the two axis ratios lands it on the nearer edge either way.
      const scale = Math.min(
        dx === 0 ? Infinity : Math.abs(cx / dx),
        dy === 0 ? Infinity : Math.abs(cy / dy)
      );
      const ex = cx + dx * scale;
      const ey = cy + dy * scale;

      const band = Math.min(width, height) * 0.22;
      g.circle(ex, ey, band).fill({ color: UI.threat, alpha: alpha * 0.5 });
      g.circle(ex, ey, band * 0.55).fill({ color: UI.threat, alpha });
    }
  }

  /**
   * A ring on the hull that just broke silence.
   *
   * The SIG meter already spikes, but a meter is a number about the whole
   * force: it cannot say *which* hull gave the ambush away. The audio cue is
   * per-event, so its visual equivalent has to be per-hull too.
   */
  /**
   * The visual half of the Tier-4 lock tone (docs/audio-direction.md §11).
   *
   * Four brackets that close onto the contact over 700 ms and stop. Closing
   * rather than pulsing, because the thing being reported is a *transition* —
   * "this became exact" — and a pulse would read as a standing state. It
   * decays to nothing on its own, so a player who looks away and back sees a
   * track, not a permanent decoration still claiming to be news.
   */
  private drawLockFlash(
    g: Graphics,
    id: number,
    contact: Contact,
    now: number,
    inverseScale: number
  ): void {
    const at = this.lockFlash.get(id);
    if (at === undefined) return;
    const t = (now - at) / LOCK_FLASH_MS;
    if (t >= 1) {
      this.lockFlash.delete(id);
      return;
    }

    // Sized off the thing itself, so the brackets frame a corvette and a
    // foundry equally rather than swallowing one and rattling round the other.
    // Drawn in the contact symbol's own space: the mark is the origin.
    const hull = contact.kind !== undefined ? HULL_LENGTH_M[contact.kind] : 140;
    const spread = hull * (2.2 - 1.2 * t);
    const arm = hull * 0.5;
    const alpha = 1 - t;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = sx * spread;
        const cy = sy * spread;
        g.moveTo(cx - sx * arm, cy)
          .lineTo(cx, cy)
          .lineTo(cx, cy - sy * arm)
          .stroke({ width: 1.5 * inverseScale, color: UI.threat, alpha });
      }
    }
  }

  private biomeAt(x: number, y: number): Biome {
    const terrain = this.terrain;
    if (terrain === null) return Biome.OpenWater;
    const col = Math.min(terrain.cols - 1, Math.max(0, Math.floor(x / terrain.cellM)));
    const row = Math.min(terrain.rows - 1, Math.max(0, Math.floor(y / terrain.cellM)));
    return terrain.biomes[row * terrain.cols + col] as Biome;
  }

  private propagationAt(x: number, y: number): number {
    return PROPAGATION_FACTOR[this.biomeAt(x, y)] ?? 1;
  }

  private drawContacts(): void {
    const g = this.contactLayer;
    g.clear();

    const now = performance.now();
    const decayMs = PERSISTENCE.GHOST_MARKER_DECAY_S * 1000;
    // Ground language first, into the polyline layer under the marks.
    this.drawStaticHazardSites(g);
    this.drawHazards(g);
    this.drawEchoMarks(g);

    for (const [id, entry] of this.tracked) {
      const age = now - entry.lastSeenMs;
      if (age > decayMs) {
        // "A retreating enemy leaves a fading trail of last-known positions."
        this.tracked.delete(id);
        this.lockFlash.delete(id);
        continue;
      }

      const contact = entry.contact;
      if (contact.tier === ResolutionTier.Silent) continue;

      const style = TIER_STYLE[contact.tier as Exclude<ResolutionTier, ResolutionTier.Silent>];
      if (style === undefined) continue;

      // Where the mark billboards. A contact that earned a depth billboards
      // at it, with the contact at the local origin. One that did not earns
      // no height at all: it billboards at the *middle of its water column*
      // and is drawn as the column (contactColumn.ts), so the anchor is a
      // consequence of the span rather than a claim about a depth.
      let anchor: { x: number; y: number; pxPerM: number };
      let column: ColumnLayout | null = null;
      if (contact.depth === undefined) {
        if (this.conn === null) break;
        const points = this.contactColumn(contact);
        column = points === null ? null : columnLayout(points);
        if (column === null) {
          // No column to speak of, or it left the frustum: a half-projected
          // column would invent an end for itself.
          this.contactSymbols.acquire(id).visible = false;
          continue;
        }
        anchor = column.anchor;
      } else {
        const p = this.project(contact.x, contact.y, contact.depth);
        if (p === null) break;
        if (!p.visible) {
          this.contactSymbols.acquire(id).visible = false;
          continue;
        }
        anchor = p;
      }
      const sg = this.contactSymbols.acquire(id);
      sg.position.set(anchor.x, anchor.y);
      sg.scale.set(anchor.pxPerM);
      const inverseScale = 1 / anchor.pxPerM;

      // Ghosts fade rather than vanish; a stale contact is still information,
      // just less of it.
      const freshness = 1 - age / decayMs;
      // ...and a *new* mark fades in, which is the Precedence Law's budget
      // rather than a flourish: a mark that pops instantly races the audio
      // device's own output latency and will sometimes win (§2). The two
      // curves compose — one contact fading out while another fades in is
      // exactly what the player should see.
      const worldFade = worldFadeMs(this.precedence);
      const arrival = markOpacity(now - entry.firstSeenMs, worldFade.start, worldFade.full);
      const alpha = style.alpha * freshness * arrival;

      this.drawLockFlash(sg, id, contact, now, inverseScale);

      // The tiers that earned no depth are drawn about the column instead of
      // at a point — a Tier-1 haze and a Tier-2 blob alike, each keeping its
      // own radius and alpha, so the fidelity encoding is unchanged and only
      // the *height* claim is dropped.
      if (column !== null) {
        for (const ribbon of COLUMN_RIBBONS) {
          sg.poly(columnRibbon(column.path, style.radius * ribbon.width)).fill({
            color: style.color,
            alpha: alpha * ribbon.ink,
          });
        }
      }

      switch (contact.tier) {
        case ResolutionTier.Contact:
        case ResolutionTier.Bearing: {
          // Tier 1 is directionless — a soft presence in the water around the
          // listener that heard it — and Tier 2 a position already wrong by
          // ~15% server-side. Neither knows a depth, so both are the column
          // drawn above and nothing else. The fallback is unreachable while
          // the server gates depth at Tier 3, and is a blob rather than a
          // guessed height if that ever changes.
          if (column === null) {
            sg.circle(0, 0, style.radius).fill({ color: style.color, alpha });
          }
          break;
        }
        case ResolutionTier.Classification: {
          const color = this.contactColor(contact, style.color);
          if (contact.fauna !== undefined) {
            drawFaunaSilhouette(sg, contact.fauna, 0, 0, alpha, inverseScale);
            break;
          }
          sg.circle(0, 0, style.radius).fill({ color, alpha });
          sg.circle(0, 0, style.radius * 1.6).stroke({
            width: 1 * inverseScale,
            color,
            alpha: alpha * 0.6,
          });
          this.drawGlyph(sg, contact, color, alpha, style.radius, inverseScale);
          break;
        }
        case ResolutionTier.Track: {
          const color = this.contactColor(contact, style.color);
          // A track earns the resolved outline — the shape, its heading, its
          // hull — but never the livery. Asymmetric Fidelity Law,
          // docs/art-direction.md.
          // Faction-colour fill (Tier 4 knows identity), threat-red outline
          // so a track reads against any biome its faction happens to match.
          if (contact.kind !== undefined && contact.faction !== undefined) {
            drawUnitSilhouette(
              sg,
              contact.kind,
              contact.faction,
              0,
              0,
              contact.heading ?? 0,
              { color, accent: UI.threat, alpha, detail: false },
              2 * inverseScale
            );
          } else if (contact.structure !== undefined) {
            drawStructureSilhouette(
              sg,
              contact.structure,
              0,
              0,
              structureStatsFor(contact.structure).radiusM,
              { color, accent: UI.threat, alpha, detail: false },
              2 * inverseScale
            );
          } else if (contact.fauna !== undefined) {
            drawFaunaSilhouette(sg, contact.fauna, 0, 0, alpha, inverseScale);
          } else {
            sg.circle(0, 0, style.radius).fill({ color, alpha });
          }

          this.drawGlyph(sg, contact, color, alpha, style.radius, inverseScale);

          if (contact.hp !== undefined && contact.maxHp !== undefined && contact.maxHp > 0) {
            const width = style.radius * 3;
            const fraction = Math.max(0, Math.min(1, contact.hp / contact.maxHp));
            const barY = -style.radius * 2.4;
            sg.rect(-width / 2, barY, width, 3 * inverseScale).fill({
              color: 0x000000,
              alpha: alpha * 0.6,
            });
            sg.rect(-width / 2, barY, width * fraction, 3 * inverseScale).fill({
              color,
              alpha,
            });
          }
          break;
        }
      }
    }
    this.contactSymbols.sweep();
  }

  /** Faction colour, but only once the tier is high enough to know it. */
  /**
   * The faction glyph beside a mark that has earned a faction (§11, #207).
   *
   * Drawn at Tier 3 *and* Tier 4. The silhouette a track earns names the hull
   * class, not the navy — every faction sails the same five shapes — so at
   * Tier 4 the fill colour would otherwise be the only thing saying whose it
   * is, which is precisely what §11 forbids. Fauna and ordnance carry no
   * faction and get no glyph.
   *
   * Its size has a screen-space floor. The geometry is world-space, so a
   * pulled-back camera would otherwise shrink the glyph under its own stroke
   * and hand faction identity back to hue alone at exactly the zoom a player
   * surveys a fight from.
   */
  private drawGlyph(
    g: Graphics,
    contact: Contact,
    color: number,
    alpha: number,
    radiusM: number,
    inverseScale: number
  ): void {
    if (contact.faction === undefined) return;
    const size = Math.max(radiusM * 0.55, GLYPH_MIN_PX * inverseScale);
    // Above everything the mark already draws upward: the Tier-3 count ring
    // sits at 1.6 radii and the Tier-4 health bar at 2.4, so the glyph clears
    // the taller of the two rather than crowding whichever tier it lands on.
    // Local space: the contact is the symbol's origin.
    drawFactionGlyph(
      g,
      contact.faction,
      0,
      -radiusM * 2.4 - size * 1.3,
      size,
      color,
      alpha,
      1.5 * inverseScale
    );
  }

  private contactColor(contact: Contact, fallback: number): number {
    if (contact.faction === undefined) return fallback;
    return FACTION_PALETTE[contact.faction]?.primary ?? fallback;
  }

  private drawUnits(): void {
    const now = performance.now();

    // Expired break-silence transients die here whether or not their hull
    // still draws; the ring itself is painted with the hull below.
    for (const [id, at] of this.brokeSilence) {
      if (now - at >= BREAK_SILENCE_FLASH_MS || !this.units.some((u) => u.id === id)) {
        this.brokeSilence.delete(id);
      }
    }

    for (const unit of this.units) {
      // The hull itself — model, heading, silent-running dimming — is the
      // conn view's. What this pass owns is the instrument ink *about* the
      // hull, billboarded at its drawn depth.
      const p = this.project(unit.x, unit.y, unit.depth);
      if (p === null) break;
      const g = this.unitSymbols.acquire(unit.id);
      if (!p.visible) {
        g.visible = false;
        continue;
      }
      g.position.set(p.x, p.y);
      g.scale.set(p.pxPerM);
      const inverseScale = 1 / p.pxPerM;

      // The conn view may be drawing the hull larger than true scale at survey
      // zoom (docs/art-direction.md "Far-zoom readability scale"), and ink that
      // captions a hull has to track the figure it captions — a selection ring
      // inside its own hull is worse than no ring. Aim never reads this; the
      // reach floors below are deliberately still in true metres.
      const radius = (HULL_LENGTH_M[unit.kind] / 2) * this.hullDrawScale();
      const isSelected = this.selected.has(unit.id);

      if (isSelected) {
        g.circle(0, 0, radius + 8).stroke({
          width: 2 * inverseScale,
          color: UI.text,
          alpha: 0.8,
        });
      }

      // A small tick of the unit's own loudness, drawn on the unit itself.
      g.circle(0, 0, radius + 6 + unit.sig * 0.35).stroke({
        width: 1 * inverseScale,
        color: sigColor(unit.sig),
        alpha: 0.25,
      });

      // Overreaching its rating is drawn on the hull itself, not only in the
      // selection card: a squad crushing at the bottom of a dive is something
      // the player must see without having clicked anything (docs/ui-ux.md §8).
      if (this.isCrushing(unit)) {
        g.circle(0, 0, radius + 4).stroke({
          width: 2 * inverseScale,
          color: UI.threat,
          alpha: 0.9,
        });
      }

      // The hull that just broke silence wears the noise leaving it —
      // expanding outward, unlike the lock brackets which close in.
      const broke = this.brokeSilence.get(unit.id);
      if (broke !== undefined) {
        const t = (now - broke) / BREAK_SILENCE_FLASH_MS;
        g.circle(0, 0, radius * 2 * (1 + t * 3)).stroke({
          width: 2 * inverseScale,
          color: UI.threat,
          alpha: (1 - t) * 0.8,
        });
      }

      if (unit.maxHp > 0 && unit.hp < unit.maxHp) {
        const width = radius * 2.4;
        const fraction = Math.max(0, unit.hp / unit.maxHp);
        const barY = -radius - 12 * inverseScale;
        const barX = -width / 2;
        g.rect(barX, barY, width, 3 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(barX, barY, width * fraction, 3 * inverseScale).fill({
          color: UI.friendly,
        });
        // The unrecoverable stub, in threat red at the far end — hull the deep
        // kept, whether by crushing the boat or by poisoning it in the
        // shallows. Too small at map scale for hatching to read, so the colour
        // carries it here and the texture carries it in the card.
        if (unit.unhealableDamage > 0) {
          const lost = Math.min(1, unit.unhealableDamage / unit.maxHp);
          g.rect(barX + width * (1 - lost), barY, width * lost, 3 * inverseScale).fill({
            color: UI.threat,
            alpha: 0.85,
          });
        }
      }
    }
    this.unitSymbols.sweep();
  }

  /**
   * HUD. The SIG meter is a permanent element by design — "players must feel
   * their own loudness" (docs/art-direction.md).
   */
  private drawHud(): void {
    const g = this.hudGraphics;
    g.clear();

    const screenWidth = this.hudWidth();

    // Top strip: stockpile, then the SIG meter — the player's own loudness is
    // a first-class resource and sits beside the others (docs/art-direction.md).
    g.rect(0, 0, screenWidth, TOP_BAR_HEIGHT).fill({ color: UI.glass, alpha: 0.92 });
    g.rect(0, TOP_BAR_HEIGHT - 1, screenWidth, 1).fill({ color: UI.glassStroke });

    this.resourceLabel.text = `NODULES ${this.nodules.toFixed(0)}`;
    this.resourceLabel.style.fill = RESOURCE_COLOR[ResourceKind.Nodule];

    // Crystal appears only once a player has some or has seen a field: an
    // always-on zero would be chrome, and this HUD spends space on decisions.
    const showCrystal =
      this.crystal > 0 || this.nodes.some((n) => n.kind === ResourceKind.ResonanceCrystal);
    this.crystalLabel.visible = showCrystal;
    this.crystalLabel.text = `CRYSTAL ${this.crystal.toFixed(0)}`;
    this.crystalLabel.style.fill = RESOURCE_COLOR[ResourceKind.ResonanceCrystal];
    this.crystalLabel.position.set(this.resourceLabel.x + this.resourceLabel.width + 16, 8);

    // Biomass appears only once a player has killed something. An always-on
    // zero would be chrome, and this HUD spends its space on decisions.
    this.biomassLabel.visible = this.biomass > 0;
    if (this.biomassLabel.visible) {
      this.biomassLabel.text = `BIOMASS ${this.biomass.toFixed(0)}`;
      this.biomassLabel.style.fill = FAUNA_COLOR;
      const anchorLabel = showCrystal ? this.crystalLabel : this.resourceLabel;
      this.biomassLabel.position.set(anchorLabel.x + anchorLabel.width + 16, 8);
    }

    // Thermal Draw, drawn as a *rate* and deliberately not like the stockpiles
    // beside it. docs/economy.md §2 makes it the one resource that is never
    // banked, so it reads "6/4" — what you make over what you owe — with a
    // segmented bar rather than a filling one. A number that could be mistaken
    // for a balance would be teaching the player the wrong thing about it.
    const beforeDraw = this.biomassLabel.visible
      ? this.biomassLabel
      : this.crystalLabel.visible
        ? this.crystalLabel
        : this.resourceLabel;
    const drawX = beforeDraw.x + beforeDraw.width + 16;
    const deficit = this.drawReport.satisfaction < 1;
    this.drawLabel.text = `DRAW ${this.drawReport.capacity.toFixed(0)}/${this.drawReport.demand.toFixed(0)}`;
    this.drawLabel.style.fill = deficit ? UI.threat : UI.accent;
    this.drawLabel.position.set(drawX, 8);

    // Segments, one per unit of demand, filled up to what capacity covers.
    // Discrete because draw is discrete: you have four taps or you do not.
    const segments = Math.max(1, Math.min(12, Math.ceil(this.drawReport.demand)));
    const covered = Math.round(segments * this.drawReport.satisfaction);
    const segX = drawX + this.drawLabel.width + 8;
    for (let i = 0; i < segments; i++) {
      g.rect(segX + i * 6, 11, 4, 9).fill({
        color: i < covered ? (deficit ? UI.threat : UI.accent) : UI.glassStroke,
        alpha: i < covered ? 0.9 : 0.35,
      });
    }

    const meterX = segX + segments * 6 + 18;
    // Floored as well as capped. §11's UI scale can shrink the HUD's virtual
    // viewport to 720 px at 200%, and a meter allowed to go to zero — or
    // negative — would take the one element the design calls permanent
    // ("players must feel their own loudness") off the screen first.
    const meterWidth = Math.max(40, Math.min(120, screenWidth - meterX - 150));
    const meterY = 9;
    const meterHeight = 12;
    g.rect(meterX, meterY, meterWidth, meterHeight).fill({ color: 0x000000, alpha: 0.5 });
    const fraction = Math.max(0, Math.min(1, this.peakSig / 100));
    g.rect(meterX, meterY, meterWidth * fraction, meterHeight).fill({
      color: sigColor(this.peakSig),
    });
    g.rect(meterX, meterY, meterWidth, meterHeight).stroke({ width: 1, color: UI.glassStroke });

    this.sigLabel.text = `SIG ${this.peakSig.toFixed(0)}`;
    this.sigLabel.style.fill = sigColor(this.peakSig);
    this.sigLabel.position.set(meterX + meterWidth + 8, 8);

    // What your own noise is doing to your hearing, in words. The bed makes
    // this audible; §11 requires it also be readable.
    const mix = selfMixFor(this.fleetSig, this.fleetSilent);
    const deaf = mix.worldGain < 1 ? '  \u2013 masking' : mix.worldGain > 1 ? '  \u2013 open' : '';
    this.bandLabel.text = `${mix.label.toUpperCase()}${deaf}`;
    this.bandLabel.style.fill = this.fleetSilent ? UI.accent : UI.textDim;
    this.bandLabel.position.set(this.sigLabel.x + this.sigLabel.width + 12, 10);

    // The continuous half of the exposure report. Deliberately says only how
    // well you are seen, never by whom or from where — that is all the server
    // sends, and the HUD must not imply otherwise.
    const tracked = this.exposure.tier >= ResolutionTier.Bearing;
    this.exposureLabel.visible = tracked;
    // Re-inked per frame rather than at build time: the threat colour is one of
    // the inks a colour-vision palette moves (§11), and a style set once in
    // `buildHudText` would keep the palette the player just left.
    this.exposureLabel.style.fill = UI.threat;
    if (tracked) {
      this.exposureLabel.text = `TRACKED \u00d7${this.exposure.trackedCount}`;
      this.exposureLabel.position.set(this.bandLabel.x + this.bandLabel.width + 14, 10);
    }

    const contactCount = this.tracked.size;
    this.statusLabel.text =
      this.status === 'connected'
        ? `${contactCount} contact${contactCount === 1 ? '' : 's'}`
        : this.status;
    this.statusLabel.position.set(screenWidth - this.statusLabel.width - 12, 9);

    // Left of the contact count, on the same line: the ground you are on is
    // context, not a live number. On the top bar rather than over the world,
    // because everything drawn over the world is information about the match.
    //
    // It is also the only thing on this strip that may be dropped when the
    // strip runs out of room, and at 200% UI scale on a 1440 px window it has
    // to be: everything to its left is either a live number or one of §11's
    // audio-parity readouts, and the ground you are standing on does not change.
    //
    // The clock sits between them (#208): it is the log's T+ axis made live —
    // the same stamp() the log's rows use, so the two agree to the second by
    // construction.
    //
    // Two things yield when the strip runs out of room, in this order: the
    // map name, which is context rather than a number, and then the clock
    // itself. Nothing further down gives way, because everything to the left
    // is either a live number or one of §11's audio-parity readouts — and a
    // clock printed *over* `TRACKED ×n` would cost the player the readout
    // that tells them how well they are seen. A missing clock is a smaller
    // loss than an unreadable one.
    const leftEdge = tracked
      ? this.exposureLabel.x + this.exposureLabel.width
      : this.bandLabel.x + this.bandLabel.width;
    this.clockLabel.text = stamp(this.lastTick);
    this.clockLabel.visible = this.statusLabel.x - 16 - leftEdge >= this.clockLabel.width + 16;
    const rightEdge = this.clockLabel.visible
      ? this.statusLabel.x - this.clockLabel.width - 16
      : this.statusLabel.x;
    if (this.clockLabel.visible) this.clockLabel.position.set(rightEdge, 10);
    this.mapLabel.visible = this.mapNamed && rightEdge - 16 - leftEdge >= this.mapLabel.width + 16;
    if (this.mapLabel.visible) {
      this.mapLabel.position.set(rightEdge - this.mapLabel.width - 16, 10);
    }

    // Hint line rides just above the command panel, clear of the scope.
    //
    // Trimmed to the room it has, a whole clause at a time. The line is built
    // from `  \u00b7  `-separated clauses in falling order of usefulness, and at
    // 200% UI scale on a 1440 px window the full one is wider than the strip it
    // sits in — a hint running off the screen edge reads as a broken HUD rather
    // than as a long hint, and the clause that would be cut is always the least
    // load-bearing one. A mission refusal carries no separators, so it is never
    // what gets shortened.
    const scope = this.minimapRect();
    const hintX = scope.x + scope.size + 12;
    const hintRoom = this.hudWidth() - hintX - 12;
    this.selectionLabel.text = this.hintLine();
    while (this.selectionLabel.width > hintRoom) {
      const cut = this.selectionLabel.text.lastIndexOf('  \u00b7  ');
      if (cut < 0) break;
      this.selectionLabel.text = this.selectionLabel.text.slice(0, cut);
    }
    this.selectionLabel.position.set(hintX, this.hudHeight() - BAR_HEIGHT - 20);

    if (this.missionOver !== null) {
      // Checked first, and never falling through to the match banner below:
      // an evacuation announced as "THE RIFT FALLS SILENT — VICTORY" would be
      // the HUD contradicting the only thing the mission was about, and a
      // mission leaves `winnerSlot` at -1 so that banner would read every
      // outcome as a defeat.
      const banner = missionBanner(this.missionOver.outcome);
      this.bannerLabel.text = banner.text;
      this.bannerLabel.style.fill = banner.fill;
      this.bannerLabel.position.set(screenWidth / 2, this.hudHeight() / 2);
    } else if (this.gameOver !== null) {
      const won = this.gameOver.winnerSlot === this.slot;
      this.bannerLabel.text = won ? 'THE RIFT FALLS SILENT — VICTORY' : 'BASTION LOST — DEFEAT';
      this.bannerLabel.style.fill = won ? UI.friendly : UI.threat;
      this.bannerLabel.position.set(screenWidth / 2, this.hudHeight() / 2);
    } else {
      this.bannerLabel.text = '';
    }
  }

  /**
   * Diagonal hatching inside a rect.
   *
   * Reserved for crush damage: it must never be mistaken for the ordinary
   * damage a repair will undo, and a distinct *texture* survives colour-vision
   * differences in a way a distinct hue would not (docs/ui-ux.md §11).
   */
  private hatch(g: Graphics, x: number, y: number, w: number, h: number, color: number): void {
    if (w <= 0 || h <= 0) return;
    g.rect(x, y, w, h).fill({ color: 0x000000, alpha: 0.55 });
    const step = 4;
    for (let offset = 0; offset < w + h; offset += step) {
      const x0 = x + Math.min(offset, w);
      const y0 = y + Math.max(0, offset - w);
      const x1 = x + Math.max(0, offset - h);
      const y1 = y + Math.min(offset, h);
      g.moveTo(x0, y0).lineTo(x1, y1).stroke({ width: 1, color, alpha: 0.85 });
    }
    g.rect(x, y, w, h).stroke({ width: 1, color, alpha: 0.6 });
  }

  /**
   * The marquee, drawn in screen space over everything.
   *
   * Deliberately thin and unfilled: it sits on top of contacts, and a solid
   * box would hide the one thing the player is most likely watching while
   * they drag.
   */
  private drawMarquee(): void {
    const g = this.hudGraphics;
    if (this.marquee === null) return;
    const rect = EchoRenderer.normalise(this.marquee);
    const w = rect.right - rect.left;
    const h = rect.bottom - rect.top;
    // Slop is a *pointer* distance, so it is judged before the HUD's scale is
    // divided out: how far a hand moved does not change with UI scale.
    if (Math.hypot(w, h) <= DRAG_SLOP_PX) return;
    // The marquee is recorded in client pixels and drawn into the scaled HUD
    // layer, so it is divided back like every other pointer coordinate — at
    // 150% an undivided box would trail the cursor by half its own width.
    const k = 1 / this.uiScale;
    const [x, y, bw, bh] = [rect.left * k, rect.top * k, w * k, h * k];
    g.rect(x, y, bw, bh).fill({ color: UI.accent, alpha: 0.06 });
    g.rect(x, y, bw, bh).stroke({ width: 1, color: UI.accent, alpha: 0.9 });
  }

  /**
   * Queued orders, drawn as the route they are.
   *
   * Only for the selection: every unit drawing its plan at once would bury
   * the map in lines. Anchors are where each order pointed when it was
   * given — for a queued attack that is deliberately not the target's live
   * position, which the player may no longer be entitled to.
   */
  private drawOrderPlans(): void {
    const g = this.ringLayer;

    for (const unit of this.units) {
      if (!this.selected.has(unit.id)) continue;
      const plan = unit.queuedOrders;
      if (plan === undefined || plan.length === 0) continue;

      // The route is plotted on the ground — a course on the chart floor —
      // and its markers are instrument glyphs, held at screen size.
      let fromX = unit.x;
      let fromY = unit.y;
      for (const order of plan) {
        if (this.traceLine(g, fromX, fromY, order.x, order.y, null)) {
          g.stroke({ width: 1.5, color: UI.accent, alpha: 0.45 });
        }
        const p = this.project(order.x, order.y, null);
        if (p !== null && p.visible) {
          const marker = order.kind === 'move' ? 7 : 11;
          g.circle(p.x, p.y, marker).stroke({
            width: 1.5,
            color: order.kind === 'attack' ? UI.threat : UI.accent,
            alpha: 0.8,
          });
        }
        fromX = order.x;
        fromY = order.y;
      }
    }
  }

  /** Effective Pressure Rating: what the hull owns plus what it is renting. */
  private effectivePr(unit: OwnUnit): number {
    return effectivePressureRating(unit.kind, this.faction) + unit.pressureBonus;
  }

  /**
   * Would this hull be crushed at that depth?
   *
   * One predicate, two questions. Asked of where a hull *is*, it is the
   * reactive warning that has always been here — the hull is already dying.
   * Asked of where an order would *send* it, it is the warning
   * docs/systems-combat.md §8 requires, and the difference between crush-baiting
   * beating the inattentive (intended) and beating the uninformed (not).
   */
  private wouldCrush(unit: OwnUnit, depthM: number): boolean {
    return requiredPressureRating(depthM) > this.effectivePr(unit);
  }

  /** True when the hull is deeper than its effective rating can survive. */
  private isCrushing(unit: OwnUnit): boolean {
    return this.wouldCrush(unit, unit.depth);
  }

  /** Screen y for a depth, inside the ribbon's vertical span. */
  private ribbonY(depthM: number, top: number, height: number): number {
    const t = Math.max(0, Math.min(1, depthM / RIBBON_MAX_DEPTH_M));
    return top + height * t;
  }

  /**
   * The depth ribbon (docs/ui-ux.md §8).
   *
   * Depth is the axis the player commits on, so it gets permanent screen space
   * rather than living inside a selection card. What it shows is the band
   * structure — Shelf / Mid-Water / Abyssal and the boundaries between them —
   * with a marker per selected hull, because the bands are what a commander
   * reasons about; the metre figure is only ever a confirmation.
   *
   * It also draws the **thermocline** (docs/systems-echo.md §3): a cyan line
   * at 1,200 m with the duct shaded around it. Not a band — it is not terrain
   * and has no cells, it modifies a listening pair rather than a place — which
   * is why it is cyan against the bands' magenta, and why it appears here and
   * nowhere in the world view. Drawing it reveals nothing: the boundary is a
   * published constant, identical on every map.
   *
   * While Alt is held it also previews the dive: the rung a descent would take
   * the selection to, and what that descent would cost in SIG. Same bargain as
   * the ping preview — see the price before you pay it.
   */
  private drawDepthRibbon(): void {
    const g = this.ribbonGraphics;
    g.clear();

    const selected = this.selectedUnits();
    // Nothing selected: the ribbon would be decoration, and screen space in
    // this game is spent on information the player can act on.
    if (selected.length === 0) {
      for (const label of this.ribbonLabels) label.visible = false;
      this.ribbonReadout.visible = false;
      this.ductLabel.visible = false;
      return;
    }

    const scope = this.minimapRect();
    const top = TOP_BAR_HEIGHT + RIBBON_TOP_PAD;
    const bottom = scope.y - RIBBON_BOTTOM_PAD;
    const height = bottom - top;
    if (height < 60) {
      // Too short to read; better absent than misleading.
      for (const label of this.ribbonLabels) label.visible = false;
      this.ribbonReadout.visible = false;
      this.ductLabel.visible = false;
      return;
    }

    g.rect(RIBBON_X, top, RIBBON_WIDTH, height).fill({ color: UI.glass, alpha: 0.85 });

    // Band bodies, darkening with depth: the strip should read as a descent
    // before any label is parsed.
    const bands: Array<[DepthBand, number]> = [
      [DepthBand.Shelf, 0.1],
      [DepthBand.MidWater, 0.2],
      [DepthBand.Abyssal, 0.34],
    ];
    for (const [band, alpha] of bands) {
      const bandTop = this.ribbonY(DEPTH_BANDS[band].min, top, height);
      const bandMax = Math.min(DEPTH_BANDS[band].max, RIBBON_MAX_DEPTH_M);
      const bandBottom = this.ribbonY(bandMax, top, height);
      g.rect(RIBBON_X, bandTop, RIBBON_WIDTH, bandBottom - bandTop).fill({
        color: 0x000000,
        alpha,
      });
    }

    // Boundaries at 400 m and 1,800 m — the two numbers §8 asks for by name.
    for (const band of [DepthBand.MidWater, DepthBand.Abyssal]) {
      const y = this.ribbonY(DEPTH_BANDS[band].min, top, height);
      g.rect(RIBBON_X, y, RIBBON_WIDTH, 1).fill({ color: UI.glassStroke, alpha: 0.7 });
    }

    // The Lid — the sour top 150 m (docs/systems-depth.md §2, docs/world.md).
    // Threat-hatched rather than filled: it is danger, not a fourth band, and
    // the hatch is the same register the card's hatched health bar uses for
    // hull the water keeps. Drawn quietly enough not to compete with markers.
    const lidBottom = this.ribbonY(LID.DEPTH_M, top, height);
    this.hatch(g, RIBBON_X, top, RIBBON_WIDTH, lidBottom - top, UI.threat);
    g.rect(RIBBON_X, lidBottom, RIBBON_WIDTH, 1).fill({ color: UI.threat, alpha: 0.5 });

    // The thermocline (docs/systems-echo.md §3). Not a band and not terrain —
    // it modifies a listening pair rather than a place — which is why it is
    // drawn here, on the one widget that is about the water column, and
    // nowhere in the world view or on the scope.
    //
    // Cyan against the bands' magenta, because it is a different rule and must
    // not read as a fourth band boundary. Both bounds come from shared rather
    // than from 1,200 ± 100 restated here.
    const ductTop = this.ribbonY(THERMOCLINE_DUCT_TOP_M, top, height);
    const ductBottom = this.ribbonY(THERMOCLINE_DUCT_BOTTOM_M, top, height);
    const ductHeight = ductBottom - ductTop;
    // The duct is a fixed 6.67% of a 0–3,000 m strip: ~50 px at 1080p, ~4 px
    // at the 60 px floor this method already refuses to draw below. Under a
    // few pixels a band and a line are the same picture, so the band is
    // dropped rather than drawn as a smear that means something it does not.
    if (ductHeight >= RIBBON_DUCT_MIN_PX) {
      g.rect(RIBBON_X, ductTop, RIBBON_WIDTH, ductHeight).fill({
        color: UI.accent,
        alpha: 0.16,
      });
    }
    // The boundary itself is always drawn. §3 calls it "a wall rather than a
    // gradient, like the depth bands themselves", and a wall gets a line.
    g.rect(RIBBON_X, this.ribbonY(THERMOCLINE.DEPTH_M, top, height), RIBBON_WIDTH, 1).fill({
      color: UI.accent,
      alpha: 0.85,
    });

    g.rect(RIBBON_X, top, RIBBON_WIDTH, height).stroke({ width: 1, color: UI.glassStroke });

    // Right of the strip, like the band labels — the ribbon sits 12 px from the
    // window edge, so there is no room on its left and a label placed there is
    // clipped by the viewport. It cannot collide with the band labels: those
    // are parked at 0 m, 400 m and 1,800 m, and this one is at 1,200 m.
    // Centred on the line rather than hung below it, because it names a
    // boundary and not the water under it.
    this.ductLabel.visible = ductHeight >= RIBBON_DUCT_MIN_PX;
    this.ductLabel.position.set(
      RIBBON_X + RIBBON_WIDTH + 5,
      this.ribbonY(THERMOCLINE.DEPTH_M, top, height) - this.ductLabel.height / 2
    );

    // Band labels, each parked just inside the top of its own band.
    this.ribbonLabels.forEach((label, i) => {
      const band = [DepthBand.Shelf, DepthBand.MidWater, DepthBand.Abyssal][i]!;
      label.visible = true;
      label.position.set(
        RIBBON_X + RIBBON_WIDTH + 5,
        this.ribbonY(DEPTH_BANDS[band].min, top, height) + 2
      );
    });

    // A marker per selected hull, and its ordered depth as a ghost above it.
    for (const unit of selected) {
      const y = this.ribbonY(unit.depth, top, height);
      const crushing = this.isCrushing(unit);

      if (unit.depthOrder !== undefined) {
        const orderY = this.ribbonY(unit.depthOrder, top, height);
        g.rect(RIBBON_X - 2, orderY - 1, RIBBON_WIDTH + 4, 2).fill({
          color: UI.accent,
          alpha: 0.45,
        });
        // A hairline from here to there: the commitment, drawn as distance.
        g.rect(RIBBON_X + RIBBON_WIDTH / 2, Math.min(y, orderY), 1, Math.abs(orderY - y)).fill({
          color: UI.accent,
          alpha: 0.3,
        });
      }

      g.rect(RIBBON_X - 3, y - 1.5, RIBBON_WIDTH + 6, 3).fill({
        color: crushing ? UI.threat : UI.friendly,
      });
    }

    // Dive preview: where the next band down is, and what getting there costs.
    // The cost is two things, and until now the ribbon only showed one of them:
    // the descent is loud, *and* it may be deeper than the hull is rated for.
    // docs/systems-combat.md §8 asks for the second warning before the order,
    // not after — "the bait should beat the inattentive, never the uninformed".
    // It stays a warning and never a refusal, because renting depth you cannot
    // survive is the mechanic (Match.orderDepth deliberately does not check).
    const previewTarget = this.previewPing ? this.stepDepthTarget(selected, 1) : null;
    const previewCrushes =
      previewTarget !== null && selected.some((unit) => this.wouldCrush(unit, previewTarget));
    if (previewTarget !== null) {
      const targetY = this.ribbonY(previewTarget, top, height);
      g.rect(RIBBON_X - 4, targetY - 2, RIBBON_WIDTH + 8, 4).fill({
        color: previewCrushes ? UI.threat : sigColor(DEPTH.DESCENT_SIG),
        alpha: previewCrushes ? 1 : 0.8,
      });
    }

    const lead = selected[0]!;
    this.ribbonReadout.visible = true;
    // Which side of the layer the selection is on, from its own depth and
    // nothing else — docs/ui-ux.md §1, "the client cannot know more than the
    // player earned". The *pair* factor needs a listener's depth and so can
    // never be shown; a hull's own zone is its own state.
    //
    // Only the two non-default zones are named. Above the layer is where most
    // of the game happens, and a badge printed on every selection would be
    // chrome rather than information.
    const zone = thermoclineZone(lead.depth);
    const zoneTag =
      zone === ThermoclineZone.Duct ? ' · DUCT' : zone === ThermoclineZone.Below ? ' · UNDER' : '';
    this.ribbonReadout.text = this.previewPing
      ? previewCrushes
        ? `DIVE ${DEPTH.DESCENT_SIG} SIG · CRUSH`
        : `DIVE ${DEPTH.DESCENT_SIG} SIG`
      : `${lead.depth.toFixed(0)}m${zoneTag}`;
    this.ribbonReadout.style.fill = this.previewPing
      ? previewCrushes
        ? UI.threat
        : sigColor(DEPTH.DESCENT_SIG)
      : this.isCrushing(lead)
        ? UI.threat
        : UI.accent;
    this.ribbonReadout.position.set(RIBBON_X, bottom + 4);
  }

  /**
   * The sonar scope. It renders only what the player has earned: own force at
   * full clarity, contacts at tier fidelity, terrain and nodule fields as
   * chart data every commander holds (docs/art-direction.md "HUD Layout").
   */
  private drawMinimap(): void {
    const { x, y, size } = this.minimapRect();
    const terrain = this.terrain;
    const k = this.minimapScale(size);

    // Terrain is static; redraw the cached layer only when the scope resizes.
    if (terrain !== null && size !== this.minimapCachedSize) {
      this.minimapCachedSize = size;
      const tg = this.minimapTerrainG;
      tg.clear();
      tg.rect(0, 0, size, size).fill({ color: 0x000000, alpha: 0.85 });
      const cell = terrain.cellM * k;
      for (let row = 0; row < terrain.rows; row++) {
        for (let col = 0; col < terrain.cols; col++) {
          const index = row * terrain.cols + col;
          const biome = terrain.biomes[index] as Biome;
          tg.rect(col * cell, row * cell, cell + 0.5, cell + 0.5).fill({
            // Rock, on the scope as in the world: the route that closed has to
            // close here too, or the player plans on the scope and discovers
            // the collapse by pressing a fleet against it.
            color: isRock(terrain, index)
              ? UI.background
              : (BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater]),
          });
        }
      }
      for (const node of this.nodes) {
        tg.circle(node.x * k, node.y * k, 2.5).fill({
          color: RESOURCE_COLOR[node.kind],
          alpha: 0.8,
        });
      }
      tg.rect(0, 0, size, size).stroke({ width: 1, color: UI.glassStroke });
    }
    this.minimapTerrainG.position.set(x, y);

    const og = this.minimapOverlayG;
    og.clear();
    og.position.set(x, y);
    if (terrain === null || k <= 0) return;

    // Range rings at the ping's two radii — the two distances that decide
    // every use of the loudest button in the game, drawn permanently so the
    // decision never needs a mental conversion (docs/ui-ux.md §5).
    const centre = this.scopeAnchor();
    if (centre !== null) {
      for (const radius of [ACTIVE_SONAR.REVEAL_RADIUS_M, ACTIVE_SONAR.SELF_REVEAL_RADIUS_M]) {
        og.circle(centre.x * k, centre.y * k, radius * k).stroke({
          width: 1,
          color: UI.accent,
          alpha: 0.18,
        });
      }
    }

    // Echo Marks (§5): "a separate dimmer layer, drawn beneath returns, in a
    // colder hue". Beneath is the whole of it, and beneath the own force as
    // well as the returns — residue is ground, own force is fact, and this
    // instrument's promise is own force at full clarity. Drawn over the layer
    // it *is* ground with, and a stain over a hull dot dulls the one thing on
    // the scope the player has fully earned. Past and present must never share
    // an ink, on this instrument as in the world.
    drawScopeEchoMarks(og, this.marks, k);

    const palette = FACTION_PALETTE[this.faction];
    for (const structure of this.structures) {
      og.rect(structure.x * k - 2, structure.y * k - 2, 4, 4).fill({ color: palette.primary });
    }
    for (const unit of this.units) {
      og.circle(unit.x * k, unit.y * k, 1.5).fill({ color: palette.accent });
    }

    // Returns carry the same tier fidelity as the world view, scaled down.
    // They used to be uniform dots, which drew a Tier-1 haze as crisply as a
    // Tier-4 track — the scope asserting precision the server never sent.
    // Drift Health, on the scope. docs/bestiary.md §6 makes killing a region a
    // strategic act available to everyone, and an act nobody can see is not
    // one — so a stripped region reads as a dead patch on the sonar picture,
    // which is exactly what it is: quieter, more legible, and worth less.
    if (this.driftHealth.length > 0) {
      const regions = Math.round(Math.sqrt(this.driftHealth.length));
      const cell = size / regions;
      for (let i = 0; i < this.driftHealth.length; i++) {
        const health = this.driftHealth[i]!;
        if (health >= 75) continue;
        const rx = (i % regions) * cell;
        const ry = Math.floor(i / regions) * cell;
        og.rect(rx, ry, cell, cell).fill({
          color: 0x000000,
          alpha: 0.16 + (1 - health / 75) * 0.3,
        });
      }
    }

    const scopeNow = performance.now();
    for (const { contact, firstSeenMs } of this.tracked.values()) {
      if (contact.tier === ResolutionTier.Silent) continue;
      const style = TIER_STYLE[contact.tier as Exclude<ResolutionTier, ResolutionTier.Silent>];
      if (style === undefined) continue;
      const smear = SCOPE_RETURN_RADIUS_PX[contact.tier as 1 | 2 | 3 | 4];
      // §2's fade-in, on the scope's own budget: it may start at 150 ms and
      // reach full at 400 ms, ahead of the world layer but still behind the
      // voice. The whole point is that the ear gets there first.
      const arrival = markOpacity(
        scopeNow - firstSeenMs,
        this.precedence.MINIMAP_FADE_START,
        this.precedence.MINIMAP_FADE_FULL
      );
      if (arrival <= 0) continue;
      // Soft at low tiers: a haze is drawn as a haze, and its size is the
      // uncertainty rather than the contact.
      og.circle(contact.x * k, contact.y * k, smear).fill({
        color: style.color,
        alpha: (contact.tier >= ResolutionTier.Classification ? 0.85 : 0.22) * arrival,
      });
      if (contact.tier >= ResolutionTier.Classification) {
        og.circle(contact.x * k, contact.y * k, smear).stroke({
          width: 1,
          color: style.color,
          alpha: 0.9 * arrival,
        });
      }
    }

    // Attention on the scope (docs/ui-ux.md §5): own-force facts only, drawn
    // among the returns they answer to. Nothing in this pass points at an
    // enemy — a wedge is a bearing, a pulse is your own hull.
    this.drawScopeAttention(og, k, size, scopeNow);

    // The sweep. Cosmetic, and deliberately out of phase with the 5 Hz
    // detection tick (4 s a revolution) so that no player ever comes to
    // believe the sweep is what finds things.
    //
    // Under reduced motion it becomes a fixed cross-hair at the same anchor and
    // the same alpha. That is not a removal: the rotation never carried
    // information, but the point it rotates about does — it is where the range
    // rings are measured from, and losing it would lose the one thing the
    // sweep was actually saying (docs/ui-ux.md §11).
    if (centre !== null) {
      const cx = centre.x * k;
      const cy = centre.y * k;
      const ink = { width: 1, color: UI.accent, alpha: 0.22 };
      if (this.reducedMotion) {
        const arm = size * 0.06;
        og.moveTo(cx - arm, cy)
          .lineTo(cx + arm, cy)
          .stroke(ink);
        og.moveTo(cx, cy - arm)
          .lineTo(cx, cy + arm)
          .stroke(ink);
      } else {
        const angle = ((performance.now() % SCOPE_SWEEP_MS) / SCOPE_SWEEP_MS) * Math.PI * 2;
        og.moveTo(cx, cy)
          .lineTo(cx + Math.cos(angle) * size, cy + Math.sin(angle) * size)
          .stroke(ink);
      }
    }

    // Camera viewport, so the scope doubles as a navigator. A trapezoid, not
    // a rectangle: the conn camera is tilted, and its honest footprint on the
    // ground has a near edge wider than its far one. Vertices clamp to the
    // scope's square — a zoomed-out camera sees past the map's edge, and the
    // box must not draw past its frame.
    const quad = this.conn?.groundQuad() ?? [];
    if (quad.length === 4) {
      const points: number[] = [];
      for (const corner of quad) {
        points.push(
          Math.max(0, Math.min(size, corner.x * k)),
          Math.max(0, Math.min(size, corner.y * k))
        );
      }
      og.poly(points).stroke({ width: 1, color: UI.text, alpha: 0.6 });
    }
  }

  /**
   * Attention on the scope — docs/ui-ux.md §5 (#206, #209). Three cues,
   * every one an own-force fact: the exposure wedge on the rim (a bearing,
   * never a position), the under-fire pulse on the hull that was hit, and
   * the idle marker on a harvester with nothing to do.
   */
  private drawScopeAttention(og: Graphics, k: number, size: number, now: number): void {
    // The exposure wedge: §11's screen-edge flash given its scope-space twin
    // — same bearing, same two-second decay, and under reduced motion the
    // same held equivalent. On the rim and never at a position, because the
    // server sent a bearing and nothing else.
    const half = size / 2;
    for (const flash of this.exposureFlashes) {
      const t = (now - flash.atMs) / EXPOSURE_FLASH_MS;
      if (t >= 1) continue; // spliced out by the screen-edge pass
      const alpha = this.reducedMotion ? 0.5 : Math.pow(1 - t, 2) * 0.7;
      const dx = Math.cos(flash.bearing);
      const dy = Math.sin(flash.bearing);
      const reach = 1 / Math.max(Math.abs(dx) / half, Math.abs(dy) / half);
      const inX = half + dx * (reach - 9);
      const inY = half + dy * (reach - 9);
      // Pulled a base-width inside the rim so the wedge's own corners cannot
      // spill past the scope's frame on a diagonal bearing — a mark that
      // painted outside the instrument would read as a glitch, not a warning.
      const px = -dy;
      const py = dx;
      const rim = Math.max(0, reach - 6);
      const bx = half + dx * rim;
      const by = half + dy * rim;
      og.poly([bx + px * 6, by + py * 6, bx - px * 6, by - py * 6, inX, inY]).fill({
        color: UI.threat,
        alpha,
      });
    }

    // The under-fire pulse: the break-silence ring's scope cousin, in threat
    // ink, on the hull or structure the blow landed on. The timestamp lives
    // longer than the pulse — the engagement window reads it after this
    // stops drawing.
    for (const hit of this.underFire.values()) {
      const t = (now - hit.atMs) / UNDER_FIRE_PULSE_MS;
      if (t >= 1) continue;
      // The place is the one recorded when the blow landed, not a fresh
      // lookup: a hull the blow destroyed has left the roster, and where it
      // was standing is exactly what the player wants pointed at.
      if (this.reducedMotion) {
        og.circle(hit.x * k, hit.y * k, 5).stroke({
          width: 1.5,
          color: UI.threat,
          alpha: 0.85,
        });
      } else {
        og.circle(hit.x * k, hit.y * k, 2 + t * 6).stroke({
          width: 1.5,
          color: UI.threat,
          alpha: (1 - t) * 0.9,
        });
      }
    }

    // The idle marker: a dim slow breath on a harvester with nothing to do —
    // state, not news, so it holds while the stall does. Cyan rather than
    // threat ink: a chore, and the interface's own colour says so (§5).
    for (const unit of this.units) {
      if (unit.idle === undefined) continue;
      const alpha = this.reducedMotion ? 0.45 : 0.35 + 0.15 * Math.sin(now / 480);
      og.circle(unit.x * k, unit.y * k, 3.5).stroke({ width: 1, color: UI.accent, alpha });
    }
  }

  /** Selected-entity readout, wide screens only; phones keep the hint line. */
  private drawInfoPanel(): void {
    const g = this.infoGraphics;
    g.clear();
    const wide = this.hudWidth() >= 900;
    const structure = this.structures.find((s) => this.selected.has(s.id));
    const unit = this.units.find((u) => this.selected.has(u.id));
    const any = structure ?? unit;
    if (!wide || any === undefined) {
      this.infoName.visible = false;
      this.infoLine1.visible = false;
      this.infoLine2.visible = false;
      this.infoBadge.visible = false;
      return;
    }

    const w = 250;
    const h = 96;
    const x = this.hudWidth() - w - 10;
    const y = this.hudHeight() - BAR_HEIGHT - h - 10;
    g.roundRect(x, y, w, h, 6).fill({ color: UI.glass, alpha: 0.92 });
    g.roundRect(x, y, w, h, 6).stroke({ width: 1, color: UI.glassStroke });

    const name =
      structure !== undefined ? structureStatsFor(structure.kind).name : statsFor(unit!.kind).name;
    this.infoName.visible = true;
    this.infoName.text = this.selected.size > 1 ? `${name} +${this.selected.size - 1}` : name;
    this.infoName.position.set(x + 12, y + 10);

    const barX = x + 12;
    const barY = y + 34;
    const barW = w - 24;
    g.rect(barX, barY, barW, 8).fill({ color: 0x000000, alpha: 0.5 });
    g.rect(barX, barY, barW * Math.max(0, Math.min(1, any.hp / any.maxHp)), 8).fill({
      color: UI.friendly,
    });
    // Depth leaves the one wound no repair will ever close — crush below a
    // hull's rating, and shallow-water poisoning above the Directorate's line —
    // so it is drawn as a hatched stub at the far end of the bar rather than as
    // absent hull: the permanence is visible now instead of discovered later
    // (docs/ui-ux.md §8).
    if (unit !== undefined && unit.unhealableDamage > 0) {
      this.hatch(
        g,
        barX + barW * Math.max(0, 1 - unit.unhealableDamage / unit.maxHp),
        barY,
        barW * Math.min(1, unit.unhealableDamage / unit.maxHp),
        8,
        UI.threat
      );
    }

    this.infoLine1.visible = true;
    this.infoLine1.text = `HULL ${any.hp.toFixed(0)}/${any.maxHp.toFixed(0)}   SIG ${any.sig.toFixed(0)}`;
    this.infoLine1.position.set(x + 12, y + 48);

    // PR badge. A rented rating is drawn as rented — it evaporates the moment
    // the hull leaves the aura that granted it (docs/systems-depth.md §3).
    if (unit !== undefined) {
      const base = effectivePressureRating(unit.kind, this.faction);
      const crushing = this.isCrushing(unit);
      const badgeW = 44;
      const badgeH = 16;
      const badgeX = x + w - badgeW - 12;
      const badgeY = y + 8;
      // Under-rated inverts *and pulses* (docs/ui-ux.md §8): filled in threat
      // red rather than outlined, and breathing, because a hull losing
      // unrecoverable tonnage should not sit as still on screen as a healthy
      // one. Driven off wall-clock — this is presentation, never simulation.
      //
      // Reduced motion keeps the inversion and trades the breath for a hairline
      // rule under the badge. The pulse's message was *unrecoverable* — this is
      // not merely below spec, it is costing tonnage that will not come back —
      // and the rule says that without moving (docs/ui-ux.md §11).
      if (crushing) {
        if (this.reducedMotion) {
          g.roundRect(badgeX, badgeY, badgeW, badgeH, 3).fill({ color: UI.threat, alpha: 0.92 });
          g.rect(badgeX, badgeY + badgeH + 2, badgeW, 1).fill({ color: UI.threat, alpha: 0.92 });
        } else {
          const pulse = 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() / 260));
          g.roundRect(badgeX, badgeY, badgeW, badgeH, 3).fill({ color: UI.threat, alpha: pulse });
        }
      } else {
        g.roundRect(badgeX, badgeY, badgeW, badgeH, 3).stroke({
          width: 1,
          color: unit.pressureBonus > 0 ? UI.accent : UI.textDim,
        });
      }
      this.infoBadge.visible = true;
      this.infoBadge.text =
        unit.pressureBonus > 0 ? `PR${base}+${unit.pressureBonus}` : `PR${base}`;
      this.infoBadge.style.fill = crushing
        ? UI.text
        : unit.pressureBonus > 0
          ? UI.accent
          : UI.textDim;
      this.infoBadge.position.set(badgeX + badgeW / 2, badgeY + badgeH / 2);
    } else {
      this.infoBadge.visible = false;
    }

    this.infoLine2.visible = true;
    if (structure !== undefined) {
      this.infoLine2.text =
        structure.buildProgress < 1
          ? `constructing ${(structure.buildProgress * 100).toFixed(0)}%`
          : structure.queue.length > 0
            ? `producing · queue ${structure.queue.length}`
            : 'online';
    } else if (unit !== undefined && unit.depthOrder !== undefined) {
      // Ascent is the leg players underestimate, so it is the one that gets a
      // clock rather than a percentage (docs/ui-ux.md §8).
      const descending = unit.depthOrder > unit.depth;
      const metres = Math.abs(unit.depthOrder - unit.depth);
      const seconds = metres / (descending ? DEPTH.DESCENT_RATE_MPS : DEPTH.ASCENT_RATE_MPS);
      this.infoLine2.text = descending
        ? `DIVING to ${unit.depthOrder.toFixed(0)}m · ${seconds.toFixed(0)}s · loud`
        : `rising to ${unit.depthOrder.toFixed(0)}m · ${seconds.toFixed(0)}s`;
    } else if (unit !== undefined && this.isCrushing(unit)) {
      this.infoLine2.text = `CRUSHING at ${unit.depth.toFixed(0)}m · rise or lose the hull`;
    } else if (unit !== undefined && (unit.sourS ?? 0) >= LID.GRACE_S) {
      // The other end of the column (docs/systems-depth.md §2): the grace is
      // spent and the water is keeping the hull.
      this.infoLine2.text = `SOUR — BLEEDING at ${unit.depth.toFixed(0)}m · dive below ${LID.DEPTH_M}m`;
    } else if (unit !== undefined && (unit.sourS ?? 0) > 0 && inLid(unit.depth)) {
      this.infoLine2.text = `SOUR · ${Math.max(0, LID.GRACE_S - (unit.sourS ?? 0)).toFixed(0)}s of grace`;
    } else if (unit !== undefined && unit.followFloor === true && unit.throttle === undefined) {
      this.infoLine2.text = `FOLLOWING FLOOR · ${unit.depth.toFixed(0)}m`;
    } else if (unit !== undefined && unit.throttle !== undefined) {
      const held =
        unit.cargoKind === ResourceKind.ResonanceCrystal && (unit.cargo ?? 0) > 0 ? ' crystal' : '';
      this.infoLine2.text = `throttle ${THROTTLE_LABEL[unit.throttle]} · cargo ${unit.cargo?.toFixed(0) ?? 0}${held}`;
    } else if (unit !== undefined) {
      this.infoLine2.text = unit.silentRunning
        ? `SILENT RUNNING · ${unit.depth.toFixed(0)}m`
        : `systems live · ${unit.depth.toFixed(0)}m`;
    }
    this.infoLine2.position.set(x + 12, y + 68);
  }

  private hintLine(): string {
    // A key that did nothing answers for itself first, ahead of every other
    // hint: the player just pressed something and is owed the reason
    // (docs/ui-ux.md §7). It is the mission's own words, shown verbatim.
    if (
      this.missionRefusal !== null &&
      performance.now() - this.missionRefusal.atMs < MISSION_REFUSAL_MS
    ) {
      return this.missionRefusal.reason;
    }
    // Touch players get gesture words; everything else is on the bar.
    if (this.pendingBuild !== null) {
      const stats = structureStatsFor(this.pendingBuild);
      return this.isTouch
        ? `placing ${stats.name} (${stats.cost})  ·  tap to place`
        : `placing ${stats.name} (${stats.cost})  ·  LMB place  ·  ESC cancel`;
    }
    // The build keys are not advertised where they will not work. A hint bar
    // naming a binding the mission refuses is the same silent lie as a dead
    // button (§7) — worse, because a hint reads as instruction.
    const canBuild = this.missionLock('construction') === null;
    if (this.selected.size === 0) {
      if (this.isTouch) return 'tap select  ·  drag pan  ·  pinch zoom';
      return canBuild
        ? `LMB drag select  ·  MMB pan  ·  ${this.buildKeyHint()} build  ·  1-9 groups  ·  wheel zoom`
        : 'LMB drag select  ·  MMB pan  ·  1-9 groups  ·  wheel zoom';
    }
    const structure = this.structures.find((s) => this.selected.has(s.id));
    if (structure !== undefined) {
      const queue = structure.queue.length > 0 ? `  ·  queue ${structure.queue.length}` : '';
      const name = structureStatsFor(structure.kind).name;
      if (this.isTouch || !canBuild) return `${name}${queue}`;
      return `${name}${queue}  ·  UNITS tab to produce  ·  ${this.buildKeyHint()} build`;
    }
    const harvester = this.units.find((u) => this.selected.has(u.id) && u.throttle !== undefined);
    if (harvester !== undefined) {
      const throttle = THROTTLE_LABEL[harvester.throttle!];
      const state = `harvester [${throttle}] ${harvester.cargo?.toFixed(0) ?? 0} cargo`;
      return this.isTouch
        ? `${state}  ·  tap a field`
        : `${state}  ·  RMB node/move  ·  V throttle`;
    }
    return this.isTouch
      ? `${this.selected.size} selected  ·  tap map to order`
      : `${this.selected.size} selected  ·  RMB move (SHIFT queue)  ·  CTRL+RMB torpedo  ·  SPACE silent  ·  P ping  ·  N decoy  ·  M mine  ·  C charge  ·  D dive  ·  A rise`;
  }

  destroy(): void {
    this.destroyed = true;
    this.detachInput?.();
    this.detachInput = null;
    this.tracked.clear();
    this.conn = null;
    // The bake caches are module-level; drop them so a remount re-bakes
    // rather than serving textures the GPU no longer holds.
    destroyHullTextures();
    destroyStructureTextures();
    // Pixi tears down the ticker, canvas and all child display objects.
    if (this.app.renderer !== null && this.app.renderer !== undefined) {
      this.app.destroy(true, { children: true });
    }
  }
}
