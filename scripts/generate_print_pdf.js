#!/usr/bin/env node
/**
 * generate_print_pdf.js — Phase 4: Print Score PDF via Puppeteer
 *
 * Captures the Performance Score app rendering as a multi-page vector PDF.
 * Uses the actual app for guaranteed fidelity — same colors, layout, everything.
 *
 * Usage:
 *   node scripts/generate_print_pdf.js                  # Full score PDF
 *   node scripts/generate_print_pdf.js --track 1        # Violin I part
 *   node scripts/generate_print_pdf.js --track 2        # Violin II part
 *   node scripts/generate_print_pdf.js --track 3        # Viola part
 *   node scripts/generate_print_pdf.js --track 4        # Cello part
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

for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--track' && process.argv[i + 1]) {
        trackFilter = parseInt(process.argv[i + 1]);
        i++;
    } else if (process.argv[i] === '--pages' && process.argv[i + 1]) {
        pagesParam = parseInt(process.argv[i + 1]);
        i++;
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

// ─── Main capture function ───────────────────────────────────────────────────

async function capture() {
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

        // Build URL
        let url = 'http://localhost:' + PORT;
        if (trackFilter) {
            url += '?track=' + trackFilter + '&pages=' + pagesParam;
        }

        console.log('  Navigating to: ' + url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for the app to fully initialize
        console.log('  Waiting for app initialization...');
        await page.waitForFunction(function() {
            if (typeof SVGElementManager === 'undefined') return false;
            if (!SVGElementManager.elements || SVGElementManager.elements.length === 0) return false;
            var sc = document.getElementById('ScoreContainer');
            if (!sc || sc.clientHeight === 0) return false;
            return true;
        }, { timeout: 15000 });

        // Inject print CSS — hide UI panels, toggle handles, and canvas cursors
        await page.addStyleTag({ content: [
            '#compositionPanel { display: none !important; }',
            '#cursorMenu { display: none !important; }',
            'canvas { display: none !important; }',
        ].join('\n') });
        console.log('  Print CSS injected (panels + canvases hidden)');

        // Force screen media so SVGs render normally in page.pdf()
        await page.emulateMediaType('screen');

        // Additional settle time for rendering
        await new Promise(function(r) { setTimeout(r, 1500); });

        // ─── Stage 1: Single screenshot test ─────────────────────────────
        const screenshotPath = path.join(OUTPUT_DIR, 'stage1_test.png');
        const container = await page.$('#ScoreContainer');
        if (!container) {
            throw new Error('#ScoreContainer not found in page');
        }

        await container.screenshot({ path: screenshotPath });
        const stats = fs.statSync(screenshotPath);
        console.log('\n  ✓ Stage 1 screenshot captured');
        console.log('    Path: ' + screenshotPath);
        console.log('    Size: ' + (stats.size / 1024).toFixed(1) + ' KB');

        // Report app state
        const appState = await page.evaluate(function() {
            var result = {
                svgElements: SVGElementManager.elements ? SVGElementManager.elements.length : 0,
                containerWidth: document.getElementById('ScoreContainer').clientWidth,
                containerHeight: document.getElementById('ScoreContainer').clientHeight,
            };
            if (typeof CurveMaker !== 'undefined' && CurveMaker.curves) {
                result.curves = CurveMaker.curves.length;
            }
            if (typeof GCMaker !== 'undefined' && GCMaker.gcs) {
                result.gcs = GCMaker.gcs.length;
            }
            if (typeof PM !== 'undefined' && PM.sections) {
                result.partsMode = true;
                result.sections = PM.sections.length;
            }
            return result;
        });

        console.log('    App state:');
        console.log('      SVG elements: ' + appState.svgElements);
        console.log('      Container: ' + appState.containerWidth + '×' + appState.containerHeight);
        if (appState.curves !== undefined) console.log('      Curves: ' + appState.curves);
        if (appState.gcs !== undefined) console.log('      GCs: ' + appState.gcs);
        if (appState.partsMode) console.log('      Parts mode: ' + appState.sections + ' sections');

        console.log('\n═══ Stage 1 Complete ═══');
        console.log('  Verify screenshot at: ' + screenshotPath);

        // ─── Stage 2: Page navigation test ───────────────────────────────

        // Helper: navigate to a page pair and wait for render
        // onGoto calculates: targetPage = floor(seconds / secondsPerPage)
        // Even targetPage → top=page, bottom=page+1 (future) — correct pair
        // Odd targetPage  → bottom=page, top=page+1 (future) — WRONG pair
        // So we must land exactly on the even page: seconds = pairIndex * 2 * spp
        async function navigateToPagePair(pg, pairIndex) {
            var targetSeconds = pairIndex * 2 * secondsPerPage;

            await pg.evaluate(function(sec) {
                ClockSync.socket.emit('scoreGoto', { seconds: sec });
            }, targetSeconds);

            // Wait for render
            await new Promise(function(r) { setTimeout(r, 1200); });

            var pageState = await pg.evaluate(function() {
                return {
                    top: typeof GraphicTimeline !== 'undefined' ? GraphicTimeline.currentTopPage : -1,
                    bottom: typeof GraphicTimeline !== 'undefined' ? GraphicTimeline.currentBottomPage : -1
                };
            });
            return pageState;
        }

        console.log('\n─── Stage 2: Page Navigation Test ───');

        // Test A: boundary pairs (first, middle, last)
        console.log('  Test A: boundary pairs');
        var boundaryPairs = [0, Math.floor(pagePairs / 2), pagePairs - 1];
        for (var ti = 0; ti < boundaryPairs.length; ti++) {
            var pairIdx = boundaryPairs[ti];
            var ps = await navigateToPagePair(page, pairIdx);
            var fname = 'stage2_pair' + pairIdx + '.png';
            var fpath = path.join(OUTPUT_DIR, fname);
            await container.screenshot({ path: fpath });
            var fsize = fs.statSync(fpath).size;
            var expectedTop = pairIdx * 2;
            var expectedBot = pairIdx * 2 + 1;
            var match = (ps.top === expectedTop && ps.bottom === expectedBot) ? '✓' : '✗ MISMATCH';
            console.log('    Pair ' + pairIdx + ': top=' + ps.top + ' bottom=' + ps.bottom +
                ' (expect ' + expectedTop + '/' + expectedBot + ') ' + match +
                ' → ' + (fsize / 1024).toFixed(1) + ' KB');
        }

        // Test B: consecutive pairs (5,6,7,8) — verify each advances by 2 pages
        console.log('  Test B: consecutive pairs (verify +2 page advance)');
        var consecStart = 5;
        var consecCount = 4;
        var prevTop = -1, prevBot = -1;
        var allCorrect = true;
        for (var ci = 0; ci < consecCount; ci++) {
            var pairIdx = consecStart + ci;
            var ps = await navigateToPagePair(page, pairIdx);
            var fname = 'stage2_consec' + pairIdx + '.png';
            var fpath = path.join(OUTPUT_DIR, fname);
            await container.screenshot({ path: fpath });
            var fsize = fs.statSync(fpath).size;
            var expectedTop = pairIdx * 2;
            var expectedBot = pairIdx * 2 + 1;
            var pageOk = (ps.top === expectedTop && ps.bottom === expectedBot);
            var advanceOk = (prevTop === -1) || (ps.top === prevTop + 2 && ps.bottom === prevBot + 2);
            if (!pageOk || !advanceOk) allCorrect = false;
            var status = (pageOk && advanceOk) ? '✓' : '✗';
            console.log('    Pair ' + pairIdx + ': top=' + ps.top + ' bottom=' + ps.bottom +
                ' (expect ' + expectedTop + '/' + expectedBot + ') ' + status +
                ' → ' + (fsize / 1024).toFixed(1) + ' KB');
            prevTop = ps.top;
            prevBot = ps.bottom;
        }
        if (allCorrect) {
            console.log('  ✓ All consecutive pairs advance by exactly 2 pages');
        } else {
            console.log('  ✗ Page advance error detected — check navigation');
        }

        console.log('\n═══ Stage 2 Complete ═══');
        console.log('  Screenshots in: ' + OUTPUT_DIR);
        console.log('  Please verify: pair0 (first), pair' + (pagePairs-1) + ' (last), consec5-8 (consecutive)');

        // ─── Stage 3: Full vector PDF assembly ──────────────────────────

        console.log('\n─── Stage 3: Full Vector PDF (' + pagePairs + ' page pairs) ───');

        // Collect single-page PDF buffers, then merge with pdf-lib
        var pageBuffers = [];

        for (var pi = 0; pi < pagePairs; pi++) {
            // Navigate using the corrected helper
            await navigateToPagePair(page, pi);

            // Capture as vector PDF (one page)
            var buf = await page.pdf({
                width: VIEWPORT_WIDTH + 'px',
                height: VIEWPORT_HEIGHT + 'px',
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 }
            });
            pageBuffers.push(buf);

            // Progress
            if ((pi + 1) % 8 === 0 || pi === pagePairs - 1) {
                process.stdout.write('  Captured ' + (pi + 1) + '/' + pagePairs + '\r');
            }
        }
        console.log('');

        // Merge all single-page PDFs into one document
        console.log('  Merging ' + pageBuffers.length + ' pages...');
        var mergedPdf = await PDFDocument.create();
        for (var mi = 0; mi < pageBuffers.length; mi++) {
            var srcDoc = await PDFDocument.load(pageBuffers[mi]);
            var copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
            copiedPages.forEach(function(pg) { mergedPdf.addPage(pg); });
        }

        // Save PDF
        var pdfFileName = trackFilter
            ? (TRACK_NAMES[trackFilter] || 'Track' + trackFilter) + '_part.pdf'
            : 'full_score.pdf';
        var pdfPath = path.join(OUTPUT_DIR, pdfFileName);
        var pdfBytes = await mergedPdf.save();
        fs.writeFileSync(pdfPath, pdfBytes);

        var pdfSizeKB = pdfBytes.length / 1024;
        var pdfSizeMB = pdfSizeKB / 1024;
        console.log('  ✓ Vector PDF saved: ' + pdfPath);
        console.log('    Pages: ' + mergedPdf.getPageCount());
        console.log('    Size: ' + (pdfSizeMB > 1 ? pdfSizeMB.toFixed(1) + ' MB' : pdfSizeKB.toFixed(0) + ' KB'));
        console.log('    Format: Vector (SVG paths preserved — infinite resolution)');

        console.log('\n═══ Stage 3 Complete ═══');

    } catch (err) {
        console.error('\n  ✗ Error: ' + err.message);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        server.close();
        console.log('  Server stopped, browser closed.');
    }
}

capture();
