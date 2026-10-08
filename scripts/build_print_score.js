#!/usr/bin/env node
/**
 * build_print_score.js -- the print score as ONE PDF: cover + performance instructions + score.
 *
 * (October 2026, for the JACK Quartet call. See print/README.md.)
 *
 * Usage:
 *   node scripts/build_print_score.js                 # build print/score/String_Quartet_No_1-JYang.pdf
 *   node scripts/build_print_score.js --shots DIR     # also a PNG of every instructions sheet, into DIR
 *   node scripts/build_print_score.js --text 13       # the instructions' type size, px on the sheet
 *
 * What it reads:
 *   print/cover/cover-<format>.pdf      the cover (print/cover/make_cover.ps1, then scripts/render_cover.js)
 *   print/instructions/index.html       the updated performance instructions (the page, as it is read on screen)
 *   builds/print/full_score.pdf         the score (scripts/generate_print_pdf.js) -- NOT rebuilt here
 *   print/formats.json                  the sheet
 *
 * What it writes:
 *   print/instructions/print.html       the instructions laid out on the score's sheet (generated; open it in a browser)
 *   print/score/instructions.pdf        those sheets
 *   print/score/String_Quartet_No_1-JYang.pdf
 *
 * THE INSTRUCTIONS ON PAPER -- after septet_LGMF_2026's tools/export_print.js (the house dress):
 * a title bar with a rule, then TWO COLUMNS, each filled before the next (column-fill:auto), in
 * the score's own face (Crimson Pro Light). The quartet's sheet is 1600 x 1200 px -- a little
 * LARGER than A3 landscape -- so two columns stand, as there.
 *
 * What is this piece's own:
 *   - THE PAGE IS NOT RE-DRAWN. Its blocks are laid out exactly as on screen -- an 840 px column,
 *     every image at the width the page gives it -- and each block is then scaled as a whole to the
 *     print column (zoom = print column / 840). So a figure keeps the size, next to its text, that
 *     it has on the posted page. The images stay <img>: the figures' own text asks for
 *     'Crimson Pro Light', which is installed on the composer's machine.
 *   - A RUN OF FIGURES WITH NO WORDS BETWEEN THEM STANDS TWO TO A ROW (the eight notation fragments). On the
 *     posted page they stand one under the other, each less than half the column wide: on paper that is a
 *     sheet and a half of half-empty columns. They keep their order and their ONE common scale (the page
 *     gives every fragment the same staff size); that scale is brought down just far enough for the widest
 *     pair to share a row.
 *   - A BLOCK NEVER BREAKS. A heading goes with what follows it; a line that introduces a figure
 *     goes with the figure; a line that explains the figure above it stays under it.
 *   - THE SHEETS ARE FILLED BY MEASURING, in Chrome: blocks go onto a sheet until one would start
 *     a third column; that block opens the next sheet.
 *
 * THE FINAL BARLINE (the composer, 2026-10-08: "add the final barline to the score") is drawn HERE, onto the last
 * score page of the assembled PDF -- the score PDF itself, the live score and the parts are not touched.
 *   - WHICH SYSTEM: the one that holds the piece's end, found as scripts/generate_print_pdf.js finds it (the latest
 *     end of any curve, figure, conductor or wedge in builds/performance/score.json).
 *   - WHERE, his placing (2026-10-08, after seeing it at the curves' end): AT THE SYSTEM'S RIGHT EDGE, the thick
 *     bar's right edge about 10 px inside the page's white; and FROM JUST UNDER THE TIMELINE -- its ticks and its
 *     numbers, and about 10 px more -- DOWN TO THE SAME MARGIN above the system's foot.
 *   - ITS WEIGHTS are the house's (septet_LGMF_2026 rules.json objects.finalBarLine, LilyPond's "|."): thin 0.19,
 *     gap 0.30, thick 0.60 of a staff space, solid black. The staff space is the instrument staves' own on page 1.
 *
 * It FAILS (no PDF is left behind as the finished one) if a block does not fit a column, if the
 * instructions PDF has a different number of pages than sheets were laid out, or if any page of
 * the finished PDF is not the sheet's size.
 */
const puppeteer = require('puppeteer');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const PRINT = path.join(ROOT, 'print');
const INS_DIR = path.join(PRINT, 'instructions');
const SCORE_DIR = path.join(PRINT, 'score');
const OUT_NAME = 'String_Quartet_No_1-JYang.pdf';
const PIECE_TITLE = 'String Quartet No. 1';
const PIECE_AUTHOR = 'Justin Yang';

// ---- the knobs
const MARGIN_IN = 0.5;        // the sheet's margin (the house's)
const WEB_COL_PX = 840;       // the instructions page's own column: max-width 900 px less 2 x 30 px padding (its styles.css)
const COLS = 2;
const COL_GAP = 36;           // px between the columns (the house's)
const ROW_GAP = 16;           // px between two figures in a row, in the page's own px (its two-image rows use 16)
const TITLE_BAR = 46;         // px the title bar takes off the column's height (the house's)
let TEXT_PX = 13;             // the running text, px ON THE SHEET (the house floor is 10.4)

// ---- the score page AS IT STANDS IN THE PDF (builds/print/full_score.pdf, measured in it 2026-10-08 by cropping a page
// to a few px and reading the edges): the score SVG runs x 11.99 -> 1589.01; the two systems y 10.00 -> 595.00 and
// 605.00 -> 1190.00; a track line lies where 605 + 8 + 144.25 says. On SCREEN the same app measures 11.67 -> 1588.33:
// Chrome lays the page out again for print, a third of a pixel off -- so the PDF's own numbers are used, not the screen's.
const SCORE_PAGE = {
    svgLeft: 12.0, svgWidth: 1577.0, svgHeight: 585,
    rulerInk: 10.08,              // the timeline's ticks and numbers reach this far below a system's top edge (measured: 605.00 -> 615.08)
    svgTop: [10, 605],            // the top system, the bottom system
    timelineHeight: 8,            // the ruler above the four tracks (the app's timelineHeight)
    leadInSeconds: 2,             // a page begins this long before its first whole second (the app's leadInSeconds)
    // the instrument staff on page 1 (the app's createStaffHeaders): a third of a track high, centred in it; in its
    // LilyPond SVG the staff's top line is 1.618 and its bottom line 5.618 down a 7.236-high box -- one unit a staff space
    headerBox: 7.2360, staffTop: 1.618, staffBottom: 5.618
};
const FINAL_BAR = {
    thinSs: 0.19, gapSs: 0.30, thickSs: 0.60,   // the house's, in staff spaces
    clearPx: 10,                                // air under the timeline's numbers, and the same again above the system's foot
    insetRightPx: 10                            // the thick bar's right edge, this far inside the system's right edge
};

let format = null, shotsDir = null;
for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i];
    if (a === '--format' && process.argv[i + 1]) format = process.argv[++i];
    else if (a === '--shots' && process.argv[i + 1]) shotsDir = path.resolve(process.argv[++i]);
    else if (a === '--text' && process.argv[i + 1]) TEXT_PX = parseFloat(process.argv[++i]);
}

// ---- the sheet
const fmts = JSON.parse(fs.readFileSync(path.join(PRINT, 'formats.json'), 'utf8'));
if (!format) format = fmts.default;
const F = fmts.formats[format];
if (!F) { console.error('unknown format ' + format); process.exit(1); }
const perIn = F.unit === 'mm' ? 25.4 : 1;
const W = Math.round(F.w / perIn * 96), H = Math.round(F.h / perIn * 96);   // CSS px: 96 = 1 in = 72 pt
const M = MARGIN_IN * 96;
const FRAME_W = W - 2 * M;
const COL_W = (FRAME_W - COL_GAP * (COLS - 1)) / COLS;
const COL_H = H - 2 * M - TITLE_BAR;
const K = COL_W / WEB_COL_PX;             // one block of the page -> one print column
const FS = TEXT_PX / K;                   // the text's size INSIDE a block, before the block is scaled

const COVER_PDF = path.join(PRINT, 'cover', 'cover-' + format + '.pdf');
const SCORE_PDF = path.join(ROOT, 'builds', 'print', 'full_score.pdf');
const INS_SRC = path.join(INS_DIR, 'index.html');
const INS_HTML = path.join(INS_DIR, 'print.html');
const INS_PDF = path.join(SCORE_DIR, 'instructions.pdf');
const OUT_PDF = path.join(SCORE_DIR, OUT_NAME);

[[COVER_PDF, 'run print/cover/make_cover.ps1, then node scripts/render_cover.js'],
 [SCORE_PDF, 'run node scripts/generate_print_pdf.js'],
 [INS_SRC, 'the updated instructions page is missing']].forEach(function (p) {
    if (!fs.existsSync(p[0])) { console.error(path.relative(ROOT, p[0]) + ' not found -- ' + p[1]); process.exit(1); }
});
fs.mkdirSync(SCORE_DIR, { recursive: true });

// ---------------------------------------------------------------- the instructions, as sheets
function fontFace(file, style) {
    const b64 = fs.readFileSync(path.join(ROOT, 'public', 'fonts', file)).toString('base64');
    return "@font-face{font-family:'Crimson Pro Light';font-style:" + style + ";font-weight:300;src:url(data:font/ttf;base64," + b64 + ") format('truetype');}";
}

function styleBlock() {
    return [
        fontFace('CrimsonPro-Light.ttf', 'normal'),
        fontFace('CrimsonPro-LightItalic.ttf', 'italic'),
        // the page's <strong>: the repository carries the Light faces only; the heavier one is the machine's
        "@font-face{font-family:'Crimson Pro Light';font-style:normal;font-weight:700;src:local('Crimson Pro SemiBold'),local('CrimsonPro-SemiBold');}",
        '@page{size:' + W + 'px ' + H + 'px;margin:0;}',
        'html,body{margin:0;padding:0;background:#fff;}',
        '.page{position:relative;width:' + W + 'px;height:' + H + 'px;overflow:hidden;break-after:page;page-break-after:always;background:#fff;}',
        '.page:last-child{break-after:auto;page-break-after:auto;}',
        ".insframe{position:absolute;left:" + M + "px;top:" + M + "px;width:" + FRAME_W + "px;height:" + (H - 2 * M) + "px;font-family:'Crimson Pro Light',serif;font-weight:300;color:#111;}",
        '.institle{display:flex;align-items:baseline;gap:18px;border-bottom:0.75px solid #111;padding-bottom:4px;margin-bottom:9px;}',
        '.institle .t{font-size:21px;letter-spacing:3px;}',
        '.institle .s{font-size:12px;font-style:italic;color:#444;}',
        // column-fill:auto FILLS the first column before the second starts -- what a printed sheet of fixed height wants
        '.cols{column-count:' + COLS + ';column-fill:auto;column-gap:' + COL_GAP + 'px;height:' + COL_H + 'px;}',
        // ONE BLOCK OF THE PAGE: laid out as on screen (an 840 px column), scaled whole to the print column, never broken
        // the air between blocks is MARGIN, not padding: the browser drops a margin at a column's top and foot, so a
        // column begins at the rule and a block is not pushed over for the sake of the air under it
        '.unit{zoom:' + K.toFixed(5) + ';break-inside:avoid;font-size:' + FS.toFixed(3) + 'px;line-height:1.38;margin:0 0 14px;}',
        '.unit.sec{margin-top:30px;}',
        '.cols > .unit:first-child{margin-top:0;}',
        '.unit *{box-sizing:border-box;}',
        '.unit h3{font-size:1.22em;font-weight:300;letter-spacing:0.12em;margin:0 0 0.45em;}',
        '.unit h4{font-size:1em;font-weight:300;font-style:italic;letter-spacing:0.05em;margin:0.8em 0 0.4em;}',
        '.unit p{margin:0 0 0.45em;}',
        '.unit strong{font-weight:700;}',
        '.unit .notation-section + .notation-section{margin-top:0.7em;}',
        // the page's own figure: a hairline frame, white ground, 8 px of air (its styles.css)
        '.unit .notation-section img{display:block;max-width:100%;height:auto;border:1px solid #c8c8c8;background:#fff;padding:8px;}',
        '.unit .notation-section .description{margin-top:0.55em;}',
        '.unit .notation-section .description p{margin-bottom:0.3em;}',
        '.unit .notation-section > h4{margin-top:1em;}',
        '.unit .notation-section.side-by-side{display:flex;gap:24px;align-items:flex-start;}',
        '.unit .notation-section.side-by-side .image-col{flex:0 0 45%;max-width:45%;}',
        '.unit .notation-section.side-by-side .image-col img{width:100%;}',
        '.unit .notation-section.side-by-side .text-col{flex:1;}',
        // a row of figures (see paginate: a run of figures with no words between them)
        '.unit .notation-section.figrow{display:flex;gap:' + ROW_GAP + 'px;align-items:flex-start;}',
        '.unit .notation-section.figrow img{flex:none;}',
        // on screen only: the sheets as sheets, on a grey desk
        '@media screen{html,body{background:#6f6f6f;}.page{margin:18px auto;box-shadow:0 2px 14px rgba(0,0,0,.45);}}'
    ].join('\n');
}

// runs IN THE PAGE: sorts the page's blocks into units, then fills sheets by measuring
function paginate(TITLE, SUBTITLE, ROW_W, ROW_GAP) {
    var src = document.getElementById('src');
    function isHead(e) { return /^H[1-6]$/.test(e.tagName); }
    // A RUN OF FIGURES WITH NO WORDS BETWEEN THEM: three or more blocks in a row, each one image with a width in px
    // of its own. They are set two to a row, in order, all at ONE factor -- the largest at which every pair fits.
    function loneImg(e) {
        if (isHead(e) || e.tagName === 'IMG' || e.children.length !== 1 || e.children[0].tagName !== 'IMG' || e.textContent.trim()) return null;
        var m = /(?:^|;)\s*width\s*:\s*([\d.]+)px/.exec(e.children[0].getAttribute('style') || '');
        return m ? { img: e.children[0], w: parseFloat(m[1]) } : null;
    }
    var rowsMade = null;
    (function () {
        var all = Array.prototype.slice.call(src.children), i = 0;
        while (i < all.length) {
            var run = [];
            while (i + run.length < all.length && loneImg(all[i + run.length])) run.push(loneImg(all[i + run.length]));
            if (run.length < 3) { i += Math.max(1, run.length); continue; }
            var g = 1, j;
            for (j = 0; j + 1 < run.length; j += 2) g = Math.min(g, (ROW_W - ROW_GAP) / (run[j].w + run[j + 1].w));
            g = Math.floor(g * 1000) / 1000;
            for (j = 0; j < run.length; j += 2) {
                var row = document.createElement('div');
                row.className = 'notation-section figrow';
                src.insertBefore(row, all[i + j]);
                [run[j], run[j + 1]].forEach(function (r) { if (r) { r.img.style.width = (r.w * g).toFixed(1) + 'px'; row.appendChild(r.img); } });
            }
            for (j = 0; j < run.length; j++) src.removeChild(all[i + j]);
            rowsMade = (rowsMade ? rowsMade + '; ' : '') + run.length + ' figures in ' + Math.ceil(run.length / 2) + ' rows at ' + Math.round(100 * g) + ' % of their size on the page';
            i += run.length;
        }
    })();
    var kids = Array.prototype.slice.call(src.children);
    function isFig(e) { return !isHead(e) && (e.tagName === 'IMG' || !!e.querySelector('img')); }
    function isText(e) { return !isHead(e) && !isFig(e); }
    var units = [], pend = [];
    for (var i = 0; i < kids.length; i++) {
        var k = kids[i], prev = kids[i - 1], next = kids[i + 1];
        // a line that EXPLAINS the figure above it stays under that figure
        if (isText(k) && prev && isFig(prev) && !pend.length && units.length) { units[units.length - 1].push(k); continue; }
        pend.push(k);
        if (isHead(k)) continue;                                   // a heading goes with what follows it
        if (isText(k) && next && isFig(next)) continue;            // a line that INTRODUCES a figure goes with it
        units.push(pend); pend = [];
    }
    if (pend.length) units.push(pend);

    var nPages = 0, problems = [];
    function newPage() {
        var pg = document.createElement('div');
        pg.className = 'page ins';
        pg.innerHTML = '<div class="insframe"><div class="institle"><span class="t"></span><span class="s"></span></div><div class="cols"></div></div>';
        pg.querySelector('.t').textContent = TITLE;
        pg.querySelector('.s').innerHTML = nPages === 0 ? SUBTITLE : 'continued';
        document.body.appendChild(pg);
        nPages++;
        return pg.querySelector('.cols');
    }
    function over(c) { return c.scrollWidth > c.clientWidth + 1 || c.scrollHeight > c.clientHeight + 1; }
    function label(u) { var h = u.querySelector('h3, h4, strong'); return h ? h.textContent.trim() : (u.textContent.trim().slice(0, 40) || 'a figure'); }

    var cols = newPage(), onPage = 0;
    units.forEach(function (els) {
        var u = document.createElement('div');
        u.className = 'unit' + (els[0].tagName === 'H3' ? ' sec' : '');
        els.forEach(function (e) { u.appendChild(e); });
        cols.appendChild(u);
        if (over(cols) && onPage > 0) { cols.removeChild(u); cols = newPage(); onPage = 0; cols.appendChild(u); }
        if (over(cols)) problems.push('"' + label(u) + '" does not fit a column by itself');
        onPage++;
    });
    src.parentNode.removeChild(src);

    // how full each sheet is: the lowest point reached in each column, of the column's height
    var fill = Array.prototype.map.call(document.querySelectorAll('.cols'), function (c) {
        var cr = c.getBoundingClientRect(), gap = parseFloat(getComputedStyle(c).columnGap) || 0;
        var n = parseInt(getComputedStyle(c).columnCount, 10) || 1, colW = (cr.width - gap * (n - 1)) / n, low = [];
        for (var j = 0; j < n; j++) low.push(0);
        Array.prototype.forEach.call(c.children, function (u) {
            var r = u.getBoundingClientRect(), col = Math.max(0, Math.min(n - 1, Math.round((r.left - cr.left) / (colW + gap))));
            low[col] = Math.max(low[col], r.bottom - cr.top);
        });
        return low.map(function (v) { return Math.round(100 * v / cr.height) + '%'; }).join(' · ');
    });
    var broken = Array.prototype.filter.call(document.images, function (im) { return !im.complete || im.naturalWidth === 0; })
        .map(function (im) { return im.getAttribute('src'); });
    return { pages: nPages, units: units.length, problems: problems, fill: fill, broken: broken, rows: rowsMade };
}

function buildInstructionsHtml() {
    let body = /<body>([\s\S]*)<\/body>/.exec(fs.readFileSync(INS_SRC, 'utf8'))[1];
    body = body.replace(/<!--[\s\S]*?-->/g, '');
    // the title block becomes the sheet's title bar; the rest flows
    const tm = /<h1>([\s\S]*?)<\/h1>\s*<p class="subtitle">([\s\S]*?)<\/p>/.exec(body);
    const title = tm ? tm[1].trim() : 'Performance Instructions';
    const subtitle = tm ? tm[2].trim() : '';
    if (tm) body = body.replace(tm[0], '');
    const html = '<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n' +
        '<!-- GENERATED by scripts/build_print_score.js from index.html -- do not edit; edit index.html and build again. -->\n' +
        '<title>' + title + ' — ' + PIECE_TITLE + ' (print sheets)</title>\n' +
        '<style>\n' + styleBlock() + '\n</style>\n</head>\n<body>\n' +
        '<div id="src" style="display:none">' + body + '</div>\n' +
        '<script>\n' + paginate.toString() + '\n' +
        'window.addEventListener("load", function () {\n' +
        '  var f = document.fonts, faces = ["300 16px \'Crimson Pro Light\'", "italic 300 16px \'Crimson Pro Light\'", "700 16px \'Crimson Pro Light\'"];\n' +
        '  Promise.all(faces.map(function (x) { return f.load(x).catch(function () {}); })).then(function () { return f.ready; }).then(function () {\n' +
        '    window.__ins = paginate(' + JSON.stringify(title) + ', ' + JSON.stringify(subtitle) + ', ' + WEB_COL_PX + ', ' + ROW_GAP + ');\n' +
        '  });\n' +
        '});\n</script>\n</body>\n</html>\n';
    fs.writeFileSync(INS_HTML, html);
}

// ---------------------------------------------------------------- the final barline
// Returns where it goes: which page of the score PDF (0-based), and the two bars as rectangles in the page's px.
function finalBarline() {
    const sd = JSON.parse(fs.readFileSync(path.join(ROOT, 'builds', 'performance', 'score.json'), 'utf8'));
    const tempo = sd.tempoHistory && sd.tempoHistory['0'];
    const spp = (60 / ((tempo && tempo.bpm) || 60)) * ((tempo && tempo.beatsPerPage) || 8);
    // the piece's end, as scripts/generate_print_pdf.js finds it -- it says WHICH SYSTEM is the last
    let end = 0;
    (sd.svgElements || []).forEach(function (el) {
        const start = (el.referenceSeconds || 0) + (el.offsetSeconds || 0);
        end = Math.max(end, el.endSeconds || (start + (el.durationSeconds || 0)));
    });
    const db = sd.databases || {};
    ((db.curves && db.curves.curves) || []).forEach(function (c) { end = Math.max(end, c.endSeconds || ((c.startSeconds || 0) + (c.durationSeconds || 0))); });
    ((db.gcs && db.gcs.gcs) || []).forEach(function (g) { end = Math.max(end, g.impactSeconds || 0); });
    ((db.lineWedges && db.lineWedges.lineWedges) || []).forEach(function (w) { end = Math.max(end, w.endSeconds || ((w.startSeconds || 0) + (w.durationSeconds || 0))); });

    const P = SCORE_PAGE, B = FINAL_BAR;
    const scorePage = Math.floor((end + P.leadInSeconds) / spp);            // a page holds spp seconds, the first from -leadIn
    const across = (end + P.leadInSeconds - scorePage * spp) / spp;
    const top = P.svgTop[scorePage % 2];                                    // an even page is the top system
    const track = (P.svgHeight - P.timelineHeight) / 4, ss = (track / 3) / P.headerBox;    // the instrument staves' staff space
    const thick = B.thickSs * ss, gap = B.gapSs * ss, thin = B.thinSs * ss;
    // his placing: at the system's right edge, from just under the timeline's numbers to the same margin above the foot
    const xRight = P.svgLeft + P.svgWidth - B.insetRightPx;
    const margin = P.rulerInk + B.clearPx;
    const y1 = top + margin, y2 = top + P.svgHeight - margin;
    return {
        end: end, pdfPage: Math.floor(scorePage / 2), system: scorePage % 2 ? 'bottom' : 'top', across: across, ss: ss, margin: margin, xRight: xRight,
        rects: [
            { x: xRight - thick - gap - thin, y: y1, w: thin, h: y2 - y1 },   // thin
            { x: xRight - thick, y: y1, w: thick, h: y2 - y1 }                // thick, the outer one
        ]
    };
}

// ---------------------------------------------------------------- build
(async function () {
    buildInstructionsHtml();

    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H });
    await page.emulateMediaType('print');              // measure in the dress that is printed
    await page.goto(pathToFileURL(INS_HTML).href, { waitUntil: 'load' });
    await page.waitForFunction('window.__ins', { timeout: 30000 });
    const ins = await page.evaluate('window.__ins');
    if (shotsDir) {
        fs.mkdirSync(shotsDir, { recursive: true });
        for (let i = 0; i < ins.pages; i++) {
            await page.screenshot({ path: path.join(shotsDir, 'instructions-' + (i + 1) + '.png'), clip: { x: 0, y: i * H, width: W, height: H } });
        }
    }
    const insBuf = Buffer.from(await page.pdf({ width: W + 'px', height: H + 'px', printBackground: true, preferCSSPageSize: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 } }));
    await browser.close();
    fs.writeFileSync(INS_PDF, insBuf);

    const bad = [];
    ins.problems.forEach(function (p) { bad.push(p); });
    ins.broken.forEach(function (b) { bad.push('image did not load: ' + b); });
    const insDoc = await PDFDocument.load(insBuf);
    if (insDoc.getPageCount() !== ins.pages) bad.push('the instructions PDF has ' + insDoc.getPageCount() + ' pages for ' + ins.pages + ' sheets laid out');
    const raw = insBuf.toString('latin1');
    const faces = (raw.match(/\/FontName\s*\/[A-Za-z0-9+_-]+/g) || []).map(function (s) { return s.replace(/^.*\+/, '').replace(/^\/FontName\s*\//, ''); })
        .filter(function (v, i, a) { return a.indexOf(v) === i; });
    if (raw.indexOf('CrimsonPro-Light') < 0) bad.push('the instructions PDF does not carry Crimson Pro Light');

    // ---- cover + instructions + score
    const out = await PDFDocument.create();
    const parts = [['cover', fs.readFileSync(COVER_PDF)], ['instructions', insBuf], ['score', fs.readFileSync(SCORE_PDF)]];
    const counts = {}, firstPage = {};
    for (const part of parts) {
        const doc = await PDFDocument.load(part[1]);
        counts[part[0]] = doc.getPageCount();
        firstPage[part[0]] = out.getPageCount();
        (await out.copyPages(doc, doc.getPageIndices())).forEach(function (pg) { out.addPage(pg); });
    }
    // the final barline, onto the score page that holds the piece's end
    const bar = finalBarline();
    if (bar.pdfPage !== counts.score - 1) bad.push('the piece ends on score page ' + (bar.pdfPage + 1) + ' but the score PDF has ' + counts.score + ' pages -- score.json and full_score.pdf do not agree');
    else {
        const pg = out.getPage(firstPage.score + bar.pdfPage), ph = pg.getSize().height;
        bar.rects.forEach(function (r) {
            pg.drawRectangle({ x: r.x * 0.75, y: ph - (r.y + r.h) * 0.75, width: r.w * 0.75, height: r.h * 0.75, color: rgb(0, 0, 0), borderWidth: 0 });
        });
    }
    out.setTitle(PIECE_TITLE);
    out.setAuthor(PIECE_AUTHOR);
    out.getPages().forEach(function (pg, i) {
        const s = pg.getSize();
        if (Math.abs(s.width - W * 0.75) > 0.6 || Math.abs(s.height - H * 0.75) > 0.6) bad.push('page ' + (i + 1) + ' is ' + s.width.toFixed(1) + ' x ' + s.height.toFixed(1) + ' pt, not the sheet');
    });
    const outBuf = Buffer.from(await out.save());

    console.log('sheet           ' + W + ' x ' + H + ' px = ' + W * 0.75 + ' x ' + H * 0.75 + ' pt (' + format + ')');
    console.log('instructions    ' + ins.pages + ' sheet(s), ' + ins.units + ' blocks, ' + COLS + ' columns of ' + Math.round(COL_W) + ' px; text ' + TEXT_PX + ' px; a block at ' + (100 * K).toFixed(1) + ' % of its size on screen');
    ins.fill.forEach(function (f, i) { console.log('  sheet ' + (i + 1) + '       columns filled ' + f); });
    if (ins.rows) console.log('  rows          ' + ins.rows);
    console.log('  faces         ' + faces.join(', '));
    console.log('pages           cover ' + counts.cover + ' + instructions ' + counts.instructions + ' + score ' + counts.score + ' = ' + out.getPageCount());
    console.log('final barline   PDF page ' + (firstPage.score + bar.pdfPage + 1) + ', ' + bar.system + ' system (the piece ends there, at ' + bar.end.toFixed(2) + ' s, ' + (100 * bar.across).toFixed(1) + ' % across); ' +
        'right edge at ' + bar.xRight.toFixed(1) + ' px, ' + bar.rects[0].y.toFixed(1) + ' -> ' + (bar.rects[0].y + bar.rects[0].h).toFixed(1) + ' px (' + bar.margin.toFixed(1) + ' px inside the system top and foot); thin ' +
        bar.rects[0].w.toFixed(2) + ' px, thick ' + bar.rects[1].w.toFixed(2) + ' px');
    if (bad.length) {
        bad.forEach(function (b) { console.error('FAIL  ' + b); });
        console.error('nothing written to ' + path.relative(ROOT, OUT_PDF));
        process.exit(1);
    }
    fs.writeFileSync(OUT_PDF, outBuf);
    console.log('wrote           ' + path.relative(ROOT, OUT_PDF) + '  (' + (outBuf.length / 1048576).toFixed(1) + ' MB)');
})().catch(function (e) { console.error(e); process.exit(1); });
