# Echoes of the Abyss — Tech Stack

For a browser-based RTS (PC-first), the stack needs to give high performance for real-time simulation, smooth rendering for units/particles/UI, easy deployment (no installs), and long-term maintainability.

## Recommended Stack

### Frontend

- TypeScript
- PixiJS (rendering)
- bitecs (ECS)
- Howler.js (audio)
- Optional: React for menus/lobby

### Backend

- Node.js
- Colyseus (multiplayer)
- Redis (real-time caching)
- PostgreSQL (persistent data)

### Build Tools

- Vite
- ESBuild

### Deployment

- Vercel (frontend)
- Hetzner Cloud (game servers, low latency in Germany)

## Echo Layer Implementation Notes

Detection (see [systems-echo.md](systems-echo.md)) is **server-authoritative and per-player** — in a game about hidden information, a client-side maphack is the whole threat model, so acoustic resolution tiers must be computed server-side and only the resolved result sent to each client.

- The Echo Layer runs on a **spatial hash**, evaluated at **5 Hz**
- Hard budget: **2 ms/tick** for the full detection pass, to stay inside the simulation's frame budget under Colyseus
- Howler.js handles standard audio playback; raw Web Audio is layered on top for the mix requirements in [art-direction.md](art-direction.md) (Tier-1 contacts must be heard before they're seen)

### What keeps the pass inside 2 ms

The cost of detection is the number of emitter–listener pairs that survive pruning, which
grows roughly quadratically with army size. Measured with `npm -w packages/backend run bench`:

| Entities | Median | p90 |
| --- | --- | --- |
| ~84 | 0.37 ms | 0.43 ms |
| ~164 | 1.30 ms | 2.30 ms |
| ~324 | 3.30 ms | 4.10 ms |

Layers, cheapest first:

1. **Spatial hash broadphase** bounds each emitter by the range at which the sharpest ears
   in the game could hear it through the loudest water on the map.
2. **Per-HYD lookup tables** turn "this listener's real audible range" into a table read.
3. **One squared-distance test** then rejects most pairs before any square root, `pow` or
   path walk — see below.
4. **Aborting path walks**: `Terrain.pathPropagation` gives up as soon as even all-trench
   water for the remaining samples could not reach the bar it was given.

The third layer is the one worth understanding, because it is not obvious. Only the *best*
resolution per side ever ships — a player learns the most any one of their listeners
resolved. So a pair that cannot beat the tier that side already holds for that emitter
contributes nothing, and must not cost a path integral to discard. Because the propagation
model is invertible, "must beat tier T" converts into a distance, and the whole test folds
into one comparison in squared-distance space. A side already holding a Track rejects every
remaining listener outright.

This is lossless, and `test/echo-parity.test.ts` holds it to that: it recomputes detection
the slow all-pairs way, straight from the shared propagation math, and asserts the optimised
pass resolves exactly the same tier for every emitter and every side.

Two things measured and rejected along the way, recorded so nobody re-runs the experiment:
sorting candidates nearest-first made the pass **slower** (a comparator sort costs more than
the walks its ordering avoids), and so did approximating that ordering with a two-sweep split
at a distance cut.

## Rationale & Alternatives Considered

### Core Engine

- **PixiJS** (chosen) — fastest for UI-heavy RTS, great WebGL/2D rendering for isometric maps, fog of war, particle effects
- **Phaser** — easiest to start, great tooling, viable alternative
- **Unity WebGL** — full 3D engine, strong editor, but heavy on memory and slower on older machines; good if pursuing Command & Conquer 3-style 3D visuals
- **Godot Web Export** — lightweight, open source, great 2D engine, improving web export; good for a stylized 2D RTS

### Game Logic & Simulation

- **Language:** TypeScript, for type safety and fewer bugs in complex RTS logic
- **Architecture:** Entity Component System (ECS) for units/buildings/projectiles, fixed-step game loop (e.g. 60 ticks/sec), deterministic simulation for multiplayer
- **ECS libraries considered:** bitecs (fastest JS ECS, chosen), ecsy (Mozilla, very clean API)

### Networking

- **Colyseus** (chosen) — real-time multiplayer framework with built-in state sync, works well with TypeScript, ideal for RTS
- **Custom WebSocket server** (Node.js + ws) — full control, more work
- **WebRTC** — peer-to-peer, harder to make deterministic, not ideal for RTS unless already experienced with it

### Backend & Infrastructure

- **Server runtime:** Node.js (TypeScript)
- **Database:** PostgreSQL for player accounts/saves, Redis for matchmaking and real-time state caching
- **Hosting:** Vercel/Netlify for frontend; AWS/Hetzner for game servers

### Art & Asset Pipeline

- **Rendering style:** 2D isometric (like C&C, Warcraft II), 2.5D with WebGL shaders, or full 3D if using Unity/Godot
- **Tools:** Blender (submarine models, terrain), TexturePacker (spritesheets), Spine or DragonBones (unit animations)

This stack gives high performance, easy development, and long-term stability.

---

## Determinism and Replay

The simulation is deterministic by construction — fixed 60 Hz steps, no wall-clock inside
the step path, hand-authored maps rather than a seeded generator — and that property is
now *tested* rather than assumed.

| Piece | Where | What it does |
| --- | --- | --- |
| Seeded RNG | `packages/backend/src/sim/rng.ts` | The simulation's only randomness. `world.rng`, seeded per match; `fork(name)` gives a subsystem its own stream, so adding a die roll to fauna cannot shift every later hazard roll |
| Lint gate | `.eslintrc.cjs` | `Math.random()` and `Date` are errors anywhere under `sim/`. `rng.ts` is the single exemption, because picking a seed is the one place entropy legitimately enters |
| State hash | `sim/stateHash.ts` | FNV-1a over positions, health, acoustics, orders, economies and production queues |
| Replay | `sim/replay.ts` | Map, seed, roster, and every command attempt with the tick it landed on, plus periodic checkpoints |

Two details are load-bearing and easy to get wrong, both for the same underlying reason:
**bitecs allocates entity ids from a counter global to the process, not to the world.** Two
matches constructed in one process hold identical values under different ids.

- The **state hash** mixes each entity's ordinal position within its own world rather than
  its raw id. Hashing raw ids reports a perfectly reproducible match as divergent, purely
  because of how many matches ran before it.
- **Replays** name entities by *match-local id* — a per-world counter assigned at spawn —
  not by entity id. A replay full of raw ids addresses entities that do not exist in the
  world it is replayed into, and silently no-ops its own commands.

Commands are recorded as attempts, including refused ones, so replay re-exercises the
validation path: a regression that starts accepting something it used to reject surfaces as
a divergence rather than as a subtly different match nobody notices.

Checkpoints are what make a divergence *findable*. `playReplay` reports the first tick whose
hash disagreed, so the answer is "it broke at tick 300", not "the twenty-minute match ended
differently".

A replay also records **which map it was played on** and **whether the Drift was
populated**, since both are part of the setup rather than of the play. Format version 3
carries `mapId` and `fauna`; older replays are rejected rather than upgraded, because the
information is simply not in them — a v1 replay was recorded on whatever `Terrain.demo()` was
at the time, and replaying it on any other ground diverges at the first checkpoint. Rejecting
it says "this replay is too old"; replaying it on a default map would report a divergence
about determinism when the real fault was the replay's age.

A footnote worth keeping, because it cost an hour: the `fauna` flag was added to the format
and then *not read back* on playback, so every replay of a fauna-free match was replayed with
thirty animals in it and diverged at tick 0. The recording said one thing and the playback
did another, and the divergence report blamed determinism. When a replay diverges at tick 0,
suspect the setup before the simulation.

The format has moved on since, and version **11** adds one field for the same reason version 3
added two: the **mission id**, null for a skirmish. A mission's forces, its beats and its
objectives are authored data rather than commands, so none of them appears in the command log
— without the id, a replayed mission is a one-seat map with nothing in the water. With it,
playback resolves the mission, reconstructs its authored forces and re-derives every beat from
`world.tick`, which is why the mission runtime is ticked from inside the fixed step rather than
from the room: a subsystem the room drives fires zero times on playback. A v10 replay is
rejected rather than upgraded, on exactly the grounds a v1 replay is.

The match lifecycle pays the matching cost: a mission room is matched on **mission id as well
as map id**, so a mission player is never routed into a skirmish forming on the same ground.
"No mission" is the empty string and never `undefined`, because two encodings of it would quietly
split the skirmish pool in half.

Version **12** changes no field and one rule: **the state hash now includes the ground.**
Terrain became writable mid-match — a mission beat can collapse a span
([mission-sorrowgate.md](mission-sorrowgate.md) §9) — and until this a replay that reproduced
every hull perfectly while the arch fell on a different tick agreed at every checkpoint. Only
the *mid-match* writes are mixed, not the whole grid: the map is chosen by id and built
identically on both sides of a replay, so hashing three hundred constructed cells every
checkpoint would cost the walk and prove nothing. A v11 file replayed under these rules would
report a divergence at its first checkpoint that is really its own age.

### Ground that changes

The map is a grid of cells carrying a floor and a ceiling, and it was written once at
construction and read ever after. Making it writable took three things beyond the write
itself, and each is a place this could have gone quietly wrong:

- **A cursor, not a snapshot.** The terrain keeps its own change log and the client's cursor
  into it is a revision number. A joining client is served the grid as it *is* — serialised
  from the live arrays — so a reconnection at 15:00 lands on a map with the arch already down,
  and the delta after that is only what it has not seen.
- **Cells on the wire, not rectangles.** A rect delta would make both sides redo the
  metres-to-cells arithmetic and agree about every `Math.floor`. Cells are what actually
  changed and there is nothing left to disagree about. Cells that are written back to the
  value they already held are not recorded at all, which is what lets a span be painted across
  a passage and the passage cut straight back through it without the client being told to seal
  a route and then unseal it.
- **Ground stops a step, not a hull.** Every branch of the passability check tests the
  *destination*, so a hull that ground closed over had no admitting neighbour to step to and
  was entombed for the rest of the match. A hull already inside ground is not held by it. It
  still cannot be walked into from outside.

---

## Match lifecycle

A match has three phases, and the room is in exactly one of them:
**Lobby → Playing → Ended**, with a rematch running Ended → Playing again on the same
ground. `MatchPhase` lives in `@echoes/shared`; the room's phase is broadcast in the
Colyseus schema, because who is in the room and what the room is doing are public facts
about it.

The simulation steps **only in Playing**. Before that change the room began simulating the
moment it was created, which handed the first player to load a head start measured in
however long their opponent took to open a browser tab.

### Finding a match

Three ways into a room, and each exists because the other two cannot do its job:

| Route | What it does | For |
| --- | --- | --- |
| **Quick match** | `joinOrCreate`, filtered by water and mission | Picking a map is picking a queue. Honest, and the fastest way into a game with strangers |
| **The browser** | Lists open rooms; joining one is `joinById` | Seeing what is actually open, rather than hoping the queue you chose has somebody in it |
| **A code** | `joinById` on a room id typed in or pasted | Playing with a specific person, which no amount of matchmaking can arrange |

**A listing names the water and the seat count, and nothing else.** Not who is in the room,
not which navies they took, not their commander names. The ready room negotiates factions
*among the people in it*; a public listing that named them would let a fourth player
counter-pick a match before joining it, and one that named commanders would let anyone
choose who to avoid or who to hunt. This is a game about hidden information, and a lobby
list is the easiest place to give it away by accident.

**Private rooms are unlisted and unmatchable**, reachable only by their room id. Colyseus's
`setPrivate` is exactly this: the matchmaker's availability query filters on
`private: false`, so a private room is invisible to both `getAvailableRooms` and
`joinOrCreate`, while `joinById` still finds it. That is what a room code is.

Two room kinds are private by construction rather than by choice:

- **A solo game.** It was not, until this existed: solo used the same `joinOrCreate` the
  multiplayer entry did, so a player who chose Solo could be dropped into a stranger's
  lobby on the same map, and a stranger could be dropped into theirs. A solo game that
  someone else can join is not a solo game.
- **A mission.** It seats one slot and authors its own opposition
  ([campaign.md](campaign.md)); it is nobody else's to join, and it was already excluded
  from matchmaking by the `missionId` filter. Private makes that structural rather than
  incidental.

The same query filters on `locked: false`, and a room locks the moment its match starts.
So "nobody joins a match in progress" and "there are no spectators" hold here for free: a
started room drops out of every listing, and `joinById` against it fails with the room id
reported as invalid rather than dropping an arrival into a game already under way.

### The lobby

| Rule | Where | Why |
| --- | --- | --- |
| Faction choice, uniqueness enforced server-side | `rooms/lobby.ts` | Four asymmetric navies is the game's entire asymmetry axis. Assigning one by arrival order made the most consequential decision in a match a coin flip |
| A pick is *refused*, never corrected | `canChooseFaction` | Silently handing a client a different navy is how a commander ends up leading a fleet they did not choose and cannot explain |
| Lowest free slot, not a counter | `allocateSlot` | A `nextSlot++` counter is why reconnection could not work: a returning player was handed a fresh empty slot while their fleet sat in the water under the old one |
| Changing your pick clears your ready | `MatchRoom` | Otherwise "everyone is ready" can be true of a roster nobody has looked at since it last changed |
| Disconnected players are not waited on | `everyoneIsReady` | One closed tab should not hold three other people hostage |

`LIFECYCLE.MIN_PLAYERS` is **1**, deliberately: until there is an AI opponent, a solo lobby
is the only way to exercise the game at all. It becomes 2 the day one exists.

The lobby rules are pure functions over a roster rather than methods on the room, because a
Colyseus room is a network object — transports, timers, a matchmaker listing — and none of
that is what "which slot does this player get" is about. Pulled out, each rule is four
lines with a truth table, and the truth table is what `test/lifecycle.test.ts` checks.

### Reconnection, and what your fleet does while you are gone

A dropped client keeps its seat for `LIFECYCLE.RECONNECT_GRACE_S` (90 s) through Colyseus
`allowReconnection()`. The slot, the faction and every entity survive. The client persists
its reconnection token in `sessionStorage`, so a **page reload** resumes the match too —
per-tab and dying with the tab is exactly the right lifetime for a bearer credential to one
seat in one match.

**The fleet keeps making noise.** It is not frozen, hidden, or lifted out of the world:
hulls hold station and keep emitting, and an opponent listening in the right place hears an
unpiloted fleet exactly as it hears a piloted one. Anything gentler would make pulling your
network cable the cheapest stealth in the game — in a game whose whole subject is being
heard. `PlayerState.connected` is broadcast, so the flag itself costs the dropped player
something: an opponent who can read the roster knows whose hulls are now unattended.

Running out of grace is a **resignation**, and so is walking out of a live match. Both call
`Match.resign(slot)`, which eliminates the slot and scuttles its force down the same path a
lost Bastion takes. The tempting alternative — quietly drop the player from the roster —
leaves the survivor in a game they have already won, forever, because the victory check
needs two rosters to declare a winner.

A **mission does not go through that check at all.** It seats one slot and concludes on its
own authored terms ([mission-sorrowgate.md](mission-sorrowgate.md) §8), so `resolveVictory`
is not widened, guarded or special-cased for it: the two-roster rule stays exactly as written
and simply stops being the only thing that can end a match.

### The result, and the rematch

A resolved match sets `winnerSlot`, clears every ready flag and shows a result screen. That
screen reports **one fact: who won.** No kill tally, no resource graph, no map of where the
other commander actually was. A post-match report that reveals the match is a delayed
maphack — the next game on the same ground would be played with knowledge the last one
refused to give. The player's own contact log stays on screen behind it, which is the
honest version of a post-match report: what you knew, not what was true.

A **mission concludes rather than resolving a winner.** `winnerSlot` stays -1 and the screen
reports the outcome the mission's own objectives reached, in the register of whoever set them
— at Sorrowgate, the court's reading of how many people came out
([mission-sorrowgate.md](mission-sorrowgate.md) §8). The delayed-maphack rule is the same rule
and survives intact: the result screen shows the objectives as the player was told them, and
not where the colossus actually went. A mission is replayable, so the second run would be the
one that benefited.

Ready doubles as the rematch vote, because it is the same question both times — *is this
commander waiting on anyone else?* A rematch builds a **new** `Match` on the same map
rather than resetting the old one in place: a `Match` owns an ECS world, and unwinding one
in place is how stale entities survive into game two. The client mirrors that with
`EchoRenderer.resetForNewMatch()`, since every entity id it is holding — selections,
control groups, tracked contacts — now refers to something that no longer exists or, worse,
to a different thing handed the same id.

A room with no rematch closes itself after `LIFECYCLE.POST_MATCH_S` rather than lingering
until the process restarts. A running room is **locked**, so `joinOrCreate` routes a late
arrival into a fresh lobby instead of dropping them into a game already in progress.

### Spectators

Not implemented, and the omission is deliberate rather than an oversight. A spectator is a
client, and a client that receives unresolved world state is a maphack whatever it chooses
to draw — the same rule that governs players, for the same reason. Spectators can exist
here only by resolving the Echo Layer *again*, per spectator, against the 2 ms budget; a
"spectator sees everything" mode would have to be a documented decision about a different
product, not a shortcut taken because it was cheaper.

Related: [systems-echo.md](systems-echo.md) · [ui-ux.md](ui-ux.md) · [maps.md](maps.md)

---

## The skirmish AI

A conventional RTS AI reads world state and nobody minds. Here that would not be merely
unfair — it would be a **different game played in the same room**. The whole design is the
act of deciding under partial acoustic information, so an opponent that knows where your
hulls are is not a hard version of this game, it is an easy version of a different one.

So the constraint comes first, and everything else is arranged around it.

### What the commander can see

| Channel | Contents | Why it is legitimate |
| --- | --- | --- |
| The survey chart, once | Terrain grid, spawn positions, nodule fields, its own slot and navy | Map data. Every human client is sent the same on join; a start position is painted on the ground |
| The snapshot, per Echo tick | Its own units and structures in full; contacts already resolved at whatever tier it earned | Identical to what a player's client receives — same payload, same opaque contact handles |
| Stat tables | `statsFor`, `structureStatsFor`, the depth bands | Static game data, shipped in the client bundle and printed in the HUD |

Nothing else. `packages/backend/src/ai/commander.ts` imports from `@echoes/shared` and from
its own two siblings, and **ESLint fails the build if it imports from `sim/`, `rooms/` or
`bitecs`** — the rule lives in `.eslintrc.cjs` with the reasoning attached. There are exactly
**two deliberate crossing points** where something that is not a human client drives the
simulation: `ai/seat.ts`, which applies a commander's commands to the `Match` and assembles
its survey chart, and `sim/missions/runtime.ts`, which applies an authored mission's beats and
evaluates its objectives. Each is restricted to the same resolved payload a human client
receives — the runtime reads the player through that player's own `EchoSnapshot` and through
nothing else — and each is kept short enough to audit in one sitting for exactly that reason.
Two is already one more than the rule wants; a third has to make the same argument these two
make.

It is the *survey chart*, not the briefing. [glossary.md](glossary.md) reserves "briefing" for
authored mission text, and the bible was already calling this content chart data — the next
paragraph does it — so one word is not asked to carry two things. The code has not caught up:
`ai/types.ts` still names the payload `AiBriefing` and `ai/seat.ts` still builds it in
`briefingFor`. That is a rename the AI seat owes, not a second meaning the bible keeps.

The behavioural half of the same guarantee is `test/ai.test.ts`, which runs a full match and
checks **every command against the snapshot that produced it**: unit ids from its own force,
structure ids from its own base, contact handles from its own contact list, node ids from
the public survey charts. An AI that read the ECS would have to name something that never
appeared in any snapshot it was given, and that is the assertion that fails.

It also infers the same wrong things a player does. Anything classified as fauna is skipped
and anything *unclassified* is not, so the commander will occasionally march an army at a
Draymaw — which is not a defect to paper over. At Tier 1 there is no marker separating a
grazer from a cruiser, and that is the point of having fauna at all.

### Difficulty is decision quality

`AiDifficulty` has two levels and neither of them changes what the AI perceives. The whole
table:

| Knob | Recruit | Veteran |
| --- | --- | --- |
| Echo ticks between decisions | 15 (three seconds) | 3 |
| Manages its throttle when it believes it is being tracked | no | yes |
| Uses Silent Running | no | yes |
| Pings to classify | no | yes |
| Patience before committing | 0.7× doctrine | 1× |

There is no vision multiplier and there must never be one. That is enforced structurally
rather than by intent: `AiTuning` has no field that could carry one, and a test enumerates
its keys, so adding a fifth knob called `detectionBonus` fails the suite by name. Measured
against a passive opponent on the Ventfront Divide, a Veteran resolves the match in **7.9
minutes** and a Recruit in **15.5** — the same information, twice the time.

### Doctrine is the faction's argument about sound

`ai/doctrine.ts` turns each faction's line from [factions.md](factions.md) into numbers. The
Consortium's is "stealth is a rounding error", so its commander harvests on Overburden,
never runs silent, pings freely and pushes at four hulls. The Commune's is "lowest SIG in
the game", so its commander trickles once a bearing sticks for six seconds, approaches
silently, and waits for six hulls. The Directorate pings least of anyone, because it already
hears a tier further and a transmission buys it the least for the same self-reveal — and for
the same reason it waits **twenty-five** seconds before it believes a bearing is worth
paying to break, four times the Commune's hold. That number is the doctrine: the Listening
is the one navy that can wait to find out whether a line on it is being converted into an
approach, because whatever is doing the converting, it will hear coming.

Every field in that table has to be justifiable by a sentence about being heard or hearing.
One that is not is a knob, not a doctrine.

### What it does, and what it deliberately does not

It harvests and assigns fields once (the harvest loop cycles by itself, and a commander
cannot see a harvester's mode — a player cannot either), prices its own loudness against
what it believes is being held on it, builds a Refinery then a Vent Tap when Thermal Draw
tightens then a Turret once something has actually been heard near home, produces to a
doctrine composition, scouts the
enemy start with a Light Scout, rallies between home and the enemy, and pushes when it has
the hulls. It prioritises a Bastion over any other structure and any structure over any
hull — an ordering only available at Tier 3, so it is information it earned.

**It decides for itself what counts as an attack on its base**, and that is a harder question
than it sounds. A contact near the Bastion used to recall the whole army, unconditionally,
which reads as caution and was ruinous: the Drift is seeded near spawns, and at Tier 1 a
grazer and a cruiser are the same smudge — fauna are skipped only once *classified*, which
needs Tier 3. Measured on `ventfront-divide`, 41% of every decision a Directorate commander
made was the recall, and it never once reached the branch that attacks. Empty the Drift and
the same commander pushes hundreds of times. The army was not failing to mass; it was being
called home by wildlife.

The commander is not told which it is — that is the game. It does what a player does: it
watches, and it acts on the one thing that separates them, which is that **a raid closes and
a grazer does not**. A contact earns the alarm by having come nearer than the farthest this
commander has seen it, after being watched long enough for that to mean something; anything
already on the doorstep skips the deliberation entirely, because being wrong about a grazer
costs a wasted trip and being wrong about a raid costs the match. Measured against its
farthest position rather than its first, so a hull that runs silent, drifts out and returns
is approaching on the way back.

**It decides for itself whether being heard is worth paying to stop**, which is the same
kind of question and became a real one only when the price changed. The drop to Trickle used
to fire on `exposure.tier >= Bearing` and hold for as long as that stayed true, and while
the throttle scaled the cut rate that was nearly free. Once it scaled the *load*
([economy.md](economy.md) §3) the same reflex cost 54% of an economy, and the two navies
that use it were paying it for a fact that means only "somebody knows roughly where you
are" — not that they are close, coming, or capable.

So the commander waits for the *holding* of a bearing rather than the bearing, for the
doctrine's own number of seconds, which is the part a sweep passing over does not do. Three
rules finish it. A lapse shorter than one ping's reveal is a blink between sweeps and does
not count as the line breaking. A spell of quiet ends after ninety seconds — two harvest
round trips — because exposure is a fact about the *whole force*, and a bearing that
survives that long is being held on a Bastion or a rallied army that no harvest throttle in
the game can quiet; the bet lost, and the commander goes back to work and makes them find it
again. And the watch is deliberately **asymmetric**: entering costs the whole hold, leaving
costs nothing beyond a blink, because being briefly loud costs SIG and being needlessly
quiet costs half an economy.

Measured over thirty matches each side on `ventfront-divide` — `exposure-hold-before.md`
against `four-faction-baseline.md` under `tools/balance/baselines/`, the same seeds and the
same map, differing only in these two files — the reflex held the Commune below Standard for
91% of its hauling time and the Directorate for 78%. The watch cuts those to 68% and 58%, and
the income comes back with them: 55 to 67 nodules a minute for the Commune, 114 to 125 for
the Directorate. The navies that never drop do not move, which is the control.

The column that does *not* move is the one worth reading. Buying less quiet was supposed to
cost more exposure — that is the trade — and the tracked seconds did not shift at all
(739 → 722 and 1,104 → 1,108). The fifth of an economy those commanders were handing over was
buying them nothing measurable, which is the claim the ninety-second cap is built on rather
than merely an argument for it.

It **manoeuvres in depth**, and for most of this file's life it did not. That was a deliberate
omission before the thermocline — depth had no acoustic consequence, so an AI diving for
stealth would have been modelling a mechanic the simulation did not have — and a real gap
after it, because a pair straddling 1,200 m is cut to 0.3× and the AI was the only commander
in the repository that could not reach the cheapest hiding place in the game.

Closing it cost a ninth verb. `AiCommand` had eight variants against the room's nine in-match
handlers, and `depth` was the exact set difference, so "the AI plays through the interface a
player plays through" was an intention rather than a fact. The seat's switch now has no
`default`, which makes the next missing verb a compile error instead of a commander with a
silent hole in its vocabulary.

The rule itself is in `commandArmy`, and its shape is the argument. The army crosses **on the
attack run** and surfaces on contact, so the layer prices a commitment
([systems-depth.md](systems-depth.md) §5) rather than acting as a stealth toggle. It is
deliberately *not* triggered by being heard: under the layer you are deaf to the surface in
exactly the measure you are hidden from it, so a commander that dove whenever exposure rose
would lose the contact that justified the dive, surface, hear it again, and oscillate. Two
doctrines decline the crossing outright — the Consortium because it is heard regardless and
quiet it cannot spend is quiet it will not buy, the Commune because it does not survive the
deep, it terraforms it.

Every hull is clamped to its own Pressure Rating on the way down. `Match.orderDepth` still
permits a human to rent depth they cannot survive — that is the mechanic — but difficulty
here is decision quality, and a hull taking 4 HP/s of unhealable crush for stealth it will
not live to use is not a decision worth modelling.

The clamp used to split a mixed force vertically, with the rated hulls crossing and the
scouts staying in the light — and buy an emergent property with it, since contacts resolve
per slot and a shallow scout kept hearing for an army gone deaf underneath. **Implementing
§3's baseline table ended that**: a navy that crosses has a baseline of at least PR-2, so
every hull it fields is rated for the crossing and the whole force goes together. The clamp
is unchanged and still guards any navy whose baseline leaves a hull short; there is not
currently one. Worth knowing if the roster or the baselines move again.

`hullSecondsByZone` in the balance telemetry is what makes any of this checkable. Until it
existed, every committed baseline was measured against commanders that spent whole matches in
one acoustic zone, and nothing in the harness could report that.

Related: [factions.md](factions.md) · [systems-echo.md](systems-echo.md) ·
[economy.md](economy.md)

---

## The balance harness

`packages/shared/src/constants.ts` is full of numbers tagged TUNABLE and described as
"expected to move during playtesting", and until now there was no way to move one with an
argument behind it. `docs/economy.md` §9 and `docs/bestiary.md` §8 name specific ways this
design could fail; testing any of them meant two humans and a calendar.

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 10
node tools/balance/run.mjs --help
```

The harness lives in `packages/backend/src/balance/` and `tools/balance/run.mjs` is the
launcher. It is split that way because the runner has to import `Match` and `AiSeat` —
backend TypeScript with real `.ts` import extensions under `moduleResolution: bundler` —
and standing that up outside the workspace would mean a second copy of the backend's build
configuration whose only job is to drift out of sync with the first.

`Match` needed no headless entry point. It was already independent of Colyseus and of the
renderer; the room only ever translated messages into its methods.

### Every seat is an AI

Which is why this could not exist before [the skirmish AI](#the-skirmish-ai) did. A balance
question about the Commune's economy is a question about the Commune *being played*, and a
scripted opening answers something narrower than the guard-rail tables ask.

### Telemetry comes from the snapshots, not the world

Every series is read from the players' own `EchoSnapshot`s — the same payloads a client
receives. Not for purity: the union of every player's snapshot *is* ground truth for
everything worth measuring, and taking it from there means the harness measures the game as
it is actually delivered rather than a parallel version that could quietly diverge.

Two measurements were harder than they look, and both are worth recording because the
obvious answer is wrong.

**Income is not the final stockpile.** A competent commander ends a match near zero, so
reading the leftover pile says the winner had no economy. Reconstructing the spend from what
they built is closer and still wrong: production deducts when an item is *queued* while the
hull only appears when it *finishes*, so the two ledgers disagree by whatever is in flight.
Only mining raises a stockpile and only spending lowers it, so gross income is the sum of
the rises — measured at the Echo tick, not derived.

**First contact is not when the commanders met.** With the Drift populated, first contact is
the first frame: a creature is in earshot of a spawn immediately. So `firstEnemyContactTick`
is tracked separately and keyed on the one signal a creature cannot produce — a contact
carrying a `faction`. Classification names a faction for a hull and a *species* for a
creature, never both. Below Tier 3 there is no way to tell, and no oracle is invented to
pretend otherwise.

### What the seed varies — read this before trusting a batch

`world.rng` is drawn from in exactly **one** place in the whole simulation: placing the
Drift. Terrain is authored, hazard timings are derived from site positions, combat rolls
nothing, and the commanders draw no dice.

So with `--no-fauna` the seed is inert and every match in a batch is identical — ten runs of
one match, reported as ten samples. That is a feature of the simulation (it is what makes
replays and the state hash work) and a trap for this harness, so the CLI warns and the
report is marked when it happens.

### The guard-rail table

Each risk the docs name is paired with a number that would detect it failing:

| Risk | Metric |
| --- | --- |
| Quiet economies simply win | Commune win rate, and nodules per minute per point of mean SIG |
| Loud economies are unplayable | Consortium seconds tracked, against Consortium win rate |
| Directorate Biomass snowballs | Biomass per minute against final Drift Health |
| Knights starve out of every long game | Hadron income against the field, in longer-than-median matches |
| Fauna decide matches | First blood against first *classified enemy* |

A rail the matchup cannot test reports "no data" rather than being omitted — a missing row
reads as "fine", and that is not what happened. A verdict of "held" means the failure did
not appear in these runs; it is evidence, not proof, and the sample size is printed beside
it.

The two rails that read a **win rate** also report "no data" below ten *decided* matches.
A win rate is a ratio over matches that ended with a winner, not over matches run, and a
batch that mostly times out has almost none of them: thirty matches with twenty-nine draws
is one decided match, and the faction that won it reads 100%. Ten is the checklist's N ≥ 10,
counted in the unit the rail actually divides by.

### `--set`, and why it is allowlisted

`--set HARVEST_THROTTLE.Overburden.cargoMultiplier=1.0` patches a constant before the batch
runs, so a change can be argued from one shell history rather than from a rebuild in
between. Only TUNABLE roots are reachable. Anything the docs pin down as SPEC is absent on
purpose: changing one of those is a documentation change first and a code change second, and
a harness that let you skip that step would make it easy to "balance" the game by quietly
contradicting its own design bible.

A path that does not resolve throws rather than warning. A typo'd override that silently did
nothing would produce a before/after where nothing changed and a conclusion of "this
constant does not matter" — the most expensive possible failure for a tool whose entire job
is to answer that question.

### It found a bug the first time it ran

Every commander of every faction was transmitting active sonar 0.4 seconds into the match.
The Drift places creatures near a spawn, so there was always an unclassified contact beside
the opening force, and the AI's "ping to classify" rule fired on it — announcing the base to
everything within 2,400 m before anyone had done anything. Neither the unit tests nor a
five-minute run in the real client had shown it, because neither was looking at a whole
match from the outside.

Baselines live in `tools/balance/baselines/`.

Related: [playtest-checklist.md](playtest-checklist.md) · [economy.md](economy.md) ·
[bestiary.md](bestiary.md)
