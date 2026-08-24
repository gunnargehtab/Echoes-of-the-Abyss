/**
 * PixiJS v8 renderer for the Echo Layer.
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
 *   +- world        (camera transform: pan + zoom)
 *   |  +- terrain   (static, redrawn only when the map changes)
 *   |  +- rings     (own units' detection radii)
 *   |  +- contacts  (resolved enemy returns, incl. decaying ghosts)
 *   |  +- units     (own units)
 *   +- hud          (screen space, never transformed)
 */

import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import {
  ACTIVE_SONAR,
  Biome,
  DEPTH,
  DEPTH_BANDS,
  DepthBand,
  Faction,
  HarvestThrottle,
  PERSISTENCE,
  PRODUCIBLE,
  PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  ResolutionTier,
  ResourceKind,
  EchoMarkKind,
  SelfEventKind,
  StructureKind,
  UnitKind,
  depthBandFor,
  maxAudibleRangeM,
  requiredPressureRating,
  FaunaSpecies,
  faunaStatsFor,
  statsFor,
  structureStatsFor,
  FACTION_STRUCTURE,
  type Contact,
  HazardPhase,
  type DrawReport,
  type EchoMarkInfo,
  type HazardState,
  type EchoSnapshot,
  type ExposureReport,
  type GameOverPayload,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  BIOME_COLOR,
  depthShade,
  FACTION_PALETTE,
  RESOURCE_COLOR,
  TIER_STYLE,
  UI,
  sigColor,
} from './palette.ts';
import { FACTION_NAME } from './factions.ts';
import type { ContactAudioEntry, ContactAudioFrame } from '../audio/contactMixer.ts';
import type { PingReturn, SelfAudioFrame } from '../audio/selfMixer.ts';
import { PRECEDENCE_MS, markOpacity } from '../audio/precedence.ts';
import { selfMixFor } from '../audio/selfNoise.ts';
import { drawStructureSilhouette, drawUnitSilhouette, HULL_LENGTH_M } from './silhouettes.ts';
import { destroyHullTextures, hullSpriteSizeM, hullTexture, loadHullArt } from './hullTextures.ts';
import {
  destroyStructureTextures,
  loadStructureArt,
  structureSpriteSizeM,
  structureTexture,
} from './structureTextures.ts';
import type { MapPayload, TerrainPayload } from '../net/GameClient.ts';

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
  onHarvestOrder(unitIds: number[], nodeId: number, queued: boolean): void;
  onThrottle(unitIds: number[], throttle: HarvestThrottle): void;
  onBuild(kind: StructureKind, x: number, y: number): void;
  onProduce(structureId: number, kind: UnitKind): void;
  onDepthOrder(unitIds: number[], depth: number): void;
  /** A new detection event, for the contact log. */
  onContactEvent(entry: ContactLogEntry): void;
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
/**
 * Fauna get a colour of their own, but only from Tier 3.
 *
 * A cold organic green, distinct from every faction palette and from the
 * threat red a track wears: once you know it is an animal, you should know
 * instantly, and you should never mistake it for someone's navy.
 */
const FAUNA_COLOR = 0x5fa88a;

const LOCK_FLASH_MS = 700;

/**
 * How each kind of residue is drawn.
 *
 * Deliberately dim and desaturated against the contact palette: a mark must
 * never be mistaken for a contact (docs/audio-direction.md §6 states the rule
 * for the mix; it holds for the screen too), and it must never be mistaken for
 * nothing either, "or the scouting economy dies".
 */
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

const MARK_STYLE: Record<EchoMarkKind, { color: number; alpha: number; radiusM: number }> = {
  [EchoMarkKind.Battle]: { color: 0xb4553c, alpha: 0.3, radiusM: 320 },
  [EchoMarkKind.DestroyedStructure]: { color: 0x8c6a44, alpha: 0.34, radiusM: 420 },
  // The hum reads cooler and wider: it is a state, not an event, and a player
  // should be able to tell at a glance that they have found an economy rather
  // than a fight.
  [EchoMarkKind.IndustrialHum]: { color: 0x3f7f86, alpha: 0.28, radiusM: 520 },
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
 * When a world-space contact mark fades in, milliseconds after it arrives.
 *
 * §2 fixes the start at 250 ms but names no end for the world layer, so the
 * ramp is given the same 250 ms width the minimap's is (150 -> 400). Derived
 * rather than invented: the two layers should feel like one rule.
 */
const WORLD_FADE_MS = {
  start: PRECEDENCE_MS.WORLD_FADE_START,
  full:
    PRECEDENCE_MS.WORLD_FADE_START +
    (PRECEDENCE_MS.MINIMAP_FADE_FULL - PRECEDENCE_MS.MINIMAP_FADE_START),
} as const;

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

const SELECT_RADIUS_M = 140;
/** How close a right-click must land to a contact or node to mean it. */
const TARGET_RADIUS_M = 160;

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

/** Build hotkeys: R refinery, F foundry, T turret, G vent tap. */
const BUILD_KEYS: Record<string, StructureKind> = {
  KeyR: StructureKind.Refinery,
  KeyF: StructureKind.Foundry,
  KeyT: StructureKind.SentinelTurret,
  // G for generator. V, P and D are already spoken for, and T is the turret.
  KeyG: StructureKind.VentTap,
};

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
  private readonly world = new Container();
  private readonly terrainLayer = new Graphics();
  /** Ground the current selection cannot enter. Dynamic: it depends on who is selected. */
  private readonly groundLayer = new Graphics();
  private readonly nodeLayer = new Graphics();
  private readonly ringLayer = new Graphics();
  private readonly contactLayer = new Graphics();
  private readonly structureLayer = new Graphics();
  /** Baked hull sprites for own units; the Graphics layer above draws overlays. */
  private readonly unitSpriteLayer = new Container();
  private readonly unitSprites = new Map<number, Sprite>();
  private readonly structureSpriteLayer = new Container();
  private readonly structureSprites = new Map<number, Sprite>();
  private readonly unitLayer = new Graphics();
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

  /** True while the ping-cost preview is being shown. */
  /**
   * Ping preview moved from Shift to Alt.
   *
   * docs/ui-ux.md §9 specifies order queueing on Shift, which is the RTS
   * convention and the far more frequent action; the doc listed both on Shift,
   * which is a conflict in the doc rather than a choice. Alt was free.
   */
  private previewPing = false;

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
   * Last known heading per own unit, derived client-side from position deltas
   * between snapshots — the server does not send headings for own units, and
   * a hull that snapped back to 0° whenever it stopped would read as broken.
   */
  private readonly headings = new Map<number, number>();
  private readonly lastPositions = new Map<number, { x: number; y: number }>();

  private destroyed = false;
  private detachInput: (() => void) | null = null;

  constructor(callbacks: RendererCallbacks) {
    this.callbacks = callbacks;
  }

  async init(host: HTMLElement): Promise<void> {
    await this.app.init({
      background: UI.background,
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
    // hide behind your own Bastion.
    this.world.addChild(
      this.terrainLayer,
      this.groundLayer,
      this.nodeLayer,
      this.ringLayer,
      this.structureSpriteLayer,
      this.structureLayer,
      this.contactLayer,
      this.unitSpriteLayer,
      this.unitLayer
    );
    this.hud.addChild(
      this.hudGraphics,
      this.ribbonGraphics,
      this.minimapTerrainG,
      this.minimapOverlayG,
      this.infoGraphics,
      this.barGraphics
    );
    this.app.stage.addChild(this.world, this.hud);

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

    this.hud.addChild(
      this.sigLabel,
      this.bandLabel,
      this.exposureLabel,
      this.mapLabel,
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
      ...this.ribbonLabels
    );
  }

  // --- Input ---------------------------------------------------------------

  private screenToWorld(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.app.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left - this.world.x) / this.world.scale.x,
      y: (clientY - rect.top - this.world.y) / this.world.scale.y,
    };
  }

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

    const zoomAbout = (clientX: number, clientY: number, factor: number) => {
      const next = Math.min(4, Math.max(0.05, this.world.scale.x * factor));
      // Zoom about the cursor/pinch centre rather than the origin.
      const before = this.screenToWorld(clientX, clientY);
      this.world.scale.set(next);
      const after = this.screenToWorld(clientX, clientY);
      this.world.x += (after.x - before.x) * next;
      this.world.y += (after.y - before.y) * next;
    };

    /** True while a press is scrubbing the sonar scope. */
    let minimapDrag = false;

    const onPointerDown = (e: PointerEvent) => {
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

      const world = this.screenToWorld(e.clientX, e.clientY);

      if (e.button === 1) {
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        capture(e.pointerId);
        return;
      }

      if (e.button === 2) {
        // Shift queues the order behind whatever the unit is already doing.
        this.handleContextOrder(world.x, world.y, e.shiftKey);
        return;
      }

      // Left click while a build is pending: place it. The server rejects
      // illegal sites; the client does not pre-simulate placement rules.
      if (this.pendingBuild !== null) {
        this.callbacks.onBuild(this.pendingBuild, world.x, world.y);
        this.pendingBuild = null;
        return;
      }

      // Left button starts a marquee. Whether it *is* one is decided on
      // release: under the slop threshold it was a click, and clicking is
      // still how you pick a single hull out of a crowd.
      this.marquee = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY };
      capture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
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
          this.world.x += e.clientX - prev.x;
          this.world.y += e.clientY - prev.y;
        }

        prev.x = e.clientX;
        prev.y = e.clientY;

        if (touches.size === 2) {
          const [a, b] = [...touches.values()];
          const distance = Math.hypot(a!.x - b!.x, a!.y - b!.y);
          if (pinchDistance > 0 && distance > 0) {
            zoomAbout((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, distance / pinchDistance);
          }
          pinchDistance = distance;
        }
        return;
      }

      if (!panning) return;
      this.world.x += e.clientX - lastX;
      this.world.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
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
        if (wasTap) {
          const world = this.screenToWorld(e.clientX, e.clientY);
          this.handleTap(world.x, world.y);
        }
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
      zoomAbout(e.clientX, e.clientY, e.deltaY < 0 ? 1.1 : 1 / 1.1);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        this.pendingBuild = null;
        return;
      }
      const buildKind = BUILD_KEYS[e.code];
      if (buildKind !== undefined) {
        this.pendingBuild = buildKind;
        return;
      }
      // B arms the faction's signature structure, when its navy has one —
      // the kind depends on who is playing, so it cannot live in BUILD_KEYS.
      if (e.code === 'KeyB') {
        const signature = FACTION_STRUCTURE[this.faction];
        if (signature !== undefined) {
          this.pendingBuild = signature;
          return;
        }
      }
      // Digits are control groups (docs/ui-ux.md §9), Ctrl to assign. They
      // used to produce units; production keeps its command-bar buttons, and
      // the doc's binding wins because control groups have no alternative
      // route while production does.
      const digit = DIGIT_KEYS[e.code];
      if (digit !== undefined) {
        this.controlGroup(digit, e.ctrlKey || e.metaKey);
        return;
      }

      if (this.selected.size === 0) return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.commandToggleSilent();
      } else if (e.code === 'KeyP') {
        this.commandPing();
      } else if (e.code === 'KeyV') {
        this.commandCycleThrottle();
      } else if (e.code === 'KeyD') {
        // D dives, A ascends. Mnemonic beats convention here: the camera is on
        // the middle mouse button and the wheel, so WASD is not spoken for.
        this.commandDepthStep(1);
      } else if (e.code === 'KeyA') {
        this.commandDepthStep(-1);
      } else if (e.code === 'AltLeft' || e.code === 'AltRight') {
        // Hold Alt to preview what a ping would cost you. This lived on Shift
        // until Shift was needed for order queueing, which is the more
        // frequent action and the one the RTS convention expects there.
        e.preventDefault();
        this.previewPing = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'AltLeft' || e.code === 'AltRight') this.previewPing = false;
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

      const world = this.screenToWorld(box.x0, box.y0);
      const hit = this.nearestOwnEntity(world.x, world.y);

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
    // selection makes the command panel meaningless.
    const inside: number[] = [];
    for (const unit of this.units) {
      const screen = this.worldToScreen(unit.x, unit.y);
      if (
        screen.x >= rect.left &&
        screen.x <= rect.right &&
        screen.y >= rect.top &&
        screen.y <= rect.bottom
      ) {
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

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.world.scale.x + this.world.x,
      y: y * this.world.scale.y + this.world.y,
    };
  }

  private unitsOnScreen(): OwnUnit[] {
    const width = this.app.screen.width;
    const height = this.app.screen.height;
    return this.units.filter((unit) => {
      const s = this.worldToScreen(unit.x, unit.y);
      return s.x >= 0 && s.x <= width && s.y >= 0 && s.y <= height;
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
    const scale = this.world.scale.x;
    this.world.x = this.app.screen.width / 2 - (sx / n) * scale;
    this.world.y = this.app.screen.height / 2 - (sy / n) * scale;
  }

  // --- Command bar ----------------------------------------------------------

  /**
   * Run the button under a screen point, if any. Returns true when the press
   * was consumed, so world input never fires through the bar.
   */
  private pressBarButton(clientX: number, clientY: number): boolean {
    const rect = this.app.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    if (y < this.app.screen.height - BAR_HEIGHT) return false;
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
    const size = this.app.screen.width < 700 ? 110 : 170;
    return { x: 10, y: this.app.screen.height - BAR_HEIGHT - size - 10, size };
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
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const { x, y, size } = this.minimapRect();
    if (px < x || px > x + size || py < y || py > y + size) return false;
    const k = this.minimapScale(size);
    if (k <= 0) return true;
    const worldX = (px - x) / k;
    const worldY = (py - y) / k;
    const scale = this.world.scale.x;
    this.world.x = this.app.screen.width / 2 - worldX * scale;
    this.world.y = this.app.screen.height / 2 - worldY * scale;
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

    if (this.activeTab === 'units') {
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
    } else if (this.activeTab === 'squad') {
      const units = this.selectedUnits();
      const first = units[0];
      buttons.push({
        label: 'SILENT',
        enabled: units.length > 0,
        active: first?.silentRunning ?? false,
        action: () => this.commandToggleSilent(),
      });
      buttons.push({
        label: 'PING',
        enabled: units.length > 0,
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

    const screenWidth = this.app.screen.width;
    const barY = this.app.screen.height - BAR_HEIGHT;
    g.rect(0, barY, screenWidth, BAR_HEIGHT).fill({ color: UI.glass, alpha: 0.92 });
    g.rect(0, barY, screenWidth, 1).fill({ color: UI.glassStroke });

    // Tab strip. 'squad' only exists while units are selected.
    const tabs: CommandTab[] =
      this.selectedUnits().length > 0 ? ['build', 'units', 'squad'] : ['build', 'units'];
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
        active: this.activeTab === tab,
        action: () => {
          this.activeTab = tab;
        },
      });
      tabX += w + 4;
    }

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
    const units = this.selectedUnits();
    if (units.length > 0) this.callbacks.onPing(units[0]!.id);
    this.previewPing = false;
  }

  /** Cycle the harvest throttle: how loud am I willing to be paid. */
  /**
   * The depth a step in `direction` would take the selection to (+1 deeper,
   * -1 shallower), or null when the whole selection is already at the end of
   * the stack. Orders step band to band; see BAND_STATION_DEPTH_M.
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
    const band = depthBandFor(reference);
    const next = band + direction;
    if (next < DepthBand.Shelf || next > DepthBand.Abyssal) return null;
    return BAND_STATION_DEPTH_M[next as DepthBand];
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
  private handleTap(x: number, y: number): void {
    if (this.pendingBuild !== null) {
      this.callbacks.onBuild(this.pendingBuild, x, y);
      this.pendingBuild = null;
      return;
    }
    const hit = this.nearestOwnEntity(x, y);
    if (hit !== null) {
      this.selected.clear();
      this.selected.add(hit);
      this.onSelectionChanged();
      return;
    }
    if (this.selected.size > 0) this.handleContextOrder(x, y, false);
  }

  /**
   * Right click is the classic RTS context order: a nodule field sends
   * harvesters to work, a heard contact is an attack order, open water is a
   * move. The server re-validates everything; this is only intent.
   */
  private handleContextOrder(x: number, y: number, queued = false): void {
    if (this.selected.size === 0) return;
    const selectedUnits = this.units.filter((u) => this.selected.has(u.id));
    const unitIds = selectedUnits.map((u) => u.id);

    const node = this.nearestNode(x, y);
    const harvesterIds = selectedUnits.filter((u) => u.throttle !== undefined).map((u) => u.id);
    if (node !== null && harvesterIds.length > 0) {
      this.callbacks.onHarvestOrder(harvesterIds, node.id, queued);
      // Everything else in the selection escorts the harvesters.
      const rest = unitIds.filter((id) => !harvesterIds.includes(id));
      if (rest.length > 0) this.callbacks.onMoveOrder(rest, x, y, queued);
      return;
    }

    const contact = this.nearestContact(x, y);
    if (contact !== null && unitIds.length > 0) {
      this.callbacks.onAttackOrder(unitIds, contact.id, queued);
      return;
    }

    if (unitIds.length > 0) this.callbacks.onMoveOrder(unitIds, x, y, queued);
  }

  private nearestNode(x: number, y: number): ResourceNodeInfo | null {
    let best: ResourceNodeInfo | null = null;
    let bestDistance = TARGET_RADIUS_M;
    for (const node of this.nodes) {
      const distance = Math.hypot(node.x - x, node.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = node;
      }
    }
    return best;
  }

  private nearestContact(x: number, y: number): Contact | null {
    let best: Contact | null = null;
    let bestDistance = TARGET_RADIUS_M;
    for (const { contact } of this.tracked.values()) {
      // A Tier-1 smudge has no usable position to click on.
      if (contact.tier < ResolutionTier.Bearing) continue;
      const distance = Math.hypot(contact.x - x, contact.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = contact;
      }
    }
    return best;
  }

  /** Nearest own unit or structure id, for selection. */
  private nearestOwnEntity(x: number, y: number): number | null {
    let best: number | null = null;
    let bestDistance = SELECT_RADIUS_M;
    for (const unit of this.units) {
      const distance = Math.hypot(unit.x - x, unit.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = unit.id;
      }
    }
    for (const structure of this.structures) {
      const reach = structureStatsFor(structure.kind).radiusM + 40;
      const distance = Math.hypot(structure.x - x, structure.y - y);
      if (distance < Math.max(bestDistance, reach) && distance < reach) {
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
    this.mapLabel.visible = true;
    // Hazard sites are baked into the terrain layer alongside the biomes,
    // because that is what they are: ground you can read before you enter it.
    this.drawTerrain();
    this.minimapCachedSize = 0;
  }

  setTerrain(terrain: TerrainPayload): void {
    this.terrain = terrain;
    this.drawTerrain();
    this.fitCamera();
    this.minimapCachedSize = 0;
  }

  setNodes(nodes: ResourceNodeInfo[]): void {
    this.nodes = nodes;
    this.drawNodes();
    // Nodes are baked into the scope's cached terrain layer.
    this.minimapCachedSize = 0;
  }

  setGameOver(payload: GameOverPayload): void {
    this.gameOver = payload;
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
    this.units = [];
    this.structures = [];
    this.tracked.clear();
    this.selected.clear();
    this.controlGroups.clear();
    this.marks = [];
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

    // Track headings from motion; a stationary hull keeps its last bearing.
    for (const unit of snapshot.units) {
      const prev = this.lastPositions.get(unit.id);
      if (prev !== undefined) {
        const dx = unit.x - prev.x;
        const dy = unit.y - prev.y;
        if (Math.hypot(dx, dy) > 1) this.headings.set(unit.id, Math.atan2(dy, dx));
        prev.x = unit.x;
        prev.y = unit.y;
      } else {
        this.lastPositions.set(unit.id, { x: unit.x, y: unit.y });
      }
    }

    // First sight of our own force: open the camera on the base rather than
    // the whole map. fitCamera's map-fit letterboxes a portrait phone into an
    // unreadable band; a commander starts at home in any case.
    if (!this.cameraCentered && (this.units.length > 0 || this.structures.length > 0)) {
      this.cameraCentered = true;
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
      // Show roughly 3.5 km across the smaller screen axis — the base and its
      // home field, with water enough to read approach vectors.
      const scale = Math.min(
        4,
        Math.max(0.05, Math.min(this.app.screen.width, this.app.screen.height) / 3500)
      );
      this.world.scale.set(scale);
      this.world.x = this.app.screen.width / 2 - (cx / count) * scale;
      this.world.y = this.app.screen.height / 2 - (cy / count) * scale;
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
    for (const id of this.lastPositions.keys()) {
      if (!alive.has(id)) {
        this.lastPositions.delete(id);
        this.headings.delete(id);
      }
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
          }
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
    const ear = {
      x: (this.app.screen.width / 2 - this.world.x) / this.world.scale.x,
      y: (this.app.screen.height / 2 - this.world.y) / this.world.scale.y,
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
    const scale = this.world.scale.x;
    this.world.x = this.app.screen.width / 2 - x * scale;
    this.world.y = this.app.screen.height / 2 - y * scale;
  }

  // --- Draw ----------------------------------------------------------------

  private drawTerrain(): void {
    const terrain = this.terrain;
    if (terrain === null) return;

    const g = this.terrainLayer;
    g.clear();

    // The map's own depth range, not the ruleset's: a shallow map should still
    // read as terrain rather than as one flat wash of near-black.
    let shallowest = Number.POSITIVE_INFINITY;
    let deepest = 0;
    for (let i = 0; i < terrain.floor.length; i++) {
      const f = terrain.floor[i]!;
      if (f < shallowest) shallowest = f;
      if (f > deepest) deepest = f;
    }

    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const index = row * terrain.cols + col;
        const biome = terrain.biomes[index] as Biome;
        const base = BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater];
        g.rect(col * terrain.cellM, row * terrain.cellM, terrain.cellM, terrain.cellM).fill({
          // Depth is luminance (docs/art-direction.md, "Reading the Sea Floor").
          // The hue stays the biome's, because hue is what sound is priced by.
          color: depthShade(base, terrain.floor[index]!, shallowest, deepest),
        });
      }
    }

    // Roofed passages, marked as routes rather than as openings.
    //
    // A tunnel is the one piece of terrain invisible from above by
    // construction, so drawing its mouth would say nothing — the line is what
    // a player needs. Public map data like the rest of the ground: everyone
    // can see the passage is there, nobody can see who is inside it.
    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        if (terrain.ceiling[row * terrain.cols + col]! === 0) continue;
        const x = col * terrain.cellM;
        const y = row * terrain.cellM;
        g.moveTo(x, y + terrain.cellM / 2)
          .lineTo(x + terrain.cellM, y + terrain.cellM / 2)
          .stroke({ width: 2, color: UI.accent, alpha: 0.22 });
      }
    }

    // Hazard sites, telegraphed. docs/maps.md's core principles list "hazard
    // telegraphing — players must see danger before entering", and drawing
    // them into the static terrain layer is how that promise is kept: a
    // hazard is part of the ground, visible from the moment the map loads,
    // not something that announces itself once you are inside it.
    //
    // Drawn as a hatched ring rather than a filled disc: they carry no
    // behaviour yet (the hazard framework is separate work), and a solid
    // marker would imply an effect that does not exist.
    for (const site of this.map?.hazards ?? []) {
      // Simulated hazards are drawn live, with a phase and a countdown. Only
      // the inert ones belong in the static layer, as ground that is merely
      // marked dangerous.
      if (site.simulated) continue;
      g.circle(site.x, site.y, site.radiusM).stroke({
        width: 3,
        color: UI.threat,
        alpha: 0.28,
      });
      const step = Math.max(60, site.radiusM / 4);
      for (let offset = -site.radiusM; offset <= site.radiusM; offset += step) {
        // Chord length at this offset, so the hatching stays inside the ring.
        const half = Math.sqrt(Math.max(0, site.radiusM * site.radiusM - offset * offset));
        g.moveTo(site.x + offset - half, site.y + offset + half)
          .lineTo(site.x + offset + half, site.y + offset - half)
          .stroke({ width: 1.5, color: UI.threat, alpha: 0.12 });
      }
    }

    // Map border, so the playable area has an edge you can see.
    g.rect(0, 0, terrain.cols * terrain.cellM, terrain.rows * terrain.cellM).stroke({
      width: 4,
      color: UI.glassStroke,
      alpha: 0.6,
    });
  }

  private fitCamera(): void {
    const terrain = this.terrain;
    if (terrain === null) return;
    const widthM = terrain.cols * terrain.cellM;
    const heightM = terrain.rows * terrain.cellM;
    const scale = Math.min(this.app.screen.width / widthM, this.app.screen.height / heightM) * 0.9;
    this.world.scale.set(scale);
    this.world.x = (this.app.screen.width - widthM * scale) / 2;
    this.world.y = (this.app.screen.height - heightM * scale) / 2;
  }

  private draw(): void {
    this.drawBlockedGround();
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

    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const index = row * terrain.cols + col;
        if (depth >= terrain.ceiling[index]! && depth <= terrain.floor[index]!) continue;
        const x = col * terrain.cellM;
        const y = row * terrain.cellM;
        // Hatched rather than filled: a solid block would bury the biome
        // underneath it, and the biome is what the player reads sound by.
        // Terrain must stay quieter than contacts.
        g.rect(x, y, terrain.cellM, terrain.cellM).fill({ color: UI.accent, alpha: 0.07 });
        g.moveTo(x, y + terrain.cellM)
          .lineTo(x + terrain.cellM, y)
          .stroke({ width: 1, color: UI.accent, alpha: 0.16 });
      }
    }
  }

  /**
   * Nodule fields — public survey-chart data, drawn once. Deliberately dim:
   * they are geography, not intel.
   */
  private drawNodes(): void {
    const g = this.nodeLayer;
    g.clear();
    for (const node of this.nodes) {
      const crystal = node.kind === ResourceKind.ResonanceCrystal;
      const color = RESOURCE_COLOR[node.kind];
      const radius = 60 + (node.initialAmount / 3000) * 40;
      g.circle(node.x, node.y, radius).fill({ color, alpha: 0.1 });
      g.circle(node.x, node.y, radius).stroke({ width: 2, color, alpha: 0.3 });
      // A scatter of ore, deterministic per node so the map is stable.
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + node.id;
        const r = radius * 0.55 * (0.4 + ((i * 37 + node.id * 13) % 10) / 16);
        g.circle(node.x + Math.cos(angle) * r, node.y + Math.sin(angle) * r, 6).fill({
          color,
          alpha: 0.45,
        });
      }
      // A field you cannot reach without diving reads as a depth, not just a
      // colour: the dashed ring says "this is somewhere else vertically".
      if (crystal) {
        const dashes = 24;
        for (let i = 0; i < dashes; i += 2) {
          const a0 = (i / dashes) * Math.PI * 2;
          const a1 = ((i + 1) / dashes) * Math.PI * 2;
          g.moveTo(node.x + Math.cos(a0) * (radius + 14), node.y + Math.sin(a0) * (radius + 14))
            .arc(node.x, node.y, radius + 14, a0, a1)
            .stroke({ width: 2, color, alpha: 0.55 });
        }
      }
    }
  }

  /**
   * Keep one baked sprite per own COMPLETED structure in sync. Construction
   * sites never get a sprite — a half-built structure is schematic, and the
   * scaffold rendering says so. Returns true when the sprite is showing.
   */
  private syncStructureSprite(structure: OwnStructure): boolean {
    const texture = structureTexture(structure.kind, this.faction);
    if (texture === null) return false;

    let sprite = this.structureSprites.get(structure.id);
    if (sprite === undefined) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      this.structureSprites.set(structure.id, sprite);
      this.structureSpriteLayer.addChild(sprite);
    }
    if (sprite.texture !== texture) {
      sprite.texture = texture;
      const size = structureSpriteSizeM(structure.kind, this.faction);
      sprite.width = size.widthM;
      sprite.height = size.heightM;
    }
    sprite.position.set(structure.x, structure.y);
    return true;
  }

  private drawStructures(): void {
    const g = this.structureLayer;
    g.clear();
    const inverseScale = 1 / this.world.scale.x;
    const palette = FACTION_PALETTE[this.faction];

    // Drop sprites for structures that are gone (or regressed to sites).
    for (const [id, sprite] of this.structureSprites) {
      const live = this.structures.find((s) => s.id === id);
      if (live === undefined || live.buildProgress < 1) {
        sprite.destroy();
        this.structureSprites.delete(id);
      }
    }

    for (const structure of this.structures) {
      const radius = structureStatsFor(structure.kind).radiusM;
      const isSelected = this.selected.has(structure.id);
      const building = structure.buildProgress < 1;
      // A construction site renders as scaffolding: dim fill, dashed feel.
      const alpha = building ? 0.35 : 0.9;

      if (isSelected) {
        g.circle(structure.x, structure.y, radius + 14).stroke({
          width: 2 * inverseScale,
          color: UI.text,
          alpha: 0.8,
        });
      }

      // Completed structures wear the baked, lit architecture; sites and the
      // pre-decode window stay on the vector scaffold.
      if (building || !this.syncStructureSprite(structure)) {
        drawStructureSilhouette(
          g,
          structure.kind,
          structure.x,
          structure.y,
          radius,
          { color: palette.primary, accent: palette.accent, alpha, detail: !building },
          2 * inverseScale
        );
      }

      // The structure's own loudness ring, same language as units.
      g.circle(structure.x, structure.y, radius + 10 + structure.sig * 0.35).stroke({
        width: 1 * inverseScale,
        color: sigColor(structure.sig),
        alpha: 0.25,
      });

      const barWidth = radius * 2;
      const barY = structure.y - radius - 14 * inverseScale;
      if (building) {
        g.rect(structure.x - radius, barY, barWidth, 6 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(
          structure.x - radius,
          barY,
          barWidth * structure.buildProgress,
          6 * inverseScale
        ).fill({ color: UI.sigMid });
      } else if (structure.queue.length > 0) {
        // Production progress plus how deep the queue runs.
        g.rect(structure.x - radius, barY, barWidth, 6 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(
          structure.x - radius,
          barY,
          barWidth * structure.queueProgress,
          6 * inverseScale
        ).fill({ color: UI.friendly });
      }

      if (structure.hp < structure.maxHp) {
        const hpY = structure.y + radius + 8 * inverseScale;
        const fraction = Math.max(0, structure.hp / structure.maxHp);
        g.rect(structure.x - radius, hpY, barWidth, 4 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(structure.x - radius, hpY, barWidth * fraction, 4 * inverseScale).fill({
          color: UI.friendly,
        });
      }
    }
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
      const pf = this.propagationAt(unit.x, unit.y);
      const range = maxAudibleRangeM(unit.sig, pf, PROPAGATION_MODEL.BASELINE_HYD);

      g.circle(unit.x, unit.y, range).stroke({
        width: 2 / this.world.scale.x,
        color: sigColor(unit.sig),
        alpha: 0.35,
      });

      // Hold shift to see exactly how badly a ping would expose you.
      if (this.previewPing) {
        g.circle(unit.x, unit.y, ACTIVE_SONAR.REVEAL_RADIUS_M).stroke({
          width: 2 / this.world.scale.x,
          color: UI.friendly,
          alpha: 0.5,
        });
        g.circle(unit.x, unit.y, ACTIVE_SONAR.SELF_REVEAL_RADIUS_M).stroke({
          width: 3 / this.world.scale.x,
          color: UI.threat,
          alpha: 0.8,
        });
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
  private drawHazards(g: Graphics, inverseScale: number): void {
    for (const hazard of this.hazards) {
      const style = HAZARD_STYLE[hazard.phase];
      const color = hazard.kind === 'resonance-storm' ? UI.accent : UI.threat;

      g.circle(hazard.x, hazard.y, hazard.radiusM).stroke({
        width: style.width * inverseScale,
        color,
        alpha: style.alpha,
      });

      if (hazard.phase === HazardPhase.Warning) {
        // The countdown: a second ring closing on the first. When they meet,
        // it fires. Nothing else on screen behaves like this, so it does not
        // have to be learned twice.
        const closing = hazard.radiusM * (1.9 - 0.9 * hazard.progress);
        g.circle(hazard.x, hazard.y, closing).stroke({
          width: 2 * inverseScale,
          color,
          alpha: 0.35 + hazard.progress * 0.5,
        });
      }

      if (hazard.phase === HazardPhase.Active || hazard.phase === HazardPhase.Decay) {
        const heat = hazard.phase === HazardPhase.Active ? 1 : 1 - hazard.progress;
        g.circle(hazard.x, hazard.y, hazard.radiusM).fill({ color, alpha: 0.18 * heat });
        for (let ring = 1; ring <= 3; ring++) {
          g.circle(hazard.x, hazard.y, hazard.radiusM * (ring / 3)).stroke({
            width: 1.5 * inverseScale,
            color,
            alpha: 0.3 * heat,
          });
        }
      }
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
  private drawEchoMarks(g: Graphics, inverseScale: number): void {
    for (const mark of this.marks) {
      const style = MARK_STYLE[mark.kind];
      if (style === undefined) continue;
      const radius = style.radiusM * (0.55 + mark.intensity * 0.45);

      // Three soft rings rather than a disc: residue has no edge, and a disc
      // at any alpha reads as an object sitting on the seabed.
      for (let ring = 0; ring < 3; ring++) {
        const t = (ring + 1) / 3;
        g.circle(mark.x, mark.y, radius * t).fill({
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
        g.moveTo(mark.x + Math.cos(a0) * radius, mark.y + Math.sin(a0) * radius)
          .lineTo(mark.x + Math.cos(a1) * radius, mark.y + Math.sin(a1) * radius)
          .stroke({
            width: 1 * inverseScale,
            color: style.color,
            alpha: mark.intensity * 0.5,
          });
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
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    for (let i = this.exposureFlashes.length - 1; i >= 0; i--) {
      const flash = this.exposureFlashes[i]!;
      const t = (now - flash.atMs) / EXPOSURE_FLASH_MS;
      if (t >= 1) {
        this.exposureFlashes.splice(i, 1);
        continue;
      }

      // Hard on arrival, then a long decay — the shape of the sound.
      const alpha = Math.pow(1 - t, 2) * 0.55;
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
  private drawBreakSilence(g: Graphics, inverseScale: number): void {
    const now = performance.now();
    for (const [id, at] of this.brokeSilence) {
      const t = (now - at) / BREAK_SILENCE_FLASH_MS;
      if (t >= 1) {
        this.brokeSilence.delete(id);
        continue;
      }
      const unit = this.units.find((u) => u.id === id);
      if (unit === undefined) {
        this.brokeSilence.delete(id);
        continue;
      }
      // Expanding outward, unlike the lock brackets which close in: this is
      // noise leaving the hull, and it should read that way.
      const radius = HULL_LENGTH_M[unit.kind] * (1 + t * 3);
      g.circle(unit.x, unit.y, radius).stroke({
        width: 2 * inverseScale,
        color: UI.threat,
        alpha: (1 - t) * 0.8,
      });
    }
  }

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
    const hull = contact.kind !== undefined ? HULL_LENGTH_M[contact.kind] : 140;
    const spread = hull * (2.2 - 1.2 * t);
    const arm = hull * 0.5;
    const alpha = 1 - t;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        const cx = contact.x + sx * spread;
        const cy = contact.y + sy * spread;
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
    const inverseScale = 1 / this.world.scale.x;
    this.drawHazards(g, inverseScale);
    this.drawEchoMarks(g, inverseScale);
    this.drawBreakSilence(g, inverseScale);

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

      // Ghosts fade rather than vanish; a stale contact is still information,
      // just less of it.
      const freshness = 1 - age / decayMs;
      // ...and a *new* mark fades in, which is the Precedence Law's budget
      // rather than a flourish: a mark that pops instantly races the audio
      // device's own output latency and will sometimes win (§2). The two
      // curves compose — one contact fading out while another fades in is
      // exactly what the player should see.
      const arrival = markOpacity(now - entry.firstSeenMs, WORLD_FADE_MS.start, WORLD_FADE_MS.full);
      const alpha = style.alpha * freshness * arrival;

      this.drawLockFlash(g, id, contact, now, inverseScale);

      switch (contact.tier) {
        case ResolutionTier.Contact: {
          // Directionless: a soft haze around the listener that heard it.
          // No position information is available, and none is implied.
          g.circle(contact.x, contact.y, style.radius).fill({
            color: style.color,
            alpha: alpha * 0.5,
          });
          g.circle(contact.x, contact.y, style.radius).stroke({
            width: 1 * inverseScale,
            color: style.color,
            alpha,
          });
          break;
        }
        case ResolutionTier.Bearing: {
          // Blurred blob at a position already wrong by ~15% server-side.
          g.circle(contact.x, contact.y, style.radius).fill({ color: style.color, alpha });
          break;
        }
        case ResolutionTier.Classification: {
          const color = this.contactColor(contact, style.color);
          if (contact.fauna !== undefined) {
            drawFaunaSilhouette(g, contact.fauna, contact.x, contact.y, alpha, inverseScale);
            break;
          }
          g.circle(contact.x, contact.y, style.radius).fill({ color, alpha });
          g.circle(contact.x, contact.y, style.radius * 1.6).stroke({
            width: 1 * inverseScale,
            color,
            alpha: alpha * 0.6,
          });
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
              g,
              contact.kind,
              contact.faction,
              contact.x,
              contact.y,
              contact.heading ?? 0,
              { color, accent: UI.threat, alpha, detail: false },
              2 * inverseScale
            );
          } else if (contact.structure !== undefined) {
            drawStructureSilhouette(
              g,
              contact.structure,
              contact.x,
              contact.y,
              structureStatsFor(contact.structure).radiusM,
              { color, accent: UI.threat, alpha, detail: false },
              2 * inverseScale
            );
          } else if (contact.fauna !== undefined) {
            drawFaunaSilhouette(g, contact.fauna, contact.x, contact.y, alpha, inverseScale);
          } else {
            g.circle(contact.x, contact.y, style.radius).fill({ color, alpha });
          }

          if (contact.hp !== undefined && contact.maxHp !== undefined && contact.maxHp > 0) {
            const width = style.radius * 3;
            const fraction = Math.max(0, Math.min(1, contact.hp / contact.maxHp));
            const barY = contact.y - style.radius * 2.4;
            g.rect(contact.x - width / 2, barY, width, 3 * inverseScale).fill({
              color: 0x000000,
              alpha: alpha * 0.6,
            });
            g.rect(contact.x - width / 2, barY, width * fraction, 3 * inverseScale).fill({
              color,
              alpha,
            });
          }
          break;
        }
      }
    }
  }

  /** Faction colour, but only once the tier is high enough to know it. */
  private contactColor(contact: Contact, fallback: number): number {
    if (contact.faction === undefined) return fallback;
    return FACTION_PALETTE[contact.faction]?.primary ?? fallback;
  }

  private headingFor(unit: OwnUnit): number {
    return this.headings.get(unit.id) ?? 0;
  }

  /**
   * Keep one hull sprite per own unit in sync with the snapshot. Returns true
   * when the sprite exists and is showing, so the caller can skip the vector
   * fallback for that unit.
   */
  private syncUnitSprite(unit: OwnUnit, alpha: number): boolean {
    const texture = hullTexture(unit.kind, this.faction);
    if (texture === null) return false;

    let sprite = this.unitSprites.get(unit.id);
    if (sprite === undefined) {
      sprite = new Sprite();
      sprite.anchor.set(0.5);
      this.unitSprites.set(unit.id, sprite);
      this.unitSpriteLayer.addChild(sprite);
    }
    if (sprite.texture !== texture) {
      sprite.texture = texture;
      // World units are metres; the bake reports its canvas size in metres.
      const size = hullSpriteSizeM(unit.kind, this.faction);
      sprite.width = size.widthM;
      sprite.height = size.heightM;
    }
    sprite.position.set(unit.x, unit.y);
    sprite.rotation = this.headingFor(unit);
    sprite.alpha = alpha;
    return true;
  }

  private drawUnits(): void {
    const g = this.unitLayer;
    g.clear();
    const inverseScale = 1 / this.world.scale.x;
    const palette = FACTION_PALETTE[this.faction];

    // Drop sprites for units that no longer exist.
    for (const [id, sprite] of this.unitSprites) {
      if (!this.units.some((u) => u.id === id)) {
        sprite.destroy();
        this.unitSprites.delete(id);
      }
    }

    for (const unit of this.units) {
      const radius = HULL_LENGTH_M[unit.kind] / 2;
      const isSelected = this.selected.has(unit.id);

      // Silent-running units render dimmed: quiet is a visible state, because
      // the player needs to know at a glance which of their units are blind
      // and toothless.
      const alpha = unit.silentRunning ? 0.45 : 1;

      if (isSelected) {
        g.circle(unit.x, unit.y, radius + 8).stroke({
          width: 2 * inverseScale,
          color: UI.text,
          alpha: 0.8,
        });
      }

      // Own force renders at full fidelity: the baked, lit, concept-art hull
      // (docs/art-direction.md "Rendering Target"); vectors until it decodes.
      if (!this.syncUnitSprite(unit, alpha)) {
        drawUnitSilhouette(
          g,
          unit.kind,
          this.faction,
          unit.x,
          unit.y,
          this.headingFor(unit),
          { color: palette.primary, accent: palette.accent, alpha, detail: true },
          1.5 * inverseScale
        );
      }

      // A small tick of the unit's own loudness, drawn on the unit itself.
      g.circle(unit.x, unit.y, radius + 6 + unit.sig * 0.35).stroke({
        width: 1 * inverseScale,
        color: sigColor(unit.sig),
        alpha: 0.25,
      });

      // Overreaching its rating is drawn on the hull itself, not only in the
      // selection card: a squad crushing at the bottom of a dive is something
      // the player must see without having clicked anything (docs/ui-ux.md §8).
      if (this.isCrushing(unit)) {
        g.circle(unit.x, unit.y, radius + 4).stroke({
          width: 2 * inverseScale,
          color: UI.threat,
          alpha: 0.9,
        });
      }

      if (unit.maxHp > 0 && unit.hp < unit.maxHp) {
        const width = radius * 2.4;
        const fraction = Math.max(0, unit.hp / unit.maxHp);
        const barY = unit.y - radius - 12 * inverseScale;
        const barX = unit.x - width / 2;
        g.rect(barX, barY, width, 3 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(barX, barY, width * fraction, 3 * inverseScale).fill({
          color: UI.friendly,
        });
        // The crushed stub, in threat red at the far end. Too small at map
        // scale for hatching to read, so the colour carries it here and the
        // texture carries it in the card.
        if (unit.crushDamage > 0) {
          const lost = Math.min(1, unit.crushDamage / unit.maxHp);
          g.rect(barX + width * (1 - lost), barY, width * lost, 3 * inverseScale).fill({
            color: UI.threat,
            alpha: 0.85,
          });
        }
      }
    }
  }

  /**
   * HUD. The SIG meter is a permanent element by design — "players must feel
   * their own loudness" (docs/art-direction.md).
   */
  private drawHud(): void {
    const g = this.hudGraphics;
    g.clear();

    const screenWidth = this.app.screen.width;

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
    const meterWidth = Math.min(120, screenWidth - meterX - 150);
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
    if (this.mapLabel.visible) {
      this.mapLabel.position.set(this.statusLabel.x - this.mapLabel.width - 16, 10);
    }

    // Hint line rides just above the command panel, clear of the scope.
    const scope = this.minimapRect();
    this.selectionLabel.text = this.hintLine();
    this.selectionLabel.position.set(
      scope.x + scope.size + 12,
      this.app.screen.height - BAR_HEIGHT - 20
    );

    if (this.gameOver !== null) {
      const won = this.gameOver.winnerSlot === this.slot;
      this.bannerLabel.text = won ? 'THE RIFT FALLS SILENT — VICTORY' : 'BASTION LOST — DEFEAT';
      this.bannerLabel.style.fill = won ? UI.friendly : UI.threat;
      this.bannerLabel.position.set(screenWidth / 2, this.app.screen.height / 2);
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
    if (Math.hypot(w, h) <= DRAG_SLOP_PX) return;
    g.rect(rect.left, rect.top, w, h).fill({ color: UI.accent, alpha: 0.06 });
    g.rect(rect.left, rect.top, w, h).stroke({ width: 1, color: UI.accent, alpha: 0.9 });
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
    const inverseScale = 1 / this.world.scale.x;

    for (const unit of this.units) {
      if (!this.selected.has(unit.id)) continue;
      const plan = unit.queuedOrders;
      if (plan === undefined || plan.length === 0) continue;

      let fromX = unit.x;
      let fromY = unit.y;
      for (const order of plan) {
        g.moveTo(fromX, fromY)
          .lineTo(order.x, order.y)
          .stroke({ width: 1.5 * inverseScale, color: UI.accent, alpha: 0.45 });
        const marker = order.kind === 'move' ? 7 : 11;
        g.circle(order.x, order.y, marker * inverseScale).stroke({
          width: 1.5 * inverseScale,
          color: order.kind === 'attack' ? UI.threat : UI.accent,
          alpha: 0.8,
        });
        fromX = order.x;
        fromY = order.y;
      }
    }
  }

  /** Effective Pressure Rating: what the hull owns plus what it is renting. */
  private effectivePr(unit: OwnUnit): number {
    return statsFor(unit.kind).pressureRating + unit.pressureBonus;
  }

  /** True when the hull is deeper than its effective rating can survive. */
  private isCrushing(unit: OwnUnit): boolean {
    return requiredPressureRating(unit.depth) > this.effectivePr(unit);
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
   * While Shift is held it also previews the dive: the band a descent would
   * take the selection to, and what that descent would cost in SIG. Same
   * bargain as the ping preview — see the price before you pay it.
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
    g.rect(RIBBON_X, top, RIBBON_WIDTH, height).stroke({ width: 1, color: UI.glassStroke });

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
    if (this.previewPing) {
      const target = this.stepDepthTarget(selected, 1);
      if (target !== null) {
        const targetY = this.ribbonY(target, top, height);
        g.rect(RIBBON_X - 4, targetY - 2, RIBBON_WIDTH + 8, 4).fill({
          color: sigColor(DEPTH.DESCENT_SIG),
          alpha: 0.8,
        });
      }
    }

    const lead = selected[0]!;
    this.ribbonReadout.visible = true;
    this.ribbonReadout.text = this.previewPing
      ? `DIVE ${DEPTH.DESCENT_SIG} SIG`
      : `${lead.depth.toFixed(0)}m`;
    this.ribbonReadout.style.fill = this.previewPing
      ? sigColor(DEPTH.DESCENT_SIG)
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
          const biome = terrain.biomes[row * terrain.cols + col] as Biome;
          tg.rect(col * cell, row * cell, cell + 0.5, cell + 0.5).fill({
            color: BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater],
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
        PRECEDENCE_MS.MINIMAP_FADE_START,
        PRECEDENCE_MS.MINIMAP_FADE_FULL
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

    // The sweep. Cosmetic, and deliberately out of phase with the 5 Hz
    // detection tick (4 s a revolution) so that no player ever comes to
    // believe the sweep is what finds things.
    if (centre !== null) {
      const angle = ((performance.now() % SCOPE_SWEEP_MS) / SCOPE_SWEEP_MS) * Math.PI * 2;
      const reach = size;
      og.moveTo(centre.x * k, centre.y * k)
        .lineTo(centre.x * k + Math.cos(angle) * reach, centre.y * k + Math.sin(angle) * reach)
        .stroke({ width: 1, color: UI.accent, alpha: 0.22 });
    }

    // Camera viewport, so the scope doubles as a navigator. Clamped to the
    // scope's square — a zoomed-in camera would otherwise draw past its frame.
    const scale = this.world.scale.x;
    const viewX = Math.max(0, (-this.world.x / scale) * k);
    const viewY = Math.max(0, (-this.world.y / scale) * k);
    const viewR = Math.min(size, ((-this.world.x + this.app.screen.width) / scale) * k);
    const viewB = Math.min(size, ((-this.world.y + this.app.screen.height) / scale) * k);
    if (viewR > viewX && viewB > viewY) {
      og.rect(viewX, viewY, viewR - viewX, viewB - viewY).stroke({
        width: 1,
        color: UI.text,
        alpha: 0.6,
      });
    }
  }

  /** Selected-entity readout, wide screens only; phones keep the hint line. */
  private drawInfoPanel(): void {
    const g = this.infoGraphics;
    g.clear();
    const wide = this.app.screen.width >= 900;
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
    const x = this.app.screen.width - w - 10;
    const y = this.app.screen.height - BAR_HEIGHT - h - 10;
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
    // Crush is the one wound no repair will ever close, so it is drawn as a
    // hatched stub at the far end of the bar rather than as absent hull: the
    // permanence is visible now instead of discovered later (docs/ui-ux.md §8).
    if (unit !== undefined && unit.crushDamage > 0) {
      this.hatch(
        g,
        barX + barW * Math.max(0, 1 - unit.crushDamage / unit.maxHp),
        barY,
        barW * Math.min(1, unit.crushDamage / unit.maxHp),
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
      const base = statsFor(unit.kind).pressureRating;
      const crushing = this.isCrushing(unit);
      const badgeW = 44;
      const badgeH = 16;
      const badgeX = x + w - badgeW - 12;
      const badgeY = y + 8;
      // Under-rated inverts *and pulses* (docs/ui-ux.md §8): filled in threat
      // red rather than outlined, and breathing, because a hull losing
      // unrecoverable tonnage should not sit as still on screen as a healthy
      // one. Driven off wall-clock — this is presentation, never simulation.
      if (crushing) {
        const pulse = 0.62 + 0.3 * (0.5 + 0.5 * Math.sin(performance.now() / 260));
        g.roundRect(badgeX, badgeY, badgeW, badgeH, 3).fill({ color: UI.threat, alpha: pulse });
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
    // Touch players get gesture words; everything else is on the bar.
    if (this.pendingBuild !== null) {
      const stats = structureStatsFor(this.pendingBuild);
      return this.isTouch
        ? `placing ${stats.name} (${stats.cost})  ·  tap to place`
        : `placing ${stats.name} (${stats.cost})  ·  LMB place  ·  ESC cancel`;
    }
    if (this.selected.size === 0) {
      return this.isTouch
        ? 'tap select  ·  drag pan  ·  pinch zoom'
        : 'LMB drag select  ·  MMB pan  ·  R/F/T/B build  ·  1-9 groups  ·  wheel zoom';
    }
    const structure = this.structures.find((s) => this.selected.has(s.id));
    if (structure !== undefined) {
      const queue = structure.queue.length > 0 ? `  ·  queue ${structure.queue.length}` : '';
      const name = structureStatsFor(structure.kind).name;
      return this.isTouch
        ? `${name}${queue}`
        : `${name}${queue}  ·  UNITS tab to produce  ·  R/F/T/B build`;
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
      : `${this.selected.size} selected  ·  RMB move (SHIFT queue)  ·  SPACE silent  ·  P ping  ·  D dive  ·  A rise  ·  CTRL+1-9 group`;
  }

  destroy(): void {
    this.destroyed = true;
    this.detachInput?.();
    this.detachInput = null;
    this.tracked.clear();
    this.unitSprites.clear();
    this.structureSprites.clear();
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
