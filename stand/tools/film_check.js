#!/usr/bin/env node
// film_check.js — the film page, driven for real in headless Chrome.
//
//   node stand/tools/film_check.js            (needs stand/films/violin1.mp4 and violin2.mp4)
//   node stand/tools/film_check.js --shots <folder>     also save a screenshot of each state
//
// Its own server (port 5398, a scratch data folder). Two stands — Violin I and
// Violin II — open their links, pass the door, and then:
//   alone   Violin I plays alone: its film moves, Violin II's does not
//   rows    the row buttons land on row starts
//   all     Violin II presses [Play all] from its own place: both stands count
//           down, then both films run on the room's place, close together
//   stop    Violin I presses [Stop all]: both films stop on the same place
// It never touches the real server's data.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const puppeteer = require('puppeteer');

const STAND = path.join(__dirname, '..');
const PORT = 5398;
const BASE = 'http://127.0.0.1:' + PORT;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sq1-film-check-'));
const si = process.argv.indexOf('--shots');
const SHOTS = si >= 0 ? process.argv[si + 1] : null;

let pass = 0, fail = 0;
const check = (name, cond, detail) => { if (cond) { pass++; console.log('  ok    ' + name + (detail ? '   [' + detail + ']' : '')); } else { fail++; console.log('  FAIL  ' + name + (detail ? '  — ' + detail : '')); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const admin = async (key, op, body) => (await fetch(BASE + '/admin/' + op, { method: body ? 'POST' : 'GET', headers: { 'x-admin-key': key, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })).json();

// the stand's own account of itself, read in one evaluate (so both readings share an instant as nearly as can be)
const read = page => page.evaluate(() => {
  const F = window.__film, t = F.target(performance.now());
  return { media: F.v.currentTime, target: t.pos, moving: t.moving, all: t.all, waitMs: t.waitMs, paused: F.v.paused, rate: F.v.playbackRate, speed: document.getElementById('bSpeed').textContent,
    localPlaying: F.S.local.playing, online: F.S.online, by: F.S.tuple && F.S.tuple.by, cls: document.body.className,
    state: document.getElementById('state').textContent, bAll: document.getElementById('bAll').textContent, bAlone: document.getElementById('bAlone').textContent,
    time: document.getElementById('time').value, count: document.getElementById('count') ? 'a count is on the page' : '',
    errMs: F.S.lastErrMs == null ? null : F.S.lastErrMs, serverNow: F.S.room ? F.S.room.serverNow() : null };
});

(async () => {
  for (const f of ['violin1.mp4', 'violin2.mp4']) if (!fs.existsSync(path.join(STAND, 'films', f))) { console.error('missing stand/films/' + f); process.exit(1); }
  if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
  const server = spawn(process.execPath, [path.join(STAND, 'server', 'server.js'), '--port', String(PORT), '--data', DATA, '--quiet'], { stdio: ['ignore', 'inherit', 'inherit'] });
  const browsers = [];
  try {
    let up = false;
    for (let i = 0; i < 50 && !up; i++) { await sleep(100); try { up = (await (await fetch(BASE + '/health')).json()).ok; } catch (e) { /* not yet */ } }
    if (!up) throw new Error('the server did not start');
    const key = fs.readFileSync(path.join(DATA, 'admin.key'), 'utf8').trim();
    await admin(key, 'piece.register', JSON.parse(fs.readFileSync(path.join(STAND, 'piece.json'), 'utf8')));
    const ens = (await admin(key, 'ensemble.create', { name: 'Film check', piece: 'sq1' })).ensemble;

    // one browser per stand: a second tab in one browser sits in the background and stops drawing
    const open = async (row, name) => {
      const br = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--window-size=1180,820'] });
      browsers.push(br);
      const page = await br.newPage();
      await page.setViewport({ width: 1180, height: 820 });   // an 11-inch iPad, full screen
      const errors = [];
      page.on('pageerror', e => errors.push(String(e.message || e)));
      await page.goto(BASE + '/s/' + row.token, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => !document.getElementById('doorGo').disabled, { timeout: 120000 });
      const door = await page.evaluate(() => ({ title: document.getElementById('doorTitle').textContent, part: document.getElementById('doorPart').textContent, msg: document.getElementById('doorMsg').textContent }));
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '_0_door.png') });
      await page.click('#doorGo');
      await page.waitForFunction(() => window.__film.S.opened && window.__film.v.readyState >= 2, { timeout: 30000 });
      return { page, errors, door, name };
    };
    const A = await open(ens.rows[0], 'violin1');
    const B = await open(ens.rows[1], 'violin2');
    check('the door names the piece and the part', A.door.title === 'String Quartet No. 1' && A.door.part === 'Violin I' && B.door.part === 'Violin II', A.door.part + ' / ' + B.door.part + ' / ' + A.door.msg);
    await sleep(2500);    // the clock's first samples
    let a = await read(A.page), b = await read(B.page);
    check('both stands are connected and stopped at the start', a.online && b.online && a.paused && b.paused && a.state === 'STOPPED' && a.time === '−2', a.state + ' ' + a.time + ' / ' + b.state);
    check('on an 11-inch iPad the controls sit beside the film', /\bside\b/.test(a.cls), a.cls);

    // ---- alone
    await A.page.click('#bAlone');
    await sleep(4000);
    a = await read(A.page); b = await read(B.page);
    check('Violin I plays alone: its film moves', !a.paused && a.media > 3.4 && a.media < 4.6 && a.state === 'ALONE' && a.bAlone === 'Stop', 'film at ' + a.media.toFixed(2) + ' s, ' + a.state);
    check('…within a frame or two of its own clock', Math.abs(a.media - a.target) < 0.06, ((a.media - a.target) * 1000).toFixed(0) + ' ms');
    check('…and Violin II does not move', b.paused && b.media < 0.05 && b.state === 'STOPPED', 'film at ' + b.media.toFixed(2) + ' s');
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 'violin1_1_alone.png') });
    await A.page.click('#bAlone');
    await sleep(600);
    a = await read(A.page);
    check('Stop: the film holds where it stopped', a.paused && Math.abs(a.media - a.target) < 0.03 && a.state === 'STOPPED', a.media.toFixed(2) + ' s');

    // ---- the tap (Violin I is stopped near film 4 s, page 0: row 3 holds page 3 = film 24–32 s)
    const tapAt = async (page, row, across) => {
      const r = await page.evaluate(() => { const b = document.getElementById('frame').getBoundingClientRect(); return { l: b.left, t: b.top, w: b.width, h: b.height }; });
      await page.mouse.click(r.l + r.w * (6.2 + 1587.2 * across) / 1600, r.t + r.h * (3 + 198.4 * (row + 0.5)) / 1200);
      await sleep(600);
      return read(page);
    };
    a = await tapAt(A.page, 3, 0.5);
    check('a tap half way along the fourth row puts the cursor there (film 28 s, shown as 26)', Math.abs(a.target - 28) < 0.05 && Math.abs(a.media - a.target) < 0.03 && a.time === '26' && a.paused, a.target.toFixed(3) + ' s, shows ' + a.time);
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 'violin1_tap.png') });   // the cursor should stand half way along the fourth row
    a = await tapAt(A.page, 1, 0.25);
    check('from there (page 3) a tap on the second row lands on page 7, a quarter across (film 58 s)', Math.abs(a.target - 58) < 0.05 && a.paused, a.target.toFixed(3) + ' s');
    await A.page.click('#bAlone');
    await sleep(800);
    const mid = await read(A.page);
    a = await tapAt(A.page, 4, 0.5);
    check('a tap while playing alone does nothing', !a.paused && a.target > mid.target && a.target < mid.target + 1.5, 'still running at ' + a.target.toFixed(2) + ' s');
    await A.page.click('#bAlone');
    await sleep(400);

    // ---- rows (Violin II: thirteen presses from the lead-in = the start of the piece, then twelve rows on: timeline 96 s, film 98 s)
    for (let i = 0; i < 13; i++) await B.page.click('#bFwd');
    await sleep(700);
    b = await read(B.page);
    check('thirteen presses forward land on row 13\'s left edge (film 104 s, shown as 102)', Math.abs(b.target - 104) < 0.001 && Math.abs(b.media - 104) < 0.03 && b.time === '102', b.media.toFixed(3) + ' s, shows ' + b.time);
    await B.page.click('#bBack');
    await sleep(500);
    b = await read(B.page);
    check('a row back from a row\'s edge lands on the row before (film 96 s, shown as 94)', Math.abs(b.target - 96) < 0.001 && b.time === '94', b.target.toFixed(3) + ' s');
    await B.page.click('#bFwd');
    await sleep(500);

    // ---- the time box (Violin I types a time; then Violin II goes back to 96 s for the room test)
    const typeTime = async (page, txt) => { await page.click('#time'); await sleep(150); await page.keyboard.type(txt); await page.keyboard.press('Enter'); await sleep(600); return read(page); };
    a = await typeTime(A.page, '130');
    check('typing 130 in the time box lands the film on second 130', Math.abs(a.target - 132) < 0.001 && Math.abs(a.media - 132) < 0.03 && a.time === '130', a.media.toFixed(3) + ' s, shows ' + a.time);
    a = await typeTime(A.page, '45');
    check('typing 45 lands on second 45', Math.abs(a.target - 47) < 0.001 && a.time === '45', a.target.toFixed(3) + ' s, shows ' + a.time);
    a = await typeTime(A.page, '9999');
    check('a time that is not one is refused and the film stays put', Math.abs(a.target - 47) < 0.001, a.target.toFixed(3) + ' s');
    await A.page.keyboard.press('Escape');
    b = await typeTime(B.page, '1:36');
    check('a time typed with a colon (1:36) is still read, and shown as 96', Math.abs(b.target - 98) < 0.001 && Math.abs(b.media - 98) < 0.03 && b.time === '96', b.media.toFixed(3) + ' s, shows ' + b.time);

    // ---- all
    await B.page.click('#bAll');
    await sleep(1500);
    a = await read(A.page); b = await read(B.page);
    check('Violin II presses Play all: both stands wear the band at once, with no count shown', a.all && b.all && a.state.indexOf('ALL') === 0 && /started by Violin II/.test(a.state) && a.count === '' && b.count === '', a.state);
    check('…and a second and a half later both are RUNNING from one second before Violin II\'s place (97 s + about 1.2)', !a.paused && !b.paused && a.target > 97.8 && a.target < 98.7 && Math.abs(a.media - a.target) < 0.06 && Math.abs(b.media - b.target) < 0.06, 'at ' + a.media.toFixed(2) + ' / ' + b.media.toFixed(2) + ' s');
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 'violin1_2_countdown.png') });
    await sleep(4500);          // five seconds and more of playing
    const errs = [];
    for (let i = 0; i < 20; i++) { const [x, y] = await Promise.all([read(A.page), read(B.page)]); errs.push({ a: (x.media - x.target) * 1000, b: (y.media - y.target) * 1000, ar: x.rate, br: y.rate, moving: x.moving && y.moving && !x.paused && !y.paused }); await sleep(250); }
    const worst = Math.max(...errs.map(e => Math.max(Math.abs(e.a), Math.abs(e.b))));
    a = await read(A.page); b = await read(B.page);
    check('the room plays: both films run', errs.every(e => e.moving) && a.bAll === 'Stop all' && a.count === '', 'at ' + a.media.toFixed(2) + ' / ' + b.media.toFixed(2) + ' s');
    check('…each within 50 ms of the room\'s clock over five seconds', worst < 50, 'worst ' + worst.toFixed(1) + ' ms; rates ' + errs[errs.length - 1].ar.toFixed(4) + ' / ' + errs[errs.length - 1].br.toFixed(4));
    check('…and the place is where the room should be (97 s + the time played)', a.target > 97 + 8.5 && a.target < 97 + 12.5, a.target.toFixed(2) + ' s');
    if (SHOTS) await A.page.screenshot({ path: path.join(SHOTS, 'violin1_3_all.png') });
    // the alone controls are out of reach while the room plays
    await A.page.evaluate(() => document.getElementById('bAlone').click());
    await sleep(300);
    a = await read(A.page);
    check('Play alone does nothing while the room plays', a.all && !a.localPlaying);

    // ---- stop all, by the OTHER player
    await A.page.click('#bAll');
    await sleep(900);
    a = await read(A.page); b = await read(B.page);
    check('Violin I presses Stop all: both films stop on the same place', a.paused && b.paused && !a.all && !b.all && Math.abs(a.target - b.target) < 0.001 && Math.abs(a.media - b.media) < 0.03 && a.state === 'STOPPED', a.media.toFixed(3) + ' / ' + b.media.toFixed(3) + ' s');
    // ---- the speed: alone at 50 %, then the room at 70 %
    for (let i = 0; i < 3; i++) await A.page.click('#bSpeed');           // 100 -> 85 -> 70 -> 50
    a = await read(A.page);
    const from = a.target;
    await A.page.click('#bAlone');
    await sleep(6000);
    a = await read(A.page); b = await read(B.page);
    check('Violin I alone at 50 %: six seconds of clock move the film about three', a.speed === '50%' && a.target - from > 2.6 && a.target - from < 3.4 && Math.abs(a.rate - 0.5) < 0.02 && Math.abs(a.media - a.target) < 0.06, (a.target - from).toFixed(2) + ' s moved, rate ' + a.rate.toFixed(4) + ', off by ' + ((a.media - a.target) * 1000).toFixed(0) + ' ms');
    check('…and Violin II is untouched, still at 100 %', b.paused && b.speed === '100%');
    await A.page.click('#bAlone');
    await sleep(400);
    for (let i = 0; i < 2; i++) await B.page.click('#bSpeed');           // Violin II: 100 -> 85 -> 70
    b = await read(B.page);
    const roomFrom = b.target;
    await B.page.click('#bAll');
    await sleep(300 + 6000);                                               // the lead, then six seconds
    const errs2 = [];
    for (let i = 0; i < 12; i++) { const [x, y] = await Promise.all([read(A.page), read(B.page)]); errs2.push({ a: (x.media - x.target) * 1000, b: (y.media - y.target) * 1000, ar: x.rate, br: y.rate }); await sleep(250); }
    a = await read(A.page); b = await read(B.page);
    const worst2 = Math.max(...errs2.map(e => Math.max(Math.abs(e.a), Math.abs(e.b))));
    check('Violin II plays all at 70 %: both stands say so', /ALL/.test(a.state) && /70%/.test(a.state) && /70%/.test(b.state) && a.speed === '70%', a.state);
    check('…both films run at 0.7 and within 50 ms of the room', worst2 < 50 && errs2.every(e => Math.abs(e.ar - 0.7) < 0.03 && Math.abs(e.br - 0.7) < 0.03), 'worst ' + worst2.toFixed(1) + ' ms; rates ' + errs2[errs2.length - 1].ar.toFixed(4) + ' / ' + errs2[errs2.length - 1].br.toFixed(4));
    check('…and the room has moved 0.7 s for each second, from one second back', a.target - roomFrom > 0.7 * 8.2 - 1 && a.target - roomFrom < 0.7 * 11.5 - 1, (a.target - roomFrom).toFixed(2) + ' s past the place');
    await B.page.click('#bAll');
    await sleep(800);
    a = await read(A.page); b = await read(B.page);
    check('after Stop all each stand keeps its OWN speed setting (Violin I 50 %, Violin II 70 %)', a.speed === '50%' && b.speed === '70%' && a.paused && b.paused && Math.abs(a.target - b.target) < 0.001, a.speed + ' / ' + b.speed);
    check('no page errors', A.errors.length === 0 && B.errors.length === 0, A.errors.concat(B.errors).slice(0, 3).join(' | '));
  } catch (e) {
    fail++;
    console.log('  FAIL  the check itself: ' + (e && e.stack || e));
  } finally {
    for (const br of browsers) { try { await br.close(); } catch (e) { /* closed */ } }
    server.kill();
    await sleep(300);
    try { fs.rmSync(DATA, { recursive: true, force: true }); } catch (e) { /* still held */ }
  }
  console.log('\nfilm_check: ' + pass + ' ok, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})();
