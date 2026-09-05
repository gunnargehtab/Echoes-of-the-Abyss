# Prologue — Sorrowgate

> The mission in [campaign.md](campaign.md) §3, specified. Everything here is authored: the
> forces, the water, the beats, the numbers and the text. Code transcribes this document.

**Setting:** Arbiter Mosk Halloran's court, a collapsed transit dome, 214 PC
([timeline.md](timeline.md); [characters.md](characters.md), Neutrals).

---

## 1. What Sorrowgate Is

The gate is the terminus of a pre-collapse civic transit line, and the line ran out over a
deep basin. The city committed its dead through it — all four cultures still do the same
thing for four incompatible reasons ([culture.md](culture.md)), and this is the ground they
inherited the practice from. The dome fell in some year nobody kept, the line went with it,
and what is left is an arch, a chamber, a service lock, and the water underneath.

Two facts about that water decide the whole mission.

**The court is under the thermocline.** The chamber sits at 1,500 m, and the layer sits at
1,200 m ([systems-echo.md](systems-echo.md) §3). Nothing said in the chamber carries upward
and nothing above carries down. That is not an accident of the ruin — it is why a court is
possible here at all. Arbitration requires a room the rest of the Rift cannot hear, and the
Rift has exactly one.

**The basin below is Sounder water.** A Sounder's band is 1,300–2,700 m
([bestiary.md](bestiary.md)). The court's own protection is what puts it inside a colossus's
reach, and nobody arranged that; it is simply true, and has been true and quiet for
forty-nine years. The court's whole practice — the struck hardpoints, the silence order, the
count read aloud instead of transmitted — is two centuries of people not disturbing something,
formalised into a procedure and then forgotten as a reason.

Nobody in the chamber says any of this. It is the ground the mission stands on.

---

## 2. Whose Craft the Player Commands

**The player commands the court's escort flight: four hulls, unmarked, crewed by the court,
built by the Commune.**

Halloran's authority rests on nothing but the fact that everybody needs somewhere to swap
prisoners ([characters.md](characters.md)). A man with that much authority does not have a
navy. He has four hulls that were given to him, and every party in the chamber can hear whose
engines they are.

They are Commune-built because the Commune is the only faction whose gift of warcraft nobody
reads as a fleet posture — beloved and militarily irrelevant in the same breath
([culture.md](culture.md)). The Consortium has never let the court forget it. The court has
never pretended otherwise. This is the state of Sorrowgate's neutrality: a fiction all four
powers maintain because the alternative is having nowhere to swap prisoners, and the player is
inside that fiction from the first tick, flying hulls that are not as neutral as the order they
are under.

The court's craft carry numbers and no marks, because a mark is a claim and the court has
none. The flight is **Escort One through Four**. The court's two hulls are **Tender One** and
**Tender Two**.

**Engine bound, stated so nobody corrects it into a bug.** Faction is a four-member
enumeration with no neutral member, and faction uniqueness is enforced across the lobby
roster. The flight therefore carries the Commune's faction value, and so does the Commune
delegation standing across the chamber from it. They are two parties with one faction, which
is legal because a mission seats its own parties and does not go through the lobby. The court
itself is given no faction at all, in the doc and in the data, because it has none — its one
asset is the gate, and the gate belongs to nobody.

---

## 3. The Four Escort Craft

**Four Light Scouts, court-refitted, hardpoints struck.**

| Property | Value | Why |
| --- | --- | --- |
| Hull | Light Scout ×4 | The Commune's own hull ([units.md](units.md)). HYD 70 — the best mobile ears outside the Directorate, and this is a mission about hearing |
| SIG | 6 idle / 12 cruise | The quietest hull in the roster, and the one whose SIG the *player* moves furthest — it doubles, off a floor of 6, where the Abyssal Submersible's 22 → 28 is a quarter and the Corvette emits 28 whatever it does ([units.md](units.md)). A ceiling teaches nothing unless moving is audibly a decision, and on this hull it is |
| Pressure Rating | **2**, by refit | PR-1 covers the Shelf only ([systems-depth.md](systems-depth.md)), and the court is at 1,500 m. The Commune's refits are poor — so the court's hulls hold Mid-Water and stop there. They cannot enter the basin, which needs PR-3. That is the mission's floor and it is authored, not incidental |
| Weapons | **None** | Below |
| Countermeasures | **None** | Below |
| Active sonar | **None** | Below |

### What "unarmed" means, exactly

The court does not disable weapons. It **strikes the hardpoints**, in the chamber, in front of
all four parties, and leaves the tools on the table. A silence order taken on trust is not one.

Three prohibitions, and code should read them as three:

1. **No weapon.** No gun, no torpedo. The hull carries no attack capability of any kind.
2. **No countermeasure.** No mines, no depth charges, no noisemakers. A noisemaker on a
   silence-ordered hull is doubly forbidden, and this clause exists because "weapons" read
   narrowly would leave a stripped hull still able to seed the court's water with ordnance and
   still able to shout.
3. **No transmit.** The active array is pulled with the hardpoints. This is not only the
   [campaign.md](campaign.md) §10 rule that active sonar is withheld until mission 3 — it is
   the reason the mission's central event is something the player cannot answer. The ping is
   shown here, fired by somebody else, and the player has no button to fire back with. That is
   the design working.

**A fourth lock, which is not a prohibition.** The court struck the hardpoints; it said nothing
about masonry. But there is no economy in this mission and nothing to build (§11), so the
command bar's build and unit pages are not offered at all and the build keys refuse with a
reason — *the court's water is not yours to build in* — rather than arming a placement ghost
for a click the server drops on cost. [ui-ux.md](ui-ux.md) §7 rules out the silent refusal, and
a ghost that follows the cursor to nothing is worse than silent: it looks like it worked right
up until it did not. It is carried as a seventh entry in the same lock list as the six above,
because a dead affordance with its reason attached is the pattern this mission already uses.

**Every hull admitted to the chamber is admitted weapons-cold, not only the flight.** This is
the court's whole procedure applied evenly, and it is also the only honest way to stage the
scene: hostility in this simulation is ownership, and there is no neutrality in it, so five
armed parties parked around one exchange would open fire on the first tick. Admission on cold
tubes is *why it is a court*, and it makes "nothing here is solved by shooting" a property of
the data rather than a rule someone has to remember.

Nothing in this mission is trying to destroy the flight. Nothing shoots at it, it is rated for
every depth the mission sends it to, and the one thing on the map that could kill it does not
notice it. This is deliberate and should not be "improved" later: the player is safe and
useless, and the stake is fourteen other people.

The flight is not, however, *invulnerable*, and the doc used to say it was. The Commit's floor
is 2,400 m and the refit rates these hulls to 1,800; the depth control will happily order the
band below that, and a player who does it watches four PR-2 scouts take crush until they are
gone. That is [systems-depth.md](systems-depth.md) §2 working exactly as written, and the
mission does not special-case it — depth is the one system the prologue deliberately does not
teach (§10), so the water it does not send you into is not fenced off, only unvisited. The
consequence is real: a flight lost in the basin cannot escort anything, and both tenders stay
where they are until the court adjourns.

---

## 4. The Silence Order

The order is a **ceiling of SIG 20 per hull, for the whole mission**, and its consequence is
**deafness, never failure**.

The Rift's one universal courtesy is that when someone else is listening, you are quiet, and
interrupting a listener is the local equivalent of shoving ([culture.md](culture.md) §5). The debt
that creates is a real ledger, repaid by staying quiet the next time that person listens.
Sorrowgate is the place that counts it in seconds.

### The three clauses

1. **The ceiling.** SIG 20, per hull, for the duration. The simulation does not clamp your
   loudness; it notices it. A Light Scout at cruise is 12 and compliant. A Light Scout at flank
   is far above the ceiling ([systems-echo.md](systems-echo.md) §2) and is shoving.
2. **The court's array.** The gate mounts the transit line's civic hydrophone array — larger
   than anything any faction has built since, because the Rift lost things. By the arbitration
   protocol the court shares its readings with every admitted party, which is the only reason
   anybody trusts the place. While the flight is compliant, every hull of the flight listens at
   **+25 HYD within 1,200 m of the gate**, capped at 95. A Light Scout hears at 70 outside that
   circle and at the cap inside it.
3. **Silence-debt.** Every second any hull spends over the ceiling adds a second of debt to the
   flight — the party owes it, not the hull. While the flight is in debt the array is withdrawn
   from all four hulls. Debt repays one second for one second of compliance, and caps at
   **60 seconds**, so one catastrophic breach cannot black out the rest of the mission. Dread,
   not confusion.

The array's grant, its radius and its cap are the Cantor's, unchanged
([units.md](units.md), Cantor; [systems-echo.md](systems-echo.md) §8). The court did not build a
second kind of instrument and this document does not invent a second set of numbers for one.

### Why this and not the alternatives

Forced Silent Running was considered and rejected: it removes the decision, and on a hull with
no weapons, no shields and no dredge it costs a Commune hull a little speed and nothing else —
a trade with no cost teaches nothing. A ceiling that fails the mission was rejected against
[campaign.md](campaign.md) §10: failure is specific and audible, and a number crossing a line is
neither.

What the ceiling teaches instead is the inversion the mix already makes
([audio-direction.md](audio-direction.md)) — get louder and the world gets quieter — promoted
from a mix behaviour to a rule with a name. It is Silent Running's whole argument without Silent
Running's button, which is why the prologue does not teach the button.

**The order binds the flight and not the tenders.** The order is a condition of admission, and
the court cannot admit itself. The tenders sit at SIG 18 idle and 40 under way — the Harvester's
own cruise figure, which this document does not get to restate differently — and are the loudest
thing in the convoy. With HYD 30 that makes them the loudest deaf object on the map, and is
exactly why they need ears.

**The order does not lift when the gate falls.** Halloran does not lift it, because the array is
the only thing still working and the order is what keeps it pointed at you.

**The silence order cannot fail this mission.** Stated flatly so it stays true.

---

## 5. The Parties

Five parties and the court. All are correct from inside ([campaign.md](campaign.md) §2).

| Party | Force | Faction | Standing |
| --- | --- | --- | --- |
| **The court's flight** — the player | 4 × Light Scout, struck, PR-2 | Commune | Admitted |
| **The court** | The gate, the array; Tender One and Tender Two | none | Not a party |
| **Consortium delegation** — Underwriter Sela Drenn | 1 × Cruiser, 2 × Corvette | Consortium | Admitted, holding the east |
| **Commune delegation** — Warden Juno Teel | 3 × Light Scout | Commune | Admitted, holding the west |
| **Directorate observer** — Sende | 1 × Abyssal Submersible | Directorate | Admitted, and has not moved since it arrived |
| **Voice Ren Kalliso**, Hadron Knights | 2 × Corvette | Knights | Neither invited nor refused |

Naming follows [culture.md](culture.md): Drenn takes given-plus-family with no hyphen because
she is not Board; Teel is the Warden of the Kell evacuation ([timeline.md](timeline.md)), and
Sorrowgate is the second chamber in her life where the boats are not big enough; Sende carries
one name, which the Directorate regards as an honour; Kalliso is the Order's most ordinary
person and its best field officer ([characters.md](characters.md)).

### What is being exchanged

Fourteen people. Nine Commune plateau-hands taken off a nodule face two parties have called
theirs; five Consortium survey crew who went into plateau water and did not come out. Nine for
five is not a fair count and both delegations have said so for three tides. Halloran closed it.
It stays closed.

They come out in two loads because the chamber has two ways out and only one of them is wide,
and after the transit the wide one is gone.

---

## 6. Who Fires the Ping, and Why

**Underwriter Sela Drenn, Bathyarch Consortium, at 09:00. One emission.**

Kalliso arrives uninvited and behaves impeccably. She holds at the arch, takes no part, and
offers to be elsewhere within the tide if the court would rather. She is the most courteous
party in the chamber and she is also a Knight, and Knight emissions are directional — loud in
the cone, quiet on the flank ([systems-echo.md](systems-echo.md) §8). To the Consortium's
listeners she is an intermittent Tier-1 that will not climb: present, then gone, then briefly
Tier 2 as she turns, then gone again.

Drenn is being asked to sign for fourteen people with an unresolved contact on her approach. The
Consortium does not price uncertainty by ignoring it. An exposure that cannot be graded cannot
be signed for, and there is exactly one instrument in the Rift that grades a contact in a second
and a half. She uses it. In her register that is not panic; it is diligence, and the record will
show she logged it.

[systems-echo.md](systems-echo.md) §5 delivers the verdict without anybody in the chamber being
stupid: *bad players ping when they're nervous, which is how the Rift eats them.* Drenn was
nervous, and being nervous is what diligence feels like from inside.

The ping is SIG 95, omnidirectional, 1.5 s. It resolves the chamber to Tier 4 for three seconds.
It carries down the basin, which is Abyssal Trench and carries sound far along its axis. The
Sounder reads an active emission inside its corridor as a challenge call and alters course
toward the emitter ([bestiary.md](bestiary.md)).

Nobody is wrong. The Knight causes the disaster by being quiet and polite. The Underwriter
causes it by being procedurally correct. The court causes it by having built its neutrality
directly over the thing it depends on not being disturbed.

---

## 7. What Arrives

**A Sounder. It is not coming for the player, and it never notices the player at all.**

The bestiary is explicit and so is the simulation: a Sounder destroys structures by transit,
hulls large enough to be in the way are hit the same, and small ones are ignored because a
Sounder does not notice them ([bestiary.md](bestiary.md)). The player's force is four Light
Scouts. They are beneath its attention for the entire mission.

That is not a problem to be worked around. It is the mission.

It comes for the emitter, and the emitter was standing in the middle of the exchange. It takes
the arch, the array, and whatever is large enough to be in the arch when it goes through — a
Cruiser is; a tender is not. It holds the course toward the emitter, turns at the far end of the
basin, and comes back through, because that is what the corridor is.

The player is never in danger and cannot help. Four hulls that cannot shoot, cannot ping, and
cannot be seen, stationed at an arch, hearing a thing they can do nothing about. This is what
[campaign.md](campaign.md) §1 means by *no combat you can win*, and it is what §2 means by
*losing is content* — the mission is unwinnable as a fight and winnable as an evacuation.

**Design intent, restated from [bestiary.md](bestiary.md):** the button that lets you see
everything also calls the largest thing on the map. Nobody needs to explain the ping's cost
twice. The prologue is the once.

---

## 8. The Objective

**Get both tenders from the chamber to the Upper Concourse.**

Tender One carries nine, Tender Two carries five. Both are Harvester hulls with the dredge gear
stripped, PR-2, HYD 30, slow — a poor court's freight, which is what Halloran has.

**A tender moves only while a hull of the flight is within 400 m of it.** The tenders are deaf
(HYD 30 is below the floor for reading even a battle's residue,
[systems-echo.md](systems-echo.md) §7), the route out is Coral Ruins with hard acoustic shadows,
and a deaf hull in a drowned district does not move without ears. This is the escort, and it is
made entirely of listening and position. Nothing is shot at.

**Four escorts, two tenders, one colossus, and you cannot be in both places.** Split the flight
and both tenders crawl with two hulls of cover each; commit all four to one and the other sits
in a chamber that is about to stop existing. That is the mission's single decision and the
player makes it with their ears.

### Results

| Result | Condition | The court's reading |
| --- | --- | --- |
| **Fourteen out** | Both tenders reach the Upper Concourse | "Fourteen out. Nothing about this is finished, and the court has no part in the rest of it. The record is closed. The court adjourns." |
| **One tender out** | One tender reaches it | "One tender is through. The rest are in the record. The count will be read in this chamber when there is a chamber, and until then it stands as read." |
| **The gate is closed** | Neither reaches it | "The gate is closed. Fourteen are behind it. The record will be read, and then the court will adjourn, and this court will not open again." |

The partial reading names no number, and that is deliberate rather than vague: either tender may
be the one that gets through, so a court that said "nine are out" would be reading a count it had
not taken. It reads what it knows — one is through, the rest are in the record — and leaves the
arithmetic to the people who have to live with it.

A partial result **ends the mission and is a result.** It is not a soft failure and the player is
not asked to replay it. Three missions across the campaign are winnable only as evacuations
([campaign.md](campaign.md) §2); this is the first, and it is where the game teaches that a
number it read out loud is the whole outcome.

### The failure, and the sounds that precede it

There is one failure condition and it is not a timer. **A tender still inside the chamber when
the court adjourns is inside a collapsing dome**, and the dome comes down because the colossus
came back through it.

The precursor is diegetic, free, and enormous. Times are mission time, on the same clock as §9's
beat table; the court adjourns at 20:00.

| When | What the player hears |
| --- | --- |
| 00:00 | The basin. A slow, non-directional presence at the very edge of hearing, from the moment the flight is admitted. The mission never names it and no character mentions it |
| 14:30 | **The second calling voice.** SIG 100, non-directional, from the far end of the basin — the colossus has turned. [audio-direction.md](audio-direction.md) §5 already owns this sound: *the only sound in the game that means you have made a mistake that is now coming* |
| 19:00 | **The gate.** The transit took the arch and the array and left the dome standing ([bestiary.md](bestiary.md)). A wounded dome under 1,500 m of water complains, continuously, and gets louder as the mass approaches it |

Five and a half minutes of warning against a run north that takes three (§9), delivered twice, by
two different sounds, one of which the player has already learned the meaning of — and the second
of them lands with a minute left, for a player who ignored the first. [campaign.md](campaign.md)
§10 is satisfied with margin and it costs the mix nothing it does not already have.

---

## 9. Length, SIG Budget, and the Beats

**Length: twenty minutes.** Inside [campaign.md](campaign.md) §10's 12–25.

**SIG budget: 20.** The budget and the silence order are the same number, and that is the point.
This is the one mission in the campaign where the budget is a rule the player can feel rather
than a note in the margin — and §10's promise still holds, because exceeding it costs the player
their hearing and never the mission.

| Time | Beat |
| --- | --- |
| 00:00 | The flight is admitted at the arch, 1,450 m. Hardpoints struck. Array live. Ceiling 20 |
| 00:00–04:00 | The approach. Nothing happens, on purpose. The meter and the array are the only instruments and there is nothing else to attend to |
| 04:00 | The delegations take station — Consortium east, Commune west. The Directorate observer was already here and does not move |
| 06:20 | Kalliso arrives from the north-west, states her position, and holds — quiet, at an interval, and inaudible from the arch. She does not climb |
| 06:20–09:00 | The exchange runs. The flight's job is to hold and listen. Kalliso flickers — nothing, then Tier 2 for a few seconds as she turns, then nothing again. She never climbs past Tier 2, so the flight never learns whose she is |
| **09:00** | **Drenn pings.** SIG 95. Three seconds in which everything is exact, and the player is lit for the first time in the game |
| 09:20 | **The calling voice** |
| **10:40** | **The transit.** The arch goes, and the court's array goes with it. The dome holds. The delegations scatter; not one of them engages, because nothing can. The service lock is now the only way out, and the flight is on its own ears from here |
| 11:20 | Tender One is loaded |
| 13:40 | Tender Two is loaded |
| **14:30** | **The second calling voice.** The colossus has turned |
| 16:00–19:00 | The run north and the climb. Crossing 1,200 m, the disaster behind falls away to almost nothing — ascent is slow and silent ([systems-depth.md](systems-depth.md) §2), the layer is a wall, and the player leaves without being told how it finished |
| **20:00** | **The court adjourns.** The dome comes down on whatever is still inside it, and the record closes on whatever count the player earned |

The array is lost to an authored beat rather than to the colossus's pathing, because a mission's
beats have to happen at the time the document says they happen. The colossus is why; the beat is
when.

### The arch, as ground

"The service lock is now the only way out" is a claim about the map, so it is written into the
map. Two beats fire at 10:40, in order, exactly as the map literal paints later regions over
earlier ones: **the span goes solid** across the whole width of the map at the chamber's
northern row, and **the lock is cut back through it**. Two writes rather than one shaped
rectangle, because that is what happened — the city fell in and the maintenance passage did
not — and because a single rect would have to know where the lock is and would stop agreeing
with §11 the first time either moved.

The span is one 250 m cell row, 2,000–2,250 m. That row is what separates the chamber (from
2,250 m) from the Descent and the Concourse above it, so collapsing it leaves the lock's two
columns as the only way north. A cell belongs to the rectangle that contains its centre
([maps.md](maps.md), "How a map is written"), so a band one cell tall laid on the row boundary
is that row and nothing else. Under the touch rule this mission was first written against it
would have reached into the next row and sealed the court inside its own dome, which is why
the span used to be authored 200 m tall against a 250 m grid.

**The Commune's withdrawal moved with it.** All three of their 10:40 orders used to point into
that row or the one above it, which is how a delegation ends up stranded in rock instead of
scattering; they now withdraw onto the southern end of the vein they came in over. The east is
untouched — the Consortium scatters at the chamber's own depth and never crosses the span.

**Ground that closes over a hull does not hold it.** A hull caught in the span at 10:40 can
still move out, because the ground stops a step being taken *into* it and not a hull already
inside. Without that a flight parked on the arch would be entombed for the remaining nine
minutes, with nothing on screen to say why.

---

## 10. What It Teaches, In Order

[campaign.md](campaign.md) §10 permits one system per mission. **The prologue is the stated
exception and the only one** — it teaches four, because none of the four is a system the player
can be handed separately. Each is the prerequisite for the next, and the last is what the
mission is decided on.

| Order | Teach | Where it lands | Load-bearing by |
| --- | --- | --- | --- |
| 1 | **SIG** | 00:00–04:00. A ceiling, a meter, and a flight that has to move under a number | Every minute after 10:40 |
| 2 | **Listening (HYD)** | 04:00–06:20. The court's array. While you are quiet you hear the whole basin; the moment you are not, you hear yourself | The tender runs, where being deaf is being lost |
| 3 | **Resolution tiers** | 06:20–09:00. Kalliso holds the interval quiet and is simply not there; twice she turns, and for a few seconds she is a Tier 2 that names nobody. The player learns what a tier is by watching a contact refuse to become one | 09:00, when someone else raises it for everyone at once |
| 4 | **What hearing is worth** | 10:40–20:00. The colossus is a SIG-100 emitter in a PF-1.6 basin, so it is a Tier-4 track from the moment it turns and it stays one through the climb — exact position, exact heading, all the way out. The lesson is the inverse of the first three: the player has finally been given perfect information, and there is nothing whatever they can do with it | The last three minutes, entirely |

The prologue does **not** teach Silent Running, and this closes an open question between
[audio-direction.md](audio-direction.md) and [campaign.md](campaign.md) §5. On a hull with no
weapons, no shields and no dredge, the toggle costs a Commune hull a little speed and nothing
else — a trade with no cost is not a lesson. The ceiling is Silent Running's argument with the
price attached. The button stays with Commune mission 1, *Tend*, where there is something to
give up.

The prologue does **not** teach depth. Crush attrition is a fifth system and would kill the
flight; the refit exists so that depth is felt as a *floor* — there is water below the gate that
the court's hulls cannot enter — rather than as a bleed.

---

## 11. The Map

`sorrowgate` · **Sorrowgate** · one seat · 5,000 × 4,000 m · cell 250 m · base floor 1,600 m.

Coral Ruins, per [campaign.md](campaign.md) §10 — the human biome, and this is the most human
ground in the setting. Built to the shape of [maps.md](maps.md) Map Type 5, *Sunken Metropolis*:
multi-layered ruins, collapsed domes, a tunnel beneath the main lane.

| Region | Rect (x, y, w, h) | Biome | Floor | Ceiling | What it is |
| --- | --- | --- | --- | --- | --- |
| The Districts | 0, 0, 5000, 4000 | Coral Ruins | 1,600 | — | The drowned city. Painted first; everything else is cut into it |
| The Upper Concourse | 1500, 0, 2000, 750 | Coral Ruins | **340** | — | The passenger terminus, above the layer. **The extraction point** |
| The Descent | 2000, 500, 1250, 1250 | Coral Ruins | 900 | — | The step between the Concourse and the city. Where 1,200 m is crossed |
| The West Approach | 0, 1250, 1500, 1250 | Thermal Vein | 1,600 | — | PF 0.45. The one road where the flight can be loud and get away with it. Nothing tells the player this |
| The Service Lock | 1750, 1750, 500, 750 | Coral Ruins | 1,500 | **1,300** | Roofed water joining the chamber to the districts. After the arch goes, the only way out. A route nobody can be watched taking |
| The Gate | 2000, 2250, 1250, 1000 | Coral Ruins | 1,500 | — | The dome and the chamber. The court |
| The Commit | 1500, 3000, 2000, 1000 | Abyssal Trench | **2,400** | — | The basin the city committed its dead into. PF 1.6 — which is how the ping got down there. Needs PR-3, and nothing the player owns is rated to follow it down (§3) |

One spawn, at the arch: 2550, 2150. No resources. No hazard sites. There is no economy in this
mission and nothing to build.

Every rectangle above lands on the 250 m cell grid, so each paints exactly the metres it reads
([maps.md](maps.md), "How a map is written"). They were restated that way when issue #157
replaced the touch rule with the centre rule: the water is the water this mission has always
been played in, and it is the table that changed, to stop describing a chamber a cell narrower
than the one the flight is actually in. The Service Lock reads 500 m rather than the 300 m it
used to, for the same reason — two 250 m columns is what this grid can hold, and two columns is
what it has always painted.

**Sorrowgate is a mission map and is not in the public catalogue.** It has one seat, no
resources and no second spawn, so it is not an archetype, is not balanced, and is not
selectable in a skirmish. It is resolved by mission id and by nothing else
([maps.md](maps.md)).

**On the Coral Ruins state change that [environments.md](environments.md) specifies, and three
shipped missions now spend:** the prologue does not rely on it and does not implement it. Its state
change is the gate coming down — a structure, on a slot that is not the player's. The biome
repaint is built elsewhere and is not owed here.

---

## 12. The Briefing

Read into the record by Arbiter Mosk Halloran, 214 PC. The court's register is defined in
[culture.md](culture.md) §3.

> Four hulls have been admitted. Their hardpoints were struck in this chamber in front of all
> four parties and the tools are on the table where they were struck. Nobody has to take
> anybody's word for anything today. That is the whole of what this court is.
>
> Fourteen people are in the record. Nine were taken off a face that two parties have called
> theirs. Five went into plateau water and did not come out of it. The count is closed. It was
> closed two tides ago and it does not reopen because somebody has since thought of a better
> argument.
>
> The flight holds at the arch and the flight stays under twenty. The court's array is on, and
> while your hulls are quiet you hear what the court hears. Be loud and you are shoving, and the
> court will not hear past you — it will hear you, and you will hear nothing else until it is
> paid back.
>
> There is deep water under this gate, and something in it that the city put there before the
> count started and has never had a reason to disturb. Nobody in this chamber transmits today.
> If anybody does, the court will strike their hulls as well, and it will not matter, because it
> will already be too late to matter.
>
> The parties are admitted. The record is open.

### Objective readings, in play

The court states facts about the room and they function as instructions. No other register can do
this: the Commune cannot command, the Consortium would price it, the Directorate would put it in
the passive, and the Knights would be courteous about it.

- *The flight holds at the arch. The flight stays under twenty.*
- *The flight owes the court a silence.* — while in debt
- *Tender One is loaded. Tender One does not move without ears.*
- *Tender Two is loaded. The gate is open, and it will not be open twice.*
- *The Concourse is above the layer. Nothing follows you up.*

### The four voices in the water

**Voice Ren Kalliso, arriving — 06:20**

> I have not been invited and I have not been refused. I will hold the interval at the arch and
> take no part. If the court would rather I were elsewhere, the court has only to say so, and I
> am elsewhere within the tide.

**Underwriter Sela Drenn, at 09:00**

> There is an unquantified contact on my approach and I am being asked to sign for fourteen
> people. I do not sign for an exposure I cannot grade. One emission. Log it as taken on my
> authority.

**The observer, Sende, at 09:20**

> It has been answered. Nothing further is required of anyone here. It will pass, and then it
> will pass again.

**Warden Juno Teel, after the transit**

> We're not asking anybody to move. We're saying the water has changed and we'd rather everyone
> were somewhere else while we finish turning it.

Each line fails [culture.md](culture.md) §3 for the other three factions, which is that
document's own test (§6): Drenn's would be sentiment from a Commune mouth and discourtesy from a
Knight's; Teel's is unusable by anybody who can give an order; Sende's claims nothing and
therefore cannot be Consortium; Kalliso's offers a way out of a confrontation, which the
Directorate has no grammar for.

---

## 13. Scaffold Status

What is built against this document, so nobody re-implements what exists or assumes what does
not.

| Requirement | Status |
| --- | --- |
| The map, its seven regions, the roofed service lock | Implemented (#190) |
| The arch closing at the transit, making the lock the only way out | Implemented (#197) — two `ground` beats at 10:40: the span goes solid across the map's width and the lock is cut straight back through it. A flood-fill test asserts that removing the lock leaves no route north at all |
| The flight, admitted weapons-cold, PR-2 | Implemented (#190) |
| Every party admitted weapons-cold | Implemented (#190) |
| The silence order — ceiling, array, silence-debt | Implemented (#190) |
| The beat schedule, including Drenn's ping and the transit | Implemented (#190) |
| Objectives, results, and the failure at adjournment | Implemented (#190) |
| The briefing and the objective readings | Implemented (#190) |
| The four voices in the water | **Built** (#381) — the `say` beat carries speaker and line to the mission log beside the orders panel at the times §12 gives, and the mix now hails each on the speech bus [audio-direction.md](audio-direction.md) §13 owns: 600 ms of signature in the speaker's register's material, then a murmur bed for the reading. The four are four registers by construction — Kalliso in the Order's note at 06:20, Drenn in the concern's beat at 09:00, Sende in the cohorts' ticks at 09:20, Teel in the plateaus' breath at 10:40 — and `missionRuntime.test.ts` plays the mission and asserts they arrive as four different voices. Under the silence order the hail whispers (−6 dB, the top octave gone, the bed half as long) and never mutes; the log stays the caption, so a player with their eyes on the water now hears that somebody spoke and which of the four it was. Under the cast (#403) Kalliso and Teel are signed — the Order's own note at a soldier's pace, and the warden's breath — and Drenn and Sende, who have no entry in [characters.md](characters.md), speak as the grid and as those below: still four registers, and now four speakers |
| Ghost markers as a taught system | **Not taught here, and [campaign.md](campaign.md) §3 now says so.** §10's fourth beat was written for a fading twenty-second trail; measured, the colossus holds Tier 4 from 09:00 to the adjournment in every drive — passive, escorted, and escorted-with-the-climb — because SIG 100 through PF 1.6 stays four times over threshold even across the thermocline. §10 row 4 has been rewritten to what the phase does teach. Whether the lesson moves to another mission or the colossus is made quieter is a campaign-level decision, not this document's |
| Mid-match Coral Ruins state change | Built, and spent by three other missions; not relied on here ([environments.md](environments.md)) |
| Campaign progression, and recording that the prologue was played | Built (#371) — the prologue is still replayable, and the shell now knows whether it has been played ([campaign.md](campaign.md) §11) |

---

## Related

- **[campaign.md](campaign.md)** — §3, which this specifies, and §10, whose exception this is
- **[culture.md](culture.md)** — §3, the court's register, and the silence-debt this mission is built on
- **[characters.md](characters.md)** — Halloran, Teel, Kalliso
- **[systems-echo.md](systems-echo.md)** — SIG, tiers, ghost markers, and the ping's price
- **[systems-depth.md](systems-depth.md)** — the thermocline the court hides under, and the pressure floor the refit sets
- **[bestiary.md](bestiary.md)** — the Sounder, which answers pings and ignores you
- **[audio-direction.md](audio-direction.md)** — the calling voice, and what deafness sounds like
- **[maps.md](maps.md)** — Map Type 5, the archetype the gate is cut from
- **[glossary.md](glossary.md)** — mission, objective, briefing, silence order
