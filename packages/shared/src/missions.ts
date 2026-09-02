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
  ATTENDING_ATTENDANCE_HEADER,
  ATTENDING_INTAKE_HEADER,
  CHORD_APTITUDE_HEADER,
];

export function missionHeaderById(id: string): MissionHeader | undefined {
  return MISSION_HEADERS.find((header) => header.id === id);
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
}

export interface MissionResultPayload {
  missionId: string;
  outcome: MissionOutcome;
  /** The court's reading. Authored, in-register. Not a score and not a rank. */
  epilogue: string;
  /** The objectives as the player was told them, frozen at the close. */
  objectives: ObjectiveView[];
}
