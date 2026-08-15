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
  PERSISTENCE,
  PROPAGATION_FACTOR,
  PROPAGATION_MODEL,
  ResolutionTier,
  maxAudibleRangeM,
  statsFor,
  type Contact,
  type EchoSnapshot,
  type OwnUnit,
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
}

const SELECT_RADIUS_M = 140;

export class EchoRenderer {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly terrainLayer = new Graphics();
  private readonly ringLayer = new Graphics();
  private readonly contactLayer = new Graphics();
  private readonly unitLayer = new Graphics();
  private readonly hud = new Container();
  private readonly hudGraphics = new Graphics();

  private sigLabel!: Text;
  private statusLabel!: Text;
  private selectionLabel!: Text;

  private readonly callbacks: RendererCallbacks;

  private terrain: TerrainPayload | null = null;
  private units: OwnUnit[] = [];
  private readonly tracked = new Map<number, TrackedContact>();
  private selected = new Set<number>();
  private peakSig = 0;
  private status = 'connecting';
  private faction: Faction = Faction.Bathyarch;

  /** True while the ping-cost preview is being shown. */
  private previewPing = false;

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

    this.world.addChild(this.terrainLayer, this.ringLayer, this.contactLayer, this.unitLayer);
    this.hud.addChild(this.hudGraphics);
    this.app.stage.addChild(this.world, this.hud);

    this.buildHudText();
    this.attachInput();

    this.app.ticker.add(() => this.draw());
  }

  private buildHudText(): void {
    const mono = { fontFamily: 'ui-monospace, Consolas, monospace', fill: UI.text };

    this.sigLabel = new Text({ text: 'SIG --', style: { ...mono, fontSize: 13 } });
    this.sigLabel.position.set(20, 22);

    this.statusLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 12, fill: UI.textDim },
    });
    this.statusLabel.position.set(20, 64);

    this.selectionLabel = new Text({
      text: '',
      style: { ...mono, fontSize: 12, fill: UI.textDim },
    });
    this.selectionLabel.position.set(20, 82);

    this.hud.addChild(this.sigLabel, this.statusLabel, this.selectionLabel);
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
    let panning = false;
    let lastX = 0;
    let lastY = 0;

    const onContextMenu = (e: Event) => e.preventDefault();

    const onPointerDown = (e: PointerEvent) => {
      const world = this.screenToWorld(e.clientX, e.clientY);

      if (e.button === 1) {
        panning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        return;
      }

      if (e.button === 2) {
        // Right click: move order for the current selection.
        if (this.selected.size > 0) {
          this.callbacks.onMoveOrder([...this.selected], world.x, world.y);
        }
        return;
      }

      // Left click: select the nearest own unit, or clear.
      const hit = this.nearestOwnUnit(world.x, world.y);
      if (hit === null) {
        if (!e.shiftKey) this.selected.clear();
        return;
      }
      if (!e.shiftKey) this.selected.clear();
      this.selected.add(hit.id);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!panning) return;
      this.world.x += e.clientX - lastX;
      this.world.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (panning && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      panning = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const next = Math.min(4, Math.max(0.05, this.world.scale.x * factor));
      // Zoom about the cursor rather than the origin.
      const before = this.screenToWorld(e.clientX, e.clientY);
      this.world.scale.set(next);
      const after = this.screenToWorld(e.clientX, e.clientY);
      this.world.x += (after.x - before.x) * next;
      this.world.y += (after.y - before.y) * next;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (this.selected.size === 0) return;
      const ids = [...this.selected];

      if (e.code === 'Space') {
        e.preventDefault();
        // Toggle based on the first selected unit's current state.
        const first = this.units.find((u) => u.id === ids[0]);
        this.callbacks.onToggleSilent(ids, !(first?.silentRunning ?? false));
      } else if (e.code === 'KeyP') {
        this.callbacks.onPing(ids[0]!);
        this.previewPing = false;
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
    canvas.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    this.detachInput = () => {
      canvas.removeEventListener('contextmenu', onContextMenu);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }

  private nearestOwnUnit(x: number, y: number): OwnUnit | null {
    let best: OwnUnit | null = null;
    let bestDistance = SELECT_RADIUS_M;
    for (const unit of this.units) {
      const distance = Math.hypot(unit.x - x, unit.y - y);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = unit;
      }
    }
    return best;
  }

  // --- State in ------------------------------------------------------------

  setStatus(status: string): void {
    this.status = status;
  }

  setFaction(faction: Faction): void {
    this.faction = faction;
  }

  setTerrain(terrain: TerrainPayload): void {
    this.terrain = terrain;
    this.drawTerrain();
    this.fitCamera();
  }

  applySnapshot(snapshot: EchoSnapshot): void {
    this.units = snapshot.units;
    this.peakSig = snapshot.peakSig;

    const now = performance.now();
    for (const contact of snapshot.contacts) {
      this.tracked.set(contact.id, { contact, lastSeenMs: now });
    }

    // Drop selections for units that no longer exist.
    if (this.selected.size > 0) {
      const alive = new Set(this.units.map((u) => u.id));
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
    this.drawUnits();
    this.drawHud();
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

    const meterX = 20;
    const meterY = 42;
    const meterWidth = 240;
    const meterHeight = 12;

    g.rect(meterX - 8, meterY - 30, meterWidth + 16, 100).fill({ color: UI.glass, alpha: 0.75 });
    g.rect(meterX - 8, meterY - 30, meterWidth + 16, 100).stroke({
      width: 1,
      color: UI.glassStroke,
      alpha: 0.8,
    });

    g.rect(meterX, meterY, meterWidth, meterHeight).fill({ color: 0x000000, alpha: 0.5 });
    const fraction = Math.max(0, Math.min(1, this.peakSig / 100));
    g.rect(meterX, meterY, meterWidth * fraction, meterHeight).fill({
      color: sigColor(this.peakSig),
    });
    g.rect(meterX, meterY, meterWidth, meterHeight).stroke({
      width: 1,
      color: UI.glassStroke,
    });

    this.sigLabel.text = `SIG ${this.peakSig.toFixed(0).padStart(3, ' ')} / 100`;
    this.sigLabel.style.fill = sigColor(this.peakSig);

    const contactCount = this.tracked.size;
    this.statusLabel.text = `${this.status}  ·  ${contactCount} contact${
      contactCount === 1 ? '' : 's'
    }`;
    this.selectionLabel.text =
      this.selected.size > 0
        ? `${this.selected.size} selected  ·  RMB move  ·  SPACE silent  ·  P ping  ·  SHIFT preview`
        : 'LMB select  ·  MMB pan  ·  wheel zoom';
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
