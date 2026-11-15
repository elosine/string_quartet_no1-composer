#!/usr/bin/env node
// shell_check.js — the film stand's shell, proved end to end on a private port.
//
//   node stand/tools/shell_check.js
//
// Starts its own server (port 5399, a scratch data folder, removed after), then:
// registers the piece from stand/piece.json · creates an ensemble · four players
// and the gatekeeper say hello · EVERY player moves the room (play, stop, jump)
// and every stand hears each new state · a film is served with Range.
// It never touches the real server's data (stand/server/data).

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io } = require('socket.io-client');

const STAND = path.join(__dirname, '..');
const PORT = 5399;
const BASE = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sq1-stand-check-'));

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log('  ok    ' + name); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function admin(key, op, body) {
  const r = await fetch(BASE + '/admin/' + op, { method: body ? 'POST' : 'GET', headers: { 'x-admin-key': key, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

function stand(token) {
  return new Promise((resolve, reject) => {
    const s = io(BASE, { transports: ['websocket'], forceNew: true });
    const st = { socket: s, welcome: null, states: [], refused: [] };
    s.on('state', t => st.states.push(t));
    s.on('refused', r => st.refused.push(r));
    s.on('connect_error', reject);
    s.on('connect', () => s.emit('hello', { token }, w => { st.welcome = w; resolve(st); }));
  });
}
const send = (st, req) => new Promise(resolve => st.socket.emit('state', req, resolve));

(async () => {
  const server = spawn(process.execPath, [path.join(STAND, 'server', 'server.js'), '--port', String(PORT), '--data', DATA, '--quiet'], { stdio: ['ignore', 'inherit', 'inherit'] });
  const stands = [];
  try {
    let up = false;
    for (let i = 0; i < 50 && !up; i++) { await sleep(100); try { up = (await (await fetch(BASE + '/health')).json()).ok; } catch (e) { /* not yet */ } }
    check('the server starts and answers /health', up);
    const key = fs.readFileSync(path.join(DATA, 'admin.key'), 'utf8').trim();

    const piece = JSON.parse(fs.readFileSync(path.join(STAND, 'piece.json'), 'utf8'));
    const reg = await admin(key, 'piece.register', piece);
    check('the piece registers without an IR', reg.ok === true, reg.error);
    check('four parts, named', reg.ok && reg.piece.parts.map(p => p.name).join('|') === 'Violin I|Violin II|Viola|Cello', reg.ok && JSON.stringify(reg.piece.parts));
    check('the film block and everyoneLeads are kept', reg.ok && reg.piece.film && reg.piece.film.duration === piece.film.duration && reg.piece.everyoneLeads === true);

    const ens = (await admin(key, 'ensemble.create', { name: 'Shell check', piece: piece.id })).ensemble;
    check('an ensemble with four player links and a gatekeeper link', !!ens && ens.rows.length === 4 && /\/s\//.test(ens.gatekeeperLink));

    for (const row of ens.rows) stands.push(await stand(row.token));
    const gk = await stand(ens.gatekeeperLink.split('/s/')[1]);
    stands.push(gk);
    check('every player is welcomed to their own part', stands.slice(0, 4).every((s, i) => s.welcome && s.welcome.ok && s.welcome.part === piece.parts[i]), stands.map(s => s.welcome && s.welcome.part).join(','));
    check('every player is told they may move the room', stands.slice(0, 4).every(s => s.welcome.leader === true));
    check('the welcome carries the film block', stands.every(s => s.welcome.piece && s.welcome.piece.film && s.welcome.piece.film.parts.length === 4));

    // each player in turn: play, then stop — every stand hears both
    for (let i = 0; i < 4; i++) {
      const before = stands.map(s => s.states.length);
      const a = await send(stands[i], { playing: true, anchorScoreTime: 10 * (i + 1) });
      await sleep(150);
      const b = await send(stands[i], { playing: false });
      await sleep(150);
      const heard = stands.every((s, k) => s.states.length === before[k] + 2 && s.states[s.states.length - 2].playing === true && s.states[s.states.length - 1].playing === false);
      check(piece.parts[i] + ' plays and stops the room; all five stands hear it', a.ok && b.ok && heard, JSON.stringify({ a: a.ok, b: b.ok, counts: stands.map(s => s.states.length) }));
      check(piece.parts[i] + "'s play starts from the place asked, 1.5 s ahead", a.ok && a.roomState.anchorScoreTime === 10 * (i + 1) && a.roomState.anchorServerTime > Date.now() + 1000 - 400);
    }
    const j = await send(stands[2], { playing: false, anchorScoreTime: 240 });
    await sleep(150);
    check('a jump while stopped lands every stand on the same place', j.ok && stands.every(s => s.states[s.states.length - 1].anchorScoreTime === 240 && s.states[s.states.length - 1].playing === false));
    check('nothing was refused', stands.every(s => s.refused.length === 0), JSON.stringify(stands.map(s => s.refused)));

    // the link sheet: behind the key, every player's link with a QR code
    const sheet = await fetch(BASE + '/admin/sheet?key=' + key);
    const sheetHtml = await sheet.text();
    check('the link sheet lists the four parts and the full score, a QR code each', sheet.status === 200 && ['Violin I', 'Violin II', 'Viola', 'Cello', 'Full score'].every(n => sheetHtml.includes('<h3>' + n + '</h3>')) && (sheetHtml.match(/<svg/g) || []).length === 5 && ens.rows.every(r => sheetHtml.includes('/s/' + r.token)), sheet.status + ', ' + (sheetHtml.match(/<svg/g) || []).length + ' codes');
    check('the link sheet is refused without the key', (await fetch(BASE + '/admin/sheet')).status === 401);

    // a film file, with Range (Safari asks for a range before it plays)
    const filmDir = path.join(STAND, 'films');
    const probe = path.join(filmDir, '_shell_check.mp4');
    fs.mkdirSync(filmDir, { recursive: true });
    fs.writeFileSync(probe, Buffer.alloc(1000, 7));
    try {
      const r = await fetch(BASE + '/films/_shell_check.mp4', { headers: { range: 'bytes=100-199' } });
      const buf = Buffer.from(await r.arrayBuffer());
      check('a film is served with Range (206, the bytes asked for)', r.status === 206 && buf.length === 100 && r.headers.get('content-type') === 'video/mp4', r.status + ' ' + buf.length + ' ' + r.headers.get('content-type'));
    } finally { fs.unlinkSync(probe); }
    const esc = await fetch(BASE + '/films/..%2fserver%2fregistry.js');
    check('nothing outside the stand folders is served', esc.status === 403 || esc.status === 404, String(esc.status));
  } catch (e) {
    fail++;
    console.log('  FAIL  the check itself: ' + (e && e.stack || e));
  } finally {
    for (const s of stands) { try { s.socket.close(); } catch (e) { /* closed */ } }
    server.kill();
    await sleep(300);
    try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { /* the server may still hold it */ }
  }
  console.log('\nshell_check: ' + pass + ' ok, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
