/**
 * The public face of the mission catalogue.
 *
 * The full mission definitions — parties, positions, predicates, beats — are
 * authoring data and live server-side (`packages/backend/src/sim/missions/`),
 * for the reason `maps.ts` gives about spawn positions: a client holding an
 * objective's threshold or a party's starting position before a match would
 * hold information it has not earned. A mission's secrets are the same kind of
 * secret as an enemy's position.
 *
 * The header is what a title screen and a briefing need before any room exists,
 * and `missions.test.ts` holds it to an allow-list, so a future public field is
 * a decision somebody argued for rather than one that drifted in.
 */

import { DRIFT } from './constants.js';

/**
 * Campaign keys, from the campaign titles rather than the faction names —
 * docs/campaign.md §4–§7 title the four campaigns *The Ledger*, *The Second
 * Seeding*, *The Attending* and *The Second Chord*, and the mission documents
 * of record state title-namespaced ids (`ledger-asset-recovery`,
 * `seeding-tend`). An earlier draft of this union keyed on factions; the docs
 * are canonical and the code is the side that moved. The last two keys follow
 * the `seeding` precedent — the title's load-bearing word — and their own
 * documents of record may still move them, since neither campaign has one.
 */
export type CampaignId = 'prologue' | 'ledger' | 'seeding' | 'attending' | 'chord';

/**
 * One alternate briefing, and the scene whose having-been-witnessed selects it
 * — docs/campaign.md §1: a scene you have already seen from the other side
 * changes the **briefing text** and never the mission.
 *
 * Keyed by a **scene** rather than by a mission id, because the point of the
 * rule is that two missions witness one scene. *Tend*'s sweep hearing the
 * gardens and *Thin Water*'s column meeting a closure on charted water are the
 * same event read from either end, so the thing the record remembers has to be
 * the event. A mission-keyed variant would have to say "if Tend was played",
 * which is not the fact anybody wants: Tend can be played without the sweep
 * ever hearing anything, and then nothing was witnessed at all.
 *
 * An **ordered list** rather than a map from scene to briefing, so that a
 * mission whose two variants could both apply resolves to one of them by an
 * authoring decision rather than by object key order. First match wins.
 */
export interface MissionBriefingVariant {
  /** The scene id, as the mission that authored it names in its resolution. */
  scene: string;
  /** The whole briefing, not a patch. Paragraphs, exactly as `briefing` is. */
  briefing: readonly string[];
}

/**
 * The sweep heard the Marr Plateau's gardens working, and filed them —
 * docs/mission-tend.md §8, the *filed* reading.
 *
 * Named here rather than in the mission that latches it because a scene is
 * shared by construction: `seeding-tend` writes it, `seeding-thin-water` and
 * `seeding-convocation` read it, and a string typed out three times in three
 * packages is the shape of a bug that never fails a build. The value is the
 * event, not the mission — a plateau that came home unfiled witnessed nothing,
 * however completely it was played.
 */
export const MARR_PLATEAU_FILED = 'marr-plateau-filed';

export interface MissionHeader {
  /**
   * Namespaced by campaign. Two missions in the campaign are both called
   * "Conclave" (docs/campaign.md), so the display name is not unique and this
   * is — which is also why ids are not a global 1..29 numbering.
   */
  id: string;
  campaign: CampaignId;
  /** Slot within its own campaign, 1-based. */
  ordinal: number;
  name: string;
  /** One line for the entry that offers it. Never the win condition. */
  premise: string;
  /** Already public: the room sends the map on join either way. */
  mapId: string;
  /** docs/campaign.md §10 — 12–25 minutes, in seconds. */
  lengthBandS: readonly [number, number];
  /**
   * The briefing, in paragraphs, read before the socket opens.
   *
   * `null` means withheld — the room sends it on join instead. That is a
   * per-mission decision rather than a property of briefings: three missions in
   * the campaign are winnable only as evacuations (docs/campaign.md §2), and
   * for those the briefing can itself be the leak. Sorrowgate's names no hidden
   * fact, so it ships public and the player may read it before committing.
   */
  briefing: readonly string[] | null;
  /**
   * Alternates for a player who has already witnessed the scene each names —
   * docs/campaign.md §1. Omitted is the twelve missions with no pair yet.
   *
   * Public for the same reason `briefing` is, and no more public than it: a
   * shell that ships both texts holds two things the player may read, not one
   * thing they have not earned. The variant is chosen **client-side** from the
   * progression record, so a mission's alternates cost nothing on the wire and
   * the room never learns which one was read — the mission does not know, and
   * §1 requires that it cannot: a briefing that changed the mission would be
   * the rule arguing with itself.
   *
   * A mission whose `briefing` is `null` withholds it on purpose (see above)
   * and authors no variants; `missionBriefing` keeps that true.
   */
  briefingVariants?: readonly MissionBriefingVariant[];
}

export const PROLOGUE_SORROWGATE_HEADER: MissionHeader = {
  id: 'prologue-sorrowgate',
  campaign: 'prologue',
  ordinal: 1,
  name: 'Prologue — Sorrowgate',
  premise: "Arbiter Halloran's court, a collapsed transit dome, and an order not to make a sound.",
  mapId: 'sorrowgate',
  lengthBandS: [1080, 1260],
  briefing: [
    'Four hulls have been admitted. Their hardpoints were struck in this chamber in front of all four parties and the tools are on the table where they were struck. Nobody has to take anybody’s word for anything today. That is the whole of what this court is.',
    'Fourteen people are in the record. Nine were taken off a face that two parties have called theirs. Five went into plateau water and did not come out of it. The count is closed. It was closed two tides ago and it does not reopen because somebody has since thought of a better argument.',
    'The flight holds at the arch and the flight stays under twenty. The court’s array is on, and while your hulls are quiet you hear what the court hears. Be loud and you are shoving, and the court will not hear past you — it will hear you, and you will hear nothing else until it is paid back.',
    'There is deep water under this gate, and something in it that the city put there before the count started and has never had a reason to disturb. Nobody in this chamber transmits today. If anybody does, the court will strike their hulls as well, and it will not matter, because it will already be too late to matter.',
    'The parties are admitted. The record is open.',
  ],
};

export const LEDGER_ASSET_RECOVERY_HEADER: MissionHeader = {
  id: 'ledger-asset-recovery',
  campaign: 'ledger',
  ordinal: 1,
  name: 'The Ledger — Asset Recovery',
  premise:
    'Face Six stopped transmitting. A salvage column, a recovery writ, and everything that listens.',
  mapId: 'ninefold-face-six',
  // Closes at 18:00 exactly (docs/mission-asset-recovery.md §9), inside
  // campaign.md §10's 12-25.
  lengthBandS: [1020, 1140],
  /**
   * The recovery writ, read to the column at 00:00 — docs/mission-asset-recovery.md
   * §12, verbatim. Public for Sorrowgate's reason: it names no hidden fact.
   * The taps, the chamber, the count and the schedule are all stated to the
   * column before the first order is given, because a writ that withheld its
   * own manifest would not be a Consortium document.
   */
  briefing: [
    'Face Six stopped transmitting at the turn of the second tide. The seismic record is attached and is not ambiguous. The face is closed. This is a recovery, not a reopening.',
    'Three assets are listed. Asset 9-06-114, the cutter head. Asset 9-06-181, the walking frame. Asset 9-06-200, the refuge chamber — contents seventeen, condition transmitting. The chamber is rated for four tides and the third began with this writ. That is stated so the schedule is understood.',
    'The work will be loud. That is not a defect in the plan; it is the plan. The column carries the Klaxon fit, and the column that can be heard is the column that is still transmitting. You are not asked to be quiet. You are asked to be finished.',
    'The Drift will attend the work. Price it as weather, not as opposition. Fauna commit to the loudest hull in reach, and the manifest was drawn so that the loudest hull in reach is the one built for it.',
    'Exposure is authorised. Sentiment is not. Signed for the Board.',
  ],
};

export const LEDGER_SHIFT_CHANGE_HEADER: MissionHeader = {
  id: 'ledger-shift-change',
  campaign: 'ledger',
  ordinal: 2,
  name: 'The Ledger — Shift Change',
  premise:
    'Face Two runs its last shift like any other. The audit is on the road, and the crews do not know yet.',
  mapId: 'ninefold-workings',
  // The whistle at 16:00 (docs/mission-shift-change.md §9), inside §10's 12-25.
  lengthBandS: [900, 1020],
  /**
   * Osk, to the shift command, at muster — docs/mission-shift-change.md §12,
   * verbatim. Public for Sorrowgate's reason: it names no hidden fact the
   * mission withholds. The audit's transit plan is filed in advance because
   * that is what an audit is, and the one thing Osk does not say out loud is
   * the one thing he does not say out loud in the water either.
   */
  briefing: [
    'Works order for the tide: Face Two runs its shift, reports its number, and stands down its watches on the bell. Quota is three thousand six hundred. The seam will cover it if the seam is worked, and Five will cover what Two cannot. That is the shift. It is the same shift as yesterday, and it will read like it.',
    'Risk and Actuarial are on the field today. Their transit plan is filed and it is on the board: two passes on the High Road, docked at the rail between. An audit that files its plan is telling you it has nothing to hide, and expecting the same. Give them a working face. That is not a trick; a working face is what this is. Run your throttles like it is any tide, because it is.',
    "Watches stand down in order. Berthing is rigged on the barges and Vail has the lists. The transfer paperwork is standing works orders, hull movements between sites, current and correct. If anyone asks a barge's business, its business is on its manifest, and its manifest is right.",
    'One more thing, and then the bell. The climb to the rail is long and the layer is where it has always been. Nobody crosses it under way while the road is listening unless I say so, or unless you have worked out for yourselves why I would not. You have all been on this face long enough to have worked it out. The shift is open.',
  ],
};

export const LEDGER_BAFFLE_HEADER: MissionHeader = {
  id: 'ledger-baffle',
  campaign: 'ledger',
  ordinal: 3,
  name: 'The Ledger — Baffle',
  premise:
    'A closed trench, a failing plant at the far end of it, and two chambers of quiet water on the only road.',
  mapId: 'fourth-trench',
  // The yard's plant fails at 20:00 (docs/mission-baffle.md §9), inside §10's 12-25.
  lengthBandS: [1140, 1260],
  /**
   * The relief writ, read to the convoy at muster — docs/mission-baffle.md
   * §12, verbatim. Public for Sorrowgate's reason: it names no hidden fact.
   * The stations are on every chart including theirs, the picket announces
   * its own law, and the one thing the writ withholds — a transit request —
   * it withholds from the inquiry, not from the player.
   */
  briefing: [
    'The Deep Yard’s plant fails in twenty minutes of transit time. The replacement is crated and the escort is funded. The long route misses the arithmetic by two tides. This writ takes the short one.',
    'The Fourth Trench is closed to chartered freight while the exchange inquiry runs. The concern has reviewed the closure and finds it is not the concern’s. No transit request has been filed: a request enters the yard’s condition into the inquiry’s record, and that exposure is priced above yours. You are advised of the pricing so that nobody mistakes it for an oversight.',
    'Two baffle stations are moored at the chartered lay-bys. Advance station to station. Fight at the mouths, where the bubble bends the water your way; do not fight in the open corridor, which is theirs from end to end and carries everything. The escort carries the survey array. Transmit once, late, and commit on what it returns. The trench will hear the transmission. The trench hears everything; that is what a trench is.',
    'The picket will announce the closure. It will be correct. Proceed.',
    'Forty-one berths are on the yard’s complement. The plant you are hauling is the line item above them. Exposure is authorised. Sentiment is not. Signed for the Board.',
  ],
};

export const LEDGER_EXPOSURE_HEADER: MissionHeader = {
  id: 'ledger-exposure',
  campaign: 'ledger',
  ordinal: 4,
  name: 'The Ledger — Exposure',
  premise:
    "Three unarmed hulls under the layer, six sounds in somebody else's country, and thirty seconds of deniability.",
  mapId: 'first-trench-margin',
  // The watch change at 18:00 (docs/mission-exposure.md §9), inside §10's 12-25.
  lengthBandS: [1020, 1140],
  /**
   * The survey charter, read at muster — docs/mission-exposure.md §12,
   * verbatim. The first Ledger briefing not signed for the Board, and public
   * for Sorrowgate's reason: the charter names its own budget, its own
   * recall rule, and the terms of its own deniability, because a charter
   * that withheld them would have nothing to recall against.
   */
  briefing: [
    'The Division requires field readings of the trench margin’s working economy. Six points are charted. Four close the interval. The model this bounds is the one the Board’s arithmetic stands on, and the Division observes, without further comment, that at present it stands on an assumption.',
    'The survey is chartered, unarmed, and deniable. Deniability is a consumable. It is spent by Classification: thirty seconds of it, cumulative, across the charter, at which point the charter is recalled and the survey’s business becomes coming home. The first twenty seconds are yours to allocate. The last ten are the Division’s, and the Division’s guidance at thirty is unambiguous.',
    'Under the layer you are deaf to the concern and the concern is deaf to you. That is not a defect in the charter. It is the charter: what cannot hear you cannot be asked about you.',
    'The record returns in duplicate or it is not a record. Two hulls home is the interval; one is an anecdote; none is a file the Division has opened twice before and not yet closed.',
    'Exposure is budgeted. Nothing further is authorised. For the Division.',
  ],
};

export const LEDGER_TOLERANCE_HEADER: MissionHeader = {
  id: 'ledger-tolerance',
  campaign: 'ledger',
  ordinal: 5,
  name: 'The Ledger — Tolerance',
  premise:
    'A casting poured before year zero has failed. The yard’s tungsten pours once, and the gauge fits both apertures.',
  mapId: 'holding-underworks',
  // The water stops at 17:00 (docs/mission-tolerance.md §9), inside §10's 12-25.
  lengthBandS: [960, 1080],
  /**
   * The breach writ, read to the column at the yard — docs/mission-tolerance.md
   * §12, verbatim. Public for Sorrowgate's reason and one more: the mission's
   * whole design is that the arithmetic is not hidden from the player, so a
   * briefing that withheld any of it would be the design arguing with itself.
   */
  briefing: [
    'A casting poured before year zero failed at the turn of the tide. The Underworks are flooding in stages. The cascade reaches Sector Vayle’s frame above and the root aperture below, and the yard’s tungsten pours once. The gauge fits both apertures. That is not a provision of the writ; it is a fact about the concern’s standards, and the writ declines to apologise for either.',
    'Below the line at eighteen hundred metres, a hull spends four points a second of what does not heal. The root run is roughly thirty seconds below the line, driven clean. The barge is three hundred points. The arithmetic is stated so that nobody performs it for the first time under the overhang.',
    'Two hundred and forty berths were occupied in Vayle at the alarm. The evacuation proceeds and will not finish. The root carries the Holding, which carries the count you already know, because everyone does.',
    'The writ funds the pour, the escort, and one delivery. It does not state a preference. The Board has considered whether that is a mercy or an abdication and has minuted the question without resolving it.',
    'The Chair is on the channel. Exposure is authorised. Sentiment is not. Signed for the Board.',
  ],
};

export const LEDGER_PROSPECT_HEADER: MissionHeader = {
  id: 'ledger-prospect',
  campaign: 'ledger',
  ordinal: 6,
  name: 'The Ledger — Prospect',
  premise:
    'The only candidate field is the rim. Four navies are on it this week, and the survey goes down anyway.',
  mapId: 'mouth-rim',
  // The writ turns north at 22:00 (docs/mission-prospect.md §9), inside §10's 12-25.
  lengthBandS: [1260, 1380],
  /**
   * The survey writ, read at the staging — docs/mission-prospect.md §12,
   * verbatim. Public for Sorrowgate's reason: the writ's whole posture is
   * that the descent will be heard by everything, so there is nothing left
   * for a briefing to give away.
   */
  briefing: [
    'The concern requires a producing field inside eleven years or the concern requires an orderly dissolution plan, and the Board has reviewed the second document and declines to circulate it. The only candidate field is the rim. This writ proves it or does not.',
    'Six faces are charted on the terraces. Four, read by hand to survey standard, prove the field. The readers are calibrated to their banks; the procedure names hulls, and the procedure is right to.',
    'The expedition is refit to the third rating, certificated, and unarmed. Three navies are on the rim this week for three stated reasons, none of which is ours and none of which is false. The writ prices an incident above a field, and the Board asks the expedition to read that sentence twice.',
    'The descent will be heard by everything. That is the physics of arriving and the writ does not apologise for physics. The ascent begins no later than the turn, whatever the count stands at, because a survey that stays is a different asset class and the registry has a word for it.',
    "Two returns on the lip are on file as equipment fault. The file is standing practice. The writ directs the expedition's instruments at the faces, and its attention wherever the shift requires, and it does not define the difference. Exposure is authorised. Sentiment is not. Signed for the Board.",
  ],
};

export const LEDGER_ITEM_NINE_HEADER: MissionHeader = {
  id: 'ledger-item-nine',
  campaign: 'ledger',
  ordinal: 7,
  name: 'The Ledger — Item Nine',
  premise:
    'Nine items stand. The chamber hears everyone at once. What the chair does with the ninth is the chair’s.',
  mapId: 'holding-board',
  // The chamber empties at 12:30 (docs/mission-item-nine.md §9), just over §10's floor.
  lengthBandS: [720, 840],
  /**
   * The session notice, as the registry circulates it — docs/mission-item-nine.md
   * §12, verbatim: the shortest briefing in the campaign, because the campaign
   * has already said everything it is about. Public for the oldest reason —
   * it names no hidden fact, and the one fact that matters tonight has been
   * noted for completeness at every session for one hundred and twenty-six
   * years.
   */
  briefing: [
    'The Ninth Board sits at the turn of the tide. Nine items stand. The chair’s flight holds at the rail for the sitting, per custom: the chamber is listened to, not watched, and a hull under way during a sitting is shoving.',
    'The rim field is item six. The Division’s model is item five, under seal. Item nine is item nine.',
    'The chair’s barge carries the survey array, returned with the expedition and not yet struck. The registry notes this for completeness. What is transmitted in the Underway cannot be untransmitted; the registry notes that for completeness also, as it has noted it at every session for one hundred and twenty-six years.',
    'The session runs its length. It always has. Signed for the registry.',
  ],
};

export const SEEDING_TEND_HEADER: MissionHeader = {
  id: 'seeding-tend',
  campaign: 'seeding',
  ordinal: 1,
  name: 'The Second Seeding — Tend',
  premise: 'One tide of Marr Plateau’s ordinary work. Nothing attacks you. The sweep is listening.',
  mapId: 'marr-plateau',
  // The tide ends at 16:00 (docs/mission-tend.md §9), inside §10's 12-25.
  lengthBandS: [900, 1020],
  /**
   * Spoken by Tidespeaker Ysolde Marr at dawn tide — docs/mission-tend.md §12,
   * verbatim. Public, and pointedly so: a briefing that orders nobody to do
   * anything has nothing to give away, and the Commune's refusal of the
   * imperative mood makes it genuinely harder to parse than an order —
   * campaign.md §10 says that is the point, and the document agrees in
   * writing.
   */
  briefing: [
    "We're not going to tell you what to do today. That isn't the arrangement, and today of all days the arrangement is the point.",
    "The bloom is ready on the north gardens and the share wants bringing in — we think three loads is a day. The west lane's jellies have walked in the current again, the way they do, and the lane is louder than we like it. And Teel's landing took the storm badly last tide. We have bread that remembers being grain. Somebody could carry it over, if they were going that way.",
    'The concern is running the drop today, charting. They call it a survey, and it is one. What their instruments hear, their ledgers keep, and a garden in a ledger is halfway to being an asset. When the sweep comes up the lane, the plateaus go still. Nobody orders that. Watch how everybody does it anyway.',
    "Nothing out there means you harm. We'd like the day back the way we're lending it to you: quiet, fed, and unfiled.",
  ],
};

export const SEEDING_THIN_WATER_HEADER: MissionHeader = {
  id: 'seeding-thin-water',
  campaign: 'seeding',
  ordinal: 2,
  name: 'The Second Seeding \u2014 Thin Water',
  premise:
    'Ten loaded tenders, four kilometres of bare rock between two gardens, and a line the concern has closed across it.',
  mapId: 'kell-shoulder',
  // The count is read at 14:00 (docs/mission-thin-water.md \u00a79), at the short
  // end of campaign.md \u00a710's 12\u201325 and deliberately so: the mission is one
  // continuous withdrawal, and a longer one would be the same decision taken
  // four more times.
  lengthBandS: [780, 900],
  /**
   * Spoken by Tidespeaker Ysolde Marr at the load-out, from Marr, on the
   * plateau channel \u2014 docs/mission-thin-water.md \u00a712, verbatim.
   *
   * Public, and the evacuation carve-out above was considered and declined.
   * The briefing names no fact the mission withholds: the closure above Kell
   * is posted, the concern posts everything, and \u00a712's own account of what
   * this text is for \u2014 "the briefing's job is to pay that cost in advance
   * instead of under fire" \u2014 requires that it be read in advance. What it
   * withholds is what Marr does not know: that the corridor will commit, and
   * that a second element closes it at 13:00.
   */
  briefing: [
    'We\u2019re not going to tell you what to do out there. That hasn\u2019t changed and we\u2019re not going to change it today of all days, because today is the day somebody will wish we had.',
    'The bloom at Kell came early and the turning wants seed. Ten went. We think ten was more than the shoulder is owed and the count didn\u2019t finish before the tide did, so ten is what\u2019s out there, and that\u2019s ours, not yours.',
    'Here\u2019s the thing we\u2019re saying now while it\u2019s daylight and nobody\u2019s frightened. We\u2019d like six of you home at the least. We\u2019re saying the number here so that nobody has to say it out there \u2014 so that when it\u2019s loud, it\u2019s already been agreed, and no one aboard has to be the person who decides that six is enough. Six isn\u2019t enough. It\u2019s what we agreed.',
    'The concern has a line closed above Kell. They\u2019ll have posted it. They post everything. If they ask you what you are, you won\u2019t have the answer they\u2019re asking for, and we\u2019d rather you spent that second moving.',
    'There\u2019s no kelp between Kell and here. You know that. We\u2019re saying it anyway, because the number on your hull was measured somewhere with kelp in it.',
  ],
  /**
   * docs/mission-thin-water.md \u00a712, "Already seen: a filed plateau" \u2014 the first
   * concrete case of docs/campaign.md \u00a71's rule, promised by
   * docs/mission-tend.md \u00a78 before either end of it existed.
   *
   * Exactly one paragraph differs from the default, and that is the whole
   * argument for the rule rather than a saving of effort: the column, the
   * count, the six and the kelp are the same load-out either way, because the
   * mission is the same mission. What changed is what Marr knows about the
   * closure \u2014 the concern is moving on water it has already charted, and she
   * knows it because the sweep that charted it was heard doing so.
   */
  briefingVariants: [
    {
      scene: MARR_PLATEAU_FILED,
      briefing: [
        'We\u2019re not going to tell you what to do out there. That hasn\u2019t changed and we\u2019re not going to change it today of all days, because today is the day somebody will wish we had.',
        'The bloom at Kell came early and the turning wants seed. Ten went. We think ten was more than the shoulder is owed and the count didn\u2019t finish before the tide did, so ten is what\u2019s out there, and that\u2019s ours, not yours.',
        'Here\u2019s the thing we\u2019re saying now while it\u2019s daylight and nobody\u2019s frightened. We\u2019d like six of you home at the least. We\u2019re saying the number here so that nobody has to say it out there \u2014 so that when it\u2019s loud, it\u2019s already been agreed, and no one aboard has to be the person who decides that six is enough. Six isn\u2019t enough. It\u2019s what we agreed.',
        'The concern has a line closed above Kell, and they\u2019ll have posted it. They post everything. This one sits on water they have already been over: the sweep heard us on the lane when they came up charting, and what their instruments hear their ledgers keep. So they are not guessing at what moves between two gardens tonight. They have it written down, in a hand that is tidier than ours. If they ask you what you are, you won\u2019t have the answer they\u2019re asking for, and we\u2019d rather you spent that second moving.',
        'There\u2019s no kelp between Kell and here. You know that. We\u2019re saying it anyway, because the number on your hull was measured somewhere with kelp in it.',
      ],
    },
  ],
};

export const SEEDING_CONVOCATION_HEADER: MissionHeader = {
  id: 'seeding-convocation',
  campaign: 'seeding',
  ordinal: 3,
  name: 'The Second Seeding \u2014 Convocation',
  premise:
    'A plateau votes while it is being stood on. The walk goes row to row, and it takes exactly as long as it takes.',
  mapId: 'marr-plateau',
  // The tide turns at 19:00 (docs/mission-convocation.md §9), inside §10's
  // 12–25. The second mission to resolve to `marr-plateau`, which is §11's
  // most consequential scoping decision and is deliberate.
  lengthBandS: [1080, 1200],
  /**
   * Spoken by Tidespeaker Ysolde Marr, off-tide, after the bell —
   * docs/mission-convocation.md §12, verbatim. Public for Tend's reason and
   * one of its own: a briefing that orders nobody to do anything has nothing
   * to give away, and this one states the ceiling, the concern's method and
   * the bell's existence in advance because §4's whole argument is that the
   * player should meet none of the three for the first time under pressure.
   */
  briefing: [
    "We rang it off-tide. You'll have heard. Everyone will have heard \u2014 Anholt's people, Teel's, and the lane. That's not a slip. A plateau that convenes says so, out loud, and stops working while it does.",
    "Anholt asks us to turn a second seeding. We're turning it. It opens on the east gardens and it goes row to row, and it comes back when it comes back with nothing new in it. We can't make that faster. We've never been able to, and most tides that's been the best thing about us.",
    "The concern is coming up the drop this morning to read something at us. We think they mean to stand on the rows while they do it. They won't fire on a garden \u2014 a garden's worth nothing to them burnt, and we'd rather you heard that from us than worked it out.",
    "A row turns when there's somebody on it and it's quiet enough to hear itself. Juno's brought hulls. We didn't vote on that either. They're loud, so they can't be where the question is \u2014 the question has to be able to hear itself, and a corvette at twenty-eight is two rows of nothing.",
    "There's a bell for all of this. Every row at once. It exists. Nobody has rung it, and I've had thirty years to. We'd rather come home without ringing it. We're saying *rather*.",
  ],
  /**
   * docs/mission-convocation.md §12, "Already seen: a filed plateau" — §1's
   * third concrete case, and the one that shows where the rule stops.
   *
   * The assertion read into the water at 03:30 says *this survey year*, and a
   * filed *Tend* is where that year's figures came from. §13 wanted the
   * assertion itself to change; §1 refuses, and this is the half §1 allows —
   * Marr knows in advance that the numbers will be right and whose rows they
   * were taken off, and says so before the drop rather than after. The mission
   * is byte-for-byte the definition it was.
   */
  briefingVariants: [
    {
      scene: MARR_PLATEAU_FILED,
      briefing: [
        "We rang it off-tide. You'll have heard. Everyone will have heard — Anholt's people, Teel's, and the lane. That's not a slip. A plateau that convenes says so, out loud, and stops working while it does.",
        "Anholt asks us to turn a second seeding. We're turning it. It opens on the east gardens and it goes row to row, and it comes back when it comes back with nothing new in it. We can't make that faster. We've never been able to, and most tides that's been the best thing about us.",
        "The concern is coming up the drop this morning to read something at us, and we know roughly what. They have had our numbers since the sweep came up the lane and heard the gardens working, so when they say *this survey year* they will mean ours, and the figures will be right. That is the part worth sitting with before they get here. It isn't a claim they are inventing on the way up. We think they mean to stand on the rows while they read it. They won't fire on a garden — a garden's worth nothing to them burnt, and we'd rather you heard that from us than worked it out.",
        "A row turns when there's somebody on it and it's quiet enough to hear itself. Juno's brought hulls. We didn't vote on that either. They're loud, so they can't be where the question is — the question has to be able to hear itself, and a corvette at twenty-eight is two rows of nothing.",
        "There's a bell for all of this. Every row at once. It exists. Nobody has rung it, and I've had thirty years to. We'd rather come home without ringing it. We're saying *rather*.",
      ],
    },
  ],
};

export const SEEDING_DEEP_FURROW_HEADER: MissionHeader = {
  id: 'seeding-deep-furrow',
  campaign: 'seeding',
  ordinal: 4,
  name: 'The Second Seeding — Deep Furrow',
  premise:
    'The bloom that proved the deep can be gardened is ten years old and one furrow wide. Today the plateaus carry the Kell seed down to it and plant the next one.',
  mapId: 'anholt-furrow',
  // The tide turns at 18:00 (docs/mission-deep-furrow.md §9), inside
  // campaign.md §10's 12–25. The first Commune mission played under the
  // layer, and the second to resolve to `anholt-furrow` when mission 5 lands.
  lengthBandS: [1020, 1140],
  /**
   * Spoken by Tidespeaker Ysolde Marr on the lane at the cleft's mouth, at
   * 900 m — docs/mission-deep-furrow.md §12, verbatim. Public for Tend's
   * reason and one of its own: a briefing that orders nobody to do anything
   * has nothing to give away, and this one states the sowing's sixty seconds,
   * the tender's seventy-five points of hull and the thing at the sill in
   * advance because §12's whole argument is that the arithmetic should be
   * agreed in daylight rather than done on the rock.
   */
  briefing: [
    "We're not going to tell you what to do down there. We couldn't if we wanted to, and past the layer we won't be able to hear whether you did.",
    "The furrow's ten years old and one row wide. Sefa's people have tended it since the proof, whatever the plateaus were turning at the time, and it holds. We're saying *holds* the way we'd say it of a row: a hull of ours that isn't rated for that water sits on that ground and pays nothing for it, and the water over it takes sound the way the rows at home take it. Everything else at that depth is bare rock and carries like a trench. That's the whole of what a garden is, down there. It's the only kind of ground the plateaus have ever made.",
    "The second furrow wants sowing, and the seed is Kell seed, and it's aboard. Sixty seconds on the rock at the working figure, bow on, and not quiet — a sowing needs a hull that isn't still. Bare rock at that depth takes four points of hull a second off a tender, and a tender has seventy-five of them. We're saying both numbers here, in daylight, so nobody has to do the sum on the rock. Sixty and seventy-five. A hold that breaks starts again at nothing, and the hull doesn't.",
    "The cleft's the only way down and the walls have a schedule. Nothing on them moves for a quiet hull. They move for a loud one, and there's no quiet way down — a dive is the loudest thing we own short of the button. We'd rather the diving happened at the mouth, where there's room, and the rest was done slowly, down the middle. We're saying rather.",
    "There's something at the sill. It's been there since the letter, and we've never heard it, because from here nobody can. You will. It will have heard you first, and it won't do anything about it, and we'd like you to notice that it doesn't have to.",
    "The button's on the panel. We've never asked the deep anything. It's on the panel anyway.",
    "That's the last of what we can say from here. Past the layer the plateau can't hear the furrow and the furrow can't hear us, and that's the first time that has been true of anywhere we've sent people.",
  ],
};

// Append to packages/shared/src/missions.ts, after SEEDING_CONVOCATION_HEADER,
// and add SEEDING_IN_WRITING_HEADER to MISSION_HEADERS in the same order.
// (The Second Seeding 4, `seeding-deep-furrow`, sits ahead of it in the
// campaign and owns the map literal; this header is ordinal 5.)

export const SEEDING_IN_WRITING_HEADER: MissionHeader = {
  id: 'seeding-in-writing',
  campaign: 'seeding',
  ordinal: 5,
  name: 'The Second Seeding — In Writing',
  premise:
    'Three beds grown over the households, a dome that hears the whole garden, and a doorway held at the layer.',
  mapId: 'anholt-furrow',
  // The tide turns at 16:00 (docs/mission-in-writing.md §9), inside §10's
  // 12–25. The second mission to resolve to `anholt-furrow`, after
  // docs/mission-deep-furrow.md — §11's reuse, region for region.
  lengthBandS: [900, 1020],
  /**
   * Spoken by Tidespeaker Ysolde Marr on the lane at the cleft's mouth, at
   * 900 m, to the watch going down to carry it — docs/mission-in-writing.md
   * §12, verbatim. Public for Tend's and Convocation's reason: a briefing that
   * orders nobody to do anything has nothing to give away, and this one names
   * the dome, the beds, the schedule they will go on and the number the
   * plateau agreed, because §12's whole argument is that the player should
   * meet none of them for the first time under a cohort.
   *
   * The one Commune briefing that quotes another register inside itself and
   * declines to answer it in kind: the Undermarshalcy's sentence of 205 is
   * carried here in the Undermarshalcy's own words, italics and all, and Marr
   * hands it back without conceding its frame — *it's theirs*.
   */
  briefing: [
    "We're not going to tell you what to do down there. We couldn't be heard if we tried, and we'd rather that stayed the arrangement even now.",
    "Nine years ago the Undermarshalcy wrote to us. We've had it read out once, so everyone's heard it, and we'll say it again here the way they said it, because it's theirs. *\"What was proved at twenty-two hundred metres in the year 204 has been heard, and it is entered. A second seeding of the band will be attended as what it is, and answered as what it is. This is stated in writing because the plateaus keep none, so that it is kept somewhere.\"* It's in Sefa's seed-store, on the dry shelf, next to the seed. That's the only answer we ever gave it, and we're not giving another today.",
    "There's a dome in the garden. The watch heard it built. It listens at the furrow the way the galleries listen at the Mouth, and the furrow is us. Three beds are grown over the households, and under a bed nobody hears anything and nobody is heard — theirs or ours, it's the same cloud. The beds won't last. We'd guess they'll go from the west, one at a time, on somebody's clock and not ours, and what's under a bed that's gone is at its own figure again.",
    "The cleft's the only road and the doorway's held. There's a stretch in the tide when it isn't. We'd like sixteen over the layer, and we're saying sixteen here, at the top, so that nobody at the bottom has to be the one who says a smaller number first.",
    "Juno went down with the families when the dome was heard. She brought three guns and they're struck, and that's hers, not a vote. Nothing is struck under a bed. We'd like that heard once, down there, so it's been said.",
  ],
};

// Append to packages/shared/src/missions.ts, beside the other Second Seeding
// headers, and add SEEDING_RADICALS_HEADER to MISSION_HEADERS in campaign order.

export const SEEDING_RADICALS_HEADER: MissionHeader = {
  id: 'seeding-radicals',
  campaign: 'seeding',
  ordinal: 6,
  name: 'The Second Seeding — Radicals',
  premise:
    "The plateaus turned a second seeding. Nobody turned the rim, and nobody turned this week. Anholt's people are going anyway, through the drowned city, and Marr Plateau's guns are asked to go with them.",
  mapId: 'sorrowgate',
  // The count is read at 15:00 (docs/mission-radicals.md §9), inside §10's
  // 12-25 — and the band is the document's own 840-960 s.
  lengthBandS: [840, 960],
  /**
   * Spoken by Tidespeaker Ysolde Marr from home, on the plateau channel, to the
   * escort at the Upper Concourse — docs/mission-radicals.md §12, verbatim.
   *
   * Public for Tend's and Convocation's reason, and one of its own: this is the
   * only Commune briefing that names the thing it is not doing, and §4's whole
   * system — the column ordered by somebody else, countermandable for half a
   * minute at a time — is stated here in advance rather than met under
   * pressure. It withholds nothing the mission holds: the pack, the doorway,
   * the basin and the ping's three seconds are all in it.
   */
  briefing: [
    "We're not going to tell you what to do down there. We've said that at the top of every water we've sent people into, and this is the first time it's the reason you're going.",
    "Here's what the plateaus turned, so it's been said once by somebody who counted. A second seeding. Sefa's plateau turned it, and the terraces past hers turned it, and this one walked it and came back still turning, and the count's the plateaus' and not ours. Nobody turned the rim. Nobody turned this week.",
    "Sefa's people are going to the rim this week, through the drowned city and out over the basin, with the barge and the three tenders and thirty-three of ours aboard by household, and we're not stopping it. We'd like that heard the way it's meant: we're not saying we can't. We're saying we're not, and that's the thing we're not doing.",
    "The column will be told where to go by Sefa, on her clock, a leg a minute and again at the half, and it'll dive wherever the ground drops. You can tell it otherwise. It'll listen to you for half a minute and then it'll listen to her. That's not a fault in the arrangement. That's the arrangement, from the other side, and we thought you should hear it from us before you hear it from the barge.",
    "The city's as the spring left it — the arch is down, the lock's the way in, and the basin's awake. There's a pack off the Descent, there's something on either side of the door, and there's the one that answered in the spring, lying beside the water Sefa's drawn her lane through. The lane's drawn so the column at its own figures is under all of them, by a little. Everything Juno's brought is over them. That's what it's for.",
    "Juno's three are yours to spend, and so, this time, is the noise. The button's on the panel. It's three seconds, and three isn't four, and we'd like you to know that before the basin teaches it. We'd like four in the far water. We agreed four, and we agreed two, at the Concourse, in daylight, so that nobody has to be the person who says a smaller number in the basin.",
  ],
};

export const SEEDING_SECOND_SEEDING_HEADER: MissionHeader = {
  id: 'seeding-second-seeding',
  campaign: 'seeding',
  ordinal: 7,
  name: 'The Second Seeding — The Second Seeding',
  premise:
    "The plateaus were on the rim before anybody, under a bed, with the Kell seed and a garden's whole argument. Today the concern comes down loud to read six faces, and somebody has to plant.",
  mapId: 'mouth-rim',
  // The tide turns at 23:00 (docs/mission-second-seeding.md §9) — Prospect's
  // day plus one hour of the tide — and the band is the document's own
  // 1,320-1,440 s, inside §10's 12-25. The second mission to resolve to
  // `mouth-rim`, and the second of four once the rim week is built
  // (campaign.md §8).
  lengthBandS: [1320, 1440],
  /**
   * Spoken by Bloomwright Sefa Anholt, aboard the barge, under the bed on the
   * western lip at 3,000 m — docs/mission-second-seeding.md §12, verbatim. The
   * first Commune briefing not spoken by Marr, because Marr cannot order
   * anyone and cannot be heard from eighty kilometres north and a layer up.
   *
   * Public for Tend's and Radicals' reason, and one of its own: it withholds
   * nothing the mission holds. The schedule the ears keep, the bed's
   * arithmetic, the ping's availability and the count of three are all stated
   * before the first order is given — and none of them is an instruction,
   * because the register cannot give one. *We're saying they walk*, and
   * *we're saying said*.
   */
  briefing: [
    "We're not going to tell you what to do down here. Ysolde would say that, and she can't be heard from where she is, so we're saying it for her, and we mean it a little less than she does.",
    "We were here first. Two of ours have been on the terraces since before the concern had ears on this water, and the rest of us have been under a bed on the western lip since the tide before last, with the Kell seed aboard, and we told nobody. Today everybody hears us. That was always going to be the day, and it isn't ours. It's the concern's: they come down loud this morning to read six faces on the terraces, the watch walks the lip while they do it, and the Order measures its crystal from wherever the Order stands. Tomorrow is somebody else's, and the day after that. We're planting on this one.",
    "The lip wants sowing. Sixty seconds, bow on, at the working figure, under the bed — and there are three navies on this rim with ears, and we're not going to tell you when. We're saying they walk. The watch comes west along the lip in the morning and goes home in the afternoon; the readers come to the western faces and go east. A bed takes most of a sound and all of a hearing, ours and theirs the same, and a sowing under it is eighteen on the loudest water in the Rift, which is a whisper from here and a name from a kilometre and a half.",
    "Nobody's hull pays for this water. The four of us are rated for it and so are the two on the terraces, and there has never been a seventh. Juno's people aren't: they're at the staging with their guns struck, and the staging is as deep as a gun of ours goes. Once the lip is a furrow it will hold a hull the deep never rated — that's the whole of what a garden is — and then it will hold them. They're not coming until the basin's awake, and it wakes when the concern leaves.",
    "The button's on the panel. The rim answers a ping before it should, the Directorate has never asked it anything, and neither have we. It's on the panel.",
    "Three of ours in the furrow when the tide turns is a garden. Fewer is a claim, and we said we'd never make one. We're saying *said*.",
  ],
};

export const ATTENDING_ATTENDANCE_HEADER: MissionHeader = {
  id: 'attending-attendance',
  campaign: 'attending',
  ordinal: 1,
  name: 'The Attending — Attendance',
  premise: 'A shift spent listening down the Ninth. Nothing arrives that can be fought.',
  mapId: 'attending-galleries',
  // The watch ends at 18:00 (docs/mission-attendance.md §9), inside §10's 12-25.
  lengthBandS: [1020, 1140],
  /**
   * Undermarshal Korrin's assignment, after the First Cantor's formula —
   * docs/mission-attendance.md §12, verbatim. Public: it names the count, the
   * notice and the penalty for a sentence, and withholds the only thing the
   * Directorate withholds, which is what the return is.
   */
  briefing: [
    'The stalls are open. The cohorts are seated. Nothing is expected of the watch but sufficiency, and sufficiency is not a small thing to be expected of.',
    'The third watch of the cycle is assigned. It will be attended from the galleries, as it has been attended since 88 PC, and the record will receive it as one document with the two watches before it.',
    'Four hulls are given to the watch. They are seated, and they are not required to do anything. That is not a courtesy. The stalls are where the cohorts dream, and a hull under way in this water is a hull standing in front of somebody who is listening.',
    'The return will come up the Ninth nine times. Where it will be is not known before it is heard. It is heard sixty seconds before it arrives, which is the whole of the notice anyone has ever had. What is heard is entered. What is not heard is not entered, and the gap is entered too.',
    'It may be described. It may be measured. What the cohorts dream of it will be recorded as dreamt. It will not be said what it is. A log that says what it is, is amended, and the cohort that filed it is re-shifted.',
    'Five of nine is sufficiency. The Undermarshalcy does not round up.',
  ],
};

// Append to packages/shared/src/missions.ts, after ATTENDING_INTAKE_HEADER,
// and add ATTENDING_THE_DOME_HEADER to MISSION_HEADERS in the same order.
// (The Attending 3, `attending-the-dome`, on the `fourth-foot` map — the map
// literal is built and registered already.)

export const ATTENDING_THE_DOME_HEADER: MissionHeader = {
  id: 'attending-the-dome',
  campaign: 'attending',
  ordinal: 3,
  name: 'The Attending — The Dome',
  premise:
    "The Fourth is closed while the inquiry runs, and what enters it is counted. At the trench's foot the stalls put a sound into the water instead of taking one out.",
  mapId: 'fourth-foot',
  // The whistle at 20:00 (docs/mission-the-dome.md §9), inside campaign.md
  // §10's 12–25 — and Baffle's twenty minutes to the second, because it is the
  // same tide from the counting side.
  lengthBandS: [1140, 1260],
  /**
   * Two voices at the opening, in the order the rite fixes — the First
   * Cantor's formula, then the Undermarshal's assignment
   * (docs/mission-the-dome.md §12, verbatim). Public for Attendance's and
   * Intake's reason: it names the count, the law, the lent array and the
   * button, and withholds the only thing the Directorate withholds, which is
   * what the water will do about any of them.
   *
   * The one Directorate briefing that hands a button over rather than sealing
   * one: §3's active sonar is aboard and live for the first time in the
   * campaign, and paragraph five says so in the register that may not
   * recommend.
   */
  briefing: [
    'The dome is open. The trench is attended. Nothing is expected of the picket but sufficiency, and sufficiency is not a small thing to be expected of.',
    'The Fourth is closed while the exchange inquiry is open, and has been closed for three tides. A relief convoy is at the north staging under a writ that has not been filed. It will enter the trench. What enters the trench is counted.',
    'Four hulls stand the two watches. They are seated where the watches have always been seated, and they are not required to move. A watch that is stood into may engage. A watch that yields the water and counts has also attended, and the record does not grade the two.',
    'Six of the cohort are at the foot, under the dome, and are not the picket. The array is lent — the Cantorate lends its ears, and its ears are worth more to a cohort hull than to the hulls the Undermarshalcy has paid most for — and it is withdrawn while the picket is loud. That is written down. It has always been written down.',
    'The survey array is aboard and it is live. It is not sealed and it is not recommended. A transmission at the foot is a question put to water that has not been asked one, and what is in that water is not the Undermarshalcy’s to describe.',
    'What is heard is entered. What is not heard is not entered, and the gap is entered too.',
    'Three of four attend. The Undermarshalcy does not round up.',
  ],
};

export const ATTENDING_INTAKE_HEADER: MissionHeader = {
  id: 'attending-intake',
  campaign: 'attending',
  ordinal: 2,
  name: 'The Attending \u2014 Intake',
  premise:
    'The banding ground above Sufficiency, twelve hulls of one year, and a living that will not come to them.',
  mapId: 'banding-ground',
  // The shift ends at 20:00 (docs/mission-intake.md \u00a79), inside \u00a710's 12\u201325.
  lengthBandS: [1140, 1260],
  /**
   * Undermarshal Korrin, assigning the band at the muster \u2014
   * docs/mission-intake.md \u00a712, verbatim. Public for Attendance's reason: it
   * names the band, the muster and the finding, and withholds the only thing
   * the Directorate withholds, which is what the ground will see.
   */
  briefing: [
    'Intake 11 is mustered. The year is at the top of the water it was made for, which is the customary place to find out whether that is true.',
    'Twelve hulls are given to the ground. The band is two hundred and forty-five, and it is rendered from what lives on the walls. What lives on the walls is quieter than the year is and hears better than the year does, and it will not come to you. The Directorate is not brought its living. The Directorate goes and gets it.',
    'Nine of twelve is a muster. The Undermarshalcy does not round up.',
    'At the close the ground files what it saw. It is not asked for a number. It is asked what it saw.',
  ],
};

// Append to packages/shared/src/missions.ts, after ATTENDING_THE_DOME_HEADER,
// and add ATTENDING_SHALLOW_HEADER to MISSION_HEADERS in the same order.
// (The Attending 4, `attending-shallow`, on the `kell-shoulder` map — reused
// unchanged from `seeding-thin-water`, and built and registered already.)

export const ATTENDING_SHALLOW_HEADER: MissionHeader = {
  id: 'attending-shallow',
  campaign: 'attending',
  ordinal: 4,
  name: 'The Attending — Shallow',
  premise:
    'Marr has rung. The plateaus are turning a second seeding, garden by garden, and a cohort is on the Kell shoulder at three hundred and forty metres to hear which of them rings next.',
  mapId: 'kell-shoulder',
  // The tide turns at 19:00 (docs/mission-shallow.md §9), inside campaign.md
  // §10's 12–25 — and the band is the document's own 1,080–1,200 s.
  // Convocation's nineteen minutes, one tide earlier, chosen against the walk:
  // the strip is 2,302 m from the seat and the Holdfast's window is three
  // minutes in the middle of it.
  lengthBandS: [1080, 1200],
  /**
   * Undermarshal Setha Korrin, assigning from Sufficiency to a column she
   * cannot join — docs/mission-shallow.md §12, verbatim. There is no formula
   * at the opening for the second time in the campaign: the Cantorate does not
   * attend a shoulder.
   *
   * Public for Attendance's, Intake's and The Dome's reason, and one of its
   * own: this is the briefing that states the *penalty* rather than the
   * asset. Both halves of the shallow-water arithmetic — the fifth off the
   * way a hull moves and the fifteen in a hundred off what it is made of —
   * are read out before the first order is given, "so that nobody performs
   * the arithmetic for the first time while being asked for an asset number".
   * It withholds the only thing the Directorate withholds, which is what a
   * garden has decided.
   */
  briefing: [
    "A cohort of the Fourth is on the Kell shoulder at three hundred and forty metres. It went up the slope in the tide's dark and it is lying quiet, and it is above the line, and it has been above the line since before this was said.",
    'The shallows take a fifth of the way a hull moves and fifteen in a hundred of what it is made of. The fifteen is taken once, it is taken in twenty seconds, and it is not given back when the hull comes down. That is written where it has always been written and it is stated here so that nobody performs the arithmetic for the first time while being asked for an asset number.',
    'Marr rang off-tide. The plateaus are turning a second seeding, garden by garden, and what a garden decides about the deep is not sent to those below and never has been. It is heard, or it is not heard. It is at twelve, it is in kelp, and it is north of a corridor that is closed to everyone including the people who posted it.',
    "The Undermarshalcy is not present. It cannot be. What is entered will be entered by the stalls and read at the turn, and the reading will not be improved by anybody's having been there. Five of ten is sufficiency. The Undermarshalcy does not round up.",
    "The column is asked to be under the line at the tide's turn. It is not asked to be anywhere else.",
  ],
};

// Append to packages/shared/src/missions.ts, after ATTENDING_SHALLOW_HEADER,
// and add ATTENDING_TRENCH_AWAKENING_HEADER to MISSION_HEADERS in the same
// order. (The Attending 5, `attending-trench-awakening`, on the `shallow-band`
// map — the map literal is built and registered already.)

export const ATTENDING_TRENCH_AWAKENING_HEADER: MissionHeader = {
  id: 'attending-trench-awakening',
  campaign: 'attending',
  ordinal: 5,
  name: 'The Attending — Trench Awakening',
  premise:
    "The shallow band renders what the trench brings. This tide the trench is sounded, and what answers is the Drift's to decide.",
  mapId: 'shallow-band',
  // The close at 20:00 (docs/mission-trench-awakening.md §9), inside
  // campaign.md §10's 12–25, and the document's own advertised 1,140–1,260 s.
  // Not a conclusion: the tide does not end here (§8).
  lengthBandS: [1140, 1260],
  /**
   * Undermarshal Setha Korrin, assigning the band at the band —
   * docs/mission-trench-awakening.md §12, verbatim. There is no Cantorate
   * formula for the third time in the campaign: the Cantorate does not attend a
   * rendering row, and First Cantor Ossary is absent and unmentioned.
   *
   * Public for Attendance's, Intake's, The Dome's and Shallow's reason: it
   * names the band, the muster and the arithmetic that makes the band
   * unanswerable from the walls alone — two hundred and sixty against two
   * hundred and ten — and withholds the only thing the Directorate withholds,
   * which is what the trench will answer with. It is the first briefing in the
   * campaign that hands the player a yard, and it does not say what a yard is
   * for either.
   */
  briefing: [
    'The shallow band is at work. The First is sounded on this tide, and what the trench brings is rendered here, as it is rendered here on every tide, by the people who are posted here.',
    'Eight hulls are given to the row, and a plant, and a dome, and a grower. The band is two hundred and sixty. It is not rendered from the walls alone; the walls are two hundred and ten and the Undermarshalcy can add. What is short of it is what the trench answers with.',
    'Six of eight muster. The Undermarshalcy does not round up.',
    'What answers a sounding is not chosen. It is entered as what came.',
  ],
};

// Append to packages/shared/src/missions.ts, after ATTENDING_SHALLOW_HEADER,
// and add ATTENDING_CONCLAVE_HEADER to MISSION_HEADERS in the same order.
// (The Attending 6, `attending-conclave`, on the `upper-terraces` map — the map
// literal is built and registered already.)

export const ATTENDING_CONCLAVE_HEADER: MissionHeader = {
  id: 'attending-conclave',
  campaign: 'attending',
  ordinal: 6,
  name: 'The Attending — Conclave',
  premise:
    'A calling is put at the head of the Ninth, and it is answered by who crosses the water between the terraces. The Cantorate does not cross.',
  mapId: 'upper-terraces',
  // The cycle closes at 20:00 (docs/mission-conclave-attending.md §9), inside
  // campaign.md §10's 12–25 — and the band is the document's own 19:00–21:00.
  lengthBandS: [1140, 1260],
  /**
   * Two voices at the opening, in the order the rite fixes — the First
   * Cantor's formula, then the Undermarshal's calling
   * (docs/mission-conclave-attending.md §12, verbatim). The Dome's
   * arrangement, one city higher: the formula is unchanged and unabridged
   * because there is no version of it for a conclave and Ossary does not make
   * one.
   *
   * Public for Attendance's, Intake's and The Dome's reason: it names the
   * roster, the order the galleries keep, the lent dome and the count, and
   * withholds the only thing the Directorate withholds — which here is what
   * the Cantorate will do, and nobody in the water is told that either. It is
   * also the one briefing in the campaign that states an obligation and then
   * refuses to give a reason for it, in as many words, which no other
   * register would think worth writing down.
   */
  briefing: [
    'The stalls are open. The cohorts are seated. Nothing is expected of the watch but sufficiency, and sufficiency is not a small thing to be expected of.',
    'A calling is put at the head of the Ninth. It is put because something is happening to the thing the cohorts attend, and the account is the watch’s own: a descent at seventy-two for three minutes, and transmissions at eighty against six charted faces, on the rim, entered by people who were there.',
    'Sixteen hulls are given to the calling. The order the galleries keep reaches this water, and it is twenty-five: a hull that listens is compliant and a hull under way is heard, and what is heard is entered. The dome is lent down for the length of the calling and stands where the galleries stand.',
    'A calling is answered by who crosses. The Cantorate is asked whether it will attend the calling of the assignment. It is not asked for a reason and it will not be given one.',
    'What is assigned descends when the cycle closes. Eight of sixteen is a column. The Undermarshalcy does not round up.',
  ],
};

export const CHORD_APTITUDE_HEADER: MissionHeader = {
  id: 'chord-aptitude',
  campaign: 'chord',
  ordinal: 1,
  name: 'The Second Chord \u2014 Aptitude',
  premise:
    "The Third's annual tuning. Six voices stand off the house, and a concern is coring in the middle of them.",
  mapId: 'outer-formations',
  // The tuning closes at 16:00 (docs/mission-aptitude.md \u00a79), inside \u00a710's 12-25.
  lengthBandS: [900, 1020],
  /**
   * Chapter-Master Vrey, setting the exercise \u2014 docs/mission-aptitude.md
   * \u00a712, verbatim. Public for Sorrowgate's reason: it names no hidden fact.
   * It states the survey, the two numbers the whole mission is played on, and
   * the manoeuvre they imply, because a Knight briefing that withheld the
   * arithmetic would be teaching by ambush, and this faction examines.
   */
  briefing: [
    'Good. You have all done this before, at nine, with your ears, and the only thing that has changed is the size of the instrument.',
    'Six voices stand off the house. You will put a tone into each and read what comes back. Twenty seconds, bow to the formation, and hold it \u2014 a tone you interrupt is a tone you have not played. The chapter has one measurement a year and this is the year.',
    'A concern is coring in the middle of it. They are within their own procedure and I will not be asking them to leave, because we have never written down that this water is ours and they have written down that it is not. You will therefore be courteous, which today means unheard.',
    'You are loud in front. You are not loud on the beam and you are very nearly nothing behind. Two numbers: fourteen hundred metres on the bow, seven-fifty on the beam. You may go west. You may not point west \u2014 go in a cadence, one bearing and then the other, and let them have your flank both times.',
    'Six of you. Six voices. I would like both of those numbers to be the same at the end as they are now, and if I have to choose between them, I have chosen.',
  ],
};

export const MISSION_HEADERS: readonly MissionHeader[] = [
  PROLOGUE_SORROWGATE_HEADER,
  LEDGER_ASSET_RECOVERY_HEADER,
  LEDGER_SHIFT_CHANGE_HEADER,
  LEDGER_BAFFLE_HEADER,
  LEDGER_EXPOSURE_HEADER,
  LEDGER_TOLERANCE_HEADER,
  LEDGER_PROSPECT_HEADER,
  LEDGER_ITEM_NINE_HEADER,
  SEEDING_TEND_HEADER,
  SEEDING_THIN_WATER_HEADER,
  SEEDING_CONVOCATION_HEADER,
  SEEDING_DEEP_FURROW_HEADER,
  SEEDING_IN_WRITING_HEADER,
  SEEDING_RADICALS_HEADER,
  SEEDING_SECOND_SEEDING_HEADER,
  ATTENDING_ATTENDANCE_HEADER,
  ATTENDING_INTAKE_HEADER,
  ATTENDING_THE_DOME_HEADER,
  ATTENDING_SHALLOW_HEADER,
  ATTENDING_CONCLAVE_HEADER,
  ATTENDING_TRENCH_AWAKENING_HEADER,
  CHORD_APTITUDE_HEADER,
];

export function missionHeaderById(id: string): MissionHeader | undefined {
  return MISSION_HEADERS.find((header) => header.id === id);
}

/**
 * The briefing this player should read — docs/campaign.md §1.
 *
 * Pure, and deliberately not a method on anything: the header is compiled-in
 * data and the scene set is the client's own memory, so the choice is a fact
 * about those two arguments and nothing else. Nothing about the room, the
 * match or the player's slot reaches it, which is what makes "the mission does
 * not know which one was shown" true rather than merely intended.
 *
 * `null` — a briefing withheld until arrival — stays `null`. A withheld
 * briefing has no default to vary from, and a variant that appeared where the
 * default was suppressed would leak exactly the mission the suppression was
 * protecting.
 */
export function missionBriefing(
  header: MissionHeader,
  seenScenes: ReadonlySet<string>
): readonly string[] | null {
  if (header.briefing === null) return null;
  // First match wins, in the authored order — see `MissionBriefingVariant`.
  const variant = header.briefingVariants?.find((v) => seenScenes.has(v.scene));
  return variant?.briefing ?? header.briefing;
}

// --- Wire types -------------------------------------------------------------

export enum ObjectiveStatus {
  Pending = 0,
  Met = 1,
  Failed = 2,
}

export enum MissionOutcome {
  /** Everything the mission called terminal was met. */
  Complete = 0,
  /** Some of it. Not a failure — a result, and the mission says so out loud. */
  Partial = 1,
  /** None of it. */
  Lost = 2,
}

export type MissionAbility =
  | 'weapons'
  | 'torpedoes'
  | 'mines'
  | 'depthCharges'
  | 'noisemakers'
  | 'activeSonar'
  /**
   * Building and producing, which most missions have no economy for. Not a
   * weapon, and here for the same reason the six above are: an affordance that
   * cannot work has to say so. Without it the build keys still arm a placement
   * ghost that follows the cursor to a click the server drops on cost — a
   * silent refusal, which docs/ui-ux.md §7 forbids by name.
   */
  | 'construction';

/**
 * docs/ui-ux.md — a disabled action greys out *with a reason attached*, never
 * silently. The lock is continuous state rather than a response to a refused
 * order, so the affordance is dead before the player reaches for it.
 */
export interface AbilityLock {
  ability: MissionAbility;
  /** Shown verbatim, in register: `disabled — silence order`. */
  reason: string;
}

/** Where the player is being sent. Authored and public; never an entity. */
export interface MissionMarker {
  id: string;
  label: string;
  x: number;
  y: number;
  radiusM: number;
}

export interface ObjectiveView {
  id: string;
  /** Authored, in-register, shown verbatim. Never templated (docs/campaign.md §10). */
  text: string;
  status: ObjectiveStatus;
  /**
   * INVARIANT: `done` and `of` are computed exclusively from the observer's own
   * resolved snapshot. A counter over anything else is a maphack in a numeral —
   * "three of five hostiles remaining" is enemy state written as arithmetic —
   * and no mission predicate can address an entity the player does not own.
   */
  progress?: { done: number; of: number };
  /** The marker this objective sends you to, if any. */
  markerId?: string;
}

/**
 * The one act a commander is authored to take — docs/characters.md's
 * *Commander ability* entries, on the wire.
 *
 * Not a `MissionAbility`. That union is a **lock list**: the affordances a
 * mission withholds from a player who would otherwise have them, which is why
 * `AbilityLock` carries a reason and nothing else. This is the opposite
 * arrangement — something a mission *grants*, that no other match has — so it
 * is a second type rather than an eighth member of the first. Conflating them
 * would have `locks` mean "off" for seven entries and "on" for one.
 *
 * Everything here is the player's own state: whether their own commander has
 * spent their own once-per-match act, and how long their own hulls are still
 * carrying it. Nothing in this payload is a fact about anybody else, which is
 * why it can be sent at all.
 */
export interface CommanderAbilityView {
  id: string;
  /** The button's name, in register, shown verbatim. Never templated. */
  label: string;
  /** One authored line under it — what ringing it does, and what it costs. */
  description: string;
  /** False once it has been spent, or before the mission hands it over. */
  available: boolean;
  /** True from the tick it is rung. Once per match; there is no second. */
  spent: boolean;
  /** Seconds still running, 0 when it is not. Whole seconds, as the panel reads it. */
  remainingS: number;
  /**
   * Why the button is dead right now, or absent when it is live — `AbilityLock`'s
   * arrangement, for docs/ui-ux.md §7's rule: a disabled action greys out *with
   * a reason attached*, never silently.
   */
  reason?: string;
}

export interface MissionView {
  missionId: string;
  /** The simulation tick this view was resolved beside. No wall-clock anywhere. */
  tick: number;
  objectives: ObjectiveView[];
  markers: MissionMarker[];
  locks: AbilityLock[];
  /** docs/campaign.md §10 metadata, shown as a ceiling. Never a live threshold. */
  sigBudget: number;
  /** Seconds of silence-debt owed. 0 while compliant (docs/mission-sorrowgate.md §4). */
  debtS: number;
  /**
   * The commander's one act, when the mission authors one. Absent is the
   * twelve missions written before docs/mission-convocation.md asked for one.
   */
  ability?: CommanderAbilityView;
}

export interface MissionResultPayload {
  missionId: string;
  outcome: MissionOutcome;
  /** The court's reading. Authored, in-register. Not a score and not a rank. */
  epilogue: string;
  /** The objectives as the player was told them, frozen at the close. */
  objectives: ObjectiveView[];
  /**
   * The scenes this run witnessed, for the progression record to remember —
   * docs/campaign.md §1. Omitted is none, which is every mission that authors
   * no scene.
   *
   * **This adds no information to the wire, and that is the test it had to
   * pass.** A scene is latched from something the epilogue already states in
   * words: `marr-plateau-filed` is emitted exactly when the sweep's *filed*
   * reading is appended to the count, so the player has read the fact on the
   * result screen before the client stores its id. What crosses here is a
   * machine-readable spelling of a sentence that was already shown, never a
   * fact the mission withheld — the same standard the progression record holds
   * itself to (`progression/store.ts`).
   *
   * Ids and not prose, because the client selects on them and a briefing that
   * varied on a substring of an epilogue would break the first time an author
   * fixed a comma.
   */
  scenes?: readonly string[];
  /**
   * The ground as this mission left it, for the record to carry forward —
   * docs/campaign.md §2 rule 5. Omitted is a skirmish, which carries nothing.
   */
  driftCarry?: DriftCarry;
}

/**
 * One map's Drift Health, leaving a match or presented to the next one —
 * docs/campaign.md §2 rule 5, docs/bestiary.md §6.
 *
 * **Public, and the first per-map state to leave a match.** That needs saying
 * out loud, because CLAUDE.md's rule is that nothing crosses the wire the
 * observer has not resolved. This clears it twice over: docs/bestiary.md §5
 * makes the Drift's tell *light, not sound* — every commander sees a region's
 * state and always could — and the grid is already in every resolved snapshot
 * (`Match.snapshots`, `driftHealth`). Nothing new is disclosed here; what is
 * new is that a grid the player has been watching all match is now written
 * down.
 *
 * Keyed by map and not by mission because §2 rule 5 is a rule about *ground*:
 * `mission-convocation.md` reuses `seeding-tend`'s `marr-plateau` unchanged so
 * that the same water can be returned to, and a mission-keyed carry would miss
 * exactly the case the rule was written for.
 */
export interface DriftCarry {
  /** The water this grid belongs to — `MapDefinition.id`, already public. */
  mapId: string;
  /** Row-major, `DRIFT.HEALTH_REGIONS` squared. 0-100, one per region. */
  health: readonly number[];
}

/** How many regions a Drift grid has — `DriftHealth`'s square grid, flattened. */
export const DRIFT_REGION_COUNT = DRIFT.HEALTH_REGIONS * DRIFT.HEALTH_REGIONS;

/**
 * A live Drift grid as a *carry* — docs/campaign.md §2 rule 5.
 *
 * The two are not the same array, and the difference is one line: inside a
 * match a quiet region recovers toward 100, and a carry is capped at what the
 * ground opens at. Without this the common case would be the broken one — a
 * mission played quietly ends with regions above `DRIFT.HEALTH_START`, and a
 * grid holding one of those is refused by `validDriftCarry`, so the carry that
 * survives a *loud* match would be dropped after a careful one.
 *
 * Applied where the grid leaves the match, so what the record holds is already
 * a legal carry and the validator on the way back in is a check rather than a
 * transformation.
 */
export function driftCarryFrom(health: readonly number[]): number[] {
  return health.map((value) => Math.min(DRIFT.HEALTH_START, Math.max(0, value)));
}

/**
 * Coerce something a client presented into a grid a match may be seeded from,
 * or `null` if it is not one.
 *
 * **Rejection, not clamping, and whole-grid rather than per-cell.** The record
 * lives in the player's `localStorage`, so what arrives here is a number the
 * client chose; a clamp would let a tampered grid keep whatever part of itself
 * survived the clamp, which prices cheating at "some of it works". Refusing
 * the grid entirely drops the room back to the biome defaults, so tampering
 * buys exactly the mission the player would have got by clearing their
 * browser.
 *
 * The ceiling is `DRIFT.HEALTH_START` — what the map is authored to open at —
 * and not the in-match cap of 100. A quiet match really can heal a region past
 * the opening value, and carrying that forward would make a mission *easier*
 * to arrive at than a first visit: masking intact, spawns full, Biomass
 * uncut. §2 rule 5 carries damage, so the carry may only ever be a debt. Above
 * the ceiling is therefore not a legal reading of a played match, and a grid
 * claiming one is refused rather than trimmed.
 *
 * Shared rather than server-only so the store that writes the record and the
 * room that reads it agree on what a record *is* — but the server runs it
 * again on arrival regardless, because a validation the client performs is not
 * one.
 */
export function validDriftCarry(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length !== DRIFT_REGION_COUNT) return null;
  const out: number[] = [];
  for (const value of raw as unknown[]) {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0 || value > DRIFT.HEALTH_START) return null;
    out.push(value);
  }
  return out;
}
