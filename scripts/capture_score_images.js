#!/usr/bin/env node
/**
 * capture_score_images.js — Capture score region screenshots for notation instructions
 *
 * Navigates the Performance Score app to a specific time and captures a high-DPI
 * screenshot of a track-band region (SVGs + canvas overlays including curves/GCs).
 *
 * Usage:
 *   node scripts/capture_score_images.js --from 0 --to 4 --track 3 --name viola_opening
 *   node scripts/capture_score_images.js --from 12 --to 14 --track 1-2 --name vln_duet
 *   node scripts/capture_score_images.js --from 0 --to 8 --name full_page_start
 *   node scripts/capture_score_images.js --from 45 --to 50 --track 3-4 --name lower_strings --padding 40
 *
 * Options:
 *   --from N       Start of time range in seconds (required)
 *   --to N         End of time range in seconds (required)
 *   --name STR     Output filename without extension (required)
 *   --track N      Single track: 1,2,3,4 or range: 1-2, 3-4, 1-4 (default: 1-4, all tracks)
 *   --padding N    Extra pixels (at 1x) around the region (default: 20)
 *   --scale N      Device scale factor for DPI (default: 3, i.e. ~300 DPI)
 *   --minimap      Include the MiniMap bar in the capture
 *   --svg          Output as SVG (vector) instead of PNG
 *   --playat N     Inject cursor/meter/follower/dial at display second N
 *                  SVG: computed from curve data (no server needed)
 *                  PNG+url: captured from live playback state
 *   --url URL      Connect to an already-running server instead of starting a local one
 *                  (e.g. --url http://localhost:3000 for the dev server)
 *
 * Output: docs/notation_instructions/images/<name>.png (or .svg)
 *
 * Prerequisites:
 *   - Run `node scripts/build_performance_app.js` first
 *   - builds/performance/ must contain index.html and score.json
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PERF_DIR = path.join(ROOT, 'builds', 'performance');
const OUTPUT_DIR = path.join(ROOT, 'docs', 'notation_instructions', 'images');
const PORT = 3003;

const VIEWPORT_WIDTH = 1600;
const VIEWPORT_HEIGHT = 1200;
const LEAD_IN_SECONDS = 2; // Score lead-in: display second 0 = score time 2s

// ─── Parse CLI args ──────────────────────────────────────────────────────────

let fromSeconds = null;
let toSeconds = null;
let outputName = null;
let trackRange = [1, 4]; // default: all tracks
let padding = 20;
let scaleFactor = 3;
let showMinimap = false;
let outputSVG = false;
let playAtSeconds = null;
let serverUrl = null;

for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    const next = process.argv[i + 1];
    if (arg === '--from' && next) { fromSeconds = parseFloat(next); i++; }
    else if (arg === '--to' && next) { toSeconds = parseFloat(next); i++; }
    else if (arg === '--name' && next) { outputName = next; i++; }
    else if (arg === '--track' && next) {
        if (next.includes('-')) {
            const parts = next.split('-').map(Number);
            trackRange = [parts[0], parts[1]];
        } else {
            const t = parseInt(next);
            trackRange = [t, t];
        }
        i++;
    }
    else if (arg === '--padding' && next) { padding = parseInt(next); i++; }
    else if (arg === '--scale' && next) { scaleFactor = parseInt(next); i++; }
    else if (arg === '--minimap') { showMinimap = true; }
    else if (arg === '--svg') { outputSVG = true; }
    else if (arg === '--playat' && next) { playAtSeconds = parseFloat(next); i++; }
    else if (arg === '--url' && next) { serverUrl = next; i++; }
}

if (fromSeconds === null || toSeconds === null || !outputName) {
    console.error('Usage: node scripts/capture_score_images.js --from N --to N --name NAME');
    console.error('');
    console.error('Required:');
    console.error('  --from N       Start seconds');
    console.error('  --to N         End seconds');
    console.error('  --name STR     Output filename (no extension)');
    console.error('');
    console.error('Optional:');
    console.error('  --track N      Single track (1-4) or range (e.g. 3-4). Default: all');
    console.error('  --padding N    Extra pixels around region (default: 20)');
    console.error('  --scale N      DPI multiplier (default: 3)');
    console.error('  --minimap      Show MiniMap bar');
    console.error('  --svg          Output vector SVG instead of PNG');
    console.error('  --playat N     Capture at display second N during playback (shows follower/meter)');
    console.error('  --url URL      Connect to running server (e.g. http://localhost:3000)');
    process.exit(1);
}

// ─── Validate ────────────────────────────────────────────────────────────────

if (!fs.existsSync(path.join(PERF_DIR, 'index.html'))) {
    console.error('builds/performance/index.html not found. Run build_performance_app.js first.');
    process.exit(1);
}

// ─── MIME types ──────────────────────────────────────────────────────────────

const MIME_TYPES = {
    '.html': 'text/html', '.json': 'application/json', '.css': 'text/css',
    '.js': 'application/javascript', '.svg': 'image/svg+xml', '.png': 'image/png',
    '.woff2': 'font/woff2', '.woff': 'font/woff',
};

// ─── CSS to hide UI (keep canvases visible for curves/GCs) ──────────────────

function getCaptureCSS() {
    var rules = [
        '#controlsOverlay { display: none !important; }',
        '#syncModeIndicator { display: none !important; }',
        '#annotationToggle { display: none !important; }',
        '#annotationToolbar { display: none !important; }',
        '#compositionPanel { display: none !important; }',
        '#compositionPanelToggle { display: none !important; }',
        '#cursorMenu { display: none !important; }',
        '#cursorMenuToggle { display: none !important; }',
        'body { background: white !important; }',
    ];
    if (!showMinimap) {
        rules.push('#miniMapBar { display: none !important; }');
    }
    return rules.join('\n');
}

// ─── Local HTTP server ──────────────────────────────────────────────────────

function startServer() {
    return new Promise(function(resolve, reject) {
        var server = http.createServer(function(req, res) {
            var url = req.url.split('?')[0];
            if (url === '/') url = '/index.html';
            var filePath = path.join(PERF_DIR, decodeURIComponent(url));
            var ext = path.extname(filePath);
            if (!fs.existsSync(filePath)) {
                res.writeHead(404); res.end('Not found'); return;
            }
            res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        server.listen(PORT, function() { resolve(server); });
        server.on('error', function(err) {
            if (err.code === 'EADDRINUSE') console.error('Port ' + PORT + ' in use');
            reject(err);
        });
    });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    var trackLabel = trackRange[0] === trackRange[1]
        ? 'track ' + trackRange[0]
        : 'tracks ' + trackRange[0] + '-' + trackRange[1];

    console.log('\n═══ Score Image Capture ═══');
    console.log('  Time: ' + fromSeconds + 's → ' + toSeconds + 's');
    console.log('  Region: ' + trackLabel);
    console.log('  Padding: ' + padding + 'px');
    console.log('  Format: ' + (outputSVG ? 'SVG (vector)' : 'PNG ' + scaleFactor + 'x'));
    if (playAtSeconds !== null) console.log('  Play-at: ' + playAtSeconds + 's (capture during playback)');
    console.log('  Output: ' + outputName + (outputSVG ? '.svg' : '.png'));

    var server = null;
    var connectUrl;
    if (serverUrl) {
        connectUrl = serverUrl;
        console.log('  Connecting to: ' + serverUrl);
    } else {
        server = await startServer();
        connectUrl = 'http://localhost:' + PORT;
    }
    var browser;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--window-size=' + VIEWPORT_WIDTH + ',' + VIEWPORT_HEIGHT,
                   '--no-sandbox', '--disable-setuid-sandbox'],
        });

        var page = await browser.newPage();
        await page.setViewport({
            width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT,
            deviceScaleFactor: scaleFactor,
        });

        // Load the performance app
        console.log('  Loading app...');
        await page.goto(connectUrl, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for core systems to initialize
        await page.waitForFunction(function() {
            if (typeof SVGElementManager === 'undefined') return false;
            if (!SVGElementManager.elements || SVGElementManager.elements.length === 0) return false;
            if (typeof StaffCursors === 'undefined') return false;
            if (typeof GraphicTimeline === 'undefined') return false;
            var sc = document.getElementById('ScoreContainer');
            if (!sc || sc.clientHeight === 0) return false;
            return true;
        }, { timeout: 15000 });

        // Inject capture CSS
        await page.addStyleTag({ content: getCaptureCSS() });
        await new Promise(function(r) { setTimeout(r, 1000); });

        // Navigate to the middle of the time range so elements are visible
        // User provides display seconds; scoreGoto needs absolute seconds (+ lead-in)
        var midDisplay = (fromSeconds + toSeconds) / 2;
        var midAbsolute = midDisplay + LEAD_IN_SECONDS;
        console.log('  Navigating to display ' + midDisplay.toFixed(1) + 's (score ' + midAbsolute.toFixed(1) + 's)...');
        await page.evaluate(function(sec) {
            ClockSync.socket.emit('scoreGoto', { seconds: sec });
        }, midAbsolute);

        // Wait for render
        await new Promise(function(r) { setTimeout(r, 1500); });

        // If --playat + --url specified, use real playback to render follower/meter/dial
        // (Without --url, synthetic elements are still injected into SVG from curve data)
        if (playAtSeconds !== null && serverUrl) {
            {
                var playAtAbsolute = playAtSeconds + LEAD_IN_SECONDS;
                // Goto slightly before the target so playback reaches it
                var gotoTime = Math.max(0, playAtAbsolute - 1.5);
                console.log('  Seeking to ' + (gotoTime - LEAD_IN_SECONDS).toFixed(1) + 's...');
                await page.evaluate(function(sec) {
                    ClockSync.socket.emit('scoreGoto', { seconds: sec });
                }, gotoTime);
                await new Promise(function(r) { setTimeout(r, 1000); });

                // Start playback
                console.log('  Playing to display ' + playAtSeconds.toFixed(1) + 's...');
                await page.evaluate(function() {
                    ClockSync.socket.emit('play');
                });

                // Wait until ScoreTime reaches the target
                await page.waitForFunction(function(targetMs) {
                    return typeof ScoreTime !== 'undefined' && ScoreTime.now() >= targetMs;
                }, { timeout: 30000 }, playAtAbsolute * 1000);

                // Pause to freeze state
                await page.evaluate(function() {
                    ClockSync.socket.emit('pause');
                });
                await new Promise(function(r) { setTimeout(r, 500); });
                console.log('  Paused at target. Playback elements frozen.');
            }
        }

        // Calculate the clip region from the score layout
        // Each section (ScoreTop/ScoreBottom) shows ALL 4 tracks on different pages.
        // Even pages → ScoreTop, odd pages → ScoreBottom.
        var clipRegion = await page.evaluate(function(fromSec, toSec, trackMin, trackMax, pad) {
            var scoreTopEl = document.getElementById('ScoreTop');
            var scoreBotEl = document.getElementById('ScoreBottom');
            var topRect = scoreTopEl.getBoundingClientRect();
            var botRect = scoreBotEl.getBoundingClientRect();
            var scoreWidth = scoreTopEl.clientWidth;

            // Staff positions (same layout in both sections)
            var positions = StaffPositions.getPositions(scoreTopEl);
            var staffHeight = positions.staffHeight;

            // Tempo → ms per page
            var tempoHistory = window.serverTempoHistory || [];
            var bpm = 60, beatsPerPage = 8;
            if (tempoHistory.length > 0) {
                bpm = tempoHistory[0].bpm || 60;
                beatsPerPage = tempoHistory[0].beatsPerPage || 8;
            }
            var msPerPage = (60000 / bpm) * beatsPerPage;

            // Which page is the time range on?
            // fromSec/toSec are display seconds; score time = display + leadIn
            var leadIn = 2; // leadInSeconds
            var fromMs = (fromSec + leadIn) * 1000;
            var toMs = (toSec + leadIn) * 1000;
            var midMs = (fromMs + toMs) / 2;
            var totalPagesAtMid = StaffCursors.calculateTotalPages(midMs);
            var currentPage = Math.floor(totalPagesAtMid);
            var isTopSection = (currentPage % 2 === 0);

            // Target section rect
            var sectionRect = isTopSection ? topRect : botRect;

            // Page start in ms
            var pageStartMs = currentPage * msPerPage;

            // X: time fraction within page → pixels
            var fromFrac = Math.max(0, Math.min(1, (fromMs - pageStartMs) / msPerPage));
            var toFrac = Math.max(0, Math.min(1, (toMs - pageStartMs) / msPerPage));
            var xLeft = sectionRect.left + (fromFrac * scoreWidth);
            var xRight = sectionRect.left + (toFrac * scoreWidth);

            // Y: track band within the section (all 4 tracks are in each section)
            // trackMin/trackMax are 1-indexed
            var staffYs = [positions.Staff1Y, positions.Staff2Y, positions.Staff3Y, positions.Staff4Y];
            var yTop = sectionRect.top + staffYs[trackMin - 1];
            var yBottom = sectionRect.top + staffYs[trackMax - 1] + staffHeight;

            // Apply padding
            xLeft -= pad;
            xRight += pad;
            yTop -= pad;
            yBottom += pad;

            // Clamp to viewport
            xLeft = Math.max(0, xLeft);
            yTop = Math.max(0, yTop);
            xRight = Math.min(window.innerWidth, xRight);
            yBottom = Math.min(window.innerHeight, yBottom);

            return {
                x: Math.round(xLeft),
                y: Math.round(yTop),
                width: Math.round(xRight - xLeft),
                height: Math.round(yBottom - yTop),
                debug: {
                    currentPage: currentPage,
                    isTopSection: isTopSection,
                    fromFraction: fromFrac.toFixed(3),
                    toFraction: toFrac.toFixed(3),
                    msPerPage: msPerPage,
                    pageStartMs: pageStartMs,
                    scoreWidth: scoreWidth,
                    sectionTop: sectionRect.top,
                    staffHeight: staffHeight,
                }
            };
        }, fromSeconds, toSeconds, trackRange[0], trackRange[1], padding);

        console.log('  Clip: ' + clipRegion.x + ',' + clipRegion.y +
            ' ' + clipRegion.width + '×' + clipRegion.height + ' (at 1x)');
        console.log('  Page: ' + clipRegion.debug.currentPage +
            ' (' + (clipRegion.debug.isTopSection ? 'top' : 'bottom') + ')' +
            ' xRange: ' + clipRegion.debug.fromFraction + '→' + clipRegion.debug.toFraction);

        if (clipRegion.width <= 0 || clipRegion.height <= 0) {
            console.error('  ✗ Computed clip region has zero area. Check --from/--to/--track values.');
            process.exit(1);
        }

        if (outputSVG) {
            // ─── SVG vector export ───────────────────────────────────────
            console.log('  Extracting SVG...');
            var svgString = await page.evaluate(function(fromSec, toSec, trackMin, trackMax, pad, playAt) {
                var leadIn = 2;
                var fromMs = (fromSec + leadIn) * 1000;
                var toMs = (toSec + leadIn) * 1000;
                var midMs = (fromMs + toMs) / 2;

                // Determine which section
                var totalPagesAtMid = StaffCursors.calculateTotalPages(midMs);
                var currentPage = Math.floor(totalPagesAtMid);
                var isTop = (currentPage % 2 === 0);
                var sectionEl = isTop
                    ? document.getElementById('ScoreTop')
                    : document.getElementById('ScoreBottom');

                // SVG coordinate space dimensions
                var svgWidth = sectionEl.clientWidth;
                var svgHeight = sectionEl.clientHeight;

                // Staff positions in SVG coordinates
                var positions = StaffPositions.getPositions(sectionEl);
                var staffHeight = positions.staffHeight;
                var staffYs = [positions.Staff1Y, positions.Staff2Y, positions.Staff3Y, positions.Staff4Y];

                // Time → SVG X coordinate
                var tempoHistory = window.serverTempoHistory || [];
                var bpm = 60, beatsPerPage = 8;
                if (tempoHistory.length > 0) {
                    bpm = tempoHistory[0].bpm || 60;
                    beatsPerPage = tempoHistory[0].beatsPerPage || 8;
                }
                var msPerPage = (60000 / bpm) * beatsPerPage;
                var pageStartMs = currentPage * msPerPage;
                var fromFrac = Math.max(0, Math.min(1, (fromMs - pageStartMs) / msPerPage));
                var toFrac = Math.max(0, Math.min(1, (toMs - pageStartMs) / msPerPage));

                // viewBox in SVG coordinates
                var vbX = (fromFrac * svgWidth) - pad;
                var vbY = staffYs[trackMin - 1] - pad;
                var vbW = ((toFrac - fromFrac) * svgWidth) + (2 * pad);
                var vbH = (staffYs[trackMax - 1] + staffHeight - staffYs[trackMin - 1]) + (2 * pad);

                // Clamp
                if (vbX < 0) { vbW += vbX; vbX = 0; }
                if (vbY < 0) { vbH += vbY; vbY = 0; }
                if (vbX + vbW > svgWidth) vbW = svgWidth - vbX;
                if (vbY + vbH > svgHeight) vbH = svgHeight - vbY;

                // Clone the SVG
                var clone = sectionEl.cloneNode(true);

                // Set viewBox for crop
                clone.setAttribute('viewBox', vbX + ' ' + vbY + ' ' + vbW + ' ' + vbH);
                clone.setAttribute('width', vbW);
                clone.setAttribute('height', vbH);
                clone.removeAttribute('id');
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

                // ── Strip everything non-essential ──
                var sectionSuffix = isTop ? '-top' : '-bottom';
                var xMin = vbX - 80;
                var xMax = vbX + vbW + 80;
                var yMin = vbY - 40;
                var yMax = vbY + vbH + 40;

                // 1. Remove all direct-child elements except key containers
                //    When --playat is used, also keep visible playback elements (follower, meter, dial)
                var keepIds = [
                    'svg-elements-container' + sectionSuffix,
                ];
                var keepClasses = ['curve-container', 'linewedge-container', 'gc-container', 'badge-container'];
                Array.from(clone.children).forEach(function(child) {
                    var id = child.getAttribute('id') || '';
                    var cls = child.getAttribute('class') || '';
                    var dominated = keepIds.indexOf(id) >= 0 ||
                        keepClasses.some(function(c) { return cls.indexOf(c) >= 0; });
                    if (!dominated) {
                        // In playback mode, keep visible elements (cursor, follower, meter, pie, LW meter)
                        if (playAt !== null) {
                            var disp = child.style ? child.style.display : '';
                            if (disp !== 'none') {
                                // Check if element is within viewBox Y range (same track)
                                var cy = parseFloat(child.getAttribute('y') || 'NaN');
                                if (!isNaN(cy) && cy >= vbY - 10 && cy <= vbY + vbH + 10) return; // keep it
                                // For group elements (pie, LW meter), check if visible
                                if (child.tagName === 'g' && disp !== 'none') {
                                    // Check transform for Y position
                                    var t = child.getAttribute('transform') || '';
                                    var tm = t.match(/translate\(\s*[0-9.\-]+\s*,\s*([0-9.\-]+)/);
                                    if (tm) {
                                        var gy = parseFloat(tm[1]);
                                        if (gy >= vbY - 10 && gy <= vbY + vbH + 10) return; // keep it
                                    }
                                }
                            }
                        }
                        child.remove();
                    }
                });

                // 2. Filter notation elements using SVGElementManager data
                // Build set of wrapper IDs that match track + time range
                var keepWrapperIds = {};
                var leadIn = 2;
                if (window.SVGElementManager && SVGElementManager.elements) {
                    SVGElementManager.elements.forEach(function(el) {
                        // Track filter: element track is 1-indexed string like "1","2","3","4"
                        var elTrack = parseInt(el.track);
                        if (elTrack < trackMin || elTrack > trackMax) return;
                        // Time filter: referenceSeconds is in score time (includes lead-in)
                        // Convert to display seconds for comparison
                        var displaySec = el.referenceSeconds - leadIn;
                        // Wide margin: referenceSeconds is anchor point, not visual extent
                        // Elements anchored before --from may extend visually into range
                        if (displaySec < fromSec - 4 || displaySec > toSec + 0.5) return;
                        // This element belongs to our region
                        keepWrapperIds['svg-element-' + el.id] = true;
                    });
                }
                var svgContainer = clone.querySelector('#svg-elements-container' + sectionSuffix);
                if (svgContainer) {
                    Array.from(svgContainer.children).forEach(function(child) {
                        var childId = child.getAttribute('id') || '';
                        if (!keepWrapperIds[childId]) {
                            child.remove();
                        }
                    });
                }

                // 3. Filter curves — remove hidden + out-of-range
                clone.querySelectorAll('.curve-container').forEach(function(cg) {
                    Array.from(cg.children).forEach(function(child) {
                        // Remove curves hidden by visibility system (other pages)
                        var display = child.style ? child.style.display : '';
                        if (display === 'none') { child.remove(); return; }
                        // Check curve bounding box rect for X position
                        var bbox = child.querySelector('.curve-bounding-box');
                        if (bbox) {
                            var bx = parseFloat(bbox.getAttribute('x') || 'NaN');
                            var bw = parseFloat(bbox.getAttribute('width') || '0');
                            var by = parseFloat(bbox.getAttribute('y') || 'NaN');
                            if (!isNaN(bx)) {
                                // Remove if curve is entirely outside viewBox
                                if (bx + bw < xMin || bx > xMax) { child.remove(); return; }
                                if (!isNaN(by) && (by > yMax || by + parseFloat(bbox.getAttribute('height') || '0') < yMin)) {
                                    child.remove(); return;
                                }
                            }
                        }
                        // Strip UI sub-elements from kept curves
                        child.querySelectorAll('.curve-bounding-box, .curve-hit-path').forEach(function(el) {
                            el.remove();
                        });
                    });
                });

                // 3b. Filter GC arcs — remove hidden + out-of-range
                clone.querySelectorAll('.gc-container').forEach(function(cg) {
                    Array.from(cg.children).forEach(function(child) {
                        var display = child.style ? child.style.display : '';
                        if (display === 'none') { child.remove(); return; }
                        var bbox = child.querySelector('.gc-bounding-box') || child.querySelector('rect[class*="bounding"]');
                        if (bbox) {
                            var bx = parseFloat(bbox.getAttribute('x') || 'NaN');
                            var bw = parseFloat(bbox.getAttribute('width') || '0');
                            var by = parseFloat(bbox.getAttribute('y') || 'NaN');
                            if (!isNaN(bx) && (bx + bw < xMin || bx > xMax)) { child.remove(); return; }
                            if (!isNaN(by) && (by > yMax || by + parseFloat(bbox.getAttribute('height') || '0') < yMin)) { child.remove(); return; }
                        }
                        // Strip UI sub-elements
                        child.querySelectorAll('.gc-bounding-box, .gc-hit-path, [class*="bounding"], [class*="hit-path"]').forEach(function(el) {
                            el.remove();
                        });
                    });
                });

                // 3c. Filter line wedges — remove hidden + out-of-range
                clone.querySelectorAll('.linewedge-container').forEach(function(cg) {
                    Array.from(cg.children).forEach(function(child) {
                        var display = child.style ? child.style.display : '';
                        if (display === 'none') { child.remove(); return; }
                        // Check Y position from path d-attribute to filter by track
                        var paths = child.querySelectorAll('path');
                        var inYRange = false;
                        paths.forEach(function(p) {
                            var d = p.getAttribute('d') || '';
                            // Extract Y values from path "M x1 y1 L x2 y2 ..."
                            var nums = d.match(/[\d.]+/g);
                            if (nums && nums.length >= 4) {
                                var py = parseFloat(nums[1]);
                                if (!isNaN(py) && py >= yMin && py <= yMax) inYRange = true;
                            }
                        });
                        if (!inYRange) { child.remove(); return; }
                        // Strip UI sub-elements: hit paths, highlights, node handles
                        Array.from(child.children).forEach(function(el) {
                            // Remove transparent hit/selection paths
                            var fill = el.getAttribute('fill') || '';
                            if (fill === 'transparent' || fill === 'yellow') { el.remove(); return; }
                            // Remove hidden elements
                            var elDisp = el.style ? el.style.display : '';
                            if (elDisp === 'none') { el.remove(); return; }
                            // Remove node handle circles
                            if (el.tagName === 'circle' && el.getAttribute('data-node-index')) { el.remove(); return; }
                        });
                    });
                });

                // 3d. Filter badges — remove hidden + out-of-range
                clone.querySelectorAll('.badge-container').forEach(function(cg) {
                    Array.from(cg.children).forEach(function(child) {
                        var display = child.style ? child.style.display : '';
                        if (display === 'none') { child.remove(); return; }
                        // Check wrapper position
                        var wx = parseFloat(child.getAttribute('x') || 'NaN');
                        var wy = parseFloat(child.getAttribute('y') || 'NaN');
                        // Also check transform translate
                        var t = child.getAttribute('transform') || '';
                        var tm = t.match(/translate\(\s*([0-9.\-]+)\s*,\s*([0-9.\-]+)/);
                        if (tm) { wx = parseFloat(tm[1]); wy = parseFloat(tm[2]); }
                        if (!isNaN(wx) && (wx < xMin || wx > xMax)) { child.remove(); return; }
                        if (!isNaN(wy) && (wy < yMin || wy > yMax)) { child.remove(); return; }
                        // Strip UI sub-elements: yellow highlight border, transparent hit rects
                        Array.from(child.children).forEach(function(el) {
                            // Remove yellow selection highlight rects
                            if (el.getAttribute('stroke') === 'yellow') { el.remove(); return; }
                        });
                        // Inside the badge SVG group, remove transparent hit rects
                        child.querySelectorAll('rect[fill="transparent"]').forEach(function(el) {
                            el.remove();
                        });
                        // Remove animateTransform elements (won't play in static SVG)
                        child.querySelectorAll('animateTransform').forEach(function(el) {
                            el.remove();
                        });
                    });
                });

                // 4. Inline base64 SVG images → preserve vector quality
                // <image href="data:image/svg+xml;base64,..."> gets rasterized by renderers.
                // Decode and replace with actual inline <svg> elements.
                clone.querySelectorAll('image').forEach(function(img) {
                    var href = img.getAttribute('href') || img.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '';
                    if (href.indexOf('data:image/svg+xml;base64,') !== 0) return;

                    try {
                        var b64 = href.replace('data:image/svg+xml;base64,', '');
                        var svgXml = decodeURIComponent(escape(atob(b64)));

                        // Parse the SVG content
                        var parser = new DOMParser();
                        var doc = parser.parseFromString(svgXml, 'image/svg+xml');
                        var srcSvg = doc.documentElement;
                        if (!srcSvg || srcSvg.nodeName !== 'svg') return;

                        // Create an inline <svg> element with matching dimensions
                        var inlineSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                        var imgW = img.getAttribute('width');
                        var imgH = img.getAttribute('height');
                        inlineSvg.setAttribute('width', imgW);
                        inlineSvg.setAttribute('height', imgH);

                        // Preserve the original viewBox if present, else use the SVG's own dimensions
                        var origVB = srcSvg.getAttribute('viewBox');
                        if (origVB) {
                            inlineSvg.setAttribute('viewBox', origVB);
                        } else {
                            var srcW = srcSvg.getAttribute('width') || imgW;
                            var srcH = srcSvg.getAttribute('height') || imgH;
                            // Strip units (mm, px, etc.)
                            srcW = parseFloat(srcW) || parseFloat(imgW);
                            srcH = parseFloat(srcH) || parseFloat(imgH);
                            inlineSvg.setAttribute('viewBox', '0 0 ' + srcW + ' ' + srcH);
                        }
                        inlineSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

                        // Copy all child elements from the source SVG
                        while (srcSvg.firstChild) {
                            inlineSvg.appendChild(srcSvg.firstChild);
                        }

                        // Replace the <image> with the inline <svg>
                        img.parentNode.replaceChild(inlineSvg, img);
                    } catch (e) {
                        // Keep original <image> if decoding fails
                    }
                });

                // 5. Inject synthetic playback elements when --playat is set
                if (playAt !== null) {
                    var leadIn2 = 2;
                    var playAtScore = playAt + leadIn2; // display → score seconds

                    // Compute X position of cursor at playAt time
                    var playAtMs = playAtScore * 1000;
                    var playAtFrac = Math.max(0, Math.min(1, (playAtMs - pageStartMs) / msPerPage));
                    var cursorX = playAtFrac * svgWidth;

                    // Staff dimensions
                    var timelineHeight = 20; // matches StaffCursors.timelineHeight
                    var availableHeight2 = svgHeight - timelineHeight;
                    var staffHeight2 = availableHeight2 / 4;

                    // For each track in range, find curve at playAt time
                    for (var ti = trackMin; ti <= trackMax; ti++) {
                        var staffIdx = ti - 1;
                        var yPos = timelineHeight + (staffIdx * staffHeight2);

                        // Find curve containing playAt time via GTrackSystem
                        var gTrack = window.GTrackSystem ? GTrackSystem.getGTrack(staffIdx) : null;
                        if (!gTrack) continue;

                        var foundCurve = null;
                        var normalizedY = null;
                        var curveProgress = 0;

                        for (var gi = 0; gi < gTrack.graphicItems.length; gi++) {
                            var item = gTrack.graphicItems[gi];
                            if (item.type !== 'curve' || !item.curveData) continue;
                            var cd = item.curveData;
                            if (playAtScore >= cd.startTime && playAtScore <= cd.endTime) {
                                var timeOff = playAtScore - cd.startTime;
                                var sIdx = Math.floor(timeOff / cd.sampleInterval);
                                if (sIdx >= 0 && sIdx < cd.samples.length) {
                                    foundCurve = item;
                                    normalizedY = cd.samples[sIdx];
                                    curveProgress = (playAtScore - cd.startTime) / (cd.endTime - cd.startTime);
                                    break;
                                }
                            }
                        }

                        // Track colors (matching StaffCursors.colors)
                        var trackColors = [
                            'rgb(153,255,0)',       // Staff 1: Lime Green
                            'rgb(255, 21, 160)',    // Staff 2: Neon Magenta
                            'rgba(56,126,211,255)', // Staff 3: Bright Blue
                            'rgba(240,75,0,255)'    // Staff 4: Bright Orange
                        ];
                        var trackColor = trackColors[staffIdx] || trackColors[0];

                        // Curve color (from the curve item, e.g. limeGreen)
                        var curveColor = trackColor; // fallback
                        if (foundCurve && foundCurve.color) {
                            var colorMap = window.ColorMap || {};
                            curveColor = colorMap[foundCurve.color] || foundCurve.color;
                        }

                        // -- Cursor line (3px wide, full staff height, TRACK color) --
                        var cursorLine = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                        cursorLine.setAttribute('x', cursorX);
                        cursorLine.setAttribute('y', yPos);
                        cursorLine.setAttribute('width', '3');
                        cursorLine.setAttribute('height', staffHeight2);
                        cursorLine.setAttribute('fill', trackColor);
                        clone.appendChild(cursorLine);

                        if (foundCurve && normalizedY !== null) {
                            var meterX = cursorX - 11;

                            // -- Meter outline (full height, stroke only, CURVE color) --
                            var meterRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                            meterRect.setAttribute('x', meterX);
                            meterRect.setAttribute('y', yPos);
                            meterRect.setAttribute('width', '8');
                            meterRect.setAttribute('height', staffHeight2);
                            meterRect.setAttribute('fill', 'none');
                            meterRect.setAttribute('stroke', curveColor);
                            meterRect.setAttribute('stroke-width', '1.5');
                            meterRect.setAttribute('opacity', '0.8');
                            clone.appendChild(meterRect);

                            // -- Curve follower fill (bottom-up, CURVE color) --
                            var fillMode = foundCurve.fillMode || 'line';
                            var fillH, fillY;
                            if (fillMode === 'top') {
                                fillH = (1 - normalizedY) * staffHeight2;
                                fillY = yPos;
                            } else {
                                fillH = normalizedY * staffHeight2;
                                fillY = yPos + staffHeight2 - fillH;
                            }
                            var followerRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                            followerRect.setAttribute('x', meterX);
                            followerRect.setAttribute('y', fillY);
                            followerRect.setAttribute('width', '8');
                            followerRect.setAttribute('height', fillH);
                            followerRect.setAttribute('fill', curveColor);
                            followerRect.setAttribute('stroke', 'none');
                            followerRect.setAttribute('opacity', '0.3');
                            clone.appendChild(followerRect);

                            // -- Countdown dial (RECT border, pie arc) --
                            // Size = 1/4 staff height, positioned left of meter, flush with top
                            var dialSize = staffHeight2 / 4;
                            var dialX = meterX - dialSize - 2; // 2px gap from meter
                            var dialY = yPos;
                            var dialCx = dialX + dialSize / 2;
                            var dialCy = dialY + dialSize / 2;
                            var dialR = dialSize / 2 - 1;

                            // Square border (rect, not circle)
                            var dialBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                            dialBorder.setAttribute('x', dialX);
                            dialBorder.setAttribute('y', dialY);
                            dialBorder.setAttribute('width', dialSize);
                            dialBorder.setAttribute('height', dialSize);
                            dialBorder.setAttribute('fill', 'none');
                            dialBorder.setAttribute('stroke', 'black');
                            dialBorder.setAttribute('stroke-width', '1');
                            clone.appendChild(dialBorder);

                            // Pie arc — starts full, empties clockwise from 12 o'clock
                            var remaining = 1 - curveProgress;
                            if (remaining > 0.001 && remaining < 0.999) {
                                // Start edge at progress angle, end at 12 o'clock
                                var arcStart = -Math.PI / 2 + (curveProgress * 2 * Math.PI);
                                var arcEnd = -Math.PI / 2 + (2 * Math.PI); // 12 o'clock
                                var x1a = dialCx + dialR * Math.cos(arcStart);
                                var y1a = dialCy + dialR * Math.sin(arcStart);
                                var x2a = dialCx + dialR * Math.cos(arcEnd);
                                var y2a = dialCy + dialR * Math.sin(arcEnd);
                                var largeArc = remaining > 0.5 ? 1 : 0;
                                var arcPath = 'M ' + dialCx + ' ' + dialCy +
                                    ' L ' + x1a + ' ' + y1a +
                                    ' A ' + dialR + ' ' + dialR + ' 0 ' + largeArc + ' 1 ' + x2a + ' ' + y2a + ' Z';
                                var arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                arcEl.setAttribute('d', arcPath);
                                arcEl.setAttribute('fill', curveColor);
                                arcEl.setAttribute('opacity', '0.3');
                                clone.appendChild(arcEl);
                            } else if (remaining >= 0.999) {
                                // Full circle
                                var fullPath = 'M ' + dialCx + ' ' + dialCy +
                                    ' m -' + dialR + ' 0' +
                                    ' a ' + dialR + ' ' + dialR + ' 0 1 0 ' + (dialR * 2) + ' 0' +
                                    ' a ' + dialR + ' ' + dialR + ' 0 1 0 -' + (dialR * 2) + ' 0';
                                var arcEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                arcEl.setAttribute('d', fullPath);
                                arcEl.setAttribute('fill', curveColor);
                                arcEl.setAttribute('opacity', '0.3');
                                clone.appendChild(arcEl);
                            }

                            // Clock hand — spins clockwise from 12 o'clock
                            var handAngle = -Math.PI / 2 + curveProgress * 2 * Math.PI;
                            var handX = dialCx + dialR * Math.cos(handAngle);
                            var handY = dialCy + dialR * Math.sin(handAngle);
                            var handLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            handLine.setAttribute('x1', dialCx);
                            handLine.setAttribute('y1', dialCy);
                            handLine.setAttribute('x2', handX);
                            handLine.setAttribute('y2', handY);
                            handLine.setAttribute('stroke', 'black');
                            handLine.setAttribute('stroke-width', '1');
                            handLine.setAttribute('stroke-linecap', 'round');
                            clone.appendChild(handLine);
                        }

                        // 5b. Line-wedge meter (donut ring) — if no curve, check for active LW
                        if (!foundCurve && window.LineWedgeMaker) {
                            var foundLW = null;
                            var lwPlayTime = playAt; // try display seconds first
                            for (var li = 0; li < LineWedgeMaker.lineWedges.length; li++) {
                                var lw = LineWedgeMaker.lineWedges[li];
                                if (lw.gTrack !== String(ti)) continue;
                                if (lwPlayTime >= lw.startSeconds && lwPlayTime <= lw.endSeconds) {
                                    foundLW = lw; break;
                                }
                            }
                            // If not found, try score seconds
                            if (!foundLW) {
                                lwPlayTime = playAtScore;
                                for (var li = 0; li < LineWedgeMaker.lineWedges.length; li++) {
                                    var lw = LineWedgeMaker.lineWedges[li];
                                    if (lw.gTrack !== String(ti)) continue;
                                    if (lwPlayTime >= lw.startSeconds && lwPlayTime <= lw.endSeconds) {
                                        foundLW = lw; break;
                                    }
                                }
                            }

                            if (foundLW) {
                                var lwDuration = foundLW.endSeconds - foundLW.startSeconds;
                                var lwProgress = lwDuration > 0 ? (lwPlayTime - foundLW.startSeconds) / lwDuration : 0;

                                // Compute X from LW pixel positions (more accurate than global time mapping)
                                var lwCursorX = foundLW.x1 + lwProgress * (foundLW.x2 - foundLW.x1);

                                // Reposition the cursor line to LW-derived X
                                cursorLine.setAttribute('x', lwCursorX);

                                // LW meter size: staffHeight/3 (matching updateLineWedgeMeter)
                                var lwMeterSize = staffHeight2 / 3;
                                var lwMeterX = lwCursorX - lwMeterSize; // right edge touches cursor
                                var lwMeterY = yPos;

                                // Square border
                                var lwBorder = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                                lwBorder.setAttribute('x', lwMeterX);
                                lwBorder.setAttribute('y', lwMeterY);
                                lwBorder.setAttribute('width', lwMeterSize);
                                lwBorder.setAttribute('height', lwMeterSize);
                                lwBorder.setAttribute('fill', 'none');
                                lwBorder.setAttribute('stroke', '#555');
                                lwBorder.setAttribute('stroke-width', '0.5');
                                clone.appendChild(lwBorder);

                                // Donut ring (stroke-only arc, transparent center)
                                var lwOuterR = lwMeterSize / 2 - 1;
                                var lwRingWidth = lwOuterR * 0.35;
                                var lwMidR = lwOuterR - lwRingWidth / 2;
                                var lwCx = lwMeterX + lwMeterSize / 2;
                                var lwCy = lwMeterY + lwMeterSize / 2;

                                var lwRemaining = 1 - lwProgress;
                                if (lwRemaining > 0.001 && lwRemaining < 0.999) {
                                    var lwArcStart = -Math.PI / 2 + (lwProgress * 2 * Math.PI);
                                    var lwArcEnd = -Math.PI / 2 + (2 * Math.PI);
                                    var lwX1 = lwCx + lwMidR * Math.cos(lwArcStart);
                                    var lwY1 = lwCy + lwMidR * Math.sin(lwArcStart);
                                    var lwX2 = lwCx + lwMidR * Math.cos(lwArcEnd);
                                    var lwY2 = lwCy + lwMidR * Math.sin(lwArcEnd);
                                    var lwLargeArc = lwRemaining > 0.5 ? 1 : 0;
                                    var lwRingPath = 'M ' + lwX1 + ' ' + lwY1 +
                                        ' A ' + lwMidR + ' ' + lwMidR + ' 0 ' + lwLargeArc + ' 1 ' + lwX2 + ' ' + lwY2;
                                    var lwRing = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                    lwRing.setAttribute('d', lwRingPath);
                                    lwRing.setAttribute('fill', 'none');
                                    lwRing.setAttribute('stroke', '#000000');
                                    lwRing.setAttribute('stroke-width', String(lwRingWidth));
                                    lwRing.setAttribute('opacity', '0.7');
                                    clone.appendChild(lwRing);
                                } else if (lwRemaining >= 0.999) {
                                    // Full donut ring
                                    var lwFullPath = 'M ' + lwCx + ' ' + (lwCy - lwMidR) +
                                        ' A ' + lwMidR + ' ' + lwMidR + ' 0 1 1 ' + (lwCx - 0.001) + ' ' + (lwCy - lwMidR);
                                    var lwRing = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                                    lwRing.setAttribute('d', lwFullPath);
                                    lwRing.setAttribute('fill', 'none');
                                    lwRing.setAttribute('stroke', '#000000');
                                    lwRing.setAttribute('stroke-width', String(lwRingWidth));
                                    lwRing.setAttribute('opacity', '0.7');
                                    clone.appendChild(lwRing);
                                }

                                // Log position info for manual adjustment if needed
                                console.log('LW meter: track=' + ti + ' progress=' + lwProgress.toFixed(3) +
                                    ' cursorX=' + lwCursorX.toFixed(1) + ' lw.x1=' + foundLW.x1.toFixed(1) +
                                    ' lw.x2=' + foundLW.x2.toFixed(1) +
                                    ' lwStart=' + foundLW.startSeconds + ' lwEnd=' + foundLW.endSeconds);
                            }
                        }
                    }
                }

                // Serialize
                var serializer = new XMLSerializer();
                var svgStr = serializer.serializeToString(clone);

                // Normalize rgba() → rgb() for SVG compatibility
                // SVG attributes don't support rgba(); Inkscape falls back to black
                svgStr = svgStr.replace(/rgba\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*\d+\)/g, 'rgb($1,$2,$3)');

                return svgStr;
            }, fromSeconds, toSeconds, trackRange[0], trackRange[1], padding, playAtSeconds);

            var outputPath = path.join(OUTPUT_DIR, outputName + '.svg');
            fs.writeFileSync(outputPath, svgString, 'utf8');

            var fileSize = fs.statSync(outputPath).size;
            var sizeLabel = fileSize > 1024 * 1024
                ? (fileSize / (1024 * 1024)).toFixed(1) + ' MB'
                : Math.round(fileSize / 1024) + ' KB';
            console.log('  ✓ Saved: ' + outputPath);
            console.log('  ✓ Size: ' + sizeLabel + ' (vector SVG)');

        } else {
            // ─── PNG raster export ───────────────────────────────────────
            var outputPath = path.join(OUTPUT_DIR, outputName + '.png');
            await page.screenshot({
                path: outputPath,
                clip: {
                    x: clipRegion.x,
                    y: clipRegion.y,
                    width: clipRegion.width,
                    height: clipRegion.height,
                },
            });

            var fileSize = fs.statSync(outputPath).size;
            var sizeLabel = fileSize > 1024 * 1024
                ? (fileSize / (1024 * 1024)).toFixed(1) + ' MB'
                : Math.round(fileSize / 1024) + ' KB';
            console.log('  ✓ Saved: ' + outputPath);
            console.log('  ✓ Size: ' + sizeLabel +
                ' (' + (clipRegion.width * scaleFactor) + '×' + (clipRegion.height * scaleFactor) + ' pixels)');
        }

    } catch (err) {
        console.error('\n  ✗ Error: ' + err.message);
        console.error(err.stack);
        process.exit(1);
    } finally {
        if (browser) await browser.close();
        if (server) server.close();
    }
}

main();
