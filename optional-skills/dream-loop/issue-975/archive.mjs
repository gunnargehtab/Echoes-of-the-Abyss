import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';

export const TARGET_HTML = new URL('./target.html', import.meta.url);
export const RESOURCE_NAMES = ['engine', 'tex', 'main', 'life', 'models', 'three', 'threeCore'];

/** Read the supplied export as data; never evaluate its unpacker in Node. */
export async function readArchive(file = TARGET_HTML) {
  const html = await readFile(file, 'utf8');
  const island = (name) => {
    const match = html.match(new RegExp(`<script type="__bundler/${name}">([\\s\\S]*?)</script>`));
    if (!match) throw new Error(`Missing export island: ${name}`);
    return JSON.parse(match[1]);
  };
  const manifest = island('manifest');
  const resources = new Map();
  for (const { id, uuid } of island('ext_resources')) {
    if (!RESOURCE_NAMES.includes(id) || resources.has(id)) {
      throw new Error(`Unexpected or duplicate export resource: ${id}`);
    }
    const entry = manifest[uuid];
    if (entry?.mime !== 'application/javascript' || typeof entry.data !== 'string') {
      throw new Error(`Missing JavaScript export resource: ${id}`);
    }
    const bytes = Buffer.from(entry.data, 'base64');
    resources.set(
      id,
      (entry.compressed ? gunzipSync(bytes, { maxOutputLength: 4_000_000 }) : bytes).toString(
        'utf8'
      )
    );
  }
  if (resources.size !== RESOURCE_NAMES.length) {
    throw new Error('The export does not contain all seven scene modules');
  }
  return resources;
}
