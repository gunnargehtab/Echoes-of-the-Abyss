# Audio Direction — The Mix Is the Fog of War

> [systems-echo.md](systems-echo.md) §9 states it as a requirement: *"Audio mix is the primary channel. A Tier-1 contact should be heard before it is seen."* This document is that requirement, specified.

**Glossary:** See [Glossary](glossary.md) for authoritative term definitions (SIG, PF, HYD, PR, Resolution Tiers, Active Sonar, Silent Running, Echo Marks).

---

## 1. Premise

In most games audio is confirmation — the explosion you already saw. Here it is **delivery**. The Echo Layer resolves what each player is allowed to know ([systems-echo.md](systems-echo.md) §4), and the mix is the first place that knowledge arrives. Muting the game does not make it prettier and harder; it makes it a different, worse game, and the design accepts that trade openly by requiring a full visual mirror for accessibility (§11).

Three laws govern everything below.

1. **Audio leads.** Every detection event is audible before it is visible.
2. **Fidelity is honest.** The mix may never sound more certain than the server is. A directionless contact must not be pannable, because panning is a claim about bearing.
3. **Your own noise is audible to you.** Players must *hear* themselves being loud, not read it off a meter and take it on trust.

---

## 2. The Precedence Law

The Echo Layer ticks at **5 Hz** ([tech-stack.md](tech-stack.md)), so a detection can be up to 200 ms old before the client ever learns about it. Within a tick, the ear must beat the eye:

| Event | Timing, relative to snapshot applied |
| --- | --- |
| Contact voice onset | ≤ 30 ms |
| Minimap mark begins to fade in | ≥ 150 ms |
| Minimap mark reaches full opacity | ≥ 400 ms |
| World-space contact mark begins to fade in | ≥ 250 ms |

The fade-in is not decoration; it is the budget that keeps the precedence law true on every machine. A mark that pops instantly races the audio device's own output latency and will sometimes win.

**Failure mode this prevents:** if the eye leads, players stop listening within one match, the mix becomes ambience, and the Echo Layer degrades into a conventional fog-of-war with a nice soundtrack.

---

## 3. Sonifying the Resolution Tiers

Each tier gets a **voice** — a looping or one-shot sound bound to that contact for as long as the contact is tracked, including its 20 s ghost decay ([systems-echo.md](systems-echo.md) §4).

| Tier | Sound | Spatialisation | What it must never do |
| --- | --- | --- | --- |
| **1 — Contact** | A low pressure-thump, 40–90 Hz, irregular period 1.2–2.5 s | **None.** Dead centre, no distance attenuation | Pan. Change pitch with range. Sound like a specific thing |
| **2 — Bearing** | Thump plus a filtered wash | Panned to bearing; low-pass and level track distance | Carry class information in its timbre |
| **3 — Classification** | Drive signature of the unit's family (§8), still lightly veiled | Full azimuth, distance-filtered | Reveal health or exact position |
| **4 — Track** | Full drive loop, cavitation detail, and a single short lock tone on acquisition | Full azimuth and distance, matched to the rendered position | Sustain the lock tone — it fires once |

### Panning is information

This is the rule the whole section exists to protect. Stereo position is the player's ear reporting a bearing, and at Tier 1 the server has not given them one. A Tier-1 voice is therefore **mono, centred, and level-locked**, and it is the only sound in the game with that treatment — which makes it instantly identifiable as *"something is out there and I do not know where."*

### Decay

Ghost markers decay over 20 s. Their voices decay with them: level falls on the same curve as marker alpha, and the loop's period lengthens by up to 40% so a fading contact audibly slows rather than simply thinning. Contacts refreshed by a new detection snap back to full level in 80 ms — the return of a sound that was dying is itself a warning.

---

## 4. Your Own Loudness

The SIG meter ([ui-ux.md](ui-ux.md) §3) is the readout. The **self-noise bed** is the feeling.

| Your peak SIG | Self-noise bed | Effect on the rest of the mix |
| --- | --- | --- |
| 0–15 | Hull creak, distant water movement | World bus open, contacts clearly audible |
| 16–40 | Drive hum enters, low harmonic | Neutral |
| 41–65 | Machinery layer, rhythmic | World bus −3 dB: you are starting to drown yourself out |
| 66–100 | Full plant noise, cavitation, structural rattle | World bus −8 dB, contact band partially masked |

**Being loud makes you deaf.** This is not a simulated hydrophone limitation applied to detection maths — detection is unaffected — it is a mix behaviour that makes the cost of noise felt before it is understood. A player at SIG 80 is, correctly, having trouble hearing.

Silent Running inverts it: the self bus drops **−18 dB** over 600 ms and the world bus opens **+6 dB**. The world gets louder because you got quieter, and the first time a player toggles it the map audibly fills with things that were always there. That moment is the sales pitch for the entire system.

### The Lid — sour exposure

The self bus carries one more fact about your own force, and it is not loudness at all. A hull above 150 m is in the sour water the Salinity Collapse left behind: twenty seconds of grace, then unhealable bleed until it dives back under ([systems-depth.md](systems-depth.md) §2). It is here because the self bus is where facts about *your own* force live — the Lid is not the interface talking, and it is not a detection.

It is three sounds because the mechanic is three states, and the split matters more than the timbres do.

| State | What the mix does | Why |
| --- | --- | --- |
| **Souring** — the grace running | A thin, dry, upper-mid texture ramped in over ~1 s, level rising with the grace **spent** | State, not news. Drifting up into the Lid is heard as the mix changing, not as an alert, and the rise *is* the countdown |
| **The bite** — the grace expiring | One short descending figure on the self rung, 1.5 s | News, and the only transient the Lid gets. It is the moment the ledger opens |
| **Bleeding** — the grace gone | The same texture at full level, pulsing at 0.6 Hz | State again. A pulse rather than a tone, because a bleed is being *paid* — but a soft attack, so it never reads as a fresh event |

**The souring texture claims no precedence rung.** It is bed, and a bed that ducked the contact bus would make the Lid deafen you — the bands above already own "being loud makes you deaf", and sour exposure is not loudness. The player in the Lid is bleeding, not deaf. Only the bite ducks, and it ducks on the ordinary `self` rung, below the exposure strike: being lit is still the loudest thing that can happen to you.

**§11 is already half paid, and the bite pays the rest.** The screen has carried the Lid since Phase 4 — the ribbon's threat hatch, the card's grace countdown, the `SOUR — BLEEDING` line — so the *states* have their visual equivalents. What had none was the moment, and a player looking at a different hull's card would never have learned it happened. The bite therefore writes an own-force row into the contact log ([ui-ux.md](ui-ux.md) §10) naming the hull, exactly as a blow on the plating does. The ear gets one sound for a simultaneous crossing and the log gets a row per hull, which is the one place the two are allowed to differ — see the paragraph below for why.

**It keys to the worst hull in the fleet, like the bed keys to fleet SIG.** Twelve stacked textures would be mud, and the question the bed answers is "is my force in the sour", not "how is hull seven". The bite is per hull, because losing a *particular* hull's grace is news about that hull — but several hulls crossing on the same Echo tick sound once. Six copies of one sound at one instant is not six pieces of news; it is one piece of news at six times the amplitude, which would spend the headroom §12 reserves for exposure.

### How it relates to the crush cue

**There is no crush cue.** `Damaged` fires for violence only and excludes attrition explicitly (§12), so the bottom of the column is currently silent — and sour exposure is therefore the first attrition the mix has ever voiced. That makes this section a reservation as much as a decision.

If crush is ever given a voice, it **may not be this one**, and not a variant of it. The two share a ledger and nothing else: they are opposite instructions. Crush says *rise*; sour says *dive*. A cue the player cannot resolve into a direction is worse than silence, because it spends their attention and then declines to say what for — and a hull that answers a crush cue by rising into the Lid has been actively misled by the mix.

So the register is claimed here: **sour descends** — the bite falls, the texture is thin and high and asks to be got away from downward. A crush cue must **rise**, and must live in the low band the hull already occupies, where the sour texture deliberately does not go. Neither may be built from the other's material.

---

## 5. Active Sonar

The ping is the game's signature decision ([systems-echo.md](systems-echo.md) §5) and it needs **three distinct audio events**, none of which may be confused for another.

- **Transmit** — a 1.5 s outgoing sweep, dry, loud, unmistakably *yours*. It is a commitment sound: it must feel like slamming a door.
- **Return** — echoes arriving over the following 3 s, ordered by range so near contacts return first. The player literally hears the sweep resolve the map. In a **Resonance Field** the returns arrive from wrong bearings and one to three of them are false ([environments.md](environments.md)) — audibly wrong, so the terrain teaches its own rule. Both are *sent*, not synthesised: the server reports the scattered bearing and the phantom as contacts ([systems-echo.md](systems-echo.md) §3, "Scattered water"), so the mix renders them exactly as it renders a true return and has nothing to add.
- **Exposure** — what an *enemy* ping sounds like when it resolves you: a hard, close, panned strike, followed by a two-second tail. There is no visual equivalent that arrives sooner. **If you have been lit, you know.**

Every unit that pings also triples its fauna aggro contribution ([bestiary.md](bestiary.md) §2). The Sounder's answering call is a distinct, extremely low, non-directional sound that plays before any fauna contact resolves — the only sound in the game that means *you have made a mistake that is now coming.*

**That sentence is now load-bearing.** [campaign.md](campaign.md) §10 forbids a mission failing on a timer alone: every failure state must be something the player can hear coming for at least sixty seconds, and this is the sound that pays that debt. It is built to be useless as intelligence and complete as a warning. Non-directional, so it cannot be plotted; below any tier, so it cannot be tracked; arriving before the thing it announces has resolved into a contact, so the screen confirms nothing. The player is told exactly one fact and handed the time to act on it, which is the difference between dread and confusion.

It therefore has to survive §4. A player at full plant noise is having trouble hearing contacts by design, and this is the one voice that must not be a casualty of that: it rides the **world** bus at a level the −8 dB duck cannot bury, because a warning masked by the player's own loudness is a mission lost to the mix. §11 binds it the same way — the call needs its visual equivalent or the sixty seconds are only granted to players who can hear. [mission-sorrowgate.md](mission-sorrowgate.md) §8 is the first failure state built on this, and the lead it gives is longer than the rule asks for.

---

## 6. Echo Marks — The Sound of the Past

Echo Marks are residue, not presence ([systems-echo.md](systems-echo.md) §7), and the mix must say so. Their rule is simple: **no transients.** A mark's sound is reverb-only — the tail of an event with the event removed, band-limited to 120–800 Hz, and always at least 6 dB below the live contact bus.

| Mark | Sound | Duration |
| --- | --- | --- |
| Battle site | Overlapping metallic decay, no strikes | ~90 s |
| Destroyed structure | Slow settling groan, descending | ~3 min |
| Industrial hum | Steady, tonal, unhurried — the sound of someone else's economy | Slow decay |

If a player can mistake a mark for a contact, the mark is mixed wrong. If a player can mistake a mark for *nothing*, it is mixed wrong in the other direction, and the scouting economy dies.

**Implemented as three continuous beds, one per mark kind, rather than a voice per mark.** A voice per mark would have onsets, and an onset is a transient: the moment a scout drifted into range of a ninety-second-old battle site, the mix would announce it like a detection. The past does not announce itself. Each bed's level follows the summed intensity of that kind of residue the player can currently read, saturating rather than adding linearly, on a ramp far too slow to be heard as an attack.

The beds ride the **world** bus, not the contact bus. Residue is the environment remembering, not a detection — which also means §4's own-noise attenuation makes a loud player deaf to the past exactly as it does to the present. They carry no pan: a bed that panned would claim a bearing the mark layer never resolved. Where residue *is* lives on the screen, which is where [ui-ux.md](ui-ux.md) §11 wants it.

---

## 7. Fauna

Fauna share the Tier-1 sound space **on purpose**. A thump at 40–90 Hz may be a Hollow drifting past a trench wall or a Consortium column at the edge of hearing, and at Tier 1 the game will not tell you which. This is where dread comes from: the ambiguity is real, generous, and constant, rather than rare and punishing.

Fauna voices resolve upward like any other contact — at Tier 3 a Rasp swarm is unmistakably not a fleet. Full behaviour, thresholds and per-species tells are in [bestiary.md](bestiary.md).

**What a creature resolves *to* is a voice of its own, not the absence of one.** At Tier 3 it carries the organic-mass family of §8.1: a low tonal body and a swell so unhurried no navy could be mistaken for it — one event every four to eight seconds, wandering. That is what makes "unmistakably not a fleet" a positive claim. An anonymous voice meets the sentence only in the weak sense, which a quiet room also meets.

One family for the whole bestiary, not one per species. The per-species tells stay visual and behavioural ([bestiary.md](bestiary.md)); the ear is told *creature*, and which creature is the screen's to say.

---

## 8. Faction Timbre Families

A player must identify a faction at Tier 3 by ear alone, with no visual. Each family owns a distinct mechanism of sound production, not just a distinct EQ curve.

| Faction | Sound of | Core material | Signature |
| --- | --- | --- | --- |
| **Bathyarch Consortium** | Machinery under load | Steel, reciprocating, rhythmic | Repeating mechanical period; the only faction with a *beat*. Audible from absurd range and completely unbothered about it |
| **Pelagia Commune** | Breathing | Muscle, fluid, arrhythmic | No periodicity. Pulses that never quite repeat. Nearly gone under 20 SIG |
| **Abyssal Directorate** | Many small things agreeing | Chitin ticks, layered voices | Clicks that phase into unison as cohorts converge — you hear them *organise* |
| **Hadron Knights** | Pure tone | Crystal, sustained, harmonic | Narrow-band pitched drones. Directional in the mix exactly as their SIG is directional: deafening in the cone, nearly silent on the flank |

The Knights' entry is the one that must not be softened. Their emissions are a cone ([factions.md](factions.md)), so the mix places them off-axis at up to −20 dB. A player who walks into the beam hears the volume change and that *is* the tell.

**Those decibels are now the model rather than a mix decision**, which is §1's second law working in the direction it was written for. [systems-echo.md](systems-echo.md) §8 spec's the directional term as ×1.00 in the cone, ×0.35 on the flank and ×0.10 in the wake — 0 dB, −9 dB and −20 dB — so the flank has a level of its own and the −20 dB is the wake specifically. The mix is not asked to invent an off-axis curve; it renders three sectors the server already resolved.

### 8.1 Non-Navy Families

A contact can belong to no navy. The Echo Layer sends no faction for a creature or a piece of ordnance on purpose — a creature belongs to nobody, and a meaningless slot would let a client infer fauna one tier before it earned it. So the table above has nothing to say about either, and a mix that borrowed a row from it would be asserting a fact the server never sent (§2).

Two families, on the same terms as the four above: each owns a mechanism, and the mechanism is what the player learns.

| Family | Sound of | Core material | Signature |
| --- | --- | --- | --- |
| **Creature** | Organic mass, moving | Muscle and water, very large | A low tonal body and a slow arrhythmic swell, one event every four to eight seconds. The slowest mechanism in the mix by a wide margin, and that is the tell — nothing a navy owns is that unhurried |
| **Ordnance** | A small screw, running | Machined, thin, turning fast | A hard tone a register above every drive signature, pulsing about four times a second, close to regular and never quite. Fast where the creature is slow |

**Two, not fifteen.** A voice per species and per kind would put eleven new signatures into the 40–160 Hz octave §11 already flags as the one laptop and phone speakers do not reproduce, and a distinction the target hardware cannot render is not a distinction. Fifteen learnable signatures is also the confusion half of dread-not-confusion.

**The beat stays the Consortium's.** Both families wander, and the screw is the one that had to be made to: four events a second on an exact period is a beat, whatever the row it sits in is called.

**Separation is a property, not a preference.** No two mechanisms in this game may produce the same interval between events. Each family's period band — its rate, widened by its own wander — is disjoint from every other's, with the slower band's shortest interval at least 1.2× the faster band's longest. Each family's fundamental sits at least 10 Hz clear of every navy fundamental and of every octave of one inside the audible band, so no family is heard as another detuned.

The creature is separated from the Commune by **scale**, not by arrhythmia. Both wander; the creature's shortest swell is longer than the Commune's longest breath. The screw is separated from the Directorate the same way and in the other direction: a screw faster than the Directorate's clicks would be the same mechanism heard at a different rate, and the mix already renders the Directorate as the fastest thing on the bus.

---

## 9. Biome Acoustics — PF as Signal Processing

PropagationFactor is a number in the detection maths and a **DSP chain** in the mix. The two must agree; a biome that masks you mechanically but sounds open is a lie.

| Biome | PF | Filter | Space | Special |
| --- | --- | --- | --- | --- |
| Open mid-water | 1.0 | Neutral | Medium tail, ~2.5 s | Reference |
| Thermal Vein | 0.45 | Broadband vent roar raises the noise floor +12 dB | Short, chaotic | Masking is *audible as masking* — you can hear that you cannot hear |
| Kelp Forest | 0.55 | Steep HF absorption above 2 kHz | Very short tail, ~0.8 s | Everything sounds close and dead |
| Abyssal Trench | 1.6 axial | Neutral on-axis, HF loss off-axis | Long delay taps along the axis, 180–400 ms | Contacts arrive *twice*; the second arrival is the trench, not a second unit |
| Resonance Field | 0.7 scattered | Comb filtering, slow phase drift | Diffuse, unlocatable | Returns from wrong bearings; false contacts sound identical to true ones |
| Coral Ruins | 0.8 occluded | Hard occlusion behind geometry | Strong early reflections | Acoustic shadows are sharp — one step sideways restores a contact |
| Thermocline boundary | 0.3 across / 1.2 along | Heavy low-pass across the layer | — | Crossing it is a *whoomp*: the map changes state in the mix |

### Tuned water — the Fields' bed

The table above is six colours. Every row of it changes how a contact *sounds*, and not one of
them has a pitch in it, because a colour cannot be out of tune.

The Resonance Fields are the exception, and they are the first water in the bible that is. Crystal
formations resonate under any pressure change — a storm, a passing hull, a distant detonation — so
crystal country sounds faintly and never quite settles, and the Order reads that chime the way the
Directorate reads silence ([mission-aptitude.md](mission-aptitude.md) §7). The Fifth is named for
the interval its walls ring at, by people who meant it literally
([mission-standing-wave.md](mission-standing-wave.md) §1). **So the Fields get a bed with notes in
it**, and once the water has a pitch, a thing standing in the water can be *sharp* or *flat*
against it. That is what the rest of this section spends.

**The pitches are just, not tempered.** A chapter-house is "a physical instrument tuned over
generations" ([mission-aptitude.md](mission-aptitude.md) §1), and nothing tuned by ear over
generations lands on equal temperament. The fifth is exactly 3:2 and the third exactly 5:4, which
is also what gives *goes flat* a number to be measured against.

| Voice | Pitch | Level | When |
| --- | --- | --- | --- |
| **Root** | 880 Hz | Bed ceiling × crystal share | Wherever crystal is within earshot |
| **Fifth** | 1,320 Hz — 3:2 | 0.70 of the root | With it, always. This is the canyon |
| **Third** | 1,100 Hz — 5:4 | 0.55 of the root, × rise | Where the formation stands proud of its slope |
| **Corridor** | 1,320 Hz, panned | Corridor ceiling × range | While a Standing Wave stands (§4 below) |

**Register, and why it is up there.** §6 confines residue to 120–800 Hz and §10 gives 40–160 Hz to
contacts permanently. Every voice of this bed is above both — 880 Hz is also where the port's cold
partials start (§10, "The port"), which is not a coincidence but a decision already made: this game
has settled what crystal sounds like, and it is thin and high and pure, the same material §8 gives
the Knights. **The one cost is that the bed shares the register the in-game score would use.** The
score is unwritten; when it is written it must leave the fifth alone, in the same way it already
leaves the contact band alone.

**Level.** The bed's ceiling is 6 dB under the mark bed, which §6 already put 6 dB under the live
contact bus. So the water sits 12 dB under the contacts it carries and 6 dB under the memory of
them, which is the right order — the ocean is the least urgent true thing in the mix, and it is
still true. It rides the **world bus** beside the residue, so §2's chain ducks it under a contact,
under the self bus and under a line of speech, and §4's own-noise attenuation makes a loud player
deaf to the crystal exactly as it makes them deaf to the past. It never pans: the Fields are
"diffuse, unlocatable" by the table above, and a bed that panned would claim a direction the water
is defined by not having.

**The chord, and how the mix finds a chapter-house.** A chapter-house is cut into the formation
that stands proudest of its slope, so the third arrives where the ground *rises*: measured against
the deepest crystal cell on the map, fully in at 250 m of rise. Both maps that have crystal country
already author exactly that — the Third's Approach stands 250 m over the Fields around it, and the
North Gallery stands 250 m over the defile — so the chord is the Third's own country on both, and
neither map had to be asked. The one settlement in the game whose ambient signature is a chord
([mission-aptitude.md](mission-aptitude.md) §7) is therefore a fact about the ground rather than an
authored point, which is the same choice the formations themselves were given.

### A corridor written over it, and an interval that goes flat

A Standing Wave is two paired Sounding Spires holding an interval between them, and the water
between them carries at 2.00 ([mission-standing-wave.md](mission-standing-wave.md) §4). **In the
mix it is a second fifth, placed on the canyon's own root and panned to the line's midpoint.** So
the megaphone is heard as the thing the ground was already ringing at, made louder and given a
bearing the Fields never had — which is also what it *is*: an absolute PF write, water tuned by
hand, and the one place in their own country where a Knight's instruments do not lie (§13 of that
document). It does not scale with the crystal around it, because tuned water is exactly as loud
wherever it was laid. It fades to nothing at four kilometres, because a megaphone you can only hear
from inside is not one.

It starts the tick both nodes are singing and stops when either falls.

**The flat.** A paired node under `STANDING_WAVE.DETUNE_HP_FRACTION` — 40% of hull — drags the
corridor's fifth flat, twelve cents at the crossing and widening to fifty (a quarter-tone) at zero.

- **Fifty, because a quarter-tone is the widest error that is still unambiguously *this interval,
  wrong*.** Anything narrower reads as beating and nothing more; anything wider reads as a
  different interval — the party having retuned rather than the party being shot — and §8 of that
  document needs the player to hear a fifth failing, not a tritone arriving.
- **Twelve at the crossing, not zero**, because a flat that grew from nothing would make the
  crossing silent, and the crossing is the warning. Twelve cents against 1,320 Hz beats at about
  9 Hz.
- **The flat is on the corridor's fifth alone and never on the canyon's.** That is not a mixing
  convenience; it is what is happening. The ground goes on ringing true and the player's instrument
  stops agreeing with it, so what is actually heard is the *beat* between the two, widening as the
  node falls. It is a slide rather than a step: §8 wants the line heard failing, and a step would
  report a threshold instead.

**Who hears it.** The owner always, off their own `OwnStructure.hp`. Anyone else at **Tier 4 and
not before** — a track is the tier that carries hull, so it is the tier at which somebody else's
line can be heard failing. Classification tells you a Spire is there; it does not tell you how it
is. [mission-standing-wave.md](mission-standing-wave.md) §8 says so now; it used to say "everyone
on the map", which the wire never carried and which would have handed the column a free reading of
a structure it had not earned a track on.

**The corridor is an inference, and the mix is not allowed to be coy about it.** `paired` is not on
the wire and neither is the PF grid, so the mix never learns that two Spires are a pair. What it
has is the pairing rule and the geometry: two completed, singing nodes of one commander inside
`STANDING_WAVE.PAIR_RANGE_M`.

It leaks nothing in either direction — own structures are the player's own, and the other pool is
Tier-4 tracks, which already carry position and hull. Arithmetic over facts the player was handed
is what an instrument is. Own and tracked nodes are two pools and never one, because pairing is
per-commander and a pool that mixed them would sound a corridor nobody built.

**What it can get wrong is a false positive, twice over, and both come from the same place.** A
Spire sings at 80 when "the depth grant is load-bearing **or** an interval is held"
([units.md](units.md)), and the client cannot tell those two apart. So a *prebuilt* lattice, whose
nodes never pair and are lit by the grant ([mission-rim-deposits.md](mission-rim-deposits.md) §4),
reads as a line; and a node still paired to a dead partner, with a third standing nearby, reads as
a line to the wrong pair. Both sound a fifth reinforced where a lattice stands. That is the cheap
direction for this to be wrong in — nothing here is an alarm, nothing here fires a one-shot, and
the accessible half is the panel's *sour* reading, which is server-resolved and unaffected. **A
`paired` flag on `OwnStructure` would close it**, and is not proposed here: it would be the first
field on the wire that exists for the mix.

**Nothing feeds back.** §12's determinism note holds: the bed reads the snapshot and the public
terrain grid, and writes nothing. And the accessible half is already built and stays the panel's —
the interval objective reads *The interval is sour* while a node is under the threshold
([mission-standing-wave.md](mission-standing-wave.md) §13), so the one fact this section makes
audible has a caption that arrives with it.

---

## 10. Music

The score is dread, not action, and it is subordinate to information. Rules:

- Music occupies **above 800 Hz and below 40 Hz**. The 40–160 Hz contact band belongs to contacts, permanently.
- The music bus is side-chained to the contact bus at a 4:1 ratio, 40 ms attack. A new contact ducks the score. The score never ducks a contact.
- No stingers on detection. The contact voice is the stinger.
- Combat does not trigger "combat music." Loudness does — the score follows the player's own SIG, which means the music swells when they are *exposed*, not when they are winning.

### The port

The shell ([ui-ux.md](ui-ux.md) §14) gets a bed of its own, and it is a **different piece**, not a loop of the score. The score above is a function of a match — side-chained to contacts, following the player's own SIG — and there is neither in a menu. Trying to loop it would produce the one thing §10 forbids most: music that swells for no reason.

The port's bed keeps every rule that is not about a match:

| Rule | How the port keeps it |
| --- | --- |
| Above 800 Hz and below 40 Hz | A pedal at ~33 Hz and cold partials from 880 Hz up. Nothing between |
| The 40–160 Hz band belongs to contacts | Even here, where no contact is sounding. The port is where a player learns the vocabulary, and a menu that filled that band would spend itself teaching them to ignore the one the ocean speaks in |
| No stingers | Nothing is triggered by anything. There is no event in a menu worth a sound the game has not already given a meaning |
| Dread, not action | Sparse: one onset every two seconds or so, each lasting several, so the texture drifts rather than pulses. No melody — the port is a room, not a theme tune |
| −18 LUFS / −1 dBTP, headroom for the exposure cue | The bed sits well under the master ceiling before the user's Music slider touches it. A main menu is not where a mix should spend its headroom |

Two things it adds that the score does not. Onsets quantise to the 200 ms Echo grid ([style-neon-noir.md](style-neon-noir.md), "sonar cadence is the heartbeat"), so the game's pulse is set before the player is in the water. And the piece is *composed*, deterministically: the same music every launch, a different phrase every loop, so the loop point never becomes a hook.

It plays on the same `music` bus the score will, which is how the Music slider and the master volume reach it without the bed knowing they exist — and it is the first thing in the game those sliders can be *heard* moving, which is the only way a volume control can honestly be judged.

**The shell owns an AudioContext while it is on screen, and never at the same time as the match does.** A context is a device handle and browsers cap how many a page may hold open; the screen union in the shell makes the two mutually exclusive, and the menu's context is faded out and closed on the way into the water. Nothing plays before the first gesture — autoplay policy, and a game whose primary channel is audio cannot afford to look broken on its title screen.

---

## 11. Accessibility — Audio-Only Information Is a Bug

Because audio carries primary information, every audible fact **must** have a visual equivalent, and the game must be fully playable with the mix muted. This is a hard requirement, not a setting to be added later.

- **Contact log** — a running, timestamped text feed of every detection event, at the fidelity the player earned: `T+04:12 · TIER 1 · bearing unknown`. Specified in [ui-ux.md](ui-ux.md) §10.
- **Visual-first preset** — inverts the precedence law: marks appear at ≤ 30 ms and audio follows. One toggle, no other behavioural change.
- **Exposure indicator** — the "you have been pinged" cue also renders as a screen-edge flash on the bearing of the pinging emitter.
- **Mono mode and HRTF off** — spatialisation is a rendering choice, never a source of information the mono mix lacks. Tier-2 bearing must remain readable in mono via the contact log and the minimap.
- **Independent buses** — contacts, self-noise, world, music, UI, each with its own slider. Contacts may be boosted to +12 dB above the reference mix.
- **Speaker profile** — a compressed, small-speaker mix that preserves the 40–160 Hz contact band by adding harmonics rather than relying on fundamentals no laptop can reproduce. Built; see §12's scaffold status for what it measures and why it defaults on for a phone.

---

## 12. Technical Specification

**One graph, raw Web Audio** ([tech-stack.md](tech-stack.md)): every bus below is built directly on the AudioContext, the UI and music buses included. The contact bus needs per-voice filtering, side-chaining and sample-accurate scheduling that a wrapper cannot give, and once the engine owns that graph, handing the simple buses to a playback library would mean a second device handle and a second clock for a play/stop API the engine already has.

```text
AudioContext
├── musicBus ──────────► compressor (sidechain from contactBus) ─┐
├── worldBus  (ambience, biome beds, fauna) ─────────────────────┤
├── contactBus ─────────────────────────────────────────────────┼─► master ─► destination
│    └── per-contact voice: source → biomeFilter → panner → gain │
├── speechBus (the hail and the murmur bed, §13) ───────────────┤
├── selfBus   (own hull, drive, cavitation) ────────────────────┤
└── uiBus     (the interface's own notice) ──────────────────────┘
```

| Constraint | Value | Reason |
| --- | --- | --- |
| Simultaneous contact voices | 24 | Beyond this the low band turns to mud and nothing is legible |
| Voice stealing order | Lowest tier first, then oldest, then quietest | Never steal a Tier-4 track; it is the only exact information the player has |
| Voice scheduling | Aligned to the 5 Hz Echo tick | Contacts arrive on the tick; anything smoother implies knowledge the server did not send |
| Audio thread budget | 1 ms per Echo tick on the main thread | The Echo Layer already owns 2 ms server-side; the client must not spend it again |
| Format | Opus in WebM, AAC fallback | Browser coverage without shipping two full banks at full size |
| Loudness target | −18 LUFS integrated, −1 dBTP | Headroom for the exposure cue, which is deliberately the loudest event in the game |
| Tab blur | Suspend the context, hold state | An unfocused tab that keeps emitting contact voices is a nuisance, not a feature |

**Determinism note:** audio is presentation only. No audio state may feed back into the simulation, and the mix must never be the reason two clients disagree.

### Scaffold status

The engine exists (`packages/frontend/src/audio/`): the bus graph above, the 24-voice
contact budget with its stealing policy, tick-aligned scheduling, tab-blur suspend, and the
first-gesture unlock.

The **-1 dBTP ceiling in the table above is now held by the graph** rather than assumed of
the material. It has to be: the buses are summed, the world bus doubles under Silent
Running, the contact trim may add 12 dB, and the exposure strike is meant to be the loudest
event in the game — all correct on their own, and together they reached 1.85, or 5.3 dB past
full scale, which the device turned into broadband distortion. The last node before the
output is a soft-clip curve that is exactly transparent below 0.6 and asymptotic to -1 dBTP
above it. Deliberately *not* a compressor: Chromium's `DynamicsCompressorNode` applies an
internal makeup gain of 3-7 dB depending on threshold, which would move the integrated
target by an amount no other engine need match.

The **integrated half of that target is now measured** rather than assumed, which is what
finally named the fault the ceiling could not reach. `tools/audio-meter` renders the
production audio classes through an offline Web Audio engine and meters the samples to
ITU-R BS.1770-4, per layer, at the bus. A ceiling is a promise about the loudest instant; a
player reaching for the volume control is responding to the other twenty minutes, and
nothing in the repository could read that number back.

What it found was two faults, and both of them were the mix being authored on a desk and
played on a phone.

**The self bed was 93-98% sub-60 Hz in every one of §4's four bands.** It was a filtered
noise floor plus a bare 44 Hz sine, and a phone speaker radiates nothing at 44 Hz — it
answers the tone with cone excursion, which comes back as intermodulation across the bands
that do carry information. So the loudest continuous layer in the mix was spending almost
all of itself on the one octave the reporting device could only turn into distortion, and it
measured *quiet* the whole time, because a K-weighted meter discounts the bottom octave in
exactly the way the ear does. §11's speaker profile already named the fix for the contact
band and it is the same fix here: the fundamental stays at 44 Hz and stays present, and the
level moves up its own harmonic series, where a small speaker is efficient and where the ear
reconstructs the fundamental it was never sent. The self bus — and only the self bus — is
then high-passed at 60 Hz, 12 dB per octave. This does not spend §4's reservation of the low
band for a crush cue: "the low band the hull already occupies" is the bed's own 44-1,100 Hz,
all of which passes. What is removed is below the plant's fundamental, where nothing is
authored. The contact bus keeps its bottom octave, because §11 pins the contact band at
40-160 Hz and a filter there would delete the information the mix exists to deliver. The
same speaker-profile treatment is applied to §3's unclassified thump instead: seven tracked
Tier-1 contacts measured 98% sub-60 Hz, since every voice below Tier 3 is the same 55 Hz
sine by design, and it is voiced through its harmonic series now. The series is identical
for every unclassified contact, which is the tier rule restated rather than bent — a fixed
series says no more about what a contact is than a sine did.

**The contact bus had no headroom policy at all.** The 24-voice budget in the table above
exists so the low band stays legible, and it never said what the voices cost between them:
they simply summed. Measured, one classified contact sits sensibly against the -18 LUFS
target, seven peaked at +1.7 dBFS and twenty-four at +7.9 — a mix whose normal operating
state was inside the soft-clip knee, with the headroom this table reserves for the exposure
strike already spent. The bus now holds roughly constant *power* as voices arrive rather
than constant amplitude per voice, at 1/√n, which is the sum law for sources that are not in
phase with each other. One contact is untouched, so the reference the per-voice levels were
chosen against does not move; the whole budget costs 13.8 dB, which is close to what the
same measurement says twenty-four voices actually add. Every voice scales together, so
nothing about which contact is louder than which changes and §3's tier levels keep saying
exactly what they said. A crowded ocean is quieter per contact, which is also true of a
crowded ocean; what it may not be is louder in total than the mix has room for, because that
buries the one contact the player needed under the six they did not.

**The bed's absolute level came down 4 dB**, and the figure is arithmetic rather than taste.
The bed at full plant measured -17.6 LUFS integrated through the master gain — this table's
target for the *entire mix*, reached by one continuous layer with the contact bus, the world
bus and the exposure strike still to come. Summing the meter's figures for a loud moment
(full plant, seven contacts, the tuned bed and the residue under §4's own -8 dB world
attenuation) put the mix at -15.8 LUFS, and 4 dB off the bed alone puts that sum at -18.1.
It is one trim over the whole of §4's table rather than four rewritten gains, because the
*scale* is what §4 specifies and its absolute level is not — the steps between the bands
come through untouched. It applies to Silent Running as well, and has to: that level is
absolute where the bands are a scale, so trimming one and not the other would eventually
have running silent come out louder than sitting still.

**The whole mix has since been measured as a scene, and the layers were the wrong question.**
Everything above was metered one layer at a time at its own bus, which answers "which layer
made it hot" and cannot answer "how loud is the thing in the player's hand". Rendering the
reported picture end to end — the bed at SIG 35, seven contacts at the tiers the log showed,
through the buses, the master gain and the ceiling — puts the mix at **-21.9 LUFS**, four
decibels *under* the target in the table above. At SIG 80 it is -18.8. The integrated level
is not what is left wrong.

What the same render says instead is that **78% of the mix's energy sits below 200 Hz** — 10%
below 60 and 68% between 60 and 200 — and at SIG 80 it is 82%. That is the band a phone
speaker is least able to reproduce: it is very inefficient there and distorts when driven,
so level arriving in that band comes back as harshness rather than as loudness. A meter
reports such a mix as comfortably within target, and a listener reports it as too loud,
and both are right. It is also not an accident of any one layer — it is what this game's
sound design *is*. The plant bed, §3's pressure-thump and §8's four drive signatures all
live between 40 and 200 Hz, because that is what a submarine sounds like.

Which makes §11's **speaker profile** the unbuilt feature this points at, rather than another
level trim. It is written down and it has never existed, and every report of the mix being
uncomfortable has come from a phone.

**The speaker profile now exists** (`packages/frontend/src/audio/speakerProfile.ts`). It is a
mix option on the output, after master and before the ceiling, and it is two paths summed:

- a **cut** — a 24 dB/octave high-pass at 210 Hz. The direct path does not carry the low
  band at all.
- a **harmonic path** — the half §11 specifies. It reads everything under 200 Hz, generates
  that band's harmonic series with a static non-linearity, and keeps only what lands above
  320 Hz, at the same slope. The fundamental is never sent and the ear puts it back, which
  is the same reconstruction that lets a telephone carry a 100 Hz voice through a channel
  starting at 300 Hz. A contact at 55 Hz stays a contact at 55 Hz rather than becoming one
  at 330.

**Replacement, not attenuation, and the first build of this got that wrong.** It used a
-10 dB shelf on the direct path, reasoning that a full cut was heavy-handed. The result was
that both paths carried the band — the reconstruction *and* the fundamentals it was
reconstructing, ten decibels down. Ten decibels down is not gone, a sustained tone is the
most noticeable thing in any mix, and the player reported the hum afterwards in the same
word they had used before it. A reconstruction summed with the thing it reconstructs is not
a reconstruction. The slope was the other half of the same mistake: one biquad a side leaks
most of an octave either way, so the crossover smeared the band instead of moving it, and
the smear is exactly the sustained low-mid a phone turns into a hum.

Measured on the reported scene, the profile now takes the share of the mix between 60 and
200 Hz from **68% to 4%**, and everything below 60 Hz to nothing. The integrated figure goes
from -21.9 to -28.6 LUFS — and that level is held deliberately rather than derived, because
it is the one the player called fine. This round changes the spectrum and nothing else: a
report of "better" that could be either change is a report that settles nothing.

§11 asks for a *compressed* mix and the compression is paid twice: by a static soft knee at
0.35, below the output ceiling's 0.6, and by the shaper's own saturation. The second is the
one with teeth, and it is what the drive is tuned against — not a single reading but §4's
scale, which the shaper distorts in both directions. Too little drive and the profile
*expands* the scale, since quiet material generates almost no harmonic and the harmonic path
is now the only thing carrying the band; too much and it flattens it. §4's climb from SIG 10
to SIG 80 spans 14.3 dB unprofiled:

| drive | §4's span, profiled | left between 60 and 200 Hz |
| --- | --- | --- |
| 8 | 18.0 dB — expanded | 8% |
| 12 | 14.6 dB — unchanged | 6% |
| 20 | 9.8 dB — compressed by a third | 4% |
| 30 | 6.4 dB — half the scale gone | 4% |

20 is the setting. It compresses without spending "being loud makes you deaf" to do it, and
it keeps the idle bed audible where a gentler drive does not — at 8, SIG 10 lands at
-51.5 LUFS, and §1's third law is that a player hears their own noise.

**It defaults on where the device implies a small speaker** — a coarse pointer on a narrow
screen — on the same terms `reducedMotion` defaults to the OS preference: a player on a
phone should not have to find a setting before the game is bearable, and the default holds
only until they touch the control. There is no Web API that reports how big a speaker is, so
that test is a proxy and is written down as one.

What it is not is a real compressor. The knee has no time constants, so it can stop a loud
passage running away and cannot lift a quiet one — `DynamicsCompressorNode` stays refused
here for the reason the ceiling refuses it, and that reason has not changed.

One layer is left reading hot and is deliberately not acted on here: the tuned bed at full
crystal with a corridor in earshot measures -16.1 LUFS through the master gain. That is a
maximal input rather than a common one, it sits entirely above 200 Hz so it is none of the
fault above, and the standing-wave bed is a mechanic still taking shape. It is recorded, not
chased.

The **music bus now carries the port's bed** (§10, "The port") — the shell's own engine,
opened on the first gesture in a menu and closed on the way into a match. The in-game score
is still unwritten: the bus ducks and trims correctly and has one piece to play, in the
place where a match is not.

Contacts are sonified (§3): a voice per contact, panned with the authority its tier earned,
filtered by the biome it arrived through (§9), and carrying from Tier 3 up the timbre family
of whatever the server said it **is** (§8, §8.1) — one of the four navies, the creature
family, or the ordnance family. The mix asks what a contact is rather than whose it is, and
those six are the only answers it holds: a Tier-3 contact the server classified as none of
them keeps the unidentifying thump of the tiers below, because a mix with no identity has
nothing to say about identity.

Nothing defaults. The lookup takes the identity and has no fallback branch, so a field added
to a contact later cannot quietly become a navy — the wire rule (CLAUDE.md) applied one
layer inward. It used to default to the Consortium, which is how every classified creature
and every classified torpedo came to sound like a Consortium hull.

The player's own loudness is implemented too — §4's four bands with their world-bus
attenuation, Silent Running's inversion, §5's three active-sonar events, the break-silence
transient, and §2's Precedence Law in both of its halves (the fade-in budget that keeps the
ear ahead of the eye, and the ducking chain that decides what wins when several things
sound at once).

**Nothing about the player's own force is inferred.** The Echo pass reports exposure
directly: `EchoSnapshot.exposure` says how well the player is currently seen, and
`EchoSnapshot.selfEvents` carries the discrete moments — transmitted, broke silence, was
lit, was hit, ran out of work. All of it is resolved information about the player's own
units, so it leaks nothing, and the alternative was guessing. A SIG jump could be a broken
silence, a discharge or a descent; "am I being pinged" cannot be read off own-SIG at all,
and §5's cue is far too loud to fire on a guess.

**A blow on the hull is audible once per engagement.** The `Damaged` event fires for
violence only — a gun, ordnance, a creature — never for crush attrition or the shallow
bleed, which are costs being paid rather than attacks being made. Its cue is a dull knock
and a rattle of plating, deliberately below the exposure strike, and the mixer collapses a
sustained battering into one blow per ten quiet seconds per hull: the log records the
first blow of an engagement (docs/ui-ux.md §5), and the ear and the record share the
window so they cannot disagree about what one engagement is.

**The Lid has a voice.** "The Lid" above is implemented on the self bus: a second continuous
bed alongside §4's plant bed rather than a mode of it, because a silent hull can be souring
and a screaming one can be in clean water — folding them together would have made whichever
fact was quieter inaudible. The texture is driven from the server's own `OwnUnit.sourS`, so
the sound and the card count the same grace down and the `SOUR — BLEEDING` line and the
pulse change state on the same comparison. The bite is a `SourBleed` self-event raised on
the crossing edge in the pressure system, which is the one place in the simulation that
knows the exact tick a grace ran out — and it is the single exception to `Damaged`'s
exclusion of attrition, granted because sour exposure is the only attrition in the game with
a moment in it.

**The ui bus finally carries something.** The idle-harvester notice — two soft descending
taps — is its first producer, and it sets the bus's register: the interface speaking, not
the water. It claims no precedence rung and ducks nothing, because a chore may not quiet
a contact; that the ui bus sits outside the ducking chain is now load-bearing rather than
incidental.

**Speech has a bus** (§13). A `say` beat is hailed in its speaker's register — five
synthesised signatures, one per voice of docs/culture.md §3, then a murmur bed for the
reading — on a bus of its own with a rung under contacts, a trim that can go to zero, and a
whisper under the silence order. No line is recorded; the log is the caption.

The one thing deliberately withheld is the pinger's **position**. The victim gets a bearing,
which is what §11's screen-edge flash asks for. A ping resolves by hard radius while the
pinger's own self-reveal travels by propagation, so in a masking biome a player can be lit
by something they cannot hear back — sending coordinates would close that gap on their
behalf.

**The self bed follows fleet SIG, not `peakSig`.** The HUD number folds in structures, and a
base six kilometres away would pin the bed at "full plant" for the whole match, making the
entire scale — Silent Running's inversion included — inaudible. So the HUD can read `SIG 35`
while the bed reads `SILENT RUNNING`: the base is loud, the fleet is not, and both
statements are true.

**Being lit is an event, not a state.** A ping reveals for three seconds, which is fifteen
Echo ticks; the first implementation fired the strike on every one of them, measured at 42
strikes for a single ping. The pass now tracks which hulls a given transmission has already
lit, so a hull is told once — and a hull that enters the radius part-way through is still
told, because it was just lit.

**Where fidelity is enforced.** The renderer assembles the contact picture the mix is
allowed to hear and *withholds* bearing and range at Tier 1 rather than blurring them —
there is nothing to blur, because a Tier-1 resolution reports the listener's own position.
The mixer forwards what it is given and never re-derives geometry, and the voice refuses to
pan a tier that has no bearing even if handed one. Three layers, all defaulting to silence
about what was not sent.

**Measured** in the headless client with two clients in a live engagement: **0.1–0.3 ms**
per Echo tick with six contact voices sounding, against the 1 ms budget. A single client
peaks at 0.4 ms; the 2–3 ms outliers seen in the two-client runs are two pages contending
inside one headless browser process, and appear on ticks where no voice is built at all.
The engine reports both the worst case and the most recent tick, because a budget blown
only while *building* voices is a different problem from one blown every tick, and a
worst-case figure alone cannot tell them apart.

**Held by a test, in counted work rather than milliseconds.** The millisecond figures above
are a measurement, not a gate: a wall-clock maximum is the noisiest statistic a shared
runner produces, and asserting on one buys a flaky build rather than a fast mix. What
`packages/frontend/test/audioEngine.test.ts` asserts instead is what a tick *builds*, which
is a property of the algorithm and identical everywhere — a tick with nothing pending
allocates no node at all, and twenty ticks of an unchanged contact picture build no voice
and allocate no node, because the mixer finds every voice already in hand. It boots the
real engine against a stubbed `AudioContext` and holds the rest of this section too: every
bus reaches master and only music through the duck, the duck follows the measured contact
level, the voice cap holds however many returns arrive, a frame is inaudible until the tick
applies it, a resent one-shot does not fire twice, contacts trim to +12 dB and nothing else
above unity, and a client with no `AudioContext` at all stays fully playable in silence
(§11).

Two departures from the diagram above, both deliberate:

**The music sidechain is a measured duck, not a compressor sidechain.** Web Audio's
`DynamicsCompressorNode` has no sidechain input — there is no way to key one node's
compression from another node's level. The music bus therefore passes through a gain node
driven from the contact bus's measured peak, updated on the Echo tick. Same audible result,
different mechanism, and worth knowing before someone tries to "fix" it into a compressor.

**Voices are synthesised rather than sampled.** The repository ships no audio assets, and
sonar is unusually well suited to synthesis — tonal returns and filtered noise beds are what
the material actually is. The buffer path is in place for when banks exist; the Opus/AAC
format requirement in the table above applies to those banks, not to the prototype.

**Tuned water is built** (§9, "Tuned water"). The Fields have a bed with notes in it — a just
dyad at 880 and 1,320 Hz over the world bus, a third at 1,100 where the ground rises into
chapter-house country, and a fourth voice that is a Standing Wave's own interval placed over the
canyon's and panned to the line. It is four sine oscillators and one slow LFO, held open for the
match and built at the unlock gesture rather than on first crystal, so the whole of its cost is
outside the tick: the measured figure is unchanged at **0.1–0.3 ms** with contacts sounding,
against the 1 ms budget. The crystal share is a 9×9 sweep of the public terrain grid around the
ear, and the chord's datum — the deepest crystal cell on the map — is swept once and cached until
the ground changes.

**The corridor is the first thing in the mix assembled by inference rather than by report**, and
§9 is explicit about which kind. The wire does not carry `paired`, so the reading is the pairing
rule applied to two completed, singing nodes of one commander inside the pairing range — exact
except for a node still paired to a dead partner with a third standing nearby. That is a departure
from "nothing about the player's own force is inferred" above, and the reason it is allowed where
the exposure cue was not: this one is arithmetic over facts already on the player's screen rather
than a guess at a fact the server withheld, and its failure mode is a bed voicing a line that is
not there rather than an alarm firing on nothing.

Two rows of §9's table are deliberately **not** voiced. The Abyssal Trench's *axial*
behaviour needs PF as a function of bearing, which the simulation does not model — voicing
it would be the mix claiming to know something the game does not. The thermocline boundary
is a different case: the simulation *does* model it, but as a property of a listening pair's
depths rather than of a place, so there is no biome for the voicing table to key on. That
one is a gap, not an impossibility — the mix would have to read the local hull's own depth
instead, and the *whoomp* of crossing the layer is a real event the player now experiences
without hearing.

---

## 13. Speech — The Voice in the Water

Twenty-eight mission documents carry a §12 of lines, and until #381 every one of them was read and none was heard: the `say` beat carried speaker and text to the mission log beside the orders panel ([ui-ux.md](ui-ux.md) §10), at the times each document's §12 gives, and this document owned no bus for a voice. This section is that bus, and the cast that speaks on it.

**A channel first, and a cast of signatures on it.** No recorded line ships, and none is specified here — *The cast*, below, says why not now. [culture.md](culture.md) §3 has five voices and §6's test is *which faction could not have said it*; a speech channel whose four Sorrowgate voices sounded like one narrator would have failed before the first line played. So what the mix does is narrower than reading the line aloud, and more honest: it says **somebody is speaking on this channel, and it is one of these five** — and, since #403, *which* of the people in that register it is. The words stay the log's.

### The hail

Every line opens with a **hail** — 600 ms of signature in the speaker's register's material. Four of the materials are §8's timbre families, carried into speech so a player who has learned a faction's drive by ear already knows its voice; the fifth is new, because §8 has four rows and §3 has five voices. The table below is each register's **plain** hail — the chorus's, in *The cast*'s terms; a named speaker's is the same mechanism at their own fundamental and cadence.

| Register | Self-description ([culture.md](culture.md) §3) | Material | The hail |
| --- | --- | --- | --- |
| Bathyarch Consortium | *the concern* | Machinery under load — steel, reciprocating | Three strikes of a 68 Hz square on a fixed period. The only voice with a beat in it |
| Pelagia Commune | *the plateaus* | Breathing — muscle, fluid, arrhythmic | One swell of a 52 Hz sine, its pitch drifting up and back, that does not repeat |
| Abyssal Directorate | *the cohorts* | Many small things agreeing | Six triangle ticks around 140 Hz that start scattered and land together — heard *organising* |
| Hadron Knights | *the Order* | Pure tone — crystal, sustained | One 196 Hz note, clean attack, long release |
| The Sorrowgate court | *the court*, *the record* | A dead room | A single dry tap of high-passed noise, 25 ms, no tail and no tone |

The court's is the fifth because it is the one voice that is not heard through water. Every other hail carries the Rift in it — a beat, a breath, a chorus, a note — and the court speaks from a place that is not the Rift: a room with no water in it to carry anything ([culture.md](culture.md) §3, "the one voice in the Rift that describes a room without joining it"). A tap with no tail is what such a room sounds like.

### The murmur bed

After the hail the channel stays audibly **open** for as long as the line takes to read — band-passed noise gated at a syllable rate, in the register's own band and cadence (the concern's gate is metronomic, the plateaus' never repeats), and never voiced: no formants, no pitch, nothing a listener could take for a word. It reads as *someone is speaking on this channel* and as nothing more specific than that.

The length is the line's: **fifteen characters a second, never under 1.5 s, never over 8 s.** A player with their eyes on the water hears the channel close when the line would have been read, which is the cue to look at the log if they have not.

### Where it sits

Speech has its own bus (`speechBus`), trimmed like the others, and a rung in §2's chain:

> self-exposure › contact › **speech** › self › world › music

Information outranks a voice: a contact arriving mid-sentence dips the speaker and never the reverse, because a line is authored and the log already has it while a contact is news. A voice outranks atmosphere. The table, as `precedence.ts` transcribes it — a rung never ducks itself or anything above it, and the pairs that predate speech keep the values they had:

| While this sounds | contact | speech | world | music |
| --- | --- | --- | --- | --- |
| Exposure (§5) | 0.55 | 0.3 | 0.3 | 0.3 |
| A contact | — | 0.55 | 0.3 | 0.3 |
| **A line** | — | — | **1** | 0.5 |
| An own cue — the ping, a broken silence, a blow, the bite | — | — | 0.55 | 0.3 |
| The world | — | — | — | 0.55 |

The world's cell under a line is deliberately **1**. The world bus carries §5's Sounder call "at a level the −8 dB duck cannot bury", and a voice that talked for eight seconds over a world at −10 dB would bury the one warning this document promises never to. The self bus has no column at all, for the same shape of reason: it carries the exposure strike and the ping, which are the top of the chain, and a bus-level duck to make room for anything would cut the loudest event in the game. A line sits *over* the player's own noise and the water. It does not press them down; the one thing it presses down is the score.

### Under a silence order, and under Silent Running

A briefing voice that keeps talking at full level while the player is ordered quiet is not loud. It is **wrong**: the court has told the flight that twenty SIG is the ceiling ([mission-sorrowgate.md](mission-sorrowgate.md) §4), and a mix that hailed the court's own observer at full power would be contradicting the court in the same breath.

So while the mission view carries silence-debt — `debtS > 0`, the one signal the client already holds, and the same number the debt gauge shows — or while any own hull is running silent, the channel is kept open at a **whisper**: the hail drops **−6 dB** and loses its top octave (a low-pass at half the register's own ceiling, so each voice loses *its* top and the court is thinned by the same amount as the concern), and the murmur bed runs **half as long**. A low-power link, kept open. It never mutes, because the log is the caption and the ear is owed the cue that a line landed — a line the player did not hear land is a line they will not look for.

The rule is read as the line arrives and rides the line: a line spoken under the order and one spoken after it lifts are each hailed as they were when spoken.

### Accessibility

§11's rule holds with nothing added. The log stays; **captions are the log**, and a line's text was on screen before this section existed. The speech trim can go to zero and nothing is lost. Under the visual-first preset the hail is neither delayed nor inverted — there is nothing to race, because the line and the log row are the same event, queued from the same message.

### The cast

The channel came first: #381 built it and deliberately not the cast, and left the choice open: recorded lines, or a voice per speaker. Two shapes were honest. This section picks one and sequences the other.

**Chosen: a synthesised voice per named speaker, inside the register's material.** A speaker's voice is a **signature** — the register's own mechanism, the concern's strikes or the plateaus' breath or the cohorts' ticks or the Order's note or the court's tap, at *that speaker's* fundamental and cadence. Sull's note is not Vrey's; the chair is one particular machine. It is authored as data (`CAST` in `speechVoice.ts`), ships no asset, loads with the client, and passes §6's test structurally rather than by care: a signature cannot leave its register's material, so no voice can be mistaken for another faction's, and inside the register the ear is handed one more fact — *who* — that the log row already held. The murmur bed is signed too, in the speaker's own cadence, so the channel stays theirs for the whole reading and not for the first 600 ms.

**Not now: recorded lines.** Three reasons, in the order they bind. The literals carry 233 `say` beats — 37,700 characters, forty-two minutes at §13's reading rate and longer performed — in five registers, which is a cast, a director per register and a production pipeline before the first line is heard. The repository ships no audio asset and has never had a size budget for one: forty-odd minutes of Opus at the §12 rates is on the order of eight megabytes, doubled by the AAC fallback, for a client that [tech-stack.md](tech-stack.md) requires to run on a phone in Termux and §11 requires to be playable muted — so the loading story is not a folder but a system: optional, fetched behind the match, and the hail playing when the line has not arrived. And a recording fixes one performance of a text this bible still edits. What would have to be true first is a size budget in [tech-stack.md](tech-stack.md), that loading story written down, and a direction document per register. When it comes, a recorded line **replaces the murmur bed and keeps the hail** — the hail is the register test, and a performance does not get to skip it — so nothing built here is thrown away, and nothing here waits on it.

**Who has a voice.** An entry in [characters.md](characters.md), and one crew besides. That is the twelve commanders, Arbiter Halloran, and **the charting pair** — the one crew the campaign hears from all four sides: the plateaus' own at the Second Seeding, the concern's contact at Prospect, the cohorts' at the First Arrival, the Order's at the Rim and the Chord. Everyone else in the sixty-odd speaker strings — the Watch-Speaker, the stalls, the watch, the ground, a Clerk of the Ninth Board, a Yardmaster — speaks as the register's **chorus**, which is the plain hail exactly as #381 built it. A chorus is named by the register's other word for itself ([culture.md](culture.md) §3): *the grid*, *the bloom*, *those below*, *the chapter*, *the record*. A voice is a thing a character has, and a character is a thing that document has an entry for; the rule is stated so the next name added to a literal does not quietly acquire one.

**The speaker key.** `MissionSpeaker` in `@echoes/shared`: the twelve, Halloran, the pair, and the five choruses. It is resolved **on the server**, from the speaker string — given name and surname together, so *Ottilie Marr, on the sower* is the bloom and not the Tidespeaker, and *the Cohort-Prime of the row* is those below and not Adze — and to the register's chorus otherwise; a literal may author `speakerId` on a `say` beat for a line whose string does not name its speaker, and none yet needs to. The free text stays, for the log. The wire carries both `voice` and `speakerId`: the register so the client hails with nothing to derive, the speaker so it can sign, and `missions.test.ts` holds every line in every mission to the union and to its own register. A speaker id is authored data about an authored line the observer already holds, and discloses nothing the speaker string did not.

**The signatures.** Every figure is anchored in the entry it belongs to.

| Speaker | Register | Signature |
| --- | --- | --- |
| Executor Odile Varr-Kest | the concern | 54 Hz at 3.2 syllables a second — the lowest and slowest machine in the concern. One particular machine, and the pace of a names list read in full |
| Foreman Corwin Osk | the concern | 76 Hz at 4.6 — a working machine, at the Vein's pace |
| Underwriter Baen Tull | the concern | 90 Hz at 4.4 — an instrument, not a press: the lightest machine in the register |
| Tidespeaker Ysolde Marr | the plateaus | 46 Hz at 2.2, wander 0.9 — the slowest breath in the Rift and the one that least repeats. She convenes and cannot order |
| Bloomwright Sefa Anholt | the plateaus | 60 Hz at 3.1, wander 0.7 — a breath shorter than it wants to be |
| Warden Juno Teel | the plateaus | 56 Hz at 2.9, wander 0.5 — the one plateaus breath with something regular in it, and still never the same twice |
| The charting pair | the plateaus | 52 Hz — the register's own — as **two** swells, the second four per cent sharp and 40 ms behind: two breathing together, not quite in step |
| Undermarshal Setha Korrin | the cohorts | 112 Hz at 4.2, scatter 0.15 — the lowest swarm, born deepest, and the most gathered |
| First Cantor Vehl Ossary | the cohorts | 128 Hz at 3.6, scatter 0.25 — the slowest cadence in the register. Liturgy |
| Cohort-Prime Adze | the cohorts | 170 Hz at 5.8, scatter 0.2 — the highest and quickest: the fifth generation, at the limit, and happy |
| Choirmaster Ivane Sull | the Order | 262 Hz at 3.0 — a fourth above the Order's G |
| Chapter-Master Halden Vrey | the Order | 147 Hz at 2.6 — a fourth below it. Sull's and Vrey's notes are the two the Order's own sits between, and without it they are a seventh: *nothing good has ever been said twice* |
| Voice Ren Kalliso | the Order | 196 Hz — the Order's own note — at 3.5, through a wider bed (Q 4 against the register's 6). The Order's most ordinary person sounds like the Order and talks like a soldier |
| Arbiter Mosk Halloran | the court | a heavier tap, high-passed at 900 Hz against the register's 1,200, read at 2.8 — the count, said aloud and left to sit. Built and unspent, as the court's plain hail was |
| *the grid*, *the bloom*, *those below*, *the chapter*, *the record* | each | The register's plain hail, unchanged |

Within a register no two signatures share a fundamental and a cadence, and every signature keeps its register's law: the concern's machines are all metronomes, and none of the plateaus' breaths repeats.

**How a signed line and the channel share the bus.** Nothing above this subsection changes. The signature *is* the hail and the bed, so the rung, the duck table's speech row and the whisper rule apply to it as they do to a chorus's — a signed hail whispers at −6 dB and loses the top octave of its register's ceiling, not of its own fundamental. Two lines on one tick still overlap, and the rung is held for whichever runs longer. §2's *ear before eye* has nothing to race here: the line and the log row are one event, queued from one message.

**The three debts, paid first.** Three mission documents named a line the hail could not pay, and each is the first content of the cast. [mission-item-nine.md](mission-item-nine.md) §13's chair, transmitting: Varr-Kest's conditional line is now the chair's own machine, and [mission-second-chord.md](mission-second-chord.md) §13 matched that debt with Sull's line at the Collapse, which is signed by the same rule. [mission-tolerance.md](mission-tolerance.md) §13's two conditional lines — the campaign's centre — arrive in her voice and in no one else's in the register. And [mission-second-seeding.md](mission-second-seeding.md) §13's 05:30, the pair's line spoken by the player's own hulls to the concern: it is signed as *the pair's* — the same two breaths the concern heard at Prospect's 05:30 and will hear again at the Rim — so a player hears that it is their own pair, and not the plateaus in general, before reading whose it is.

**Korrin's silence is its own.** [mission-first-arrival.md](mission-first-arrival.md) §13's largest item — *a thing an actor does not say* — is half paid by the cast by construction, because the record's note at 20:30 is authored under her name and now keys the channel in her voice with a text that is not hers. The other half is a beat the format does not have: a channel keyed open and closed with nothing said, a hail with no bed, and a row in the log with no words on it. That is a decision for the First Arrival's document and a beat kind after it, not a signature, and it is left where that document put it.

### What it is not

**It is not a side channel.** A line is heard when its beat fires and never earlier, and never for a beat the observer did not receive: the hail is queued from the same `missionLine` message that writes the log row, and the register rides the line from the server — resolved there, so a beat with no authored voice arrives already in the player's own and the client infers nothing. An audio rendering of authored mission data the observer already holds discloses nothing new.

**Nothing here feeds back.** §12's determinism note applies unchanged: the simulation never learns a line was heard, whispered or trimmed away.

### Scaffold status

**Built** (#381): the five hails, the murmur bed and its reading rule, the `speech` bus and its trim, the rung and its table, the whisper rule, and the register on the wire — `MissionVoice` in `@echoes/shared`, `voice` on the `say` beat and on `MissionLine`, authored on the minority of lines spoken by somebody other than the player's own faction and defaulted to the player's register otherwise. Sorrowgate's four lines are the first content, and they are four registers by construction — the Order at 06:20, the concern at 09:00, the cohorts at 09:20, the plateaus at 10:40 — and `missionRuntime.test.ts` plays the mission and asserts they arrive as four different voices. The court's hail is built and has no line yet to carry: Halloran speaks in the briefing and the objective readings, which are read before the socket opens and are not beats.

**Built** (#403): the cast — `MissionSpeaker` in `@echoes/shared`, nineteen values; `speakerId` on `MissionLine`, resolved server-side from the speaker string and to the register's chorus otherwise, and authorable on the `say` beat; `CAST` in `speechVoice.ts`, a signature per speaker in its register's material, the choruses being the plain hails; and the three debts above as the first content. `missions.test.ts` holds every line to the union and to its register and names the three lines; `speechVoice.test.ts` holds the table to this section — every signature in its register's mechanism, every named one distinct from the chorus's in fundamental or cadence, no two alike within a register — and drives `playHail` through a recording context to show the chair's line and the pair's are scheduled at their own figures and not the plain hail's. Vrey and Sull no longer share the Order's note.

**Not built**, and not this section's to build: recorded lines, on the terms *The cast* states; the Collapse's thirty seconds at SIG 100 as a *sound*, which is §5's business, not speech; and the withheld half of Korrin's silence, which is a beat kind and the First Arrival's decision. Nothing here feeds back, still: §12's determinism note applies to a signed line exactly as to a plain one.

---

## 14. Related

- **[systems-echo.md](systems-echo.md)** — the mechanic this mix carries
- **[ui-ux.md](ui-ux.md)** — the visual half, and the accessibility mirror
- **[bestiary.md](bestiary.md)** — what shares the Tier-1 band with you
- **[environments.md](environments.md)** — biome PF values the DSP chain implements
- **[art-direction.md](art-direction.md)** — the visual language this sits inside
- **[tech-stack.md](tech-stack.md)** — Web Audio and the performance budget
