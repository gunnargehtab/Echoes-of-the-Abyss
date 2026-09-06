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
*Echoes of the Abyss* is designed around that release. Time-to-kill is short by the standards
of the genre and engagements are decisive, so the weight of a fight lands on the decisions
*before* the first shot — where to be, how loud to be, when to ping, when to break silence.
The Echo Layer makes the approach the game; combat is the answer to whether you read it
right. But "short" is measured in the snapshots a player can act in, not in seconds alone,
and §9.5 holds every band to that count: a fight the loser can only watch is a fight this
document has mis-sized.

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
  a player does on purpose (§6). A running torpedo is committed too, and loud, so a mine
  dropped astern is the second leg of the torpedo's counter (§5): the gun shoots it, the
  mine waits for it.

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
- **Range is measured in three dimensions**, unlike detection. The Echo Layer resolves on
  horizontal distance alone, because depth is a commitment timer in the acoustic model —
  but a gun is not a hydrophone, and §8's claim that a hull below you is safe from guns is
  only true if the water column is in the arithmetic. Hearing something and being able to
  shoot it are different facts.
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
  you have — and §9.5 counts them.
- **A running hull is hard to catch.** A Corvette at 85 m/s gives up only 75 m/s to a
  torpedo, so a launch from beyond about 1,500 m runs dry before it closes; a Light Scout
  at 120 outruns anything launched from beyond 800 m. Launches that connect are launches
  from inside a kilometre — five seconds against a hull that stands still, nine against one
  that runs from 800 m, measured (§9.5) — which is the window every countermeasure below is
  sized against.

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

### What the launcher is told

A commander sees their own torpedo in full — where it is, which way it points, how loud it
is, how many seconds of run are left — for the same reason they see their own hulls: it is
theirs, so showing it leaks nothing.

They are never told what the seeker has **found**. There is no lock indicator, and the
absence is deliberate rather than an omission: "I have a firm solution on a real hull" is a
detection the commander did not make, and handing it over as a boolean would let a torpedo
buy the one thing this game never sells cheaply. A seeker steers; it does not report.

What is left is inference, and that part is intended. A torpedo that turns has heard
something, and the direction it turns is a bearing. That bearing costs a torpedo — one of
two — and it dies with the weapon twenty seconds later. It is the bargain Echo Marks strike
([systems-echo.md](systems-echo.md) §7): the ocean answers, late and never for free.

Two things follow from that, and both are consequences rather than oversights. A seeker's
pursuit is visible because a commander must be able to see where their own weapon is, and a
weapon's position is three-dimensional:

- **The chase reveals depth, which nothing else does at that range.** A torpedo matches its
  target's depth (§8 — that is what makes the crush envelope bite), so a commander watching
  their own weapon descend learns roughly how deep the thing it is chasing sits. Everywhere
  else depth arrives only at Tier 3. Here it arrives because the player is watching an
  object they own, doing what a homing weapon does. Hiding a torpedo's own depth from the
  commander who launched it would be the more absurd rule.
- **A seeker may report on a hull you never shot at.** It takes the loudest emitter in its
  cone, which need not be the contact you aimed at, so a torpedo fired down a corridor can
  turn toward something you hold no resolution on at all. This is the same rule that makes
  noisemakers work, read in the other direction, and it is a fair one: the loud hull that
  stole the torpedo is the hull that was making itself the easiest thing in the water to
  find.

Neither channel can be closed without hiding a player's own asset from them, so the design
owns them rather than claiming otherwise. What is bounded is the *price*: both require a
launched torpedo, both end when it does, and neither is available without spending one.

### Countermeasures

- **Noisemaker decoy:** any combat hull can deploy one — a drifting emitter at SIG 70 for
  8 seconds, 20 s cooldown (TUNABLE). Seekers re-acquire onto it; so does everything else
  listening, because a noisemaker is real noise at your real position. Saving the hull
  costs the formation its quiet. The Directorate's Chorus Call
  ([systems-echo.md](systems-echo.md) §8) does the same thing six times over, at the reach of a
  Cantor's dome and for two minutes — seekers give both their teeth.
- **Point defence:** guns can engage torpedoes in their terminal 250 m. A torpedo has
  40 HP — one or two gun cycles kill it, if the gun is idle and the arithmetic works out.
  Point defence is not a shield; it is a gun *choosing* — every cycle spent on a torpedo
  is a cycle not spent on the hull that launched it, and simultaneous bearings beat it.
- **A mine astern:** a running torpedo is louder than the cruising Corvette a mine's
  trigger is calibrated on, so it trips any hostile mine it passes within 150 m of, and a
  blast spends every torpedo and depth charge inside its 200 m (§6). Any armed hull carries
  a mine and can drop one where it stands; it arms in 3 s, which is 480 m of torpedo, and
  the mine's 150 m ear buys a little of that back — so the drop works against a torpedo
  still **about 450 m astern** and fails against one closer, which is the read the defender
  is asked to make. That boundary is measured rather than reasoned, in
  `test/mines.test.ts`: at 450 m the mine takes the weapon and at 400 m the weapon is past
  it before it wakes. The drop is loud (construction-grade SIG 55 for the 3 s, and it ends
  Silent Running), so it is a bet that the chase is the worst thing in the water. A Spinner
  drops from its magazine silently, which is the Commune's doctrine paying out.

### A screen, laid

The noisemaker above is a *countermeasure*: one decoy, on a suite cooldown, dropped behind a
hull that is already in trouble. The Pelagia Commune's Weaver
([units.md](units.md)) carries the same emitter as a **weapon** — three in a magazine, laid
on the move ahead of an approach rather than behind a retreat.

- **Three per magazine**, laid one every 3 s, rearmed at a Bastion or a Foundry on the
  torpedo's terms above. The field never refills a magazine, and a screen is spent the
  moment it is laid.
- **SIG 45 for 25 seconds**, against a countermeasure's 70 for 8. Quieter *and* longer,
  because the two are asked for different lies: a countermeasure has to out-shout its own
  hull for a few seconds to break a seeker, and a laid decoy has to be mistaken for a hull
  for as long as an approach takes. Forty-five is the roster's cruise band — a Corvette
  runs at 28, a Cruiser at 65 — so a laid decoy reads as something worth firing at rather
  than as an obvious emitter.
- It still breaks seekers, because it is the same emitter and the loudest thing *now*
  wins. A screen laid across an approach is a minefield for torpedoes as much as a lie to
  hydrophones.

**The deception is the Veil's, and it is an inversion.** Every other Commune hull buys
quiet. The Weaver spends noise, and spends it in the shape of somebody else's navy: an
approach behind three decoys reads as four contacts in the cruise band, and a retreat reads
as nothing at all, because a Weaver going home lays none.

### Ammunition

- **Damage 350 on impact.** A Corvette (420 HP) survives one, wounded to a sixth of its
  hull, and dies to two. A Cruiser (1,200 HP) survives three and not four. See §9. It was
  700 — one hit on a Corvette — until #463 asked what the defender could *do* between
  hearing the weapon and losing the hull to it: the answer was "several things, none of
  which they could afford to get wrong once", so the first hit became a lesson rather than
  an obituary. Two of a magazine of two still delete a Corvette; the alpha strike is intact,
  it simply has to be *two* decisions the defender failed rather than one.
- **Magazine of 2** per torpedo-armed hull (TUNABLE). Rearm within 300 m of an own Bastion
  or Foundry at 15 s per torpedo. Scarcity is the class identity: the gun never runs dry,
  the torpedo always might.
- **Launch is loud:** +25 burst at the launcher, plus +40 if launched from silence.
- **A running torpedo lays a wake Echo Mark** — a scout can read where torpedoes flew,
  minutes later ([systems-echo.md](systems-echo.md) §7).

---

## 6. Mines — the listening weapon

A mine is the detection formula pointed backwards: it does not emit, it **waits to hear
you**. Armed SIG 2 — the powered-down band.

That is quiet, not silent, and the difference is a mechanic rather than a leak. Against a
baseline listener an armed mine is a directionless smudge from about 400 m and can be
classified from about 290 m — both *outside* its own 150 m trigger. So a commander creeping
forward and paying attention can find a field and route around it, while a committed push
at speed walks into it, which is precisely the discrimination §2 asks the third pole of the
triangle to make. Past roughly 500 m a mine is inaudible, so a field never announces itself
at map scale, and active sonar keeps its job: it resolves the whole field to Tier 4 at
900 m, far beyond anything passive listening reaches.

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

**The 150 m is a ceiling, and the loudness bar can only bring a hull closer than it.** The
two rules compose in one direction rather than both: nothing outside 150 m is considered at
all, and inside it a hull still has to clear the bar. So being *louder* than a cruising
Corvette buys nothing — a Cruiser at SIG 65 is heard at 150 m and not a metre further, the
same as the Corvette the bar was calibrated on. Being quieter costs you: the effective
trigger radius shrinks with signature until it disappears.

That last step is the one worth stating plainly. A Light Scout at cruise (SIG 12) reads
6.3 at 150 m against a bar of 14.6, and because `perceivedLoudness` clamps at the reference
distance it never clears the bar at any range — **a mine cannot detect a Light Scout at
all, even directly overhead.** That is intended. A minefield is a wall against a *committed
push*, and a scout is exactly the thing you send ahead of one: it survives finding the
field, it does not clear it, and the army behind it still dies.

An earlier draft of this section had the ceiling working in both directions, with a Cruiser
tripping mines further out than a Corvette. It never did — the radius check is a hard gate
ahead of the loudness test — and the version that ships is the better rule anyway: a
minefield's footprint is a property of the field, so a commander can look at one and know
what it covers without first knowing what is about to drive into it.

**Ordnance that travels to kill trips a mine too.** A running torpedo (SIG 60) is louder
than the Corvette the bar was calibrated on, so a hostile torpedo passing inside 150 m
detonates the mine; a falling depth charge (SIG 30) reads 15.7 at 150 m against the 14.7 bar
and clears it just inside. That is the same rule read once more, not an exception to it — a
mine beats *commitment*, and nothing in the water is more committed than a weapon already
launched. What a mine does not hear is a noisemaker or another mine: a decoy that swept
fields would hand the ping's third job to a 20 s cooldown, and a field that chained off its
own edge would be a wall that fell over. The doc-level consequence, and the reason #463
asked for it, is in §5: a mine dropped astern is the hull-sized answer to a seeker.

### The blast

- **Damage 300** at centre, linear falloff to zero at **200 m**. A Light Scout dies; a
  Corvette survives one, wounded. Minefields kill in numbers or not at all — one mine is
  a warning, a field is a wall.
- **Ordnance inside the blast is spent**, not whittled: every hostile torpedo and depth
  charge inside the 200 m is gone with the mine. A torpedo is a fuse and a charge, and a
  shock front sets one off or breaks the other; there is no plate to argue with. Decoys and
  mines are untouched, for the trigger's reasons above.
- **Detonation is SIG 90** and lays a battle-site Echo Mark: a triggered mine maps the
  field's edge for whoever is paying attention. The field spends secrecy to deal damage.

### Laying and sweeping

- **Laying is loud** — construction-grade SIG 55 for the **3 s** each mine takes to arm
  ([systems-echo.md](systems-echo.md) §2). The field is silent; *making* it is not.
  Reading where the enemy has been is how you guess where the mines are. It was 10 s, and
  #463 shortened it so that a mine could be dropped in a torpedo's path and be armed when
  the torpedo arrived (§5): a seeker passes the drop point `distance ÷ 160` seconds after
  the drop, and at 10 s no launch from inside 1,600 m — every launch that can catch a
  running hull — ever met an armed mine. The price is paid in the field: twelve mines are
  now 36 s of broadcast rather than 120, so a field is quicker to lay and quicker to miss
  being laid, and the Echo Marks the laying leaves are the record that remains.
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

**Floating is the same weapon upward, and deliberately so.** A charge set above its dropper
rises at the *ascent* rate — a third of the descent ([systems-depth.md](systems-depth.md)
§2) — so the shallow attack is slow where the deep one is fast, and a defender above gets
three times the warning a defender below does. Nothing else changes, and nothing else
should: it arms the same, blasts the same 200 through the same 180 m sphere, is spent by a
passing blast the same way, and stirs the Drift the same. It must still cross a band, which
is what stops a charge fused at the dropper's own depth from being a free area attack
centred on the one hull it cannot hurt. The Directorate's Thurible is the hull built for it
— PR-3, at home under the layer, reaching up into water it does not own
([units.md](units.md)).

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
| Corvette kills Light Scout | ≤ 6 s |
| Corvette vs Corvette | 12–15 s |
| Cruiser kills Corvette | ~8 s |
| Corvette kills Cruiser, guns alone | ≥ 37 s — anchors do not fall to chip damage |
| Sentinel Turret kills Corvette | ~18 s — a turret deters and punishes; it does not delete |
| Torpedo vs Corvette | survives one, wounded; dies to two |
| Torpedo vs Cruiser | survives three, dies to four |
| Mine (single) vs Light Scout | killed |
| Mine (single) vs Corvette | survives, wounded |

Every gun band is one and a half times what it was (#463): the first table had a Corvette
duel at 8–10 s and a Scout dead in 4, and the stretch was made on the *cooldown* — every gun
in the roster cycles 1.5× slower and hits exactly as hard — so every claim counted in cycles
elsewhere in this bible still holds and only the seconds moved. The 37 s floor is 25 × 1.5
rounded down to the second the Klaxon still clears. §9.5 is why.

These are **rank-0** figures. A hull's rank ([systems-progression.md](systems-progression.md)
§3) multiplies gun damage and hull by up to +15% and +30%, and the per-rank figures are sized
so that no band moves by more than a third at rank 3 against rank 0; the test that holds the
bands should hold a rank-3 row too.

Fast TTK is safe *because* of rule 2 in §1: everything lethal is audible before it lands,
so short fights punish bad approaches, not slow reflexes. That defends the intent. The next
section measures whether the player can act on it.

---

## 9.5 The Beat — what a fight contains

Two facts stated elsewhere have a consequence this section owns. Detection resolves at
**5 Hz** ([ui-ux.md](ui-ux.md) §4, §12) and a contact below Tier 4 is never smoothed, so the
enemy half of every fight is a sequence of discrete snapshots; and a hull's own damage is a
self-event carried in the very next snapshot ([ui-ux.md](ui-ux.md) §5), so the losing side
*knows* it is being hit within 200 ms of the first hit. The question is how many snapshots
follow that one, and what a player can do inside them. This table is the answer, per band,
and `packages/backend/test/combatBeat.test.ts` measures it by playing the fights out at
60 Hz rather than by arithmetic.

| Band | Snapshots, first hit to kill | What the loser can change inside them |
| --- | --- | --- |
| Corvette kills Light Scout | ~27 (5.4 s) | **Break off** — the Scout out-runs the Corvette by 35 m/s and is inside the gun's 550 m by less than that in 4 s; dive at 45 m/s to put the water column into the gun's 3D range. Fire back is not a verb: the Scout's gun is unbanded and hopeless |
| Corvette vs Corvette | ~72 (14.4 s) | **Torpedo** — 350 damage is seven gun shots landed at once, and the duel's one decisive act; **point defence, decoy, or a dive** against the other side's; **dive** to break the 3D range — from 400 m apart it takes 377 m of water to leave a 550 m gun, 8.4 s at 45 m/s and five hits taken, loud, and committed downward. Equal speed means breaking off horizontally is terrain's gift or nobody's |
| Cruiser kills Corvette | ~37 (7.5 s, three shots) | **Break off** — 40 m/s faster, out of the Cruiser's 900 m in 5 s from 700, taking the second shot and not the third; two torpedoes wound the Cruiser and do not kill it |
| Corvette kills Cruiser | ~208 (41.6 s) | Everything, including shooting the Corvette dead in 7.5 s. The band exists so that this fight is the Cruiser's to lose |
| Sentinel Turret kills Corvette | ~90 (18 s) | **Leave.** A turret does not move; a hull that stays in its 700 m for 18 s has decided to |
| Torpedo, launched inside 1 km | 27–60 from first hearing to impact: 27 (5.4 s) against a hull standing at a kilometre, 44 (8.8 s) against one running from 800 m | **Decoy** — heard by the seeker within one 0.2 s pass; **a mine astern** — works from about 450 m of separation, fails inside it, and the read is the skill; **dive** through a thermocline (0.3 across blinds the seeker) or below the launcher's PR (§8); **silence**, which starves a seeker that has not yet acquired and does nothing against one aimed at where you stand; **point defence** in the last 250 m — 8 snapshots; **break across its nose**, since 150 m of turn radius can be made to overshoot. Then, wounded, the same list again with the second torpedo already known about |
| Mine (single) vs Light Scout | 0 | Nothing, and that is correct: the Scout is the hull sent to *find* the field, and finding it is what happened. The push behind it now knows |
| Mine (single) vs Corvette | 0, then a 120 HP hull | **Stop pushing.** The blast is the field's edge, published to everyone as SIG 90 |

Read down the last column: the verbs that resolve inside a fight are **break off, dive,
decoy, mine astern, point defence, torpedo, silence** — and none of them is a reflex. Each
is a bet about the water (is the chase the worst thing out there? is there a layer to drop
through? is the torpedo far enough astern?) that a player makes on partial information they
were given honestly. That is the design's claim about combat depth, stated so that #439 can
be designed against it and so a playtest can call it wrong: the fight is not decided by the
approach and then watched. It is decided by the approach, and then the loser is asked one
more question, at a length they can answer.

Two levers this section deliberately did not pull. The Echo rate stays at 5 Hz in contact:
the 2 ms budget (`SIM.ECHO_BUDGET_MS`) could bear more, but a faster tick in combat only
would tell the map that combat was happening, which is a leak. And no band was lengthened
past ×1.5, because the table above already has an answer in every row that is not a mine,
and a longer fight buys nothing a shorter one did not already offer — it would only make
the approach matter less.

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
  ambushable from the flank — ×1.00, ×0.35, ×0.10 by quarter, from the hull's bow
  ([systems-echo.md](systems-echo.md) §8). Their guns and their loudness share an arc, so a
  Knight that is shooting at you is a Knight you can hear, and the reverse is the whole kit. Standing Wave corridors ([systems-echo.md](systems-echo.md)
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
| TTK too fast to feel fair | Rule 2 of §1: torpedoes are audible their whole run, gun range implies mutual audibility, depth charges are heard falling. Nothing lethal is silent — only patient. And §9.5 counts the snapshots: every band that is not a mine has a verb inside it |
| A mine astern makes torpedoes pointless | It needs 480 m of separation and 3 s of construction-grade noise; from a launch inside that it fails, and from one outside it the torpedo was going to run dry on a running hull anyway. A mine spent on a torpedo is a mine not in the wall, and the drop tells everyone where you ran |
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
| Countermeasures (§5) | **Implemented** | Noisemaker decoys, and point defence as a target priority inside the terminal range in `sim/systems/combat.ts`; a mine astern falls out of §6's trigger set |
| Mines (§6) | **Implemented** | `MINE_TRIGGER_LOUDNESS`, solved from the two SPEC behaviours; caps, arming noise and blast falloff in `sim/systems/ordnance.ts`; `tripsMines` is the ordnance a mine hears and a blast spends |
| Firing solutions (§7) | **Implemented** | `EchoLayer.firingSolution` gates launches at Tier 2 and hands over the same ghost the contact payload carried |
| Vertical combat (§8) | **Implemented** | Ordnance inherits launcher PR and implodes; depth charges fall at `DEPTH`'s rates with a volumetric blast; the depth ribbon warns before a dive that would crush |
| TTK bands (§9) | **Implemented** | Weapon damage solved from the bands; `test/ttkBands.test.ts` holds every one, including under the Klaxon |
| The beat (§9.5) | **Measured** | `test/combatBeat.test.ts` plays each gun band and the torpedo run out at 60 Hz and counts the Echo snapshots between first hit and kill; the mine astern is held in `test/mines.test.ts` against a live seeker, at 900 m and at 300 m, and the decoy in `test/countermeasures.test.ts` |
| Retreat dynamics (§10) | Emergent | Falls out of the existing ascent/descent and Silent Running rules, now that seekers exist to be starved |
| Faction kits (§11) | **Implemented** | `FACTION_COMBAT` in `packages/shared/src/constants.ts`, read through `packages/shared/src/combat.ts` |

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
- **[systems-progression.md](systems-progression.md)** — rank, earned in the discharges §12 records, and the refits that touch a magazine and a hull
