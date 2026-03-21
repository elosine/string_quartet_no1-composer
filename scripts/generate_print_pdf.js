#!/usr/bin/env node
/**
 * generate_print_pdf.js — Phase 4: Print Score PDF via Puppeteer
 *
 * Captures the Performance Score app rendering as a multi-page vector PDF.
 * Uses the actual app for guaranteed fidelity — same colors, layout, everything.
 *
 * Usage:
 *   node scripts/generate_print_pdf.js                          # Full score PDF
 *   node scripts/generate_print_pdf.js --track 1 --pages 6      # Violin I, 6 pages/screen
 *   node scripts/generate_print_pdf.js --track 2 --pages 4      # Violin II, 4 pages/screen
 *   node scripts/generate_print_pdf.js --all                    # All variants (full + 4 tracks × 3 densities)
 *
 * Prerequisites:
 *   - Run `node scripts/build_performance_app.js` first
 *   - builds/performance/ must contain index.html and score.json
 */

const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PERF_DIR = path.join(ROOT, 'builds', 'performance');
const OUTPUT_DIR = path.join(ROOT, 'builds', 'print');
const PORT = 3002; // Different port from dev server to avoid conflicts

const TRACK_NAMES = { 1: 'Violin_I', 2: 'Violin_II', 3: 'Viola', 4: 'Cello' };

// Viewport: 4:3 aspect ratio matching #ScoreContainer
const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 1200;


// ─── Parse CLI args ──────────────────────────────────────────────────────────

let trackFilter = null;
let pagesParam = 6;
let generateAll = false;

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--track' && process.argv[i + 1]) {
        trackFilter = parseInt(process.argv[i + 1]);
        i++;
    } else if (process.argv[i] === '--pages' && process.argv[i + 1]) {
        pagesParam = parseInt(process.argv[i + 1]);
        i++;
    } else if (process.argv[i] === '--all') {
        generateAll = true;
    }
}

// ─── Validate prerequisites ──────────────────────────────────────────────────

if (!fs.existsSync(path.join(PERF_DIR, 'index.html'))) {
    console.error('builds/performance/index.html not found.');
    console.error('Run: node scripts/build_performance_app.js');
    process.exit(1);
}

if (!fs.existsSync(path.join(PERF_DIR, 'score.json'))) {
    console.error('builds/performance/score.json not found.');
    process.exit(1);
}

// ─── Calculate timing from score data ────────────────────────────────────────

const scoreData = JSON.parse(fs.readFileSync(path.join(PERF_DIR, 'score.json'), 'utf8'));
const tempoEntry = scoreData.tempoHistory && scoreData.tempoHistory['0'];
const beatsPerMinute = (tempoEntry && tempoEntry.bpm) || 60;
const beatsPerPage = (tempoEntry && tempoEntry.beatsPerPage) || 8;
const secondsPerPage = (60 / beatsPerMinute) * beatsPerPage;
const leadInSeconds = 2;

// Find max END time from all elements (onset + duration, or endSeconds)
let maxSeconds = 0;
if (scoreData.svgElements) {
    for (const el of scoreData.svgElements) {
        const start = (el.referenceSeconds || 0) + (el.offsetSeconds || 0);
        const end = el.endSeconds || (start + (el.durationSeconds || 0));
        if (end > maxSeconds) maxSeconds = end;
    }
}
const db = scoreData.databases || {};
if (db.curves && db.curves.curves) {
    for (const c of db.curves.curves) {
        const end = c.endSeconds || ((c.startSeconds || 0) + (c.durationSeconds || 0));
        if (end > maxSeconds) maxSeconds = end;
    }
}
if (db.gcs && db.gcs.gcs) {
    for (const g of db.gcs.gcs) {
        if ((g.impactSeconds || 0) > maxSeconds) maxSeconds = g.impactSeconds;
    }
}
if (db.lineWedges && db.lineWedges.lineWedges) {
    for (const lw of db.lineWedges.lineWedges) {
        const end = lw.endSeconds || ((lw.startSeconds || 0) + (lw.durationSeconds || 0));
        if (end > maxSeconds) maxSeconds = end;
    }
}

const totalPages = Math.ceil((maxSeconds + leadInSeconds) / secondsPerPage);
const pagePairs = Math.ceil(totalPages / 2);

console.log('\n═══ Print Score PDF Generator ═══');
console.log('  Tempo: ' + beatsPerMinute + ' BPM, ' + beatsPerPage + ' beats/page');
console.log('  Seconds per page: ' + secondsPerPage);
console.log('  Max score time: ' + maxSeconds.toFixed(1) + 's');
console.log('  Total pages: ' + totalPages);
console.log('  Page pairs (full score): ' + pagePairs);
if (trackFilter) {
    console.log('  Track filter: ' + trackFilter + ' (' + (TRACK_NAMES[trackFilter] || 'Unknown') + ')');
    console.log('  Pages param: ' + pagesParam);
}

// ─── MIME types for local server ─────────────────────────────────────────────

const MIME_TYPES = {
    '.html': 'text/html',
    '.json': 'application/json',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
};

// ─── Start local HTTP server ─────────────────────────────────────────────────

function startServer() {
    return new Promise(function(resolve, reject) {
        const server = http.createServer(function(req, res) {
            let url = req.url.split('?')[0];
            if (url === '/') url = '/index.html';
            const filePath = path.join(PERF_DIR, decodeURIComponent(url));
            const ext = path.extname(filePath);

            if (!fs.existsSync(filePath)) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }

            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });

        server.listen(PORT, function() {
            console.log('  Server started on http://localhost:' + PORT);
            resolve(server);
        });

        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') {
                console.error('Port ' + PORT + ' already in use.');
            }
            reject(err);
        });
    });
}

// ─── Print CSS ──────────────────────────────────────────────────────────────

const PRINT_CSS = [
    '#compositionPanel { display: none !important; }',
    '#compositionPanelToggle { display: none !important; }',
    '#cursorMenu { display: none !important; }',
    '#cursorMenuToggle { display: none !important; }',
    'canvas { display: none !important; }',
    'body { background: white !important; }',
].join('\n');

// ─── Helper: initialize a page for PDF capture ─────────────────────────────

async function initPage(page, track, pages) {
    var url = 'http://localhost:' + PORT;
    if (track) {
        url += '?track=' + track + '&pages=' + pages;
    }

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Wait for core systems
    await page.waitForFunction(function() {
        if (typeof SVGElementManager === 'undefined') return false;
        if (!SVGElementManager.elements || SVGElementManager.elements.length === 0) return false;
        var sc = document.getElementById('ScoreContainer');
        if (!sc || sc.clientHeight === 0) return false;
        return true;
    }, { timeout: 15000 });

    // Parts mode: also wait for PartsMode initialization
    if (track) {
        await page.waitForFunction(function() {
            return typeof PartsMode !== 'undefined' && PartsMode.active === true;
        }, { timeout: 10000 });
    }

    await page.addStyleTag({ content: PRINT_CSS });
    await page.emulateMediaType('screen');
    await new Promise(function(r) { setTimeout(r, 1500); });
}

// ─── Helper: navigate to a screen and wait for render ───────────────────────
// Full score: pagesPerScreen=2, screenIndex*2*spp → shows 2 pages
// Parts mode: pagesPerScreen=4/6/8, screenIndex*M*spp → shows M pages

async function navigateToScreen(pg, screenIndex, pagesPerScreen) {
    var targetSeconds = screenIndex * pagesPerScreen * secondsPerPage;

    await pg.evaluate(function(sec) {
        ClockSync.socket.emit('scoreGoto', { seconds: sec });
    }, targetSeconds);

    await new Promise(function(r) { setTimeout(r, 1200); });
}

// ─── Generate one PDF variant ───────────────────────────────────────────────

async function generateOnePDF(page, track, pages) {
    var pagesPerScreen = track ? pages : 2;
    var totalScreens = Math.ceil(totalPages / pagesPerScreen);
    var label = track
        ? TRACK_NAMES[track] + '_' + pages + 'pages'
        : 'full_score';
    var pdfFileName = label + '.pdf';

    console.log('\n─── Generating: ' + label + ' (' + totalScreens + ' screens, ' +
        pagesPerScreen + ' pages/screen) ───');

    // Initialize page with correct URL params
    await initPage(page, track, pages);

    // Collect single-page PDF buffers
    var pageBuffers = [];
    for (var si = 0; si < totalScreens; si++) {
        await navigateToScreen(page, si, pagesPerScreen);

        var buf = await page.pdf({
            width: VIEWPORT_WIDTH + 'px',
            height: VIEWPORT_HEIGHT + 'px',
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
        });
        pageBuffers.push(buf);

        if ((si + 1) % 4 === 0 || si === totalScreens - 1) {
            process.stdout.write('  Captured ' + (si + 1) + '/' + totalScreens + '\r');
        }
    }
    console.log('');

    // Merge into one PDF
    console.log('  Merging ' + pageBuffers.length + ' pages...');
    var mergedPdf = await PDFDocument.create();
    for (var mi = 0; mi < pageBuffers.length; mi++) {
        var srcDoc = await PDFDocument.load(pageBuffers[mi]);
        var copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(function(pg) { mergedPdf.addPage(pg); });
    }

    var pdfPath = path.join(OUTPUT_DIR, pdfFileName);
    var pdfBytes = await mergedPdf.save();
    fs.writeFileSync(pdfPath, pdfBytes);

    var pdfSizeMB = pdfBytes.length / (1024 * 1024);
    var pdfSizeKB = pdfBytes.length / 1024;
    console.log('  ✓ ' + pdfFileName + ' — ' + mergedPdf.getPageCount() + ' pages, ' +
        (pdfSizeMB > 1 ? pdfSizeMB.toFixed(1) + ' MB' : pdfSizeKB.toFixed(0) + ' KB'));

    return { file: pdfFileName, pages: mergedPdf.getPageCount(), bytes: pdfBytes.length };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    const server = await startServer();
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    let browser;
    try {
        console.log('\n  Launching browser...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--window-size=' + VIEWPORT_WIDTH + ',' + VIEWPORT_HEIGHT,
                '--no-sandbox',
                '--disable-setuid-sandbox',
            ],
        });

        const page = await browser.newPage();
        await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT });

        if (generateAll) {
            // ─── Batch mode: full score + 4 tracks × 3 densities = 13 PDFs ──
            console.log('\n═══ Batch Mode: Generating all PDF variants ═══');

            var variants = [
                { track: null, pages: null },  // full score
            ];
            for (var t = 1; t <= 4; t++) {
                for (var p = 0; p < 3; p++) {
                    variants.push({ track: t, pages: [4, 6, 8][p] });
                }
            }

            var results = [];
            for (var vi = 0; vi < variants.length; vi++) {
                var v = variants[vi];
                var result = await generateOnePDF(page, v.track, v.pages);
                results.push(result);
            }

            console.log('\n═══ Batch Complete: ' + results.length + ' PDFs generated ═══');
            var totalBytes = 0;
            results.forEach(function(r) {
                totalBytes += r.bytes;
                console.log('  ' + r.file + ' — ' + r.pages + ' pages');
            });
            console.log('  Total: ' + (totalBytes / (1024 * 1024)).toFixed(1) + ' MB');

        } else {
            // ─── Single variant mode ────────────────────────────────────────
            await generateOnePDF(page, trackFilter, pagesParam);
        }

    } catch (err) {
        console.error('\n  ✗ Error: ' + err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        server.close();
        console.log('  Server stopped, browser closed.');
    }
}

main();
