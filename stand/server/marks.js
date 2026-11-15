// marks.js — a player's marks, stored per token (DESIGN §2; AR-4, 38).
//
// One JSON file per player token: { part: [...], score: [...] } — the two views
// (AR-21). The stand mirrors them in its local store and syncs quietly; the
// server is the copy a new iPad recovers from by tapping the old link (AR-4).
// A stroke is the stand's business; the server keeps what it is given, within
// a size cap.

const fs = require('fs');
const path = require('path');

const MAX_BYTES = 2 * 1024 * 1024;   // per token, both views

function makeMarks(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const fileOf = token => path.join(dir, String(token).replace(/[^A-Za-z0-9_-]/g, '') + '.json');

  function get(token, view) {
    let all = {};
    try { all = JSON.parse(fs.readFileSync(fileOf(token), 'utf8')); } catch (e) { all = {}; }
    if (view) return { view, marks: Array.isArray(all[view]) ? all[view] : [] };
    return all;
  }

  function put(token, view, marks) {
    if (view !== 'part' && view !== 'score') throw new Error('view must be part or score');
    if (!Array.isArray(marks)) throw new Error('marks must be an array');
    const all = get(token);
    all[view] = marks;
    const text = JSON.stringify(all);
    if (text.length > MAX_BYTES) throw new Error('marks too large');
    const f = fileOf(token);
    fs.writeFileSync(f + '.tmp', text);
    fs.renameSync(f + '.tmp', f);
    return { view, count: marks.length };
  }

  return { get, put };
}

module.exports = { makeMarks };
