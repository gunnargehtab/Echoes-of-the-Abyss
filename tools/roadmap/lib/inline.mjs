/**
 * A file as a data URI, for the single-file build.
 *
 * A claude.ai artifact is one page: relative links do not resolve, and its
 * content policy refuses external images. And a Routine republishes the
 * private cut unattended only when the publish is the page alone. So that
 * cut carries its font, icon and pictures inside the page.
 *
 * Base64 for every type, SVG included: the URI is written into an attribute,
 * and an SVG's own quotes would end it.
 */

import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

const TYPES = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** `bytes` as a data URI of the type `name`'s extension names. */
export function dataUri(name, bytes) {
  const type = TYPES[extname(name).toLowerCase()];
  if (type === undefined) throw new Error(`No data-URI type for ${name}`);
  return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
}

/** The file at `path` as a data URI. */
export const fileUri = (path) => dataUri(path, readFileSync(path));

/**
 * A built page in the shape a claude.ai artifact takes. The viewer wraps the
 * published file in its own doctype, head and body, so the page gives up its
 * own and keeps the rest; and the gallery names it by its `<title>`, which
 * there is a name and not a caption. Each tag must appear exactly once, so a
 * change to the page's skeleton fails here rather than shipping a page nested
 * in a page.
 */
export function artifactPage(html, title) {
  const strip = [
    /<!doctype html>\n/i,
    /<html[^>]*>\n/,
    /<head>\n/,
    /<meta charset="[^"]*">\n/,
    /<meta name="viewport"[^>]*>\n/,
    /<\/head>\n/,
    /<body[^>]*>\n/,
    /<\/body>\n/,
    /<\/html>\n?/,
  ];
  let page = html;
  for (const tag of [...strip, /<title>[^<]*<\/title>/]) {
    const found = page.match(new RegExp(tag.source, `g${tag.flags}`)) ?? [];
    if (found.length !== 1)
      throw new Error(`Expected one ${tag} in the page, found ${found.length}`);
  }
  for (const tag of strip) page = page.replace(tag, '');
  const safe = title.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return page.replace(/<title>[^<]*<\/title>/, `<title>${safe}</title>`);
}
