# The Free Camera — Presentation Revision

> The orbit left the board. Flight is the next revision, not a name for what already shipped.

This document turns September 2026 owner feedback into a plan. The feedback, in full:

> Think about a free, vast 3D game underwater world. Ships can freely move everywhere — the
> player's camera as well.

The bounded orbit described in §4 remains the default: free yaw, 10°–88° pitch and a focus that
leaves the seabed. It is not six-degree flight and has no roll. The opt-in target is
[free-water-slice.md](free-water-slice.md), the #1694 contract: opt-in flight, independent
destination depth and a crater/kelp-jungle study. Flight is implemented in #1706;
the destination preview and integrated world remain separate increments.
This document keeps the argument that retired the old yaw lock and the default rig it
produced; neither that history nor continuous hull depth proves volumetric pathfinding.

The lineage is [three-layer-ocean.md](three-layer-ocean.md), which did the same job for the
same reason: playtest feedback said the screen was lying about the ocean, canon agreed, and
the plan-view camera lost an argument it had won fairly when it was written.

---

## 1. The feedback, restated as goals

| # | Goal | Source in the feedback |
| --- | --- | --- |
| F1 | The water is a volume, not a surface with a depth readout | "a free, vast 3D game underwater world" |
| F2 | Hulls go anywhere in that volume | "ships can freely move everywhere" |
| F3 | The camera goes anywhere in it too | "the player's camera as well" |
| F4 | The world feels *vast* — big enough that the deep reads as far away | "vast" |

## 2. What already exists

The current build, distinguished from the original feedback and the next target:

| Goal | What the build already has | Where |
| --- | --- | --- |
| F1 — a volume | Continuous depth 0–3,000 m. Every cell carries a **floor and a ceiling**, so the map can say "there is rock above this water" — tunnels, overhangs, cavern mouths. A thermocline at 1,200 m that splits the column acoustically in two | [systems-depth.md](systems-depth.md) §1, `DEPTH` / `DEPTH_BANDS` in shared constants |
| F2 — depth orders | A move names plan position and depth; direct rise/dive preserves the current course. Routing is planar at current depth, not a search through a 3D volume. A move onto the ground follows it | [systems-depth.md](systems-depth.md) §2, §6; `sim/systems/depth.ts`, `sim/pathfinding.ts` |
| F2 — limits | PR and sour exposure price depth. Terrain admits one water interval per cell; structures block at every depth, and hull separation is planar. Terrain never automatically dives a hull around an obstacle | [systems-depth.md](systems-depth.md) §2–§3; `sim/systems/separation.ts` |
| F3 — the camera | Free yaw, bounded pitch, dolly and vertical focus; no roll or independently translated flight eye | [art-direction.md](art-direction.md) "Camera & Projection", `PerspectiveView.ts` |
| F4 — vast | Maps are 8,000 × 8,000 m and 10,000 × 6,000 m by 3,000 m deep. Large; finite, and finite on purpose | [maps.md](maps.md), `MAP_HEADERS` in shared |

Continuous depth is real; unrestricted 3D routing is not. The shipped orbit reaches the
water, while [the new contract](free-water-slice.md) separates flight, explicit destination
controls and world integration without silently changing those simulation limits.

## 3. The rule this revision retires

The former [art-direction.md](art-direction.md) "Rotation and zoom" SPEC said:

> **No camera rotation, ever.** Rotation breaks the minimap correspondence (the sonar scope
> and the viewport must agree on north) and the one-glance legibility of a fixed frame. There
> is no "temporarily" here any more than in the server-authoritative rule.

That rule was right when it was written, and the reasons were mechanical rather than
aesthetic — which is the only kind of reason this project retires a rule for. Both reasons
survive the retirement; neither survives unchanged.

**The rule is not being softened into a preference.** It is being replaced by a different
rule with the same job: the frame the player can always get back to, in one key, is the frame
the old rule made permanent. What changes is that it is now a *home* rather than a *cage*.

## 4. The shipped orbit camera — SPEC

The rig gained three freedoms and kept its fourth. All four are one camera, still shared by
both painters (`EchoRenderer.setConn`), because "one projection, two painters, no second
opinion about where anything is" is not what this revision touches.

| | Before the orbit revision | Shipped orbit |
| --- | --- | --- |
| **Focus** | A point on the seabed | A point **anywhere in the water column**: plan position plus a focus depth |
| **Yaw** | Locked to north | **Free**, 360°, continuous |
| **Pitch** | Pinned at 55° | **Free within 10°–88°**; 55° stays the default and the home |
| **Dolly** | 250 m … 2.2 × map diagonal | Unchanged |

The pitch band's ends are not taste. Below **10°** the ground plane stops being a ground
plane and the camera is simply in the water looking along it — which is the shot this whole
revision exists to buy, and also the shot where a range ring is most nearly edge-on, so the
band stops where the rings stop being readable rather than where they stop being correct.
Above **88°** the view is plan view for every practical purpose, and the camera's up vector
degenerates at exactly 90°, taking the yaw with it: the two metres short of the top are worth
more than the gimbal lock.

**The focus depth is the freedom that matters most**, and it is the one that has no analogue
in the RTS lineage this camera comes from. A focus fixed to the seabed means the camera
always looks at the *bottom* of the column — so a fleet at 400 m over a 2,800 m trench is
drawn as a scatter of marks hanging above ground the camera is staring through. Letting the
focus rise and sink means the camera can sit *with* the fleet, at its depth, and the trench
falls away below it. That is F1 delivered: not a shaded plan with a depth readout, but water
you are inside.

**Since #1132 the focus depth is also where an order goes.** Raised into the column, the
focus is a plane a click into open water lands on ([ui-ux.md](ui-ux.md) §9), so moving the
focus picks the depth of the next move. The direct rise/sink controls added for #1694
change a selected hull's depth without moving that focus or replacing its course.
Attached to the seabed — from `Home` or a fit to the map, or sunk back
to it — the focus makes no plane, and a click is on the ground under the cursor. The camera
still commits nothing: it chooses where a click *would* land, and the
click is the player's.

**One hard clamp, and only one: the eye never goes below the seabed.** It stays at least
**25 m of water** (TUNABLE) above the local floor, because a camera under the ground renders
the inside of the terrain shell and reads as a bug in every case and a feature in none. The
focus itself clamps to the water column — surface to seabed — for the same reason, and in
plan to the map's extent (`clampTarget`). Nothing else is clamped. In the continuous-world
pilot that plan clamp is the mission rectangle, held for every verb that moves the focus,
while the orbiting eye may swing outside it; the exterior fades rather than ends
([world-map.md](world-map.md) §7.4). The camera may sit inside the Lid, at the bottom of a
trench, or nose-down against a wall, because the player looking at a thing is not the player committing a hull to
it, and none of the column's costs are the camera's to pay.

### Verbs

| Verb | Input | Notes |
| --- | --- | --- |
| Pan | Middle drag, arrows, screen edge; sideways, the horizontal half of a left + right drag | Unchanged in feel, **yaw-aware** in fact: the ground still follows the pointer, whatever direction the camera faces |
| Zoom | Wheel, about the cursor | Unchanged |
| **Orbit** | `Shift` + middle drag — horizontal yaws, vertical pitches | Pitch held inside the 10°–88° band |
| **Rise / sink the focus** | Left + right drag, vertically, **5 m** per pixel (TUNABLE); `Shift` + wheel, **150 m** per notch (TUNABLE) | Clamped to the water column under the focus. Sunk to the seabed, the focus lands on it and follows the ground again, as it does from `Home` |
| **Home** | `Home` | Yaw to north, pitch to 55°, focus back to the seabed. One key, always |

`Shift` + wheel takes a gesture that zoomed before the camera was freed, and the reassignment
is deliberate rather than incidental: it is recorded here because [ui-ux.md](ui-ux.md) §9's
rule about rebinding is that the interaction a player loses must never be a *mouse*
interaction that silently changes meaning. This one changes meaning and is therefore written
down, in the controls table and in the Controls screen, where a player meets it. Unmodified
wheel still zooms, and zoom is the gesture nobody may lose.

**The left + right drag is the column's continuous verb (#1132).** Holding both buttons turns
the pointer into the camera: across, it pans sideways; up and down, it moves the focus through
the water column. Both halves move the water with the hand, as the middle drag does, so
dragging up lifts the water past the eye and sinks the focus. It is a chord of buttons, and
not a timing-critical one: either may land first, at any interval, and once both are down
neither click fires. `Shift` + wheel stays beside it as the route that needs one button,
which [ui-ux.md](ui-ux.md) §11 owes a player who cannot hold two.

`Home` is what makes the rest safe, and it is not a convenience. A free camera's failure mode
is a disoriented player who cannot find their fleet, and the answer is a key that always
works, needs no aim, and restores the exact frame the old SPEC made permanent. It joins the
arrows in `RESERVED_CODES` for the reason the arrows are there: a rebind that took it would
take the way out of a frame a player cannot otherwise read.

### Opt-in six-degree flight

In development, `?freeWaterControls=1` enables the controls study without replacing
the map. Production ignores the flag. F8 or FLIGHT enters a quaternion camera;
F9 or NAV latches camera keys. W/S travel forward/back, A/D sideways, R/F local
up/down, Q/E roll, and arrows look. All are rebindable in Controls, with conflicts
checked within their active context. NAV suspends every fleet shortcut and world
order click, not existing orders or the simulation. Its labelled motion buttons
provide a mouse-only route; the one-handed fleet layout is unchanged.

Middle drag translates on the final camera right/up axes; Shift-middle turns locally.
Wheel travels forward/back and Shift-wheel changes world depth by 150 m. Travel is
200 rendered m/s by default, adjustable over 50–800 in Controls; keyboard rotation
is 60 degrees/s. The eye sweeps the rendered terrain triangles and authored roof/rock
boundaries, maintaining 25 m depth clearance. A blocked move stops without levelling.
Entry retains the current orientation and uses the legal command focus when the
orbit eye is outside water; a focus without clearance refuses entry.

Home leaves both modes and restores north/55 degrees/seabed at the saved command
focus and orbit dolly. Escape leaves NAV before cancelling placement or opening the
menu. Blur, focused controls, mode exit, disconnect and menus clear held movement.
Flight has neither edge scroll nor sway. The upright EYE instrument distinguishes
camera depth from hull depth, displays world up and marks a pole VERTICAL.
Hull models stay at canonical 1× scale in flight rather than inheriting the saved
orbit's survey enlargement; marine snow follows the free eye. The MENU button remains
available in NAV and opening it releases navigation immediately.
The scope clips the forward ground footprint against the frustum and map; when it
has none, only the eye and orientation cue remain. Audio uses the final rolled basis
for earned bearings, never for a directionless contact.

## 5. What the yaw lock protected, and where each protection goes

The old rule carried four loads. Each moves; none is dropped.

- **The scope and the viewport must agree on north.** They still do — by the scope staying
  north-up, which it always was, and *not* by the viewport being north-up. The agreement was
  never really about north; it was about the player being able to point at the scope and the
  world and know they are the same water. That job now belongs to the **camera box**, which
  the scope already draws as the view's true ground footprint — a trapezoid, from
  `groundQuad()`, computed by unprojecting the screen corners for the bounded orbit.
  This does not prove a finite footprint for upward or rolled flight: the new contract
  requires clipping and an explicit no-footprint state. Under the orbit that box *rotates*,
  and a rotating box in a north-up frame is a compass. It gains one mark: the far edge is
  drawn heavier, so the box says which way the camera is facing as well as where it is. The
  scope becomes the instrument that answers "which way am I looking" — which is what an
  instrument layer is for, and is the same move §4 of
  [three-layer-ocean.md](three-layer-ocean.md) made when it sent the chart register to the
  scope rather than deleting it.
- **One-glance legibility of a fixed frame.** Re-homed onto `Home` and onto the defaults: the
  camera still *opens* north-up at 55° on the seabed, every match, and returns there on one
  key. What the old rule bought by making the frame impossible to leave, this buys by making
  it impossible to lose.
- **Honest measurement.** Untouched, and this is the part that costs nothing — which is worth
  saying plainly, because it is the payoff of a decision made two revisions ago. Range rings
  are already projected **vertex by vertex** onto the terrain through the shared camera rather
  than approximated as screen ellipses, so they conform through the orbit's yaw and pitch
  band. Flight must still verify near-plane and behind-camera clipping. A camera revision that had to renegotiate the 2,400 m ping ring
  would not be worth having; this one does not, because the Phase-1 renderer was built
  camera-agnostic on purpose.
- **No atmosphere pass may rotate the projection.** Survives **verbatim**, and the distinction
  is now load-bearing rather than incidental: the *player* may turn the camera; an *effect*
  may not. Sway stays translation only. The moment a vignette, a parallax fog layer or a
  chromatic split bends a range ring it has crossed from mood into misinformation, and that
  was never a statement about who was allowed to rotate what — it was a statement about
  measurements.

## 6. What does not move at all

- **Server-authoritative resolution.** A camera verb changes what the client draws, never
  what it receives. The conn view holds own-force payloads and live Tier-4 hull and
  structure tracks, and nothing else about the enemy to leak; turning it around cannot reveal a contact the Echo
  Layer did not resolve.
  This is the rule that makes a free camera *safe* in a hidden-information game, and it is
  worth stating because in most games it would not be: here the client genuinely does not
  have the data, so there is nothing for a free look to find.
- **The Asymmetric Fidelity Law.** Contacts stay tier-capped billboarded impostors at every
  angle. A contact seen from the side is the same smudge it was from above — it does not gain
  a profile because the camera earned one.
- **Glow is loudness.** Gate 3's `E(SIG)` curve is a material property and does not know where
  the camera is.
- **What you click is what the simulation collides.** Picking resolves through the same
  camera, so it follows it for free. An order lands on the first thing the cursor's ray
  meets, the ground or — with the focus raised — the plane at the focus depth, so a click on
  a ridge face is on the ridge rather than in the water behind it ([ui-ux.md](ui-ux.md) §9).
- **Every cost in the water column.** Crush, sour, PR, the thermocline — none of them is a
  camera rule, and the camera going somewhere is not a hull going there.

## 7. What "vast" would actually cost — F4, unpromised

The feedback's fourth word is the one this revision does not deliver, and it should say so
rather than bank the credit.

The free camera buys the *feeling* cheaply and honestly: at 10° of pitch with the focus at
2,000 m, a trench reads as a corridor receding into fog, and three kilometres of water
finally looks like three kilometres. That is the cheapest dread available and it is the
strongest argument for landing this first.

Actual vastness — larger maps — is a different project, and it is a **simulation** project
rather than a rendering one:

- Several passes are O(cells) per rebuild, and the terrain mesh is a single heightfield.
  Both want chunking before the map grows.
- The Echo Layer's broadphase bounds audible range by assuming the loudest water on the map
  (`MAX_PROPAGATION_FACTOR`); a bigger map makes that bound looser in exactly the place the
  frame budget is tightest.
- `DEPTH.MAX_M` is already marked TUNABLE and temporary — it belongs to map data rather than
  to the ruleset ([ROADMAP.md](ROADMAP.md), Phase 3). A deeper column is that migration's to
  give, not this document's.
- The floor is the desktop of [graphics-standards.md](graphics-standards.md) gate 6, which is
  what decides how much map is affordable at all. The phone that set it before is no longer a
  platform: the client is keyboard and mouse only (#1132).

None of that is camera work, and doing it under cover of a camera change would be the wrong
shape. It is named here so the feedback's fourth goal has an address.

**The continuous world does not pay any of it** (#1449). [world-map.md](world-map.md) §7 draws
the Rift around a mission as public, render-only geography: the server simulates the active
mission on its own map as it does today, and nothing outside that map moves, sounds or is
detected. The world borrows the *look* of a larger map and none of its simulation. Chunked
simulation, a broadphase bound for wider water and the move of `DEPTH.MAX_M` into map data
stay unpromised, and the atlas drawing ground to the Mouth's 4,410 m changes none of them.
The renderer's own costs — an overview mesh and bounded regional detail — are the frame's, and
gate 6 counts them whole (§7.5 of that document).

## 8. Gates — what changes, what does not

- **Gate 8 is rewritten, not weakened.** "One camera, honest geometry" survives whole; "pitch
  locked at 55°, yaw locked to north" becomes "one camera, freely aimed, with measurements
  conforming and symbols billboarding at every angle it allows". The gate's real content was
  always that *nothing keeps a second projection*, and that is unchanged.
- **Every gate judged "at every zoom the camera allows" is now judged at every *angle* it
  allows.** That is a genuine widening of gates 6 and 7, and it is the honest price of the
  freedom: a fleet legible from 55° may not be legible at 12°, and a draw-call budget met
  looking down may not be met looking along, where the far half of the map is in frame.
- **The art PR checklist keeps its screenshot rule**, and a camera revision is reviewed by
  looking at it — now at more than one angle.

## 9. Migration plan

| Phase | Delivers | Touches |
| --- | --- | --- |
| **D — Docs** | This document. [art-direction.md](art-direction.md) "Camera & Projection" rewritten to §4–§5, [graphics-standards.md](graphics-standards.md) gate 8, [three-layer-ocean.md](three-layer-ocean.md) §4's yaw-lock line marked superseded, [ui-ux.md](ui-ux.md) §9 controls | docs only |
| **1 — The rig** | The camera itself: focus depth, free yaw, free pitch, yaw-aware pan, the eye clamp, `Home`. The probe reports the new state so the harness can frame a shot at any angle | frontend |
| **2 — The verbs** | Input wiring — orbit, focus depth, reset, touch twist (gone with touch, #1132) — the Controls screen rows, and the scope camera box's heavy far edge | frontend |
| **3 — The angles** | Gates 6 and 7 re-measured across the pitch band; readability and draw-call budgets restated per angle if the numbers ask for it | frontend, docs |
| **4 — Pitch on touch** | Retired by #1132: the client is keyboard and mouse only, so no surface lacks `Shift` and a wheel | — |
| **5 — The water** | F1's other half: a depth-graded medium where the frame used to be void — the ramp, the fog that reads it, the backdrop, marine snow, and the setting §11 owes a contrast reduction | frontend, docs |

Phases 1 and 2 are one increment in practice — a rig with no verb bound to it is not
reviewable — and ship together.

### Phase 5 — landed

The water is a medium: `packages/frontend/src/game/water.ts` carries the depth ramp, the
shader-chunk patch that makes three's fog read it, the backdrop and the marine snow;
[art-direction.md](art-direction.md) "Reading the Water" is the SPEC it transcribes.
Review screenshots are in `docs/screenshots/issue-836/`, the same five frames as
`issue-831/` so the pair can be read against each other. They predate #1016: the fog mixed
its linear ramp into a fragment three had already encoded, so fogged ground sank toward black,
below the backdrop it should meet. `docs/screenshots/issue-1016/` pairs frames before and
after the fix, with `tools/render-stack/fog.mjs` measuring the meeting.

What the phase settled:

- **F1 is delivered.** At 10° of pitch with the eye at 403 m the frame is water rather than
  void: a column that darkens downward, particulate that parallaxes past the camera, and a
  seabed that dissolves into the medium instead of ending at a line.
- **The horizon stops existing where the far ground is as deep as the water behind it.**
  The fog over geometry and the backdrop grade the same ramp, so there the far seabed fades
  toward the colour the water behind it already is. That is the term that removes the edge,
  and it is the one term the issue's three candidate approaches would each have got half of.
- **Where the far ground is at another depth, the edge stays, and it is meant (#1023).** The
  two grade different depths: the fog takes the fragment's own, the backdrop the focus's,
  moved by where the ray points. So a far trench seen against water graded from a plateau's depth stays darker than
  that water, and far ground shallower than it stands brighter. Each is depth read as
  luminance, the rule both terms transcribe, rather than a seam. With the focus raised to
  700 m over Ventfront's north trench, the backdrop beside the far trench is graded 842 to
  1,162 m, 897 m at the median, and reads a median sRGB (6, 22, 32) over the trench's
  (3, 8, 14).
  `tools/render-stack/fog.mjs` measures it, and `docs/screenshots/issue-1023/` holds the
  frame and readings, taken on SwiftShader; the module's seam reading there matches #1016's
  GPU one to the level.
- **The camera has no depth, and this is where that first mattered.** The column is drawn
  at 0.22 world-metres per metre, so at the home dolly the eye sits 8,946 m *above* the
  surface. Anything anchored to the eye's height reads that as a depth and lights the frame
  from a surface that is not there; the water anchors to the focus, which §4 already clamps
  to the column.
- **Gate 6 holds, with two draw calls spent.** The Ventfront base measured 41–54 calls and
  143–148 k triangles across the band, against the budget's 150 and 250 k — the same 34–52
  the phase-1 drive recorded, plus the backdrop and the snow, which are one draw call each
  and whose fog costs none at all because it is a patch on chunks that were already
  compiled into every material.

### Phases 1 and 2 — landed

The rig is free: `PerspectiveView.ts` carries a focus with a depth, a yaw, a pitch inside
the band, `home()`, and the eye clamp; `EchoRenderer.ts` carries the verbs. Review
screenshots live in `docs/screenshots/issue-831/`.

What the phase settled:

- **The whole pitch band renders, and gate 6 holds across it.** The Ventfront base measured
  34–52 draw calls and 141–148 k triangles from 10° to 88°, against the budget's 150 calls
  and 250 k triangles. The low-pitch shot costs *fewer* draw calls than the home frame, not
  more, because the foreshortened view holds less map rather than more — the widened
  judgement §8 asks for turned out to be cheap here, and that is a measurement rather than a
  prediction, so it is worth re-taking when the roster or the props grow.
- **The rings conformed with no change at all**, exactly as §5 predicted. A 2,400 m ring
  drawn at yaw 135° lies on the same water it lay on at yaw 0.
- **The eye reaches the column.** At the shortest dolly the band allows (250 m) and 10° of
  pitch, the eye sits at 403 m with the focus at 600 m — genuinely in the water, looking
  level at a Bastion from its own depth. The dolly is in world units and the column is drawn
  at 0.22 world-metres per metre, so a *long* dolly still lifts the eye clear of the surface;
  the in-water shot is the close one, which is the right way round.
- **What the low shot exposed was the water itself (#836).** Above the seabed's horizon the
  scene was void rather than water. `scene.fog` was a linear *distance* fog over **geometry**,
  so where there was no mesh there was no fog — only the clear colour — and the column between
  the camera and what it was looking at neither darkened with depth nor read as a medium. That
  was F1's remaining half. It was invisible while the camera was pinned at 55°, because the
  seabed filled the frame; freeing the camera is what exposed it, which is the ordinary way a
  presentation revision finds the next one. Phase 5 below is that half, landed.

---

## Related

- **[free-water-slice.md](free-water-slice.md)** — the future six-degree flight, destination and integrated-world contract
- **[three-layer-ocean.md](three-layer-ocean.md)** — the revision this one continues: the camera that replaced the plan view, and the phases that landed it
- **[art-direction.md](art-direction.md)** — "Camera & Projection", the SPEC §4 rewrites, and "Reading the Water", the medium phase 5 landed
- **[graphics-standards.md](graphics-standards.md)** — gate 8, and the gates now judged at every angle
- **[systems-depth.md](systems-depth.md)** — the column the camera is finally free to move through, and every cost that is a hull's rather than the camera's
- **[ui-ux.md](ui-ux.md)** — §5's sonar scope, which becomes the compass, and §9's controls
- **[maps.md](maps.md)** — how much water there actually is, for §7
