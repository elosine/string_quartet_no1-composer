#!/usr/bin/env node
// setup.js — one line after the stand server is running: the piece registered,
// an ensemble made if there is none, and the address of the link sheet printed.
//
//   node stand/tools/setup.js                      the server on this machine (port 5302)
//   node stand/tools/setup.js "JACK Quartet"       the ensemble's name, if one is to be made (default "Home test")
//   node stand/tools/setup.js --server https://<address>     another server (the box)
//
// Safe to run again: the piece is registered afresh from stand/piece.json (its
// ensembles and their links are kept), and no second ensemble is made.

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); if (i >= 0) { const v = argv[i + 1]; argv.splice(i, 2); return v; } return dflt; };
const SERVER = opt('--server', process.env.STAND_SERVER || 'http://localhost:5302').replace(/\/$/, '');
let KEY = opt('--key', process.env.ADMIN_KEY || '');
const NAME = argv[0] || 'Home test';
if (!KEY) { const f = path.join(__dirname, '..', 'server', 'data', 'admin.key'); if (fs.existsSync(f)) KEY = fs.readFileSync(f, 'utf8').trim(); }

async function call(op, body) {
  const r = await fetch(SERVER + '/admin/' + op, { method: body ? 'POST' : 'GET', headers: { 'x-admin-key': KEY, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

(async () => {
  if (!KEY) throw new Error('no admin key: start the server first (it writes stand/server/data/admin.key)');
  try { await fetch(SERVER + '/health'); } catch (e) { throw new Error('no server at ' + SERVER + ' — start it first: node ' + path.join(__dirname, '..', 'server', 'server.js')); }
  const piece = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'piece.json'), 'utf8'));
  const reg = await call('piece.register', piece);
  console.log('piece    ' + reg.piece.title + ': ' + reg.piece.parts.map(p => p.name).join(', '));
  const missing = [].concat(piece.film.parts, [piece.film.score]).filter(f => !fs.existsSync(path.join(__dirname, '..', 'films', f)));
  if (missing.length && /localhost|127\.0\.0\.1/.test(SERVER)) console.log('films    MISSING in stand/films: ' + missing.join(', '));
  else if (/localhost|127\.0\.0\.1/.test(SERVER)) console.log('films    all five are in stand/films');
  const list = (await call('ensembles')).ensembles.filter(e => e.piece === piece.id);
  let ens = list[0];
  if (!ens) { ens = (await call('ensemble.create', { name: NAME, piece: piece.id })).ensemble; console.log('ensemble ' + ens.name + ' made (' + ens.id + ')'); }
  else console.log('ensemble ' + ens.name + ' (' + ens.id + '), kept');
  console.log('');
  console.log('The links, a QR code each — open this on this computer:');
  console.log('  ' + SERVER + '/admin/sheet?key=' + KEY);
})().catch(e => { console.error('!! ' + e.message); process.exit(1); });
