// Contract check for the "Something went wrong" crash (ai-debug, 2026-08-28).
//
// Fails when:
//  1. getScriptAndInfo returns a second reader (readInfo) over the same
//     single-consumption SDK stream -> the process dies with an unhandled
//     rejection "Cannot iterate over a consumed stream".
//  2. readData swallows a mid-stream SSE error and its promise never
//     settles (the "hangs forever, then says nothing" symptom).
//
// Run: node scripts/stream-consume.check.mjs   (offline, deterministic)
import http from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const jiti = require('jiti')(process.cwd() + '/entry.js', {
  interopDefault: true,
});
const { getScriptAndInfo } = jiti('./src/helpers/completion.ts');

// The check runs with non-TTY stdin; readData's setRawMode(true) would throw
// for the wrong reason there. Real runs have a TTY. Neutralise it here.
if (!process.stdin.isTTY) {
  process.stdin.setRawMode = () => process.stdin;
}

// Watchdog: the pre-fix code hangs on `await readScript` under some stdin
// setups; never let the check itself hang.
setTimeout(() => {
  console.error('FAIL: overall timeout (a read promise never settled)');
  process.exit(1);
}, 25000).unref();

let requests = 0;
const sse = (res, events) => {
  res.writeHead(200, {
    'content-type': 'text/event-stream',
    'transfer-encoding': 'chunked',
  });
  for (const e of events) res.write(`data: ${JSON.stringify(e)}\n\n`);
  res.write('data: [DONE]\n\n');
  res.end();
};
const contentChunk = (content) => ({
  id: 'c1',
  object: 'chat.completion.chunk',
  created: 0,
  model: 'fake',
  choices: [{ index: 0, delta: { content }, finish_reason: null }],
});

const server = http.createServer((req, res) => {
  requests++;
  const path = new URL(req.url, 'http://x').pathname;
  req.resume();
  req.on('end', () => {
    if (path.endsWith('/err/v1/chat/completions')) {
      // Valid SSE response carrying an error payload (what providers do when
      // the model call fails after the stream has opened).
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      res.write(`data: ${JSON.stringify({ error: { message: 'boom' } })}\n\n`);
      res.end();
      return;
    }
    sse(res, [
      contentChunk('```bash\n'),
      contentChunk('echo hello\n'),
      contentChunk('```'),
    ]);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const unhandled = [];
process.on('unhandledRejection', (e) => unhandled.push(e));

const withTimeout = (p, ms, label) =>
  Promise.race([
    p.then(
      (v) => ({ ok: true, v }),
      (e) => ({ ok: false, e })
    ),
    new Promise((r) => setTimeout(() => r({ timeout: true, label }), ms)),
  ]);

const args = {
  prompt: 'say hello',
  key: 'sk-fake',
  model: 'fake',
  apiEndpoint: `${base}/v1`,
};

// --- Case 1: the script stream must be consumed exactly once, no ghosts ---
const readers = await getScriptAndInfo(args);
const script = await readers.readScript(() => {});

const ghost =
  typeof readers.readInfo === 'function'
    ? await withTimeout(
        Promise.race([
          readers
            .readInfo(() => {})
            .then((v) => `resolved:${JSON.stringify(v)}`),
          new Promise((r) => setTimeout(() => r('HUNG'), 2000)),
        ]),
        2500,
        'readInfo'
      )
    : { ok: true, v: 'absent' };

// Give any rejection from the shared stream a tick to surface.
await new Promise((r) => setTimeout(r, 100));
if (ghost.timeout) {
  console.error('FAIL: readInfo hung instead of finishing');
}
if (unhandled.length) {
  console.error(
    'FAIL: unhandled rejection(s):',
    unhandled.map((e) => e?.message ?? String(e)).join(' | ')
  );
}

// --- Case 2: a mid-stream error must reject the read promise, not hang ---
const errReaders = await getScriptAndInfo({
  ...args,
  apiEndpoint: `${base}/err/v1`,
});
const errResult = await withTimeout(
  errReaders.readScript(() => {}),
  2000,
  'readScript-on-error-stream'
);
if (errResult.timeout) {
  console.error(
    `FAIL: ${errResult.label} never settled (hang on mid-stream error)`
  );
}

server.close();
const pass =
  script.trim() === 'echo hello' &&
  !unhandled.length &&
  !ghost.timeout &&
  ghost.v === 'absent' &&
  !errResult.timeout &&
  errResult.ok === false;
console.log(
  pass
    ? 'PASS: stream consumed once, errors surface, no unhandled rejections'
    : 'FAIL (see above)'
);
process.exit(pass ? 0 : 1);
