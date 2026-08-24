# Core System — Combat

> The Echo Layer decides who knows. Depth decides who commits. Combat is where both bills
> come due.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD,
PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Premise

**The approach is slow. The fight is fast.**

Submarine warfare has a rhythm this game already wants: long minutes of manoeuvring,
listening and guessing, then seconds of extreme violence once somebody commits. Combat in
*Echoes of the Abyss* is designed around that release. Time-to-kill is short and
engagements are decisive, so the weight of a fight lands on the decisions *before* the
first shot — where to be, how loud to be, when to ping, when to break silence. The Echo
Layer makes the approach the game; combat is the answer to whether you read it right.

Two rules keep the design honest:

1. **Every weapon is an acoustic statement.** Weapons are differentiated by loudness,
   direction and delivery — never by a damage-type matrix. There is one damage number per
   weapon and no armour classes. The counter system is sound and depth, and a second
   counter system layered on top of it would fight the first.
2. **You always hear it coming.** The target emotion is dread, not surprise-from-nowhere
   ([systems-echo.md](systems-echo.md) §4). Every lethal thing in this document is audible
   before it lands. What the game withholds is never *that* something is coming — only
   what, exactly, and whether you can shake it.

---

## 2. The Weapon Triangle

Three weapon classes, each the pure form of one relationship to sound:

| Class | Identity | Ammo | Loudness |
| --- | --- | --- | --- |
| **Guns** | Sustained, endless, committed | Infinite | Loud every shot, at your own position |
| **Torpedoes** | Physical, homing, decisive | Scarce | Loud once at launch, then *the weapon itself* is loud |
| **Mines** | Silent, patient, positional | Placed | Silent until the enemy is loud |

The counter cycle:

- **Guns beat torpedoes** — point defence is a gun's job, and sustained fire is the only
  thing that can meet a saturation volley (§5, §6).
- **Torpedoes beat loud heavies** — seekers home on SIG, so the strongest hulls in the
  game are torpedo bait *because* they are strong (§5).
- **Mines beat committed pushes** — a mine is a listener, and a push is the loudest thing
  a player does on purpose (§6).

Silent Running and Active Sonar rotate the triangle: silence slips mines and starves
seekers but disarms you; a ping buys perfect firing solutions and sweeps minefields, at
the usual price of telling everyone where you are, twice as far
([systems-echo.md](systems-echo.md) §5).

---

## 3. Ordnance Acoustics

This table extends the SIG generation table in [systems-echo.md](systems-echo.md) §2,
which remains the table of record for hull noise. All values SPEC unless marked.

| Event | SIG |
| --- | --- |
| Gun discharge (kinetic) | +25 burst (systems-echo.md §2) |
| Gun discharge (energy) | +10 burst (systems-echo.md §2) |
| Torpedo launch transient | +25 burst at the launcher |
| Torpedo, running | 60 sustained, emitted by the torpedo itself |
| Noisemaker decoy | 70 sustained for its 8 s life |
| Mine, armed | 2 |
| Mine detonation | 90 burst |
| Depth-charge detonation | 85 burst, at detonation depth |

Breaking silence to fire — any of these, torpedo launches included — still pays the +40
break-silence spike on top ([systems-echo.md](systems-echo.md) §6). The first shot of an
ambush is always the loudest.

**There are no to-hit rolls anywhere in this document.** Guns hit what they are in range
of; torpedoes and depth charges hit what their physics carry them to. Accuracy is a
property of the firing solution (§7) and the seeker (§5), never of a dice roll — misses
are things a player caused and can watch happen.

---

## 4. Guns — the floor

The basic weapon of the game: hitscan, cooldown-cycled, endless ammo. Every combat hull
carries one. This is the class the prototype already implements, and its rules stand:

- **In range implies heard.** Gun ranges (400–900 m) sit far inside the distances at which
  any combat hull is passively audible, so guns need no resolution-tier gate — if you can
  shoot it, you have already heard it.
- **Silent hulls hold fire.** A unit under Silent Running never fires on its own — the
  +40 spike is a decision the player makes, not one the AI volunteers.
- **Every discharge is loud** (+25 kinetic / +10 energy) and lays battle-site residue at
  the target ([systems-echo.md](systems-echo.md) §7).

The gun's identity is *commitment*: a gun duel is a mutual broadcast that gets easier to
find the longer it lasts. It is the weapon of fights that were going to happen anyway —
and, as point defence (§5), the answer to the weapon class that decides fights on its own.

---

## 5. Torpedoes — the physical weapon

A torpedo is not an attack; it is a **simulated entity**. It has a position, a velocity,
and — this is the design — **its own SIG of 60**, resolved through the Echo Layer like any
hull. The defender hears a fast contact closing. That is the dread the game is named for.

### Flight

- **Speed 160 m/s** — faster than every hull in the roster (the Light Scout cruises
  at 120).
- **Run time 20 s**, then it goes inert: a 3,200 m maximum run.
- **Audible its whole run.** SPEC behaviour, not a number: a running torpedo (SIG 60) must
  be resolvable by its target at baseline HYD 50 across its entire remaining run in open
  water. You always hear the thing coming; the question is what you do with the seconds
  you have.

### The seeker

The seeker is a listener. It resolves emitters through the **standard propagation model**
— same formula, same PF, no special case — inside a **60° forward cone**, with a seeker
HYD of **50** (baseline; factions differ, §11), and steers toward the **loudest emitter it
resolves**. Consequences, all deliberate:

- **Loud hulls are torpedo bait.** A Cruiser at SIG 65 pulls seekers off everything near
  it. Everything that makes you strong makes you loud; now loud also means *targeted*.
- **Silence starves seekers.** A Silent Running hull (SIG 3–8) is effectively invisible to
  a baseline seeker beyond point-blank range. The counter to the alpha-strike weapon is
  the mode that disables your own weapons — a real trade.
- **Terrain is ballistics.** A trench (PF 1.6) carries a target's noise far down the axis
  into a seeker's cone; a thermocline (0.3 across) blinds a seeker crossing the layer; a
  Thermal Vein masks whatever hides in it. Where you fight decides what torpedoes can do.
- **Seekers re-acquire.** The loudest emitter *now* wins — which is why noisemakers work.

### Countermeasures

- **Noisemaker decoy:** any combat hull can deploy one — a drifting emitter at SIG 70 for
  8 seconds, 20 s cooldown (TUNABLE). Seekers re-acquire onto it; so does everything else
  listening, because a noisemaker is real noise at your real position. Saving the hull
  costs the formation its quiet. The Directorate's Chorus Call
  ([systems-echo.md](systems-echo.md) §8) spoofs at map range what a noisemaker does
  locally — seekers give both their teeth.
- **Point defence:** guns can engage torpedoes in their terminal 250 m. A torpedo has
  40 HP — one or two gun cycles kill it, if the gun is idle and the arithmetic works out.
  Point defence is not a shield; it is a gun *choosing* — every cycle spent on a torpedo
  is a cycle not spent on the hull that launched it, and simultaneous bearings beat it.

### Ammunition

- **Damage 700 on impact.** A Corvette (420 HP) dies to one. A Cruiser (1,200 HP) survives
  one — barely, visibly — and not two. See §9.
- **Magazine of 2** per torpedo-armed hull (TUNABLE). Rearm within 300 m of an own Bastion
  or Foundry at 15 s per torpedo. Scarcity is the class identity: the gun never runs dry,
  the torpedo always might.
- **Launch is loud:** +25 burst at the launcher, plus +40 if launched from silence.
- **A running torpedo lays a wake Echo Mark** — a scout can read where torpedoes flew,
  minutes later ([systems-echo.md](systems-echo.md) §7).

---

## 6. Mines — the listening weapon

A mine is the detection formula pointed backwards: it does not emit, it **waits to hear
you**. Armed SIG 2 — the powered-down band, passively invisible in practice.

### The trigger

A mine detonates when a hostile emitter within **150 m** is louder, at the mine, than a
fixed **trigger loudness**.
The trigger threshold is *derived*, not chosen — solved from two SPEC behaviours, in the
same way `BASE_THRESHOLD` is solved from the active-sonar self-reveal:

- A mine must **never** trigger on a Silent Running hull (SIG ≤ 8) at any range in open
  water. Silence walks through minefields. That is the point of both systems.
- A mine **must** trigger on a cruising Corvette (SIG 28) inside 150 m in open water.

A **loudness bar and not a hydrophone rating**, and the distinction is load-bearing. An
earlier draft of this section gave the mine HYD 45 and had it "resolve" contacts like any
listener. That would have made the trigger *threshold-scaled*, and therefore movable:
anything that modifies a listener's HYD — a Cantor dome overhead, a Resonance Storm — would
have changed how sensitive somebody's minefield was, at a distance, invisibly. A minefield
whose trigger drifts because a support structure went up two kilometres away is exactly the
confusion this game trades away for dread. The bar is fixed, and only the water between you
and it can change what reaches it.

Biome PF applies — it is the same formula. A mine in a Thermal Vein (PF 0.45) is half
deaf, and a minefield in a trench (PF 1.6) hears you coming from outside its own lethal
radius. Where minefields work is a property of the map, exactly like everything else.

**The 150 m radius belongs to the calibration hull, not to every hull.** Because the
trigger is a loudness bar rather than a proximity fuse, each hull has its own effective
trigger radius: a Cruiser is heard further out than a Corvette, and anything quieter than
the bar is never heard at all. A Light Scout at cruise (SIG 12) sits below it — a mine
cannot detect one at any range, even directly overhead. That is intended. A minefield is a
wall against a *committed push*, and a scout is exactly the thing you send ahead of one:
it survives finding the field, it does not clear it, and the army behind it still dies.

### The blast

- **Damage 300** at centre, linear falloff to zero at **200 m**. A Light Scout dies; a
  Corvette survives one, wounded. Minefields kill in numbers or not at all — one mine is
  a warning, a field is a wall.
- **Detonation is SIG 90** and lays a battle-site Echo Mark: a triggered mine maps the
  field's edge for whoever is paying attention. The field spends secrecy to deal damage.

### Laying and sweeping

- **Laying is loud** — construction-grade SIG 55 for the 10 s each mine takes to arm
  ([systems-echo.md](systems-echo.md) §2). The field is silent; *making* it is not.
  Reading where the enemy has been is how you guess where the mines are.
- **Active sonar sweeps mines:** a ping resolves every mine in its 900 m radius to Tier 4.
  This is the third job of the big red button — information, firing solutions (§7), and
  now minesweeping — and it costs the same 2,400 m self-reveal every time.
- **Caps:** 12 armed mines per player, 300 s lifetime (both TUNABLE). Minefields shape
  a push; they must not fossilise the map.
- Mines ignore their owner's and allies' hulls.

---

## 7. Firing Solutions

The information system terminates in the weapon system: **what you know about a target is
literally how well you can shoot it.**

| Tier held on target | Guns | Torpedoes / depth charges |
| --- | --- | --- |
| **4 — Track** | fire | Launch with a full solution: the seeker is handed the live track |
| **3 — Classification** | fire | Launch at the estimate; seeker must confirm in the cone |
| **2 — Bearing** | fire (in range implies heard) | **Bearing-only launch**: aims at the ghost, which lies by up to ±15% of range; the seeker must find the truth on the way |
| **1 — Contact** | no fire | no launch |

There is no accuracy percentage — the error is *physical*. A bearing-only launch swims at
where the blurred blob claims the target is, and either the seeker acquires en route or
3,200 m of expensive ordnance swims into open water. This is the classic loop the whole
game builds to: hold a Tier-2 contact and choose — **ping** for a perfect solution and pay
the 2,400 m disclosure, or **shoot on bearing** and accept that ghosts lie.

The ping's accuracy role in [systems-echo.md](systems-echo.md) §10 is realised through
this table: a ping buys Tier-4 solutions for its 3-second window, which is worth more than
any flat buff. Ping *late, briefly, and just before committing* remains the skill.

---

## 8. Vertical Combat

Combat argues about depth too, or it is only half the game
([systems-depth.md](systems-depth.md)).

- **Ordnance has a PR.** A torpedo inherits its launcher's Pressure Rating; below that
  depth it implodes, silently removed. Chasing a Directorate hull into the Abyssal band
  kills the torpedo before it kills the target — deep water degrades *incoming fire*, not
  just visiting hulls. Fighting in the deep feels different because it is.
- **Depth charges** attack *across* bands: a pattern dropped (or floated) into the band
  above or below, travelling at the standard descent/ascent rates, detonating at a set
  depth — **damage 200, 180 m radius, SIG 85 burst** (numbers TUNABLE, the cross-band role
  is SPEC). This is the shallow factions' answer to the PR-3 sanctuary: the Directorate
  below is safe from guns, not from ordnance that falls. A descending pattern is fast and
  audible; the defender hears the attack coming down on them — dread, again, by design.
- **Crush-baiting is intended play.** Luring a pursuer below its PR and letting unhealable
  attrition fight for you costs nothing but positioning. The systems already permit it;
  this document blesses it — with one obligation: the UI must warn when a pursuit or
  attack order would carry a unit below its PR ([ui-ux.md](ui-ux.md)). The bait should
  beat the inattentive, never the uninformed.

Ramming is parked as a design question — descent is fast and deafening, and a Consortium
hull dropping onto a target is thematically irresistible, but it needs the collision model
to earn it. Plain text until decided.

---

## 9. Time-to-Kill Bands

The first numbers everything else tunes around. These bands are **SPEC**; the per-weapon
damage, range and cooldown figures in `packages/shared/src/units.ts` are TUNABLE *within
them* — a tuning change that leaves these bands is a bug.

| Engagement (guns, both sides awake) | TTK target |
| --- | --- |
| Corvette kills Light Scout | ≤ 4 s |
| Corvette vs Corvette | 8–10 s |
| Cruiser kills Corvette | ~5 s |
| Corvette kills Cruiser, guns alone | ≥ 25 s — anchors do not fall to chip damage |
| Sentinel Turret kills Corvette | ~12 s — a turret deters and punishes; it does not delete |
| Torpedo vs Corvette | one hit |
| Torpedo vs Cruiser | survives one, dies to two |
| Mine (single) vs Light Scout | killed |
| Mine (single) vs Corvette | survives, wounded |

The current prototype numbers do not meet these bands (they predate this document); the
transcription pass that follows it retunes them. Fast TTK is safe *because* of rule 2 in
§1: everything lethal is audible before it lands, so short fights punish bad approaches,
not slow reflexes.

---

## 10. Retreat — losing without annihilation

Decisive is not the same as total. A player who reads a losing fight early must have an
exit, or every skirmish is all-in and nobody fights at all:

- **Down and quiet is the door out.** Ascent is slow and silent
  ([systems-depth.md](systems-depth.md) §2) — but *descent* is fast, and a hull that dives
  away from a gun fight breaks range in seconds, loudly, then buys its silence back on the
  slow climb somewhere else. Alternatively: go silent where you are, and starve the
  seekers and the solutions that were killing you. Both exits give ground; neither gives
  the whole force.
- **Guns cannot chase what they cannot catch**, and torpedoes spent on a retreating,
  quieting force are magazines not available for the push that follows.
- The force that reacts to the first audible torpedo, the first spike, the first mine,
  leaves with most of itself. The force that waits to *see* dies. Hearing is the reflex
  the game rewards.

---

## 11. Faction Combat Kits

One doctrine sentence each — the triangle assigns affinities; full kits live in
[factions.md](factions.md) and grow in [units.md](units.md). Every trait below is an
argument about sound or depth, per the editing rules.

- **Bathyarch Consortium — the broadside.** *Klaxon:* **+12% damage while SIG > 60**
  ([factions.md](factions.md), SPEC). The endless-ammo faction: best sustained guns, best
  point defence, and armour that makes surviving the torpedo the plan. A Consortium fight
  happens next to the Consortium, on purpose. Their bane is §6 — a minefield is the one
  wall the Klaxon cannot out-shout.
- **Pelagia Commune — the ambush.** The mine faction: grown, living mines, cheaper and
  more of them (cap 18, TUNABLE). Their −20% Silent Running penalty makes them the only
  navy that *manoeuvres* silent, so they own the break-silence alpha: dumb-fire torpedo
  volleys (no seeker, straight-running, cheap) from point-blank silence. They fight once
  per engagement, then vanish. Caught loud, they die — that is already their doctrine.
- **Abyssal Directorate — the firing solution.** Their torpedoes carry **seeker HYD 70**
  against the baseline 50 — the best mobile ears in the game, miniaturised — and their
  Cantor-dome contacts extend the bearing-only envelope: they launch on ghosts nobody else
  could shoot at. And their megafauna are ordnance the *enemy* loads by being loud
  ([bestiary.md](bestiary.md)). Weak point-blank, and above 400 m their whole kit sickens
  with them.
- **Hadron Knights — the geometry.** The energy-weapon faction (+10 burst — the quiet
  discharge class), fighting in the cones their directional SIG defines: deafening ahead,
  ambushable from the flank. Standing Wave corridors ([systems-echo.md](systems-echo.md)
  §8) are their fixed kill-lines, harming everyone equally, including them. Fights the
  Knights arranged are massacres; fights they didn't are losses they cannot replace.

---

## 12. What Combat Writes Back

Combat is the loudest thing in the game, and the Echo Layer keeps records
([systems-echo.md](systems-echo.md) §7):

- Every discharge spikes the shooter's SIG and lays battle-site residue **at the target**
  — the losing side is the one that stayed still.
- A running torpedo lays a wake mark along its course.
- A mine detonation and a depth-charge pattern lay battle-site marks where they went off.
- A destroyed structure echoes for 3 minutes, as before.

A scout arriving two minutes late reads what happened, roughly how much shooting it took,
and which way the torpedoes flew — and infers the rest. The fight is over; the Rift is
still telling on everyone who was in it.

---

## 13. Balance Guard-Rails

| Risk | Mitigation |
| --- | --- |
| Torpedo spam deletes every heavy | Magazines of 2, rearm at base, point defence, noisemakers — and a running torpedo is the loudest thing its owner has, announcing the ambush it came from |
| Minefields fossilise the map | Caps and lifetimes; mines cannot hear silence, so scouts always pass; a ping sweeps a field for the standard price |
| Bearing-only launch makes pinging pointless | The ghost lies by ±15% of range — speculative torpedoes genuinely miss, and each miss is a fifth of your magazine swimming away |
| TTK too fast to feel fair | Rule 2 of §1: torpedoes are audible their whole run, gun range implies mutual audibility, depth charges are heard falling. Nothing lethal is silent — only patient |
| Point defence trivialises torpedoes | PD is a gun choosing targets; saturation volleys, simultaneous bearings, and every cycle it spends on ordnance is free for the launcher |
| Noisemakers make seekers useless | A noisemaker is real SIG 70 at your real position: it saves the hull by feeding every other listener on the map |

---

## 14. Prototype Mapping

What the simulation scaffold implements against this document, so nobody re-implements
what exists or assumes what does not. The combat loop lives in
`packages/backend/src/sim/systems/combat.ts`; weapon stats in
`packages/shared/src/units.ts`.

| Doc concept | Prototype today | Implementation note |
| --- | --- | --- |
| Guns (§4) | **Implemented** | Hitscan with cooldown; chase on ordered targets, auto-return-fire, silent hulls hold fire; every discharge spikes SIG and lays battle residue |
| Ordnance acoustics (§3) | **Implemented** | The `ORDNANCE` group in `packages/shared/src/constants.ts` carries the §3 table |
| Torpedoes (§5) | **Implemented** | `Ordnance` entities with their own SIG; seekers run the standard propagation model in `sim/systems/ordnance.ts` |
| Countermeasures (§5) | **Implemented** | Noisemaker decoys, and point defence as a target priority inside the terminal range in `sim/systems/combat.ts` |
| Mines (§6) | **Implemented** | `MINE_TRIGGER_LOUDNESS`, solved from the two SPEC behaviours; caps, arming noise and blast falloff in `sim/systems/ordnance.ts` |
| Firing solutions (§7) | Not modelled | Combat currently ignores tiers (defensible for guns only, per §4) |
| Vertical combat (§8) | Not modelled | Ordnance PR, depth charges, pursuit-below-PR warning |
| TTK bands (§9) | **Not met** | Current damage numbers predate this doc; retune within the bands |
| Retreat dynamics (§10) | Emergent | Falls out of existing ascent/descent and Silent Running rules once seekers exist |
| Faction kits (§11) | Not modelled | Klaxon bonus, seeker grades, energy class, mine caps |

---

## Related

- **[systems-echo.md](systems-echo.md)** — the acoustic axis; SIG table of record,
  resolution tiers, Echo Marks
- **[systems-depth.md](systems-depth.md)** — the vertical axis; PR, bands, ascent/descent
- **[factions.md](factions.md)** — the four doctrines these kits serve
- **[units.md](units.md)** — the roster carrying these weapons, and the playtest plan
- **[bestiary.md](bestiary.md)** — the ordnance nobody owns
- **[ui-ux.md](ui-ux.md)** — how solutions, torpedoes and the PR warning must read
- **[economy.md](economy.md)** — what a spent magazine and a lost hull actually cost
