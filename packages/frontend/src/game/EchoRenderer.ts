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
  StructureKind,
  UnitKind,
  depthBandFor,
  maxAudibleRangeM,
  requiredPressureRating,
  statsFor,
  structureStatsFor,
  FACTION_STRUCTURE,
  type Contact,
  type EchoSnapshot,
  type GameOverPayload,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import {
  BIOME_COLOR,
  FACTION_PALETTE,
  RESOURCE_COLOR,
  TIER_STYLE,
  UI,
  sigColor,
} from './palette.ts';
import { drawStructureSilhouette, drawUnitSilhouette, HULL_LENGTH_M } from './silhouettes.ts';
import { destroyHullTextures, hullSpriteSizeM, hullTexture, loadHullArt } from './hullTextures.ts';
import {
  destroyStructureTextures,
  loadStructureArt,
  structureSpriteSizeM,
  structureTexture,
} from './structureTextures.ts';
import type { TerrainPayload } from '../net/GameClient.ts';

/** A contact plus when we last actually heard it, for ghost decay. */
interface TrackedContact {
  contact: Contact;
  lastSeenMs: number;
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

/** Build hotkeys: R refinery, F foundry, T turret. */
const BUILD_KEYS: Record<string, StructureKind> = {
  KeyR: StructureKind.Refinery,
  KeyF: StructureKind.Foundry,
  KeyT: StructureKind.SentinelTurret,
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
  private resourceLabel!: Text;
  private crystalLabel!: Text;
  private statusLabel!: Text;
  private selectionLabel!: Text;
  private bannerLabel!: Text;

  private readonly callbacks: RendererCallbacks;

  private terrain: TerrainPayload | null = null;
  private units: OwnUnit[] = [];
  private structures: OwnStructure[] = [];
  private nodes: ResourceNodeInfo[] = [];
  private readonly tracked = new Map<number, TrackedContact>();
  private selected = new Set<number>();
  private peakSig = 0;
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
      const roster = [StructureKind.Refinery, StructureKind.Foundry, StructureKind.SentinelTurret];
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

  applySnapshot(snapshot: EchoSnapshot): void {
    this.units = snapshot.units;
    this.structures = snapshot.structures;
    this.peakSig = snapshot.peakSig;
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
      this.tracked.set(contact.id, { contact, lastSeenMs: now });
    }

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

  // --- Draw ----------------------------------------------------------------

  private drawTerrain(): void {
    const terrain = this.terrain;
    if (terrain === null) return;

    const g = this.terrainLayer;
    g.clear();

    for (let row = 0; row < terrain.rows; row++) {
      for (let col = 0; col < terrain.cols; col++) {
        const biome = terrain.biomes[row * terrain.cols + col] as Biome;
        g.rect(col * terrain.cellM, row * terrain.cellM, terrain.cellM, terrain.cellM).fill({
          color: BIOME_COLOR[biome] ?? BIOME_COLOR[Biome.OpenWater],
        });
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
    this.drawRings();
    this.drawContacts();
    this.drawStructures();
    this.drawUnits();
    this.drawOrderPlans();
    this.drawHud();
    this.drawMarquee();
    this.drawDepthRibbon();
    this.drawCommandBar();
    this.drawMinimap();
    this.drawInfoPanel();
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

  private propagationAt(x: number, y: number): number {
    const terrain = this.terrain;
    if (terrain === null) return 1;
    const col = Math.min(terrain.cols - 1, Math.max(0, Math.floor(x / terrain.cellM)));
    const row = Math.min(terrain.rows - 1, Math.max(0, Math.floor(y / terrain.cellM)));
    const biome = terrain.biomes[row * terrain.cols + col] as Biome;
    return PROPAGATION_FACTOR[biome] ?? 1;
  }

  private drawContacts(): void {
    const g = this.contactLayer;
    g.clear();

    const now = performance.now();
    const decayMs = PERSISTENCE.GHOST_MARKER_DECAY_S * 1000;
    const inverseScale = 1 / this.world.scale.x;

    for (const [id, entry] of this.tracked) {
      const age = now - entry.lastSeenMs;
      if (age > decayMs) {
        // "A retreating enemy leaves a fading trail of last-known positions."
        this.tracked.delete(id);
        continue;
      }

      const contact = entry.contact;
      if (contact.tier === ResolutionTier.Silent) continue;

      const style = TIER_STYLE[contact.tier as Exclude<ResolutionTier, ResolutionTier.Silent>];
      if (style === undefined) continue;

      // Ghosts fade rather than vanish; a stale contact is still information,
      // just less of it.
      const freshness = 1 - age / decayMs;
      const alpha = style.alpha * freshness;

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

    const meterX =
      (showCrystal
        ? this.crystalLabel.x + this.crystalLabel.width
        : this.resourceLabel.x + this.resourceLabel.width) + 18;
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

    const contactCount = this.tracked.size;
    this.statusLabel.text =
      this.status === 'connected'
        ? `${contactCount} contact${contactCount === 1 ? '' : 's'}`
        : this.status;
    this.statusLabel.position.set(screenWidth - this.statusLabel.width - 12, 9);

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

    const palette = FACTION_PALETTE[this.faction];
    for (const structure of this.structures) {
      og.rect(structure.x * k - 2, structure.y * k - 2, 4, 4).fill({ color: palette.primary });
    }
    for (const unit of this.units) {
      og.circle(unit.x * k, unit.y * k, 1.5).fill({ color: palette.accent });
    }
    for (const { contact } of this.tracked.values()) {
      if (contact.tier === ResolutionTier.Silent) continue;
      const style = TIER_STYLE[contact.tier as Exclude<ResolutionTier, ResolutionTier.Silent>];
      if (style === undefined) continue;
      og.circle(contact.x * k, contact.y * k, contact.tier >= ResolutionTier.Track ? 2.5 : 2).fill({
        color: style.color,
        alpha: Math.max(0.5, style.alpha),
      });
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
