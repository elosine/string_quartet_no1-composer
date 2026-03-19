#!/usr/bin/env node
/**
 * build_performance_app.js — Performance Score Generator (Phase 1)
 * 
 * Strips down the Workshop's public/index.html into a standalone Performance Score.
 * Based on build_engraving_app.js v2 subtractive approach, with additional patches:
 *   - Patches 1-3: socket.io stub, static score load, save as download (from v2)
 *   - Strip S1-S7: Remove composition-only JS systems
 *   - Insert I1: MidiModelSystem stub
 *   - Insert I2: CSS to hide composition panel
 *   - Clean C1: Remove NotationManager init at end
 *
 * KEEPS: Score rendering, animation, curves, motives, line-wedges, badges, GCs,
 *        glissandos, staff cursors, zoom, tracks, timeline, score manager.
 *
 * Usage:
 *   node scripts/build_performance_app.js [score_json] [output_dir]
 *   node scripts/build_performance_app.js scores/2295-FinalScore-preVersioning.json builds/performance
 */

const fs = require('fs');
const path = require('path');

const scoreJsonPath = process.argv[2] || 'scores/2295-FinalScore-preVersioning.json';
const outputDir = process.argv[3] || 'builds/performance';
const workshopHtml = path.join(__dirname, '..', 'public', 'index.html');

if (!fs.existsSync(workshopHtml)) {
    console.error('Workshop index.html not found at: ' + workshopHtml);
    process.exit(1);
}
if (!fs.existsSync(scoreJsonPath)) {
    console.error('Score JSON not found at: ' + scoreJsonPath);
    process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });

console.log('\n═══ Build Performance Score ═══');
console.log('  Workshop source: ' + workshopHtml);
console.log('  Score: ' + scoreJsonPath);
console.log('  Output: ' + outputDir);

// ─── Read Workshop HTML ─────────────────────────────────────────────────────

let html = fs.readFileSync(workshopHtml, 'utf8');
// Normalize line endings to LF (Workshop HTML uses CRLF on Windows)
html = html.replace(/\r\n/g, '\n');
const originalSize = html.length;
let patchCount = 0;
let stripCount = 0;

// ─── Helper: strip a block between two unique markers ────────────────────────
// Removes everything from startMarker up to (but not including) endMarker.
// Both markers must be unique substrings in the current HTML.

function stripBetween(startMarker, endMarker, label) {
    const startIdx = html.indexOf(startMarker);
    if (startIdx === -1) {
        console.log('  ⚠ Strip ' + label + ': start marker not found');
        return false;
    }
    const endIdx = html.indexOf(endMarker, startIdx + startMarker.length);
    if (endIdx === -1) {
        console.log('  ⚠ Strip ' + label + ': end marker not found');
        return false;
    }
    const removedChars = endIdx - startIdx;
    html = html.substring(0, startIdx) + html.substring(endIdx);
    stripCount++;
    console.log('  ✓ Strip ' + label + ' (' + (removedChars / 1024).toFixed(0) + ' KB)');
    return true;
}

// ─── Helper: replace a unique string ─────────────────────────────────────────

function replaceOnce(target, replacement, label) {
    if (!html.includes(target)) {
        console.log('  ⚠ ' + label + ': target not found');
        return false;
    }
    html = html.replace(target, replacement);
    patchCount++;
    console.log('  ✓ ' + label);
    return true;
}


// ═══════════════════════════════════════════════════════════════════════════════
// PATCHES 1-3: From build_engraving_app.js v2
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Patch 1: Replace socket.io with a no-op stub ──────────────────────────

const socketTag = '<script src="/socket.io/socket.io.js"></script>';
const socketStub = [
    '<script>',
    '// Performance Score: socket.io stub (no server needed)',
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
    '            // Async dispatch to match real socket.io behavior',
    '            // (prevents double-fire from inline onclick + addEventListener)',
    '            setTimeout(() => { if (handlers[event]) handlers[event].forEach(fn => fn(data)); }, 0);',
    '        }',
    '    };',
    '    return sock;',
    '}',
    '</script>'
].join('\n');

replaceOnce(socketTag, socketStub, 'Patch 1: socket.io stub');

// ─── Patch 2: Replace ScoreManager auto-load with static JSON fetch ────────

const autoLoadMarker = "// Auto-load: check server for latest score first (supports automation),";
const autoLoadEndMarker = "} catch(e) {}";

if (html.includes(autoLoadMarker)) {
    const startIdx = html.indexOf(autoLoadMarker);
    const searchAfter = html.indexOf(autoLoadEndMarker, startIdx);
    
    if (searchAfter > startIdx) {
        const endIdx = searchAfter + autoLoadEndMarker.length;
        const oldBlock = html.substring(startIdx, endIdx);
        
        const newBlock = [
            '// Performance Score: load score from static JSON file',
            '                try {',
            "                    fetch('score.json').then(r => {",
            "                        if (!r.ok) throw new Error('HTTP ' + r.status);",
            '                        return r.json();',
            '                    }).then(data => {',
            "                        console.log('Performance Score: Loading score from score.json...');",
            '                        this.distributeData(data);',
            "                        this.currentScoreName = 'performance';",
            '                        this.isDirty = false;',
            "                        this.updateStatus('Loaded (performance mode)');",
            '                        ',
            '                        // Force layout recalculation after data distribution',
            '                        // SVG elements need correct container dimensions for sizing',
            '                        requestAnimationFrame(() => {',
            '                            window.dispatchEvent(new Event("resize"));',
            "                            console.log('Performance Score: Triggered resize for SVG layout recalculation');",
            '                        });',
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
            "                        console.error('Performance Score: Failed to load score.json:', err);",
            "                        this.updateStatus('Load failed');",
            '                    });',
            '                } catch(e) {}'
        ].join('\n');
        
        html = html.substring(0, startIdx) + newBlock + html.substring(endIdx);
        patchCount++;
        console.log('  ✓ Patch 2: static score.json fetch');
    } else {
        console.log('  ⚠ Patch 2: could not find end of auto-load block');
    }
} else {
    console.log('  ⚠ Patch 2: auto-load marker not found');
}

// ─── Patch 3: Replace saveScore server call with file download ──────────────

const saveMethodMarker = '// Save score to server (skipVersion=true skips version backup for faster auto-saves)';

if (html.includes(saveMethodMarker)) {
    const methodStart = html.indexOf(saveMethodMarker);
    const nextMethodMarker = '// Load selected score from dropdown';
    const methodEnd = html.indexOf(nextMethodMarker, methodStart);
    
    if (methodEnd > methodStart) {
        const newMethod = [
            '// Save score (Performance Score: download as file)',
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
        console.log('  ✓ Patch 3: save as file download');
    } else {
        console.log('  ⚠ Patch 3: could not find next method boundary');
    }
} else {
    console.log('  ⚠ Patch 3: saveScore marker not found');
}


// ═══════════════════════════════════════════════════════════════════════════════
// STRIPS S1-S7: Remove composition-only JS systems
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n  --- JS System Strips ---');

// ─── S1: FlowchartConnector definition ──────────────────────────────────────
// Between SVGElementManager (KEEP) and StaffCursors (KEEP)
stripBetween(
    '        // Flowchart Connector System - Right-angle connectors between objects',
    '        // Staff Cursors System - Animated vertical lines for each staff',
    'S1: FlowchartConnector'
);

// ─── S2: FlowchartConnector init (separate from definition) ─────────────────
// Interleaved with KEEP system inits at lines 7063-7065
replaceOnce(
    '        // Initialize Flowchart Connector\n        FlowchartConnector.init();\n        window.FlowchartConnector = FlowchartConnector;',
    '',
    'S2: FlowchartConnector init'
);

// ─── S3: MidiController + AudioController ───────────────────────────────────
// Between GraphicTimeline (KEEP) and StaffPositions (KEEP)
// Includes both definitions and their init blocks (contiguous)
stripBetween(
    '        // MIDI Controller System - Multi-track MIDI file management and cursor-synced playback',
    '        // Staff Y Positions - Named Y coordinates for each staff relative to page',
    'S3: MidiController + AudioController'
);

// ─── S4: EditCursor ─────────────────────────────────────────────────────────
// Between GTrackSystem (KEEP) and CompositionPanel (KEEP)
// Definition + init are contiguous
stripBetween(
    '        // Edit Cursor - Neon yellow SVG line with draggable triangle handle',
    '        // Composition Panel Controls',
    'S4: EditCursor'
);

// ─── S5: MidiSnippetDatabase → MidiMotiveParser → MidiMotiveDatabase ────────
//         → MidiModelSystem → AudioClipDatabase
// Between GroupDatabase (KEEP) and ScoreManager (KEEP)
// This is the biggest contiguous strip (~4,200 lines)
stripBetween(
    '        // MIDI Snippet Database - stores MIDI file insertions as distinct objects',
    '        // ============================================\n        // SCORE MANAGER - Client-side persistence',
    'S5: MidiSnippetDB → MidiModelSystem → AudioClipDB'
);

// ─── S6: NotationManager definition ─────────────────────────────────────────
// Between ScoreManager (KEEP) and ColorMap (KEEP — used by CurveMaker, LineWedgeMaker, GCMaker)
// IMPORTANT: ColorMap is defined right before CurveMaker, must NOT be stripped
stripBetween(
    '        // ============================================\n        // NOTATION MANAGER - LilyPond SVG integration',
    '        // Color map for swatches',
    'S6: NotationManager'
);

// ─── S7: Generation Panels (ScoreAutomation → PanelSectionManager) ──────────
// Between GlissandoSystem (KEEP) and MotiveMaker area (KEEP)
// Strips: ScoreAutomation, LongToneUI, PizzTremGlissUI, VibratoUI,
//         CrescendoUI, AccelDecelUI, BartokPizzUI, BowOverpressureUI,
//         ColLegnoBattutoUI, OneShotPanelSwitcher, OneShotGCPresets,
//         PizzTremUI, NotationFragmentSystem, NotationFragmentUI, PanelSectionManager
stripBetween(
    '        // ============================================\n        // SCORE AUTOMATION',
    '        // Bring SVG elements containers to front (after curves are initialized)',
    'S7: Generation Panels'
);


// ═══════════════════════════════════════════════════════════════════════════════
// INSERTS & CLEANUPS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n  --- Inserts & Cleanups ---');

// ─── I1: Comprehensive stubs for all stripped systems ───────────────────────
// Prevents ReferenceErrors from kept systems (ScoreManager, CurveMaker, GCMaker,
// CursorControls, etc.) that reference stripped systems in callbacks or methods.
// Inserted at the very beginning of the main <script> block, before ClockSync.
const stubsBlock = `
        // ═══ Performance Score: Stripped System Stubs ═══
        // Minimal no-op objects for systems removed by build_performance_app.js.
        // Prevents ReferenceErrors from kept systems that reference stripped ones.

        function _bundleStub() {
            return {
                bundles: [], nextBundleId: 1,
                _isBundleDragging: false, _activeBundleId: null,
                init() {}, initBundleUI() {},
                importBundles() {}, exportBundles() { return { bundles: [], nextBundleId: 1 }; },
                lookupBundleByCurveId() { return null; },
                lookupBundleByGcId() { return null; },
                lookupBundleBySvgId() { return null; },
                startBundleDrag() {}, deleteBundle() {},
                deleteBundleBySvgId() {}, deleteBundleByGcId() {},
                showCurveAdjust() {}, hideCurveAdjust() {},
                syncCurveAdjustFromCurve() {}, registerBundle() {}, step() {}
            };
        }

        const FlowchartConnector = {
            connectors: [], connectMode: false, selectedConnector: null, nextId: 1,
            init() {}, importData() {}, exportData() { return { connectors: [], nextId: 1 }; },
            updateConnectionNodes() {}, updateVisibility() {}, deleteSelectedConnector() {},
            updateConnectorList() {}, updateAllConnectors() {}
        };
        window.FlowchartConnector = FlowchartConnector;

        const MidiController = {
            tracks: [{midiFile:null,enabled:true},{midiFile:null,enabled:true},{midiFile:null,enabled:true},{midiFile:null,enabled:true}],
            snippets: [], selectedSnippet: null,
            init() {}, resetPlaybackToTime() {}, renderAllMidiDisplays() {},
            reloadFromDatabase() {}, updateMidiDisplayVisibility() {},
            selectSnippet() {},
            exportData() { return this.tracks.map(() => ({ midiFile: null, enabled: true })); },
            importData() {}
        };
        window.MidiController = MidiController;

        const AudioController = {
            clips: [], selectedClip: null,
            init() {}, resetPlaybackToTime() {}, reloadFromDatabase() {},
            selectClip() {}, updateAudioDisplayVisibility() {},
            exportData() { return []; }, importData() {}
        };
        window.AudioController = AudioController;

        const EditCursor = {
            seconds: 0, positionSeconds: 0,
            init() {}, setPositionSeconds() {}, getPositionSeconds() { return 0; },
            exportData() { return { seconds: 0 }; }, importData() {}
        };
        window.EditCursor = EditCursor;

        const MidiModelSystem = { getModel: () => null, models: {}, selectedModelKey: null, init() {}, updateLongToneCurveIndicator() {} };
        window.MidiModelSystem = MidiModelSystem;

        const MidiSnippetDatabase = {
            snippets: [], nextId: 1,
            add() { return null; }, get() { return null; }, getAll() { return []; },
            remove() {}, update() {},
            exportData() { return { snippets: [], nextId: 1 }; }, importData() {}
        };
        window.MidiSnippetDatabase = MidiSnippetDatabase;

        const AudioClipDatabase = {
            clips: [], nextId: 1,
            add() { return null; }, get() { return null; }, getAll() { return []; },
            remove() {}, update() {},
            exportData() { return { clips: [], nextId: 1 }; }, importData() {}
        };
        window.AudioClipDatabase = AudioClipDatabase;

        const NotationManager = {
            init() {}, exportData() { return { notations: [], nextId: 1 }; },
            importData() {}, reloadPlacedNotations() {}
        };
        window.NotationManager = NotationManager;

        const ScoreAutomation = { init() {}, workflowLog: [], lastWorkflow: null };
        window.ScoreAutomation = ScoreAutomation;

        const CrescendoUI = _bundleStub(); window.CrescendoUI = CrescendoUI;
        const AccelDecelUI = _bundleStub(); window.AccelDecelUI = AccelDecelUI;
        const BartokPizzUI = _bundleStub(); window.BartokPizzUI = BartokPizzUI;
        const BowOverpressureUI = _bundleStub(); window.BowOverpressureUI = BowOverpressureUI;
        const ColLegnoBattutoUI = _bundleStub(); window.ColLegnoBattutoUI = ColLegnoBattutoUI;
        const PizzTremGlissUI = _bundleStub(); window.PizzTremGlissUI = PizzTremGlissUI;
        const VibratoUI = _bundleStub(); window.VibratoUI = VibratoUI;
        const PizzTremUI = _bundleStub(); window.PizzTremUI = PizzTremUI;
        const NotationFragmentSystem = Object.assign(_bundleStub(), { db: null });
        window.NotationFragmentSystem = NotationFragmentSystem;

        const LongToneUI = { init() {} }; window.LongToneUI = LongToneUI;
        const OneShotPanelSwitcher = { init() {} }; window.OneShotPanelSwitcher = OneShotPanelSwitcher;
        const PanelSectionManager = { init() {} }; window.PanelSectionManager = PanelSectionManager;

`;

replaceOnce(
    '        // Clock Sync System',
    stubsBlock + '        // Clock Sync System',
    'I1: Stripped system stubs (all)'
);

// ─── C1: Remove NotationManager init at end of file ─────────────────────────
// These lines are after ScoreManager init, near the closing </script>
replaceOnce(
    '        // Initialize Notation Manager and register with ScoreManager\n        NotationManager.init();\n        window.NotationManager = NotationManager;\n        ScoreManager.registerNotationSource();',
    '        // NotationManager stripped for Performance Score',
    'C1: NotationManager init cleanup'
);

// ─── I2: CSS to hide composition panel ──────────────────────────────────────
// The panel is already off-screen by default (translateX(-100%)).
// This ensures the toggle button is hidden and the panel can't be opened.
// Also hides MIDI-specific elements in the right panel.
const perfCss = [
    '        /* Performance Score: hide composition-only UI */',
    '        #compositionPanelToggle { display: none !important; }',
    '        #compositionPanel { transform: translateX(-100%) !important; pointer-events: none; }',
    '        /* Hide edit cursor input */',
    '        #editCursorSecondsInput { display: none; }',
    '        /* Right panel: hide Playback section items except Play button */',
    '        #midiTimecode { display: none !important; }',
    '        .track-enable-group { display: none !important; }',
    '        #midiEventCount { display: none !important; }',
    '        /* Right panel: hide MIDI Devices, MIDI File, Audio File sections */',
    '        #cursorMenuContent .menu-section:has(#midiInputSelect) { display: none !important; }',
    '        #cursorMenuContent .menu-section:has(#midiLoadBtn) { display: none !important; }',
    '        #cursorMenuContent .menu-section:has(#audioLoadBtn) { display: none !important; }',
    '        /* Right panel: hide MIDI Display, Audio Display, CC Display in Display section */',
    '        #showMidiDisplay, label[for="showMidiDisplay"] { display: none !important; }',
    '        #showAudioDisplay, label[for="showAudioDisplay"] { display: none !important; }',
    '        #ccDisplaySelect, label[for="ccDisplaySelect"] { display: none !important; }',
    '        #cursorMenuContent .control-row:has(#ccDisplaySelect) { display: none !important; }',
    '        /* Right panel: hide Score File section */',
    '        #cursorMenuContent .menu-section:has(#scoreSaveBtn) { display: none !important; }'
].join('\n');

// Insert CSS just before </style>
replaceOnce(
    '    </style>',
    perfCss + '\n    </style>',
    'I2: Performance Score CSS overrides'
);

// ─── P7: Rename right panel toggle from "Playback-MIDI" to "Playback" ─────
html = html.replace(/Playback-MIDI/g, 'Playback');
patchCount++;
console.log('  \u2713 P7: Rename Playback-MIDI → Playback');

// ─── P4-P6: Guard API fetch calls that return 404 in standalone mode ───────
console.log('\n  --- API Fetch Guards ---');

// P4: Suppress curve library fetch (no server)
replaceOnce(
    "const response = await fetch('/api/curve-library/list');",
    "return; // Performance Score: no server\n                    const response = await fetch('/api/curve-library/list');",
    'P4: Suppress curve-library fetch'
);

// P5: Suppress GC library fetch (no server)
replaceOnce(
    "const response = await fetch('/api/gc-library/list');",
    "return; // Performance Score: no server\n                    const response = await fetch('/api/gc-library/list');",
    'P5: Suppress gc-library fetch'
);

// P6: Suppress score list fetch (no server)
replaceOnce(
    "const response = await fetch('/api/scores');",
    "return; // Performance Score: no server\n                    const response = await fetch('/api/scores');",
    'P6: Suppress scores fetch'
);


// ═══════════════════════════════════════════════════════════════════════════════
// WRITE OUTPUT FILES
// ═══════════════════════════════════════════════════════════════════════════════

// Write patched HTML
const outputPath = path.join(outputDir, 'index.html');
fs.writeFileSync(outputPath, html);
const patchedSize = html.length;

// Copy score JSON as score.json
const scoreOutputPath = path.join(outputDir, 'score.json');
fs.copyFileSync(scoreJsonPath, scoreOutputPath);
const scoreSize = fs.statSync(scoreOutputPath).size;

// Copy staff header SVGs (referenced by StaffCursors for instrument labels)
const lilypondSrc = path.join(__dirname, '..', 'lilypond_code');
const lilypondDst = path.join(outputDir, 'lilypond_code');
fs.mkdirSync(lilypondDst, { recursive: true });
const staffSvgs = [
    'violin1_staff_label.cropped.svg',
    'violin2_staff_header.cropped.svg',
    'viola_staff_header.cropped.svg',
    'cello_staff_header.cropped.svg'
];
let svgsCopied = 0;
for (const svg of staffSvgs) {
    const src = path.join(lilypondSrc, svg);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(lilypondDst, svg));
        svgsCopied++;
    } else {
        console.log('  \u26A0 Staff SVG not found: ' + svg);
    }
}
console.log('  \u2713 Copied ' + svgsCopied + '/' + staffSvgs.length + ' staff header SVGs');

// Copy pitchesSVGs directory (glissando pitch follower + static pitch markers)
const pitchesSrc = path.join(__dirname, '..', 'public', 'pitchesSVGs');
const pitchesDst = path.join(outputDir, 'pitchesSVGs');
let pitchSvgsCopied = 0;
if (fs.existsSync(pitchesSrc)) {
    const clefDirs = ['treble', 'alto', 'bass'];
    for (const clef of clefDirs) {
        const clefSrc = path.join(pitchesSrc, clef);
        const clefDst = path.join(pitchesDst, clef);
        if (fs.existsSync(clefSrc)) {
            fs.mkdirSync(clefDst, { recursive: true });
            const files = fs.readdirSync(clefSrc).filter(f => f.endsWith('.svg'));
            for (const file of files) {
                fs.copyFileSync(path.join(clefSrc, file), path.join(clefDst, file));
                pitchSvgsCopied++;
            }
        }
    }
    console.log('  \u2713 Copied ' + pitchSvgsCopied + ' pitch SVGs (3 clefs)');
} else {
    console.log('  \u26A0 pitchesSVGs directory not found');
}

console.log('\n═══ Build Complete ═══');
console.log('  Patches applied: ' + patchCount);
console.log('  Strips applied: ' + stripCount + '/7');
console.log('  Original: ' + (originalSize / 1024).toFixed(0) + ' KB');
console.log('  Stripped: ' + (patchedSize / 1024).toFixed(0) + ' KB');
console.log('  Removed:  ' + ((originalSize - patchedSize) / 1024).toFixed(0) + ' KB (' + ((1 - patchedSize / originalSize) * 100).toFixed(1) + '%)');
console.log('  score.json: ' + (scoreSize / 1024 / 1024).toFixed(2) + ' MB');
console.log('\nTo serve:');
console.log('  node -e "const h=require(\'http\'),f=require(\'fs\'),p=require(\'path\'),d=\'' + outputDir.replace(/\\/g, '/') + '\',m={\'.html\':\'text/html\',\'.json\':\'application/json\',\'.css\':\'text/css\',\'.svg\':\'image/svg+xml\'};h.createServer((q,r)=>{let u=q.url.split(\'?\')[0];if(u===\'/\')u=\'/index.html\';const fp=p.join(d,decodeURIComponent(u)),e=p.extname(fp);if(!f.existsSync(fp)){r.writeHead(404);r.end(\'Not found\');return}r.writeHead(200,{\'Content-Type\':m[e]||\'application/octet-stream\'});f.createReadStream(fp).pipe(r)}).listen(3001,()=>console.log(\'http://localhost:3001\'))"');
console.log('');
