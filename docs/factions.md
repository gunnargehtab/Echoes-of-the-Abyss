# The Four Powers

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

Every faction in the Rift is defined by four things: **what they need, what they fear, what they refuse, and what they'd never admit.** A faction that only has aesthetics is a skin. A faction with all four is a culture.

Each is also anchored to one axis of asymmetry — their relationship to **sound** (see [systems-echo.md](systems-echo.md)) and to **depth** (see [systems-depth.md](systems-depth.md)) — so that their mechanics and their politics are the same argument.

---

## What a superweapon is

Each power has one. None is built — they appear in `packages/` only as comments recording their
absence, and the mission documents that have wanted one have approximated it on the world's
clock rather than transcribing it ([mission-the-dome.md](mission-the-dome.md) §13,
[mission-second-chord.md](mission-second-chord.md) §13). So this section is the design being
settled *before* the transcription, which is the cheap moment to settle it (#438).

The earlier drafts were each a sentence, and two of the four sentences decided matches. A spore
mass that blinded every hydrophone across a vast radius for twenty-five seconds, and a lattice
that put everything caught at Tier 0 for twelve, were both *executions* in a game whose entire
skill expression is knowing — the Bloom Surge entry said so itself. The Chorus Call cost
"nothing but cooldown". None of that survives. **A superweapon here is a hazard the commander
fires** ([hazards.md](hazards.md), "The lifecycle"): it has the same four phases weather has,
and it is held to the same rule that an unannounced effect teaches a player the map is
arbitrary rather than dangerous. Six things are true of all four:

1. **It fires from a site the enemy can find.** A stabilised vent, a seeded Veil, a Cantor, a
   paired lattice — a thing on the map, a contact like any other, named at Tier 3. No
   superweapon is fired from the commander's chair at a point of the commander's choosing.
2. **It announces itself before it lands.** Every one has a charge at a stated SIG for a stated
   window, and the window is at least what the slowest hull needs to leave the effect. The
   Lance's is the loudest sound short of the Second Chord; the Surge's is a bed the whole rim
   can classify; the Awakening's charge *is* the weapon; the Collapse rings for ten seconds down
   a corridor built to carry.
3. **Its radius is drawn.** For the firer as a preview before commit, in the manner of the
   ping's rings ([ui-ux.md](ui-ux.md) §6), and for every player who has classified the site,
   from the first tick of the charge. The Surge's cloud is light rather than sound and is
   therefore public outright, like a Lampfry shoal ([bestiary.md](bestiary.md) §4).
4. **Its duration is seconds a hull can act inside of, and the floor is Tier 1.** No superweapon
   takes a hydrophone to Tier 0. [systems-echo.md](systems-echo.md) §4's design note — *the
   player should always know that something is happening* — is a floor every one of these
   stands on, not a preference two of them used to override. Twelve and fifteen seconds of
   knowing *that* and not *what* is dread. Twenty-five seconds of nothing was a loading screen.
5. **It is priced in the faction's own currency.** The Lance spends a vent, the Surge a Veil,
   the Call a Cantor's dome, the Collapse a lattice — each the thing that faction's doctrine is
   made of, and each a thing the enemy can see was spent. Nothing costs only cooldown.
6. **Where it blinds, it blinds both sides.** The Surge and the Collapse deafen the firer's
   hulls inside the radius exactly as they deafen everyone else's — the Spore Veil's trade,
   scaled up ([systems-echo.md](systems-echo.md) §8). The faction that fires one has decided it
   is fine with that; that decision is what the button is for.

The entries below are the four, in those terms. The two that were already bounded — the Lance
warned the whole map from the moment it charged, and the Awakening never steered what it
summoned — kept their shape and gained their numbers. The two that were not were redesigned.

---

## ⛏ Bathyarch Consortium

**"Pressure is a cost. Costs can be financed."**

### Identity

An industrial megacorporation that became a government by accident and has never acknowledged the promotion. Founded 19 PC as a vent-field concession, the Consortium now controls the Rift's thermal grid, its freight corridors, and — through **debt-berth** contracts — roughly 40% of its population.

They are not villains in their own telling. They are the reason there is a Rift civilisation at all. They built the hulls. They ran the air. When Halvard crushed in 14 PC, it was Consortium salvage that recovered the bodies, and they are still, two centuries later, extremely willing to bring that up.

### Governance

The **Ninth Board** — eleven seats, rotating chairs, brutal internal politics. Currently chaired by **Executor Odile Varr-Kest** (see [characters.md](characters.md)).

Item 9 of every Board agenda has been permanently classified for 126 years. It concerns the Mouth. Four Board members have read it. Varr-Kest is one.

### The crisis

**Ninefold Vein is dying.** The founding field, the one on the corporate seal, entered terminal decline in 209 PC. Internal actuarial projection: **eleven years to insolvency** without a new field. The Consortium is not fighting for dominance. It is fighting because the alternative is orderly dissolution, and there is no orderly way to dissolve the entity that owns everyone's air.

### Doctrine — *The Klaxon*

Stealth is a rounding error. Consortium units are the loudest in the game and are built to survive being heard. **+12% damage while SIG > 60.** They advance behind **Baffle Barges**, absorb the alpha strike, and out-repair the exchange.

- **Playstyle:** heavy economy, slow armoured pushes, best repair and static defence, weakest early aggression
- **Depth:** PR-2 baseline, cheapest refits — they buy their way down
- **Weakness:** enormously telegraphed. A Consortium push is audible for four minutes before it arrives. Fauna love them.

### Visual Identity

Blocky, riveted, over-engineered. Steel, tungsten, hazard yellow, rust bleed. Everything is stencilled with an asset number. Hulls are *repaired*, never replaced — Consortium units are visibly patchworked, older armour showing through newer plate. Silhouettes read as **rectangles and cylinders**: no curve unless a pressure vessel demanded it.

**Palette:** `#F2B233` hazard amber · `#8C8378` iron grey · `#3D2B1F` oxide brown · `#0E1418` hull black

### Superweapon — **Thermal Lance**

Redirects a stabilised vent's full geothermal output into a sustained cutting beam. Perfectly
on-brand: *unstoppable, and it warns you*.

- **Site:** a vent the Consortium has stabilised ([hazards.md](hazards.md) §1) — a hazard site
  every player has had drawn since the first second of the match.
- **Charge:** **10 s** at **SIG 95**, omnidirectional, from the vent — the ping's figure, and
  Track to every listener in 2,400 m of open water. The beam's line is fixed at commit and is
  drawn, for the whole charge, for everyone who has the vent classified.
- **Effect:** a beam up to **1,500 m** long and **60 m** wide, held for **10 s**: **120 damage
  per second to structures, 40 to hulls.** A Corvette that stands in it for the full channel is a
  Corvette that has died; one that takes two seconds to step out of it has paid 80. A Bastion
  cannot step out of anything, and 1,200 off 5,000 is the argument for the Lance's range being
  the build radius: it reaches what was built within reach of the vent, and nothing else.
- **Price:** the vent is spent — it drops out of stabilisation, returns to its natural cycle,
  pays no draw, and must be stabilised again, which is a Consortium hull standing in the vein
  band being loud ([economy.md](economy.md) §2). **300 s** before the same vent can be fired
  again.
- **Counter-play:** kill the stabilising hull during the charge, or step out of a line you can
  see. The Klaxon does not sneak; it never claimed to.

### What they'd never admit

The Board knows the debt system is indenture. They have modelled the alternative. The alternative kills more people. They have decided they can live with being the villain of a story where everyone survives.

---

## 🌿 Pelagia Commune

**"We do not own the bloom. We are part of it."**

### Identity

A bio-radical agricultural collective born in 33 PC when the kelp plateaus refused Consortium grain-debt terms. Two centuries later they feed the Rift — the *only* pleasant food in existence comes from Commune plateaus — and this makes them simultaneously beloved, indispensable, and militarily contemptible.

Their technology is grown, not built: algae reactors, chitin composite hulls, muscle-driven propulsion, symbiotic sensor organisms. A Commune vessel is closer to a domesticated animal than a machine, and the crew's relationship with it is correspondingly strange to outsiders.

### Governance

Direct-democratic **bloom-collectives**, coordinated by a rotating **Tidespeaker** with almost no unilateral authority. Currently **Tidespeaker Ysolde Marr**, who is the most popular person in the Rift and cannot order anyone to do anything.

The Commune's structural weakness is its virtue: it genuinely cannot mobilise quickly, because mobilising requires everyone to agree.

### The crisis

**Deepbloom.** In 204 PC the Commune proved engineered algae can seed at 2,200 m. This is the single most important scientific result in two centuries — it means habitable depth can be *manufactured* rather than inherited. It also means the Directorate's monopoly on the deep has an expiry date, and the Directorate has said, in writing, that a second seeding is an act of war.

The Commune intends to seed again. They consider this gardening.

### Doctrine — *The Veil*

Lowest SIG in the game. Harvest at 18 SIG where others harvest at 50. Silent Running costs them only −20% speed. They win by being where you aren't and by out-economying you in ground you didn't think was worth contesting.

- **Playstyle:** fast, stealthy, high-mobility, strong economy, poor direct engagements
- **Depth:** PR-1 baseline, terrible refits — but **Deepbloom structures slowly convert Abyssal tiles into habitable ones**. They don't survive the deep; they *terraform* it
- **Weakness:** loses any fight it didn't choose. A Commune army caught in the open by Consortium heavies simply dies.

### Visual Identity

Organic, curved, asymmetric. Chitin and algae composite in deep green-teal, veined with living bioluminescence that **pulses with the unit's health** — a wounded Commune unit visibly dims. Hulls have growth rings. Nothing is painted; colour is pigment, and pigment is alive. Silhouettes read as **leaves, seed-pods, and swimming things**.

**Palette:** `#1FA67A` algae teal · `#8FE36B` bioluminescent green · `#E8F0A3` spore pale · `#0B241E` deep chlorophyll

### Superweapon — **Bloom Surge**

A Spore Veil that ripens and bursts. It does no damage. It takes the *what* out of a circle of
water for fifteen seconds and leaves the *that*, in a game built entirely on knowing — and it is
the Veil's own trade, scaled up: it hides them from you and you from them, and the Commune is
fine with that.

- **Site:** a seeded Spore Veil ([units.md](units.md)) — a structure, 450 nodules and 90 s to
  grow, and a contact named at Tier 3 like any structure.
- **Charge:** **20 s** of ripening — the hazard framework's warning window, sized so the slowest
  hull in the roster can leave the largest plume ([hazards.md](hazards.md)) — with the bed at
  **SIG 45**, the loudness of a working harvester, and the cloud visibly swelling. Everyone who
  has the Veil classified sees the 1,200 m it will fill.
- **Effect:** the cloud fills **1,200 m** for **15 s**, and every hydrophone inside it — friend
  and foe — is capped at **Tier 1**. You know something is there. You do not know where, what, or
  how many, and a gun without a bearing has no solution. The cloud is light, not sound, so its
  edge is public and drawn for every player, exactly.
- **Price:** the Veil is consumed, and with it the 350 m of concealment it was giving. The
  Commune's own hulls inside are as deaf as anyone's. The floor on a second Surge is a second Veil:
  110 s and 450 nodules.
- **Counter-play:** it ripened for twenty seconds in a circle you were shown. Leave it, or hold
  the edge and wait fifteen. Against a Directorate player it is no longer an execution; it is a
  quarter of a minute in which the best ears in the Rift are ordinary, at a place and time they
  were told.

### What they'd never admit

They rank each other by plateau altitude, exactly like everyone else, while formally denying that depth-status exists. And a growing minority faction — the **Deepbloom radicals** — believe the Rift should be terraformed whether the Directorate consents or not. That's a war of conquest with a botanist's vocabulary, and Marr knows it.

---

## 🦑 Abyssal Directorate

**"The deep does not need to be survived. It needs to be answered."**

### Identity

Authoritarian trench-dwellers descended from the 52 PC **Deep Cohort Programme** — settlers who chose germline modification over hull engineering. Eight generations later they are not quite the same species. Larger hearts, restructured haemoglobin, collapsible ribcages, tapetum-backed eyes. They are the only humans who can walk out of an airlock at 3,000 m and simply *live*.

They are also the Rift's most functional society. No debt. No wage. Universal housing, medicine, and purpose. Directorate citizens are measurably healthier and report higher life satisfaction than anyone else in the Rift — and none of them chose any of it. You are assigned a cohort at birth, modified for a depth band, and you belong to it.

**This is the uncomfortable fact the game refuses to resolve.**

### Governance

The **Undermarshalcy** — a military-theocratic command structure headed by **Undermarshal Setha Korrin**. Beneath her, the **Cantorate** manages the Deep Choir: the state religion of *attending* to the Mouth.

### The crisis

Korrin has read the dream transcripts. All 6,000 pages, collected from crews stationed near the Mouth since 88 PC. The Directorate has never published them.

In 213 PC the Mouth's cycle shortened from 43 hours to 39. The transcripts predicted this. They predicted it in 96 PC. Korrin's problem is not military. It is that she now believes the Choir is not a metaphor, and she cannot say so without shattering the Cantorate's careful position that the Mouth must be attended, never understood.

### Doctrine — *The Listening*

Best hydrophone ratings by a wide margin — Directorate units detect one resolution tier higher than anyone else. Their **Cantors** project 1,200 m listening domes. They know first, and they arrive in numbers.

They also **harvest fauna** for Biomass, and fauna are drawn to noise — *your* noise. The Directorate is structurally rewarded for letting you be loud near their ecosystem.

- **Playstyle:** swarm tactics, cheap expendable cohorts, superb information, slow units, poor micro-intensive play
- **Depth:** **PR-3 baseline, no refit needed.** Free access to the map's richest third
- **Weakness:** **shallow water poisons them.** −20% speed and −15% HP above 400 m. The Rift's most feared army can be beaten by refusing to descend.

### Visual Identity

Spiked, insectoid, chitinous. Abyssal shell in bruise-black and deep violet, shot through with **red biolights** arranged in the asymmetric patterns of real deep-sea photophores. Units look *grown* and *disciplined at once* — organic forms in rigid military formation. Silhouettes read as **crustacean, segmented, many-limbed**. Nothing is symmetrical; everything is regimented.

**Palette:** `#7A1B2E` abyssal red · `#2D1B3D` bruise violet · `#0A0710` trench black · `#C2465E` biolight crimson

### Superweapon — **Trench Awakening**

A sustained infrasonic call that summons the Rift's fauna. The Directorate does not control what
arrives, and it does not choose where it arrives either — it chooses where to stand. They simply
know, better than anyone, what it will do when it gets there.

- **Site:** a Cantor. The call is sung, and a singer is somewhere.
- **Charge:** there is none apart from the weapon, because the weapon *is* an announcement:
  **30 s** at **SIG 80**, omnidirectional, Track to everything in earshot. Every listener who
  classifies the singing Cantor sees the ring the call reaches — the range at which the map's
  creatures hear it at Commit.
- **Effect:** the call is weighted **×3** to fauna, as a ping is ([bestiary.md](bestiary.md) §2),
  and the Directorate's own ×0.4 does not shield the singer — a call is meant to be answered.
  Every creature that hears it at Commit closes on the Cantor, at its own speed; a Sounder in its
  corridor answers as it answers a ping ([bestiary.md](bestiary.md) §4). When the call ends, what
  arrived attacks the loudest thing it can hear, which is whoever is fighting there. The ladder
  is deterministic and every commit has its tell ([bestiary.md](bestiary.md) §8), so the
  Awakening is an argument about the ladder rather than a roll of it.
- **Price:** the Cantor's dome is withdrawn for the call and for **60 s** after it; the Cantor is
  Track to every hydrophone in 2,400 m for the thirty seconds; and it cannot call again for
  **180 s**. What it summons does not distinguish cohorts from concerns once the singing stops.
- **Counter-play:** kill the singer, or be quieter than the Directorate when the animals arrive
  — which, against the loudest navy in the game, is the whole of the Directorate's plan.

### What they'd never admit

The Cohort Programme has a failure rate. Roughly 8% of each generation cannot adapt and are quietly reassigned to shallow-band labour — the one job in the Directorate that resembles the debt-berth they despise. And Korrin's real fear is not the Commune or the Consortium. It's that the Choir is *asking for something*, and that the Directorate has spent 120 years preparing to give it.

---

## 🔷 Hadron Knights

**"Something is speaking. It is discourteous not to reply."**

### Identity

A magneto-kinetic techno-order founded in 118 PC by schismatic Consortium acoustics engineers and the disgraced Sull family. Small — perhaps 30,000 souls, the least populous power by an order of magnitude — and disproportionately powerful because they alone can work resonant crystal.

Entry is by acoustic aptitude testing at age nine. Those who pass enter a chapter-house and learn crystal-craft, resonance mathematics, and the liturgy of the Answering. Those who fail return home. The Knights are the only faction that cannot grow, and they know exactly how many years of relevance that leaves them.

### Governance

Nine **chapter-houses**, each a physical instrument built into a Resonance Field, coordinated by the **Choirmaster** — currently **Ivane Sull**, great-great-granddaughter of the surveyor who first recorded the Mouth's anomaly and was fired for it.

### The crisis

The **Second Chord**. The First Chord, completed 178 PC, transmitted into the Mouth and received a reply *forty-one seconds early*. Three technicians never regained speech. The Second Chord is designed to transmit something *structured* — an actual message.

It requires more resonant crystal than exists in Knight territory. It requires the Mouth's own rim deposits. And with the cycle at 39 hours and shortening, Sull has calculated a window: **build it now, or the thing at the bottom stops waiting.**

She has not told the other chapter-houses what she thinks happens then.

### Doctrine — *The Score*

Sound is their weapon, not their liability. Knight SIG is high but **directional** — emissions focus into cones, so they are deafening in front and quiet on the flank. Positioning determines who hears them.

The shape is a quartered circle, measured from the hull's own bow: **×1.00 inside the 90° cone, ×0.35 on either flank, ×0.10 in the wake** ([systems-echo.md](systems-echo.md) §8, which owns the numbers and the reasoning). Averaged over the compass that is 0.45, so a Knight is an ordinary hull with its loudness *moved* rather than a quiet one — and the ping, which is omnidirectional, is the one thing they own that ignores the doctrine entirely.

**Standing Wave** nodes create lines of sonic damage between paired emitters and raise local PropagationFactor to 2.0 — turning corridors into megaphones that harm everyone equally, including them.

- **Playstyle:** elite, expensive, few units, extremely high skill ceiling, dominant mid-game, fragile if outnumbered
- **Depth:** PR-2, instant refits paid in Resonance. **Sounding Spires** grant allied units +1 PR within 600 m — depth access as a support ability
- **Weakness:** cannot replace losses. Every Knight unit lost is a real, permanent strategic cost.

### Visual Identity

Symmetrical, blade-like, crystalline. Polished pale alloy and violet resonance crystal, with hard geometric facets and mirror-finish surfaces that catch light no other faction produces. Units hum — visibly, with heat-shimmer distortion around active crystal. Silhouettes read as **instruments and blades**: precise bilateral symmetry, the only faction with it.

**Palette:** `#8B5CF6` resonance violet · `#E6E9F2` alloy white · `#3B2E5A` shadow indigo · `#C9A6FF` crystal glow

### Superweapon — **Resonance Collapse**

Simultaneous detonation of a paired lattice: no damage, and inside a line you watched them draw,
twelve seconds in which nobody's hydrophones resolve a bearing. The Knights do not kill you. They
remove you from the conversation — briefly, and at a price they cannot pay twice without paying
for it in crystal.

- **Site:** a paired lattice — two Standing Wave nodes within 1,500 m with a corridor standing
  between them ([systems-echo.md](systems-echo.md) §8). Two structures, both named at Tier 3.
- **Charge:** **10 s** with both nodes ringing at **SIG 80**, down a corridor that carries at
  2.0 — the loudest fixed thing on the map. Everyone who has either node classified sees the
  footprint for the whole ten seconds.
- **Effect:** the corridor's own water — the line between the nodes, **600 m** either side of it
  and 600 m past each end, the radius the Spires already grant across — for **12 s**. Every
  hydrophone inside, friend and foe, is capped at **Tier 1**; a torpedo seeker inside loses its
  lock; a gun without a bearing has no solution. Not Tier 0: you know they are coming, and you
  do not know from where.
- **Price:** both nodes are destroyed, the corridor is gone, and — in the Fields, where the Order
  builds — the cells the corridor had un-scattered scatter again ([systems-echo.md](systems-echo.md)
  §3). The Collapse hands the water back to the crystal. A second Collapse is two more Spires,
  which is Resonance the thinnest economy in the game does not have to spare.
- **Counter-play:** the lattice is two buildings on a known map, the charge is ten seconds of
  the loudest thing the Order owns, and the footprint is a line. Stand off it, or come in from
  outside it when the nodes go — the Knights inside are as deaf as you are.

### What they'd never admit

The First Chord's three mute technicians are alive, in a chapter-house at 2,900 m, and they **write**. What they write is transcribed, sealed, and read only by the Choirmaster. Sull has never told anyone that the transcripts match the Directorate's dream records, word for word, across two hundred years and two organisations that have never shared data.

---

## Asymmetry Summary

| | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| **Sound** | Loud, endures it | Quiet, avoids it | Listens best | Weaponises it, directionally |
| **Depth** | Buys access | Terraforms access | Born to it | Projects access |
| **Economy** | Industrial, richest | Organic, most efficient | Fauna-harvest, scaling | Crystal-gated, thinnest |
| **Army** | Few, heavy, tough | Many, fast, fragile | Very many, cheap, slow | Very few, elite, precise |
| **Wins by** | Attrition | Map control | Information + numbers | Positioning + burst |
| **Loses to** | Being outmanoeuvred | Being caught | Being denied the deep | Being outlasted |
| **Fears** | Insolvency | Being made to fight | Being wrong about the Choir | Extinction by arithmetic |

---

## Related

- **[characters.md](characters.md)** — the people running all this
- **[units.md](units.md)** — full rosters
- **[art-direction.md](art-direction.md)** — silhouette and palette law
- **[campaign.md](campaign.md)** — how these crises collide
- **[world.md](world.md)** — the descent that produced all four, in a paragraph each
- **[world-map.md](world-map.md)** — the ground each holds: the plateaus, the west wall, the Fields, the trench country
- **[habitats.md](habitats.md)** — inside their cities: the Holding, the plateaus, the chapter-houses, Sufficiency
- **[timeline.md](timeline.md)** — 19, 33, 52 and 118 PC, and the four crises dated
- **[culture.md](culture.md)** — the register each doctrine is argued in
- **[glossary.md](glossary.md)** — the Klaxon, the Veil, the Listening and the Score, defined as a set
