/**
 * proof_patches.js — what the FILMS and the PRINT PARTS show differently from the old Performance Score,
 * decided at the composer's proofing of 2026-11-16. One place, used by scripts/film_part.js and by
 * scripts/generate_print_pdf.js --patched. Nothing here writes to builds/performance/ or to the score file:
 * the patches are made to the copies a tool hands its own headless browser.
 *
 *   patchScore(score)        1. THE VIOLA'S PIZZ AT 18. Element 42 (M4_vla_BartokPizz_Cs3_final, a Bartók
 *                               pizz at 18.24) is filed on track 2 one whole lane down (offsetYFraction 1.03):
 *                               the full score draws it in the viola's lane, and both parts lose it. It is
 *                               given to track 3 at the same height in the lane.
 *   installLayerFix(...)     run IN THE PAGE; defines window.__filmOrder(), to be called before each frame or
 *                               each printed screen:
 *                            3. NOTATION ON TOP. The notation's layer is kept the last in each row's SVG, so
 *                               it is drawn over the badges, the line wedges and the curves.
 *                            4. A BADGE THAT COVERS NOTATION IS DRAWN LIGHTER (badgeOpacity < 1): a fifth or
 *                               more of the badge lies over a notation element of its own row. badgeAll: every
 *                               badge.
 *   (2, the GC's size, is a text change to index.html and lives in film_part.js: it concerns the moving ball.)
 */

function patchScore(score) {
    const el = (score.svgElements || []).find(function (e) { return e.id === 42 && /M4_vla_BartokPizz_Cs3_final/.test(e.name); });
    if (!el || Number(el.track) !== 2) throw new Error('patch 1: element 42 is not where it was (track ' + (el && el.track) + ')');
    el.track = 3;
    el.offsetYFraction = el.offsetYFraction - 1;
    return 'patch 1: the viola\'s Bartók pizz at 18.24 moved from track 2 to track 3 (y ' + el.offsetYFraction.toFixed(2) + ')';
}

// Serialized into the page by puppeteer: it must stand alone.
function installLayerFix(badgeOpacity, badgeAll, everyCall) {
    let tick = 0;
    window.__filmLight = {};      // the badges made lighter, by where they stand (for a tool's report)
    window.__filmOrder = function () {
        const layers = document.querySelectorAll('[id^="svg-elements-"]');
        for (let i = 0; i < layers.length; i++) { const g = layers[i], p = g.parentNode; if (p && p.lastElementChild !== g) p.appendChild(g); }
        // the badges are looked at on every eighth call while filming (rows are replaced as the piece goes),
        // on every call when printing
        if (badgeOpacity >= 1 || (!everyCall && (tick++ % 8) !== 0)) return;
        const badges = document.querySelectorAll('.badge-element');
        for (let b = 0; b < badges.length; b++) {
            const el = badges[b];
            let light = !!badgeAll;
            if (!light) {
                const r = el.getBoundingClientRect();
                const area = r.width * r.height;
                const svg = el.ownerSVGElement;
                const layer = svg && svg.querySelector('[id^="svg-elements-"]');
                if (area > 0 && layer) {
                    for (let k = 0; k < layer.children.length && !light; k++) {
                        const q = layer.children[k].getBoundingClientRect();
                        const w = Math.min(r.right, q.right) - Math.max(r.left, q.left), h = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
                        if (w > 0 && h > 0 && w * h >= 0.2 * area) light = true;
                    }
                }
            }
            el.style.opacity = light ? String(badgeOpacity) : '';
            if (light && typeof ScoreTime !== 'undefined') window.__filmLight[(el.getAttribute('data-badge-id') || el.id || '?') + '@' + Math.round(ScoreTime.now() / 1000 - 2)] = 1;
        }
    };
    window.__filmOrder();
}

module.exports = { patchScore, installLayerFix };
