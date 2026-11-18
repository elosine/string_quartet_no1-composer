#!/usr/bin/env node
// edit_server.js — THE PLAYERS' PAGE, EDITABLE IN PLACE, on this computer only.
//
//   node C:\Users\jwloy\GitHub\string_quartet_no1-composer\stand\tools\edit_server.js
//       → http://localhost:5303/help.html
//
// The page is stand/notation/app/help.html, the one page of instructions the players see. Here it carries the
// EDIT SWITCH (a small bar, top right: Edit → click any text and type → Save), the same one as the papers'
// pages (paperSubmissions/papers/edit.js, itself from decibel_TENOR_2026's performance instructions).
//
// The switch is put into the page BY THIS SERVER as it serves it. The file itself never holds it, so the copy
// the players get from the stand has no Edit bar — and the stand's own server (stand/server/server.js) has no
// way to write a page at all. This server listens on this computer only (127.0.0.1).
//
//   GET  /api/page?f=/help.html   → { success, sha, html }               the file's own text
//   POST /api/page?f=/help.html   { html, base } → { success, sha }      refused (409) if the file changed since `base`
//
// Before each save the file as it was is kept: stand/server/data/help-versions/help-<yyyymmdd-hhmmss>.html
// (stand/server/data/ is gitignored and is not served by anything).
// TWO WRITERS, ONE FILE: after the AI edits help.html, reload (F5) before pressing Edit; a stale save is refused.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP = path.join(__dirname, '..', 'notation', 'app');
const SWITCH = path.join(__dirname, 'edit_switch.js');
const VERSIONS = path.join(__dirname, '..', 'server', 'data', 'help-versions');
const PAGES = { '/help.html': path.join(APP, 'help.html') };         // the pages that may be edited: this one
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
const sha = buf => crypto.createHash('sha1').update(buf).digest('hex');

function handle(req, res) {
  const u = new URL(req.url, 'http://localhost');
  const json = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };

  if (u.pathname === '/api/page') {
    const file = PAGES[u.searchParams.get('f')];
    if (!file || !fs.existsSync(file)) return json(404, { success: false, error: 'no such page' });
    if (req.method !== 'POST') { const now = fs.readFileSync(file); return json(200, { success: true, sha: sha(now), html: now.toString('utf8') }); }
    const chunks = [];
    req.on('data', c => chunks.push(c));
    return req.on('end', () => {
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch (e) { return json(400, { success: false, error: 'Bad JSON' }); }
      const html = body && body.html;
      if (typeof html !== 'string' || html.length > 4e6 || !/<body>[\s\S]*<\/body>/.test(html)) return json(400, { success: false, error: 'a whole page is needed' });
      const was = fs.readFileSync(file);
      if (sha(was) !== body.base) return json(409, { success: false, error: 'the file changed on disk since the page read it', sha: sha(was) });
      const d = new Date(), p2 = n => String(n).padStart(2, '0');
      const stamp = d.getFullYear() + p2(d.getMonth() + 1) + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes()) + p2(d.getSeconds());
      fs.mkdirSync(VERSIONS, { recursive: true });
      const kept = path.basename(file, '.html') + '-' + stamp + '.html';
      fs.writeFileSync(path.join(VERSIONS, kept), was);
      const out = Buffer.from(html, 'utf8');
      fs.writeFileSync(file, out);
      console.log('saved from the page: ' + path.basename(file) + ' (' + out.length + ' bytes; the file before it: stand/server/data/help-versions/' + kept + ')');
      return json(200, { success: true, sha: sha(out) });
    });
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
  let p = decodeURIComponent(u.pathname);
  if (p === '/') { res.writeHead(302, { Location: '/help.html' }); return res.end(); }
  if (p === '/__edit.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'], 'Cache-Control': 'no-store' }); return res.end(fs.readFileSync(SWITCH)); }
  // an editable page: served with the switch put into its <head> (the file is not changed)
  if (PAGES[p]) {
    const text = fs.readFileSync(PAGES[p], 'utf8').replace('</head>', '<script src="/__edit.js"></script>\n</head>');
    res.writeHead(200, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store' });
    return res.end(text);
  }
  const file = path.join(APP, p);
  if (!file.startsWith(APP + path.sep) || p.includes('..')) { res.writeHead(403); return res.end('no'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('not found: ' + p); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
}

function start(port, cb) {
  const server = http.createServer(handle);
  server.listen(port, '127.0.0.1', () => cb && cb(server));
  return server;
}
module.exports = { start, sha, PAGES };

if (require.main === module) {
  const port = parseInt(process.argv[2] || '5303', 10);
  start(port, () => {
    console.log('the players\' page, editable — http://localhost:' + port + '/help.html');
    console.log('(this computer only; CTRL+C stops it)');
  });
}
