#!/usr/bin/env node
// backup_start.js — THE BACKUP STAND on the composer's laptop, for a venue where the live stand cannot be reached.
//
//   Double-click  START_BACKUP.bat  in the backup folder (it runs this file).
//
// What it does, in order:
//   1. If the internet is there, it fetches the live stand's registry (the same links, the same tokens) with the
//      full score's link, kept in server/data/backup.json; it keeps that copy as server/data/spare.json. With no
//      internet it uses the copy it already has.
//   2. It checks the five films are in films/.
//   3. It starts the stand's own server as the SPARE (server/server.js --spare): every link the players were sent
//      works here too, with this laptop's address in place of the website's. Every room starts stopped, at the
//      start, on this laptop's clock.
//   4. It opens the LINK SHEET in the browser: every part's link with this laptop's address and a QR code each.
//      The players scan their code.
// CTRL+C, or closing the window, stops it.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const STAND = path.join(__dirname, '..');
const DATA = path.join(STAND, 'server', 'data');
const CFG = path.join(DATA, 'backup.json');
const SPARE = path.join(DATA, 'spare.json');
const PORT = parseInt(process.env.BACKUP_PORT || '5302', 10);   // BACKUP_PORT: only for the AI's own test
const FILMS = ['violin1', 'violin2', 'viola', 'cello', 'fullscore'];
const say = s => console.log(s);
const stop = (msg) => { console.log('\n!! ' + msg + '\n'); process.exitCode = 1; };

(async () => {
  say('\n=== The backup stand — String Quartet No. 1 ===\n');
  if (!fs.existsSync(CFG)) return stop('server/data/backup.json is missing — this folder was not made by the AI\'s package.');
  const cfg = JSON.parse(fs.readFileSync(CFG, 'utf8'));

  // 1. the registry: fresh from the live stand when it can be had, else the copy kept
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch(cfg.box + '/api/snapshot?token=' + encodeURIComponent(cfg.gatekeeper), { signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!j.ensembles) throw new Error('not a registry');
    fs.writeFileSync(SPARE, JSON.stringify(j, null, 1));
    say('links      fetched fresh from the live stand');
  } catch (e) {
    if (!fs.existsSync(SPARE)) return stop('No internet, and no saved copy of the links (server/data/spare.json).');
    say('links      the copy saved on ' + new Date(fs.statSync(SPARE).mtime).toLocaleString() + ' (no internet just now — that is fine)');
  }

  // 2. the films
  const missing = FILMS.filter(f => !fs.existsSync(path.join(STAND, 'films', f + '.mp4')));
  if (missing.length) return stop('Films missing in the films folder: ' + missing.join(', '));
  say('films      all five are here');

  // 3. the server, as the spare
  const server = spawn(process.execPath, [path.join(STAND, 'server', 'server.js'), '--spare', SPARE, '--port', String(PORT), '--data', DATA],
    { cwd: STAND, stdio: ['ignore', 'pipe', 'inherit'] });
  let lan = [];
  server.stdout.on('data', b => {
    const s = String(b);
    process.stdout.write(s.split('\n').filter(l => /LAN:|stand server|SPARE|hello|mode/.test(l)).map(l => l + '\n').join(''));
  });
  server.on('exit', code => { say('\nThe backup stand has stopped' + (code ? ' (code ' + code + ')' : '') + '.'); process.exit(code || 0); });
  process.on('SIGINT', () => { server.kill(); });

  let up = false;
  for (let i = 0; i < 50 && !up; i++) {
    await new Promise(r => setTimeout(r, 200));
    try { const h = await (await fetch('http://127.0.0.1:' + PORT + '/health')).json(); up = !!h.ok; } catch (e) { /* not yet */ }
  }
  if (!up) { server.kill(); return stop('The server did not start. Is something else already using port ' + PORT + '? Close other windows of this, then try again.'); }
  try { lan = (await (await fetch('http://127.0.0.1:' + PORT + '/api/info')).json()).lan || []; } catch (e) { lan = []; }

  // 4. the link sheet, in the browser
  const key = fs.readFileSync(path.join(DATA, 'admin.key'), 'utf8').trim();
  const sheet = 'http://localhost:' + PORT + '/admin/sheet?key=' + key;
  say('\nThe backup stand is RUNNING. Keep this window open.');
  if (!lan.length) say('\n!! This laptop is on NO network. Join the phone\'s hotspot (or the venue Wi-Fi), then close this window and start again.');
  else say('This laptop\'s address: ' + lan.join('  ·  '));
  say('\nThe link sheet (opening in the browser now):\n  ' + sheet + '\n');
  // the links as text too: in this window, and in LINKS.txt beside START_BACKUP.bat, to copy into a message
  try {
    const html = await (await fetch('http://127.0.0.1:' + PORT + '/admin/sheet?key=' + key)).text();
    const m = /<pre class="plain">([\s\S]*?)<\/pre>/.exec(html);
    if (m) {
      const text = m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      fs.writeFileSync(path.join(STAND, 'LINKS.txt'), 'String Quartet No. 1 - the backup stand on this laptop\r\n' +
        '(these links work only while START_BACKUP.bat is running, and only on the same network)\r\n\r\n' + text.replace(/\n/g, '\r\n') + '\r\n');
      say('The links (also saved in LINKS.txt, in this folder):\n\n' + text.split('\n').map(l => '  ' + l).join('\n') + '\n');
    }
  } catch (e) { /* the sheet still has them */ }
  say('To stop: close this window.\n');
  if (!process.env.BACKUP_NO_OPEN) spawn('cmd', ['/c', 'start', '', sheet], { detached: true, stdio: 'ignore' }).unref();
})().catch(e => stop(String(e && e.message || e)));
