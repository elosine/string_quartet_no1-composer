#!/usr/bin/env node
/**
 * film_part.js — film the Performance Score frame by frame, into an mp4.
 *
 * The app (builds/performance/index.html) is opened alone in headless Chrome, on its
 * offline stub (no Socket.IO, no room, no sync). The page's clock is replaced by a
 * stepped one: Date.now, performance.now, setTimeout, setInterval and
 * requestAnimationFrame all read a virtual time that this script advances by exactly
 * one frame, then takes a screenshot. So the film's frame N is the app at
 * N / fps seconds of score time, whatever the capture's own speed.
 *
 * Usage:
 *   node scripts/film_part.js --track 1 --from 0 --to 32 --name test_violin1
 *
 * Options:
 *   --track N     1-4 = a part (Violin I, Violin II, Viola, Cello); 0 = the full score (default 1)
 *   --pages N     pages per screen in a part: 4, 6 or 8 (default 6)
 *   --from S      SCORE seconds to start at (default 0; the score has a 2 s lead-in,
 *                 so the timeline's 0:00 is score second 2)
 *   --to S        SCORE seconds to end at (default 32)
 *   --fps N       frames per second (default 30)
 *   --width N     --height N    the screen filmed, in CSS px (default 1600 x 1200)
 *   --scale N     device scale factor (default 1)
 *   --crf N       x264 quality, lower = better (default 18)
 *   --keyint N    a keyframe every N frames (default = fps, one a second)
 *   --name STR    output name (default film_t<track>)
 *   --frames DIR  also keep every 30th frame as a PNG in DIR (for a look)
 *
 * Output: builds/film/<name>.mp4   (builds/ is gitignored)
 * Needs: ffmpeg on the PATH; builds/performance/ built.
 */

const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PERF_DIR = path.join(ROOT, 'builds', 'performance');
const OUT_DIR = path.join(ROOT, 'builds', 'film');

const opt = { track: 1, pages: 6, from: 0, to: 32, fps: 30, width: 1600, height: 1200, scale: 1, crf: 18, keyint: null, name: null, frames: null, gc: 1, raw: 0 };
for (let i = 2; i < process.argv.length; i++) {
    const k = process.argv[i].replace(/^--/, '');
    if (!(k in opt)) { console.error('Unknown option ' + process.argv[i]); process.exit(1); }
    const v = process.argv[++i];
    opt[k] = (k === 'name' || k === 'frames') ? v : parseFloat(v);
}
if (!opt.name) opt.name = 'film_t' + opt.track;
if (!opt.keyint) opt.keyint = opt.fps;

const MIME = { '.html': 'text/html', '.json': 'application/json', '.css': 'text/css', '.js': 'application/javascript',
    '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf' };

// ─── THE FILM'S PATCHES ───────────────────────────────────────────────────────
// What the films show differently from the old app, decided at the proofing of 2026-11-16. They are made HERE,
// to the copies this tool hands its own browser; builds/performance/ and the score file are never written.
//   1. score.json — element 42 (M4_vla_BartokPizz_Cs3_final, the viola's Bartók pizz at 18.24) is filed on
//      track 2 one whole lane down (offsetYFraction 1.03): drawn in the viola's lane in the full score, lost
//      from both parts. It is given to track 3 at the same height in the lane.
//   2. index.html — the GC's travelling ball (canvas radius 5) and its impact dot (SVG radius 4) are scaled by
//      --gc (2 = twice as big).
//   3. in the page, every frame — the notation's layer is kept the LAST in each row's SVG, so notation is
//      drawn on top of the badges, the line wedges and the curves ("all the notation should be drawn on top").
// --raw 1 films the app as it is, with none of them.
const patchCache = {};
function patchFile(url, filePath) {
    if (opt.raw) return null;
    if (url !== '/score.json' && url !== '/index.html') return null;
    if (patchCache[url]) return patchCache[url];
    let text = fs.readFileSync(filePath, 'utf8');
    if (url === '/score.json') {
        const score = JSON.parse(text);
        const el = (score.svgElements || []).find(function (e) { return e.id === 42 && /M4_vla_BartokPizz_Cs3_final/.test(e.name); });
        if (!el || Number(el.track) !== 2) throw new Error('patch 1: element 42 is not where it was (track ' + (el && el.track) + ')');
        el.track = 3;
        el.offsetYFraction = el.offsetYFraction - 1;
        text = JSON.stringify(score);
        console.log('  patch 1: the viola\'s Bartók pizz at 18.24 moved from track 2 to track 3 (y ' + el.offsetYFraction.toFixed(2) + ')');
    } else {
        if (opt.gc !== 1) {
            const swap = function (from, to, want) {
                const n = text.split(from).length - 1;
                if (n !== want) throw new Error('patch 2: found ' + n + ' of "' + from + '", expected ' + want);
                text = text.split(from).join(to);
            };
            swap('ctx.arc(ballPos.x, ballPos.y, 5, 0, Math.PI * 2);', 'ctx.arc(ballPos.x, ballPos.y, ' + (5 * opt.gc) + ', 0, Math.PI * 2);', 2);
            swap("impactMarker.setAttribute('r', '4');", "impactMarker.setAttribute('r', '" + (4 * opt.gc) + "');", 2);
            console.log('  patch 2: the GC\'s ball ' + (5 * opt.gc) + ' px, its impact dot ' + (4 * opt.gc) + ' px (x' + opt.gc + ')');
        }
    }
    patchCache[url] = Buffer.from(text, 'utf8');
    return patchCache[url];
}

function startServer() {
    return new Promise(function (resolve, reject) {
        const server = http.createServer(function (req, res) {
            let url = req.url.split('?')[0];
            if (url === '/') url = '/index.html';
            const filePath = path.join(PERF_DIR, decodeURIComponent(url));
            if (filePath.indexOf(PERF_DIR) !== 0 || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                res.writeHead(404); res.end('Not found'); return;
            }
            const patched = patchFile(url, filePath);
            if (patched) { res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] }); res.end(patched); return; }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
            fs.createReadStream(filePath).pipe(res);
        });
        server.on('error', reject);
        server.listen(0, '127.0.0.1', function () { resolve(server); });   // a free port, this machine only
    });
}

// ─── The stepped clock, installed before any of the page's own code runs ─────
function installClock() {
    const realPerfNow = performance.now.bind(performance);
    const realRAF = window.requestAnimationFrame.bind(window);
    const realSetInterval = window.setInterval.bind(window);
    const base = Date.now();
    const perf0 = realPerfNow();
    let frozen = false, vt = 0;                     // vt = virtual ms since the page opened
    function cur() { return frozen ? vt : realPerfNow() - perf0; }

    Date.now = function () { return base + cur(); };
    performance.now = function () { return cur(); };

    const timers = new Map();
    let nextId = 1000000;
    let rafs = [];
    function call(fn, args) {
        try { if (typeof fn === 'string') (0, eval)(fn); else fn.apply(window, args || []); }
        catch (e) { console.error('[clock] ' + (e && e.stack || e)); }
    }
    window.setTimeout = function (fn, d) {
        const id = nextId++;
        timers.set(id, { due: cur() + Math.max(0, +d || 0), fn: fn, args: Array.prototype.slice.call(arguments, 2), every: null });
        return id;
    };
    window.setInterval = function (fn, d) {
        const id = nextId++;
        const every = Math.max(1, +d || 0);
        timers.set(id, { due: cur() + every, fn: fn, args: Array.prototype.slice.call(arguments, 2), every: every });
        return id;
    };
    window.clearTimeout = window.clearInterval = function (id) { timers.delete(id); };
    window.requestAnimationFrame = function (fn) { const id = nextId++; rafs.push({ id: id, fn: fn }); return id; };
    window.cancelAnimationFrame = function (id) { rafs = rafs.filter(function (r) { return r.id !== id; }); };

    function runTimers(upTo) {
        for (let guard = 0; guard < 100000; guard++) {
            let bestId = null, best = null;
            timers.forEach(function (t, id) { if (t.due <= upTo && (best === null || t.due < best.due)) { best = t; bestId = id; } });
            if (best === null) return;
            if (frozen) vt = Math.max(vt, best.due);
            if (best.every) best.due += best.every; else timers.delete(bestId);
            call(best.fn, best.args);
        }
    }
    function runRafs() {
        const q = rafs; rafs = [];
        const ts = cur();
        q.forEach(function (r) { call(r.fn, [ts]); });
    }
    // While the page loads, the clock follows real time.
    realSetInterval(function () { if (!frozen) runTimers(cur()); }, 4);
    (function pump() { if (frozen) return; runRafs(); realRAF(pump); })();

    // Declarative animations (SMIL in the badges, CSS) run on the browser's own clock: hold them to ours.
    const animOffset = new WeakMap();
    function holdAnimations() {
        document.querySelectorAll('svg').forEach(function (s) {
            if (s.ownerSVGElement || !s.pauseAnimations) return;
            try { s.pauseAnimations(); s.setCurrentTime(vt / 1000); } catch (e) { /* not rendered yet */ }
        });
        if (document.getAnimations) document.getAnimations().forEach(function (a) {
            try {
                if (!animOffset.has(a)) { a.pause(); animOffset.set(a, (a.currentTime || 0) - vt); }
                a.currentTime = vt + animOffset.get(a);
            } catch (e) { /* an animation that cannot be driven */ }
        });
    }

    window.__clock = {
        freeze: function () { vt = cur(); frozen = true; holdAnimations(); return vt; },
        step: function (ms) {
            const target = vt + ms;
            runTimers(target);
            vt = target;
            runRafs();
            holdAnimations();
            return vt;
        },
        now: cur
    };
}

const HIDE_CSS = [
    '#controlsOverlay', '#syncModeIndicator', '#annotationToggle', '#annotationToolbar',
    '#offlineBanner', '#cursorMenu', '#cursorMenuToggle', '#compositionPanel', '#compositionPanelToggle'
].map(function (s) { return s + ' { display: none !important; }'; }).join('\n');

const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

async function main() {
    if (!fs.existsSync(path.join(PERF_DIR, 'index.html'))) { console.error('builds/performance/index.html not found.'); process.exit(1); }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (opt.frames) fs.mkdirSync(opt.frames, { recursive: true });
    const outPath = path.join(OUT_DIR, opt.name + '.mp4');
    const total = Math.round((opt.to - opt.from) * opt.fps);
    const pxW = Math.round(opt.width * opt.scale), pxH = Math.round(opt.height * opt.scale);
    console.log('film_part: track ' + opt.track + ', score ' + opt.from + ' s -> ' + opt.to + ' s, ' + opt.fps + ' fps, ' + total + ' frames, ' + pxW + ' x ' + pxH);

    const server = await startServer();
    const base = 'http://127.0.0.1:' + server.address().port;
    const url = base + '/' + (opt.track >= 1 ? '?track=' + opt.track + '&pages=' + opt.pages : '');
    let browser, ff;
    try {
        browser = await puppeteer.launch({ headless: 'new', args: ['--window-size=' + opt.width + ',' + opt.height, '--no-sandbox', '--force-color-profile=srgb', '--disable-gpu']   /* software drawing: a screenshot takes 45 ms; with the GPU on, 1.4 s (measured 2026-11-13) */.concat((process.env.FILM_ARGS || '').split(' ').filter(Boolean)) });
        const page = await browser.newPage();
        await page.setViewport({ width: opt.width, height: opt.height, deviceScaleFactor: opt.scale });
        const pageErrors = [];
        page.on('pageerror', function (e) { pageErrors.push(String(e && e.message || e)); });
        page.on('console', function (m) { if (m.type() === 'error') pageErrors.push(m.text()); if (process.env.FILM_DEBUG) console.log('    [page] ' + m.text().slice(0, 220)); });
        await page.evaluateOnNewDocument(installClock);

        console.log('  loading ' + url);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
        await page.waitForFunction(function () {
            if (typeof SVGElementManager === 'undefined' || !SVGElementManager.elements || !SVGElementManager.elements.length) return false;
            if (typeof StaffCursors === 'undefined' || typeof ClockSync === 'undefined' || !ClockSync.socket) return false;
            const sc = document.getElementById('ScoreContainer');
            return !!(sc && sc.clientHeight > 0);
        }, { timeout: 30000 });
        if (!(await page.evaluate(function () { return !!window._OFFLINE_STUB; }))) throw new Error('the app is not on its offline stub');
        await page.addStyleTag({ content: HIDE_CSS });
        // patch 3: the notation's layer last in every row's SVG (kept so before each frame — the app appends
        // badges, wedges and curves after it whenever a row is replaced)
        if (!opt.raw) {
            await page.evaluate(function () {
                window.__filmOrder = function () {
                    const layers = document.querySelectorAll('[id^="svg-elements-"]');
                    for (let i = 0; i < layers.length; i++) { const g = layers[i], p = g.parentNode; if (p && p.lastElementChild !== g) p.appendChild(g); }
                };
                window.__filmOrder();
            });
            console.log('  patch 3: the notation drawn on top of the badges, the wedges and the curves');
        }
        await sleep(2000);

        // The drawing loop is started by the server's 'scoreState' message, which the offline stub never sends: start it here, as that handler does.
        await page.evaluate(function () { if (!AnimationEngine.running) AnimationEngine.start(ClockSync.now()); });
        await page.evaluate(function (sec) { ClockSync.socket.emit('scoreGoto', { seconds: sec }); }, opt.from);
        await sleep(2000);                                           // the landing renders in followed time
        await page.evaluate(function () { window.__clock.freeze(); ClockSync.socket.emit('scoreGo'); });
        // The stub starts 10 ms after GO; walk the clock to the first millisecond the score is moving, so frame 0 = --from.
        const startMs = opt.from * 1000;
        let settled = false;
        for (let i = 0; i < 200 && !settled; i++) {
            settled = await page.evaluate(function (startMs) {
                window.__clock.step(1);
                return ScoreTime.isPlaying && ScoreTime.now() >= startMs;
            }, startMs);
        }
        if (!settled) throw new Error('the score did not start playing');
        const t0 = await page.evaluate(function () { return ScoreTime.now(); });
        console.log('  playing; score time at frame 0 = ' + (t0 / 1000).toFixed(3) + ' s');

        ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(opt.fps), '-i', '-',
            '-c:v', 'libx264', '-preset', 'slow', '-crf', String(opt.crf), '-pix_fmt', 'yuv420p',
            '-g', String(opt.keyint), '-keyint_min', String(opt.keyint), '-sc_threshold', '0',
            '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-movflags', '+faststart', outPath], { stdio: ['pipe', 'inherit', 'inherit'] });
        const ffDone = new Promise(function (resolve, reject) {
            ff.on('error', reject);
            ff.on('close', function (code) { code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code)); });
        });

        const wall0 = Date.now();
        let filmed = total, lastScoreMs = t0, msStep = 0, msShot = 0, msPipe = 0;
        for (let n = 0; n < total; n++) {
            // frame n shows score time t0 + n / fps
            const wantMs = t0 + n * 1000 / opt.fps;
            let tk = Date.now();
            const gotMs = await page.evaluate(function (wantMs) {
                const d = wantMs - ScoreTime.now();
                if (d > 0) window.__clock.step(d);
                if (window.__filmOrder) window.__filmOrder();
                return ScoreTime.now();
            }, wantMs);
            if (Math.abs(gotMs - wantMs) > 0.5 && !(await page.evaluate(function () { return ScoreTime.isPlaying; }))) {
                console.log('  the score stopped itself at ' + (gotMs / 1000).toFixed(3) + ' s (frame ' + n + '); the film ends here');
                filmed = n;
                break;
            }
            if (Math.abs(gotMs - wantMs) > 0.5) throw new Error('frame ' + n + ': score time ' + gotMs.toFixed(2) + ' ms, wanted ' + wantMs.toFixed(2));
            lastScoreMs = gotMs;
            if (process.env.FILM_DEBUG && n % 30 === 0) console.log('    [probe] ' + await page.evaluate(function () { return JSON.stringify({ t: ScoreTime.now(), playing: ScoreTime.isPlaying, engine: AnimationEngine.running, subs: AnimationEngine.subscribers.length, clockNow: ClockSync.now(), dateNow: Date.now() }); }));
            msStep += Date.now() - tk; tk = Date.now();
            const png = await page.screenshot({ type: 'png', captureBeyondViewport: false, optimizeForSpeed: true });
            msShot += Date.now() - tk; tk = Date.now();
            if (!ff.stdin.write(png)) await new Promise(function (r) { ff.stdin.once('drain', r); });
            msPipe += Date.now() - tk;
            if (opt.frames && n % 30 === 0) fs.writeFileSync(path.join(opt.frames, 'f' + String(n).padStart(6, '0') + '.png'), png);
            if (n % 150 === 0 && n > 0) {
                const el = (Date.now() - wall0) / 1000;
                console.log('  frame ' + n + ' / ' + total + '  (' + (n / el).toFixed(1) + ' frames/s, about ' + Math.round((total - n) / (n / el)) + ' s left)');
            }
        }
        ff.stdin.end();
        await ffDone;
        const size = fs.statSync(outPath).size;
        console.log('  done: ' + outPath);
        console.log('  ' + filmed + ' frames, score ' + (t0 / 1000).toFixed(3) + ' -> ' + (lastScoreMs / 1000).toFixed(3) + ' s, ' +
            (size / 1048576).toFixed(2) + ' MB, ' + ((Date.now() - wall0) / 1000).toFixed(0) + ' s to film');
        console.log('  per frame: step ' + (msStep / filmed).toFixed(0) + ' ms, screenshot ' + (msShot / filmed).toFixed(0) + ' ms, encode ' + (msPipe / filmed).toFixed(0) + ' ms');
        if (pageErrors.length) {
            console.log('  page errors (' + pageErrors.length + '), the first five:');
            pageErrors.slice(0, 5).forEach(function (e) { console.log('    ' + e.slice(0, 200)); });
        }
    } finally {
        if (ff && ff.exitCode === null) { try { ff.stdin.end(); } catch (e) { /* closed */ } }
        if (browser) await browser.close();
        server.close();
    }
}

main().catch(function (err) { console.error('film_part FAILED: ' + (err && err.stack || err)); process.exit(1); });
