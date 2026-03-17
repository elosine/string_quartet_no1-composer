#!/usr/bin/env node
/**
 * build_engraving_app.js — Engraving App Generator (Build Step 6)
 * 
 * Strips down the Workshop's public/index.html into a standalone Engraving app.
 * Strategy: COPY the full Workshop HTML, then make minimal surgical patches:
 *   1. Replace socket.io dependency with a no-op stub
 *   2. Replace server-based score loading with static JSON file loading
 *   3. Replace saveScore with file download
 *   4. Copy the score JSON alongside as score.json
 *
 * Result: Pixel-perfect match with Workshop rendering, no server needed.
 *
 * Usage:
 *   node scripts/build_engraving_app.js [score_json] [engraving_dir]
 *   node scripts/build_engraving_app.js scores/2295-FinalScore-preVersioning.json builds/engraving
 */

const fs = require('fs');
const path = require('path');

const scoreJsonPath = process.argv[2] || 'scores/2295-FinalScore-preVersioning.json';
const engravingDir = process.argv[3] || 'builds/engraving';
const workshopHtml = path.join(__dirname, '..', 'public', 'index.html');

if (!fs.existsSync(workshopHtml)) {
    console.error('Workshop index.html not found at: ' + workshopHtml);
    process.exit(1);
}
if (!fs.existsSync(scoreJsonPath)) {
    console.error('Score JSON not found at: ' + scoreJsonPath);
    process.exit(1);
}

fs.mkdirSync(engravingDir, { recursive: true });

console.log('\n═══ Build Engraving App ═══');
console.log('  Workshop source: ' + workshopHtml);
console.log('  Score: ' + scoreJsonPath);
console.log('  Output: ' + engravingDir);

// ─── Read Workshop HTML ─────────────────────────────────────────────────────

let html = fs.readFileSync(workshopHtml, 'utf8');
const originalSize = html.length;
let patchCount = 0;

// ─── Patch 1: Replace socket.io with a no-op stub ──────────────────────────

const socketTag = '<script src="/socket.io/socket.io.js"></script>';
const socketStub = [
    '<script>',
    '// Engraving Mode: socket.io stub (no server needed)',
    'function io() {',
    '    const handlers = {};',
    '    let _scoreTimeMs = 0;',
    '    let _isPlaying = false;',
    '    const _tempoHistory = [{ scoreTimeMs: 0, bpm: 60, beatsPerPage: 8 }];',
    '    let _playStartRealMs = 0;',
    '    let _playStartScoreMs = 0;',
    '    const sock = {',
    '        on(event, fn) {',
    '            if (!handlers[event]) handlers[event] = [];',
    '            handlers[event].push(fn);',
    '        },',
    '        emit(event, data) {',
    '            // Engraving mode: handle navigation events locally',
    '            if (event === "scoreGoto") {',
    '                const targetSeconds = data.seconds || 0;',
    '                _scoreTimeMs = targetSeconds * 1000;',
    '                _isPlaying = false;',
    '                sock._trigger("scoreGoto", {',
    '                    isPlaying: false,',
    '                    currentScoreTimeMs: _scoreTimeMs,',
    '                    targetSeconds: targetSeconds,',
    '                    tempoHistory: _tempoHistory,',
    '                    serverTime: Date.now()',
    '                });',
    '            } else if (event === "scoreGo") {',
    '                _isPlaying = true;',
    '                _playStartRealMs = Date.now();',
    '                _playStartScoreMs = _scoreTimeMs;',
    '                sock._trigger("scoreGo", {',
    '                    isPlaying: true,',
    '                    currentScoreTimeMs: _scoreTimeMs,',
    '                    scoreTimeOffset: Date.now() - _scoreTimeMs,',
    '                    tempoHistory: _tempoHistory,',
    '                    serverTime: Date.now()',
    '                });',
    '            } else if (event === "scoreStop") {',
    '                if (_isPlaying) {',
    '                    _scoreTimeMs = _playStartScoreMs + (Date.now() - _playStartRealMs);',
    '                }',
    '                _isPlaying = false;',
    '                sock._trigger("scoreStop", {',
    '                    isPlaying: false,',
    '                    currentScoreTimeMs: _scoreTimeMs,',
    '                    tempoHistory: _tempoHistory,',
    '                    serverTime: Date.now()',
    '                });',
    '            }',
    '        },',
    '        _trigger(event, data) {',
    '            if (handlers[event]) handlers[event].forEach(fn => fn(data));',
    '        }',
    '    };',
    '    return sock;',
    '}',
    '</script>'
].join('\n');

if (html.includes(socketTag)) {
    html = html.replace(socketTag, socketStub);
    patchCount++;
    console.log('  ✓ Patch 1: Replaced socket.io with stub');
} else {
    console.log('  ⚠ Patch 1: socket.io script tag not found');
}

// ─── Patch 2: Replace ScoreManager auto-load with static JSON fetch ────────
// Find the auto-load block by its unique comment marker

const autoLoadMarker = "// Auto-load: check server for latest score first (supports automation),";
const autoLoadEndMarker = "} catch(e) {}";

if (html.includes(autoLoadMarker)) {
    // Find the start of this block
    const startIdx = html.indexOf(autoLoadMarker);
    // Find the matching catch(e) {} after the marker
    const searchAfter = html.indexOf(autoLoadEndMarker, startIdx);
    
    if (searchAfter > startIdx) {
        const endIdx = searchAfter + autoLoadEndMarker.length;
        const oldBlock = html.substring(startIdx, endIdx);
        
        const newBlock = [
            '// Engraving Mode: load score from static JSON file',
            '                try {',
            "                    fetch('score.json').then(r => {",
            "                        if (!r.ok) throw new Error('HTTP ' + r.status);",
            '                        return r.json();',
            '                    }).then(data => {',
            "                        console.log('Engraving: Loading score from score.json...');",
            '                        this.distributeData(data);',
            "                        this.currentScoreName = 'engraving';",
            '                        this.isDirty = false;',
            "                        this.updateStatus('Loaded (engraving mode)');",
            '                        ',
            '                        // Trigger scoreState to start AnimationEngine',
            '                        setTimeout(() => {',
            '                            if (ClockSync.socket && ClockSync.socket._trigger) {',
            "                                ClockSync.socket._trigger('scoreState', {",
            '                                    isPlaying: false,',
            '                                    currentScoreTimeMs: 0,',
            '                                    scoreTimeOffset: 0,',
            '                                    tempoHistory: data.tempoHistory || [{ scoreTimeMs: 0, bpm: 60, beatsPerPage: 8 }]',
            '                                });',
            '                            }',
            '                        }, 200);',
            '                    }).catch(err => {',
            "                        console.error('Engraving: Failed to load score.json:', err);",
            "                        this.updateStatus('Load failed');",
            '                    });',
            '                } catch(e) {}'
        ].join('\n');
        
        html = html.substring(0, startIdx) + newBlock + html.substring(endIdx);
        patchCount++;
        console.log('  ✓ Patch 2: Replaced auto-load with static score.json fetch');
    } else {
        console.log('  ⚠ Patch 2: Could not find end of auto-load block');
    }
} else {
    console.log('  ⚠ Patch 2: Auto-load marker not found');
}

// ─── Patch 3: Replace saveScore server call with file download ──────────────
// Use the exact unique comment line to anchor the replacement

const saveMethodMarker = '// Save score to server (skipVersion=true skips version backup for faster auto-saves)';

if (html.includes(saveMethodMarker)) {
    // Find the whole saveScore method and replace its body
    const methodStart = html.indexOf(saveMethodMarker);
    // Find the next method after saveScore — anchored by unique comment
    const nextMethodMarker = '// Load selected score from dropdown';
    const methodEnd = html.indexOf(nextMethodMarker, methodStart);
    
    if (methodEnd > methodStart) {
        const oldMethod = html.substring(methodStart, methodEnd);
        
        const newMethod = [
            '// Save score (Engraving Mode: download as file)',
            '            async saveScore(skipVersion = false) {',
            "                const name = this.nameInput?.value?.trim() || 'untitled';",
            '                const data = this.collectAllData();',
            '                ',
            '                try {',
            "                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });",
            '                    const url = URL.createObjectURL(blob);',
            "                    const a = document.createElement('a');",
            '                    a.href = url;',
            "                    a.download = name + '.json';",
            '                    a.click();',
            '                    URL.revokeObjectURL(url);',
            '                    this.currentScoreName = name;',
            '                    this.isDirty = false;',
            "                    this.updateStatus('Downloaded: ' + name + '.json');",
            '                } catch (err) {',
            "                    this.updateStatus('Save failed');",
            "                    console.error('Save error:', err);",
            '                }',
            '            },',
            '            ',
            '            '
        ].join('\n');
        
        html = html.substring(0, methodStart) + newMethod + html.substring(methodEnd);
        patchCount++;
        console.log('  ✓ Patch 3: Replaced saveScore with file download');
    } else {
        console.log('  ⚠ Patch 3: Could not find next method boundary');
    }
} else {
    console.log('  ⚠ Patch 3: saveScore fetch not found');
}

// ─── Write output files ─────────────────────────────────────────────────────

// Write patched HTML
const outputPath = path.join(engravingDir, 'index.html');
fs.writeFileSync(outputPath, html);
const patchedSize = html.length;

// Copy score JSON as score.json
const scoreOutputPath = path.join(engravingDir, 'score.json');
fs.copyFileSync(scoreJsonPath, scoreOutputPath);
const scoreSize = fs.statSync(scoreOutputPath).size;

// Copy static assets the Workshop references (midi_files/, etc.)
const midiFilesSource = path.join(__dirname, '..', 'public', 'midi_files');
const midiFilesDest = path.join(engravingDir, 'midi_files');
if (fs.existsSync(midiFilesSource)) {
    fs.mkdirSync(midiFilesDest, { recursive: true });
    const files = fs.readdirSync(midiFilesSource);
    for (const f of files) {
        const src = path.join(midiFilesSource, f);
        if (fs.statSync(src).isFile()) {
            fs.copyFileSync(src, path.join(midiFilesDest, f));
        }
    }
    console.log('  ✓ Copied ' + files.length + ' files from midi_files/');
}

console.log('\n═══ Build Complete ═══');
console.log('  Patches applied: ' + patchCount + '/3');
console.log('  index.html: ' + (patchedSize / 1024).toFixed(0) + ' KB');
console.log('  score.json: ' + (scoreSize / 1024 / 1024).toFixed(2) + ' MB');
console.log('\nTo use:');
console.log('  npx serve ' + engravingDir);
console.log('  Open http://localhost:3000');
console.log('  Should look identical to Workshop (node server.js → http://localhost:5000)\n');
