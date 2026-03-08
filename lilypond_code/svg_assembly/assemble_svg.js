/**
 * SVG Assembly Engine
 * 
 * Assembles notation SVGs from individual components (glyphs, staff lines, etc.)
 * using LilyPond's exact path data for identical visual quality.
 * 
 * Coordinate system: staff-spaces (1 ss = distance between adjacent staff lines)
 * Y-axis: positive = down (SVG convention)
 * Staff center line (middle of 5 lines) = Y:0
 */

const fs = require('fs');
const path = require('path');

// Load component library
const LIBRARY = JSON.parse(fs.readFileSync(path.join(__dirname, 'svg_component_library.json'), 'utf8'));

// ============================================
// COMPONENT GENERATORS
// ============================================

/**
 * Generate staff lines SVG group
 * @param {number} width - Width in staff-spaces
 * @param {number} lineThickness - SVG stroke-width (default 0.1)
 * @returns {string} SVG group string
 */
function generateStaffLines(width, lineThickness = 0.1) {
    const positions = [-2, -1, 0, 1, 2];
    const lines = positions.map(y =>
        `<line stroke-linejoin="round" stroke-linecap="round" ` +
        `stroke-width="${lineThickness.toFixed(4)}" stroke="currentColor" ` +
        `x1="0" y1="${y.toFixed(4)}" x2="${width.toFixed(4)}" y2="${y.toFixed(4)}"/>`
    );
    return `<g id="staff-lines">\n${lines.join('\n')}\n</g>`;
}

/**
 * Generate a single ledger line
 * @param {number} y - Y position in staff-spaces (e.g., 3 = first ledger below, -3 = first ledger above)
 * @param {number} x - X center position of the ledger line
 * @param {number} width - Width of ledger line in staff-spaces (default 1.2)
 * @param {number} lineThickness - SVG stroke-width (default 0.1)
 * @returns {string} SVG line string
 */
function generateLedgerLine(y, x, width = 1.2, lineThickness = 0.1) {
    const halfWidth = width / 2;
    return `<line stroke-linejoin="round" stroke-linecap="round" ` +
        `stroke-width="${lineThickness.toFixed(4)}" stroke="currentColor" ` +
        `x1="${(x - halfWidth).toFixed(4)}" y1="${y.toFixed(4)}" ` +
        `x2="${(x + halfWidth).toFixed(4)}" y2="${y.toFixed(4)}"/>`;
}

/**
 * Generate all needed ledger lines for a given staff position
 * @param {number} staffPosition - Note position in staff-spaces from center (negative = above, positive = below)
 * @param {number} noteX - X center position of the note
 * @param {number} ledgerWidth - Width of each ledger line
 * @param {number} lineThickness - SVG stroke-width
 * @returns {string} SVG group string with all needed ledger lines
 */
function generateLedgerLines(staffPosition, noteX, ledgerWidth = 1.2, lineThickness = 0.1) {
    const lines = [];
    
    if (staffPosition >= 3) {
        // Below staff: ledger lines at 3, 4, 5, ...
        for (let y = 3; y <= staffPosition; y++) {
            // Only on integer positions (lines, not spaces)
            if (Number.isInteger(y)) {
                lines.push(generateLedgerLine(y, noteX, ledgerWidth, lineThickness));
            }
        }
    } else if (staffPosition <= -3) {
        // Above staff: ledger lines at -3, -4, -5, ...
        for (let y = -3; y >= staffPosition; y--) {
            if (Number.isInteger(y)) {
                lines.push(generateLedgerLine(y, noteX, ledgerWidth, lineThickness));
            }
        }
    }
    // Middle C (treble clef) is at staffPosition = 3, needs one ledger line
    
    if (lines.length === 0) return '';
    return `<g id="ledger-lines">\n${lines.join('\n')}\n</g>`;
}

// ============================================
// GLYPH GENERATORS
// ============================================

function generateNotehead(type, x, y) {
    const nh = LIBRARY.components.noteheads[type];
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
` +
        `<path transform="scale(${nh.scale[0]}, ${nh.scale[1]})" d="${nh.path}" fill="currentColor"/>
</g>`;
}

function generateAccidental(accidentalType, noteheadType, noteX, y) {
    if (!accidentalType) return '';
    const variant = LIBRARY.components.accidentals.variants[accidentalType];
    if (!variant) return '';
    const scaleData = LIBRARY.components.accidentals[noteheadType];
    const xOffset = noteheadType === 'longTone' ? variant.xOffsetLongTone : variant.xOffsetShortTone;
    return `<g transform="translate(${(noteX + xOffset).toFixed(4)}, ${y.toFixed(4)})">
` +
        `<path transform="scale(${scaleData.scale[0]}, ${scaleData.scale[1]})" d="${variant.path}" fill="currentColor"/>
</g>`;
}

function generateDynamic(dynamicName, x, y) {
    const composite = LIBRARY.components.dynamics.composites[dynamicName];
    if (!composite) return '';
    const dynScale = LIBRARY.components.dynamics.scale;
    const glyphData = LIBRARY.components.dynamics.glyphs;
    const paths = [];
    let offsetX = 0;
    for (let i = 0; i < composite.glyphs.length; i++) {
        const glyphName = composite.glyphs[i];
        const glyph = glyphData[glyphName];
        if (composite.spacing) {
            offsetX = composite.spacing[i];
        } else if (i > 0) {
            offsetX += glyph.glyphSpacing;
        }
        const transform = offsetX > 0
            ? `translate(${offsetX.toFixed(4)}, 0.0000) scale(${dynScale[0]}, ${dynScale[1]})`
            : `scale(${dynScale[0]}, ${dynScale[1]})`;
        paths.push(`<path transform="${transform}" d="${glyph.path}" fill="currentColor"/>`);
    }
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<g>
${paths.join('\n')}
</g>
</g>`;
}

function generateHairpin(direction, x, y, length, height = 0.55) {
    if (direction === 'none' || !direction) return '';
    let line1, line2;
    if (direction === '<') {
        line1 = `<line stroke-linejoin="round" stroke-linecap="round" stroke-width="0.1000" stroke="currentColor" x1="0.0000" y1="0.0000" x2="${length.toFixed(4)}" y2="${height.toFixed(4)}"/>`;
        line2 = `<line stroke-linejoin="round" stroke-linecap="round" stroke-width="0.1000" stroke="currentColor" x1="0.0000" y1="-0.0000" x2="${length.toFixed(4)}" y2="${(-height).toFixed(4)}"/>`;
    } else {
        line1 = `<line stroke-linejoin="round" stroke-linecap="round" stroke-width="0.1000" stroke="currentColor" x1="0.0000" y1="${height.toFixed(4)}" x2="${length.toFixed(4)}" y2="0.0000"/>`;
        line2 = `<line stroke-linejoin="round" stroke-linecap="round" stroke-width="0.1000" stroke="currentColor" x1="0.0000" y1="${(-height).toFixed(4)}" x2="${length.toFixed(4)}" y2="-0.0000"/>`;
    }
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
${line1}
</g>
` +
        `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
${line2}
</g>`;
}

function generateText(type, x, y) {
    const textDef = LIBRARY.components.text[type];
    if (!textDef) return '';
    const weight = textDef.fontWeight || '300';
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
` +
        `<text font-family="'Crimson Pro'" font-weight="${weight}" font-style="${textDef.fontStyle}" ` +
        `font-size="${textDef.fontSize.toFixed(4)}" text-anchor="start" fill="currentColor">
` +
        `<tspan>${textDef.content}</tspan>
</text>
</g>`;
}

// ============================================
// LAYOUT RULES (general, shared across all notation types)
// ============================================
//
// These rules encode spacing and alignment principles that should be
// consistent across all notation SVGs. When creating a new notation type:
//   1. Create a new profile via createProfile() with notation-specific values
//   2. The profile inherits all general rules automatically
//   3. Override individual rules only when the notation type needs an exception
//
// RULE CATEGORIES:
//   textAboveStaff — vertical gap from highest element to text annotation above
//   glyphRowGap    — horizontal gap between path-based glyphs in the same row
//   glyphToTextGap — horizontal gap between last glyph and following text in same row
//   contentToRowGap — vertical gap from content bottom edge to next row top edge
//   rowAlignment   — all elements in a horizontal row align at visual midline (bbox.midY)
//   viewBoxPadding — uniform padding on all sides, computed from actual content bounds
//
// ADDING NEW RULES:
//   1. Identify a spacing/alignment decision that should be consistent
//   2. Add it to LAYOUT_RULES with a descriptive key and value in staff-spaces
//   3. Reference it in assembly functions via profile.rules.<key>
//   4. Existing profiles inherit the new rule automatically

const LAYOUT_RULES = {
    // Vertical gap from highest visual element to text annotation above the staff.
    // "Highest element" = accidental top (if above staff) > notehead top > top staff line.
    textAboveStaff: 0.275,

    // Horizontal edge-to-edge gap between path-based glyphs in the same row
    // (e.g., dynamic glyph ↔ hairpin, hairpin ↔ dynamic glyph).
    glyphRowGap: 0.12,

    // Horizontal edge-to-edge gap between last path glyph and a following text
    // element in the same row (e.g., dynamic2 → "secco" text).
    glyphToTextGap: 0.15,

    // Vertical gap from the content area bottom edge to the top edge of the
    // next row below. ~0.5mm. Content area = note + accidental + ledger lines.
    contentToRowGap: 0.28,

    // Uniform padding on all four sides of the viewBox, computed from actual
    // content bounding boxes. Ensures consistent breathing room around all SVGs.
    viewBoxPadding: 0.15
};

// ============================================
// LAYOUT PROFILES (notation-type-specific)
// ============================================
//
// A profile = general rules + notation-specific element configuration.
// Use createProfile() to build one — it merges rules with overrides.
//
// CREATING A NEW PROFILE:
//   1. Call createProfile({ rules: {...overrides}, ...notationSpecific })
//   2. rules: override any LAYOUT_RULES value for this notation type (rare)
//   3. Everything else: element positions, sizes, and configurations specific
//      to this notation type (noteX, staffWidth, hairpinLength, etc.)

function createProfile(config = {}) {
    const { rules: ruleOverrides = {}, ...notationSpecific } = config;
    return {
        rules: { ...LAYOUT_RULES, ...ruleOverrides },
        ...notationSpecific
    };
}

const PROFILES = {
    sustainedTone: createProfile({
        // Notation-specific element positions and sizes
        noteX: 1.1,
        staffWidth: 5.76,
        nonVibX: 1.0,
        ledgerLineWidth: 1.2,
        hairpinLength: 2.66,
        hairpinHeight: 0.55,
        dyn1LeftEdge: 0.48
        // No rule overrides — uses all defaults from LAYOUT_RULES
    })
};

// Active profile (selected per assembly function)
const LAYOUT = PROFILES.sustainedTone;

// ============================================
// MAIN ASSEMBLY (bbox-aware layout)
// ============================================

/**
 * Assemble a complete sustained tone SVG
 *
 * POSITIONING LOGIC:
 *   1. Note area: notehead + optional accidental placed at staffPosition.
 *      Ledger lines generated if outside staff range.
 *   2. Dynamics row: elements laid out left-to-right using bbox edge-to-edge
 *      gaps. All elements Y-aligned at their visual midline.
 *      dynRowMidline = lowestEdge + noteToRowGap + maxAboveMidline
 *   3. Non-Vib text: placed above the staff/note with fixed padding.
 *   4. ViewBox: computed from actual element positions + bboxes.
 *
 * ADDING NEW DYNAMICS-ROW ELEMENTS:
 *   - Give the element a bbox with midY in svg_component_library.json
 *   - Add it to the rowElements array below for midline calculation
 *   - Insert its SVG generation in the X-layout flow
 *
 * @param {object} params
 * @param {number} params.staffPosition - Note Y in staff-spaces (neg=above, pos=below center)
 * @param {string|null} params.accidental - Accidental type or null
 * @param {string} params.noteheadType - 'longTone' or 'shortTone'
 * @param {string} params.dynamic1 - First dynamic marking
 * @param {string} params.dynamic2 - Second dynamic marking
 * @param {string} params.hairpin - '<', '>', or 'none'
 * @param {boolean} params.secco - Include secco text
 * @param {boolean} params.nonVib - Include Non-Vib text
 * @param {number} [params.staffWidth] - Override staff width
 * @param {object} [params.gaps] - Override edge-to-edge gaps
 * @param {number} [params.noteToRowGap] - Override note-to-dynamics gap
 * @param {boolean} [params.debug] - Render debug bounding box overlays
 * @returns {string} Complete SVG document
 */
function assembleSustainedTone(params) {
    const {
        staffPosition,
        accidental = null,
        noteheadType = 'longTone',
        dynamic1,
        dynamic2,
        hairpin = '<',
        secco = true,
        nonVib = true,
        staffWidth = LAYOUT.staffWidth,
        gaps = {},
        noteToRowGap = LAYOUT.rules.contentToRowGap,
        debug = false
    } = params;

    // Derive row gaps from rules: glyph↔glyph uses glyphRowGap, glyph→text uses glyphToTextGap
    const defaultGaps = {
        dyn1ToHairpin: LAYOUT.rules.glyphRowGap,
        hairpinToDyn2: LAYOUT.rules.glyphRowGap,
        dyn2ToSecco: LAYOUT.rules.glyphToTextGap
    };
    const g = { ...defaultGaps, ...gaps };
    const parts = [];
    const debugRects = [];
    const nhBbox = LIBRARY.components.noteheads[noteheadType].bbox;
    const noteCenter = LAYOUT.noteX + nhBbox.midX;

    // --- STAFF ---
    parts.push(generateStaffLines(staffWidth));

    // --- LEDGER LINES ---
    const ledgers = generateLedgerLines(staffPosition, noteCenter, LAYOUT.ledgerLineWidth);
    if (ledgers) parts.push(ledgers);

    // --- NOTE + ACCIDENTAL ---
    parts.push(generateNotehead(noteheadType, LAYOUT.noteX, staffPosition));
    if (debug) debugRects.push(debugBbox(LAYOUT.noteX, staffPosition, nhBbox, '#0078FF', 'notehead'));

    const accGen = generateAccidental(accidental, noteheadType, LAYOUT.noteX, staffPosition);
    if (accGen) parts.push(accGen);

    // Compute note area bottom edge (for dynamics-row placement)
    let noteBottom = staffPosition + nhBbox.bottom;
    if (accidental) {
        const accVariant = LIBRARY.components.accidentals.variants[accidental];
        const accBbox = noteheadType === 'longTone' ? accVariant.bboxLongTone : accVariant.bboxShortTone;
        noteBottom = Math.max(noteBottom, staffPosition + accBbox.bottom);
        if (debug) {
            const xOff = noteheadType === 'longTone' ? accVariant.xOffsetLongTone : accVariant.xOffsetShortTone;
            debugRects.push(debugBbox(LAYOUT.noteX + xOff, staffPosition, accBbox, '#FFA500', 'accidental'));
        }
    }
    const lowestRef = Math.max(noteBottom, 2.0);

    // --- DYNAMICS ROW: collect element bboxes for midline alignment ---
    const dyn1Bbox = dynamic1 ? LIBRARY.components.dynamics.composites[dynamic1].bbox : null;
    const dyn2Bbox = dynamic2 ? LIBRARY.components.dynamics.composites[dynamic2].bbox : null;
    // Round line caps extend by strokeWidth/2 = 0.05 beyond geometric endpoints
    const capR = 0.05;
    const hairpinBbox = (hairpin && hairpin !== 'none')
        ? { left: -capR, top: -(LAYOUT.hairpinHeight + capR), right: LAYOUT.hairpinLength + capR, bottom: LAYOUT.hairpinHeight + capR, midY: 0 }
        : null;
    const seccoBbox = secco ? LIBRARY.components.text.secco.bbox : null;

    // Gather all row element bboxes for computing max upward/downward extent from midline
    const rowBboxes = [dyn1Bbox, dyn2Bbox, hairpinBbox, seccoBbox].filter(Boolean);
    const maxAboveMidline = Math.max(...rowBboxes.map(b => b.midY - b.top));
    const maxBelowMidline = Math.max(...rowBboxes.map(b => b.bottom - b.midY));

    // Dynamics row midline Y: positioned so top edge clears the note area
    const dynRowMidline = lowestRef + noteToRowGap + maxAboveMidline;

    // --- DYNAMICS ROW: compute X positions left-to-right ---
    let curX = LAYOUT.dyn1LeftEdge;

    // Dynamic 1
    let dyn1AnchorX = 0;
    if (dyn1Bbox) {
        dyn1AnchorX = curX - dyn1Bbox.left;
        const dyn1AnchorY = dynRowMidline - dyn1Bbox.midY;
        parts.push(generateDynamic(dynamic1, dyn1AnchorX, dyn1AnchorY));
        if (debug) debugRects.push(debugBbox(dyn1AnchorX, dyn1AnchorY, dyn1Bbox, '#FF0000', 'dyn1'));
        curX = dyn1AnchorX + dyn1Bbox.right + g.dyn1ToHairpin;
    }

    // Hairpin
    let hairpinEndX = curX;
    if (hairpinBbox) {
        const hairpinStartX = curX;
        const hairpinAnchorY = dynRowMidline - hairpinBbox.midY;
        parts.push(generateHairpin(hairpin, hairpinStartX, hairpinAnchorY, LAYOUT.hairpinLength, LAYOUT.hairpinHeight));
        if (debug) debugRects.push(debugBbox(hairpinStartX, hairpinAnchorY,
            { left: -capR, top: -(LAYOUT.hairpinHeight + capR), right: LAYOUT.hairpinLength + capR, bottom: LAYOUT.hairpinHeight + capR, midY: 0 },
            '#00C800', 'hairpin'));
        hairpinEndX = hairpinStartX + LAYOUT.hairpinLength;
        curX = hairpinEndX + g.hairpinToDyn2;
    }

    // Dynamic 2
    let dyn2RightEdge = curX;
    if (dyn2Bbox) {
        const dyn2AnchorX = curX - dyn2Bbox.left;
        const dyn2AnchorY = dynRowMidline - dyn2Bbox.midY;
        parts.push(generateDynamic(dynamic2, dyn2AnchorX, dyn2AnchorY));
        if (debug) debugRects.push(debugBbox(dyn2AnchorX, dyn2AnchorY, dyn2Bbox, '#FF0000', 'dyn2'));
        dyn2RightEdge = dyn2AnchorX + dyn2Bbox.right;
        curX = dyn2RightEdge + g.dyn2ToSecco;
    }

    // Secco text
    let seccoRightEdge = curX;
    if (seccoBbox) {
        const seccoAnchorX = curX - seccoBbox.left;
        const seccoAnchorY = dynRowMidline - seccoBbox.midY;
        parts.push(generateText('secco', seccoAnchorX, seccoAnchorY));
        if (debug) debugRects.push(debugBbox(seccoAnchorX, seccoAnchorY, seccoBbox, '#8000FF', 'secco'));
        seccoRightEdge = seccoAnchorX + seccoBbox.right;
    }

    // --- NON-VIB TEXT ---
    if (nonVib) {
        const nonVibBbox = LIBRARY.components.text.nonVib.bbox;
        // Reference the highest visual element: accidental top, notehead top, or top staff line
        let highestPoint = -2; // top staff line
        if (staffPosition < -2) {
            // Note is above staff — use notehead top as baseline
            highestPoint = staffPosition + nhBbox.top;
            // If accidental extends higher, use that instead
            if (accidental) {
                const accV = LIBRARY.components.accidentals.variants[accidental];
                const accB = noteheadType === 'longTone' ? accV.bboxLongTone : accV.bboxShortTone;
                highestPoint = Math.min(highestPoint, staffPosition + accB.top);
            }
        }
        const nonVibY = highestPoint - LAYOUT.rules.textAboveStaff;
        parts.push(generateText('nonVib', LAYOUT.nonVibX, nonVibY));
        if (debug) debugRects.push(debugBbox(LAYOUT.nonVibX, nonVibY, nonVibBbox, '#8000FF', 'nonVib'));
    }

    // --- DEBUG OVERLAYS ---
    if (debug) {
        // Midline guide
        debugRects.push(
            `<line x1="-0.5" y1="${dynRowMidline.toFixed(4)}" x2="${(seccoRightEdge + 0.5).toFixed(4)}" ` +
            `y2="${dynRowMidline.toFixed(4)}" stroke="red" stroke-width="0.02" stroke-dasharray="0.1,0.1" opacity="0.6"/>`
        );
        // Note bottom guide
        debugRects.push(
            `<line x1="0" y1="${lowestRef.toFixed(4)}" x2="${staffWidth.toFixed(4)}" ` +
            `y2="${lowestRef.toFixed(4)}" stroke="blue" stroke-width="0.02" stroke-dasharray="0.1,0.1" opacity="0.6"/>`
        );
        parts.push(`<g id="debug-overlay">\n${debugRects.join('\n')}\n</g>`);
    }

    // --- VIEWBOX (tight content bounds + uniform padding) ---
    // Compute actual content extents on each side
    const lineHalf = 0.05; // half of staff line thickness (0.1)

    // Top: highest of staff top, ledger lines, or non-vib text
    let contentTop = -2 - lineHalf; // top staff line
    if (staffPosition < -2) contentTop = Math.min(contentTop, staffPosition - 1 - lineHalf); // highest ledger
    if (nonVib) {
        const nvBbox = LIBRARY.components.text.nonVib.bbox;
        // Mirror the same highestPoint logic used for non-vib placement
        let nvRef = -2;
        if (staffPosition < -2) {
            nvRef = staffPosition + nhBbox.top;
            if (accidental) {
                const accV = LIBRARY.components.accidentals.variants[accidental];
                const accB = noteheadType === 'longTone' ? accV.bboxLongTone : accV.bboxShortTone;
                nvRef = Math.min(nvRef, staffPosition + accB.top);
            }
        }
        const nvY = nvRef - LAYOUT.rules.textAboveStaff;
        contentTop = Math.min(contentTop, nvY + nvBbox.top);
    }

    // Bottom: dynamics row bottom edge
    const contentBottom = dynRowMidline + maxBelowMidline;

    // Left: staff lines start at x=0
    const contentLeft = 0;

    // Right: max of staff line end and rightmost dynamics-row element
    const contentRight = Math.max(staffWidth, seccoRightEdge, dyn2RightEdge, hairpinEndX);

    const padding = LAYOUT.rules.viewBoxPadding;
    const viewBox = {
        x: contentLeft - padding,
        y: contentTop - padding,
        width: (contentRight - contentLeft) + padding * 2,
        height: (contentBottom - contentTop) + padding * 2
    };

    const mmPerStaffSpace = 1.7573;
    const dimensions = {
        width: viewBox.width * mmPerStaffSpace,
        height: viewBox.height * mmPerStaffSpace
    };

    return wrapSvg(parts.filter(Boolean).join('\n'), viewBox, dimensions);
}

/**
 * Generate a debug bounding box rectangle overlay
 * Uses fill-opacity/stroke-opacity for Inkscape compatibility (no rgba).
 * @param {number} anchorX - Element anchor X
 * @param {number} anchorY - Element anchor Y
 * @param {object} bbox - { left, top, right, bottom }
 * @param {string} color - Hex color (e.g., '#0078FF')
 * @param {string} label - Label for the element (rendered as tiny text)
 * @returns {string} SVG rect + optional label
 */
function debugBbox(anchorX, anchorY, bbox, color, label) {
    const x = anchorX + bbox.left;
    const y = anchorY + bbox.top;
    const w = bbox.right - bbox.left;
    const h = bbox.bottom - bbox.top;
    let svg = `<rect x="${x.toFixed(4)}" y="${y.toFixed(4)}" width="${w.toFixed(4)}" height="${h.toFixed(4)}" ` +
        `fill="none" stroke="${color}" stroke-opacity="0.6" stroke-width="0.03"/>`;
    if (label) {
        svg += `\n<text x="${x.toFixed(4)}" y="${(y - 0.05).toFixed(4)}" font-size="0.18" fill="${color}" fill-opacity="0.8">${label}</text>`;
    }
    return svg;
}

// ============================================
// SVG WRAPPER
// ============================================

/**
 * Wrap SVG content in a complete SVG document
 * @param {string} content - SVG inner content
 * @param {object} viewBox - { x, y, width, height } in staff-spaces
 * @param {object} dimensions - { width, height } in mm (for the SVG width/height attributes)
 * @returns {string} Complete SVG document
 */
function wrapSvg(content, viewBox, dimensions) {
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `version="1.2" width="${dimensions.width.toFixed(2)}mm" height="${dimensions.height.toFixed(2)}mm" ` +
        `viewBox="${viewBox.x.toFixed(4)} ${viewBox.y.toFixed(4)} ${viewBox.width.toFixed(4)} ${viewBox.height.toFixed(4)}">\n` +
        `<style type="text/css">\n<![CDATA[\ntspan { white-space: pre; }\n]]>\n</style>\n` +
        `${content}\n</svg>\n`;
}

// ============================================
// DEMO / TEST
// ============================================

/**
 * Generate a test SVG with just staff lines to verify quality
 */
function generateStaffLineTest() {
    const staffWidth = 5.6692; // Match the original LilyPond output
    const staff = generateStaffLines(staffWidth);
    
    // viewBox: a bit of padding around the staff
    const padding = 0.5;
    const viewBox = {
        x: -padding,
        y: -2 - padding,
        width: staffWidth + padding * 2,
        height: 4 + padding * 2 // staff spans Y: -2 to 2 = 4 staff-spaces
    };
    
    // Dimensions in mm (match LilyPond's output scale)
    // LilyPond uses ~1.7573mm per staff-space at default size
    const mmPerStaffSpace = 1.7573;
    const dimensions = {
        width: viewBox.width * mmPerStaffSpace,
        height: viewBox.height * mmPerStaffSpace
    };
    
    return wrapSvg(staff, viewBox, dimensions);
}

/**
 * Generate a test SVG with staff lines + ledger lines at various positions
 */
function generateLedgerLineTest() {
    const staffWidth = 5.6692;
    const noteX = 1.0; // Center of where a note would go
    
    const parts = [];
    parts.push(generateStaffLines(staffWidth));
    
    // Test: 3 ledger lines below (like F3 in treble)
    parts.push(generateLedgerLines(5, noteX));
    
    // Test: 1 ledger line above (like A5 in treble)  
    parts.push(generateLedgerLines(-3, noteX + 3));
    
    const content = parts.join('\n');
    
    const padding = 0.5;
    const viewBox = {
        x: -padding,
        y: -3 - padding, // extend for ledger above
        width: staffWidth + padding * 2,
        height: 8 + padding * 2 // -3 to 5 = 8 staff-spaces
    };
    
    const mmPerStaffSpace = 1.7573;
    const dimensions = {
        width: viewBox.width * mmPerStaffSpace,
        height: viewBox.height * mmPerStaffSpace
    };
    
    return wrapSvg(content, viewBox, dimensions);
}

// ============================================
// CLI
// ============================================

if (require.main === module) {
    const args = process.argv.slice(2);
    const test = args[0] || 'staff';
    const outputDir = path.join(__dirname, '..', '..', 'public', 'SVG_graphics');
    
    let svg, filename;
    
    switch (test) {
        case 'staff':
            svg = generateStaffLineTest();
            filename = 'test-staff-lines.svg';
            break;
        case 'ledger':
            svg = generateLedgerLineTest();
            filename = 'test-ledger-lines.svg';
            break;
        case 'assemble': {
            const dbg = true;
            const tests = [
                // Varying dynamics: p→f
                { params: { staffPosition: 3, accidental: 'sharp', noteheadType: 'longTone',
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-p-f.svg' },
                // Varying dynamics: pppp→ffff
                { params: { staffPosition: 3, accidental: 'sharp', noteheadType: 'longTone',
                    dynamic1: 'pppp', dynamic2: 'ffff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-pppp-ffff.svg' },
                // No accidental (to verify consistent note-to-dynamics gap)
                { params: { staffPosition: 3, accidental: null, noteheadType: 'longTone',
                    dynamic1: 'ppp', dynamic2: 'fff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-no-acc.svg' },
                // 4 ledger lines up, three-quarter flat
                { params: { staffPosition: -6.5, accidental: 'threeQuarterFlat', noteheadType: 'longTone',
                    dynamic1: 'ppp', dynamic2: 'fff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-4ledger-up.svg' },
                // 4 ledger lines down, three-quarter flat
                { params: { staffPosition: 6.5, accidental: 'threeQuarterFlat', noteheadType: 'longTone',
                    dynamic1: 'ppp', dynamic2: 'fff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-4ledger-down.svg' }
            ];
            for (const t of tests) {
                const s = assembleSustainedTone(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, s);
                console.log(`Written: ${p}`);
            }
            return;
        }
        default:
            console.log('Usage: node assemble_svg.js [staff|ledger|assemble]');
            process.exit(1);
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, svg);
    console.log(`Written: ${outputPath}`);
    console.log(`Open in browser to compare with LilyPond output.`);
}

// ============================================
// EXPORTS
// ============================================

module.exports = {
    generateStaffLines,
    generateLedgerLine,
    generateLedgerLines,
    generateNotehead,
    generateAccidental,
    generateDynamic,
    generateHairpin,
    generateText,
    assembleSustainedTone,
    wrapSvg,
    LAYOUT,
    generateStaffLineTest,
    generateLedgerLineTest
};
