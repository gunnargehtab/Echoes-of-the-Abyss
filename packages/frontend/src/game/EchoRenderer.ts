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

import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  ACTIVE_SONAR,
  Biome,
  Faction,
  HarvestThrottle,
  PERSISTENCE,
  PRODUCIBLE,
  PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  ResolutionTier,
  StructureKind,
  UnitKind,
  maxAudibleRangeM,
  statsFor,
  structureStatsFor,
  type Contact,
  type EchoSnapshot,
  type GameOverPayload,
  type OwnStructure,
  type OwnUnit,
  type ResourceNodeInfo,
} from '@echoes/shared';
import { BIOME_COLOR, FACTION_PALETTE, TIER_STYLE, UI, sigColor } from './palette.ts';
import type { TerrainPayload } from '../net/GameClient.ts';

/** A contact plus when we last actually heard it, for ghost decay. */
interface TrackedContact {
  contact: Contact;
  lastSeenMs: number;
}

export interface RendererCallbacks {
  onMoveOrder(unitIds: number[], x: number, y: number): void;
  onToggleSilent(unitIds: number[], active: boolean): void;
  onPing(unitId: number): void;
  onAttackOrder(unitIds: number[], contactId: number): void;
  onHarvestOrder(unitIds: number[], nodeId: number): void;
  onThrottle(unitIds: number[], throttle: HarvestThrottle): void;
  onBuild(kind: StructureKind, x: number, y: number): void;
  onProduce(structureId: number, kind: UnitKind): void;
}

const SELECT_RADIUS_M = 140;
/** How close a right-click must land to a contact or node to mean it. */
const TARGET_RADIUS_M = 160;

/** Production hotkeys 1-5, in docs/units.md roster order. */
const PRODUCE_KEYS: Record<string, UnitKind> = {
  Digit1: UnitKind.LightScout,
  Digit2: UnitKind.Corvette,
  Digit3: UnitKind.Cruiser,
  Digit4: UnitKind.AbyssalSubmersible,
  Digit5: UnitKind.Harvester,
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
  private readonly infoGraphics = new Graphics();
  private infoName!: Text;
  private infoLine1!: Text;
  private infoLine2!: Text;

  private sigLabel!: Text;
  private resourceLabel!: Text;
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
  private status = 'connecting';
  private slot = 0;
  private faction: Faction = Faction.Bathyarch;
  private gameOver: GameOverPayload | null = null;

  /** True while the ping-cost preview is being shown. */
  private previewPing = false;
  /** Non-null while the next left-click places this structure. */
  private pendingBuild: StructureKind | null = null;
  /** Coarse pointer = phone/tablet: hints speak gestures, not keys. */
  private readonly isTouch =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  /** The camera opens on the player's own base exactly once. */
  private cameraCentered = false;

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

    this.world.addChild(
      this.terrainLayer,
      this.nodeLayer,
      this.ringLayer,
      this.contactLayer,
      this.structureLayer,
      this.unitLayer
    );
    this.hud.addChild(
      this.hudGraphics,
      this.minimapTerrainG,
      this.minimapOverlayG,
      this.infoGraphics,
      this.barGraphics
    );
    this.app.stage.addChild(this.world, this.hud);

    this.buildHudText();
    this.attachInput();

    this.app.ticker.add(() => this.draw());
  }

  private buildHudText(): void {
    const mono = { fontFamily: 'ui-monospace, Consolas, monospace', fill: UI.text };

    // Top strip, left to right: nodules, SIG meter + value, contacts/status.
    this.resourceLabel = new Text({ text: '', style: { ...mono, fontSize: 13 } });
    this.resourceLabel.position.set(12, 8);

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

    this.infoName = new Text({ text: '', style: { ...mono, fontSize: 13 } });
    this.infoLine1 = new Text({ text: '', style: { ...mono, fontSize: 12, fill: UI.textDim } });
    this.infoLine2 = new Text({ text: '', style: { ...mono, fontSize: 12, fill: UI.textDim } });

    this.hud.addChild(
      this.sigLabel,
      this.resourceLabel,
      this.statusLabel,
      this.selectionLabel,
      this.bannerLabel,
      this.infoName,
      this.infoLine1,
      this.infoLine2
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
        this.handleContextOrder(world.x, world.y);
        return;
      }

      // Left click while a build is pending: place it. The server rejects
      // illegal sites; the client does not pre-simulate placement rules.
      if (this.pendingBuild !== null) {
        this.callbacks.onBuild(this.pendingBuild, world.x, world.y);
        this.pendingBuild = null;
        return;
      }

      // Left click: select the nearest own unit or structure, or clear.
      const hit = this.nearestOwnEntity(world.x, world.y);
      if (hit === null) {
        if (!e.shiftKey) this.selected.clear();
      } else {
        if (!e.shiftKey) this.selected.clear();
        this.selected.add(hit);
      }
      this.onSelectionChanged();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (minimapDrag) {
        this.pressMinimap(e.clientX, e.clientY);
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
      if (this.selected.size === 0) return;

      const produceKind = PRODUCE_KEYS[e.code];
      if (produceKind !== undefined) {
        this.commandProduce(produceKind);
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        this.commandToggleSilent();
      } else if (e.code === 'KeyP') {
        this.commandPing();
      } else if (e.code === 'KeyV') {
        this.commandCycleThrottle();
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        // Hold shift to preview what a ping would cost you.
        this.previewPing = true;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.previewPing = false;
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
      for (const kind of [
        StructureKind.Refinery,
        StructureKind.Foundry,
        StructureKind.SentinelTurret,
      ]) {
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
      g.roundRect(button.x, button.y, button.w, button.h, 6).fill({
        color: button.active ? UI.glassStroke : 0x000000,
        alpha: alpha * (button.active ? 0.9 : 0.45),
      });
      g.roundRect(button.x, button.y, button.w, button.h, 6).stroke({
        width: 1,
        color: button.active ? UI.friendly : UI.glassStroke,
        alpha,
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
    if (this.selected.size > 0) this.handleContextOrder(x, y);
  }

  /**
   * Right click is the classic RTS context order: a nodule field sends
   * harvesters to work, a heard contact is an attack order, open water is a
   * move. The server re-validates everything; this is only intent.
   */
  private handleContextOrder(x: number, y: number): void {
    if (this.selected.size === 0) return;
    const selectedUnits = this.units.filter((u) => this.selected.has(u.id));
    const unitIds = selectedUnits.map((u) => u.id);

    const node = this.nearestNode(x, y);
    const harvesterIds = selectedUnits.filter((u) => u.throttle !== undefined).map((u) => u.id);
    if (node !== null && harvesterIds.length > 0) {
      this.callbacks.onHarvestOrder(harvesterIds, node.id);
      // Everything else in the selection escorts the harvesters.
      const rest = unitIds.filter((id) => !harvesterIds.includes(id));
      if (rest.length > 0) this.callbacks.onMoveOrder(rest, x, y);
      return;
    }

    const contact = this.nearestContact(x, y);
    if (contact !== null && unitIds.length > 0) {
      this.callbacks.onAttackOrder(unitIds, contact.id);
      return;
    }

    if (unitIds.length > 0) this.callbacks.onMoveOrder(unitIds, x, y);
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

    // Drop selections for entities that no longer exist.
    if (this.selected.size > 0) {
      const alive = new Set<number>();
      for (const unit of this.units) alive.add(unit.id);
      for (const structure of this.structures) alive.add(structure.id);
      for (const id of this.selected) {
        if (!alive.has(id)) this.selected.delete(id);
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
    this.drawHud();
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
      const radius = 60 + (node.initialAmount / 3000) * 40;
      g.circle(node.x, node.y, radius).fill({ color: 0xf2b233, alpha: 0.1 });
      g.circle(node.x, node.y, radius).stroke({ width: 2, color: 0xf2b233, alpha: 0.3 });
      // A scatter of nodules, deterministic per node so the map is stable.
      for (let i = 0; i < 7; i++) {
        const angle = (i / 7) * Math.PI * 2 + node.id;
        const r = radius * 0.55 * (0.4 + ((i * 37 + node.id * 13) % 10) / 16);
        g.circle(node.x + Math.cos(angle) * r, node.y + Math.sin(angle) * r, 6).fill({
          color: 0xf2b233,
          alpha: 0.45,
        });
      }
    }
  }

  private drawStructures(): void {
    const g = this.structureLayer;
    g.clear();
    const inverseScale = 1 / this.world.scale.x;
    const palette = FACTION_PALETTE[this.faction];

    for (const structure of this.structures) {
      const radius = structureStatsFor(structure.kind).radiusM;
      const isSelected = this.selected.has(structure.id);
      const building = structure.buildProgress < 1;
      // A construction site renders as scaffolding: dim fill, dashed feel.
      const alpha = building ? 0.35 : 0.9;

      g.rect(structure.x - radius, structure.y - radius, radius * 2, radius * 2).fill({
        color: palette.primary,
        alpha: alpha * 0.5,
      });
      g.rect(structure.x - radius, structure.y - radius, radius * 2, radius * 2).stroke({
        width: (isSelected ? 4 : 2) * inverseScale,
        color: isSelected ? UI.text : palette.accent,
        alpha,
      });

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
          g.circle(contact.x, contact.y, style.radius).fill({ color, alpha });

          if (contact.heading !== undefined) {
            const length = style.radius * 2.6;
            g.moveTo(contact.x, contact.y)
              .lineTo(
                contact.x + Math.cos(contact.heading) * length,
                contact.y + Math.sin(contact.heading) * length
              )
              .stroke({ width: 2 * inverseScale, color, alpha });
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

  private drawUnits(): void {
    const g = this.unitLayer;
    g.clear();
    const inverseScale = 1 / this.world.scale.x;
    const palette = FACTION_PALETTE[this.faction];

    for (const unit of this.units) {
      const stats = statsFor(unit.kind);
      const radius = 10 + stats.maxHp / 120;
      const isSelected = this.selected.has(unit.id);

      // Silent-running units render dimmed: quiet is a visible state, because
      // the player needs to know at a glance which of their units are blind
      // and toothless.
      const alpha = unit.silentRunning ? 0.45 : 1;

      g.circle(unit.x, unit.y, radius).fill({ color: palette.primary, alpha });
      g.circle(unit.x, unit.y, radius).stroke({
        width: (isSelected ? 3 : 1) * inverseScale,
        color: isSelected ? UI.text : palette.accent,
        alpha,
      });

      // A small tick of the unit's own loudness, drawn on the unit itself.
      g.circle(unit.x, unit.y, radius + 6 + unit.sig * 0.35).stroke({
        width: 1 * inverseScale,
        color: sigColor(unit.sig),
        alpha: 0.25,
      });

      if (unit.maxHp > 0 && unit.hp < unit.maxHp) {
        const width = radius * 3;
        const fraction = Math.max(0, unit.hp / unit.maxHp);
        const barY = unit.y - radius * 2.2;
        g.rect(unit.x - width / 2, barY, width, 3 * inverseScale).fill({
          color: 0x000000,
          alpha: 0.6,
        });
        g.rect(unit.x - width / 2, barY, width * fraction, 3 * inverseScale).fill({
          color: UI.friendly,
        });
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
    this.resourceLabel.style.fill = 0xf2b233;

    const meterX = this.resourceLabel.x + this.resourceLabel.width + 18;
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
        tg.circle(node.x * k, node.y * k, 2.5).fill({ color: 0xf2b233, alpha: 0.8 });
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

    this.infoLine1.visible = true;
    this.infoLine1.text = `HULL ${any.hp.toFixed(0)}/${any.maxHp.toFixed(0)}   SIG ${any.sig.toFixed(0)}`;
    this.infoLine1.position.set(x + 12, y + 48);

    this.infoLine2.visible = true;
    if (structure !== undefined) {
      this.infoLine2.text =
        structure.buildProgress < 1
          ? `constructing ${(structure.buildProgress * 100).toFixed(0)}%`
          : structure.queue.length > 0
            ? `producing · queue ${structure.queue.length}`
            : 'online';
    } else if (unit !== undefined && unit.throttle !== undefined) {
      this.infoLine2.text = `throttle ${THROTTLE_LABEL[unit.throttle]} · cargo ${unit.cargo?.toFixed(0) ?? 0}`;
    } else if (unit !== undefined) {
      this.infoLine2.text = unit.silentRunning ? 'SILENT RUNNING' : 'systems live';
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
        : 'LMB select  ·  MMB pan  ·  R/F/T build  ·  wheel zoom';
    }
    const structure = this.structures.find((s) => this.selected.has(s.id));
    if (structure !== undefined) {
      const queue = structure.queue.length > 0 ? `  ·  queue ${structure.queue.length}` : '';
      const name = structureStatsFor(structure.kind).name;
      return this.isTouch ? `${name}${queue}` : `${name}${queue}  ·  1-5 produce  ·  R/F/T build`;
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
      : `${this.selected.size} selected  ·  RMB attack/move  ·  SPACE silent  ·  P ping  ·  SHIFT preview`;
  }

  destroy(): void {
    this.destroyed = true;
    this.detachInput?.();
    this.detachInput = null;
    this.tracked.clear();
    // Pixi tears down the ticker, canvas and all child display objects.
    if (this.app.renderer !== null && this.app.renderer !== undefined) {
      this.app.destroy(true, { children: true });
    }
  }
}
