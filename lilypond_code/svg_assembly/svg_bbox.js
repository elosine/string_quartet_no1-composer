/**
 * SVG Path Bounding Box Calculator
 * 
 * Computes exact bounding boxes for SVG path data strings, including
 * cubic Bézier curve extrema. Used by the SVG Assembly Engine to enable
 * precise edge-to-edge spacing and midline alignment of notation glyphs.
 * 
 * EXPANDABILITY NOTES:
 * ─────────────────────
 * When adding NEW GLYPHS to svg_component_library.json:
 *   1. Add the raw path string and scale to the library JSON
 *   2. Run: node svg_bbox.js populate
 *      This will compute bboxes for ALL glyphs and update the JSON
 *   3. For TEXT elements (not paths), bbox must be measured from a
 *      rendered SVG since text metrics depend on the font engine.
 *      Add text bboxes manually to the library under the text entry.
 *   4. Run: node svg_bbox.js verify
 *      This prints all bboxes for visual inspection
 * 
 * The bbox format is: { left, top, right, bottom } in staff-spaces
 * (after applying the glyph's scale factor).
 *   left/right = X extent, top/bottom = Y extent
 *   In SVG coords: top < bottom (positive Y = down)
 * 
 * For COMPOSITE glyphs (like dynamics "ppp" = 3× "p" glyph):
 *   The composite bbox is computed by combining individual glyph bboxes
 *   at their spacing offsets. This is done by computeCompositeBbox().
 */

// ============================================
// SVG PATH PARSER
// ============================================

/**
 * Parse an SVG path `d` attribute into an array of command objects.
 * Supports: M, m, L, l, H, h, V, v, C, c, S, s, Q, q, T, t, A, a, Z, z
 * @param {string} d - SVG path data string
 * @returns {Array<{cmd: string, args: number[]}>}
 */
function parsePath(d) {
    const commands = [];
    // Match command letter followed by its numeric arguments
    const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
    let match;
    while ((match = re.exec(d)) !== null) {
        const cmd = match[1];
        const argStr = match[2].trim();
        const args = argStr.length > 0
            ? argStr.split(/[\s,]+/).map(Number)
            : [];
        commands.push({ cmd, args });
    }
    return commands;
}

// ============================================
// CUBIC BÉZIER EXTREMA
// ============================================

/**
 * Find the min and max of a cubic Bézier curve on one axis.
 * The curve is defined by four control points: p0, p1, p2, p3.
 * We solve for t where the derivative = 0, then evaluate at those t values
 * plus the endpoints t=0 and t=1.
 * 
 * @param {number} p0 - Start point
 * @param {number} p1 - Control point 1
 * @param {number} p2 - Control point 2
 * @param {number} p3 - End point
 * @returns {{min: number, max: number}}
 */
function cubicBezierMinMax(p0, p1, p2, p3) {
    let min = Math.min(p0, p3);
    let max = Math.max(p0, p3);

    // Derivative: 3(1-t)²(p1-p0) + 6(1-t)t(p2-p1) + 3t²(p3-p2) = 0
    // Simplifies to: at² + bt + c = 0
    const a = 3 * (-p0 + 3 * p1 - 3 * p2 + p3);
    const b = 6 * (p0 - 2 * p1 + p2);
    const c = 3 * (p1 - p0);

    if (Math.abs(a) < 1e-12) {
        // Linear or constant derivative
        if (Math.abs(b) > 1e-12) {
            const t = -c / b;
            if (t > 0 && t < 1) {
                const val = cubicBezierAt(p0, p1, p2, p3, t);
                min = Math.min(min, val);
                max = Math.max(max, val);
            }
        }
    } else {
        const disc = b * b - 4 * a * c;
        if (disc >= 0) {
            const sqrtDisc = Math.sqrt(disc);
            const t1 = (-b + sqrtDisc) / (2 * a);
            const t2 = (-b - sqrtDisc) / (2 * a);
            for (const t of [t1, t2]) {
                if (t > 0 && t < 1) {
                    const val = cubicBezierAt(p0, p1, p2, p3, t);
                    min = Math.min(min, val);
                    max = Math.max(max, val);
                }
            }
        }
    }
    return { min, max };
}

/**
 * Evaluate cubic Bézier at parameter t
 */
function cubicBezierAt(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    return mt * mt * mt * p0 + 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t * p3;
}

// ============================================
// QUADRATIC BÉZIER EXTREMA
// ============================================

/**
 * Find min/max of a quadratic Bézier on one axis.
 * @param {number} p0 - Start
 * @param {number} p1 - Control
 * @param {number} p2 - End
 * @returns {{min: number, max: number}}
 */
function quadBezierMinMax(p0, p1, p2) {
    let min = Math.min(p0, p2);
    let max = Math.max(p0, p2);

    // Derivative: 2(1-t)(p1-p0) + 2t(p2-p1) = 0  →  t = (p0-p1)/(p0-2p1+p2)
    const denom = p0 - 2 * p1 + p2;
    if (Math.abs(denom) > 1e-12) {
        const t = (p0 - p1) / denom;
        if (t > 0 && t < 1) {
            const mt = 1 - t;
            const val = mt * mt * p0 + 2 * mt * t * p1 + t * t * p2;
            min = Math.min(min, val);
            max = Math.max(max, val);
        }
    }
    return { min, max };
}

// ============================================
// PATH BOUNDING BOX
// ============================================

/**
 * Compute the bounding box of an SVG path in its native coordinate space
 * (before any scale transform is applied).
 * 
 * @param {string} d - SVG path data string
 * @returns {{minX: number, minY: number, maxX: number, maxY: number}}
 */
function pathBbox(d) {
    const cmds = parsePath(d);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let cx = 0, cy = 0;  // current point
    let sx = 0, sy = 0;  // subpath start
    let prevCp2x = 0, prevCp2y = 0; // for S/s smooth curves
    let prevQpx = 0, prevQpy = 0;   // for T/t smooth quad

    function expand(x, y) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    for (const { cmd, args } of cmds) {
        switch (cmd) {
            case 'M':
                for (let i = 0; i < args.length; i += 2) {
                    cx = args[i]; cy = args[i + 1];
                    expand(cx, cy);
                    if (i === 0) { sx = cx; sy = cy; }
                }
                break;
            case 'm':
                for (let i = 0; i < args.length; i += 2) {
                    cx += args[i]; cy += args[i + 1];
                    expand(cx, cy);
                    if (i === 0) { sx = cx; sy = cy; }
                }
                break;
            case 'L':
                for (let i = 0; i < args.length; i += 2) {
                    cx = args[i]; cy = args[i + 1];
                    expand(cx, cy);
                }
                break;
            case 'l':
                for (let i = 0; i < args.length; i += 2) {
                    cx += args[i]; cy += args[i + 1];
                    expand(cx, cy);
                }
                break;
            case 'H':
                for (let i = 0; i < args.length; i++) {
                    cx = args[i];
                    expand(cx, cy);
                }
                break;
            case 'h':
                for (let i = 0; i < args.length; i++) {
                    cx += args[i];
                    expand(cx, cy);
                }
                break;
            case 'V':
                for (let i = 0; i < args.length; i++) {
                    cy = args[i];
                    expand(cx, cy);
                }
                break;
            case 'v':
                for (let i = 0; i < args.length; i++) {
                    cy += args[i];
                    expand(cx, cy);
                }
                break;
            case 'C':
                for (let i = 0; i < args.length; i += 6) {
                    const x1 = args[i], y1 = args[i+1];
                    const x2 = args[i+2], y2 = args[i+3];
                    const x3 = args[i+4], y3 = args[i+5];
                    const bx = cubicBezierMinMax(cx, x1, x2, x3);
                    const by = cubicBezierMinMax(cy, y1, y2, y3);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevCp2x = x2; prevCp2y = y2;
                    cx = x3; cy = y3;
                }
                break;
            case 'c':
                for (let i = 0; i < args.length; i += 6) {
                    const x1 = cx + args[i], y1 = cy + args[i+1];
                    const x2 = cx + args[i+2], y2 = cy + args[i+3];
                    const x3 = cx + args[i+4], y3 = cy + args[i+5];
                    const bx = cubicBezierMinMax(cx, x1, x2, x3);
                    const by = cubicBezierMinMax(cy, y1, y2, y3);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevCp2x = x2; prevCp2y = y2;
                    cx = x3; cy = y3;
                }
                break;
            case 'S':
                for (let i = 0; i < args.length; i += 4) {
                    const x1 = 2 * cx - prevCp2x, y1 = 2 * cy - prevCp2y;
                    const x2 = args[i], y2 = args[i+1];
                    const x3 = args[i+2], y3 = args[i+3];
                    const bx = cubicBezierMinMax(cx, x1, x2, x3);
                    const by = cubicBezierMinMax(cy, y1, y2, y3);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevCp2x = x2; prevCp2y = y2;
                    cx = x3; cy = y3;
                }
                break;
            case 's':
                for (let i = 0; i < args.length; i += 4) {
                    const x1 = 2 * cx - prevCp2x, y1 = 2 * cy - prevCp2y;
                    const x2 = cx + args[i], y2 = cy + args[i+1];
                    const x3 = cx + args[i+2], y3 = cy + args[i+3];
                    const bx = cubicBezierMinMax(cx, x1, x2, x3);
                    const by = cubicBezierMinMax(cy, y1, y2, y3);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevCp2x = x2; prevCp2y = y2;
                    cx = x3; cy = y3;
                }
                break;
            case 'Q':
                for (let i = 0; i < args.length; i += 4) {
                    const x1 = args[i], y1 = args[i+1];
                    const x2 = args[i+2], y2 = args[i+3];
                    const bx = quadBezierMinMax(cx, x1, x2);
                    const by = quadBezierMinMax(cy, y1, y2);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevQpx = x1; prevQpy = y1;
                    cx = x2; cy = y2;
                }
                break;
            case 'q':
                for (let i = 0; i < args.length; i += 4) {
                    const x1 = cx + args[i], y1 = cy + args[i+1];
                    const x2 = cx + args[i+2], y2 = cy + args[i+3];
                    const bx = quadBezierMinMax(cx, x1, x2);
                    const by = quadBezierMinMax(cy, y1, y2);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevQpx = x1; prevQpy = y1;
                    cx = x2; cy = y2;
                }
                break;
            case 'T':
                for (let i = 0; i < args.length; i += 2) {
                    const x1 = 2 * cx - prevQpx, y1 = 2 * cy - prevQpy;
                    const x2 = args[i], y2 = args[i+1];
                    const bx = quadBezierMinMax(cx, x1, x2);
                    const by = quadBezierMinMax(cy, y1, y2);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevQpx = x1; prevQpy = y1;
                    cx = x2; cy = y2;
                }
                break;
            case 't':
                for (let i = 0; i < args.length; i += 2) {
                    const x1 = 2 * cx - prevQpx, y1 = 2 * cy - prevQpy;
                    const x2 = cx + args[i], y2 = cy + args[i+1];
                    const bx = quadBezierMinMax(cx, x1, x2);
                    const by = quadBezierMinMax(cy, y1, y2);
                    expand(bx.min, by.min);
                    expand(bx.max, by.max);
                    prevQpx = x1; prevQpy = y1;
                    cx = x2; cy = y2;
                }
                break;
            case 'Z':
            case 'z':
                cx = sx; cy = sy;
                break;
        }
    }
    return { minX, minY, maxX, maxY };
}

// ============================================
// SCALED BOUNDING BOX
// ============================================

/**
 * Compute the bounding box of a glyph path after applying its scale transform.
 * 
 * Important: SVG scale(sx, sy) with negative sy FLIPS the Y axis.
 * The path coordinates get multiplied by the scale factors, so:
 *   - scaledX = pathX * sx
 *   - scaledY = pathY * sy  (if sy is negative, Y is flipped)
 * 
 * Returns bbox in staff-spaces with SVG convention (positive Y = down).
 * 
 * @param {string} pathD - SVG path data string
 * @param {number[]} scale - [sx, sy] scale factors (sy is typically negative)
 * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number, midX: number, midY: number}}
 */
function scaledBbox(pathD, scale) {
    const raw = pathBbox(pathD);
    const [sx, sy] = scale;

    // Apply scale — note that negative sy flips min/max
    const x1 = raw.minX * sx;
    const x2 = raw.maxX * sx;
    const y1 = raw.minY * sy;
    const y2 = raw.maxY * sy;

    const left = Math.min(x1, x2);
    const right = Math.max(x1, x2);
    const top = Math.min(y1, y2);
    const bottom = Math.max(y1, y2);

    return {
        left, top, right, bottom,
        width: right - left,
        height: bottom - top,
        midX: (left + right) / 2,
        midY: (top + bottom) / 2
    };
}

/**
 * Compute the bounding box of a composite dynamic marking (e.g., "ppp", "mp").
 * Combines individual glyph bboxes at their spacing offsets.
 * 
 * @param {string} dynamicName - e.g., 'ppp', 'ff', 'mp'
 * @param {object} library - The component library object
 * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number, midX: number, midY: number}}
 */
function computeCompositeBbox(dynamicName, library) {
    const composite = library.components.dynamics.composites[dynamicName];
    if (!composite) return null;
    const dynScale = library.components.dynamics.scale;
    const glyphData = library.components.dynamics.glyphs;

    let compLeft = Infinity, compTop = Infinity;
    let compRight = -Infinity, compBottom = -Infinity;
    let offsetX = 0;

    for (let i = 0; i < composite.glyphs.length; i++) {
        const glyphName = composite.glyphs[i];
        const glyph = glyphData[glyphName];

        if (composite.spacing) {
            offsetX = composite.spacing[i];
        } else if (i > 0) {
            offsetX += glyph.glyphSpacing;
        }

        const gb = scaledBbox(glyph.path, dynScale);
        compLeft = Math.min(compLeft, gb.left + offsetX);
        compTop = Math.min(compTop, gb.top);
        compRight = Math.max(compRight, gb.right + offsetX);
        compBottom = Math.max(compBottom, gb.bottom);
    }

    return {
        left: compLeft, top: compTop, right: compRight, bottom: compBottom,
        width: compRight - compLeft,
        height: compBottom - compTop,
        midX: (compLeft + compRight) / 2,
        midY: (compTop + compBottom) / 2
    };
}

// ============================================
// LIBRARY POPULATION
// ============================================

/**
 * Compute and add bbox data to all glyphs in the component library.
 * This should be re-run whenever new glyphs are added to the library.
 * 
 * ADDING NEW GLYPHS:
 *   1. Path-based glyphs: Add path + scale to JSON, run this function.
 *      The bbox is computed automatically from the path data.
 *   2. Text elements: Measure from rendered SVG (font metrics are external).
 *      Add bbox manually to the JSON under the text entry.
 *   3. Parametric elements (staff lines, hairpins, ledger lines):
 *      Bbox is computed at layout time from their parameters, not stored.
 */
function populateLibraryBboxes(library) {
    const c = library.components;

    // Noteheads
    for (const [name, nh] of Object.entries(c.noteheads)) {
        nh.bbox = scaledBbox(nh.path, nh.scale);
    }

    // Accidentals (compute bbox at both scales)
    for (const [name, variant] of Object.entries(c.accidentals.variants)) {
        variant.bboxLongTone = scaledBbox(variant.path, c.accidentals.longTone.scale);
        variant.bboxShortTone = scaledBbox(variant.path, c.accidentals.shortTone.scale);
    }

    // Dynamic base glyphs
    for (const [name, glyph] of Object.entries(c.dynamics.glyphs)) {
        glyph.bbox = scaledBbox(glyph.path, c.dynamics.scale);
    }

    // Dynamic composites
    for (const [name, composite] of Object.entries(c.dynamics.composites)) {
        composite.bbox = computeCompositeBbox(name, library);
    }

    return library;
}

// ============================================
// CLI
// ============================================

const fs = require('fs');
const path = require('path');

if (require.main === module) {
    const libraryPath = path.join(__dirname, 'svg_component_library.json');
    const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
    const action = process.argv[2] || 'verify';

    switch (action) {
        case 'populate': {
            populateLibraryBboxes(library);
            fs.writeFileSync(libraryPath, JSON.stringify(library, null, 2) + '\n');
            console.log('Bounding boxes computed and written to svg_component_library.json');
            console.log('Run "node svg_bbox.js verify" to inspect results.');
            break;
        }
        case 'verify': {
            // Show bboxes for all glyphs (compute in-memory, don't save)
            populateLibraryBboxes(library);
            const c = library.components;

            console.log('\n=== NOTEHEADS ===');
            for (const [name, nh] of Object.entries(c.noteheads)) {
                const b = nh.bbox;
                console.log(`  ${name}: L=${b.left.toFixed(4)} T=${b.top.toFixed(4)} R=${b.right.toFixed(4)} B=${b.bottom.toFixed(4)}  W=${b.width.toFixed(4)} H=${b.height.toFixed(4)} midY=${b.midY.toFixed(4)}`);
            }

            console.log('\n=== ACCIDENTALS (longTone scale) ===');
            for (const [name, v] of Object.entries(c.accidentals.variants)) {
                const b = v.bboxLongTone;
                console.log(`  ${name}: L=${b.left.toFixed(4)} T=${b.top.toFixed(4)} R=${b.right.toFixed(4)} B=${b.bottom.toFixed(4)}  W=${b.width.toFixed(4)} H=${b.height.toFixed(4)}`);
            }

            console.log('\n=== ACCIDENTALS (shortTone scale) ===');
            for (const [name, v] of Object.entries(c.accidentals.variants)) {
                const b = v.bboxShortTone;
                console.log(`  ${name}: L=${b.left.toFixed(4)} T=${b.top.toFixed(4)} R=${b.right.toFixed(4)} B=${b.bottom.toFixed(4)}  W=${b.width.toFixed(4)} H=${b.height.toFixed(4)}`);
            }

            console.log('\n=== DYNAMIC COMPOSITES ===');
            for (const [name, comp] of Object.entries(c.dynamics.composites)) {
                const b = comp.bbox;
                console.log(`  ${name}: L=${b.left.toFixed(4)} T=${b.top.toFixed(4)} R=${b.right.toFixed(4)} B=${b.bottom.toFixed(4)}  W=${b.width.toFixed(4)} H=${b.height.toFixed(4)} midY=${b.midY.toFixed(4)}`);
            }
            break;
        }
        default:
            console.log('Usage: node svg_bbox.js [populate|verify]');
            process.exit(1);
    }
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    parsePath,
    pathBbox,
    scaledBbox,
    cubicBezierMinMax,
    quadBezierMinMax,
    computeCompositeBbox,
    populateLibraryBboxes
};
