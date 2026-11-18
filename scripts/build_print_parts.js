#!/usr/bin/env node
/**
 * build_print_parts.js — the four print parts, ready to send: cover + performance instructions + the part.
 *
 *   node scripts/build_print_parts.js             all four
 *   node scripts/build_print_parts.js --part 3    one (1 Violin I · 2 Violin II · 3 Viola · 4 Cello)
 *
 * Each part is assembled from three things that already exist, every page on the score's own sheet
 * (1200 x 900 pt, landscape 4:3 — print/formats.json):
 *   1. A COVER in the house style, the part's name under the title — drawn by print/cover/make_cover.ps1 from
 *      words this script writes (print/parts/cover/<part>.json), printed to PDF here the way
 *      scripts/render_cover.js prints the score's cover.
 *   2. THE PERFORMANCE INSTRUCTIONS — print/score/instructions.pdf, the same three sheets in every part.
 *   3. THE PART — print/parts/<Part>_6pages.pdf: six rows a page, as on the stand, with the proofing patches of
 *      2026-11-16 (made by  node scripts/generate_print_pdf.js --parts --patched --out print/parts).
 *
 * Output: print/parts/assembled/String_Quartet_No_1-<Part>-JYang.pdf
 * It FAILS if a page is not the sheet's size or a cover does not carry the house face.
 */
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PARTS = [
    { n: 1, file: 'Violin_I', name: 'Violin I' },
    { n: 2, file: 'Violin_II', name: 'Violin II' },
    { n: 3, file: 'Viola', name: 'Viola' },
    { n: 4, file: 'Cello', name: 'Cello' },
];
const ROWS = 6;
const fmts = JSON.parse(fs.readFileSync(path.join(ROOT, 'print', 'formats.json'), 'utf8'));
const F = fmts.formats[fmts.default];
const perIn = F.unit === 'mm' ? 25.4 : 1;
const wPx = Math.round(F.w / perIn * 96), hPx = Math.round(F.h / perIn * 96);     // Chrome: 96 px = 72 pt = 1 in
const wPt = wPx * 0.75, hPt = hPx * 0.75;
const words = JSON.parse(fs.readFileSync(path.join(ROOT, 'print', 'cover', 'cover.json'), 'utf8'));
const COVER_DIR = path.join(ROOT, 'print', 'parts', 'cover');
const OUT_DIR = path.join(ROOT, 'print', 'parts', 'assembled');
const INSTRUCTIONS = path.join(ROOT, 'print', 'score', 'instructions.pdf');

let only = null;
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === '--part' && process.argv[i + 1]) only = parseInt(process.argv[++i], 10);

function sameSheet(doc, what) {
    doc.getPages().forEach(function (p, i) {
        const s = p.getSize();
        if (Math.abs(s.width - wPt) > 0.6 || Math.abs(s.height - hPt) > 0.6) throw new Error(what + ' page ' + (i + 1) + ' is ' + s.width.toFixed(1) + ' x ' + s.height.toFixed(1) + ' pt, not the sheet\'s ' + wPt + ' x ' + hPt);
    });
}

(async function () {
    fs.mkdirSync(COVER_DIR, { recursive: true });
    fs.mkdirSync(OUT_DIR, { recursive: true });
    if (!fs.existsSync(INSTRUCTIONS)) throw new Error('print/score/instructions.pdf not found — node scripts/build_print_score.js makes it');
    const insBytes = fs.readFileSync(INSTRUCTIONS);
    sameSheet(await PDFDocument.load(insBytes), 'the instructions');
    const browser = await puppeteer.launch({ headless: 'new' });
    try {
        for (const part of PARTS) {
            if (only && part.n !== only) continue;
            const src = path.join(ROOT, 'print', 'parts', part.file + '_' + ROWS + 'pages.pdf');
            if (!fs.existsSync(src)) throw new Error(path.relative(ROOT, src) + ' not found — node scripts/generate_print_pdf.js --parts --patched --out print/parts');

            // 1. the cover: the title, the part, the name — the house generator, then printed on the sheet
            const wordsFile = path.join(COVER_DIR, part.file + '.json');
            const svgFile = path.join(COVER_DIR, part.file + '.svg');
            fs.writeFileSync(wordsFile, JSON.stringify({ title: words.title, subtitle: part.name, name: words.name, vertical: words.vertical }, null, 2) + '\n');
            execFileSync('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(ROOT, 'print', 'cover', 'make_cover.ps1'), '-Words', wordsFile, '-Out', svgFile], { stdio: ['ignore', 'pipe', 'inherit'] });
            const svg = fs.readFileSync(svgFile, 'utf8');
            const face = (svg.match(/font-family="([^"]+)"/) || [])[1] || '';
            const page = await browser.newPage();
            await page.setViewport({ width: wPx, height: hPx });
            await page.setContent('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>@page{size:' + wPx + 'px ' + hPx + 'px;margin:0}html,body{margin:0;padding:0;background:#fff}' +
                'svg{display:block;width:' + wPx + 'px;height:' + hPx + 'px}</style></head><body>' + svg + '</body></html>', { waitUntil: 'load' });
            await page.evaluate(function () { return document.fonts.ready; });
            const drawn = await page.evaluate(function () {
                return Array.prototype.map.call(document.querySelectorAll('svg text'), function (t) { return { txt: t.textContent, want: parseFloat(t.getAttribute('data-w')), got: t.getComputedTextLength() }; });
            });
            const coverBuf = await page.pdf({ width: wPx + 'px', height: hPx + 'px', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
            await page.close();
            // the face really used — scripts/render_cover.js's two checks: each line within 3 % of the width the
            // generator measured with the real face (GDI+ has no kerning, Chrome has; another face is further off),
            // and the PDF names the face
            const faceKey = face.replace(/\s+/g, '');
            if (faceKey && Buffer.from(coverBuf).toString('latin1').indexOf(faceKey) < 0) throw new Error('the cover of ' + part.name + ': the PDF does not name the face ' + face);
            for (const d of drawn) if (isFinite(d.want) && Math.abs(d.got - d.want) > d.want * 0.03) throw new Error('the cover of ' + part.name + ': "' + d.txt + '" is ' + d.got.toFixed(1) + ' px wide, the generator measured ' + d.want.toFixed(1) + ' — the face ' + face + ' did not load');
            const cover = await PDFDocument.load(coverBuf);
            if (cover.getPageCount() !== 1) throw new Error('the cover of ' + part.name + ' is ' + cover.getPageCount() + ' pages');
            sameSheet(cover, 'the cover of ' + part.name);

            // 2 + 3. cover, instructions, part
            const partDoc = await PDFDocument.load(fs.readFileSync(src));
            sameSheet(partDoc, part.name);
            const out = await PDFDocument.create();
            for (const d of [cover, await PDFDocument.load(insBytes), partDoc]) (await out.copyPages(d, d.getPageIndices())).forEach(function (p) { out.addPage(p); });
            out.setTitle(words.title + ' — ' + part.name);
            out.setAuthor(words.name);
            const outFile = path.join(OUT_DIR, 'String_Quartet_No_1-' + part.file + '-JYang.pdf');
            const bytes = await out.save();
            fs.writeFileSync(outFile, bytes);
            console.log(path.relative(ROOT, outFile).replace(/\\/g, '/') + ' — ' + out.getPageCount() + ' pages (cover 1 + instructions ' + (await PDFDocument.load(insBytes)).getPageCount() + ' + part ' + partDoc.getPageCount() + '), ' +
                (bytes.length / 1048576).toFixed(2) + ' MB; cover lines: ' + drawn.map(function (d) { return d.txt; }).join(' / '));
        }
    } finally { await browser.close(); }
})().catch(function (e) { console.error('build_print_parts FAILED: ' + (e && e.message || e)); process.exit(1); });
