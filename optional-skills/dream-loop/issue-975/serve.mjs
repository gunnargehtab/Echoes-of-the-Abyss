import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';
import { readArchive } from './archive.mjs';

const SCENE_MODULES = ['engine', 'tex', 'main', 'life', 'models'];
const HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'",
};

export async function createPreviewServer() {
  const archive = await readArchive();
  const files = new Map([
    ['/', ['index.html', 'text/html; charset=utf-8']],
    ['/index.html', ['index.html', 'text/html; charset=utf-8']],
    ['/boot.mjs', ['boot.mjs', 'text/javascript; charset=utf-8']],
    ['/viewer.mjs', ['viewer.mjs', 'text/javascript; charset=utf-8']],
    ['/geometry.mjs', ['geometry.mjs', 'text/javascript; charset=utf-8']],
  ]);
  for (const name of SCENE_MODULES) {
    files.set(`/${name}.mjs`, [`${name}.mjs`, 'text/javascript; charset=utf-8']);
  }
  return createServer(async (request, response) => {
    const send = (status, type, body) => {
      response.writeHead(status, { ...HEADERS, 'Content-Type': type });
      response.end(request.method === 'HEAD' ? undefined : body);
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      send(405, 'text/plain', 'Method not allowed');
      return;
    }
    try {
      const pathname = new URL(request.url, 'http://127.0.0.1').pathname;
      if (pathname === '/favicon.ico') {
        send(204, 'image/x-icon', '');
        return;
      }
      if (pathname === '/vendor/three.mjs' || pathname === '/vendor/three-core.mjs') {
        send(
          200,
          'text/javascript; charset=utf-8',
          archive.get(pathname.endsWith('three-core.mjs') ? 'threeCore' : 'three')
        );
        return;
      }
      if (pathname === '/reference/' || pathname === '/reference/index.html') {
        const html = await readFile(new URL('./prototype/index.html', import.meta.url), 'utf8');
        send(200, 'text/html; charset=utf-8', html.replaceAll('href="./', 'href="/'));
        return;
      }
      if (pathname.startsWith('/reference/')) {
        const name = pathname.slice('/reference/'.length).replace(/\.mjs$/, '');
        if (SCENE_MODULES.includes(name)) {
          send(200, 'text/javascript; charset=utf-8', archive.get(name));
          return;
        }
        if (name === 'boot') {
          send(
            200,
            'text/javascript; charset=utf-8',
            await readFile(new URL('./prototype/boot.mjs', import.meta.url))
          );
          return;
        }
      }
      const file = files.get(pathname);
      if (!file) {
        send(404, 'text/plain', 'Not found');
        return;
      }
      send(200, file[1], await readFile(new URL(`./prototype/${file[0]}`, import.meta.url)));
    } catch (error) {
      console.error('Preview request failed:', error);
      send(500, 'text/plain', 'Preview request failed; see server output');
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: { port: { type: 'string', default: '4175' } } });
  const port = Number(values.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
  const server = await createPreviewServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Key-art prototype: http://127.0.0.1:${port}`);
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => server.close());
  }
}
