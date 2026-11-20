#!/usr/bin/env node
// make_backup.js — makes the BACKUP STAND as one folder (and a zip of it) to copy onto the laptop.
//
//   node stand/tools/make_backup.js <the full score's link>
//
// Output: builds/backup/sq1-backup/  and  builds/backup/sq1-backup.zip   (builds/ is gitignored)
// Inside: the stand (as in git) · its two dependencies installed · the five films · the print PDFs · the link to
// the live stand and a saved copy of its registry (server/data/, private: the copy holds every player's token) ·
// START_BACKUP.bat · BACKUP_INSTRUCTIONS.txt. The laptop needs only Node.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = path.join(__dirname, '..', '..');
const STAND = path.join(REPO, 'stand');
const OUT = path.join(REPO, 'builds', 'backup');
const DIR = path.join(OUT, 'sq1-backup');
const FILMS = ['violin1', 'violin2', 'viola', 'cello', 'fullscore'];

(async () => {
  const link = process.argv[2] || '';
  const m = /^(https:\/\/[^/]+)\/s\/([A-Za-z0-9_-]{8,64})$/.exec(link);
  if (!m) throw new Error('give the full score\'s link: node stand/tools/make_backup.js https://<the stand>/s/<token>');
  const box = m[1], gatekeeper = m[2];

  fs.rmSync(DIR, { recursive: true, force: true });
  fs.mkdirSync(DIR, { recursive: true });
  // the stand as in git
  const files = execFileSync('git', ['ls-files', 'stand'], { cwd: REPO, encoding: 'utf8' }).split(/\r?\n/).filter(Boolean);
  for (const f of files) {
    const to = path.join(DIR, path.relative('stand', f));
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(path.join(REPO, f), to);
  }
  // the films (not in git)
  fs.mkdirSync(path.join(DIR, 'films'), { recursive: true });
  for (const f of FILMS) fs.copyFileSync(path.join(STAND, 'films', f + '.mp4'), path.join(DIR, 'films', f + '.mp4'));
  // its two dependencies
  execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--omit=dev', '--no-audit', '--no-fund'], { cwd: DIR, stdio: 'inherit', shell: process.platform === 'win32' });
  // the link to the live stand, and a copy of its registry now
  const data = path.join(DIR, 'server', 'data');
  fs.mkdirSync(data, { recursive: true });
  fs.writeFileSync(path.join(data, 'backup.json'), JSON.stringify({ box, gatekeeper, made: new Date().toISOString() }, null, 1));
  const r = await fetch(box + '/api/snapshot?token=' + gatekeeper);
  if (!r.ok) throw new Error('the live stand did not give its registry: HTTP ' + r.status);
  const snap = await r.json();
  fs.writeFileSync(path.join(data, 'spare.json'), JSON.stringify(snap, null, 1));
  // the instructions and the double-click, at the top
  fs.copyFileSync(path.join(STAND, 'tools', 'BACKUP_INSTRUCTIONS.txt'), path.join(DIR, 'BACKUP_INSTRUCTIONS.txt'));
  // the zip
  const zip = path.join(OUT, 'sq1-backup.zip');
  fs.rmSync(zip, { force: true });
  // Windows' own tar (bsdtar) writes zips; a Git Bash tar earlier on the PATH would not
  const TAR = process.platform === 'win32' ? path.join(process.env.SystemRoot || 'C:/Windows', 'System32', 'tar.exe') : 'tar';
  execFileSync(TAR, ['-a', '-c', '-f', zip, '-C', OUT, 'sq1-backup'], { stdio: 'inherit' });
  let bytes = 0; (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else bytes += fs.statSync(p).size; } })(DIR);
  console.log('\nbackup folder: ' + DIR + '  (' + (bytes / 1048576).toFixed(0) + ' MB)');
  console.log('zip:           ' + zip + '  (' + (fs.statSync(zip).size / 1048576).toFixed(0) + ' MB)');
  console.log('registry:      ' + Object.values(snap.ensembles).map(e => e.name + ', ' + e.rows.length + ' players').join(' · '));
})().catch(e => { console.error('make_backup FAILED: ' + (e && e.message || e)); process.exit(1); });
