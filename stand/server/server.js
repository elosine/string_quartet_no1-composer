#!/usr/bin/env node
// server.js — THE SERVER (PLAN 9g; DESIGN §1–§5, §8–§9; AR-1, 5, 9, 10, 13, 54,
// 55, 57, 58, 59). One Node process: Socket.IO (WebSocket only) + static files.
//
//   node server/server.js                      -> http://localhost:5302  (and every LAN address)
//   node server/server.js --port 5302 --data server/data
//   node server/server.js --spare snapshot.json   the HOT SPARE on a venue laptop (AR-58):
//                                                 the leader's registry snapshot, the same
//                                                 tokens, this machine's clock
//
// What it serves:
//   /health                       for the deploy script and PM2 — { ok, uptimeS, ... }
//   /api/time                     the clock the stands sync to (the kit's shape: s, t, n)
//   /api/info                     LAN addresses (the spare's podium QR reads this), uptime
//   /api/snapshot?token=<gk>      the registry snapshot — "save a spare copy" (gatekeeper token)
//   /s/<token>                    THE DOOR: the stand page for that link (DESIGN §8)
//   /p/N                          the stand on part N with no room (development)
//   /admin/*                      the admin API behind the admin key (header x-admin-key)
//   /notation/** /testkit/js/**   the stand's static files (the page, the room client, the clock module)
//   /films/**                     [sq1] the part films and the full score film (mp4, served with Range)
//   /api/composer/load/<name>     the score file the stand draws from (read-only)
//   /socket.io/socket.io.js       the client library
//
// The clock is raw monotonic (clock.js). The registry is one JSON file in the
// data folder (registry.js); marks one file per token (marks.js). node_modules
// never in git; deploy.sh installs them on the box.

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { Server } = require('socket.io');

const clock = require('./clock');
const { makeRegistry } = require('./registry');
const { makeRooms } = require('./rooms');
const { makeMarks } = require('./marks');
const { makeLimiter } = require('./ratelimit');
const { attachProtocol } = require('./protocol');

// ---- arguments --------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, dflt) => { const i = argv.indexOf(name); return i >= 0 && argv[i + 1] != null ? argv[i + 1] : dflt; };
const ROOT = path.join(__dirname, '..');
const PORT = parseInt(arg('--port', process.env.PORT || '5302'), 10);   // [port sq1] the quartet's port (the tubas 5300, the septet 5301)
const DATA = path.resolve(ROOT, arg('--data', process.env.DATA_DIR || path.join('server', 'data')));
const SPARE = arg('--spare', null);
const IDLE_MS = parseInt(arg('--idle-ms', process.env.REHEARSAL_IDLE_MS || String(30 * 60 * 1000)), 10);
const QUIET = argv.includes('--quiet');
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const ORIGIN = process.env.PUBLIC_ORIGIN || '';   // e.g. https://stand.example.org — the links the gatekeeper page prints

const log = msg => { if (!QUIET) console.log(new Date().toISOString().slice(11, 19) + ' ' + msg); };

// ---- the admin key (AR-1: the composer is the sole admin) -----------------------------
fs.mkdirSync(DATA, { recursive: true });
let ADMIN_KEY = process.env.ADMIN_KEY || '';
if (!ADMIN_KEY) {
  const keyFile = path.join(DATA, 'admin.key');
  if (fs.existsSync(keyFile)) ADMIN_KEY = fs.readFileSync(keyFile, 'utf8').trim();
  else { ADMIN_KEY = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(keyFile, ADMIN_KEY + '\n'); log('admin key generated → ' + keyFile); }
}

// ---- the data --------------------------------------------------------------------------
const registry = makeRegistry(path.join(DATA, 'registry.json'), { root: ROOT });
if (SPARE) {
  registry.loadSnapshot(JSON.parse(fs.readFileSync(path.resolve(SPARE), 'utf8')));
  log('SPARE: registry from ' + SPARE + ' (' + Object.keys(registry.ensembles).length + ' ensembles)');
} else if (registry.load()) {
  log('registry: ' + Object.keys(registry.pieces).length + ' pieces, ' + Object.keys(registry.ensembles).length + ' ensembles');
} else {
  log('registry: empty (register a piece and create an ensemble: tools/admin.js)');
}
const marks = makeMarks(path.join(DATA, 'marks'));

// ---- http ---------------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json', '.md': 'text/markdown; charset=utf-8',
};
const STATIC_PREFIXES = ['/notation/', '/testkit/js/', '/films/'];
const APP_DIR = path.join(ROOT, 'notation', 'app');
const SCORES_DIR = path.join(ROOT, 'scores');

const httpLimiter = makeLimiter({ burst: 60, perMin: 120 });
const adminLimiter = makeLimiter({ burst: 30, perMin: 60 });

function send(res, code, body, type) {
  res.writeHead(code, { 'Content-Type': type || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('too large')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
function ipOf(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return String(req.headers['x-forwarded-for']).split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}
// The origin the links are printed with: PUBLIC_ORIGIN if set, else the request's
// own host — behind nginx (TRUST_PROXY) with its forwarded scheme, so the box
// needs no domain setting at all.
function originOf(headers) {
  if (ORIGIN) return ORIGIN;
  const proto = (TRUST_PROXY && headers['x-forwarded-proto']) || 'http';
  return proto + '://' + (headers.host || ('localhost:' + PORT));
}
function lanUrls() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) if (a.family === 'IPv4' && !a.internal) out.push('http://' + a.address + ':' + PORT + '/');
  }
  return out;
}

// Static files with HTTP Range (Safari requires Range before it plays a video).
function serveFile(req, res, file) {
  fs.stat(file, (e, st) => {
    if (e || !st.isFile()) return send(res, 404, { error: 'not found' });
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const size = st.size;
    const base = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const range = req.headers.range;
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] !== '' ? parseInt(m[1], 10) : 0;
      let end = m && m[2] !== '' ? parseInt(m[2], 10) : size - 1;
      if (m && m[1] === '' && m[2] !== '') { start = Math.max(0, size - parseInt(m[2], 10)); end = size - 1; }
      if (start >= size || end < start) { res.writeHead(416, { 'Content-Range': 'bytes */' + size }); return res.end(); }
      end = Math.min(end, size - 1);
      res.writeHead(206, Object.assign(base, { 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': end - start + 1 }));
      if (req.method === 'HEAD') return res.end();
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(200, Object.assign(base, { 'Content-Length': size }));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  });
}
// Only the stand's folders are reachable, checked on the RESOLVED path (a
// `%2e%2e` that decodes to `..` must not climb out of them — the registry
// with every token lives in this same repository).
const STATIC_DIRS = STATIC_PREFIXES.map(p => path.resolve(ROOT, '.' + p) + path.sep);
function serveStatic(req, res, urlPath) {
  let rel;
  try { rel = decodeURIComponent(urlPath); } catch (e) { return send(res, 400, { error: 'bad path' }); }
  if (!STATIC_PREFIXES.some(p => rel.startsWith(p))) return send(res, 404, { error: 'not found' });
  const file = path.resolve(ROOT, '.' + rel);
  if (!STATIC_DIRS.some(d => file.startsWith(d))) return send(res, 403, { error: 'forbidden' });
  serveFile(req, res, file);
}

// ---- [sq1] THE LINK SHEET: every ensemble's links, a QR code each (behind the admin key) ----
// Opened on this machine as localhost, the links are printed with the LAN address
// instead, so a tablet on the same Wi-Fi can scan them.
let QR = null;
try { QR = require('qrcode'); } catch (e) { QR = null; }
const escHtml = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
async function linkSheet(origin) {
  if (/\/\/(localhost|127\.0\.0\.1)(:|$)/.test(origin)) {
    // the home network first (192.168.x, then 172.16–31.x); a 10.x address is often a VPN's, which a tablet cannot reach
    const rank = u => (/\/\/192\.168\./.test(u) ? 0 : /\/\/172\.(1[6-9]|2\d|3[01])\./.test(u) ? 1 : 2);
    const lan = lanUrls().sort((a, b) => rank(a) - rank(b))[0];
    if (lan) origin = lan.replace(/\/$/, '');
  }
  const cards = [];
  for (const ens of Object.values(registry.ensembles)) {
    const P = registry.pieces[ens.piece];
    const view = registry.gatekeeperView(ens, origin);
    const items = view.rows.map(r => ({ label: r.part + (r.name ? ' — ' + r.name : ''), link: r.link }))
      .concat([{ label: 'Full score', link: view.gatekeeperLink }]);
    let html = '<section><h2>' + escHtml((P ? P.title : ens.piece) + ' — ' + ens.name) + '</h2><div class="grid">';
    for (const it of items) {
      const svg = QR ? await QR.toString(it.link, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : '';
      html += '<div class="card"><h3>' + escHtml(it.label) + '</h3>' + svg + '<a href="' + escHtml(it.link) + '">' + escHtml(it.link) + '</a></div>';
    }
    cards.push(html + '</div></section>');
  }
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Links</title><style>' +
    'body{font:16px/1.4 -apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:32px;color:#111;background:#fff}h1{font-weight:300;font-size:30px;margin:0 0 4px}' +
    'p.note{color:#666;margin:0 0 28px}h2{font-size:20px;margin:28px 0 14px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:20px}' +
    '.card{border:1px solid #ccc;border-radius:10px;padding:14px;text-align:center;break-inside:avoid}.card h3{margin:0 0 8px;font-size:20px}.card svg{width:100%;height:auto;max-width:240px}' +
    '.card a{display:block;font-size:10px;color:#555;word-break:break-all;margin-top:6px;text-decoration:none}@media print{body{margin:12mm}}' +
    '</style></head><body><h1>Links</h1><p class="note">One link per player. Point the tablet\'s camera at the code, or type the address. ' +
    (QR ? '' : '(The QR library is not installed: run npm install.) ') + 'Keep this page private: a link is a key.</p>' +
    (cards.join('') || '<p>No ensemble yet.</p>') + '</body></html>';
}

// ---- the admin API (AR-1): behind the key; the admin page of 9n talks to this -------------
async function admin(req, res, u) {
  const key = req.headers['x-admin-key'] || u.searchParams.get('key') || '';
  if (!adminLimiter.allow(ipOf(req))) return send(res, 429, { ok: false, error: 'rate' });
  if (!key || key.length !== ADMIN_KEY.length || !crypto.timingSafeEqual(Buffer.from(key), Buffer.from(ADMIN_KEY))) return send(res, 401, { ok: false, error: 'admin key' });
  const op = u.pathname.slice('/admin/'.length);
  const body = req.method === 'POST' ? JSON.parse((await readBody(req, 1048576)) || '{}') : {};
  const origin = originOf(req.headers);
  try {
    if (op === 'piece.register' && req.method === 'POST') return send(res, 200, { ok: true, piece: registry.registerPiece(body) });
    if (op === 'ensemble.create' && req.method === 'POST') return send(res, 200, { ok: true, ensemble: registry.gatekeeperView(registry.createEnsemble(body), origin) });
    if (op === 'parts.set' && req.method === 'POST') return send(res, 200, { ok: true, ensemble: registry.gatekeeperView(registry.setParts(body.ensembleId, body.rows), origin) });
    if (op === 'row.add' && req.method === 'POST') return send(res, 200, { ok: true, ensemble: registry.gatekeeperView(registry.addRow(body.ensembleId, body.partIndex), origin) });
    if (op === 'token.reissue' && req.method === 'POST') return send(res, 200, { ok: true, ensemble: registry.gatekeeperView(registry.reissue(body.ensembleId, body.which || body.rowId), origin) });
    if (op === 'mode.set' && req.method === 'POST') {
      const ens = registry.setMode(body.ensembleId, body.mode);
      io.to('ens:' + ens.id).emit('mode', { mode: ens.mode, roomState: ens.tuple, serverTime: clock.now() });
      return send(res, 200, { ok: true, mode: ens.mode });
    }
    if (op === 'piece.letters' && req.method === 'POST') return send(res, 200, { ok: true, piece: registry.setLetters(body.id, body.letters) });   // 9i: the rehearsal letters
    if (op === 'pieces') return send(res, 200, { ok: true, pieces: Object.values(registry.pieces).map(registry.publicPiece) });
    if (op === 'ensembles') return send(res, 200, { ok: true, ensembles: Object.values(registry.ensembles).map(e => Object.assign(registry.publicEnsemble(e), { gatekeeperLink: origin + '/s/' + e.gatekeeper, live: rooms.roster(e.id).members.length })) });
    if (op.startsWith('ensemble/')) return send(res, 200, { ok: true, ensemble: registry.gatekeeperView(registry.ensembleOf(op.slice('ensemble/'.length)), origin), roster: rooms.roster(op.slice('ensemble/'.length)) });
    if (op === 'snapshot') return send(res, 200, registry.snapshot());
    if (op === 'sheet') return send(res, 200, await linkSheet(origin), 'text/html; charset=utf-8');   // [sq1] the links, a QR each
    return send(res, 404, { ok: false, error: 'no such admin op: ' + op });
  } catch (e) {
    return send(res, 400, { ok: false, error: e.message });
  }
}

const started = Date.now();
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;
  try {
    if (p === '/api/time') {
      // stamped as late as possible — everything above is before the clock is read
      const t = clock.now();
      return send(res, 200, '{"s":' + t.toFixed(3) + ',"t":' + t.toFixed(3) + ',"n":' + JSON.stringify(u.searchParams.get('n') || '') + '}');
    }
    if (p === '/health') {
      return send(res, 200, { ok: true, uptimeS: Math.round((Date.now() - started) / 1000), spare: !!SPARE, pieces: Object.keys(registry.pieces).length, ensembles: Object.keys(registry.ensembles).length, connections: io.engine.clientsCount, clock: 'monotonic', port: PORT });
    }
    if (p === '/api/info') return send(res, 200, { port: PORT, lan: lanUrls(), spare: !!SPARE, uptimeS: Math.round((Date.now() - started) / 1000), clock: 'monotonic (process.hrtime), epoch-anchored at start', serverTime: clock.now() });
    if (p === '/api/snapshot') {
      if (!httpLimiter.allow(ipOf(req))) return send(res, 429, { error: 'rate' });
      const r = registry.resolveToken(u.searchParams.get('token') || '');
      if (!r || r.revoked || r.role !== 'gatekeeper') return send(res, 403, { error: 'gatekeeper token required' });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="spare-' + r.ensemble.id + '.json"', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(registry.snapshot(), null, 1));
    }
    if (p.startsWith('/admin/')) return admin(req, res, u);

    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'method' });

    // THE DOOR: /s/<token> → the stand page; the page reads the token from its
    // own path and says hello (9h-2). Its sibling files (manifest, icon) resolve
    // under /s/ too, so the relative links in the page keep working.
    const mS = /^\/s\/([A-Za-z0-9_-]{8,64})$/.exec(p);
    if (mS) {
      if (!httpLimiter.allow(ipOf(req))) return send(res, 429, { error: 'rate' });
      const r = registry.resolveToken(mS[1]);
      if (!r) return send(res, 404, '<!doctype html><meta charset="utf-8"><title>Unknown link</title><p style="font:20px system-ui;margin:2em">This link is not known here.', 'text/html; charset=utf-8');
      if (r.revoked) return send(res, 410, '<!doctype html><meta charset="utf-8"><title>Link replaced</title><p style="font:20px system-ui;margin:2em">This link was replaced — ask your leader for a new link.', 'text/html; charset=utf-8');
      // 9i (AR-6, 31, 32): the gatekeeper's link opens on the REMOTE; with
      // ?view=display it is the display (the full score). A player's link is
      // the part; a ticked leader's with ?view=remote is the remote on a second
      // device. The page says hello and learns its role; the server only picks the file.
      // [sq1] one page for every link: a player's link is their part's film, the
      // gatekeeper's is the full score film; the page learns which from the welcome.
      return serveFile(req, res, path.join(APP_DIR, 'film.html'));
    }
    const mSFile = /^\/s\/([A-Za-z0-9_.-]+\.[a-z0-9]+)$/.exec(p);
    if (mSFile) return serveFile(req, res, path.join(APP_DIR, path.basename(mSFile[1])));
    const mPart = /^\/p\/(\d{1,2})$/.exec(p);
    if (mPart) { res.writeHead(302, { Location: '/notation/app/film.html?part=' + mPart[1] }); return res.end(); }

    if (p.startsWith('/api/composer/load/')) {
      const name = String(p.slice('/api/composer/load/'.length)).replace(/[^a-zA-Z0-9_-]/g, '_');
      const file = path.join(SCORES_DIR, name + '.json');
      if (!fs.existsSync(file)) return send(res, 404, { success: false, error: 'Score not found' });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' });
      return res.end('{"success":true,"data":' + fs.readFileSync(file, 'utf8') + '}');
    }
    if (p === '/' ) return send(res, 200, '<!doctype html><meta charset="utf-8"><title>stand server</title><p style="font:16px system-ui;margin:2em">stand server · <a href="/health">/health</a> · open your link: /s/&lt;token&gt;', 'text/html; charset=utf-8');
    return serveStatic(req, res, p);
  } catch (e) {
    send(res, 500, { error: String(e && e.message || e) });
  }
});
server.keepAliveTimeout = 65000;

// ---- the socket ----------------------------------------------------------------------------
const io = new Server(server, {
  transports: ['websocket'],         // WebSocket only (AR-54)
  serveClient: true,
  pingInterval: 10000, pingTimeout: 20000,
  maxHttpBufferSize: 1048576,
  cors: { origin: true },
});
const rooms = makeRooms(registry, {
  idleMs: IDLE_MS,
  onModeFallback: ensId => { log('REHEARSAL → ALONE after ' + Math.round(IDLE_MS / 60000) + ' empty minutes: ' + ensId); io.to('ens:' + ensId).emit('mode', { mode: 'ALONE', roomState: null, serverTime: clock.now() }); },
});
attachProtocol(io, {
  registry, rooms, marks, log, spare: !!SPARE, trustProxy: TRUST_PROXY, originOf,
  limiters: { hello: makeLimiter({ burst: 20, perMin: 30 }), sectional: makeLimiter({ burst: 10, perMin: 10 }) },
});

server.listen(PORT, '0.0.0.0', () => {
  log('stand server' + (SPARE ? ' (SPARE)' : '') + ': http://localhost:' + PORT + '/');
  for (const l of lanUrls()) log('     LAN: ' + l);
  if (process.send) process.send({ ready: true, port: PORT });
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { try { registry.saveNow(); } catch (e) { /* nothing to save */ } process.exit(0); });
