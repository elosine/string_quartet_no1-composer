#!/usr/bin/env node
// admin.js — the composer's admin line to the stand server (AR-1; the admin
// page of 9n does the same over the same API). The key is read from
// server/data/admin.key (or ADMIN_KEY, or --key).
//
//   node stand/tools/admin.js register-file stand/piece.json            [sq1] the piece from its file (a film piece: parts, film, everyoneLeads)
//   node tools/admin.js register ss "Scattered Substance" piece-septet     piece id · title · IR name
//   node tools/admin.js letters ss A=1:00 B=2:30 E=5:00                 the rehearsal letters (label=m:ss or label=seconds); none = clear
//   node tools/admin.js create "Tempus" ss            an ensemble → the links
//   node tools/admin.js ensembles                                 every ensemble, live counts
//   node tools/admin.js links <ensembleId>                        the gatekeeper link + every player's
//   node tools/admin.js leader <ensembleId> <rowId|Flute> [off]   tick the leader (by row id or part name); "off" unticks
//   node tools/admin.js name <ensembleId> <rowId> "Pat Lee"       a player's name
//   node tools/admin.js add <ensembleId> <partIndex>              another player on a part (doubling)
//   node tools/admin.js reissue <ensembleId> <rowId|gatekeeper>   a new link; the old one dies
//   node tools/admin.js mode <ensembleId> ALONE|REHEARSAL|CONCERT
//   node tools/admin.js snapshot > spare.json                     the registry for the spare
//
//   --server http://localhost:5302   (default)   --key <adminKey>

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf(name); if (i >= 0) { const v = argv[i + 1]; argv.splice(i, 2); return v; } return dflt; };
const SERVER = opt('--server', process.env.STAND_SERVER || 'http://localhost:5302').replace(/\/$/, '');
let KEY = opt('--key', process.env.ADMIN_KEY || '');
if (!KEY) {
  const f = path.join(__dirname, '..', 'server', 'data', 'admin.key');
  if (fs.existsSync(f)) KEY = fs.readFileSync(f, 'utf8').trim();
}
const [cmd, ...a] = argv;

async function call(op, body) {
  const r = await fetch(SERVER + '/admin/' + op, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-admin-key': KEY, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok || j.ok === false) throw new Error(j.error || ('HTTP ' + r.status));
  return j;
}

function printLinks(ens) {
  console.log(ens.name + '  (' + ens.id + ')  piece ' + ens.piece + ' v' + ens.version + '  mode ' + ens.mode);
  console.log('  gatekeeper  ' + ens.gatekeeperLink);
  for (const r of ens.rows) console.log('  ' + (r.leader ? '★ ' : '  ') + r.part.padEnd(10) + ' ' + (r.name || '').padEnd(16) + ' ' + r.link + '   ' + r.id);
}

(async () => {
  if (!cmd) { console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 20).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); return; }
  if (!KEY) throw new Error('no admin key: start the server once (it writes server/data/admin.key), or pass --key');
  switch (cmd) {
    case 'register-file': { const j = await call('piece.register', JSON.parse(fs.readFileSync(path.resolve(a[0]), 'utf8'))); console.log('piece ' + j.piece.id + ' "' + j.piece.title + '": ' + j.piece.parts.map(p => p.name).join(', ') + (j.piece.everyoneLeads ? '  (every player moves the room)' : '')); break; }
    case 'register': { const j = await call('piece.register', { id: a[0], title: a[1], ir: a[2] || a[0], version: a[3] }); console.log('piece ' + j.piece.id + ': ' + j.piece.parts.map(p => p.name).join(', ')); break; }
    case 'letters': {
      const letters = a.slice(1).map(x => { const m = /^([^=]+)=(\d+)(?::(\d{1,2}(?:\.\d+)?))?$/.exec(x); if (!m) throw new Error('a letter is label=m:ss or label=seconds: ' + x); return { label: m[1], t: m[3] != null ? +m[2] * 60 + +m[3] : +m[2] }; });
      const j = await call('piece.letters', { id: a[0], letters });
      console.log(j.piece.id + '  ' + (j.piece.letters.length ? j.piece.letters.map(l => l.label + '=' + Math.floor(l.t / 60) + ':' + String(Math.round(l.t % 60)).padStart(2, '0')).join('  ') : '(no letters)'));
      break;
    }
    case 'pieces': { const j = await call('pieces'); for (const p of j.pieces) console.log(p.id + '  ' + p.title + '  v' + p.version + '  ir ' + p.ir + '  ' + p.parts.length + ' parts  ' + p.letters.length + ' letters'); break; }
    case 'create': { const j = await call('ensemble.create', { name: a[0], piece: a[1], version: a[2] }); printLinks(j.ensemble); break; }
    case 'ensembles': { const j = await call('ensembles'); for (const e of j.ensembles) console.log(e.id + '  ' + e.name.padEnd(28) + ' ' + e.piece + '  ' + e.mode.padEnd(10) + ' live ' + e.live + '  ' + e.gatekeeperLink); break; }
    case 'links': { const j = await call('ensemble/' + a[0]); printLinks(j.ensemble); break; }
    case 'leader': {
      // the row by its id, or by its part's name ("Flute") — the composer's line needs no id (9i)
      let rowId = a[1];
      if (!/^row-/.test(String(rowId || ''))) {
        const e = (await call('ensemble/' + a[0])).ensemble;
        const row = e.rows.find(r => String(r.part).toLowerCase() === String(rowId || '').toLowerCase());
        if (!row) throw new Error('no row named ' + rowId + ' — the parts are: ' + e.rows.map(r => r.part).join(', '));
        rowId = row.id;
      }
      // "leader <ens> Flute off" takes the tick away again (the band leaves that stand live)
      const j = await call('parts.set', { ensembleId: a[0], rows: [{ id: rowId, leader: a[2] !== 'off' }] }); printLinks(j.ensemble); break;
    }
    case 'name': { const j = await call('parts.set', { ensembleId: a[0], rows: [{ id: a[1], name: a[2] }] }); printLinks(j.ensemble); break; }
    case 'add': { const j = await call('row.add', { ensembleId: a[0], partIndex: Number(a[1]) }); printLinks(j.ensemble); break; }
    case 'reissue': { const j = await call('token.reissue', { ensembleId: a[0], which: a[1] }); printLinks(j.ensemble); break; }
    case 'mode': { const j = await call('mode.set', { ensembleId: a[0], mode: a[1] }); console.log('mode → ' + j.mode); break; }
    case 'snapshot': { const j = await call('snapshot'); process.stdout.write(JSON.stringify(j, null, 1) + '\n'); break; }
    default: throw new Error('unknown command: ' + cmd);
  }
})().catch(e => { console.error('!! ' + e.message); process.exit(1); });
