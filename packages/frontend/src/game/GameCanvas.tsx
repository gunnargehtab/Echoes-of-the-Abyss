/**
 * React mount point for the two-canvas renderer (docs/three-layer-ocean.md
 * Phase 5): the three.js conn view is the world, and the transparent Pixi
 * canvas over it is the HUD and every chart mark, both painting through the
 * conn's one camera (EchoRenderer.setConn).
 *
 * React owns the DOM nodes; the renderers own everything inside them. The
 * component deliberately keeps no game state — re-rendering React 60 times a
 * second to animate a canvas would be the wrong architecture, so game state
 * lives in the renderer and only connection status crosses back into React.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  LIFECYCLE,
  MatchPhase,
  ResolutionTier,
  missionHeaderById,
  type AiDifficulty,
  type EchoSnapshot,
  type Faction,
  type MissionResultPayload,
  type MissionView,
} from '@echoes/shared';
import { EchoRenderer, type ContactLogEntry } from './EchoRenderer.ts';
import { PerspectiveView } from './PerspectiveView.ts';
import { paletteFor, type PaletteName } from './palette.ts';
import { ContactLog } from './ContactLog.tsx';
import { EscMenu } from './EscMenu.tsx';
import { Lobby } from './Lobby.tsx';
import { MatchResult } from './MatchResult.tsx';
import { MissionLog } from './MissionLog.tsx';
import { MissionPanel } from './MissionPanel.tsx';
import { MissionResult } from './MissionResult.tsx';
import { AudioEngine, dbToGain } from '../audio/engine.ts';
import type { TunedInputs } from '../audio/tunedBed.ts';
import { driftCarryForMap, recordMissionResult, spentCadre } from '../progression/store.ts';
import {
  GameClient,
  type ConnectionStatus,
  type LobbyView,
  type MissionLine,
} from '../net/GameClient.ts';
import { resolveBindings } from '../input/bindings.ts';
import { loadSettings, subscribeSettings, type Settings } from '../settings/store.ts';

/** Longest log a player will ever scroll back through. */
const MAX_LOG_ENTRIES = 300;

/** `#rrggbb` for a Pixi colour int, so CSS can use the same table Pixi does. */
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/**
 * What the DOM half of the interface needs from the settings the renderer
 * already applied: the UI scale and the four tier inks.
 */
function cssVariables(uiScale: number, palette: PaletteName): CSSProperties {
  const { tier } = paletteFor(palette);
  return {
    '--ui-scale': uiScale,
    '--tier-1': hex(tier[ResolutionTier.Contact].color),
    '--tier-2': hex(tier[ResolutionTier.Bearing].color),
    '--tier-3': hex(tier[ResolutionTier.Classification].color),
    '--tier-4': hex(tier[ResolutionTier.Track].color),
  } as CSSProperties;
}

export interface GameCanvasProps {
  /** Commander name from the setup screen; empty lets the server assign one. */
  playerName: string;
  /** Archetype to create, when this client is the one creating the room. */
  mapId: string;
  /**
   * The authored mission to play, or absent for an ordinary skirmish.
   *
   * A mission pins the navy and seats no other commanders, so its presence is
   * also what tells this component there is no ready room to show.
   */
  missionId?: string;
  /**
   * Join this exact room rather than matchmaking into one — a row in the match
   * browser or a code the host handed over (docs/tech-stack.md, "Finding a
   * match").
   */
  roomId?: string;
  /**
   * Create a room instead of joining one, and whether the world may see it.
   * Absent means quick match, which is `joinOrCreate`.
   */
  create?: 'public' | 'private';
  /** Whether a held seat should be redeemed rather than a new match joined. */
  resume: boolean;
  /**
   * Leave the match and return to the shell. The teardown in the unmount
   * effect is the actual exit — disconnecting clears the reconnection token,
   * so the title screen does not offer to resume a seat left on purpose.
   */
  onExit(): void;
  /** Leave a concluded mission for the record rather than the title (docs/ui-ux.md §14). */
  onRecord(): void;
}

export function GameCanvas({
  playerName,
  mapId,
  missionId,
  roomId,
  create,
  resume,
  onExit,
  onRecord,
}: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [detail, setDetail] = useState<string>('');
  /**
   * The log is the one piece of game state React owns, and it can: it changes
   * only when a detection changes, not every frame, so it does not drag React
   * into the render loop the way animating the canvas would.
   */
  const [log, setLog] = useState<ContactLogEntry[]>([]);
  /**
   * The room's public roster and phase. Like the log, it changes on events
   * rather than on frames — a faction pick, a ready, a result — so React is
   * the right owner for it.
   */
  const [lobby, setLobby] = useState<LobbyView | null>(null);
  /**
   * The mission, as the server resolved it for this seat. Like the log and the
   * roster it moves on events rather than on frames — the server resends it
   * only when the view actually changes — so React owns it comfortably.
   */
  const [mission, setMission] = useState<MissionView | null>(null);
  const [missionLines, setMissionLines] = useState<MissionLine[]>([]);
  /** Non-null once the mission has concluded. Never a winner; an outcome. */
  const [missionOver, setMissionOver] = useState<MissionResultPayload | null>(null);
  const [mapName, setMapName] = useState('');
  /**
   * §11's UI scale, mirrored into React for the DOM half of the interface.
   *
   * The Pixi HUD is scaled by the renderer; the contact log, the objectives
   * panel and the mission log are DOM, so they take the same factor through a
   * CSS variable. Both halves must move together or the interface would be two
   * sizes at once. React owns this because it changes on a settings event, not
   * on a frame.
   */
  const [uiScale, setUiScale] = useState(1);
  /**
   * The active palette, for the DOM half of the interface.
   *
   * The contact log encodes tier in colour as well as in weight, and it is the
   * accessible mirror of the audio channel (§11) — so it would be the worst
   * place to keep drawing the standard tier ramp after the player has picked
   * another. The four inks ride down as CSS variables.
   */
  const [palette, setPalette] = useState<PaletteName>('standard');
  /**
   * The esc menu (docs/ui-ux.md §9.5). React owns it because it is DOM and
   * moves on a keypress, not on a frame; the renderer only reports the Escape
   * that had nothing left to cancel, and is told to stop listening while the
   * menu is up.
   */
  const [menuOpen, setMenuOpen] = useState(false);
  /** Seats this map has. A map's spawn list is its player count. */
  const [maxSlots, setMaxSlots] = useState(4);
  const [sessionId, setSessionId] = useState<string | null>(null);
  /**
   * The room's own id, which is the code a host hands somebody (§14). Shown
   * only in the ready room: it is the one piece of a private room worth
   * passing on, and the ready room is where the host is standing when they
   * want to.
   */
  const [joinedRoomId, setJoinedRoomId] = useState<string | null>(null);
  const rendererRef = useRef<EchoRenderer | null>(null);
  const clientRef = useRef<GameClient | null>(null);
  /**
   * The conn view (docs/three-layer-ocean.md): since Phase 5 it is not a
   * toggle beside the chart, it IS the world — mounted for the whole match
   * under the transparent Pixi canvas, which draws the HUD and every chart
   * mark through the conn's camera.
   */
  const perspectiveRef = useRef<PerspectiveView | null>(null);
  const perspectiveHostRef = useRef<HTMLDivElement>(null);
  /**
   * True when the GL surface could not be created. The conn view is the only
   * world renderer there is, so this is a hard stop with its reason shown —
   * an overlay, not a silent black screen.
   */
  const [glFailed, setGlFailed] = useState(false);
  /**
   * Everything under the esc menu's glass, so it can be made inert while the
   * menu is up — the dialog is modal (§9.5), and Tab must not walk out of it
   * onto a live Ready or Rematch button behind the menu.
   */
  const underRef = useRef<HTMLDivElement>(null);
  /**
   * The connection status, readable from the renderer's callbacks: the
   * callback object is built once at mount, so it cannot see `status` move.
   * The menu may only open over a live match — a lost signal is information
   * the overlay must show, and a menu may not sit under (or over) it.
   */
  const statusRef = useRef<ConnectionStatus>('connecting');
  /**
   * The mix. One engine per mount, closed on unmount — the AudioContext is a
   * device handle and browsers limit how many a page may hold *open*, so the
   * shell mounts this component only while a match is on and the teardown
   * below releases the device before the next one is opened.
   */
  const audioRef = useRef<AudioEngine | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return;

    let renderer: EchoRenderer | null = null;
    let client: GameClient | null = null;
    /**
     * StrictMode mounts effects twice in development, and Application.init()
     * is async — without this guard the second mount would race the first and
     * leave an orphaned canvas attached.
     */
    let cancelled = false;

    const audio = new AudioEngine();
    audioRef.current = audio;
    // The last water reading handed to the mix, kept for the probe alone: the
    // mix reports what it is *doing*, and the harness also wants to see what
    // it was told.
    let tunedInputs: TunedInputs | null = null;

    // A read-only window into the mix, for the headless harness. Reports
    // state only; it can neither drive the engine nor reach the simulation.
    (window as unknown as { __audioProbe?: () => unknown }).__audioProbe = () => ({
      state: audio.state,
      contextState: audio.audioContext?.state ?? null,
      buses: audio.graph === null ? [] : Object.keys(audio.graph),
      sampleRate: audio.audioContext?.sampleRate ?? null,
      voiceCapacity: audio.voices.capacity,
      activeVoices: audio.voices.size,
      contactVoices: audio.activeContactVoices,
      spatialisation: audio.spatialisationMode,
      selfRung: audio.activeRung,
      selfCues: audio.selfCuesFired,
      speechCues: audio.speechCuesFired,
      tuned:
        audio.tunedMix === null
          ? null
          : {
              root: Number(audio.tunedMix.root.toFixed(4)),
              fifth: Number(audio.tunedMix.fifth.toFixed(4)),
              third: Number(audio.tunedMix.third.toFixed(4)),
              corridor: Number(audio.tunedMix.corridor.toFixed(4)),
              corridorPan: Number(audio.tunedMix.corridorPan.toFixed(3)),
              flatCents: Number(audio.tunedMix.flatCents.toFixed(2)),
              crystal: Number((tunedInputs?.crystal ?? 0).toFixed(3)),
              riseM: Math.round(tunedInputs?.riseM ?? 0),
            },
      worstTickMs: Number(audio.worstTickCostMs.toFixed(4)),
      lastTickMs: Number(audio.lastTickCostMs.toFixed(4)),
      lastTickBuilt: audio.lastTickVoicesBuilt,
    });

    /**
     * Autoplay policy blocks an AudioContext created without a user gesture,
     * so the mix starts on the first real input rather than at mount. A game
     * whose primary information channel is audio cannot leave the player
     * hunting for a start button that looks like a mute button
     * (docs/audio-direction.md §12).
     */
    const unlock = () => {
      void audio.unlock();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    /**
     * The whisper rule's two inputs (docs/audio-direction.md §13), held as
     * the latest the client was told: a silence order in force is the debt
     * the mission view carries, and Silent Running is any own hull in the
     * latest snapshot with it on. Both are the player's own state, already
     * on screen, so reading them here adds nothing to what the mix knows.
     */
    let underSilenceOrder = false;
    let anyHullSilent = false;

    const start = async () => {
      // The world first: the conn view mounts for the whole match, and the
      // Pixi glass above it cannot draw a single world mark without it.
      const perspective = new PerspectiveView();
      perspectiveRef.current = perspective;
      const perspectiveHost = perspectiveHostRef.current;
      if (perspectiveHost === null || !perspective.mount(perspectiveHost)) {
        // No WebGL, no world. Say so rather than leaving a black screen
        // wearing a working HUD — and take no seat in a match this device
        // cannot render.
        setGlFailed(true);
        return;
      }
      perspective.setActive(true);

      const activeRenderer = new EchoRenderer({
        onMoveOrder: (unitIds, x, y, queued) => client?.moveTo(unitIds, x, y, queued),
        onAttackMoveOrder: (unitIds, x, y, queued) => client?.attackMoveTo(unitIds, x, y, queued),
        onStopOrder: (unitIds) => client?.stop(unitIds),
        onHoldOrder: (unitIds, active) => client?.setHoldPosition(unitIds, active),
        onRallyOrder: (structureIds, x, y) => client?.setRally(structureIds, x, y),
        onToggleSilent: (unitIds, active) => client?.setSilentRunning(unitIds, active),
        onPing: (unitId) => client?.activeSonar(unitId),
        onAttackOrder: (unitIds, contactId, queued) =>
          client?.attackContact(unitIds, contactId, queued),
        onLaunchTorpedo: (unitIds, contactId) => client?.launchTorpedo(unitIds, contactId),
        onDeployNoisemaker: (unitIds) => client?.deployNoisemaker(unitIds),
        onLayMine: (unitIds) => client?.layMine(unitIds),
        onDepthCharge: (unitIds, depth) => client?.dropDepthCharge(unitIds, depth),
        onHarvestOrder: (unitIds, nodeId, queued) => client?.harvest(unitIds, nodeId, queued),
        onThrottle: (unitIds, throttle) => client?.setThrottle(unitIds, throttle),
        onBuild: (kind, x, y) => client?.build(kind, x, y),
        onProduce: (structureId, kind) => client?.produce(structureId, kind),
        onDepthOrder: (unitIds, depth) => client?.setDepth(unitIds, depth),
        onFollowFloor: (unitIds, active) => client?.setFollowFloor(unitIds, active),
        // Contacts, reduced to what the mix is allowed to know. Buffered by
        // the engine and applied on the tick, so the cost is measured and the
        // mix never moves between ticks (docs/audio-direction.md §12).
        onContactAudio: (frame) => audio.applyContacts(frame),
        // The other half of the mix: what is true of the player's own force.
        onSelfAudio: (frame) => audio.applySelf(frame),
        onHazards: (hazards) => {
          // Read-only, for the headless harness. Hazards are public anyway.
          (window as unknown as { __hazardProbe?: () => unknown }).__hazardProbe = () =>
            hazards.length === 0
              ? null
              : {
                  phase: hazards[0]!.phase,
                  remainingS: Number(hazards[0]!.remainingS.toFixed(1)),
                  kind: hazards[0]!.kind,
                };
        },
        // The water, and any interval standing in it (§9). Applied like the
        // rest and read back by the probe, so the harness can assert that the
        // Fields ring and that a line going flat is heard going flat.
        onTunedAudio: (inputs) => {
          audio.applyTuned(inputs);
          tunedInputs = inputs;
        },
        onMarkAudio: (totals) => {
          audio.applyMarks(totals);
          // Read-only, for the headless harness. Reports counts only, and
          // only what the server already resolved for this player.
          (window as unknown as { __markProbe?: () => unknown }).__markProbe = () => ({
            byKind: Object.fromEntries(totals),
            total: [...totals.values()].reduce((a, b) => a + b, 0),
          });
        },
        onContactEvent: (entry) =>
          // Capped: a long match would otherwise grow an unbounded list, and
          // nobody scrolls back past a few hundred detections.
          setLog((previous) => {
            const next = [...previous, entry];
            return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
          }),
        onOpenMenu: () => {
          if (statusRef.current === 'connected') setMenuOpen(true);
        },
      });

      await activeRenderer.init(host);
      if (cancelled) {
        activeRenderer.destroy();
        return;
      }
      renderer = activeRenderer;
      rendererRef.current = activeRenderer;
      // One camera, two painters: every world mark and every aimed pointer in
      // the Pixi layer goes through the conn view from here on.
      activeRenderer.setConn(perspective);

      client = new GameClient({
        // The perspective view rides the same resolved payloads the chart
        // does — a renderer must never be a second source of truth, and there
        // is nothing else for it to draw from (the server-authoritative rule).
        onTerrain: (terrain) => {
          activeRenderer.setTerrain(terrain);
          perspective.setTerrain(terrain);
        },
        onGround: (cells) => {
          activeRenderer.applyGround(cells);
          perspective.applyGround(cells);
        },
        onMap: (map) => {
          activeRenderer.setMap(map);
          setMapName(map.name);
          setMaxSlots(map.seats);
        },
        onNodes: (nodes) => activeRenderer.setNodes(nodes),
        onAssigned: ({ slot, faction }) => {
          activeRenderer.setIdentity(slot, faction);
          perspective.setIdentity(slot, faction);
        },
        onEcho: (snapshot: EchoSnapshot) => {
          anyHullSilent = snapshot.units.some((unit) => unit.silentRunning);
          activeRenderer.applySnapshot(snapshot);
          perspective.applySnapshot(snapshot);
          // Audio work happens on the tick contacts arrive on, never per
          // frame: anything smoother would imply knowledge the server did
          // not send.
          audio.onEchoTick();
        },
        onGameOver: (payload) => activeRenderer.setGameOver(payload),
        onMission: (view) => {
          underSilenceOrder = view.debtS > 0;
          setMission(view);
          // The renderer needs the locks, not the objectives: they decide
          // which keys still do anything and what the hint bar says when one
          // does not (docs/ui-ux.md §7).
          activeRenderer.setMissionLocks(view.locks);
        },
        onMissionLine: (line) => {
          // Heard when its beat fires and never earlier: the hail is queued
          // from the same message that writes the log row, so the two are one
          // event. The whisper rule is read as the line lands (§13).
          audio.say(line, underSilenceOrder || anyHullSilent);
          setMissionLines((previous) => {
            const next = [...previous, line];
            return next.length > MAX_LOG_ENTRIES ? next.slice(-MAX_LOG_ENTRIES) : next;
          });
        },
        onMissionOver: (payload) => {
          setMissionOver(payload);
          activeRenderer.setMissionOver(payload);
          // The one write of the progression record (docs/campaign.md §11).
          // Here rather than inside `MissionResult`, because this is the
          // moment the result *arrives* and a render is not a moment — a
          // component that wrote on every paint would write on every paint.
          // The room re-sends `missionOver` to a client that reconnects into
          // an ended room, so this fires twice for one conclusion after a
          // reload on the result screen; `recordMissionResult` is idempotent
          // for exactly that reason.
          recordMissionResult(payload);
          // A result outranks chrome: the menu steps aside so the outcome is
          // seen the moment it exists (§9.5). Esc reopens it over the result,
          // in its settled dress.
          setMenuOpen(false);
        },
        onLobby: (view) => {
          // A rematch reuses the room and the connection, so nothing else
          // would tell the renderer its entity ids just became meaningless.
          setLobby((previous) => {
            // **Ended → Playing, and nothing else.** That transition is a
            // rematch and only a rematch, which is the one case this clears
            // for. It used to be "any phase change into Playing", and that
            // caught a reconnection: a resumed client receives its `mission`
            // payload immediately, then the schema catches up from its own
            // default and reports a Lobby → Playing move that never happened —
            // wiping the orders panel a few milliseconds after it arrived, on
            // a match already ten minutes old. Lobby → Playing is a first
            // start, where there is nothing stale to clear by construction.
            if (
              previous !== null &&
              previous.phase === MatchPhase.Ended &&
              view.phase === MatchPhase.Playing
            ) {
              activeRenderer.resetForNewMatch();
              perspective.resetForNewMatch();
              setLog([]);
              // The mission starts again from nothing too: a stale result
              // would sit over the new run, and stale lines would read as
              // having been spoken in it.
              setMission(null);
              setMissionLines([]);
              setMissionOver(null);
            }
            return view;
          });
          setSessionId(client?.sessionId ?? null);
          // Same rule as the mission's ending: a resolved match must be seen,
          // so the menu does not stay open over the result card.
          if (view.phase === MatchPhase.Ended) setMenuOpen(false);
        },
        onStatus: (next, why) => {
          if (cancelled) return;
          statusRef.current = next;
          setStatus(next);
          setDetail(why ?? '');
          activeRenderer.setStatus(next);
          // A lost signal closes the menu: the reconnect overlay is
          // information the player must see, and the menu would otherwise sit
          // invisible but clickable beneath its wash — one blind click from
          // arming a leave the grace window would have saved them from.
          if (next !== 'connected') setMenuOpen(false);
        },
      });

      // The player's stored preferences, applied to the live handles. Audio
      // values buffer safely before the graph exists; the renderer needs the
      // instance, which is why this lives here rather than at mount.
      const applySettings = (settings: Settings) => {
        audio.setMasterVolume(settings.masterVolume);
        audio.setBusTrim('music', settings.busVolumes.music);
        audio.setBusTrim('world', settings.busVolumes.world);
        audio.setBusTrim('speech', settings.busVolumes.speech);
        audio.setBusTrim('self', settings.busVolumes.self);
        audio.setBusTrim('ui', settings.busVolumes.ui);
        audio.setBusTrim(
          'contact',
          settings.busVolumes.contact * dbToGain(settings.contactBoostDb)
        );
        audio.setSpatialisation(settings.mono ? 'mono' : 'stereo');
        activeRenderer.setPrecedenceMode(settings.visualFirst ? 'visual-first' : 'ear-first');
        // §11's full rebinding. Applied through the same subscription as the
        // rest, so rebinding from the esc menu takes effect without leaving
        // the water — a binding you cannot try is a binding you cannot judge.
        activeRenderer.setBindings(resolveBindings(settings.bindingLayout, settings.bindings));
        // §11's accessibility wave 2. The palette and the reduced-motion rules
        // are wholly the renderer's; the scale is shared with the DOM panels.
        activeRenderer.setPalette(settings.palette);
        setPalette(settings.palette);
        activeRenderer.setReducedMotion(settings.reducedMotion);
        perspective.setReducedMotion(settings.reducedMotion);
        activeRenderer.setEdgeScroll(settings.edgeScroll);
        activeRenderer.setUiScale(settings.uiScale);
        setUiScale(settings.uiScale);
      };
      applySettings(loadSettings());
      // The esc menu (#187) writes settings while a match is on screen; this
      // subscription is what makes those writes apply live.
      unsubscribeSettings = subscribeSettings(applySettings);

      clientRef.current = client;
      // What this player's earlier missions did to this water — read at the
      // moment of joining rather than held in state, because a mission that
      // just ended writes the record and a stale copy would carry the ground
      // as it was two missions ago. Missions only: §2 rule 5 is a campaign
      // rule, and a skirmish has no record to have earned one.
      const driftCarry =
        missionId === undefined || mapId === undefined ? undefined : driftCarryForMap(mapId);
      // The campaign's spent roster rides the join (docs/campaign.md §7 row 3)
      // — read here, at the one place the shell knows both which mission is
      // being entered and how to ask the record, so `GameClient` never
      // imports progression. Resolved by the mission's *campaign* rather than
      // by the mission, because a hull the Order entered at the Rest is spent
      // at the First and the rim too; and read fresh at connect rather than
      // at mount for `seenScenes`' reason, since this is the moment it counts.
      const campaign = missionId === undefined ? undefined : missionHeaderById(missionId)?.campaign;
      await client.connect({
        name: playerName,
        mapId,
        missionId,
        roomId,
        create,
        resume,
        driftCarry,
        ...(campaign === undefined ? {} : { spent: [...spentCadre(campaign)] }),
      });
      setSessionId(client.sessionId);
      setJoinedRoomId(client.roomId);
    };

    let unsubscribeSettings: (() => void) | null = null;
    void start();

    return () => {
      cancelled = true;
      unsubscribeSettings?.();
      client?.disconnect();
      clientRef.current = null;
      renderer?.destroy();
      rendererRef.current = null;
      perspectiveRef.current?.destroy();
      perspectiveRef.current = null;
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      void audio.destroy();
      audioRef.current = null;
    };
    // The identity of a mount is the match it joins: the shell never changes
    // these props on a live canvas, it unmounts and remounts. The mission is
    // part of that identity — the same water under a mission is a different
    // room from the same water without one — and so is which door was used,
    // because joining a named room and matchmaking into one are different
    // matches even when every other prop agrees.
  }, [playerName, mapId, missionId, roomId, create, resume]);

  const focusOn = useCallback((x: number, y: number) => {
    rendererRef.current?.focusOn(x, y);
  }, []);

  /**
   * While the esc menu is up, the water cannot hear the keyboard (§9.5). The
   * renderer holds the window-level key listeners, so it is the one that has
   * to stop listening; pointer input dies on the menu's own glass, and the
   * renderer additionally ends any drag a pointer capture would have carried
   * through it. The DOM half goes `inert` so Tab cannot walk under the glass
   * onto a live button — the property rather than the attribute, because
   * React 18 has no boolean `inert`. At mount both refs are still null and
   * both halves start with the flag down, which agrees with `menuOpen`'s
   * initial state.
   */
  useEffect(() => {
    rendererRef.current?.setMenuOpen(menuOpen);
    if (underRef.current !== null) underRef.current.inert = menuOpen;
  }, [menuOpen]);

  const chooseFaction = useCallback((faction: Faction) => {
    clientRef.current?.chooseFaction(faction);
  }, []);

  const setReady = useCallback((ready: boolean) => {
    clientRef.current?.setReady(ready);
  }, []);

  const addAi = useCallback((difficulty: AiDifficulty) => {
    clientRef.current?.addAi(difficulty);
  }, []);

  const removeAi = useCallback((id: string) => {
    clientRef.current?.removeAi(id);
  }, []);

  const setAiDifficulty = useCallback((id: string, difficulty: AiDifficulty) => {
    clientRef.current?.setAiDifficulty(id, difficulty);
  }, []);

  const phase = lobby?.phase ?? MatchPhase.Lobby;
  const live = status === 'connected';
  /** This seat's own readiness — what "Again" and "Rematch" toggle. */
  const selfReady = lobby?.players.find((player) => player.sessionId === sessionId)?.ready ?? false;

  return (
    <div className="game-root" style={cssVariables(uiScale, palette)}>
      {/* Everything the esc menu floats over, gathered so one `inert` can
          silence the lot of it while the menu is up (§9.5). The wrapper is
          unpositioned, so the absolute panels inside keep .game-root as
          their containing block. */}
      <div ref={underRef} className="game-under">
        {/* The world, then the glass: the conn view renders the water and the
            player's own force; the Pixi canvas over it is transparent and
            draws the HUD and every chart mark through the conn's camera. All
            pointer input lands on the top canvas and is interpreted there. */}
        <div ref={perspectiveHostRef} className="perspective-host" />
        <div ref={hostRef} className="game-host" />
        {live && phase !== MatchPhase.Lobby && <ContactLog entries={log} onFocus={focusOn} />}
        {live && phase !== MatchPhase.Lobby && mission !== null && (
          <MissionPanel
            view={mission}
            onFocus={focusOn}
            onCommanderAbility={() => clientRef.current?.commanderAbility()}
          />
        )}
        {live && phase !== MatchPhase.Lobby && missionLines.length > 0 && (
          <MissionLog lines={missionLines} />
        )}
        {/* A mission has no faction to pick and no readiness to declare — the
          room pins both — so the ready room is not shown at all rather than
          shown empty. */}
        {live && phase === MatchPhase.Lobby && lobby !== null && missionId === undefined && (
          <Lobby
            mapName={mapName}
            players={lobby.players}
            sessionId={sessionId}
            roomId={joinedRoomId}
            // The server knows the real cap — a map's spawn list is its player
            // count — and refuses a seat past it. This only greys the button.
            canAddAi={lobby.players.length < maxSlots}
            onChooseFaction={chooseFaction}
            onReady={setReady}
            onAddAi={addAi}
            onRemoveAi={removeAi}
            onAiDifficulty={setAiDifficulty}
          />
        )}
        {/* A mission concluded and a match resolved are different endings, and
          only one of them is on screen: `MatchResult` reads `winnerSlot`,
          which a mission never sets, so it would report an evacuation as a
          defeat. */}
        {live && phase === MatchPhase.Ended && missionOver !== null && (
          <MissionResult
            result={missionOver}
            ready={selfReady}
            onAgain={setReady}
            onExitToMenu={onExit}
            onRecord={onRecord}
          />
        )}
        {live && phase === MatchPhase.Ended && missionOver === null && lobby !== null && (
          <MatchResult
            winnerSlot={lobby.winnerSlot}
            players={lobby.players}
            sessionId={sessionId}
            onRematch={setReady}
            onExitToMenu={onExit}
          />
        )}
      </div>
      {/* Above everything it made inert. It never coexists with the !live
          overlay below: a signal that is not 'connected' closes the menu and
          refuses to open it, so the overlay is always read unobstructed. */}
      {menuOpen && (
        <EscMenu
          ended={phase === MatchPhase.Ended}
          onResume={() => setMenuOpen(false)}
          onExit={onExit}
        />
      )}
      {glFailed && (
        <div className="game-overlay">
          <h2>No light in the water</h2>
          <p>
            The conn view needs WebGL, and this browser or device refused a context. Enable hardware
            acceleration or try another browser.
          </p>
          <button type="button" className="game-overlay-back" onClick={onExit}>
            Return to port
          </button>
        </div>
      )}
      {!live && !glFailed && (
        <div className="game-overlay">
          <h2>
            {status === 'connecting' && 'Listening…'}
            {status === 'reconnecting' && 'Signal lost — re-acquiring'}
            {status === 'error' && 'No signal'}
            {status === 'closed' && 'Connection closed'}
          </h2>
          {status === 'reconnecting' && (
            <p>
              Your fleet is still in the water and still making noise. Holding the slot for up to{' '}
              {LIFECYCLE.RECONNECT_GRACE_S} seconds.
            </p>
          )}
          {status === 'error' && (
            <p>
              Could not reach the game server. Start it with{' '}
              <code>npm -w packages/backend run dev</code> and reload.
            </p>
          )}
          {detail !== '' && <p className="game-overlay-detail">{detail}</p>}
          {(status === 'error' || status === 'closed') && (
            <button type="button" className="game-overlay-back" onClick={onExit}>
              Return to port
            </button>
          )}
        </div>
      )}
    </div>
  );
}
