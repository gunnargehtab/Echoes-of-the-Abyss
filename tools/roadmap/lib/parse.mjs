/**
 * Read the roadmap site's content out of `docs/ROADMAP.md`.
 *
 * Deliberately a small, strict parser rather than a markdown library: it
 * reads exactly the shapes that document already uses and ignores anything it
 * does not recognise rather than guessing. A generator that silently invented
 * structure from prose would put things on a public page that nobody wrote.
 *
 * The shapes it knows, all of them already in the doc:
 *
 * - `## Phase N — Title`, then rows of `| description | [#123](url) |`. A
 *   `**Group label**` paragraph between two tables inside a phase names the
 *   group the rows after it belong to (Phase 10 uses this).
 * - `**Closed.**` / `**Three of four closed.**` as the first bold words of a
 *   phase's opening paragraph, kept as the phase's own verdict on itself.
 * - `## Where the build actually stands`: a `| Question | Reading | Tracked |`
 *   table, and the `- **Lead** — rest` bullets that list what is built.
 * - `## Completed — Sprint N (date)`: heading plus its first paragraph.
 * - `## Sequencing notes`: the numbered list, `**lead** rest` per item.
 *
 * Everything returned is still markdown-flavoured text; `inline()` in
 * render.mjs is what turns it into HTML.
 */

const ISSUE_LINK = /\[#(\d+)\]\(([^)]+)\)/;

/** Split a table row into trimmed cells, or null if the line is not a row. */
function cells(line) {
  if (!line.startsWith('|')) return null;
  const parts = line
    .split('|')
    .slice(1, -1)
    .map((cell) => cell.trim());
  // A separator row is all dashes and colons.
  if (parts.every((cell) => /^:?-+:?$/.test(cell))) return null;
  return parts;
}

/** Group the document into H2 sections: `{ heading, lines }`. */
function sections(markdown) {
  const out = [];
  let current = null;
  for (const line of markdown.split('\n')) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading !== null) {
      current = { heading: heading[1], lines: [] };
      out.push(current);
      continue;
    }
    if (current !== null) current.lines.push(line);
  }
  return out;
}

/** Paragraphs of a section: blank-line-separated runs, joined with spaces. */
function paragraphs(lines) {
  const out = [];
  let buffer = [];
  for (const line of lines) {
    if (line.trim() === '') {
      if (buffer.length > 0) out.push(buffer.join(' '));
      buffer = [];
      continue;
    }
    buffer.push(line.trim());
  }
  if (buffer.length > 0) out.push(buffer.join(' '));
  return out;
}

function parsePhase(section) {
  const heading = /^(Phase\s+\d+)\s+—\s+(.+)$/.exec(section.heading);
  if (heading === null) return null;

  const phase = {
    id: heading[1],
    number: Number(heading[1].replace(/\D/g, '')),
    title: heading[2],
    verdict: null,
    summary: null,
    groups: [],
    items: [],
  };

  let group = null;
  for (const line of section.lines) {
    const row = cells(line);
    if (row !== null) {
      if (row.length < 2) continue;
      const issue = ISSUE_LINK.exec(row[1] ?? '');
      if (issue === null) continue;
      phase.items.push({ work: row[0] ?? '', number: Number(issue[1]), group });
      continue;
    }
    // `**Performance and netcode**` on its own line names the group the rows
    // after it belong to. A bold *sentence* is prose, not a label.
    const label = /^\*\*([^*]+)\*\*\s*$/.exec(line.trim());
    if (label !== null && !/[.!?]$/.test(label[1].trim())) {
      group = label[1].trim();
      phase.groups.push(group);
    }
  }

  // The first paragraph before the table is the phase's own account of
  // itself, and its leading bold words — "Closed.", "Three of four closed." —
  // are the verdict the doc passes on the phase.
  const tableAt = section.lines.findIndex((line) => cells(line) !== null);
  const preface = paragraphs(tableAt === -1 ? section.lines : section.lines.slice(0, tableAt));
  // A bold-only paragraph is a group label unless it ends in a full stop,
  // in which case it is the verdict standing alone ("**Closed.**").
  const opening = preface.find((p) => !/^\*\*[^*]+\*\*$/.test(p) || /\.\*\*$/.test(p)) ?? null;
  if (opening !== null) {
    const verdict = /^\*\*([^*]+?)\*\*\s*(.*)$/.exec(opening);
    if (verdict !== null && /\.$/.test(verdict[1])) {
      phase.verdict = verdict[1].replace(/\.$/, '');
      phase.summary =
        verdict[2] === ''
          ? (preface.find((p) => p !== opening && !/^\*\*[^*]+\*\*$/.test(p)) ?? null)
          : verdict[2];
    } else {
      phase.summary = opening;
    }
  }

  return phase.items.length > 0 ? phase : null;
}

function parseStanding(section) {
  const questions = [];
  const built = [];
  let inTable = false;
  for (const line of section.lines) {
    const row = cells(line);
    if (row !== null) {
      if (row[0] === 'Question') {
        inTable = true;
        continue;
      }
      if (inTable && row.length >= 3) {
        const issue = ISSUE_LINK.exec(row[2]);
        questions.push({
          question: row[0],
          reading: row[1],
          number: issue === null ? null : Number(issue[1]),
        });
      }
      continue;
    }
    if (line.startsWith('|') === false) inTable = false;
  }

  // `- **the Echo Layer** resolving per player…` — one bullet per built thing,
  // possibly wrapped over several lines.
  const bullets = [];
  let current = null;
  for (const line of section.lines) {
    if (/^- /.test(line)) {
      current = [line.slice(2).trim()];
      bullets.push(current);
    } else if (current !== null && /^\s+\S/.test(line)) {
      current.push(line.trim());
    } else {
      current = null;
    }
  }
  for (const bullet of bullets) {
    const text = bullet.join(' ');
    // "the **Echo Layer** resolving…" — the article before the bold lead is
    // the sentence's, not the name's.
    const lead = /^(?:(?:the|a|an)\s+)?\*\*([^*]+)\*\*\s*(?:—\s*)?(.*)$/i.exec(text);
    if (lead === null) continue;
    built.push({ lead: lead[1].trim(), detail: lead[2].trim().replace(/;$|\.$/, '') });
  }

  const intro = paragraphs(section.lines).find((p) => !p.startsWith('|') && !p.startsWith('- '));
  return { intro: intro ?? '', questions, built };
}

function parseSprint(section) {
  const heading = /^Completed\s+—\s+(Sprint\s+\d+)\s*\((.+?)\)\s*$/.exec(section.heading);
  if (heading === null) return null;
  const [summary] = paragraphs(section.lines);
  return { id: heading[1], when: heading[2], summary: summary ?? '' };
}

function parseSequencing(section) {
  const notes = [];
  let current = null;
  for (const line of section.lines) {
    const start = /^\d+\.\s+(.*)$/.exec(line);
    if (start !== null) {
      current = [start[1].trim()];
      notes.push(current);
    } else if (current !== null && /^\s+\S/.test(line)) {
      current.push(line.trim());
    } else {
      current = null;
    }
  }
  return notes
    .map((parts) => parts.join(' '))
    .map((text) => {
      const lead = /^\*\*(.+?)\*\*\s*(.*)$/.exec(text);
      return lead === null ? { lead: null, detail: text } : { lead: lead[1], detail: lead[2] };
    });
}

export function parseRoadmap(markdown) {
  const all = sections(markdown);
  const phases = all.map(parsePhase).filter((phase) => phase !== null);
  const standingSection = all.find((s) => /^Where the build actually stands/.test(s.heading));
  const sequencingSection = all.find((s) => /^Sequencing notes/.test(s.heading));
  return {
    phases,
    standing: standingSection
      ? parseStanding(standingSection)
      : { intro: '', questions: [], built: [] },
    sprints: all.map(parseSprint).filter((sprint) => sprint !== null),
    sequencing: sequencingSection ? parseSequencing(sequencingSection) : [],
  };
}
