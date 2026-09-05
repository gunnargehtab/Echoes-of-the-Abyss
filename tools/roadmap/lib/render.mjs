/**
 * Turn the parsed roadmap plus live issue state into one self-contained HTML
 * page. Inline CSS and JS on purpose: the site is a single file plus one font,
 * so there is nothing to cache-bust, nothing to 404, and nothing a proxy can
 * strip.
 *
 * The look transcribes docs/style-neon-noir.md — darkness as the default
 * state, cyan tells you, magenta asks you, glow only where it carries data.
 */

export const escape = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The few inline markdown forms the roadmap uses, on already-escaped text.
 * Relative links (to other design docs) become plain text — the site has
 * nowhere to send them, and the repository is private. Bare `#123` becomes a
 * link to that issue, which is where the page's every number comes from.
 */
export function inline(text, repo) {
  let html = escape(text);
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/~~(.+?)~~/g, '<s>$1</s>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(^|[\s(])\*([^*]+)\*(?=[\s).,;:]|$)/g, '$1<em>$2</em>');
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  html = html.replace(/&lt;(https?:\/\/[^&]+)&gt;/g, '<a href="$1">$1</a>');
  html = html.replace(
    /(^|[^\w"/>])#(\d+)\b/g,
    (_, before, n) =>
      `${before}<a class="issue" href="https://github.com/${repo}/issues/${n}">#${n}</a>`
  );
  return html;
}

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-US') : '—');

function stateOf(states, number) {
  return states.get(number)?.state ?? 'unknown';
}

function progress(items, states) {
  const rated = items.filter((i) => states.has(i.number));
  const closed = rated.filter((i) => states.get(i.number).state === 'closed');
  const total = rated.length || items.length;
  return {
    closed: closed.length,
    total,
    rated: rated.length,
    pct: rated.length === 0 ? 0 : Math.round((closed.length / rated.length) * 100),
    complete: rated.length > 0 && closed.length === rated.length,
  };
}

function itemRow(item, states, repo, content) {
  const known = states.get(item.number);
  const state = known?.state ?? 'unknown';
  const href = known?.url ?? `https://github.com/${repo}/issues/${item.number}`;
  const label = { closed: 'done', open: 'planned', unknown: 'unknown' }[state];
  const copy = content.items[item.number];
  return `<li class="item ${state}" data-state="${state}">
  <span class="mark" aria-hidden="true"></span>
  <span class="work">${copy ? escape(copy) : inline(item.work, repo)}</span>
  <span class="state-tag">${label}</span>
  <a class="ref" href="${escape(href)}" title="${escape(known?.title ?? `Issue #${item.number}`)}">#${item.number}</a>
</li>`;
}

function phaseCard(phase, states, repo, content, open) {
  const p = progress(phase.items, states);
  const status = p.complete ? 'complete' : p.closed > 0 ? 'active' : 'pending';
  const copy = content.phases[phase.number] ?? {};
  const title = copy.title ?? phase.title;
  const row = (i) => itemRow(i, states, repo, content);
  const groups =
    phase.groups.length === 0
      ? `<ul class="items">${phase.items.map(row).join('')}</ul>`
      : phase.groups
          .map((group) => {
            const items = phase.items.filter((i) => i.group === group);
            return `<div class="group"><h4>${escape(content.groups[group] ?? group)}</h4><ul class="items">${items
              .map(row)
              .join('')}</ul></div>`;
          })
          .join('') +
        (phase.items.some((i) => i.group === null)
          ? `<ul class="items">${phase.items
              .filter((i) => i.group === null)
              .map(row)
              .join('')}</ul>`
          : '');
  const verdict = p.complete ? 'done' : p.closed > 0 ? 'in progress' : 'planned';

  return `<details class="phase ${status}" id="phase-${phase.number}"${open ? ' open' : ''}>
  <summary>
    <span class="node" aria-hidden="true"></span>
    <span class="phase-head">
      <span class="phase-id">${escape(phase.id)}</span>
      <span class="phase-title">${escape(title)}</span>
    </span>
    <span class="phase-meta">
      <span class="verdict">${verdict}</span>
      <span class="count"><b>${p.closed}</b> of ${p.total}</span>
      <span class="bar small" role="progressbar" aria-valuenow="${p.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="${escape(phase.id)} progress"><span style="width:${p.pct}%"></span></span>
      <span class="chevron" aria-hidden="true"></span>
    </span>
  </summary>
  <div class="phase-body">
    ${copy.blurb ? `<p class="summary">${escape(copy.blurb)}</p>` : ''}
    ${groups}
  </div>
</details>`;
}

const fill = (text, counts) =>
  text.replace(/\{(\w+)\}/g, (_, key) => (key in counts ? String(counts[key]) : `{${key}}`));

export function render({
  roadmap,
  states,
  content,
  counts,
  repo,
  generatedAt,
  fontHref,
  sheet = null,
  unplaced = 0,
}) {
  const all = roadmap.phases.flatMap((phase) => phase.items);
  const overall = progress(all, states);
  const done = roadmap.phases.filter((p) => progress(p.items, states).complete);
  const live = roadmap.phases.filter((p) => !progress(p.items, states).complete);
  const haveState = states.size > 0;

  // Without state nothing is "complete", so every phase would land under
  // "what is next"; fall back to the newest phase there and the rest as past.
  const next = haveState ? live : roadmap.phases.slice(-1);
  const past = haveState ? done : roadmap.phases.slice(0, -1);

  const pillars = content.pillars
    .map(
      (c) =>
        `<article class="card pillar"><h3>${escape(c.title)}</h3><p>${escape(c.text)}</p></article>`
    )
    .join('\n');

  const factions = content.factions
    .map(
      (f) => `<article class="card faction" style="--accent:${escape(f.accent)}">
  <h3>${escape(f.name)}</h3>
  <p class="line">${escape(f.line)}</p>
  <p>${escape(f.text)}</p>
  <p class="plays">${escape(f.plays)}</p>
</article>`
    )
    .join('\n');

  const playable = content.playable
    .map(
      (c) =>
        `<article class="card play"><span class="tick" aria-hidden="true"></span><h3>${escape(fill(c.title, counts))}</h3><p>${escape(fill(c.text, counts))}</p></article>`
    )
    .join('\n');

  const roughEdges = roadmap.standing.questions
    .map((q) => {
      const copy = q.number === null ? null : content.roughEdges[q.number];
      const state = q.number === null ? 'unknown' : stateOf(states, q.number);
      const href =
        q.number === null
          ? null
          : (states.get(q.number)?.url ?? `https://github.com/${repo}/issues/${q.number}`);
      const label = { closed: 'fixed', open: 'being worked on', unknown: 'unknown' }[state];
      return `<article class="card status ${state}">
  <h3>${copy ? escape(copy.question) : inline(q.question, repo)}</h3>
  <p>${copy ? escape(state === 'closed' && copy.fixed ? copy.fixed : copy.text) : inline(q.reading, repo)}</p>
  ${href ? `<a class="ref-line" href="${escape(href)}"><span class="mark" aria-hidden="true"></span> <span class="state-tag">${label}</span> · #${q.number}</a>` : ''}
</article>`;
    })
    .join('\n');

  const sprints = roadmap.sprints
    .map(
      (sp) => `<article class="card sprint">
  <span class="node done" aria-hidden="true"></span>
  <h3>${escape(sp.id)} <span class="when">${escape(sp.when)}</span></h3>
  <p>${escape(content.sprints[sp.id] ?? sp.summary)}</p>
</article>`
    )
    .join('\n');

  const nextPhases = next.map((phase) => phaseCard(phase, states, repo, content, true)).join('\n');
  const pastPhases = past.map((phase) => phaseCard(phase, states, repo, content, false)).join('\n');

  const provenance = haveState
    ? `${content.footer.provenance} Last read ${escape(generatedAt)}.`
    : `This copy of the page was built without access to the issue tracker, so every item shows as unknown.`;

  // The one picture on the page. Width and height are written into the
  // markup so the box is reserved before the bytes arrive; without a sheet
  // the section simply ends at the navies, and the build has already said so.
  const roster =
    sheet === null
      ? ''
      : `      <h3 class="subhead" id="fleet">${escape(content.roster.title)}</h3>
      <p class="lede">${escape(content.roster.text)}</p>
      <figure class="sheet reveal">
        <a href="${escape(sheet.href)}"><img src="${escape(sheet.href)}" width="${sheet.width}" height="${sheet.height}" loading="lazy" decoding="async" alt="${escape(content.roster.alt)}"></a>
        <figcaption>${escape(content.roster.caption)}</figcaption>
      </figure>`;

  // What the tracker has that the roadmap has not placed yet. Said in one
  // line rather than hidden, so the page never claims the rows are the whole
  // of the work when the build knows they are not.
  const backlog =
    unplaced === 0
      ? ''
      : `      <p class="lede backlog"><a href="https://github.com/${repo}/issues?q=is%3Aissue+is%3Aopen">${unplaced === 1 ? 'One more open item in the tracker is' : `${unplaced} more open items in the tracker are`} not yet placed on this roadmap.</a></p>`;

  const stats = [
    { n: counts.missions, cls: 'cool', label: 'Campaign missions', sub: 'playable today' },
    { n: counts.factions, cls: 'cool', label: 'Navies', sub: 'each a different answer to noise' },
    { n: counts.maps, cls: 'cool', label: 'Maps', sub: 'three ways sound travels' },
    {
      n: overall.pct,
      cls: '',
      label: 'Roadmap complete',
      sub: `${overall.closed} of ${overall.total} items`,
      suffix: '%',
    },
    {
      n: done.length,
      cls: 'hot',
      label: 'Phases finished',
      sub: `of ${roadmap.phases.length} on the roadmap`,
    },
  ]
    .filter((t) => typeof t.n === 'number')
    .map(
      (t) =>
        `      <div class="stat reveal"><div class="n ${t.cls}"><span data-count="${t.n}">${fmt(t.n)}</span>${t.suffix ?? ''}</div><div class="l">${t.label}</div><div class="sub">${escape(t.sub)}</div></div>`
    )
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Echoes of the Abyss — Roadmap</title>
<meta name="description" content="Development roadmap and progress for Echoes of the Abyss, a browser-native RTS with acoustic fog of war. You do not see the enemy. You hear them, badly.">
<meta name="theme-color" content="#03080e">
<meta property="og:title" content="Echoes of the Abyss — Roadmap">
<meta property="og:description" content="Where the build stands, phase by phase, read live from the issue tracker.">
<link rel="icon" href="favicon.svg" type="image/svg+xml">
<style>
@font-face {
  font-family: 'Big Shoulders Display';
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
  src: url('${fontHref}') format('woff2');
}
/* docs/style-neon-noir.md — tokens, not suggestions. */
:root {
  --abyss-void: #03080e;
  --abyss-floor: #070e1a;
  --abyss-panel: #0a1424;
  --abyss-glass: #0d1c28;
  --neon-cyan: #35e0ff;
  --neon-magenta: #ff3da6;
  --neon-violet: #8b5cf6;
  --mouth-glow: #c9a6ff;
  --neon-amber: #f2b233;
  --neon-red: #ff3b30;
  --neon-teal: #5fd0c0;
  --text-bright: #d6e6f0;
  --text-dim: #6f8a9c;
  --text-cyan: #a8d0e0;
  --display: 'Big Shoulders Display', 'Bahnschrift', 'Oswald', 'Arial Narrow', 'Impact', sans-serif;
  --mono: ui-monospace, 'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace;
  --cyan-halo: 0 0 10px rgba(53, 224, 255, 0.35);
  --magenta-halo: 0 0 10px rgba(255, 61, 166, 0.35);
  --max: 68rem;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 4.5rem; }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
body {
  margin: 0;
  background: var(--abyss-void);
  color: var(--text-dim);
  font: 15px/1.65 var(--mono);
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
a { color: var(--text-cyan); text-decoration: none; }
a:hover, a:focus-visible { color: var(--neon-cyan); text-decoration: underline; text-underline-offset: 3px; }
:focus-visible { outline: 1px solid var(--neon-magenta); outline-offset: 3px; box-shadow: var(--magenta-halo); }
code { font-family: var(--mono); font-size: 0.92em; color: var(--text-cyan); background: rgba(53, 224, 255, 0.07); padding: 0 0.3em; border-radius: 2px; }
strong { color: var(--text-bright); font-weight: 600; }
h1, h2, h3, h4 { font-family: var(--display); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; margin: 0; color: var(--text-bright); }
.wrap { max-width: var(--max); margin: 0 auto; padding: 0 1.25rem; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

/* One scanline texture across the whole page, ≤ 4 % — never per panel. */
body::after {
  content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 50;
  background: repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0 1px, transparent 1px 3px);
  mix-blend-mode: overlay;
}

/* ---- nav ---- */
.nav {
  position: sticky; top: 0; z-index: 40;
  background: rgba(3, 8, 14, 0.82); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(53, 224, 255, 0.12);
}
.nav .wrap { display: flex; align-items: center; gap: 1.2rem; height: 3.4rem; }
.wordmark { display: inline-flex; align-items: baseline; gap: 0.5rem; font-family: var(--display); text-transform: uppercase; white-space: nowrap; }
.wordmark:hover { text-decoration: none; }
.wordmark .mark-small { width: 1.35rem; height: 1.35rem; align-self: center; }
.wordmark-name { font-weight: 700; font-size: 1.15rem; letter-spacing: 0.07em; color: var(--text-bright); text-shadow: 0 0 12px rgba(139, 92, 246, 0.35); }
.wordmark-sub { font-weight: 600; font-size: 0.72rem; letter-spacing: 0.4em; color: var(--mouth-glow); }
.nav ul { list-style: none; display: flex; gap: 1.1rem; margin: 0 0 0 auto; padding: 0; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; }
.nav ul a { color: var(--text-dim); padding: 0.3rem 0; border-bottom: 1px solid transparent; }
.nav ul a:hover, .nav ul a:focus-visible { text-decoration: none; color: var(--text-bright); }
.nav ul a.active { color: var(--neon-cyan); border-bottom-color: var(--neon-cyan); }
.nav .pill { font-size: 0.72rem; letter-spacing: 0.12em; color: var(--text-bright); border: 1px solid rgba(255, 61, 166, 0.5); border-radius: 3px; padding: 0.25rem 0.6rem; white-space: nowrap; }
.nav .pill b { color: var(--neon-magenta); font-weight: 600; }
@media (max-width: 720px) { .nav ul { display: none; } }

/* ---- hero ---- */
.hero {
  position: relative; overflow: hidden; isolation: isolate;
  min-height: min(92vh, 56rem);
  display: grid; align-items: center;
}
.strata { position: absolute; inset: 0; z-index: -1; pointer-events: none; }
.strata .band { position: absolute; left: 0; right: 0; border-top: 1px dashed rgba(214, 230, 240, 0.12); }
.strata .band span { position: absolute; left: 1.25rem; top: 0.35rem; font-size: 0.62rem; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(111, 138, 156, 0.75); }
.strata .band i { position: absolute; right: 1.25rem; top: 0.35rem; font-style: normal; font-size: 0.62rem; letter-spacing: 0.18em; color: rgba(111, 138, 156, 0.6); }
.strata .band.b1 { top: 0; border-top: 0; }
.strata .band.b2 { top: 34%; }
.strata .band.b3 { top: 68%; }
.strata .depth-axis { position: absolute; left: 1.25rem; top: 0; bottom: 0; width: 1px; background: linear-gradient(rgba(214,230,240,0.18), rgba(214,230,240,0.02)); }
.hero {
  background:
    radial-gradient(58% 34% at 50% 106%, rgba(139, 92, 246, 0.16), transparent 70%),
    linear-gradient(var(--abyss-floor), var(--abyss-void) 55%, #000 100%);
}
.hero-grid { position: relative; display: grid; gap: 3rem 4rem; align-items: center; padding-top: 4.5rem; padding-bottom: 4rem; padding-left: 3.25rem; grid-template-columns: minmax(16rem, 22rem) 1fr; }
@media (max-width: 860px) {
  .hero-grid { grid-template-columns: 1fr; padding-left: 3rem; text-align: left; }
  .lockup { margin: 0 auto; }
  .strata .band span, .strata .band i { display: none; }
}

/* ---- the lockup: docs/naming.md "The logo", vertical ---- */
.lockup { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.9rem; }
.mark { width: 13rem; height: auto; overflow: visible; }
.mark .b { opacity: var(--o); }
.wordmark-big { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; }
.wordmark-big .name { position: relative; display: inline-block; font-size: clamp(3rem, 8vw, 4.4rem); font-weight: 700; line-height: 1; letter-spacing: 0.07em; color: var(--text-bright); }
.wordmark-big .name .core { position: relative; text-shadow: 0 0 1px rgba(139,92,246,0.4), 0 0 24px rgba(139,92,246,0.35), 0 26px 30px rgba(139,92,246,0.16); }
.wordmark-big .name .ghost { position: absolute; inset: 0; color: var(--neon-violet); opacity: 0; pointer-events: none; filter: blur(0.5px); }
.wordmark-big .sub { font-size: clamp(1rem, 2.4vw, 1.35rem); font-weight: 600; letter-spacing: 0.5em; text-indent: 0.5em; color: var(--mouth-glow); text-shadow: 0 0 12px rgba(139, 92, 246, 0.4); }
.motto { margin: 0; font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.65; }

/* The sounding. Every seven seconds a pulse descends the bands, the throat
   answers, and one echo comes back up out of it. The bands' resting order
   never changes — the pulse rides on top of it and is gone in under a second,
   so the mark still brightens downward, always. */
.mark .b1 { animation-delay: 0s; } .mark .b2 { animation-delay: 0.14s; } .mark .b3 { animation-delay: 0.28s; } .mark .b4 { animation-delay: 0.42s; } .mark .b5 { animation-delay: 0.56s; }
.mark .b { animation: band-pulse-7 7s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes band-pulse-7 { 0%, 10% { opacity: var(--o); filter: none; } 5% { opacity: 1; filter: drop-shadow(0 0 4px rgba(201,166,255,0.9)); } 100% { opacity: var(--o); filter: none; } }
.throat { transform-origin: 120px 162px; animation: throat-flare-7 7s ease-out infinite; }
.throat-halo { transform-origin: 120px 162px; animation: throat-halo-7 7s ease-out infinite; }
@keyframes throat-flare-7 { 0%, 9% { transform: scale(1); } 13% { transform: scale(2.6); } 22% { transform: scale(1); } 100% { transform: scale(1); } }
@keyframes throat-halo-7 { 0%, 9% { opacity: 0.3; transform: scale(1); } 13% { opacity: 1; transform: scale(2.4); } 26% { opacity: 0.3; transform: scale(1); } 100% { opacity: 0.3; transform: scale(1); } }
.echo-arc { opacity: 0; transform-box: view-box; animation: echo-out-7 7s cubic-bezier(0.2, 0.6, 0.3, 1) infinite; }
@keyframes echo-out-7 { 0%, 11% { transform: translate(120px, 162px) scale(0.04) translate(-120px, -162px); opacity: 0; } 14% { opacity: 0.55; } 40% { transform: translate(120px, 162px) scale(1.5) translate(-120px, -162px); opacity: 0; } 100% { transform: translate(120px, 162px) scale(1.5) translate(-120px, -162px); opacity: 0; } }
.wordmark-big .ghost { animation: word-echo-7 7s ease-out infinite; animation-delay: 0.85s; }
.wordmark-big .ghost.g2 { animation-delay: 1.15s; }
@keyframes word-echo-7 { 0%, 100% { opacity: 0; transform: translateY(0); } 2% { opacity: 0.3; } 16% { opacity: 0; transform: translateY(0.5em); } }
@media (prefers-reduced-motion: reduce) {
  .mark .b, .throat, .throat-halo, .echo-arc, .wordmark-big .ghost { animation: none; }
}

.hero-copy { position: relative; }
.eyebrow { font-size: 0.68rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--text-cyan); margin: 0 0 1.2rem; }
.eyebrow::before { content: ''; display: inline-block; width: 2rem; height: 1px; background: var(--neon-cyan); vertical-align: middle; margin-right: 0.8rem; box-shadow: var(--cyan-halo); }
.tagline { font-family: var(--display); font-weight: 500; font-size: clamp(1.5rem, 3vw, 2.3rem); letter-spacing: 0.03em; color: var(--text-bright); margin: 0; max-width: 30ch; line-height: 1.15; text-transform: none; }
.pitch { max-width: 58ch; margin: 1.2rem 0 0; font-size: 0.9rem; }
.cta { display: flex; flex-wrap: wrap; gap: 0.8rem; margin-top: 2rem; }
.btn { font-family: var(--mono); font-size: 0.74rem; letter-spacing: 0.16em; text-transform: uppercase; padding: 0.7rem 1.1rem; border: 1px solid; border-radius: 3px; transition: box-shadow 0.2s, background 0.2s; }
.btn:hover, .btn:focus-visible { text-decoration: none; }
.btn.magenta { color: var(--neon-magenta); border-color: var(--neon-magenta); box-shadow: var(--magenta-halo); }
.btn.magenta:hover { background: rgba(255, 61, 166, 0.1); box-shadow: 0 0 16px rgba(255, 61, 166, 0.5); }
.btn.cyan { color: var(--neon-cyan); border-color: rgba(53, 224, 255, 0.6); }
.btn.cyan:hover { background: rgba(53, 224, 255, 0.08); box-shadow: var(--cyan-halo); }
.readout { margin-top: 2.2rem; max-width: 30rem; border: 1px solid rgba(53, 224, 255, 0.18); background: rgba(10, 20, 36, 0.85); border-radius: 3px; padding: 1rem 1.2rem; position: relative; }
.readout::before, .readout::after { content: ''; position: absolute; width: 8px; height: 8px; border-color: var(--neon-cyan); border-style: solid; opacity: 0.7; }
.readout::before { top: -1px; left: -1px; border-width: 1px 0 0 1px; }
.readout::after { bottom: -1px; right: -1px; border-width: 0 1px 1px 0; }
.readout .label { font-size: 0.66rem; letter-spacing: 0.2em; text-transform: uppercase; }
.readout .big { font-family: var(--display); font-weight: 700; font-size: 3.2rem; line-height: 1; color: var(--neon-cyan); text-shadow: var(--cyan-halo); margin-top: 0.3rem; }
.readout .big small { font-size: 0.9rem; font-family: var(--mono); color: var(--text-dim); letter-spacing: 0.1em; margin-left: 0.6rem; text-shadow: none; }
.bar { display: block; height: 6px; border-radius: 3px; background: rgba(53, 224, 255, 0.12); overflow: hidden; margin: 0.7rem 0 0.2rem; }
.bar span { display: block; height: 100%; width: 0; background: linear-gradient(90deg, var(--neon-teal), var(--neon-cyan)); box-shadow: 0 0 10px rgba(53, 224, 255, 0.5); transition: width 1.1s cubic-bezier(0.2, 0.8, 0.2, 1); }
.bar.small { height: 4px; width: 5rem; margin: 0; flex: 0 0 auto; }
.js-ready .bar span { width: var(--w); }
.no-js .bar span, html:not(.js-ready) .bar span { width: var(--w); transition: none; }

/* ---- sections ---- */
section { padding: 4.5rem 0 1rem; }
.section-head { display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.6rem; border-bottom: 1px solid rgba(53, 224, 255, 0.16); padding-bottom: 0.7rem; }
.section-head h2 { font-size: 1.55rem; letter-spacing: 0.1em; color: var(--text-cyan); text-shadow: var(--cyan-halo); }
.section-head .kicker { font-size: 0.68rem; letter-spacing: 0.22em; text-transform: uppercase; color: var(--text-dim); }
.lede { max-width: 72ch; margin: 0 0 1.6rem; }
.grid { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
.card {
  position: relative; background: rgba(10, 20, 36, 0.88); border: 1px solid rgba(53, 224, 255, 0.14); border-radius: 3px; padding: 1.1rem 1.2rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.card::before { content: ''; position: absolute; top: -1px; left: -1px; width: 8px; height: 8px; border: 1px solid rgba(53, 224, 255, 0.45); border-width: 1px 0 0 1px; }
.card:hover { border-color: rgba(255, 61, 166, 0.45); box-shadow: var(--magenta-halo); }
.card h3 { font-size: 1.05rem; letter-spacing: 0.06em; color: var(--text-bright); margin-bottom: 0.45rem; }
.card p { margin: 0; font-size: 0.86rem; }

/* stat tiles */
.stats { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); margin-top: -2.4rem; position: relative; z-index: 2; }
.stat { background: rgba(13, 28, 40, 0.92); border: 1px solid rgba(255, 61, 166, 0.35); border-radius: 3px; padding: 0.9rem 1rem; }
.stat .n { font-family: var(--display); font-weight: 700; font-size: 2.4rem; line-height: 1; color: var(--text-bright); }
.stat .n.hot { color: var(--neon-amber); }
.stat .n.cool { color: var(--neon-teal); }
.stat .l { font-size: 0.64rem; letter-spacing: 0.18em; text-transform: uppercase; margin-top: 0.4rem; }
.stat .sub { font-size: 0.7rem; margin-top: 0.15rem; color: var(--text-dim); opacity: 0.8; }

/* status cards */
.status .mark { display: inline-block; width: 8px; height: 8px; border-radius: 50%; border: 1px solid currentColor; vertical-align: middle; margin-right: 0.3rem; }
.status.open { border-left: 2px solid var(--neon-amber); }
.status.closed { border-left: 2px solid var(--neon-teal); }
.status.closed .mark { background: var(--neon-teal); border-color: var(--neon-teal); }
.status.open .mark { border-color: var(--neon-amber); }
.ref-line { display: inline-block; margin-top: 0.8rem; font-size: 0.72rem; letter-spacing: 0.1em; text-transform: uppercase; }
.state-tag { font-size: 0.62rem; letter-spacing: 0.16em; text-transform: uppercase; opacity: 0.85; }
.status.open .state-tag { color: var(--neon-amber); }
.status.closed .state-tag { color: var(--neon-teal); }

/* built grid */
.built h3 { color: var(--neon-cyan); text-shadow: none; font-size: 1rem; }
.built h3::first-letter { text-transform: uppercase; }

/* timeline of phases */
.controls { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; margin: 0 0 1.2rem; }
.chip { font-family: var(--mono); font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim); background: transparent; border: 1px solid rgba(53, 224, 255, 0.25); border-radius: 3px; padding: 0.4rem 0.75rem; cursor: pointer; transition: all 0.15s; }
.chip:hover { color: var(--text-bright); border-color: var(--neon-magenta); }
.chip[aria-pressed="true"] { color: var(--neon-magenta); border-color: var(--neon-magenta); box-shadow: var(--magenta-halo); }
.chip.ghost { margin-left: auto; border-color: transparent; }
.search { font-family: var(--mono); font-size: 0.78rem; color: var(--text-bright); background: var(--abyss-glass); border: 1px solid rgba(53, 224, 255, 0.25); border-radius: 3px; padding: 0.42rem 0.7rem; min-width: 14rem; }
.search::placeholder { color: var(--text-dim); letter-spacing: 0.08em; }
.search:focus { outline: none; border-color: var(--neon-magenta); box-shadow: var(--magenta-halo); }
.timeline { position: relative; padding-left: 1.6rem; }
.timeline::before { content: ''; position: absolute; left: 0.45rem; top: 0.8rem; bottom: 0.8rem; width: 1px; background: linear-gradient(var(--neon-teal), rgba(53, 224, 255, 0.35) 70%, rgba(242, 178, 51, 0.5)); }
.phase { background: var(--abyss-panel); border: 1px solid rgba(53, 224, 255, 0.14); border-radius: 3px; margin-bottom: 0.7rem; position: relative; transition: border-color 0.2s; }
.phase.complete { border-color: rgba(95, 208, 192, 0.32); }
.phase.active { border-color: rgba(242, 178, 51, 0.4); }
.phase[open] { border-color: rgba(255, 61, 166, 0.4); box-shadow: var(--magenta-halo); }
.phase summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 1rem; padding: 0.85rem 1.1rem; flex-wrap: wrap; }
.phase summary::-webkit-details-marker { display: none; }
.node { position: absolute; left: -1.6rem; width: 11px; height: 11px; border-radius: 50%; border: 1px solid var(--text-dim); background: var(--abyss-void); top: 1.15rem; margin-left: 0.45rem; transform: translateX(-50%); }
.phase.complete .node, .node.done { border-color: var(--neon-teal); background: var(--neon-teal); box-shadow: 0 0 8px rgba(95, 208, 192, 0.7); }
.phase.active .node { border-color: var(--neon-amber); background: var(--neon-amber); box-shadow: 0 0 8px rgba(242, 178, 51, 0.7); }
.phase-head { display: flex; align-items: baseline; gap: 0.7rem; flex: 1 1 14rem; min-width: 0; }
.phase-id { font-size: 0.7rem; letter-spacing: 0.2em; text-transform: uppercase; color: var(--text-cyan); white-space: nowrap; }
.phase-title { font-family: var(--display); font-size: 1.2rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--text-bright); font-weight: 600; }
.phase-meta { display: flex; align-items: center; gap: 0.8rem; font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; white-space: nowrap; }
.verdict { color: var(--text-dim); border: 1px solid rgba(111, 138, 156, 0.35); border-radius: 2px; padding: 0.1rem 0.4rem; }
.phase.complete .verdict { color: var(--neon-teal); border-color: rgba(95, 208, 192, 0.45); }
.phase.active .verdict { color: var(--neon-amber); border-color: rgba(242, 178, 51, 0.45); }
.count b { color: var(--text-bright); font-weight: 600; }
.chevron { width: 7px; height: 7px; border-right: 1px solid var(--text-dim); border-bottom: 1px solid var(--text-dim); transform: rotate(45deg); transition: transform 0.2s; }
.phase[open] .chevron { transform: rotate(-135deg); }
.phase-body { padding: 0 1.1rem 1rem; border-top: 1px solid rgba(53, 224, 255, 0.1); }
.summary { font-size: 0.86rem; margin: 0.9rem 0 0.4rem; max-width: 80ch; }
.group h4 { font-size: 0.68rem; letter-spacing: 0.2em; color: var(--text-cyan); margin: 1rem 0 0.2rem; }
.items { list-style: none; margin: 0.4rem 0 0; padding: 0; }
.item { display: grid; grid-template-columns: 1rem 1fr auto auto; gap: 0.7rem; align-items: baseline; padding: 0.4rem 0; font-size: 0.82rem; }
.item + .item { border-top: 1px solid rgba(53, 224, 255, 0.07); }
.item .mark { width: 9px; height: 9px; border-radius: 50%; align-self: center; border: 1px solid currentColor; }
.item.closed { color: var(--neon-teal); }
.item.closed .mark { background: var(--neon-teal); }
.item.closed .work { text-decoration: line-through; opacity: 0.55; }
.item.open { color: var(--neon-amber); }
.item.unknown { color: var(--text-dim); opacity: 0.7; }
.item .work { color: var(--text-bright); }
.item.closed .work { color: inherit; }
.item .ref { color: var(--text-cyan); opacity: 0.8; }
.item[hidden] { display: none; }
.item .state-tag { color: inherit; }
.phase .empty { display: none; font-size: 0.78rem; padding: 0.6rem 0; }
.phase.filtered-empty .empty { display: block; }

/* gates */
.gate { padding-left: 3.2rem; }
.gate-n { position: absolute; left: 1.1rem; top: 1rem; font-family: var(--display); font-weight: 700; font-size: 1.6rem; color: var(--neon-magenta); text-shadow: var(--magenta-halo); line-height: 1; }

/* sprints */
.sprints { position: relative; padding-left: 1.6rem; }
.sprints::before { content: ''; position: absolute; left: 0.45rem; top: 0.8rem; bottom: 0.8rem; width: 1px; background: rgba(95, 208, 192, 0.45); }
.sprint { margin-bottom: 0.8rem; }
.sprint .node { top: 1.3rem; }
.sprint .when { font-family: var(--mono); font-size: 0.66rem; letter-spacing: 0.18em; color: var(--text-dim); margin-left: 0.5rem; text-transform: uppercase; }

/* footer */
footer { margin-top: 4rem; border-top: 1px solid rgba(53, 224, 255, 0.12); padding: 2rem 0 3rem; font-size: 0.72rem; }
footer .stamp { color: var(--text-cyan); }
footer .warn { color: var(--neon-amber); }
footer p { margin: 0.3rem 0; }
.reveal { opacity: 0; transform: translateY(10px); transition: opacity 0.5s ease, transform 0.5s ease; }
.reveal.in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .reveal { opacity: 1; transform: none; transition: none; } .bar span { transition: none; } }

/* pillars, navies, playable */
.pillar h3 { color: var(--neon-cyan); }
.faction { border-left: 2px solid var(--accent); }
.faction h3 { color: var(--accent); }
.faction .line { font-family: var(--display); font-size: 1.05rem; letter-spacing: 0.03em; color: var(--text-bright); margin-bottom: 0.5rem; }
.faction .plays { margin-top: 0.7rem; font-size: 0.68rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-dim); }
.play { padding-left: 2.4rem; }
.play .tick { position: absolute; left: 1rem; top: 1.25rem; width: 10px; height: 10px; border-radius: 50%; background: var(--neon-teal); box-shadow: 0 0 8px rgba(95, 208, 192, 0.7); }
.play h3 { color: var(--text-bright); }
.subhead { font-size: 1rem; letter-spacing: 0.16em; color: var(--text-cyan); margin: 2.4rem 0 0.8rem; }
footer .note { color: var(--text-bright); font-family: var(--display); font-size: 1.05rem; letter-spacing: 0.03em; text-transform: none; }

/* the roster sheet: the image is already on the void, so the frame is the
   card's own — one corner tick, a hairline, no second background. */
.sheet { margin: 0; position: relative; border: 1px solid rgba(53, 224, 255, 0.14); border-radius: 3px; background: var(--abyss-void); padding: 0.6rem; }
.sheet::before { content: ''; position: absolute; top: -1px; left: -1px; width: 8px; height: 8px; border: 1px solid rgba(53, 224, 255, 0.45); border-width: 1px 0 0 1px; }
.sheet a { display: block; }
.sheet img { display: block; width: 100%; height: auto; }
.sheet figcaption { font-size: 0.7rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-dim); padding: 0.7rem 0.3rem 0.1rem; }
.backlog { font-size: 0.8rem; margin-top: -0.8rem; }
.backlog a { color: var(--neon-amber); }
</style>
</head>
<body>
<a class="sr" href="#play" >Skip to what you can play</a>
<nav class="nav" aria-label="Sections">
  <div class="wrap">
    <a class="wordmark" href="#top" aria-label="Echoes of the Abyss — top of page">
      <svg class="mark-small" viewBox="0 0 200 200" aria-hidden="true"><g stroke="var(--neon-violet)" fill="none"><path d="M 14 34 Q 100 82 186 34" stroke-width="10" opacity="0.5"/><path d="M 42 78 Q 100 116 158 78" stroke-width="12" opacity="0.75"/><path d="M 66 122 Q 100 146 134 122" stroke-width="14" opacity="1"/></g><circle cx="100" cy="168" r="14" fill="var(--mouth-glow)"/></svg>
      <span class="wordmark-name">Echoes</span><span class="wordmark-sub">of the Abyss</span>
    </a>
    <ul>
      <li><a href="#game">The game</a></li>
      <li><a href="#navies">Navies</a></li>
      <li><a href="#play">Play</a></li>
      <li><a href="#next">Next</a></li>
      <li><a href="#past">So far</a></li>
    </ul>
    <span class="pill" title="${escape(provenance)}"><b>${overall.pct}%</b> · ${overall.closed} of ${overall.total}</span>
  </div>
</nav>

<header class="hero" id="top">
  <div class="strata" aria-hidden="true">
    <span class="depth-axis"></span>
    <div class="band b1"><span>Shelf</span><i>0 m</i></div>
    <div class="band b2"><span>Mid-water</span><i>400 m</i></div>
    <div class="band b3"><span>Abyssal</span><i>1,800 m</i></div>
  </div>
  <div class="wrap hero-grid">
    <div class="lockup" aria-label="Echoes of the Abyss">
      <svg class="mark" viewBox="0 0 240 184" fill="none" role="img" aria-label="The Mouth — the game's mark">
        <defs><filter id="halo" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="3"/></filter></defs>
        <path class="echo-arc" d="M 20 28 Q 120 74 220 28" stroke="var(--mouth-glow)" stroke-width="1.4"/>
        <g class="halo" stroke="var(--neon-violet)" filter="url(#halo)" opacity="0.35" stroke-width="3">
          <path d="M 20 28 Q 120 74 220 28"/><path d="M 42 56 Q 120 96 198 56"/><path d="M 62 84 Q 120 118 178 84"/><path d="M 80 112 Q 120 138 160 112"/><path d="M 96 138 Q 120 154 144 138"/>
        </g>
        <g class="bands" stroke="var(--neon-violet)">
          <path class="b b1" d="M 20 28 Q 120 74 220 28" stroke-width="1.6" style="--o:0.45"/>
          <path class="b b2" d="M 42 56 Q 120 96 198 56" stroke-width="1.8" style="--o:0.6"/>
          <path class="b b3" d="M 62 84 Q 120 118 178 84" stroke-width="2" style="--o:0.75"/>
          <path class="b b4" d="M 80 112 Q 120 138 160 112" stroke-width="2.2" style="--o:0.9"/>
          <path class="b b5" d="M 96 138 Q 120 154 144 138" stroke-width="2.4" style="--o:1"/>
        </g>
        <circle class="throat-halo" cx="120" cy="162" r="7" fill="var(--mouth-glow)" opacity="0.3" filter="url(#halo)"/>
        <circle class="throat" cx="120" cy="162" r="2.5" fill="var(--mouth-glow)"/>
      </svg>
      <h1 class="wordmark-big">
        <span class="name"><span class="ghost" aria-hidden="true">Echoes</span><span class="ghost g2" aria-hidden="true">Echoes</span><span class="core">Echoes</span></span>
        <span class="sub">of the Abyss</span>
      </h1>
      <p class="motto">${escape(content.hero.motto)}</p>
    </div>
    <div class="hero-copy">
      <p class="eyebrow">${escape(content.hero.eyebrow)}</p>
      <p class="tagline">${escape(content.hero.tagline)}</p>
      <p class="pitch">${escape(content.hero.pitch)}</p>
      <div class="cta">
        <a class="btn magenta" href="${escape(content.hero.primary.href)}">${escape(content.hero.primary.label)}</a>
        <a class="btn cyan" href="${escape(content.hero.secondary.href)}">${escape(content.hero.secondary.label)}</a>
      </div>
      <div class="readout">
        <div class="label">Roadmap complete</div>
        <div class="big"><span data-count="${overall.pct}">${overall.pct}</span>%<small>${overall.closed} of ${overall.total} items</small></div>
        <span class="bar" role="progressbar" aria-valuenow="${overall.pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Overall progress"><span style="--w:${overall.pct}%"></span></span>
      </div>
    </div>
  </div>
</header>

<main>
  <div class="wrap">
    <div class="stats" aria-label="The game in numbers">
${stats}
    </div>
  </div>

  <section id="game">
    <div class="wrap">
      <div class="section-head"><h2>What kind of game this is</h2><span class="kicker">five rules the whole design descends from</span></div>
      <div class="grid">
${pillars}
      </div>
    </div>
  </section>

  <section id="navies">
    <div class="wrap">
      <div class="section-head"><h2>Four navies, one argument</h2><span class="kicker">each a different answer to the same problem: noise</span></div>
      <p class="lede">No faction is written as the villain. All four campaign endings are coherent, costly, and irreconcilable.</p>
      <div class="grid">
${factions}
      </div>
${roster}
    </div>
  </section>

  <section id="play">
    <div class="wrap">
      <div class="section-head"><h2>What you can play today</h2><span class="kicker">built, working, and in the game right now</span></div>
      <div class="grid">
${playable}
      </div>
      <h3 class="subhead">Known rough edges</h3>
      <p class="lede">The honest part. These are the things a player would notice first, and each one is tracked in the open.</p>
      <div class="grid">
${roughEdges}
      </div>
    </div>
  </section>

  <section id="next">
    <div class="wrap">
      <div class="section-head"><h2>What is next</h2><span class="kicker">progress read live from the project tracker</span></div>
      <p class="lede">Every line below is a piece of work the team has committed to, and its state comes straight from the tracker when this page is built. Nothing here is a wish list.</p>
${backlog}
      <div class="controls" role="group" aria-label="Filter items">
        <button class="chip" type="button" data-filter="all" aria-pressed="true">All</button>
        <button class="chip" type="button" data-filter="open" aria-pressed="false">Planned</button>
        <button class="chip" type="button" data-filter="closed" aria-pressed="false">Done</button>
        <input class="search" type="search" placeholder="Search the roadmap…" aria-label="Search roadmap items">
        <button class="chip ghost" type="button" data-toggle="expand">Expand all</button>
      </div>
      <div class="timeline">
${nextPhases}
      </div>
    </div>
  </section>

  <section id="past">
    <div class="wrap">
      <div class="section-head"><h2>The road so far</h2><span class="kicker">${past.length} phases finished</span></div>
      <div class="timeline">
${pastPhases}
      </div>
      <h3 class="subhead">Milestones</h3>
      <div class="sprints">
${sprints}
      </div>
    </div>
  </section>

  <footer>
    <div class="wrap">
      <p class="note">${escape(content.footer.note)}</p>
      <p class="${haveState ? 'stamp' : 'warn'}">${provenance}</p>
      <p><a href="https://github.com/${repo}">The project on GitHub</a></p>
    </div>
  </footer>
</main>

<script>
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Progress bars fill once the page is live; a browser without JS gets them
  // full from the CSS fallback.
  document.querySelectorAll('.bar span').forEach((s) => { if (!s.style.getPropertyValue('--w')) s.style.setProperty('--w', s.style.width); });
  requestAnimationFrame(() => root.classList.add('js-ready'));

  // Count-up on numbers, once, as they scroll in. Never lies about the value:
  // the final number is in the markup before any script runs.
  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (reduce || !Number.isFinite(target) || target === 0) return;
    const start = performance.now(); const ms = 900;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms); const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased).toLocaleString('en-US');
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const seen = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('in');
      e.target.querySelectorAll('[data-count]').forEach((n) => { if (!seen.has(n)) { seen.add(n); countUp(n); } });
      if (e.target.matches('[data-count]') && !seen.has(e.target)) { seen.add(e.target); countUp(e.target); }
    }
  }, { threshold: 0.2 });
  document.querySelectorAll('.reveal, .readout, .stat').forEach((el) => io.observe(el));

  // Which section is on screen lights its nav link.
  const links = [...document.querySelectorAll('.nav ul a')];
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const nav = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.classList.remove('active'));
      byId.get(e.target.id)?.classList.add('active');
    }
  }, { rootMargin: '-40% 0px -55% 0px' });
  document.querySelectorAll('main section[id]').forEach((s) => nav.observe(s));

  // Filter + search over roadmap items. Phases with nothing left to show
  // say so rather than collapsing to an empty box.
  let filter = 'all'; let query = '';
  const chips = document.querySelectorAll('.chip[data-filter]');
  const items = [...document.querySelectorAll('.item')];
  const phases = [...document.querySelectorAll('.phase')];
  phases.forEach((p) => { const n = document.createElement('p'); n.className = 'empty'; n.textContent = 'Nothing in this phase matches.'; p.querySelector('.phase-body').appendChild(n); });
  const apply = () => {
    const q = query.trim().toLowerCase();
    for (const it of items) {
      const okState = filter === 'all' || it.dataset.state === filter;
      const okText = q === '' || it.textContent.toLowerCase().includes(q);
      it.hidden = !(okState && okText);
    }
    for (const p of phases) {
      const visible = p.querySelectorAll('.item:not([hidden])').length;
      p.classList.toggle('filtered-empty', visible === 0);
      if ((filter !== 'all' || q !== '') && visible > 0) p.open = true;
    }
  };
  chips.forEach((c) => c.addEventListener('click', () => {
    filter = c.dataset.filter;
    chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
    apply();
  }));
  document.querySelector('.search').addEventListener('input', (e) => { query = e.target.value; apply(); });

  const toggle = document.querySelector('[data-toggle]');
  toggle.addEventListener('click', () => {
    const expand = toggle.dataset.toggle === 'expand';
    phases.forEach((p) => { p.open = expand; });
    toggle.dataset.toggle = expand ? 'collapse' : 'expand';
    toggle.textContent = expand ? 'Collapse all' : 'Expand all';
  });

  // Deep links to #phase-N open the phase they point at.
  const openHash = () => { const el = document.querySelector(location.hash || '#none'); if (el?.classList.contains('phase')) el.open = true; };
  addEventListener('hashchange', openHash); openHash();
})();
</script>
</body>
</html>
`;
}
