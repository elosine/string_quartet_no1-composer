// registry.js — the durable data (DESIGN §2; AR-1, 2, 4, 5, 59, 60).
//
//   pieces     id · title · version · the IR name the stand draws from · part
//              names · the rehearsal letters (score-time → label)
//   ensembles  id · name · piece + version · the GATEKEEPER token · the mode
//              (ALONE / REHEARSAL / CONCERT) · the standing room's tuple · the
//              part ROWS — one PLAYER token per row (doubling = two rows on the
//              same part), the leader tick on at most one row
//   revoked    every token that was reissued, so a stale link gets a plain
//              answer ("ask your leader for a new link") instead of silence
//
// One JSON file, written atomically (tmp + rename), a few kilobytes per
// ensemble. No database (as piece #1). The SPARE loads the same shape from a
// snapshot the leader downloaded at sound check (AR-58, 59) and then runs as
// any server does.
//
// The server knows nothing about any piece (AR-60): a piece is an IR name under
// notation/ir/ and a part list read from that IR (`source.parts`), or given.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MODES = ['ALONE', 'REHEARSAL', 'CONCERT'];

function makeRegistry(file, opts) {
  const root = (opts && opts.root) || path.join(__dirname, '..');
  const R = { pieces: {}, ensembles: {}, revoked: {} };
  let tokenIndex = null;      // token -> { role, ensembleId, rowId }
  let saveTimer = null;

  // ---- persistence ------------------------------------------------------------
  function load() {
    if (!fs.existsSync(file)) return false;
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    R.pieces = j.pieces || {};
    R.ensembles = j.ensembles || {};
    R.revoked = j.revoked || {};
    tokenIndex = null;
    return true;
  }

  // The spare's start: the leader's snapshot, tuples reset (the spare is a fresh
  // clock), then persisted to the spare's own data folder like any registry.
  function loadSnapshot(j) {
    R.pieces = j.pieces || {};
    R.ensembles = j.ensembles || {};
    R.revoked = j.revoked || {};
    for (const ens of Object.values(R.ensembles)) ens.tuple = null;
    tokenIndex = null;
    saveNow();
  }

  function saveNow() {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const text = JSON.stringify({ pieces: R.pieces, ensembles: R.ensembles, revoked: R.revoked, savedAt: new Date().toISOString() }, null, 1);
    fs.writeFileSync(file + '.tmp', text);
    fs.renameSync(file + '.tmp', file);
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  }

  function save() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => { saveTimer = null; try { saveNow(); } catch (e) { console.error('registry save failed: ' + e.message); } }, 50);
    if (saveTimer.unref) saveTimer.unref();
  }

  function snapshot() {
    return JSON.parse(JSON.stringify({ pieces: R.pieces, ensembles: R.ensembles, revoked: R.revoked, takenAt: new Date().toISOString() }));
  }

  // ---- ids and tokens ---------------------------------------------------------------
  // A token is a long random string in the link (DESIGN §2): 18 random bytes,
  // base64url, 24 characters. Nothing else identifies anyone (AR-4).
  const newToken = () => crypto.randomBytes(18).toString('base64url');
  const newId = prefix => prefix + '-' + crypto.randomBytes(4).toString('hex');

  function index() {
    if (tokenIndex) return tokenIndex;
    tokenIndex = new Map();
    for (const ens of Object.values(R.ensembles)) {
      tokenIndex.set(ens.gatekeeper, { role: 'gatekeeper', ensembleId: ens.id, rowId: null });
      for (const row of ens.rows) tokenIndex.set(row.token, { role: 'player', ensembleId: ens.id, rowId: row.id });
    }
    return tokenIndex;
  }

  function resolveToken(token) {
    if (!token || typeof token !== 'string' || token.length > 64) return null;
    const hit = index().get(token);
    if (hit) {
      const ensemble = R.ensembles[hit.ensembleId];
      const row = hit.rowId ? ensemble.rows.find(r => r.id === hit.rowId) : null;
      return { role: hit.role, ensemble, row };
    }
    if (R.revoked[token]) return { revoked: true, ensembleId: R.revoked[token].ensemble };
    return null;
  }

  // ---- pieces -----------------------------------------------------------------------
  function registerPiece(p) {
    if (!p || !p.id || !/^[a-z0-9_-]{1,32}$/.test(p.id)) throw new Error('piece id: a-z 0-9 _ - (1–32)');
    const ir = String(p.ir || p.id).replace(/[^A-Za-z0-9_-]/g, '');
    const irFile = path.join(root, 'notation', 'ir', ir + '.ir.json');
    let parts = Array.isArray(p.parts) && p.parts.length ? p.parts : null;
    // [sq1] a FILM piece has no IR: its parts are given, and `film` says where the films are
    if (!fs.existsSync(irFile) && !(parts && p.film)) throw new Error('no IR file: notation/ir/' + ir + '.ir.json');
    if (!parts) {
      const irJ = JSON.parse(fs.readFileSync(irFile, 'utf8'));
      const src = (irJ.source && irJ.source.parts) || [];
      // [port 9t] the names come from the score file the IR points at (its tracks),
      // so every piece registers with its own instrument names; 'Part N' only if
      // the score file is missing (the public face, RUNNING_LOG 102).
      let names = null;
      try {
        const sn = irJ.source && irJ.source.score ? String(irJ.source.score).replace(/[^A-Za-z0-9_-]/g, '') : '';
        if (sn) { const sc = JSON.parse(fs.readFileSync(path.join(root, 'scores', sn + '.json'), 'utf8')); const d = sc.data || sc;
          const tr = d.tracks || d.parts || []; if (tr.length) names = tr.map(t => t && (t.name || t.label || t.instrument)); }
      } catch (e) { names = null; }
      parts = src.map((x, i) => (typeof x === 'number' ? { index: x, name: (names && names[x]) ? String(names[x]) : 'Part ' + (x + 1) } : { index: i, name: String(x) }));
    } else {
      parts = parts.map((x, i) => (typeof x === 'string' ? { index: i, name: x } : { index: x.index == null ? i : x.index, name: String(x.name || ('Part ' + (i + 1))) }));
    }
    const letters = Array.isArray(p.letters) ? p.letters.map(l => ({ t: Number(l.t), label: String(l.label) })).filter(l => Number.isFinite(l.t)) : (R.pieces[p.id] && R.pieces[p.id].letters) || [];
    R.pieces[p.id] = { id: p.id, title: String(p.title || p.id), version: String(p.version || '1'), ir, parts, letters };
    // [sq1] film: { parts: [file per part], score: file, duration, leadIn, fps, rowSeconds, rows } — read by the film page;
    // everyoneLeads: every player's stand may move the ensemble room (no leader tick)
    if (p.film && typeof p.film === 'object') R.pieces[p.id].film = JSON.parse(JSON.stringify(p.film));
    if (p.everyoneLeads) R.pieces[p.id].everyoneLeads = true;
    save();
    return R.pieces[p.id];
  }

  // 9i: the rehearsal letters (score-time → label), set after the piece is registered;
  // every stand's strip and corner read them from the welcome
  function setLetters(id, letters) {
    const P = R.pieces[id];
    if (!P) throw new Error('no such piece: ' + id);
    if (!Array.isArray(letters)) throw new Error('letters: an array of { t, label }');
    P.letters = letters.map(l => ({ t: Number(l.t), label: String(l.label || '').trim() })).filter(l => Number.isFinite(l.t) && l.label).sort((a, b) => a.t - b.t);
    save();
    return publicPiece(P);
  }
  const publicPiece = P => P ? { id: P.id, title: P.title, version: P.version, ir: P.ir, parts: P.parts, letters: P.letters, film: P.film || null, everyoneLeads: !!P.everyoneLeads } : null;

  // ---- ensembles --------------------------------------------------------------------
  function createEnsemble(e) {
    const P = R.pieces[e && e.piece];
    if (!P) throw new Error('no such piece: ' + (e && e.piece));
    const name = String((e && e.name) || '').trim().slice(0, 80);
    if (!name) throw new Error('name required');
    const id = newId('ens');
    const ens = {
      id, name, piece: P.id, version: String((e && e.version) || P.version),
      gatekeeper: newToken(), mode: 'ALONE', tuple: null,
      rows: P.parts.map(p => ({ id: newId('row'), partIndex: p.index, part: p.name, name: '', token: newToken(), leader: false })),
      createdAt: new Date().toISOString(),
    };
    R.ensembles[id] = ens;
    tokenIndex = null;
    save();
    return ens;
  }

  function ensembleOf(id) {
    const ens = R.ensembles[id];
    if (!ens) throw new Error('no such ensemble: ' + id);
    return ens;
  }

  // The ensemble page's edits (DESIGN §8): names, the leader tick (at most one
  // row), new rows on a part ("add another player" — doubling, AR-2).
  function setParts(ensId, rows) {
    const ens = ensembleOf(ensId);
    const P = R.pieces[ens.piece];
    if (!Array.isArray(rows)) throw new Error('rows must be an array');
    let leaderId = null;
    for (const r of rows) {
      let row = r.id ? ens.rows.find(x => x.id === r.id) : null;
      if (!row) {
        const partIndex = Number(r.partIndex);
        const part = P && P.parts.find(p => p.index === partIndex);
        if (!part) throw new Error('row ' + (r.id || '') + ': no such part index ' + r.partIndex);
        row = { id: newId('row'), partIndex, part: part.name, name: '', token: newToken(), leader: false };
        ens.rows.push(row);
        tokenIndex = null;
      }
      if (r.name !== undefined) row.name = String(r.name).trim().slice(0, 60);
      if (r.leader) leaderId = row.id;
    }
    if (rows.some(r => r.leader !== undefined)) for (const row of ens.rows) row.leader = row.id === leaderId;
    save();
    return ens;
  }

  function addRow(ensId, partIndex) {
    return setParts(ensId, [{ partIndex }]);
  }

  // REISSUE (AR-5): the old link dies at once; the new one is the only way in.
  function reissue(ensId, which) {
    const ens = ensembleOf(ensId);
    const at = new Date().toISOString();
    if (which === 'gatekeeper') {
      R.revoked[ens.gatekeeper] = { ensemble: ens.id, at };
      ens.gatekeeper = newToken();
    } else {
      const row = ens.rows.find(x => x.id === which);
      if (!row) throw new Error('no such row: ' + which);
      R.revoked[row.token] = { ensemble: ens.id, at };
      row.token = newToken();
    }
    tokenIndex = null;
    save();
    return ens;
  }

  function setMode(ensId, mode) {
    const ens = ensembleOf(ensId);
    if (!MODES.includes(mode)) throw new Error('mode: ALONE, REHEARSAL or CONCERT');
    ens.mode = mode;
    save();
    return ens;
  }

  // What every stand may know (no tokens): the roster shape of the ensemble.
  const publicEnsemble = ens => ({
    id: ens.id, name: ens.name, piece: ens.piece, version: ens.version, mode: ens.mode,
    rows: ens.rows.map(r => ({ id: r.id, partIndex: r.partIndex, part: r.part, name: r.name, leader: !!r.leader })),
  });

  // What the gatekeeper's page shows: the rows WITH their links.
  const gatekeeperView = (ens, origin) => ({
    id: ens.id, name: ens.name, piece: ens.piece, version: ens.version, mode: ens.mode,
    gatekeeperLink: (origin || '') + '/s/' + ens.gatekeeper,
    rows: ens.rows.map(r => ({ id: r.id, partIndex: r.partIndex, part: r.part, name: r.name, leader: !!r.leader, token: r.token, link: (origin || '') + '/s/' + r.token })),
  });

  return {
    R, MODES, load, loadSnapshot, save, saveNow, snapshot, newToken,
    resolveToken, registerPiece, setLetters, publicPiece, createEnsemble, ensembleOf, setParts, addRow, reissue, setMode,
    publicEnsemble, gatekeeperView,
    get pieces() { return R.pieces; }, get ensembles() { return R.ensembles; },
  };
}

module.exports = { makeRegistry, MODES };
