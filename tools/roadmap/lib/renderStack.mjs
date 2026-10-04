/**
 * The Abyss Render Stack: #974's graphics audit, published beside the roadmap
 * as the second page of the site.
 *
 * The audit is a dated record, so its words and readings stay as the owner
 * wrote them on 27 Sep 2026. Three things are not copied from it:
 *
 * - **The frames.** The audit embedded its three pictures. Each is a crop of a
 *   file the repository already owns (FRAMES), so the build copies those
 *   files instead and the site holds no second copy of anything.
 * - **The state of each upgrade.** Each ranked upgrade names the issue or pull
 *   request that tracks it (UPGRADES), and its tag reads that issue's live
 *   state, the way every row on the roadmap does. A reader can tell what has
 *   landed since the audit without anyone rewriting the audit.
 * - **The fonts.** The audit loaded three faces from Google Fonts. This page
 *   uses the display face the roadmap already self-hosts and system faces for
 *   the rest, so the site still makes no third-party request.
 *
 * What the checkpoint (docs/screenshots/issue-974/README.md) corrected after
 * the audit is said once, near the top, rather than edited into the audit.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { escape } from './render.mjs';
import { pngSize } from './sheet.mjs';

/** Where the page is published, beside the roadmap's index.html. */
export const PAGE = 'render-stack.html';

/**
 * The issue each ranked upgrade is tracked by. Rank 1 was #974's own first
 * increment and has no sub-issue, so it is the pull request that landed it;
 * the issues endpoint answers for a pull request too. #1001–#1007 are the
 * sub-issues #974 filed for the other seven.
 */
export const UPGRADES = [
  { rank: 1, issue: 1008 },
  { rank: 2, issue: 1001 },
  { rank: 3, issue: 1002 },
  { rank: 4, issue: 1003 },
  { rank: 5, issue: 1004 },
  { rank: 6, issue: 1005 },
  { rank: 7, issue: 1006 },
  { rank: 8, issue: 1007 },
];

/**
 * The audit's three frames, each the repository file it was cropped from.
 * The portrait is the one the audit was taken against, the bloom rig's frame
 * of 11 September, kept under issue-974 since #1015 re-rendered the roster
 * through the game's own frame; the roadmap's cards show the current one.
 */
export const FRAMES = [
  {
    key: 'target',
    from: 'docs/concept-art/plate-05-submarine-classes.png',
    href: 'render-stack/plate-05-submarine-classes.png',
  },
  {
    key: 'portrait',
    from: 'docs/screenshots/issue-974/portrait-cruiser-bathyarch.png',
    href: 'render-stack/portrait-cruiser-bathyarch.png',
  },
  {
    key: 'game',
    from: 'docs/screenshots/issue-836/02-pitch-12-focus-736.png',
    href: 'render-stack/ventfront-pitch-12.png',
  },
];

/**
 * Every frame that is in the repository, keyed by `key`, with its size read
 * from the file so the page can reserve the box. A missing one is named and
 * its figure goes without a picture, as a navy card does without a portrait.
 */
export function findFrames(repoRoot) {
  const found = {};
  const missing = [];
  for (const frame of FRAMES) {
    const path = join(repoRoot, ...frame.from.split('/'));
    const size = existsSync(path) ? pngSize(readFileSync(path)) : null;
    if (size === null) missing.push(frame.from);
    else found[frame.key] = { ...frame, path, ...size };
  }
  return { found, missing };
}

const LABEL = { closed: 'Done', open: 'Open', unknown: 'Unknown' };

export function renderStackPage({ states, repo, generatedAt, fontHref, frames = {} }) {
  const haveState = states.size > 0;

  // One tag per upgrade card: the live state of the issue that tracks it.
  const tag = (rank) => {
    const { issue } = UPGRADES.find((u) => u.rank === rank);
    const known = states.get(issue);
    const state = known?.state ?? 'unknown';
    const href = known?.url ?? `https://github.com/${repo}/issues/${issue}`;
    return `<a class="pill state ${state}" href="${escape(href)}">${LABEL[state]} · #${issue}</a>`;
  };

  // The box is held by width and height before the bytes arrive; the crop is
  // the stylesheet's, so the file stays its owner's own.
  const frame = (key, alt) => {
    const f = frames[key];
    if (!f) return '';
    return `<a href="${escape(f.href)}"><img src="${escape(f.href)}" width="${f.width}" height="${f.height}" loading="lazy" decoding="async" alt="${escape(alt)}"></a>`;
  };

  const provenance = haveState
    ? `Each upgrade's tag is read from the issue tracker when the page is built. Last read ${escape(generatedAt)}.`
    : `This copy of the page was built without access to the issue tracker, so every upgrade's tag reads unknown.`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Abyss Render Stack — Echoes of the Abyss</title>
<meta name="description" content="What draws Echoes of the Abyss today, where the frame falls short of the concept art, and the upgrades ranked by how much look they buy for the work.">
<meta name="theme-color" content="#03080e">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
@font-face {
  font-family: 'Big Shoulders Display';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('${fontHref}') format('woff2');
}
/* Single dark look on purpose: the game's own neon-noir tokens
   (docs/style-neon-noir.md), so no light variant. */
:root {
  color-scheme: dark;
  --void: #03080e;
  --panel: #0a1424;
  --glass: #0d1c28;
  --cyan: #35e0ff;
  --magenta: #ff3da6;
  --violet: #8b5cf6;
  --violet-lt: #c9a6ff;
  --amber: #f2b233;
  --red: #ff3b30;
  --teal: #5fd0c0;
  --text: #d6e6f0;
  --dim: #6f8a9c;
  --readout: #a8d0e0;
  --rule: rgba(53, 224, 255, 0.16);
  --bevel: rgba(255, 61, 166, 0.45);
  --display: 'Big Shoulders Display', 'Bahnschrift', 'Arial Narrow', 'Helvetica Neue', Impact, sans-serif;
  /* System faces where the audit loaded Barlow and IBM Plex Mono: the site
     makes no third-party request. The mono stack is the roadmap's own. */
  --body: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  --data: ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
}
* { box-sizing: border-box; }
body {
  background-color: var(--void);
  /* WATER_RAMP, packages/frontend/src/game/water.ts:87 — 0 m to 3,000 m */
  background-image: linear-gradient(180deg, #0c2a34 0%, #0a2430 8%, #071a25 22%, #05121b 42%, #040c13 66%, #03080e 100%);
  color: var(--text);
  font-family: var(--body);
  font-size: 16px;
  line-height: 1.55;
}
.wrap { max-width: 1120px; margin: 0 auto; padding-inline: 20px; padding-block: 44px 72px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 64px; }
a { color: var(--cyan); }
code, .mono { font-family: var(--data); font-size: 0.82em; color: var(--readout); }
h1, h2, h3 { font-family: var(--display); text-transform: uppercase; margin: 0; text-wrap: balance; letter-spacing: 0.01em; }
h1 { font-size: clamp(52px, 9vw, 104px); font-weight: 800; line-height: 0.9; }
h2 { font-size: clamp(30px, 4.4vw, 44px); font-weight: 800; line-height: 1; }
h3 { font-size: 24px; font-weight: 600; line-height: 1.05; }
p { margin: 0; }
.label {
  font-family: var(--data); font-size: 11.5px; text-transform: uppercase;
  letter-spacing: 0.14em; color: var(--dim);
}
.label.cyan { color: var(--cyan); }
.lede { max-width: 64ch; color: var(--text); font-size: 18px; }
.muted { color: var(--dim); }
section { display: grid; grid-template-columns: minmax(0, 1fr); gap: 22px; min-width: 0; }
.sec-head { display: grid; gap: 8px; border-bottom: 1px solid var(--rule); padding-bottom: 14px; }
.sec-head p { max-width: 68ch; color: var(--dim); }

/* Plate VI card: glass fill, 1px magenta bevel, corner registration ticks. */
.plate {
  position: relative; background: rgba(10, 20, 36, 0.86); border: 1px solid var(--bevel);
  border-radius: 2px; padding: 22px;
}
.plate::before, .plate::after {
  content: ''; position: absolute; width: 10px; height: 10px; border-color: var(--cyan); border-style: solid;
}
.plate::before { top: -4px; left: -4px; border-width: 1px 0 0 1px; }
.plate::after { bottom: -4px; right: -4px; border-width: 0 1px 1px 0; }

/* Hero */
.hero { display: grid; gap: 22px; }
.answers { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr)); gap: 16px; }
.answer { display: grid; gap: 8px; align-content: start; }
.answer .q { font-family: var(--data); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--dim); }
.answer .a { font-family: var(--display); font-weight: 800; font-size: 40px; line-height: 1; text-transform: uppercase; }
.answer .a.no { color: var(--red); }
.answer .a.go { color: var(--cyan); }
.answer .a.room { color: var(--teal); }

/* Three frames */
.frames { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 16px; }
figure { margin: 0; display: grid; gap: 10px; align-content: start; }
/* height: auto because the markup carries the file's own width and height to
   hold the box; without it that height beats the aspect ratio. */
figure a { display: block; }
figure img { width: 100%; height: auto; aspect-ratio: 16 / 10; object-fit: cover; display: block; border: 1px solid var(--rule); background: var(--void); }
figcaption { display: grid; gap: 4px; font-size: 14.5px; }
.has { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.pill {
  font-family: var(--data); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 2px 7px; border: 1px solid currentColor; border-radius: 2px; line-height: 1.5; white-space: nowrap;
}
.pill.ok { color: var(--teal); }
.pill.miss { color: var(--red); }
.pill.spec { color: var(--amber); }
.pill.later { color: var(--violet-lt); }
.pill.info { color: var(--readout); }

/* Pipeline lanes */
.lanes { display: grid; gap: 18px; }
.lane-title { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
.lane { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 26px; }
.node {
  position: relative; background: var(--glass); border: 1px solid var(--rule); border-top: 2px solid var(--cyan);
  padding: 12px 12px 14px; display: grid; gap: 6px; align-content: start; min-width: 0;
}
.node.warn { border-top-color: var(--amber); }
.node .kind { font-family: var(--data); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--dim); }
.node .name { font-family: var(--display); font-weight: 600; font-size: 21px; line-height: 1.05; text-transform: uppercase; }
.node .path { font-family: var(--data); font-size: 11px; color: var(--cyan); overflow-wrap: anywhere; }
.node .note { font-size: 13.5px; color: var(--text); line-height: 1.4; }
.lane .node:not(:last-child)::after {
  content: ''; position: absolute; right: -21px; top: 50%; width: 16px; height: 1px; background: var(--magenta);
}
.lane .node:not(:last-child)::before {
  content: ''; position: absolute; right: -22px; top: calc(50% - 4px); border: 4px solid transparent;
  border-left: 6px solid var(--magenta); border-right: 0;
}
.bridge {
  display: flex; gap: 12px; align-items: center; padding: 10px 14px; border: 1px dashed var(--bevel);
  font-size: 14.5px; color: var(--text);
}
.bridge .arrow { font-family: var(--data); color: var(--magenta); font-size: 18px; }

/* The frame, layer by layer */
.layers { display: grid; gap: 8px; }
.layer {
  display: grid; grid-template-columns: 30px minmax(0, 1fr) 150px; gap: 16px; align-items: center;
  padding: 12px 14px; background: rgba(13, 28, 40, 0.72); border: 1px solid var(--rule);
  border-left: 4px solid var(--teal);
}
.layer.missing { border: 1px dashed var(--red); border-left: 4px solid var(--red); background: rgba(255, 59, 48, 0.06); }
.layer .idx { font-family: var(--data); font-size: 12px; color: var(--dim); font-variant-numeric: tabular-nums; }
.layer .what { display: grid; gap: 3px; min-width: 0; }
.layer .what .t { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
.layer .what .t strong { font-family: var(--display); font-weight: 600; font-size: 20px; text-transform: uppercase; }
.layer .what .d { font-size: 14px; color: var(--text); }
.layer .cost { font-family: var(--data); font-size: 12px; color: var(--readout); text-align: right; font-variant-numeric: tabular-nums; }
.layer.missing .cost { color: var(--red); }
.axis-note { display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }

/* Meters */
.meters { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px; }
.meters > .meter { grid-column: span 2; }
.meters > .meter.wide { grid-column: span 3; }
.meter { display: grid; gap: 10px; align-content: start; }
.meter .top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.meter .big { font-family: var(--display); font-weight: 800; font-size: 38px; line-height: 1; font-variant-numeric: tabular-nums; }
.meter .big small { font-size: 18px; color: var(--dim); font-weight: 600; }
.bar { position: relative; height: 12px; background: rgba(111, 138, 156, 0.18); border: 1px solid var(--rule); }
.bar > span { position: absolute; inset: 0 auto 0 0; background: var(--teal); }
.bar.unknown { background: repeating-linear-gradient(135deg, rgba(242, 178, 51, 0.35) 0 6px, transparent 6px 12px); border-color: var(--amber); }
.bar-scale { display: flex; justify-content: space-between; font-family: var(--data); font-size: 10.5px; color: var(--dim); font-variant-numeric: tabular-nums; }
.pair { display: grid; gap: 8px; }
.pair-row { display: grid; grid-template-columns: 92px minmax(0, 1fr) 64px; gap: 10px; align-items: center; font-family: var(--data); font-size: 11.5px; color: var(--dim); text-transform: uppercase; letter-spacing: 0.06em; }
.pair-row .v { color: var(--text); text-align: right; font-variant-numeric: tabular-nums; }

/* Plot */
.plot-wrap { overflow-x: auto; }
.plot-wrap svg { width: 100%; min-width: 560px; height: auto; display: block; }
.plot-grid { stroke: rgba(53, 224, 255, 0.12); stroke-width: 1; }
.plot-axis { stroke: rgba(53, 224, 255, 0.4); stroke-width: 1; }
.plot-tick { fill: #6f8a9c; font-family: var(--data); font-size: 11px; letter-spacing: 0.06em; }
.plot-title { fill: #6f8a9c; font-family: var(--data); font-size: 11px; letter-spacing: 0.14em; }
.plot-zone { fill: rgba(53, 224, 255, 0.06); }
.plot-zone-label { fill: #35e0ff; font-family: var(--data); font-size: 11px; letter-spacing: 0.14em; }
.dot { fill: #35e0ff; }
.dot.later { fill: #c9a6ff; }
.dot-num { fill: #03080e; font-family: var(--data); font-size: 12px; font-weight: 500; }
.dot-label { fill: #d6e6f0; font-family: var(--body); font-size: 13px; }

/* Upgrade cards */
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 16px; }
.card { background: rgba(13, 28, 40, 0.82); border: 1px solid var(--rule); padding: 18px; display: grid; gap: 12px; align-content: start; }
.card.top { border-color: var(--bevel); }
.card-head { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 12px; align-items: start; }
.card-num {
  width: 38px; height: 38px; display: grid; place-items: center; border-radius: 50%;
  background: var(--cyan); color: var(--void); font-family: var(--data); font-weight: 500; font-size: 15px;
}
.card-num.load { background: transparent; color: var(--cyan); border: 1px solid var(--cyan); }
.card-num.later { background: var(--violet-lt); }
.card .tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.card dl { margin: 0; display: grid; gap: 8px; }
.card dt { font-family: var(--data); font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.14em; color: var(--dim); }
.card dd { margin: 0; font-size: 14.5px; line-height: 1.45; }

/* Ruled out */
.ruled { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr)); gap: 12px; }
.ruled > div { border: 1px solid rgba(255, 59, 48, 0.4); padding: 14px 16px; display: grid; gap: 6px; align-content: start; background: rgba(3, 8, 14, 0.5); }
.ruled h3 { font-size: 22px; text-decoration: line-through; text-decoration-color: var(--red); text-decoration-thickness: 2px; }
.ruled p { font-size: 14.5px; color: var(--text); }

footer { border-top: 1px solid var(--rule); padding-top: 18px; display: grid; gap: 8px; font-size: 13.5px; color: var(--dim); }
footer p { max-width: 90ch; }
footer .warn { color: var(--amber); }

/* What the site adds to the audit: the way back, the as-of note, and each
   upgrade's live state in the roadmap's own words (done, open, unknown). */
.back { font-family: var(--data); font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; text-decoration: none; }
.back:hover, .back:focus-visible { text-decoration: underline; }
.since { display: grid; gap: 10px; }
.since ul { margin: 0; padding-left: 1.2em; display: grid; gap: 4px; }
.since li { font-size: 15px; }
a.pill { text-decoration: none; }
.pill.state.closed { color: var(--teal); }
.pill.state.open { color: var(--amber); }
.pill.state.unknown { color: var(--dim); }

@media (max-width: 860px) {
  .meters { grid-template-columns: minmax(0, 1fr); }
  .meters > .meter, .meters > .meter.wide { grid-column: auto; }
  .lane { grid-template-columns: minmax(0, 1fr); gap: 22px; }
  .lane .node:not(:last-child)::after { right: auto; left: 24px; top: auto; bottom: -18px; width: 1px; height: 14px; }
  .lane .node:not(:last-child)::before {
    right: auto; left: 20px; top: auto; bottom: -22px; border: 4px solid transparent;
    border-top: 6px solid var(--magenta); border-bottom: 0;
  }
  .layer { grid-template-columns: 24px minmax(0, 1fr); }
  .layer .cost { grid-column: 2; text-align: left; }
}
@media (max-width: 480px) {
  .wrap { padding-inline: 16px; }
  .card-head { grid-template-columns: 32px minmax(0, 1fr); }
  .card-num { width: 32px; height: 32px; font-size: 13px; }
}
</style>
</head>
<body>
<div class="wrap">

  <header class="hero">
    <a class="back" href="index.html">← Echoes of the Abyss · Roadmap</a>
    <p class="label cyan">Echoes of the Abyss · Graphics audit · 27 Sep 2026</p>
    <h1>Abyss Render Stack</h1>
    <p class="lede">What draws the game today, where the frame falls short of the concept art, and the upgrades ranked by how much look they buy for the work.</p>
    <div class="answers">
      <div class="plate answer">
        <span class="q">Do we need Blender?</span>
        <span class="a no">No</span>
        <p>The hull scripts are the source of truth. Blender's useful jobs (bevels, occlusion, UVs) fit in the script kit.</p>
      </div>
      <div class="plate answer">
        <span class="q">What moves the look?</span>
        <span class="a go">The light</span>
        <p>Tone mapping, reflections and bloom already run in the portrait renderer. The game client uses none of them.</p>
      </div>
      <div class="plate answer">
        <span class="q">Is there room?</span>
        <span class="a room">Yes, on desktop</span>
        <p>44 of 150 draw calls and 2.4 of 16.7 ms on a GTX 1070. The Android floor has not been measured.</p>
      </div>
    </div>
    <aside class="plate since" aria-labelledby="since-h">
      <p class="label cyan" id="since-h">Read as of 27 Sep 2026</p>
      <p>The frames and readings below are that day's. Each upgrade's tag is read from the issue tracker when this page is built, so it says what has landed since. The checkpoint after the audit corrected three findings:</p>
      <ul>
        <li>Most exported parts already carry UVs. Some of the kit's are placeholders, so trim sheets still wait on #1005.</li>
        <li>The 2.4 ms is CPU submission and overlay time, not GPU time.</li>
        <li>Desktop is this stack's target. #974 retired the Android floor as a requirement.</li>
      </ul>
    </aside>
  </header>

  <section aria-labelledby="frames-h">
    <div class="sec-head">
      <p class="label">01 · The gap</p>
      <h2 id="frames-h">Three frames, one art direction</h2>
      <p>The middle frame renders an approved GLB of the kind the game loads, lit by the portrait rig. The difference from the right frame is lighting and post-processing. The models are the same kind of asset.</p>
    </div>
    <div class="frames">
      <figure>
        ${frame('target', 'Concept plate V: four glossy submarines with glowing red, orange, green and violet lamps reflected on dark water.')}
        <figcaption>
          <span class="label cyan">Target</span>
          <span>Plate V, the concept art. Wet highlights and lamps that bloom.</span>
          <span class="has"><span class="pill info">Concept only</span></span>
        </figcaption>
      </figure>
      <figure>
        ${frame('portrait', 'Offline portrait of the Bathyarch cruiser: a stepped hull with amber lamp strips that glow with a soft halo over dark seabed.')}
        <figcaption>
          <span class="label cyan">Portrait rig</span>
          <span>Cruiser, Bathyarch. <code>tools/hull-renders/scene.html</code></span>
          <span class="has"><span class="pill ok">ACES tone map</span><span class="pill ok">Env map</span><span class="pill ok">Bloom</span><span class="pill ok">Soft shadows</span></span>
        </figcaption>
      </figure>
      <figure>
        ${frame('game', 'In-game frame at 12 degrees pitch: a dome base and small hulls on a dark green plateau, with HUD panels along the bottom.')}
        <figcaption>
          <span class="label cyan">In game today</span>
          <span>The Ventfront Divide at 12° pitch, from #836, before upgrade 1 landed.</span>
          <span class="has"><span class="pill miss">No tone map</span><span class="pill miss">No env map</span><span class="pill miss">No bloom</span><span class="pill miss">No shadows</span></span>
        </figcaption>
      </figure>
    </div>
  </section>

  <section aria-labelledby="stack-h">
    <div class="sec-head">
      <p class="label">02 · The stack today</p>
      <h2 id="stack-h">From prompt to pixel</h2>
      <p>Two lanes. Models are built and checked in the repo, then loaded by the client at runtime. The server decides what each player may see before anything is drawn.</p>
    </div>
    <div class="lanes">
      <div>
        <div class="lane-title"><h3>Offline, in the repo</h3><span class="label">Node scripts · headless Chromium</span></div>
        <div class="lane">
          <div class="node">
            <span class="kind">Look, per hull</span>
            <span class="name">Prompt kit</span>
            <span class="path">docs/asset-prompts-3d.md</span>
            <span class="note">The canonical description every model answers to.</span>
          </div>
          <div class="node">
            <span class="kind">Shape</span>
            <span class="name">Hull scripts</span>
            <span class="path">tools/hull-models/</span>
            <span class="note">three.js primitives composed per navy, written out by GLTFExporter r169.</span>
          </div>
          <div class="node warn">
            <span class="kind">Asset</span>
            <span class="name">108 GLBs</span>
            <span class="path">docs/concept-art/models/</span>
            <span class="note">18 MB. Colour, metalness, roughness and emissive only. No textures, and UVs zero-filled.</span>
          </div>
          <div class="node">
            <span class="kind">Gates</span>
            <span class="name">check:models · intake</span>
            <span class="path">tools/hull-models/check.mjs</span>
            <span class="note">Script and file must match part for part. Scale, emissive and glow curve are measured.</span>
          </div>
          <div class="node">
            <span class="kind">Sprites</span>
            <span class="name">Map bake</span>
            <span class="path">tools/hull-maps/build.mjs</span>
            <span class="note">Albedo, height and emissive PNGs at 4 px/m for hulls, 1.5 px/m for structures.</span>
          </div>
        </div>
      </div>

      <div class="bridge"><span class="arrow" aria-hidden="true">↓</span><span>The client loads each GLB lazily with GLTFLoader. The baked maps become the loading fallback and the sonar scope's sprites.</span></div>

      <div>
        <div class="lane-title"><h3>Runtime, in the browser</h3><span class="label">Node 22 · Vite 6 · TypeScript</span></div>
        <div class="lane">
          <div class="node">
            <span class="kind">Simulation</span>
            <span class="name">Server</span>
            <span class="path">Colyseus 0.18 · bitecs</span>
            <span class="note">Owns the world. The Echo Layer resolves detection per player.</span>
          </div>
          <div class="node">
            <span class="kind">Protocol</span>
            <span class="name">The wire</span>
            <span class="path">shared/src/wire.ts</span>
            <span class="note">Only resolved contacts cross. The client never holds hidden state.</span>
          </div>
          <div class="node">
            <span class="kind">Shell</span>
            <span class="name">React 18</span>
            <span class="path">frontend/src/App.tsx</span>
            <span class="note">Menus, lobby and settings around the two canvases.</span>
          </div>
          <div class="node warn">
            <span class="kind">World</span>
            <span class="name">Conn view</span>
            <span class="path">three 0.169 · WebGLRenderer</span>
            <span class="note">sRGB output, pixel ratio capped at 1.5. No tone mapping, no shadows, no post-processing.</span>
          </div>
          <div class="node">
            <span class="kind">HUD</span>
            <span class="name">Overlay</span>
            <span class="path">PixiJS 8 · transparent canvas</span>
            <span class="note">Chart marks re-projected through the conn camera every frame.</span>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section aria-labelledby="layers-h">
    <div class="sec-head">
      <p class="label">03 · Inside the frame</p>
      <h2 id="layers-h">The frame, front to back</h2>
      <p>Every layer the conn view and the overlay draw, nearest the eye first. Red rows are what the frame lacks.</p>
    </div>
    <div class="layers">
      <div class="layer">
        <span class="idx">01</span>
        <div class="what"><div class="t"><strong>HUD overlay</strong><span class="mono">EchoRenderer.ts</span></div><p class="d">PixiJS on a transparent canvas. Rings, symbols and routes projected on the CPU. One static diagonal grain.</p></div>
        <span class="cost">1.4–1.7 ms avg</span>
      </div>
      <div class="layer missing">
        <span class="idx">02</span>
        <div class="what"><div class="t"><strong>Post-processing</strong><span class="pill miss">Missing</span></div><p class="d">No tone mapping, bloom, vignette or chromatic split. The portrait rig has the first two. <code>art-direction.md</code> specifies the last two.</p></div>
        <span class="cost">Not built</span>
      </div>
      <div class="layer">
        <span class="idx">03</span>
        <div class="what"><div class="t"><strong>Marine snow</strong><span class="mono">water.ts</span></div><p class="d">7,000 points. Sinking, wrapping and fading all happen in the vertex shader.</p></div>
        <span class="cost">1 call</span>
      </div>
      <div class="layer">
        <span class="idx">04</span>
        <div class="what"><div class="t"><strong>Ordnance and depth cues</strong><span class="mono">ordnanceLayer.ts · depthCues.ts</span></div><p class="d">Instanced torpedoes, mines and trails. One plumb line and ground shadow per hull, batched.</p></div>
        <span class="cost">≤ 9 + 2 calls</span>
      </div>
      <div class="layer">
        <span class="idx">05</span>
        <div class="what"><div class="t"><strong>Own-force models</strong><span class="mono">rosterModels.ts</span></div><p class="d">GLBs merged one mesh per material. PBR materials under one ambient, a key and a cyan rim. Lamps follow live SIG.</p></div>
        <span class="cost">Own force only</span>
      </div>
      <div class="layer missing">
        <span class="idx">06</span>
        <div class="what"><div class="t"><strong>Environment reflections</strong><span class="pill miss">Missing</span></div><p class="d"><code>scene.environment</code> is never set, so metal and gloss have nothing to reflect. This is why hulls read as flat boxes.</p></div>
        <span class="cost">Not built</span>
      </div>
      <div class="layer">
        <span class="idx">07</span>
        <div class="what"><div class="t"><strong>Environment props</strong><span class="mono">environmentLayer.ts</span></div><p class="d">One instanced mesh per prop and material. Kelp sways in the vertex shader.</p></div>
        <span class="cost">≈ 30 calls · 105k tris reserved</span>
      </div>
      <div class="layer">
        <span class="idx">08</span>
        <div class="what"><div class="t"><strong>Terrain</strong><span class="mono">perspectiveTerrain.ts · seabed.ts</span></div><p class="d">Unlit heightfield wearing a seabed lit on the CPU at 32 px per cell. Survey ink and the acoustic veil ride it for free.</p></div>
        <span class="cost">No extra pass</span>
      </div>
      <div class="layer">
        <span class="idx">09</span>
        <div class="what"><div class="t"><strong>Water</strong><span class="mono">water.ts</span></div><p class="d">Depth-ramp fog patched into three.js's fog chunks, plus one full-screen quad that draws open water from world rays.</p></div>
        <span class="cost">1 call</span>
      </div>
    </div>
  </section>

  <section aria-labelledby="budget-h">
    <div class="sec-head">
      <p class="label">04 · Headroom</p>
      <h2 id="budget-h">What the budget leaves</h2>
      <p>Gate 6 of <code>graphics-standards.md</code> sets the ceilings. The readings are the fight station from the one real-GPU drive (#286): GTX 1070, 1440×900.</p>
    </div>
    <div class="meters">
      <div class="plate meter">
        <div class="top"><span class="label">Draw calls</span><span class="label">29% used</span></div>
        <span class="big">44 <small>/ 150</small></span>
        <div class="bar" role="img" aria-label="44 of 150 draw calls"><span style="width: 29.3%"></span></div>
        <div class="bar-scale"><span>0</span><span>75</span><span>150</span></div>
      </div>
      <div class="plate meter">
        <div class="top"><span class="label">Triangles</span><span class="label">56% used</span></div>
        <span class="big">141k <small>/ 250k</small></span>
        <div class="bar" role="img" aria-label="141,208 of 250,000 triangles"><span style="width: 56.5%"></span></div>
        <div class="bar-scale"><span>0</span><span>125k</span><span>250k</span></div>
      </div>
      <div class="plate meter">
        <div class="top"><span class="label">Both painters, avg</span><span class="label">14% of a 60 Hz frame</span></div>
        <span class="big">2.4 <small>/ 16.7 ms</small></span>
        <div class="bar" role="img" aria-label="2.42 of 16.7 milliseconds"><span style="width: 14.5%"></span></div>
        <div class="bar-scale"><span>0</span><span>8.3</span><span>16.7 ms</span></div>
      </div>
      <div class="plate meter wide">
        <div class="top"><span class="label">Android · Termux floor</span><span class="label" style="color: var(--amber)">Owed</span></div>
        <span class="big" style="color: var(--amber)">Unmeasured</span>
        <div class="bar unknown" role="img" aria-label="Not measured"></div>
        <p class="muted" style="font-size: 14px">Any post-processing needs a quality setting whose Off matches today's frame.</p>
      </div>
      <div class="plate meter wide">
        <div class="top"><span class="label">Model download, all 108</span><span class="label">Load time</span></div>
        <div class="pair">
          <div class="pair-row"><span>Raw</span><div class="bar"><span style="width: 100%; background: var(--amber)"></span></div><span class="v">18.0 MB</span></div>
          <div class="pair-row"><span>Gzipped</span><div class="bar"><span style="width: 12.2%"></span></div><span class="v">2.2 MB</span></div>
        </div>
        <p class="muted" style="font-size: 14px"><code>nginx.conf</code> turns on no gzip. A match fetches only the hulls it shows, each one raw.</p>
      </div>
    </div>
  </section>

  <section aria-labelledby="plan-h">
    <div class="sec-head">
      <p class="label">05 · Upgrades</p>
      <h2 id="plan-h">Ranked by look per unit of work</h2>
      <p>Numbers give the suggested order. Placement on the chart is an estimate. Item 5 is about load time, so it sits off the chart.</p>
    </div>

    <div class="plate plot-wrap">
      <svg viewBox="0 0 640 360" role="img" aria-label="Effort versus visual payoff for seven upgrades">
        <rect class="plot-zone" x="70" y="30" width="241" height="116"/>
        <text class="plot-zone-label" x="78" y="46">DO FIRST</text>
        <line class="plot-grid" x1="138.75" y1="30" x2="138.75" y2="310"/>
        <line class="plot-grid" x1="276.25" y1="30" x2="276.25" y2="310"/>
        <line class="plot-grid" x1="413.75" y1="30" x2="413.75" y2="310"/>
        <line class="plot-grid" x1="551.25" y1="30" x2="551.25" y2="310"/>
        <line class="plot-grid" x1="70" y1="263.33" x2="620" y2="263.33"/>
        <line class="plot-grid" x1="70" y1="170" x2="620" y2="170"/>
        <line class="plot-grid" x1="70" y1="76.67" x2="620" y2="76.67"/>
        <line class="plot-axis" x1="70" y1="310" x2="620" y2="310"/>
        <line class="plot-axis" x1="70" y1="30" x2="70" y2="310"/>
        <text class="plot-title" x="70" y="18">VISUAL PAYOFF ↑</text>
        <text class="plot-title" x="620" y="352" text-anchor="end">EFFORT →</text>
        <text class="plot-tick" x="62" y="267" text-anchor="end">Low</text>
        <text class="plot-tick" x="62" y="174" text-anchor="end">Medium</text>
        <text class="plot-tick" x="62" y="81" text-anchor="end">High</text>
        <text class="plot-tick" x="138.75" y="330" text-anchor="middle">Low</text>
        <text class="plot-tick" x="276.25" y="330" text-anchor="middle">Medium</text>
        <text class="plot-tick" x="413.75" y="330" text-anchor="middle">High</text>
        <text class="plot-tick" x="551.25" y="330" text-anchor="middle">Very high</text>

        <circle class="dot" cx="138.75" cy="76.67" r="11"/><text class="dot-num" x="138.75" y="81" text-anchor="middle">1</text>
        <text class="dot-label" x="138.75" y="104" text-anchor="middle">Tone map + env map</text>

        <circle class="dot" cx="276.25" cy="76.67" r="11"/><text class="dot-num" x="276.25" y="81" text-anchor="middle">2</text>
        <text class="dot-label" x="276.25" y="104" text-anchor="middle">SIG-gated bloom</text>

        <circle class="dot" cx="276.25" cy="132.67" r="11"/><text class="dot-num" x="276.25" y="137" text-anchor="middle">3</text>
        <text class="dot-label" x="293" y="137">Bevels + baked AO</text>

        <circle class="dot" cx="166.25" cy="207.33" r="11"/><text class="dot-num" x="166.25" y="211.5" text-anchor="middle">4</text>
        <text class="dot-label" x="166.25" y="234" text-anchor="middle">Vignette, split, sway</text>

        <circle class="dot" cx="413.75" cy="170" r="11"/><text class="dot-num" x="413.75" y="174.5" text-anchor="middle">6</text>
        <text class="dot-label" x="431" y="174.5">UVs + trim sheets</text>

        <circle class="dot" cx="221.25" cy="188.67" r="11"/><text class="dot-num" x="221.25" y="193" text-anchor="middle">7</text>
        <text class="dot-label" x="238" y="193">Shallow caustics</text>

        <circle class="dot later" cx="551.25" cy="95.33" r="11"/><text class="dot-num" x="551.25" y="99.5" text-anchor="middle">8</text>
        <text class="dot-label" x="551.25" y="123" text-anchor="middle">WebGPU + TSL</text>
      </svg>
    </div>

    <div class="cards">
      <article class="card top">
        <div class="card-head"><span class="card-num">1</span><div><h3>Tone mapping and an environment map</h3>
          <div class="tags"><span class="pill info">Effort low</span><span class="pill ok">Payoff high</span><span class="pill info">0 draw calls</span>${tag(1)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>PBR metal with nothing to reflect. The portrait rig already builds a gradient environment and uses ACES.</dd></div>
          <div><dt>Where</dt><dd><code>PerspectiveView.ts</code> renderer setup. Copy from <code>scene.html:113</code> and <code>:184</code>.</dd></div>
          <div><dt>Watch</dt><dd>Palette tokens and the water ramp are authored as display colour. Exempt the water shaders or recalibrate them (gate 4).</dd></div>
        </dl>
      </article>

      <article class="card top">
        <div class="card-head"><span class="card-num">2</span><div><h3>Bloom gated by SIG</h3>
          <div class="tags"><span class="pill info">Effort medium</span><span class="pill ok">Payoff high</span><span class="pill info">Half-res targets</span>${tag(2)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>Lamps glow in the portrait and not in play. Set the threshold so SIG 0–15 never blooms, and bloom becomes a read on loudness (gate 3).</dd></div>
          <div><dt>Where</dt><dd>A post stack after the conn render. The pmndrs <code>postprocessing</code> library merges effects into fewer passes.</dd></div>
          <div><dt>Watch</dt><dd>Gate 6 has no line for a post stack yet. Write it first, with a quality setting whose Off is today's frame.</dd></div>
        </dl>
      </article>

      <article class="card top">
        <div class="card-head"><span class="card-num">3</span><div><h3>Bevels and baked occlusion</h3>
          <div class="tags"><span class="pill info">Effort medium</span><span class="pill ok">Payoff medium-high</span><span class="pill info">Uses triangle headroom</span>${tag(3)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>Hard box edges catch no light. A chamfer catches the cyan rim, and occlusion baked into vertex colours gives stacked parts depth.</dd></div>
          <div><dt>Where</dt><dd><code>tools/hull-models/kit.mjs</code>, then every script re-run. <code>check:models</code> holds the result.</dd></div>
          <div><dt>Watch</dt><dd>Every GLB changes, so every intake bake needs a look.</dd></div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head"><span class="card-num">4</span><div><h3>Vignette, chromatic split, sway</h3>
          <div class="tags"><span class="pill info">Effort low</span><span class="pill spec">Specified, unbuilt</span><span class="pill info">Rides the bloom pass</span>${tag(4)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>The gap between <code>art-direction.md</code> ("Atmosphere rides on top") and the client, which draws none of the three.</dd></div>
          <div><dt>Watch</dt><dd>Sway is translation only. No effect may bend a range ring (gate 8). Honour reduced motion.</dd></div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head"><span class="card-num load">5</span><div><h3>Faster model delivery</h3>
          <div class="tags"><span class="pill info">Effort low</span><span class="pill info">Load time</span><span class="pill ok">18 → 2.2 MB</span>${tag(5)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>GLBs are sent raw. <code>furnace-bathyarch.glb</code> is 625 KB for 5,456 triangles.</dd></div>
          <div><dt>Where</dt><dd>Gzip for <code>.glb</code> in <code>nginx.conf</code>, or meshopt at bundle time so the repo copies stay diffable.</dd></div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head"><span class="card-num">6</span><div><h3>Real UVs and trim sheets</h3>
          <div class="tags"><span class="pill info">Effort high</span><span class="pill ok">Payoff medium</span>${tag(6)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd><code>kit.mjs:339</code> zero-fills UVs, so no model can take a texture. Panel lines and wear need UVs first.</dd></div>
          <div><dt>Where</dt><dd>The kit's primitives. <code>dreamLoop.ts</code> has dev-only panel shaders to start from.</dd></div>
          <div><dt>Watch</dt><dd>Gate 7. Detail that shows only at full zoom is garnish.</dd></div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head"><span class="card-num">7</span><div><h3>Caustics in the shallows</h3>
          <div class="tags"><span class="pill info">Effort low-medium</span><span class="pill ok">Payoff medium</span><span class="pill info">Terrain shader</span>${tag(7)}</div></div></div>
        <dl>
          <div><dt>Fixes</dt><dd>Gives the Shelf band a light of its own, which fits the rule that depth reads as luminance.</dd></div>
          <div><dt>Watch</dt><dd>A design call for <code>art-direction.md</code> first. Water is texture, not information, so caustics must never track activity.</dd></div>
        </dl>
      </article>

      <article class="card">
        <div class="card-head"><span class="card-num later">8</span><div><h3>WebGPU and TSL</h3>
          <div class="tags"><span class="pill info">Effort very high</span><span class="pill later">Later</span>${tag(8)}</div></div></div>
        <dl>
          <div><dt>Buys</dt><dd>Compute particles, GPU-driven fauna and a cheaper post stack.</dd></div>
          <div><dt>Blocks</dt><dd>three 0.169 needs upgrading. The fog, survey-ink and kelp-sway patches use <code>onBeforeCompile</code> and must be rewritten as node materials.</dd></div>
        </dl>
      </article>
    </div>
  </section>

  <section aria-labelledby="out-h">
    <div class="sec-head">
      <p class="label">06 · Ruled out</p>
      <h2 id="out-h">Looked at and set aside</h2>
    </div>
    <div class="ruled">
      <div><h3>Blender</h3><p>Hand-edited files end the script-to-GLB check. Its useful jobs fit in <code>kit.mjs</code>.</p></div>
      <div><h3>Gaussian splats</h3><p>Built to capture real scenes. Splats can't be recoloured per faction or lit by SIG.</p></div>
      <div><h3>AI mesh generators</h3><p>The output is a file, not a script, so it skips the pipeline of record. Useful as reference only.</p></div>
      <div><h3>Ray tracing</h3><p>Far beyond an RTS frame budget, and the Android floor is still unmeasured.</p></div>
    </div>
  </section>

  <footer>
    <p><span class="label">Sources</span> · <code>docs/graphics-standards.md</code> gate 6 and reading #286 · <code>docs/art-direction.md</code> · <code>packages/frontend/src/game/PerspectiveView.ts</code>, <code>rosterModels.ts</code>, <code>water.ts</code> · <code>tools/hull-renders/scene.html</code> · <code>tools/hull-models/kit.mjs</code> · <code>packages/frontend/nginx.conf</code>.</p>
    <p>Effort and payoff are estimates. Every other number was read from the repository on 27 Sep 2026. The page background is the game's water ramp (<code>WATER_RAMP</code>, <code>water.ts:87</code>), from 0 m at the top to 3,000 m at the foot.</p>
    <p${haveState ? '' : ' class="warn"'}>${provenance}</p>
    <p><a href="index.html">The roadmap</a> · <a href="https://github.com/${escape(repo)}">The project on GitHub</a></p>
  </footer>

</div>

</body>
</html>
`;
}
