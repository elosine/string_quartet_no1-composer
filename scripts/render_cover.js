#!/usr/bin/env node
/**
 * render_cover.js -- the cover SVG as a one-page PDF on the score's sheet.
 *
 * print/cover/make_cover.ps1 draws print/cover/cover-<format>.svg (the house style).
 * This prints that SVG through headless Chrome, at the sheet named in print/formats.json,
 * so the cover page is exactly the size of the score's pages and the face is embedded.
 *
 * Usage:
 *   node scripts/render_cover.js                 # the default format in print/formats.json
 *   node scripts/render_cover.js --format NAME
 *   node scripts/render_cover.js --png           # also a PNG, for a quick look
 *
 * Output: print/cover/cover-<format>.pdf
 *
 * It FAILS if the PDF is not one page, is not the sheet's size, or does not carry the
 * cover's face (a face that fell back silently is the one failure nobody would see).
 */
const puppeteer = require('puppeteer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const fmts = JSON.parse(fs.readFileSync(path.join(ROOT, 'print', 'formats.json'), 'utf8'));
let format = fmts.default;
let wantPng = false;
for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--format' && process.argv[i + 1]) { format = process.argv[++i]; }
    else if (process.argv[i] === '--png') { wantPng = true; }
}
const F = fmts.formats[format];
if (!F) { console.error('unknown format ' + format); process.exit(1); }
const perIn = F.unit === 'mm' ? 25.4 : 1;
const wPx = Math.round(F.w / perIn * 96);   // Chrome: 96 px = 72 pt = 1 in
const hPx = Math.round(F.h / perIn * 96);

const svgPath = path.join(ROOT, 'print', 'cover', 'cover-' + format + '.svg');
const pdfPath = path.join(ROOT, 'print', 'cover', 'cover-' + format + '.pdf');
if (!fs.existsSync(svgPath)) { console.error(svgPath + ' not found -- run print/cover/make_cover.ps1'); process.exit(1); }
const svg = fs.readFileSync(svgPath, 'utf8');
const face = (svg.match(/font-family="([^"]+)"/) || [])[1] || '';

const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' +
    '@page{size:' + wPx + 'px ' + hPx + 'px;margin:0}' +
    'html,body{margin:0;padding:0;background:#fff}' +
    'svg{display:block;width:' + wPx + 'px;height:' + hPx + 'px}' +
    '</style></head><body>' + svg + '</body></html>';

(async function () {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.setViewport({ width: wPx, height: hPx });
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(function () { return document.fonts.ready; });

    // what the browser really drew, against what the generator measured with the real face
    const widths = await page.evaluate(function () {
        return Array.prototype.map.call(document.querySelectorAll('svg text'), function (t) {
            return { txt: t.textContent, want: parseFloat(t.getAttribute('data-w')), got: t.getComputedTextLength() };
        });
    });
    const buf = await page.pdf({ width: wPx + 'px', height: hPx + 'px', printBackground: true,
        margin: { top: 0, right: 0, bottom: 0, left: 0 } });
    fs.writeFileSync(pdfPath, buf);
    if (wantPng) { await page.screenshot({ path: pdfPath.replace(/\.pdf$/, '.png') }); }
    await browser.close();

    const doc = await PDFDocument.load(buf);
    const size = doc.getPage(0).getSize();
    let bad = [];
    if (doc.getPageCount() !== 1) bad.push('pages = ' + doc.getPageCount() + ', wanted 1');
    if (Math.abs(size.width - wPx * 0.75) > 0.6 || Math.abs(size.height - hPx * 0.75) > 0.6) {
        bad.push('sheet = ' + size.width + ' x ' + size.height + ' pt, wanted ' + wPx * 0.75 + ' x ' + hPx * 0.75);
    }
    widths.forEach(function (w) {
        // 3 %: the generator measures with GDI+ (no kerning), Chrome shapes with it -- the same face agrees to
        // about a percent or two; another face does not (septet_LGMF_2026 tools/check_print_front.js, same number)
        if (Math.abs(w.got - w.want) > w.want * 0.03) {
            bad.push('"' + w.txt + '" drew ' + w.got.toFixed(1) + ' pt wide, the generator measured ' + w.want + ' -- the face fell back?');
        }
    });
    const faceKey = face.replace(/\s+/g, '');
    // puppeteer hands back a Uint8Array -- its toString() is a list of numbers, so go through a Buffer
    if (faceKey && Buffer.from(buf).toString('latin1').indexOf(faceKey) < 0) bad.push('the PDF does not name the face ' + face);

    console.log('cover-' + format + '.pdf   ' + size.width + ' x ' + size.height + ' pt   ' + doc.getPageCount() + ' page   face: ' + face);
    widths.forEach(function (w) { console.log('  "' + w.txt + '"  drawn ' + w.got.toFixed(1) + ' pt  (measured ' + w.want + ')'); });
    if (bad.length) { bad.forEach(function (b) { console.error('FAIL  ' + b); }); process.exit(1); }
    console.log('wrote ' + pdfPath);
})();
