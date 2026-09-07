# The Flora Economy — Beds, Harvest and Sowing

Biomass grows on the map.

Until this document, it did not: the account was paid out of dead animals, on the tick they
died, to whichever hull happened to be nearest ([bestiary.md](bestiary.md) §5). That made
Biomass the only resource in the game with no act behind it — nodules have the hauler loop,
Thermal Draw has the tap, Resonance Crystal has the raid — and it made the whole account a
**fixed stock**: a map holds one seeding of fauna, worth about 900 Biomass to four navies for
a whole match, and nothing ever replaced it (#535).

The flora is where the account belongs, and the world already grew it. Kelp Forest Plateaus
are *"Bio-Rich Regions"* ([environments.md](environments.md) §2) whose own visual identity
names *coral towers and algae farms*. Kelp fields are the one permanent hazard on the map
([hazards.md](hazards.md) §4). The Commune sows furrows into new kelp in three shipped
missions. What was missing was the sentence that makes it an economy, and it is one sentence:

> **The crop is the cover.** Kelp is the quietest ground in the game and the thing that hides
> you. Harvesting it turns that cover into hulls. Sowing puts it back.

That is the argument about sound this whole account was missing. An economy here does not
merely *make* noise, the way a refinery does — it *removes the quiet*, permanently until
someone replants it, from the one biome built for hiding.

---

## 1. The bed, and the one number in it

A **bed** is a kelp field: the same object [hazards.md](hazards.md) §4 already calls a field
and already gives a shape, a position and a grip. It gains one number.

**Standing crop** — 0 to 100% of the field's canopy, starting full. Crop is not an inventory
hidden inside the field; it *is* the canopy, which means it is read three ways at once and
never bookkept twice:

| Crop | What the field masks | What the field grips | What it pays |
| --- | --- | --- | --- |
| 100% | PF **0.55** — the stealth biome, as written | Full drag, +30 SIG for pushing through | Full rate |
| 50% | PF **0.72** — halfway to open water | Half the drag, half the drag-SIG | Full rate |
| 0% | PF **0.90** — open water over a bare plateau | Nothing. A stripped bed is not a hazard | Nothing |

PF and drag interpolate linearly with crop between those ends, and the field stops being a
hazard entirely at zero rather than becoming a weak one — a bare plateau is bare.

This is the rule the whole design hangs on. **A navy that harvests its own water un-hides
it.** The Commune farming its home plateau is spending the concealment its doctrine is made
of, and the Consortium cutting a Commune bed is being *paid to take that concealment away*
before a push. Both are the same mechanic read from opposite sides, and neither needed a new
number to exist.

### What a bed is worth

A full field carries **240 Biomass** of standing crop. That is deliberately of the order of a
whole map's fauna seeding (about 916, §5 of this document) rather than a fraction of it: the
account stops being a curiosity and becomes something a navy can be priced against, which is
what #520 and #530 both ran aground on — hulls priced at 40 and 60 Biomass against an income
of two a minute.

Crop is spatial. Half a field harvested is half a field standing, and the half that stands is
the half that still hides you, so *where* you cut is a decision about which approach you keep
dark.

---

## 2. Taking it — three ways, and they are not equal

### The bio-reactor — the committed way

A structure, placed in or beside a bed. It renders standing crop within **400 m** at **12
Biomass a minute** at full crop, sustained **SIG 50** while running — inside the 45–60 band
[economy.md](economy.md) §2 has always specified for a harvest, and inside the register the
Refinery already occupies as *the loudest permanent thing you own*.

It is the recommended way to hold an economy and the easiest thing in the game to lose:

- **It thins its own water.** A reactor consumes the crop around itself first, so the cover
  over a reactor falls as it runs. A mature reactor sits in open water, loudly, having made
  the hole it sits in. Nothing else in the game builds its own vulnerability that literally.
- It is a **commitment to a piece of map**, exactly as the Vent Tap is ([economy.md](economy.md) §5).
- It stops when the crop in range hits zero, and starts again as the bed regrows — so an
  abandoned reactor is not a permanent tap, it is a claim on a field that has to be defended
  for as long as the field is worth having.

### The cutter — the fast, loud, wasteful way

A hull already opens a canopy by standing in it with thermal cutters running: six seconds to
come apart, loud while it does, and closing slowly once the hull leaves
([hazards.md](hazards.md) §4). That mechanic now also **banks what it cuts, at 40%**.

Raw cut mass is unprocessed, so the yield is bad and the point is rarely the money. The point
is that **destroying an enemy's cover now pays for itself**, which is the Consortium's
existing doctrine — *their answer to kelp is to destroy it, not to swim better through it* —
finally given an economy instead of only a speed penalty avoided.

### Bloom-share — the Commune's, and the only one that never runs out

The Commune already earns by **bloom-share**: *"plateau blooms yield continuously, without a
harvester loop, provided the plateau is theirs"* ([economy.md](economy.md) §6, built in
issue #243). A node pays while a live, non-silent Commune hull tends it within 400 m, and
stops the tick it is untended — held is *tended*, not possessed.

That mechanism is kept exactly, and re-founded on the crop: **a bloom node is a bed**, and
what it yields is Biomass. The rule that makes it different from every other mode is the one
its name always implied:

> Bloom-share takes the **interest, never the principal**. A tended bed pays up to what it
> regrows and no more, so it never depletes and never thins its own cover.

So the Commune is paid for *holding a living bed*, and everyone else is paid for *consuming
one*. A reactor is faster and eats the field; a cutter is fastest, worst-paid and eats it
quickest; bloom-share is slow, quiet, endless, and leaves the plateau exactly as green as it
found it. A Commune player who wants more than the interest can cut into the principal like
anyone else — and pays for it in cover, which is their doctrine's whole currency.

The guard-rail this economy was built with survives intact and gets sharper: bloom beds are
**Shelf-band plateau ground**, where everyone can see them and almost anyone can reach them
([economy.md](economy.md) §9). The quietest navy still earns its living on the most reachable
ground on the map — and now that ground is also the cover it hides in, so a raid on a Commune
plateau takes their income and their concealment in the same act.

### Sowing — the Commune's other half

A Commune hull may **sow** a bed: 45 seconds on station at **SIG 18** — their harvest
signature, [economy.md](economy.md) §6 — restoring **25%** crop to the field over the two
minutes that follow.

Two limits, both deliberate:

- **Sowing restores a bed; it does not create one.** Ground becomes Kelp Forest only where a
  mission says so ([campaign.md](campaign.md), the sown furrows) — a skirmish player who
  could grow cover anywhere would be editing the map's acoustics at will, which is a bigger
  change than an economy and belongs to a different discussion if it is ever wanted.
- **It is quiet, and that is the Commune's whole edge here.** Everyone else's relationship
  with the crop is subtractive and audible. The one navy that can put the quiet back is the
  navy whose doctrine is quiet, and it is the only economic act in the game that a listener
  cannot hear at range.

---

## 3. Regrowth — why the map is not shaved bare by minute ten

Crop regrows at **4% a minute**, scaled by the region's Drift Health on exactly the band
table [bestiary.md](bestiary.md) §6 already runs spawns on:

| Drift Health | State | Regrowth |
| --- | --- | --- |
| 100–75 | Healthy | 4% a minute |
| 74–50 | Strained | 2.4% a minute (−40%, the spawn-rate figure) |
| 49–25 | Failing | none |
| 24–1 | Collapsing | none |
| 0 | Dead | none, permanently for the match |

One instrument, read the same way everywhere: the band that stops fauna spawning is the band
that stops kelp growing. A full field cut to bare and left alone in healthy water is back in
about twenty-five minutes — one match — so regrowth is real without being a tap you can farm
in place.

And harvesting **wears the region**, the way a rendering does: 240 Biomass of crop taken out
of a field costs its region Drift Health at the rendered-fauna rate. Strip your own ground
and you push it toward Strained, where the crop grows back at less than half speed and the
animals stop arriving — which is the guard-rail, and it is the same guard-rail the Directorate
already lives under rather than a second one bolted alongside.

---

## 4. The herd eats the crop

Fauna and flora stop being two unrelated systems.

**Fauna density in a region scales with its standing crop.** The Ashgrazer is a grazer; the
Draymaw pack follows what grazes. A plateau stripped to bare rock feeds nothing, so it holds
fewer animals — and that, rather than a timer, is what §6's spawn table has always been
reaching for.

The consequence is the best thing in this design and nobody has to be told it in a briefing:
**the Directorate's income is paid by a crop it does not harvest.** They render animals, at
full rate, on ground somebody else is cutting. A Consortium fleet stripping a plateau for 40%
of its crop is starving the Directorate at one remove, in a way that shows up as fewer
contacts in the water long before it shows up as an account.

---

## 5. Rendered fauna stays — as a windfall

Killing a creature still pays: the Directorate at full rate, everyone else at the rendering
contract rate, exactly as [economy.md](economy.md) §2 and [bestiary.md](bestiary.md) §5 say.
Nothing in the faction fiction is rewritten — *fauna are drawn to your noise, and the
Directorate is paid for what your noise attracts* remains true and remains theirs.

What changes is its weight. A map's whole fauna seeding is worth about **916 Biomass, once**;
four full beds are worth **960, and they grow back**. So rendering becomes the opportunistic
half of the account — the windfall you take because the animal was there and you were loud —
and the beds become the income anybody can plan against.

Two corrections ride along, both of them things #535 filed as separate faults:

- **The kill is credited to the killer**, not to the nearest hull. Today a Consortium hull
  standing near a corpse it had nothing to do with banks three times the creature value the
  Directorate does, which inverts the one structural claim §5 makes.
- **Nothing is paid on a death the map caused.** An eruption boiling an Ashgrazer renders
  nothing, which [bestiary.md](bestiary.md) §6 already says about the health cost and which
  the payout should have agreed with.

---

## 6. What each navy does with a bed

Every navy already has an opinion about kelp ([hazards.md](hazards.md) §4 gives all four one,
with no neutral case). Each opinion now has an economy attached, and none of them is new:

| Navy | In the kelp | With the crop |
| --- | --- | --- |
| **Pelagia Commune** | Moves freely, unheard | **Bloom-share**: tends living beds and is paid the interest, endlessly and quietly; the only navy that can **sow** one. Their cover and their income are the same object, so cutting into the principal is a choice to be more visible later |
| **Bathyarch Consortium** | Dragged like anyone; cuts | Paid **40%** for destroying cover, which is what they wanted to do anyway. The one navy whose economy improves by making the map louder |
| **Abyssal Directorate** | Tears through | Does not farm at all. Their income is the herd, and the herd is fed by beds other people are cutting |
| **Hadron Knights** | Snags worst of anyone | Least interested, by design: the tithe is map-control-independent and their win condition is early ([economy.md](economy.md) §6) |

### What folding bloom-share in costs, honestly

Bloom-share pays **nodules** today, at 0.8 a second per tended node, out of authored map data
with no supply behind it. Folding it into this account costs less than it looks like it
should, and the reason is in the code rather than in the prose:

- **The Commune can already spend Biomass, and no hull is repriced.** Of the seven
  Biomass-priced entries in the roster, only the Precentor and the Dredge are locked to the
  Directorate. The Acolyte (15), the Chorister (20), the Verger (30), the Thurible (40) and
  the Lure (50) are open to any navy — *the price is the lock*. That design has never
  actually worked, because only one navy earns the account; giving the Commune an income
  makes five unlocked hulls reachable by a second navy and the price-as-lock rule start
  doing what [economy.md](economy.md) §8 says it does. Repricing the Commune's own grown
  hulls in Biomass is a **later option, not a prerequisite** — worth doing for the fiction of
  a navy that grows its ships, and worth measuring first.
- **Nothing moves in a skirmish.** No skirmish map authors a bloom node, so the system
  early-returns in every balance-harness match today and the Commune runs harvesters like
  everybody else. The fold is therefore free to make now, and only bites when a map authors
  its first bed — which is the point at which the harness can read it.
- **A bloom node stops being infinite.** It was a tap with no supply; it becomes a bed with a
  crop, and the yield it pays is bounded by regrowth. That is the change that makes it a
  *share* rather than a subsidy, and it is what stops the Commune having two economies.
- **Their nodules become ordinary.** In skirmish they already are. What §6 promises them and
  the sim has never given them — harvest SIG 18 against everyone else's 50, organic refineries
  at 30–40 instead of 55–75 — stays owed either way; this document does not pay that debt.

[mission-tend.md](mission-tend.md) is the one live consumer and the first thing to re-read
when this is built. Its §13 row is where bloom-share was specified, and its objectives are
scripted work-loads rather than account thresholds, so the swap does not touch a predicate.
The contract that mission teaches — *income without a broadcast* — is preserved exactly. The
account it lands in is not.

---

## 7. Numbers, all of them tunable

| Constant | Value | Why this number |
| --- | --- | --- |
| Standing crop, full field | 240 Biomass | Four beds ≈ one map's fauna seeding, so the account can carry a 40–60 Biomass hull price |
| Crop → PF | 0.55 at full, 0.90 at bare, linear | The biome's own figure at one end, open water at the other |
| Crop → drag and drag-SIG | Scales linearly with crop | The field grips because there is kelp in it; less kelp, less grip |
| Bio-reactor radius | 400 m | Smaller than the Refinery's claim; a reactor covers a bed, not a plateau |
| Bio-reactor rate | 12 Biomass/min at full crop | A full bed is 20 minutes of one reactor — a match, so a bed is a claim rather than a tap |
| Bio-reactor SIG | 50 sustained | Inside §2's 45–60 harvest band, beside the Refinery |
| Cutter yield | 40% of crop cut | Raw mass, unprocessed; the yield is bad because the point is the cover |
| Bloom-share yield | Up to the bed's current regrowth, per tended bed | The interest and never the principal, which is what makes it endless |
| Bloom-share tend radius / state | 400 m · live and not silent | Unchanged from #243; Silent Running still stops the work |
| Sow time / SIG / restore | 45 s · SIG 18 · +25% crop over 2 min | Their harvest signature, and a quarter of a field per act |
| Regrowth | 4%/min, by the §6 health band | A stripped field returns in one match, in healthy water only |
| Drift Health cost | Per Biomass taken, at the rendered-fauna rate | Harvesting flora and rendering fauna wear a region the same way |

Every figure above is **TUNABLE** and expected to move once the balance harness has read it.
The two that are *not* free are the crop→PF ends: 0.55 is the biome's spec'd figure
([environments.md](environments.md)) and changing it changes which factions thrive where.

---

## 8. Guard-rails

| Risk | Mitigation |
| --- | --- |
| The map is shaved bare and every match ends in open water | Regrowth is real in healthy water and stops in Strained; harvesting wears the region toward the band where it stops; and the navy doing the stripping is deleting its own concealment while it does |
| The Commune ends up with two economies | It does not: bloom-share **is** their flora economy, folded into this account. One mechanism, bounded by the crop's own regrowth, on Shelf ground anyone can reach — and their nodules now come from ordinary extraction like everybody else's |
| Bloom-share was a tap with no supply | It is bounded by regrowth now, so a tended bed pays forever and pays *slowly*; wanting more means cutting the principal and losing cover for it |
| A bio-reactor becomes a turtle's tap | It thins the water around itself as it runs, so a mature reactor stands in a hole it made, audible at the 50 SIG it earns at |
| Harvesting becomes a micro chore | The reactor is passive once placed; cutting is a thing the Consortium was already doing; sowing is optional and only one navy has it |
| Biomass swings from famine to feast | Four beds are worth about what a whole map's fauna was, and they are the only source that can be planned against — the windfall is capped by the seeding, which does not grow |
| The Directorate loses its identity | It does not farm and does not need to: the herd is still theirs at full rate, and the beds are what feeds the herd |

---

## 9. Prototype mapping

**Nothing here is built.** Today `Match.payBiomass` credits a fauna death to the nearest
non-Drift owner and there is no crop, no reactor, no sowing and no regrowth. The order of
work, and why it is that order:

1. **Beds get a crop, and crop drives PF and drag.** The sim change with no player-facing
   part, and the one everything else reads. The PF grid already rebuilds when a Tetherjelly
   cluster is born or dies (#480), which is the machinery this needs.
2. **Regrowth, on the §6 band table.** Turns the account from a stock into an income; needs
   its own 30-match baseline, because it moves every Biomass figure in the report.
3. **The bio-reactor.** A structure kind, a radius, a rate and a payout.
4. **The fauna windfall, credited to the killer.** `payBiomass` becomes opportunistic and
   correct at the same time.
5. **The cutter's 40%**, on the burn mechanic that already exists.
6. **Bloom-share re-founded on the crop** — the node becomes a bed, the payout becomes
   Biomass bounded by regrowth, and the Commune's roster gains its Biomass column. The
   largest single step, and the one that needs `mission-tend` re-read alongside it.
7. **Sowing**, and the commander's opinion about all of it.

Each step is measured against the stored four-faction baseline before the next one lands.
Steps 1, 2 and 4 are what #535 filed as its three faults; they are not separate work.

---

## Related

- **[economy.md](economy.md)** — the four resources, the noise curve, and the four faction
  economies this one is priced beside
- **[bestiary.md](bestiary.md)** — the Drift, Drift Health, and the rendering the windfall
  keeps
- **[hazards.md](hazards.md)** — kelp fields as a permanent hazard: the drag, the drag-SIG,
  the blast that opens a canopy and the cutters that burn one
- **[environments.md](environments.md)** — Kelp Forest Plateaus, PF 0.55, and the biome that
  is already called bio-rich
- **[systems-echo.md](systems-echo.md)** — why PF is the lever, and what removing cover does
  to a detection
- **[factions.md](factions.md)** — the four doctrines each opinion above belongs to
- **[glossary.md](glossary.md)** — bed, standing crop, bio-reactor, sowing
