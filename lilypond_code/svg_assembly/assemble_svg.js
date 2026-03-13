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

// Load no-staff templates (LilyPond-rendered, cleaned)
const TEMPLATES_DIR = path.join(__dirname, 'templates');
const NO_STAFF_TEMPLATES = {
    bopNoStaff: {
        svg: fs.readFileSync(path.join(TEMPLATES_DIR, 'bop_nostaff.svg'), 'utf8'),
        width_mm: 3.5066903,
        height_mm: 21.335016,
        noteheadCenterX_mm: 0.7675 * (3.5066903 / 1.9954996)  // 0.7675 ss × mmPerSS
    },
    bpNoStaff: {
        svg: fs.readFileSync(path.join(TEMPLATES_DIR, 'bp_nostaff.svg'), 'utf8'),
        width_mm: 3.4139037,
        height_mm: 15.292891,
        noteheadCenterX_mm: (0.0823 + 0.52) * (3.4139037 / 1.9427003)  // (anchor + midX) × mmPerSS
    }
};

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
function generateLedgerLine(y, x, width = 1.5, lineThickness = 0.1) {
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
function generateLedgerLines(staffPosition, noteX, ledgerWidth = 1.5, lineThickness = 0.1) {
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
    const extraShift = LAYOUT_RULES.accidentalExtraShiftX || 0;
    return `<g transform="translate(${(noteX + xOffset + extraShift).toFixed(4)}, ${y.toFixed(4)})">
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

/**
 * Generate a glissando line between two points.
 * Parametric (like hairpin) — not a library glyph.
 * @param {number} x1 - Start X in staff-spaces
 * @param {number} y1 - Start Y in staff-spaces
 * @param {number} x2 - End X in staff-spaces
 * @param {number} y2 - End Y in staff-spaces
 * @param {number} [lineThickness=0.1] - Stroke width
 * @returns {string} SVG line element
 */
function generateGlissandoLine(x1, y1, x2, y2, lineThickness = 0.1) {
    return `<line stroke-linejoin="round" stroke-linecap="round" ` +
        `stroke-width="${lineThickness.toFixed(4)}" stroke="currentColor" ` +
        `x1="${x1.toFixed(4)}" y1="${y1.toFixed(4)}" ` +
        `x2="${x2.toFixed(4)}" y2="${y2.toFixed(4)}"/>`;
}

/**
 * Check if a staff position sits on an actual staff line (not a space or ledger line).
 * Staff lines are at integer positions in [-2, -1, 0, 1, 2].
 * @param {number} staffPosition
 * @returns {boolean}
 */
function isOnStaffLine(staffPosition) {
    return Number.isInteger(staffPosition) && staffPosition >= -2 && staffPosition <= 2;
}

/**
 * Check if two staff positions are on the same staff line.
 * Both must be on actual staff lines (not spaces or ledger lines) AND equal.
 * Used to determine if glissando line needs vertical offset (Registry §9).
 * @param {number} sp1 - First note staff position
 * @param {number} sp2 - Second note staff position
 * @returns {boolean}
 */
function sameStaffLineCheck(sp1, sp2) {
    return isOnStaffLine(sp1) && isOnStaffLine(sp2) && sp1 === sp2;
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
    viewBoxPadding: 0.15,

    // Additional horizontal shift applied to all accidentals (staff-spaces).
    // Negative = leftward. Corrects ~0.4mm visual gap between accidental and notehead.
    accidentalExtraShiftX: -0.2275
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
    sustainedToneSinglePitch: createProfile({
        // Notation-specific element positions and sizes
        noteX: 1.1,
        staffWidth: 5.76,
        nonVibX: 1.0,
        ledgerLineWidth: 1.5,
        hairpinLength: 2.66,
        hairpinHeight: 0.55,
        dyn1LeftEdge: 0.48,
        // No rule overrides — uses all defaults from LAYOUT_RULES

        // Positioning: how this SVG is placed in the score (consumed client-side).
        // anchorElement: which metadata field to align with the curve start time.
        //   Assembly function computes anchor positions and returns them in metadata.
        //   Client reads positioning.anchorElement to pick the right metadata value.
        // scaleMode: 'staffHeight' = scale so staff height matches staffHeightFraction
        //            of track height. Guarantees identical staff-line spacing across all
        //            pitches and all profiles that share the same staffHeightFraction.
        //            Future profiles can use a different staffHeightFraction if needed.
        // staffHeightFraction: staff height (top-to-bottom staff line) as fraction of
        //   track height. 0.35 shared across all sustained-tone profiles for matching
        //   staff-line sizes. Typical on-staff notes land at ~71% Ht%.
        // offsetYFraction: vertical offset as fraction of track height from top.
        positioning: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'staffHeight',
            staffHeightFraction: 0.35,
            offsetYFraction: 0.05
        }
    }),

    bartokPizzicato: createProfile({
        // One-shot articulation: filled notehead + stem + 16th flag + snap pizzicato mark + dynamic
        // Two modes: staff (full notation) and noStaff (notehead + snap pizz mark + dynamic)
        noteX: 1.5,              // Notehead anchor X (shifted right for accidental room)
        staffWidth: 2.8346,       // Staff line width (1mm in ss, matching BOP/CLB)
        stemWidth: 0.13,          // Stem thickness
        stemLength: 6.5,          // Stem length (from .ly Stem.details.lengths = #'(6.5))
        stemNoteOffset: 0.05,     // Stem start offset from note edge
        flagOffset: 0.04,         // Flag Y offset from stem end (toward note)
        snapPizzGap: 0.3,         // Gap from notehead/stem top to snap pizz circle bottom
        snapPizzGapNoStaff: 0.3,  // Gap from notehead top to snap pizz bottom (noStaff mode)
        ledgerLineWidth: 1.5,     // Ledger line width
        // Positioning: how this SVG is placed in the score (consumed client-side)
        positioning: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'staffHeight',
            staffHeightFraction: 0.61,
            offsetXSeconds: -0.09,
            offsetYFraction: 0.03
        },
        positioningNoStaff: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'fixedHeight',
            staffHeightFraction: 0.40,
            offsetXSeconds: -0.09,
            offsetYFraction: 0.03
        }
    }),

    bowOverpressureAccent: createProfile({
        // One-shot articulation: square notehead + stem + flag + 3× downbow + marcato + sfz
        // Two modes: staff (full notation) and noStaff (notehead + downbows + marcato + sfz)
        noteX: 1.5,              // Notehead center X (shifted right for accidental room)
        staffWidth: 2.8346,       // Staff line width (1mm in ss, matching .ly template)
        noteSize: 0.8,            // Square notehead side length
        stemWidth: 0.13,          // Stem thickness
        stemLength: 5.376,        // Stem length (from .ly Stem.details.lengths = 5.5 adjusted)
        stemNoteOffset: 0.124,    // Stem start offset from note center toward note edge
        flagOffset: 0.04,         // Flag Y offset from stem end (toward note)
        downbowCount: 3,          // Number of downbow marks
        downbowSpacing: 1.0,      // Center-to-center spacing of stacked downbow marks
        downbowGapFromNote: 0.4,  // Gap from notehead/stem top edge to lowest downbow bottom
        marcatoGap: 0.2,          // Gap from stem end/note bottom to marcato top
        marcatoGapNoStaff: 0.3,   // Gap from notehead bottom to marcato top (noStaff mode)
        sfzGap: 0.28,             // Gap from marcato bottom to sfz top (≈ contentToRowGap)
        ledgerLineWidth: 1.5,     // Ledger line width
        // Positioning: how this SVG is placed in the score (consumed client-side)
        positioning: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'staffHeight',
            staffHeightFraction: 0.60,
            offsetYFraction: 0.05
        },
        positioningNoStaff: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'fixedHeight',
            staffHeightFraction: 0.40,
            offsetYFraction: 0.05
        }
    }),

    colLegnoBattutoJete: createProfile({
        // One-shot articulation: cross notehead + stem (quarter note) + dynamic + "c.l.b. jeté" text
        // Two modes: staff (with staff lines, stem, accidentals) and noStaff (square notehead + stem + marcato + text + dynamic)
        noteX: 0.9706,            // Notehead anchor X (text left ink flush with staff line left)
        staffWidth: 2.8346,       // Staff line width (1mm in ss, matching BOP)
        noteSize: 0.8,            // Square notehead side length (noStaff mode)
        stemWidth: 0.13,          // Stem thickness
        stemLength: 3.5,          // Stem length (quarter note — shorter than BOP 16th)
        stemNoteOffset: 0.124,    // Stem start offset from note center toward note edge
        ledgerLineWidth: 1.5,     // Ledger line width
        clbTextX: -0.0294,        // "c.l.b. jeté" text X (left ink edge flush with staff line x=0)
        marcatoGapNoStaff: 0.3,   // Gap from notehead top to marcato bottom (noStaff mode)
        accidentalXShift: -0.1138, // Extra 0.2mm left shift for accidentals (beyond noteX shift)
        dynamicXShift: -0.1138,    // Extra 0.2mm left shift for dynamics (beyond noteX shift)
        // Positioning: how this SVG is placed in the score (consumed client-side)
        positioning: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'staffHeight',
            staffHeightFraction: 0.60,
            offsetXSeconds: -0.087,
            offsetYFraction: 0.03
        },
        positioningNoStaff: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'fixedHeight',
            staffHeightFraction: 0.59,
            offsetXSeconds: -0.087,
            offsetYFraction: 0.03
        }
    }),

    sustainedToneGlissando: createProfile({
        // Two-note layout: note1 (left) and note2 (right) with glissando line between
        note1X: 1.1,            // First notehead anchor X (same as single-pitch noteX)
        note2X: 4.5,            // Second notehead anchor X
        staffWidth: 6.5,        // Wider than single-pitch (5.76) to frame both notes
        nonVibX: 1.0,
        ledgerLineWidth: 1.5,
        hairpinLength: 2.66,
        hairpinHeight: 0.55,
        dyn1LeftEdge: 0.48,
        // Glissando line settings
        glissPaddingLeft: 0.3,  // Gap from note1 right edge to gliss line start
        glissPaddingRight: 0.15, // Gap from gliss line end to note2 left edge
        sameLineYOffset: -0.3,  // Upward Y shift when both notes on same staff line (Registry §9)
        // Positioning: startNoteheadCenter aligns note1 center with curve start time
        positioning: {
            anchorElement: 'startNoteheadCenter',
            scaleMode: 'staffHeight',
            staffHeightFraction: 0.35,    // Smaller than single-pitch (0.5654) — gliss SVG has more content
            offsetYFraction: 0.05
        }
    }),

    featheredBeamSinglePitch: createProfile({
        // Sustained tone single pitch + feathered beam block (accel or decel).
        // No nonVib, no secco. Feathered block above by default, below if ledger lines above.
        noteX: 1.1,
        staffWidth: 5.76,
        ledgerLineWidth: 1.5,
        hairpinLength: 2.66,
        hairpinHeight: 0.55,
        dyn1LeftEdge: 0.48,
        featheredBlockGap: 0.4,   // vertical gap between pitch block and feathered beam block
        positioning: {
            anchorElement: 'noteheadCenter',
            scaleMode: 'heightFraction',
            heightFraction: 0.90,
            offsetYFraction: 0.03
        }
    }),

    featheredBeamGlissando: createProfile({
        // Sustained tone glissando + feathered beam block (accel or decel).
        // No nonVib, no secco. Feathered block above by default, below if ledger lines above.
        note1X: 1.1,
        note2X: 4.5,
        staffWidth: 6.5,
        ledgerLineWidth: 1.5,
        hairpinLength: 2.66,
        hairpinHeight: 0.55,
        dyn1LeftEdge: 0.48,
        glissPaddingLeft: 0.3,
        glissPaddingRight: 0.15,
        sameLineYOffset: -0.3,
        featheredBlockGap: 0.4,
        positioning: {
            anchorElement: 'startNoteheadCenter',
            scaleMode: 'heightFraction',
            heightFraction: 0.90,
            offsetYFraction: 0.03
        }
    })
};

// Active profile (selected per assembly function)
const LAYOUT = PROFILES.sustainedToneSinglePitch;

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
 * @returns {{ svg: string, metadata: object }} SVG document + positioning metadata
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
    // Reference hairpin bbox is ALWAYS included in midline calculation so that
    // the dynamics row Y stays consistent regardless of volume mode (steady vs others).
    const refHairpinBbox = { left: -capR, top: -(LAYOUT.hairpinHeight + capR), right: LAYOUT.hairpinLength + capR, bottom: LAYOUT.hairpinHeight + capR, midY: 0 };
    const renderHairpin = hairpin && hairpin !== 'none';
    const seccoBbox = secco ? LIBRARY.components.text.secco.bbox : null;

    // Always include refHairpinBbox so midline position is stable across volume modes
    const rowBboxes = [dyn1Bbox, dyn2Bbox, refHairpinBbox, seccoBbox].filter(Boolean);
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

    // Hairpin (only rendered for non-steady volume modes)
    let hairpinEndX = curX;
    if (renderHairpin) {
        const hairpinStartX = curX;
        const hairpinAnchorY = dynRowMidline - refHairpinBbox.midY;
        parts.push(generateHairpin(hairpin, hairpinStartX, hairpinAnchorY, LAYOUT.hairpinLength, LAYOUT.hairpinHeight));
        if (debug) debugRects.push(debugBbox(hairpinStartX, hairpinAnchorY, refHairpinBbox, '#00C800', 'hairpin'));
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

    const svg = wrapSvg(parts.filter(Boolean).join('\n'), viewBox, dimensions);

    // Compute positioning metadata: element positions relative to SVG left edge (in mm)
    const noteheadCenterX_mm = (LAYOUT.noteX + nhBbox.midX - viewBox.x) * mmPerStaffSpace;
    // Staff height: distance from top staff line (-2) to bottom staff line (2) = 4 ss
    const staffHeight_mm = 4 * mmPerStaffSpace;  // 7.0292mm for standard 5-line staff

    return {
        svg,
        metadata: {
            noteheadCenterX_mm,
            staffHeight_mm,
            width_mm: dimensions.width,
            height_mm: dimensions.height,
            positioning: LAYOUT.positioning
        }
    };
}

// ============================================
// GLISSANDO ASSEMBLY (two-note with gliss line)
// ============================================

/**
 * Assemble a sustained tone glissando SVG (two shortTone noteheads + glissando line).
 *
 * LAYOUT:
 *   1. Note 1 (shortTone) at staffPosition1 with optional accidental1.
 *   2. Note 2 (shortTone) at staffPosition2 with optional accidental2.
 *   3. Glissando line between noteheads (with padding and same-staff-line offset).
 *   4. Dynamics row below (same midline alignment pattern as single-pitch).
 *   5. Non-Vib text above (references highest element across both notes).
 *   6. ViewBox: computed from actual element positions + bboxes.
 *
 * @param {object} params
 * @param {number} params.staffPosition1 - First note Y in staff-spaces
 * @param {number} params.staffPosition2 - Second note Y in staff-spaces
 * @param {string|null} params.accidental1 - First note accidental or null
 * @param {string|null} params.accidental2 - Second note accidental or null
 * @param {string} params.dynamic1 - First dynamic marking
 * @param {string} params.dynamic2 - Second dynamic marking
 * @param {string} params.hairpin - '<', '>', or 'none'
 * @param {boolean} params.secco - Include secco text
 * @param {boolean} params.nonVib - Include Non-Vib text
 * @param {boolean} [params.debug] - Render debug bounding box overlays
 * @returns {{ svg: string, metadata: object }} SVG document + positioning metadata
 */
function assembleSustainedToneGlissando(params) {
    const {
        staffPosition1,
        staffPosition2,
        accidental1 = null,
        accidental2 = null,
        dynamic1,
        dynamic2,
        hairpin = '<',
        secco = true,
        nonVib = true,
        debug = false
    } = params;

    const P = PROFILES.sustainedToneGlissando;
    const noteheadType = 'shortTone';
    const nhBbox = LIBRARY.components.noteheads[noteheadType].bbox;
    const parts = [];
    const debugRects = [];

    // Derive row gaps from rules (same as single-pitch)
    const g = {
        dyn1ToHairpin: P.rules.glyphRowGap,
        hairpinToDyn2: P.rules.glyphRowGap,
        dyn2ToSecco: P.rules.glyphToTextGap
    };

    // --- STAFF ---
    parts.push(generateStaffLines(P.staffWidth));

    // --- NOTE 1: notehead + ledger lines + accidental ---
    const note1Center = P.note1X + nhBbox.midX;
    parts.push(generateNotehead(noteheadType, P.note1X, staffPosition1));
    if (debug) debugRects.push(debugBbox(P.note1X, staffPosition1, nhBbox, '#0078FF', 'note1'));

    const ledgers1 = generateLedgerLines(staffPosition1, note1Center, P.ledgerLineWidth);
    if (ledgers1) parts.push(ledgers1);

    const acc1Gen = generateAccidental(accidental1, noteheadType, P.note1X, staffPosition1);
    if (acc1Gen) parts.push(acc1Gen);

    // --- NOTE 2: notehead + ledger lines + accidental ---
    const note2Center = P.note2X + nhBbox.midX;
    parts.push(generateNotehead(noteheadType, P.note2X, staffPosition2));
    if (debug) debugRects.push(debugBbox(P.note2X, staffPosition2, nhBbox, '#0078FF', 'note2'));

    const ledgers2 = generateLedgerLines(staffPosition2, note2Center, P.ledgerLineWidth);
    if (ledgers2) parts.push(ledgers2);

    const acc2Gen = generateAccidental(accidental2, noteheadType, P.note2X, staffPosition2);
    if (acc2Gen) parts.push(acc2Gen);

    // --- GLISSANDO LINE ---
    const glissX1 = P.note1X + nhBbox.right + P.glissPaddingLeft;
    // If note 2 has an accidental, stop at its left edge (not the notehead's)
    let note2LeftBound = P.note2X + nhBbox.left;
    if (accidental2) {
        const accV2 = LIBRARY.components.accidentals.variants[accidental2];
        note2LeftBound = P.note2X + accV2.xOffsetShortTone + accV2.bboxShortTone.left;
    }
    const glissX2 = note2LeftBound - P.glissPaddingRight;
    let glissY1 = staffPosition1;
    let glissY2 = staffPosition2;

    // Same-staff-line offset: shift gliss line upward by 0.3 ss (Registry §9)
    const isSameLine = sameStaffLineCheck(staffPosition1, staffPosition2);
    if (isSameLine) {
        glissY1 += P.sameLineYOffset;
        glissY2 += P.sameLineYOffset;
    }

    parts.push(generateGlissandoLine(glissX1, glissY1, glissX2, glissY2));
    if (debug) {
        // Cyan for gliss line endpoints
        debugRects.push(
            `<circle cx="${glissX1.toFixed(4)}" cy="${glissY1.toFixed(4)}" r="0.06" fill="#00CED1" fill-opacity="0.8"/>` +
            `<circle cx="${glissX2.toFixed(4)}" cy="${glissY2.toFixed(4)}" r="0.06" fill="#00CED1" fill-opacity="0.8"/>`
        );
    }

    // --- CONTENT AREA BOTTOM (for dynamics row placement) ---
    // Consider both notes' bottom edges and the bottom staff line
    let note1Bottom = staffPosition1 + nhBbox.bottom;
    let note2Bottom = staffPosition2 + nhBbox.bottom;
    if (accidental1) {
        const accV = LIBRARY.components.accidentals.variants[accidental1];
        const accB = accV.bboxShortTone;
        note1Bottom = Math.max(note1Bottom, staffPosition1 + accB.bottom);
        if (debug) {
            const xOff = accV.xOffsetShortTone;
            debugRects.push(debugBbox(P.note1X + xOff, staffPosition1, accB, '#FFA500', 'acc1'));
        }
    }
    if (accidental2) {
        const accV = LIBRARY.components.accidentals.variants[accidental2];
        const accB = accV.bboxShortTone;
        note2Bottom = Math.max(note2Bottom, staffPosition2 + accB.bottom);
        if (debug) {
            const xOff = accV.xOffsetShortTone;
            debugRects.push(debugBbox(P.note2X + xOff, staffPosition2, accB, '#FFA500', 'acc2'));
        }
    }
    const lineHalf = 0.05;
    const lowestRef = Math.max(note1Bottom, note2Bottom, 2.0 + lineHalf);

    // --- DYNAMICS ROW: collect element bboxes for midline alignment ---
    const dyn1Bbox = dynamic1 ? LIBRARY.components.dynamics.composites[dynamic1].bbox : null;
    const dyn2Bbox = dynamic2 ? LIBRARY.components.dynamics.composites[dynamic2].bbox : null;
    const capR = 0.05;
    // Reference hairpin bbox is ALWAYS included in midline calculation so that
    // the dynamics row Y stays consistent regardless of volume mode (steady vs others).
    const refHairpinBbox = { left: -capR, top: -(P.hairpinHeight + capR), right: P.hairpinLength + capR, bottom: P.hairpinHeight + capR, midY: 0 };
    const renderHairpin = hairpin && hairpin !== 'none';
    const seccoBbox = secco ? LIBRARY.components.text.secco.bbox : null;

    // Always include refHairpinBbox so midline position is stable across volume modes
    const rowBboxes = [dyn1Bbox, dyn2Bbox, refHairpinBbox, seccoBbox].filter(Boolean);
    const maxAboveMidline = Math.max(...rowBboxes.map(b => b.midY - b.top));
    const maxBelowMidline = Math.max(...rowBboxes.map(b => b.bottom - b.midY));

    const dynRowMidline = lowestRef + P.rules.contentToRowGap + maxAboveMidline;

    // --- DYNAMICS ROW: compute X positions left-to-right ---
    let curX = P.dyn1LeftEdge;

    let dyn1AnchorX = 0;
    if (dyn1Bbox) {
        dyn1AnchorX = curX - dyn1Bbox.left;
        const dyn1AnchorY = dynRowMidline - dyn1Bbox.midY;
        parts.push(generateDynamic(dynamic1, dyn1AnchorX, dyn1AnchorY));
        if (debug) debugRects.push(debugBbox(dyn1AnchorX, dyn1AnchorY, dyn1Bbox, '#FF0000', 'dyn1'));
        curX = dyn1AnchorX + dyn1Bbox.right + g.dyn1ToHairpin;
    }

    let hairpinEndX = curX;
    if (renderHairpin) {
        const hairpinStartX = curX;
        const hairpinAnchorY = dynRowMidline - refHairpinBbox.midY;
        parts.push(generateHairpin(hairpin, hairpinStartX, hairpinAnchorY, P.hairpinLength, P.hairpinHeight));
        if (debug) debugRects.push(debugBbox(hairpinStartX, hairpinAnchorY, refHairpinBbox, '#00C800', 'hairpin'));
        hairpinEndX = hairpinStartX + P.hairpinLength;
        curX = hairpinEndX + g.hairpinToDyn2;
    }

    let dyn2RightEdge = curX;
    if (dyn2Bbox) {
        const dyn2AnchorX = curX - dyn2Bbox.left;
        const dyn2AnchorY = dynRowMidline - dyn2Bbox.midY;
        parts.push(generateDynamic(dynamic2, dyn2AnchorX, dyn2AnchorY));
        if (debug) debugRects.push(debugBbox(dyn2AnchorX, dyn2AnchorY, dyn2Bbox, '#FF0000', 'dyn2'));
        dyn2RightEdge = dyn2AnchorX + dyn2Bbox.right;
        curX = dyn2RightEdge + g.dyn2ToSecco;
    }

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
        // Reference the highest visual element across BOTH notes
        let highestPoint = -2; // top staff line
        // Check note 1
        if (staffPosition1 < -2) {
            highestPoint = staffPosition1 + nhBbox.top;
            if (accidental1) {
                const accV = LIBRARY.components.accidentals.variants[accidental1];
                highestPoint = Math.min(highestPoint, staffPosition1 + accV.bboxShortTone.top);
            }
        }
        // Check note 2 (use the higher of the two)
        if (staffPosition2 < -2) {
            highestPoint = Math.min(highestPoint, staffPosition2 + nhBbox.top);
            if (accidental2) {
                const accV = LIBRARY.components.accidentals.variants[accidental2];
                highestPoint = Math.min(highestPoint, staffPosition2 + accV.bboxShortTone.top);
            }
        }
        const nonVibY = highestPoint - P.rules.textAboveStaff;
        parts.push(generateText('nonVib', P.nonVibX, nonVibY));
        if (debug) debugRects.push(debugBbox(P.nonVibX, nonVibY, nonVibBbox, '#8000FF', 'nonVib'));
    }

    // --- DEBUG OVERLAYS ---
    if (debug) {
        debugRects.push(
            `<line x1="-0.5" y1="${dynRowMidline.toFixed(4)}" x2="${(seccoRightEdge + 0.5).toFixed(4)}" ` +
            `y2="${dynRowMidline.toFixed(4)}" stroke="red" stroke-width="0.02" stroke-dasharray="0.1,0.1" opacity="0.6"/>`
        );
        debugRects.push(
            `<line x1="0" y1="${lowestRef.toFixed(4)}" x2="${P.staffWidth.toFixed(4)}" ` +
            `y2="${lowestRef.toFixed(4)}" stroke="blue" stroke-width="0.02" stroke-dasharray="0.1,0.1" opacity="0.6"/>`
        );
        parts.push(`<g id="debug-overlay">\n${debugRects.join('\n')}\n</g>`);
    }

    // --- VIEWBOX ---
    let contentTop = -2 - lineHalf;
    // Check both notes for ledger lines above
    if (staffPosition1 < -2) contentTop = Math.min(contentTop, staffPosition1 - 1 - lineHalf);
    if (staffPosition2 < -2) contentTop = Math.min(contentTop, staffPosition2 - 1 - lineHalf);
    if (nonVib) {
        const nvBbox = LIBRARY.components.text.nonVib.bbox;
        let nvRef = -2;
        if (staffPosition1 < -2) {
            nvRef = staffPosition1 + nhBbox.top;
            if (accidental1) {
                nvRef = Math.min(nvRef, staffPosition1 + LIBRARY.components.accidentals.variants[accidental1].bboxShortTone.top);
            }
        }
        if (staffPosition2 < -2) {
            nvRef = Math.min(nvRef, staffPosition2 + nhBbox.top);
            if (accidental2) {
                nvRef = Math.min(nvRef, staffPosition2 + LIBRARY.components.accidentals.variants[accidental2].bboxShortTone.top);
            }
        }
        const nvY = nvRef - P.rules.textAboveStaff;
        contentTop = Math.min(contentTop, nvY + nvBbox.top);
    }

    const contentBottom = dynRowMidline + maxBelowMidline;
    const contentLeft = 0;
    const contentRight = Math.max(P.staffWidth, seccoRightEdge, dyn2RightEdge, hairpinEndX);

    // Check ledger lines below for both notes
    if (staffPosition1 > 2) contentTop = contentTop; // already handled above
    // Expand bottom for ledger lines
    let contentBottomExpanded = contentBottom;
    if (staffPosition1 >= 3) contentBottomExpanded = Math.max(contentBottomExpanded, staffPosition1 + 1 + lineHalf);
    if (staffPosition2 >= 3) contentBottomExpanded = Math.max(contentBottomExpanded, staffPosition2 + 1 + lineHalf);

    const padding = P.rules.viewBoxPadding;
    const viewBox = {
        x: contentLeft - padding,
        y: contentTop - padding,
        width: (contentRight - contentLeft) + padding * 2,
        height: (Math.max(contentBottom, contentBottomExpanded) - contentTop) + padding * 2
    };

    const mmPerStaffSpace = 1.7573;
    const dimensions = {
        width: viewBox.width * mmPerStaffSpace,
        height: viewBox.height * mmPerStaffSpace
    };

    const svg = wrapSvg(parts.filter(Boolean).join('\n'), viewBox, dimensions);

    // Compute positioning metadata
    const startNoteheadCenterX_mm = (P.note1X + nhBbox.midX - viewBox.x) * mmPerStaffSpace;
    const staffHeight_mm = 4 * mmPerStaffSpace;

    return {
        svg,
        metadata: {
            startNoteheadCenterX_mm,
            staffHeight_mm,
            width_mm: dimensions.width,
            height_mm: dimensions.height,
            sameStaffLine: isSameLine,
            positioning: P.positioning
        }
    };
}

// ============================================
// BOW OVERPRESSURE ACCENT GENERATORS
// ============================================

/**
 * Generate a square notehead (filled rect)
 * @param {number} x - Center X in staff-spaces
 * @param {number} y - Center Y in staff-spaces (staffPosition)
 * @param {number} size - Side length in staff-spaces (default 0.8)
 * @returns {string} SVG rect element
 */
function generateSquareNotehead(x, y, size = 0.8) {
    const half = size / 2;
    return `<rect x="${(x - half).toFixed(4)}" y="${(y - half).toFixed(4)}" ` +
        `width="${size.toFixed(4)}" height="${size.toFixed(4)}" ry="0.0000" fill="currentColor"/>`;
}

/**
 * Generate a stem rect
 * @param {number} x - Stem center X
 * @param {number} yTop - Top edge Y (smaller value = higher on page)
 * @param {number} height - Stem height (positive)
 * @param {number} width - Stem width (default 0.13)
 * @returns {string} SVG rect element
 */
function generateStem(x, yTop, height, width = 0.13) {
    return `<rect x="${(x - width / 2).toFixed(4)}" y="${yTop.toFixed(4)}" ` +
        `width="${width.toFixed(4)}" height="${height.toFixed(4)}" ry="0.0400" fill="currentColor"/>`;
}

/**
 * Generate a single downbow mark from the library
 * @param {number} x - Anchor X
 * @param {number} y - Anchor Y
 * @returns {string} SVG path element
 */
function generateDownbow(x, y) {
    const db = LIBRARY.components.scripts.downbow;
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${db.scale[0]}, ${db.scale[1]})" d="${db.path}" fill="currentColor"/>
</g>`;
}

/**
 * Generate marcato accent mark from the library
 * @param {number} x - Anchor X
 * @param {number} y - Anchor Y
 * @returns {string} SVG path element
 */
function generateMarcato(x, y) {
    const m = LIBRARY.components.scripts.marcato;
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${m.scale[0]}, ${m.scale[1]})" d="${m.path}" fill="currentColor"/>
</g>`;
}

/**
 * Generate a cross (X) notehead from the library.
 * Same scale as shortTone (NoteHead.font-size = #-2).
 * Anchor at (x, y) = left edge of glyph path at the staff position.
 * Center is at x + bbox.midX.
 * @param {number} x - Anchor X in staff-spaces
 * @param {number} y - Anchor Y in staff-spaces (staffPosition)
 * @returns {string} SVG path element
 */
function generateCrossNotehead(x, y) {
    const nh = LIBRARY.components.noteheads.crossNotehead;
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${nh.scale[0]}, ${nh.scale[1]})" d="${nh.path}" fill="currentColor"/>
</g>`;
}

/**
 * Generate an upward-pointing marcato (^ shape) for placement above notes.
 * Uses the same path as the regular marcato but with positive Y scale
 * (regular marcato has negative Y → points downward for use below notes).
 * Bbox: top=-1.1, bottom=0 (extends upward from anchor).
 * @param {number} x - Anchor X (center)
 * @param {number} y - Anchor Y (bottom edge of glyph)
 * @returns {string} SVG path element
 */
function generateMarcatoUp(x, y) {
    const m = LIBRARY.components.scripts.marcato;
    const upScaleY = Math.abs(m.scale[1]);
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${m.scale[0]}, ${upScaleY})" d="${m.path}" fill="currentColor"/>
</g>`;
}

/**
 * Generate sfz dynamic composite from the sfzDynamic library section
 * @param {number} x - Anchor X (left edge of composite)
 * @param {number} y - Anchor Y (baseline)
 * @returns {string} SVG group element
 */
function generateSfz(x, y) {
    const sfzLib = LIBRARY.components.sfzDynamic;
    const comp = sfzLib.composite.sfz;
    const paths = [];
    for (let i = 0; i < comp.glyphs.length; i++) {
        const glyphName = comp.glyphs[i];
        const glyph = sfzLib.glyphs[glyphName];
        const offsetX = comp.spacing[i];
        const transform = offsetX > 0
            ? `translate(${offsetX.toFixed(4)}, 0.0000) scale(${sfzLib.scale[0]}, ${sfzLib.scale[1]})`
            : `scale(${sfzLib.scale[0]}, ${sfzLib.scale[1]})`;
        paths.push(`<path transform="${transform}" d="${glyph.path}" fill="currentColor"/>`);
    }
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<g>
${paths.join('\n')}
</g>
</g>`;
}

/**
 * Generate a 16th note stem flag from the library
 * @param {number} x - Anchor X (stem right edge)
 * @param {number} y - Anchor Y (near stem endpoint)
 * @param {boolean} stemDown - true = down flag, false = up flag
 * @returns {string} SVG path element
 */
function generateFlag(x, y, stemDown) {
    const flagKey = stemDown ? 'flag16down' : 'flag16up';
    const flag = LIBRARY.components.scripts[flagKey];
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${flag.scale[0]}, ${flag.scale[1]})" d="${flag.path}" fill="currentColor"/>
</g>`;
}

// ============================================
// SNAP PIZZICATO GENERATOR
// ============================================

/**
 * Generate a snap (Bartók) pizzicato articulation mark from the library.
 * Circle body centered at anchor, vertical line extends upward (negative Y in SVG).
 * @param {number} x - Anchor X (center of circle)
 * @param {number} y - Anchor Y (center of circle body)
 * @returns {string} SVG group element
 */
function generateSnapPizzicato(x, y) {
    const sp = LIBRARY.components.scripts.snapPizzicato;
    return `<g transform="translate(${x.toFixed(4)}, ${y.toFixed(4)})">
<path transform="scale(${sp.scale[0]}, ${sp.scale[1]})" d="${sp.path}" fill="currentColor"/>
</g>`;
}

// ============================================
// BARTÓK PIZZICATO ASSEMBLY
// ============================================

/**
 * Assemble a complete Bartók Pizzicato SVG.
 *
 * Two modes:
 *   showStaff: true  — staff lines, filled notehead at pitch, stem, 16th flag, accidental,
 *                       ledger lines, snap pizzicato mark, dynamic
 *   showStaff: false — filled notehead only, snap pizzicato mark above, dynamic below
 *
 * @param {object} params
 * @param {number} params.staffPosition - Note Y in staff-spaces (used for staff mode)
 * @param {string|null} params.accidental - Accidental type or null
 * @param {string} params.dynamic - Dynamic name (e.g., 'fff', 'p')
 * @param {boolean} [params.showStaff=true] - Show staff lines, stem, accidentals
 * @param {boolean} [params.debug=false] - Render debug bounding box overlays
 * @returns {{ svg: string, metadata: object }}
 */
function assembleBartokPizzicato(params) {
    const {
        staffPosition = 0,
        accidental = null,
        dynamic = 'fff',
        showStaff = true,
        debug = false
    } = params;

    const P = PROFILES.bartokPizzicato;
    const parts = [];
    const debugRects = [];
    const nhBbox = LIBRARY.components.noteheads.shortTone.bbox;
    const nhScale = LIBRARY.components.noteheads.shortTone.scale;
    const spBbox = LIBRARY.components.scripts.snapPizzicato.bbox;
    const mmPerStaffSpace = 1.7573;
    const padding = P.rules.viewBoxPadding;

    if (showStaff) {
        // ============================
        // STAFF MODE
        // ============================

        const stemDown = staffPosition <= 0;

        // --- Staff lines ---
        parts.push(generateStaffLines(P.staffWidth));

        // --- Ledger lines ---
        const noteCenter = P.noteX + nhBbox.midX;
        const ledgerSvg = generateLedgerLines(staffPosition, noteCenter, P.ledgerLineWidth, 0.1);
        if (ledgerSvg) parts.push(ledgerSvg);

        // --- Filled notehead (shortTone) ---
        const noteY = staffPosition;
        parts.push(generateNotehead('shortTone', P.noteX, noteY));
        const noteTop = noteY + nhBbox.top;
        const noteBottom = noteY + nhBbox.bottom;
        const noteLeft = P.noteX + nhBbox.left;
        const noteRight = P.noteX + nhBbox.right;

        if (debug) {
            debugRects.push(debugBbox(P.noteX, noteY, nhBbox, '#0078FF', 'notehead'));
        }

        // --- Accidental ---
        let accBbox = null;
        let accAnchorX = null;
        if (accidental) {
            const variant = LIBRARY.components.accidentals.variants[accidental];
            if (variant) {
                const scaleData = LIBRARY.components.accidentals.shortTone;
                const xOffset = variant.xOffsetShortTone;
                accAnchorX = P.noteX + xOffset;
                parts.push(`<g transform="translate(${accAnchorX.toFixed(4)}, ${noteY.toFixed(4)})">
<path transform="scale(${scaleData.scale[0]}, ${scaleData.scale[1]})" d="${variant.path}" fill="currentColor"/>
</g>`);
                accBbox = variant.bboxShortTone;
                if (debug) {
                    debugRects.push(debugBbox(accAnchorX, noteY, accBbox, '#FFA500', 'accidental'));
                }
            }
        }

        // --- Stem ---
        let stemX, stemTop, stemBottom;
        if (stemDown) {
            // Stem on LEFT side of notehead, extends downward
            stemX = noteLeft + P.stemWidth / 2;
            stemTop = noteY + P.stemNoteOffset;
            stemBottom = stemTop + P.stemLength;
        } else {
            // Stem on RIGHT side of notehead, extends upward
            stemX = noteRight - P.stemWidth / 2;
            stemBottom = noteY - P.stemNoteOffset;
            stemTop = stemBottom - P.stemLength;
        }
        parts.push(generateStem(stemX, stemTop, P.stemLength, P.stemWidth));

        // --- 16th note flag ---
        const stemRightEdge = stemX + P.stemWidth / 2;
        let flagX, flagY, flagBbox;
        if (stemDown) {
            flagX = stemRightEdge;
            flagY = stemBottom - P.flagOffset;
            flagBbox = LIBRARY.components.scripts.flag16down.bbox;
        } else {
            flagX = stemRightEdge;
            flagY = stemTop + P.flagOffset;
            flagBbox = LIBRARY.components.scripts.flag16up.bbox;
        }
        parts.push(generateFlag(flagX, flagY, stemDown));

        if (debug) {
            debugRects.push(debugBbox(stemX, stemTop, {
                left: -P.stemWidth / 2, top: 0, right: P.stemWidth / 2, bottom: P.stemLength
            }, '#888888', 'stem'));
            debugRects.push(debugBbox(flagX, flagY, flagBbox, '#CC6600', 'flag'));
        }

        // --- Snap pizzicato mark ---
        // Always placed on opposite side of stem (above when stem down, below when stem up)
        // Must always stay outside the staff (top line = -2, bottom line = +2)
        let snapPizzY;
        if (stemDown) {
            // Above note — snap pizz circle bottom at noteTop - gap
            let highestPoint = noteTop;
            if (accBbox && (noteY + accBbox.top) < highestPoint) {
                highestPoint = noteY + accBbox.top;
            }
            snapPizzY = highestPoint - P.snapPizzGap - spBbox.bottom;
            // Clamp: snap pizz bottom must be at or above top staff line (-2)
            const maxY = -2 - spBbox.bottom;
            if (snapPizzY > maxY) snapPizzY = maxY;
        } else {
            // Below note — snap pizz circle top at noteBottom + gap
            let lowestPoint = noteBottom;
            if (accBbox && (noteY + accBbox.bottom) > lowestPoint) {
                lowestPoint = noteY + accBbox.bottom;
            }
            snapPizzY = lowestPoint + P.snapPizzGap - spBbox.top;
            // Clamp: snap pizz top must be at or below bottom staff line (+2)
            const minY = 2 - spBbox.top;
            if (snapPizzY < minY) snapPizzY = minY;
        }
        parts.push(generateSnapPizzicato(noteCenter, snapPizzY));
        const snapPizzTop = snapPizzY + spBbox.top;
        const snapPizzBottom = snapPizzY + spBbox.bottom;

        if (debug) {
            debugRects.push(debugBbox(noteCenter, snapPizzY, spBbox, '#00CC88', 'snapPizz'));
        }

        // --- Dynamic (below all when stem down, above all when stem up) ---
        const dynComposite = LIBRARY.components.dynamics.composites[dynamic];
        let dynBottom = Math.max(2, stemDown ? stemBottom : noteBottom);
        let dynTop = Math.min(-2, stemDown ? noteTop : stemTop);
        let dynX = noteCenter;
        if (dynComposite) {
            const dynBbox = dynComposite.bbox;
            let dynY;
            if (stemDown) {
                // Dynamic below everything
                const lowestRef = Math.max(stemBottom, flagY + flagBbox.bottom, snapPizzBottom);
                dynY = Math.max(lowestRef, 2) + P.rules.contentToRowGap - dynBbox.top;
            } else {
                // Dynamic below note (snap pizz is below, dynamic below snap pizz)
                dynY = Math.max(snapPizzBottom, 2) + P.rules.contentToRowGap - dynBbox.top;
            }
            dynX = noteCenter - dynBbox.midX;
            parts.push(generateDynamic(dynamic, dynX, dynY));
            dynBottom = dynY + dynBbox.bottom;

            if (debug) {
                debugRects.push(debugBbox(dynX, dynY, dynBbox, '#FF0000', 'dynamic'));
            }
        }

        // ============================
        // VIEWBOX COMPUTATION
        // ============================
        let contentLeft = 0;
        let contentRight = P.staffWidth;
        let contentTop = Math.min(-2, snapPizzTop);
        let contentBottom = Math.max(2, dynBottom);

        if (accBbox && accAnchorX !== null) {
            contentLeft = Math.min(contentLeft, accAnchorX + accBbox.left);
            contentRight = Math.max(contentRight, accAnchorX + accBbox.right);
        }
        contentLeft = Math.min(contentLeft, noteLeft);
        contentRight = Math.max(contentRight, noteRight);
        contentLeft = Math.min(contentLeft, noteCenter + spBbox.left);
        contentRight = Math.max(contentRight, noteCenter + spBbox.right);
        contentLeft = Math.min(contentLeft, flagX + flagBbox.left);
        contentRight = Math.max(contentRight, flagX + flagBbox.right);
        contentTop = Math.min(contentTop, flagY + flagBbox.top);
        contentBottom = Math.max(contentBottom, flagY + flagBbox.bottom);
        if (dynComposite) {
            contentLeft = Math.min(contentLeft, dynX + dynComposite.bbox.left);
            contentRight = Math.max(contentRight, dynX + dynComposite.bbox.right);
        }
        if (staffPosition >= 3 || staffPosition <= -3) {
            const ledgerHalf = P.ledgerLineWidth / 2;
            contentLeft = Math.min(contentLeft, noteCenter - ledgerHalf);
            contentRight = Math.max(contentRight, noteCenter + ledgerHalf);
        }

        const viewBox = {
            x: contentLeft - padding,
            y: contentTop - padding,
            width: (contentRight - contentLeft) + padding * 2,
            height: (contentBottom - contentTop) + padding * 2
        };
        const dimensions = {
            width: viewBox.width * mmPerStaffSpace,
            height: viewBox.height * mmPerStaffSpace
        };

        let content = parts.join('\n');
        if (debug && debugRects.length > 0) {
            content += '\n<!-- DEBUG OVERLAYS -->\n' + debugRects.join('\n');
        }
        const svg = wrapSvg(content, viewBox, dimensions);

        const noteheadCenterX_mm = (noteCenter - viewBox.x) * mmPerStaffSpace;
        const staffHeight_mm = 4 * mmPerStaffSpace;

        return {
            svg,
            metadata: {
                noteheadCenterX_mm,
                staffHeight_mm,
                width_mm: dimensions.width,
                height_mm: dimensions.height,
                stemDirection: stemDown ? 'down' : 'up',
                mode: 'staff',
                positioning: P.positioning
            }
        };

    } else {
        // ============================
        // NO-STAFF MODE — LilyPond template
        // ============================
        // Returns pre-rendered LilyPond SVG (cleaned, no textedit links)
        // Static template: flag + stem + filled notehead + snap pizzicato mark

        const tpl = NO_STAFF_TEMPLATES.bpNoStaff;
        return {
            svg: tpl.svg,
            metadata: {
                noteheadCenterX_mm: tpl.noteheadCenterX_mm,
                width_mm: tpl.width_mm,
                height_mm: tpl.height_mm,
                mode: 'noStaff',
                positioning: P.positioningNoStaff
            }
        };
    }
}

// ============================================
// BOW OVERPRESSURE ACCENT ASSEMBLY
// ============================================

/**
 * Assemble a complete bow overpressure accent SVG.
 *
 * LAYOUT (stem down — note above staff or on upper half):
 *   3× downbow marks (above, stacked upward from note)
 *   notehead (square) + accidental + ledger lines
 *   stem (from note edge downward)
 *   marcato (below stem end)
 *   sfz (below marcato)
 *
 * LAYOUT (stem up — note below staff or on lower half):
 *   3× downbow marks (above, stacked upward from stem top)
 *   stem (from note edge upward)
 *   notehead (square) + accidental + ledger lines
 *   marcato (below note)
 *   sfz (below marcato)
 *
 * Stem direction: staffPosition <= 0 → stem down, > 0 → stem up
 * (B4 in treble = position 0 → stem down; C4 in treble = position 3 → stem up)
 *
 * @param {object} params
 * @param {number} params.staffPosition - Note Y in staff-spaces
 * @param {string|null} params.accidental - Accidental type or null
 * @param {boolean} [params.debug] - Render debug bounding box overlays
 * @returns {{ svg: string, metadata: object }} SVG document + positioning metadata
 */
function assembleBowOverpressureAccent(params) {
    const {
        staffPosition = 0,
        accidental = null,
        showStaff = true,
        debug = false
    } = params;

    const P = PROFILES.bowOverpressureAccent;
    const parts = [];
    const debugRects = [];
    const mmPerStaffSpace = 1.7573;
    const padding = P.rules.viewBoxPadding;

    if (showStaff) {
        // ============================
        // STAFF MODE
        // ============================

        // --- Stem direction ---
        const stemDown = staffPosition <= 0;

        // --- Staff lines ---
        parts.push(generateStaffLines(P.staffWidth));

        // --- Ledger lines (same thickness as staff lines = 0.1) ---
        const ledgerSvg = generateLedgerLines(staffPosition, P.noteX, P.ledgerLineWidth, 0.1);
        if (ledgerSvg) parts.push(ledgerSvg);

        // --- Square notehead ---
        const noteY = staffPosition;
        parts.push(generateSquareNotehead(P.noteX, noteY, P.noteSize));
        const noteHalf = P.noteSize / 2;
        const noteTop = noteY - noteHalf;
        const noteBottom = noteY + noteHalf;
        const noteLeft = P.noteX - noteHalf;
        const noteRight = P.noteX + noteHalf;

        if (debug) {
            debugRects.push(debugBbox(P.noteX, noteY, {
                left: -noteHalf, top: -noteHalf, right: noteHalf, bottom: noteHalf
            }, '#0078FF', 'notehead'));
        }

        // --- Accidental ---
        let accBbox = null;
        let accAnchorX = null;
        if (accidental) {
            const variant = LIBRARY.components.accidentals.variants[accidental];
            if (variant) {
                const scaleData = LIBRARY.components.accidentals.shortTone;
                const xOffset = variant.xOffsetShortTone;
                accAnchorX = P.noteX - noteHalf + xOffset - 0.2276;
                parts.push(`<g transform="translate(${accAnchorX.toFixed(4)}, ${noteY.toFixed(4)})">
<path transform="scale(${scaleData.scale[0]}, ${scaleData.scale[1]})" d="${variant.path}" fill="currentColor"/>
</g>`);
                accBbox = variant.bboxShortTone;
                if (debug) {
                    debugRects.push(debugBbox(accAnchorX, noteY, accBbox, '#FFA500', 'accidental'));
                }
            }
        }

        // --- Stem ---
        let stemX, stemTop, stemBottom;
        if (stemDown) {
            stemX = noteLeft + P.stemWidth / 2;
            stemTop = noteY + P.stemNoteOffset;
            stemBottom = stemTop + P.stemLength;
        } else {
            stemX = noteRight - P.stemWidth / 2;
            stemBottom = noteY - P.stemNoteOffset;
            stemTop = stemBottom - P.stemLength;
        }
        parts.push(generateStem(stemX, stemTop, P.stemLength, P.stemWidth));

        // --- 16th note flag (at stem endpoint) ---
        const stemRightEdge = stemX + P.stemWidth / 2;
        let flagX, flagY, flagBbox;
        if (stemDown) {
            flagX = stemRightEdge;
            flagY = stemBottom - P.flagOffset;
            flagBbox = LIBRARY.components.scripts.flag16down.bbox;
        } else {
            flagX = stemRightEdge;
            flagY = stemTop + P.flagOffset;
            flagBbox = LIBRARY.components.scripts.flag16up.bbox;
        }
        parts.push(generateFlag(flagX, flagY, stemDown));

        if (debug) {
            debugRects.push(debugBbox(stemX, stemTop, {
                left: -P.stemWidth / 2, top: 0, right: P.stemWidth / 2, bottom: P.stemLength
            }, '#888888', 'stem'));
            debugRects.push(debugBbox(flagX, flagY, flagBbox, '#CC6600', 'flag'));
        }

        // --- 3× Downbow marks (always above) ---
        const dbBbox = LIBRARY.components.scripts.downbow.bbox;
        let highestPoint;
        if (stemDown) {
            highestPoint = noteTop;
            if (accBbox && (noteY + accBbox.top) < highestPoint) {
                highestPoint = noteY + accBbox.top;
            }
        } else {
            highestPoint = stemTop;
        }
        const lowestDbY = highestPoint - P.downbowGapFromNote;
        for (let i = 0; i < P.downbowCount; i++) {
            const dbY = lowestDbY - i * P.downbowSpacing;
            parts.push(generateDownbow(P.noteX, dbY));
            if (debug) {
                debugRects.push(debugBbox(P.noteX, dbY, dbBbox, '#00AA00', `downbow${i + 1}`));
            }
        }
        const topDownbowY = lowestDbY - (P.downbowCount - 1) * P.downbowSpacing;
        const topDownbowTop = topDownbowY + dbBbox.top;

        // --- Marcato (always below) ---
        const mBbox = LIBRARY.components.scripts.marcato.bbox;
        let marcatoRef;
        if (stemDown) {
            marcatoRef = stemBottom;
        } else {
            marcatoRef = noteBottom;
        }
        const marcatoY = marcatoRef + P.marcatoGap;
        parts.push(generateMarcato(P.noteX, marcatoY));
        const marcatoBottom = marcatoY + mBbox.bottom;

        if (debug) {
            debugRects.push(debugBbox(P.noteX, marcatoY, mBbox, '#FF0000', 'marcato'));
        }

        // --- sfz (below marcato) ---
        const sfzBbox = LIBRARY.components.sfzDynamic.composite.sfz.bbox;
        const sfzAnchorY = marcatoBottom + P.sfzGap - sfzBbox.top;
        const sfzCenterX = P.noteX - sfzBbox.midX;
        parts.push(generateSfz(sfzCenterX, sfzAnchorY));
        const sfzBottom = sfzAnchorY + sfzBbox.bottom;

        if (debug) {
            debugRects.push(debugBbox(sfzCenterX, sfzAnchorY, sfzBbox, '#8000FF', 'sfz'));
        }

        // ============================
        // VIEWBOX COMPUTATION
        // ============================
        let contentLeft = 0;
        let contentRight = P.staffWidth;
        let contentTop = Math.min(-2, topDownbowTop);
        let contentBottom = Math.max(2, sfzBottom);

        if (accBbox && accAnchorX !== null) {
            contentLeft = Math.min(contentLeft, accAnchorX + accBbox.left);
            contentRight = Math.max(contentRight, accAnchorX + accBbox.right);
        }
        contentLeft = Math.min(contentLeft, noteLeft);
        contentRight = Math.max(contentRight, noteRight);
        contentLeft = Math.min(contentLeft, sfzCenterX + sfzBbox.left);
        contentRight = Math.max(contentRight, sfzCenterX + sfzBbox.right);
        contentLeft = Math.min(contentLeft, P.noteX + dbBbox.left);
        contentRight = Math.max(contentRight, P.noteX + dbBbox.right);
        contentLeft = Math.min(contentLeft, P.noteX + mBbox.left);
        contentRight = Math.max(contentRight, P.noteX + mBbox.right);
        contentLeft = Math.min(contentLeft, flagX + flagBbox.left);
        contentRight = Math.max(contentRight, flagX + flagBbox.right);
        contentTop = Math.min(contentTop, flagY + flagBbox.top);
        contentBottom = Math.max(contentBottom, flagY + flagBbox.bottom);
        if (staffPosition >= 3 || staffPosition <= -3) {
            const ledgerHalf = P.ledgerLineWidth / 2;
            contentLeft = Math.min(contentLeft, P.noteX - ledgerHalf);
            contentRight = Math.max(contentRight, P.noteX + ledgerHalf);
        }

        const viewBox = {
            x: contentLeft - padding,
            y: contentTop - padding,
            width: (contentRight - contentLeft) + padding * 2,
            height: (contentBottom - contentTop) + padding * 2
        };
        const dimensions = {
            width: viewBox.width * mmPerStaffSpace,
            height: viewBox.height * mmPerStaffSpace
        };

        let content = parts.join('\n');
        if (debug && debugRects.length > 0) {
            content += '\n<!-- DEBUG OVERLAYS -->\n' + debugRects.join('\n');
        }
        const svg = wrapSvg(content, viewBox, dimensions);

        const noteheadCenterX_mm = (P.noteX - viewBox.x) * mmPerStaffSpace;
        const staffHeight_mm = 4 * mmPerStaffSpace;

        return {
            svg,
            metadata: {
                noteheadCenterX_mm,
                staffHeight_mm,
                width_mm: dimensions.width,
                height_mm: dimensions.height,
                stemDirection: stemDown ? 'down' : 'up',
                mode: 'staff',
                positioning: P.positioning
            }
        };

    } else {
        // ============================
        // NO-STAFF MODE — LilyPond template
        // ============================
        // Returns pre-rendered LilyPond SVG (cleaned, no textedit links)
        // Static template: 3× downbow + flag + stem + square notehead + marcato + sfz

        const tpl = NO_STAFF_TEMPLATES.bopNoStaff;
        return {
            svg: tpl.svg,
            metadata: {
                noteheadCenterX_mm: tpl.noteheadCenterX_mm,
                width_mm: tpl.width_mm,
                height_mm: tpl.height_mm,
                mode: 'noStaff',
                positioning: P.positioningNoStaff
            }
        };
    }
}

// ============================================
// COL LEGNO BATTUTO, JETÉ ASSEMBLY
// ============================================

/**
 * Assemble a complete col legno battuto, jeté SVG.
 *
 * Two modes:
 *   showStaff: true  — staff lines, cross notehead at pitch, stem (quarter), accidental, ledger lines
 *   showStaff: false — cross notehead only (no staff/stem/accidental), upward marcato above
 *
 * Both modes include: "c.l.b. jeté" text above, user-selected dynamic below.
 *
 * @param {object} params
 * @param {number} params.staffPosition - Note Y in staff-spaces (used for staff mode)
 * @param {string|null} params.accidental - Accidental type or null
 * @param {string} params.dynamic - Dynamic name (e.g., 'p', 'pp', 'f')
 * @param {boolean} [params.showStaff=true] - Show staff lines, stem, accidentals
 * @param {boolean} [params.debug=false] - Render debug bounding box overlays
 * @returns {{ svg: string, metadata: object }}
 */
function assembleColLegnoBattutoJete(params) {
    const {
        staffPosition = 0,
        accidental = null,
        dynamic = 'p',
        showStaff = true,
        debug = false
    } = params;

    const P = PROFILES.colLegnoBattutoJete;
    const parts = [];
    const debugRects = [];
    const nhBbox = LIBRARY.components.noteheads.crossNotehead.bbox;
    const clbBbox = LIBRARY.components.text.clbJete.bbox;
    const mmPerStaffSpace = 1.7573;
    const padding = P.rules.viewBoxPadding;

    if (showStaff) {
        // ============================
        // STAFF MODE
        // ============================

        const stemDown = staffPosition <= 0;

        // --- Staff lines ---
        parts.push(generateStaffLines(P.staffWidth));

        // --- Cross notehead ---
        const noteY = staffPosition;
        parts.push(generateCrossNotehead(P.noteX, noteY));
        const noteCenterX = P.noteX + nhBbox.midX;
        const noteTop = noteY + nhBbox.top;
        const noteBottom = noteY + nhBbox.bottom;
        const noteLeft = P.noteX + nhBbox.left;
        const noteRight = P.noteX + nhBbox.right;

        if (debug) {
            debugRects.push(debugBbox(P.noteX, noteY, nhBbox, '#0078FF', 'notehead'));
        }

        // --- Ledger lines (centered on notehead center) ---
        const ledgerSvg = generateLedgerLines(staffPosition, noteCenterX, P.ledgerLineWidth, 0.1);
        if (ledgerSvg) parts.push(ledgerSvg);

        // --- Accidental (shortTone scale — same bbox as cross notehead) ---
        let accBbox = null;
        let accAnchorX = null;
        if (accidental) {
            const accNoteX = P.noteX + (P.accidentalXShift || 0);
            parts.push(generateAccidental(accidental, 'shortTone', accNoteX, noteY));
            const variant = LIBRARY.components.accidentals.variants[accidental];
            if (variant) {
                accBbox = variant.bboxShortTone;
                accAnchorX = accNoteX + variant.xOffsetShortTone;
                if (debug) {
                    debugRects.push(debugBbox(accAnchorX, noteY, accBbox, '#FFA500', 'accidental'));
                }
            }
        }

        // --- Stem (quarter note — no flag) ---
        let stemX, stemTop, stemBottom;
        if (stemDown) {
            stemX = noteLeft + P.stemWidth / 2;
            stemTop = noteY + P.stemNoteOffset;
            stemBottom = stemTop + P.stemLength;
        } else {
            stemX = noteRight - P.stemWidth / 2;
            stemBottom = noteY - P.stemNoteOffset;
            stemTop = stemBottom - P.stemLength;
        }
        parts.push(generateStem(stemX, stemTop, P.stemLength, P.stemWidth));

        if (debug) {
            debugRects.push(debugBbox(stemX, stemTop, {
                left: -P.stemWidth / 2, top: 0, right: P.stemWidth / 2, bottom: P.stemLength
            }, '#888888', 'stem'));
        }

        // --- "c.l.b. jeté" text (always above) ---
        let highestPoint;
        if (!stemDown) {
            highestPoint = stemTop;
        } else {
            highestPoint = noteTop;
            if (accBbox && (noteY + accBbox.top) < highestPoint) {
                highestPoint = noteY + accBbox.top;
            }
        }
        highestPoint = Math.min(highestPoint, -2); // at least above top staff line
        const clbTextY = highestPoint - P.rules.textAboveStaff - clbBbox.bottom;
        const clbTextX = P.clbTextX;
        parts.push(generateText('clbJete', clbTextX, clbTextY));
        const clbTextTop = clbTextY + clbBbox.top;

        if (debug) {
            debugRects.push(debugBbox(clbTextX, clbTextY, clbBbox, '#8000FF', 'clbText'));
        }

        // --- Dynamic (always below) ---
        let lowestPoint;
        if (stemDown) {
            lowestPoint = stemBottom;
        } else {
            lowestPoint = noteBottom;
        }
        lowestPoint = Math.max(lowestPoint, 2); // at least below bottom staff line

        const dynComposite = LIBRARY.components.dynamics.composites[dynamic];
        let dynBottom = lowestPoint;
        let dynX = noteCenterX;
        if (dynComposite) {
            const dynBbox = dynComposite.bbox;
            const dynY = lowestPoint + P.rules.contentToRowGap - dynBbox.top;
            dynX = noteCenterX - dynBbox.midX + (P.dynamicXShift || 0);
            parts.push(generateDynamic(dynamic, dynX, dynY));
            dynBottom = dynY + dynBbox.bottom;

            if (debug) {
                debugRects.push(debugBbox(dynX, dynY, dynBbox, '#FF0000', 'dynamic'));
            }
        }

        // ============================
        // VIEWBOX COMPUTATION
        // ============================
        let contentLeft = 0;
        let contentRight = P.staffWidth;
        let contentTop = Math.min(-2, clbTextTop);
        let contentBottom = Math.max(2, dynBottom);

        // Expand for accidental
        if (accBbox && accAnchorX !== null) {
            contentLeft = Math.min(contentLeft, accAnchorX + accBbox.left);
            contentRight = Math.max(contentRight, accAnchorX + accBbox.right);
        }
        // Expand for note
        contentLeft = Math.min(contentLeft, noteLeft);
        contentRight = Math.max(contentRight, noteRight);
        // Expand for text
        contentLeft = Math.min(contentLeft, clbTextX + clbBbox.left);
        contentRight = Math.max(contentRight, clbTextX + clbBbox.right);
        // Expand for dynamic
        if (dynComposite) {
            const dynBbox = dynComposite.bbox;
            contentLeft = Math.min(contentLeft, dynX + dynBbox.left);
            contentRight = Math.max(contentRight, dynX + dynBbox.right);
        }
        // Expand for stem
        contentTop = Math.min(contentTop, stemTop);
        contentBottom = Math.max(contentBottom, stemBottom);
        // Expand for ledger lines
        if (staffPosition >= 3 || staffPosition <= -3) {
            const ledgerHalf = P.ledgerLineWidth / 2;
            contentLeft = Math.min(contentLeft, noteCenterX - ledgerHalf);
            contentRight = Math.max(contentRight, noteCenterX + ledgerHalf);
        }

        const viewBox = {
            x: contentLeft - padding,
            y: contentTop - padding,
            width: (contentRight - contentLeft) + padding * 2,
            height: (contentBottom - contentTop) + padding * 2
        };
        const dimensions = {
            width: viewBox.width * mmPerStaffSpace,
            height: viewBox.height * mmPerStaffSpace
        };

        let content = parts.join('\n');
        if (debug && debugRects.length > 0) {
            content += '\n<!-- DEBUG OVERLAYS -->\n' + debugRects.join('\n');
        }
        const svg = wrapSvg(content, viewBox, dimensions);

        const noteheadCenterX_mm = (noteCenterX - viewBox.x) * mmPerStaffSpace;
        const staffHeight_mm = 4 * mmPerStaffSpace;

        return {
            svg,
            metadata: {
                noteheadCenterX_mm,
                staffHeight_mm,
                width_mm: dimensions.width,
                height_mm: dimensions.height,
                stemDirection: stemDown ? 'down' : 'up',
                mode: 'staff',
                positioning: P.positioning
            }
        };

    } else {
        // ============================
        // NO-STAFF MODE
        // ============================

        // Cross notehead + stem at Y=0
        const noteY = 0;
        parts.push(generateCrossNotehead(P.noteX, noteY));
        const noteCenterX = P.noteX + nhBbox.midX;
        const noteTop = noteY + nhBbox.top;
        const noteBottom = noteY + nhBbox.bottom;
        const noteLeft = P.noteX + nhBbox.left;
        const noteRight = P.noteX + nhBbox.right;

        if (debug) {
            debugRects.push(debugBbox(P.noteX, noteY, nhBbox, '#0078FF', 'notehead'));
        }

        // --- Stem (upward from right edge of notehead) ---
        const stemX = noteRight - P.stemWidth / 2;
        const stemBottom = noteY - P.stemNoteOffset;
        const stemTop = stemBottom - P.stemLength;
        parts.push(generateStem(stemX, stemTop, P.stemLength, P.stemWidth));

        if (debug) {
            debugRects.push(debugBbox(stemX, stemTop, {
                left: -P.stemWidth / 2, top: 0, right: P.stemWidth / 2, bottom: P.stemLength
            }, '#888888', 'stem'));
        }

        // --- Upward marcato above stem ---
        const mBbox = LIBRARY.components.scripts.marcato.bbox;
        // Flipped bbox for upward marcato: top=-height, bottom=0
        const marcatoUpBbox = {
            left: mBbox.left,
            top: -mBbox.bottom,
            right: mBbox.right,
            bottom: -mBbox.top,
            width: mBbox.width,
            height: mBbox.height,
            midX: mBbox.midX,
            midY: -mBbox.midY
        };
        // Anchor Y: marcato bottom at stemTop - gap
        const marcatoAnchorY = stemTop - P.marcatoGapNoStaff;
        parts.push(generateMarcatoUp(noteCenterX, marcatoAnchorY));
        const marcatoTop = marcatoAnchorY + marcatoUpBbox.top;

        if (debug) {
            debugRects.push(debugBbox(noteCenterX, marcatoAnchorY, marcatoUpBbox, '#FF6600', 'marcatoUp'));
        }

        // --- "c.l.b. jeté" text (above marcato) ---
        const clbTextY = marcatoTop - P.rules.textAboveStaff - clbBbox.bottom;
        const clbTextX = P.clbTextX;
        parts.push(generateText('clbJete', clbTextX, clbTextY));
        const clbTextTop = clbTextY + clbBbox.top;

        if (debug) {
            debugRects.push(debugBbox(clbTextX, clbTextY, clbBbox, '#8000FF', 'clbText'));
        }

        // --- Dynamic (below notehead) ---
        const dynComposite = LIBRARY.components.dynamics.composites[dynamic];
        let dynBottom = noteBottom;
        let dynX = noteCenterX;
        if (dynComposite) {
            const dynBbox = dynComposite.bbox;
            const dynY = noteBottom + P.rules.contentToRowGap - dynBbox.top;
            dynX = noteCenterX - dynBbox.midX + (P.dynamicXShift || 0);
            parts.push(generateDynamic(dynamic, dynX, dynY));
            dynBottom = dynY + dynBbox.bottom;

            if (debug) {
                debugRects.push(debugBbox(dynX, dynY, dynBbox, '#FF0000', 'dynamic'));
            }
        }

        // ============================
        // VIEWBOX COMPUTATION
        // ============================
        let contentLeft = noteLeft;
        let contentRight = noteRight;
        let contentTop = clbTextTop;
        let contentBottom = dynBottom;

        // Expand for stem
        contentLeft = Math.min(contentLeft, stemX - P.stemWidth / 2);
        contentRight = Math.max(contentRight, stemX + P.stemWidth / 2);
        contentTop = Math.min(contentTop, stemTop);
        // Expand for marcato
        contentLeft = Math.min(contentLeft, noteCenterX + marcatoUpBbox.left);
        contentRight = Math.max(contentRight, noteCenterX + marcatoUpBbox.right);
        // Expand for text
        contentLeft = Math.min(contentLeft, clbTextX + clbBbox.left);
        contentRight = Math.max(contentRight, clbTextX + clbBbox.right);
        // Expand for dynamic
        if (dynComposite) {
            const dynBbox = dynComposite.bbox;
            contentLeft = Math.min(contentLeft, dynX + dynBbox.left);
            contentRight = Math.max(contentRight, dynX + dynBbox.right);
        }

        const viewBox = {
            x: contentLeft - padding,
            y: contentTop - padding,
            width: (contentRight - contentLeft) + padding * 2,
            height: (contentBottom - contentTop) + padding * 2
        };
        const dimensions = {
            width: viewBox.width * mmPerStaffSpace,
            height: viewBox.height * mmPerStaffSpace
        };

        let content = parts.join('\n');
        if (debug && debugRects.length > 0) {
            content += '\n<!-- DEBUG OVERLAYS -->\n' + debugRects.join('\n');
        }
        const svg = wrapSvg(content, viewBox, dimensions);

        const noteheadCenterX_mm = (noteCenterX - viewBox.x) * mmPerStaffSpace;

        return {
            svg,
            metadata: {
                noteheadCenterX_mm,
                width_mm: dimensions.width,
                height_mm: dimensions.height,
                mode: 'noStaff',
                positioning: P.positioningNoStaff
            }
        };
    }
}

// ============================================
// FEATHERED BEAM DATA (native coordinates)
// ============================================
//
// Geometry extracted from FeatheredDecel_assembled.svg and FeatheredAccel_assembled.svg.
// All X coordinates shifted so beam left edge = 0 (original beam left was at 0.4).
// Y origin = top of beam block (top-left corner of first beam).
// Beams stored as arrays of [x, y] point pairs for each polygon vertex.

const FEATHERED_BEAM_DATA = {
    decel: {
        nativeWidth: 10.7233,       // beam span (right edge - left edge)
        nativeHeight: 5.0639,       // beam top to notehead bottom (4.8083 + 0.2556)
        stems: [0, 0.6268, 1.5133, 2.767, 4.54, 7.0474, 10.5933],
        stemWidth: 0.13,
        stemHeight: 4.8083,
        noteheadXOffset: -0.4496,   // notehead left edge relative to stem left edge
        noteheadY: 4.8083,          // notehead anchor Y (bottom of stem)
        beams: [
            [[0, 0], [10.7233, 0], [10.7233, 0.4], [0, 0.4]],
            [[0, 1.4791], [10.7233, 0], [10.7233, 0.4], [0, 1.8791]],
            [[0, 2.9583], [10.7233, 0], [10.7233, 0.4], [0, 3.3583]]
        ]
    },
    accel: {
        nativeWidth: 9.5291,
        nativeHeight: 3.7839,       // 3.5283 + 0.2556
        stems: [0, 3.1462, 5.3709, 6.944, 8.0563, 8.8429, 9.3991],
        stemWidth: 0.13,
        stemHeight: 3.5283,
        noteheadXOffset: -0.4496,
        noteheadY: 3.5283,
        beams: [
            [[0, 0], [9.5291, 0], [9.5291, 0.25], [0, 0.25]],
            [[0, 0], [9.5291, 0.8533], [9.5291, 1.1033], [0, 0.25]],
            [[0, 0], [9.5291, 1.7067], [9.5291, 1.9567], [0, 0.25]]
        ]
    }
};

/**
 * Generate a feathered beam block (accel or decel) scaled to a target width.
 * Returns SVG elements in the block's local coordinate system.
 * Origin: top-left corner of beam area. Y-positive = down (SVG convention).
 * The caller wraps the result in a <g transform="translate(x, y)"> for positioning.
 *
 * @param {string} type - 'accel' or 'decel'
 * @param {number} targetWidth - Desired width in staff-spaces
 * @returns {{ svg: string, width: number, height: number, noteheadOverhangLeft: number }}
 */
function generateFeatheredBeamBlock(type, targetWidth) {
    const data = FEATHERED_BEAM_DATA[type];
    const s = targetWidth / data.nativeWidth;
    const scaledHeight = data.nativeHeight * s;

    const nhPath = LIBRARY.components.noteheads.smallTone.path;
    const nhScale = LIBRARY.components.noteheads.smallTone.scale;

    const els = [];

    // Stems
    for (const sx of data.stems) {
        els.push(
            `<rect x="${(sx * s).toFixed(4)}" y="0" width="${(data.stemWidth * s).toFixed(4)}" ` +
            `height="${(data.stemHeight * s).toFixed(4)}" ry="${(0.04 * s).toFixed(4)}" fill="currentColor"/>`
        );
    }

    // Noteheads (smallTone glyph, scaled proportionally)
    const nhScaleX = nhScale[0] * s;
    const nhScaleY = nhScale[1] * s;
    for (const sx of data.stems) {
        const nhX = (sx + data.noteheadXOffset) * s;
        const nhY = data.noteheadY * s;
        els.push(
            `<g transform="translate(${nhX.toFixed(4)}, ${nhY.toFixed(4)})">` +
            `<path transform="scale(${nhScaleX.toFixed(6)},${nhScaleY.toFixed(6)})" d="${nhPath}" fill="currentColor"/>` +
            `</g>`
        );
    }

    // Beams (filled polygons)
    for (const beam of data.beams) {
        const scaledPts = beam.map(([x, y]) =>
            `${(x * s).toFixed(4)},${(y * s).toFixed(4)}`
        ).join(' ');
        els.push(`<polygon points="${scaledPts}" fill="currentColor"/>`);
    }

    return {
        svg: els.join('\n'),
        width: targetWidth,
        height: scaledHeight,
        noteheadOverhangLeft: Math.abs(data.noteheadXOffset) * s
    };
}

// ============================================
// FEATHERED BEAM ASSEMBLY
// ============================================

/**
 * Assemble a feathered beam SVG: sustained tone notation (single pitch or glissando)
 * with a feathered beam block (accel or decel) above or below.
 *
 * Like sustained tone but: no Non-Vib text, no secco text.
 * Feathered beam block width matches pitch block width (x=0 to rightmost element).
 * Placement: above by default; below if 1+ ledger lines above the staff.
 *
 * @param {object} params
 * @param {string} [params.variant='singlePitch'] - 'singlePitch' or 'glissando'
 * @param {number} [params.staffPosition] - Note Y in staff-spaces (single pitch)
 * @param {number} [params.staffPosition1] - First note Y (glissando)
 * @param {number} [params.staffPosition2] - Second note Y (glissando)
 * @param {string|null} [params.accidental] - Accidental (single pitch)
 * @param {string|null} [params.accidental1] - First accidental (glissando)
 * @param {string|null} [params.accidental2] - Second accidental (glissando)
 * @param {string} [params.noteheadType='longTone'] - Notehead type (single pitch only)
 * @param {string} params.dynamic1 - First dynamic
 * @param {string} [params.dynamic2] - Second dynamic
 * @param {string} [params.hairpin='<'] - '<', '>', or 'none'
 * @param {string} [params.featheredType='accel'] - 'accel' or 'decel'
 * @param {boolean} [params.debug=false] - Debug overlays
 * @returns {{ svg: string, metadata: object }}
 */
function assembleFeatheredBeam(params) {
    const {
        variant = 'singlePitch',
        staffPosition,
        staffPosition1,
        staffPosition2,
        accidental = null,
        accidental1 = null,
        accidental2 = null,
        noteheadType = 'shortTone',
        dynamic1,
        dynamic2,
        hairpin = '<',
        featheredType = 'accel',
        debug = false
    } = params;

    const isGliss = variant === 'glissando';
    const P = isGliss ? PROFILES.featheredBeamGlissando : PROFILES.featheredBeamSinglePitch;
    const parts = [];
    const debugRects = [];
    const lineHalf = 0.05;

    const nhType = isGliss ? 'shortTone' : noteheadType;
    const nhBbox = LIBRARY.components.noteheads[nhType].bbox;

    // --- STAFF ---
    parts.push(generateStaffLines(P.staffWidth));

    // --- NOTES ---
    let noteBottom, highestNotePoint;

    if (isGliss) {
        const sp1 = staffPosition1, sp2 = staffPosition2;
        const note1Center = P.note1X + nhBbox.midX;
        const note2Center = P.note2X + nhBbox.midX;

        parts.push(generateNotehead(nhType, P.note1X, sp1));
        parts.push(generateNotehead(nhType, P.note2X, sp2));
        if (debug) {
            debugRects.push(debugBbox(P.note1X, sp1, nhBbox, '#0078FF', 'note1'));
            debugRects.push(debugBbox(P.note2X, sp2, nhBbox, '#0078FF', 'note2'));
        }

        const ledgers1 = generateLedgerLines(sp1, note1Center, P.ledgerLineWidth);
        if (ledgers1) parts.push(ledgers1);
        const ledgers2 = generateLedgerLines(sp2, note2Center, P.ledgerLineWidth);
        if (ledgers2) parts.push(ledgers2);

        const acc1Gen = generateAccidental(accidental1, nhType, P.note1X, sp1);
        if (acc1Gen) parts.push(acc1Gen);
        const acc2Gen = generateAccidental(accidental2, nhType, P.note2X, sp2);
        if (acc2Gen) parts.push(acc2Gen);

        // Glissando line
        const glissX1 = P.note1X + nhBbox.right + P.glissPaddingLeft;
        let note2LeftBound = P.note2X + nhBbox.left;
        if (accidental2) {
            const accV2 = LIBRARY.components.accidentals.variants[accidental2];
            note2LeftBound = P.note2X + accV2.xOffsetShortTone + accV2.bboxShortTone.left;
        }
        const glissX2 = note2LeftBound - P.glissPaddingRight;
        let glissY1 = sp1, glissY2 = sp2;
        const isSameLine = sameStaffLineCheck(sp1, sp2);
        if (isSameLine) {
            glissY1 += P.sameLineYOffset;
            glissY2 += P.sameLineYOffset;
        }
        parts.push(generateGlissandoLine(glissX1, glissY1, glissX2, glissY2));

        // Note area bounds
        let note1Bottom = sp1 + nhBbox.bottom;
        let note2Bottom = sp2 + nhBbox.bottom;
        if (accidental1) {
            const accB = LIBRARY.components.accidentals.variants[accidental1].bboxShortTone;
            note1Bottom = Math.max(note1Bottom, sp1 + accB.bottom);
        }
        if (accidental2) {
            const accB = LIBRARY.components.accidentals.variants[accidental2].bboxShortTone;
            note2Bottom = Math.max(note2Bottom, sp2 + accB.bottom);
        }
        noteBottom = Math.max(note1Bottom, note2Bottom, 2.0 + lineHalf);

        // Highest point (for feathered block placement logic)
        highestNotePoint = -2;
        if (sp1 <= -2) {
            highestNotePoint = Math.min(highestNotePoint, sp1 + nhBbox.top);
            if (accidental1) {
                const accV = LIBRARY.components.accidentals.variants[accidental1];
                highestNotePoint = Math.min(highestNotePoint, sp1 + accV.bboxShortTone.top);
            }
        }
        if (sp2 <= -2) {
            highestNotePoint = Math.min(highestNotePoint, sp2 + nhBbox.top);
            if (accidental2) {
                const accV = LIBRARY.components.accidentals.variants[accidental2];
                highestNotePoint = Math.min(highestNotePoint, sp2 + accV.bboxShortTone.top);
            }
        }
    } else {
        // Single pitch
        const sp = staffPosition;
        const noteCenter = P.noteX + nhBbox.midX;

        parts.push(generateNotehead(nhType, P.noteX, sp));
        if (debug) debugRects.push(debugBbox(P.noteX, sp, nhBbox, '#0078FF', 'notehead'));

        const ledgers = generateLedgerLines(sp, noteCenter, P.ledgerLineWidth);
        if (ledgers) parts.push(ledgers);

        const accGen = generateAccidental(accidental, nhType, P.noteX, sp);
        if (accGen) parts.push(accGen);

        noteBottom = sp + nhBbox.bottom;
        if (accidental) {
            const accVariant = LIBRARY.components.accidentals.variants[accidental];
            const accBbox = nhType === 'longTone' ? accVariant.bboxLongTone : accVariant.bboxShortTone;
            noteBottom = Math.max(noteBottom, sp + accBbox.bottom);
            if (debug) {
                const xOff = nhType === 'longTone' ? accVariant.xOffsetLongTone : accVariant.xOffsetShortTone;
                debugRects.push(debugBbox(P.noteX + xOff, sp, accBbox, '#FFA500', 'accidental'));
            }
        }
        noteBottom = Math.max(noteBottom, 2.0 + lineHalf);

        highestNotePoint = -2;
        if (sp <= -2) {
            highestNotePoint = sp + nhBbox.top;
            if (accidental) {
                const accV = LIBRARY.components.accidentals.variants[accidental];
                const accB = nhType === 'longTone' ? accV.bboxLongTone : accV.bboxShortTone;
                highestNotePoint = Math.min(highestNotePoint, sp + accB.top);
            }
        }
    }

    // --- DYNAMICS ROW (no secco, no nonVib) ---
    const dyn1Bbox = dynamic1 ? LIBRARY.components.dynamics.composites[dynamic1].bbox : null;
    const dyn2Bbox = dynamic2 ? LIBRARY.components.dynamics.composites[dynamic2].bbox : null;
    const capR = 0.05;
    const refHairpinBbox = {
        left: -capR,
        top: -(P.hairpinHeight + capR),
        right: P.hairpinLength + capR,
        bottom: P.hairpinHeight + capR,
        midY: 0
    };
    const renderHairpin = hairpin && hairpin !== 'none';

    // Always include refHairpinBbox so dynRow Y is stable across volume modes
    const rowBboxes = [dyn1Bbox, dyn2Bbox, refHairpinBbox].filter(Boolean);
    const maxAboveMidline = Math.max(...rowBboxes.map(b => b.midY - b.top));
    const maxBelowMidline = Math.max(...rowBboxes.map(b => b.bottom - b.midY));

    const dynRowMidline = noteBottom + P.rules.contentToRowGap + maxAboveMidline;

    // Dynamics row: compute X positions left-to-right
    let curX = P.dyn1LeftEdge;

    let dyn1AnchorX = 0;
    if (dyn1Bbox) {
        dyn1AnchorX = curX - dyn1Bbox.left;
        const dyn1AnchorY = dynRowMidline - dyn1Bbox.midY;
        parts.push(generateDynamic(dynamic1, dyn1AnchorX, dyn1AnchorY));
        if (debug) debugRects.push(debugBbox(dyn1AnchorX, dyn1AnchorY, dyn1Bbox, '#FF0000', 'dyn1'));
        curX = dyn1AnchorX + dyn1Bbox.right + P.rules.glyphRowGap;
    }

    let hairpinEndX = curX;
    if (renderHairpin) {
        const hairpinStartX = curX;
        const hairpinAnchorY = dynRowMidline - refHairpinBbox.midY;
        parts.push(generateHairpin(hairpin, hairpinStartX, hairpinAnchorY, P.hairpinLength, P.hairpinHeight));
        if (debug) debugRects.push(debugBbox(hairpinStartX, hairpinAnchorY, refHairpinBbox, '#00C800', 'hairpin'));
        hairpinEndX = hairpinStartX + P.hairpinLength;
        curX = hairpinEndX + P.rules.glyphRowGap;
    }

    let dyn2RightEdge = curX;
    if (dyn2Bbox) {
        const dyn2AnchorX = curX - dyn2Bbox.left;
        const dyn2AnchorY = dynRowMidline - dyn2Bbox.midY;
        parts.push(generateDynamic(dynamic2, dyn2AnchorX, dyn2AnchorY));
        if (debug) debugRects.push(debugBbox(dyn2AnchorX, dyn2AnchorY, dyn2Bbox, '#FF0000', 'dyn2'));
        dyn2RightEdge = dyn2AnchorX + dyn2Bbox.right;
    }

    // --- PITCH BLOCK BOUNDS ---
    const pitchBlockTop = Math.min(-2 - lineHalf, highestNotePoint);
    const pitchBlockBottom = dynRowMidline + maxBelowMidline;
    const pitchBlockRight = Math.max(P.staffWidth, dyn2RightEdge, hairpinEndX);

    // --- FEATHERED BEAM BLOCK ---
    // Placement: above by default; below if any note needs 1+ ledger lines above staff.
    // Ledger lines above appear at integer positions -3, -4, ... when staffPosition <= -3.
    let hasLedgersAbove;
    if (isGliss) {
        hasLedgersAbove = Math.min(staffPosition1, staffPosition2) <= -3;
    } else {
        hasLedgersAbove = staffPosition <= -3;
    }

    const placement = hasLedgersAbove ? 'below' : 'above';
    const fb = generateFeatheredBeamBlock(featheredType, pitchBlockRight);

    let fbY;
    if (placement === 'above') {
        fbY = pitchBlockTop - P.featheredBlockGap - fb.height;
    } else {
        fbY = pitchBlockBottom + P.featheredBlockGap;
    }

    parts.push(`<g transform="translate(0, ${fbY.toFixed(4)})" id="feathered-beam-block">\n${fb.svg}\n</g>`);

    if (debug) {
        const fbDebugBbox = {
            left: -fb.noteheadOverhangLeft,
            top: 0,
            right: fb.width,
            bottom: fb.height
        };
        debugRects.push(debugBbox(0, fbY, fbDebugBbox, '#FF00FF', 'feathered'));
    }

    // --- DEBUG OVERLAYS ---
    if (debug) {
        debugRects.push(
            `<line x1="-0.5" y1="${dynRowMidline.toFixed(4)}" x2="${(pitchBlockRight + 0.5).toFixed(4)}" ` +
            `y2="${dynRowMidline.toFixed(4)}" stroke="red" stroke-width="0.02" stroke-dasharray="0.1,0.1" opacity="0.6"/>`
        );
        parts.push(`<g id="debug-overlay">\n${debugRects.join('\n')}\n</g>`);
    }

    // --- VIEWBOX ---
    const fbContentTop = fbY;
    const fbContentBottom = fbY + fb.height;

    let contentTop = Math.min(pitchBlockTop, fbContentTop);
    let contentBottom = Math.max(pitchBlockBottom, fbContentBottom);
    const contentLeft = Math.min(0, -fb.noteheadOverhangLeft);
    const contentRight = pitchBlockRight;

    // Expand for ledger lines that extend beyond note area
    if (isGliss) {
        if (staffPosition1 <= -3) contentTop = Math.min(contentTop, staffPosition1 - 1 - lineHalf);
        if (staffPosition2 <= -3) contentTop = Math.min(contentTop, staffPosition2 - 1 - lineHalf);
        if (staffPosition1 >= 3) contentBottom = Math.max(contentBottom, staffPosition1 + 1 + lineHalf);
        if (staffPosition2 >= 3) contentBottom = Math.max(contentBottom, staffPosition2 + 1 + lineHalf);
    } else {
        if (staffPosition <= -3) contentTop = Math.min(contentTop, staffPosition - 1 - lineHalf);
        if (staffPosition >= 3) contentBottom = Math.max(contentBottom, staffPosition + 1 + lineHalf);
    }

    const padding = P.rules.viewBoxPadding;
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

    const svg = wrapSvg(parts.filter(Boolean).join('\n'), viewBox, dimensions);

    // Metadata
    let noteheadCenterX_mm;
    if (isGliss) {
        noteheadCenterX_mm = (P.note1X + nhBbox.midX - viewBox.x) * mmPerStaffSpace;
    } else {
        noteheadCenterX_mm = (P.noteX + nhBbox.midX - viewBox.x) * mmPerStaffSpace;
    }
    const staffHeight_mm = 4 * mmPerStaffSpace;

    const metadata = {
        noteheadCenterX_mm,
        staffHeight_mm,
        width_mm: dimensions.width,
        height_mm: dimensions.height,
        featheredType,
        placement,
        variant,
        positioning: P.positioning
    };
    if (isGliss) {
        metadata.startNoteheadCenterX_mm = noteheadCenterX_mm;
    }

    return { svg, metadata };
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
                  file: 'test-assembled-4ledger-down.svg' },
                // Steady mode: only dyn1, no hairpin, no dyn2 (compare dyn1 Y with p-f test)
                { params: { staffPosition: 3, accidental: 'sharp', noteheadType: 'longTone',
                    dynamic1: 'p', dynamic2: null, hairpin: 'none', secco: true, nonVib: true, debug: dbg },
                  file: 'test-assembled-steady.svg' },
                // No secco (compare layout with p-f test)
                { params: { staffPosition: 3, accidental: 'sharp', noteheadType: 'longTone',
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', secco: false, nonVib: true, debug: dbg },
                  file: 'test-assembled-no-secco.svg' }
            ];
            for (const t of tests) {
                const result = assembleSustainedTone(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (noteheadCenterX: ${result.metadata.noteheadCenterX_mm.toFixed(2)}mm)`);
            }
            return;
        }
        case 'glissando': {
            const dbg = true;
            const glissTests = [
                // 1. Normal gliss up: E4→G4 (treble), one staff line apart
                { params: { staffPosition1: 2, staffPosition2: 1, accidental1: null, accidental2: null,
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-up.svg' },
                // 2. Wide gliss down: D5→G4 (treble), two staff lines apart
                { params: { staffPosition1: -1, staffPosition2: 1, accidental1: 'sharp', accidental2: 'flat',
                    dynamic1: 'pp', dynamic2: 'ff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-down.svg' },
                // 3. Same staff line: G4→G#4 (treble, both on G4 line = position 1)
                { params: { staffPosition1: 1, staffPosition2: 1, accidental1: null, accidental2: 'sharp',
                    dynamic1: 'ppp', dynamic2: 'fff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-same-line.svg' },
                // 4. Same staff line middle: B4→Bb4 (treble, both on middle line = position 0)
                { params: { staffPosition1: 0, staffPosition2: 0, accidental1: null, accidental2: 'flat',
                    dynamic1: 'mp', dynamic2: 'mf', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-same-mid.svg' },
                // 5. Low with ledger lines: C4→E4 (treble), note1 on 1 ledger below, note2 on staff
                { params: { staffPosition1: 3, staffPosition2: 2, accidental1: 'sharp', accidental2: null,
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-low-ledger.svg' },
                // 6. High with ledger lines: A5→C6 (treble), both above staff
                { params: { staffPosition1: -3, staffPosition2: -4, accidental1: null, accidental2: 'sharp',
                    dynamic1: 'pp', dynamic2: 'ff', hairpin: '<', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-high-ledger.svg' },
                // 7. Steady mode: only dyn1, no hairpin, no dyn2 (compare dyn1 Y with test 1)
                { params: { staffPosition1: 2, staffPosition2: 1, accidental1: null, accidental2: null,
                    dynamic1: 'p', dynamic2: null, hairpin: 'none', secco: true, nonVib: true, debug: dbg },
                  file: 'test-gliss-steady.svg' },
                // 8. No secco (compare layout with test 1)
                { params: { staffPosition1: 2, staffPosition2: 1, accidental1: null, accidental2: null,
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', secco: false, nonVib: true, debug: dbg },
                  file: 'test-gliss-no-secco.svg' }
            ];
            for (const t of glissTests) {
                const result = assembleSustainedToneGlissando(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (startNoteheadCenterX: ${result.metadata.startNoteheadCenterX_mm.toFixed(2)}mm, sameLine: ${result.metadata.sameStaffLine})`);
            }
            return;
        }
        case 'bartok-pizz': {
            const dbg = true;
            const bpTests = [
                // Staff mode tests
                // 1. On staff, stem down, B4 (middle line), fff
                { params: { staffPosition: 0, accidental: null, dynamic: 'fff', showStaff: true, debug: dbg },
                  file: 'test-bp-staff-B4-fff.svg' },
                // 2. Stem down with sharp, D5
                { params: { staffPosition: -0.5, accidental: 'sharp', dynamic: 'fff', showStaff: true, debug: dbg },
                  file: 'test-bp-staff-Ds5-fff.svg' },
                // 3. Stem up, C4 (1 ledger below)
                { params: { staffPosition: 3, accidental: null, dynamic: 'ff', showStaff: true, debug: dbg },
                  file: 'test-bp-staff-C4-ff.svg' },
                // 4. No-staff mode, fff
                { params: { staffPosition: 0, accidental: null, dynamic: 'fff', showStaff: false, debug: dbg },
                  file: 'test-bp-nostaff-fff.svg' },
                // 5. No-staff mode, p
                { params: { staffPosition: 0, accidental: null, dynamic: 'p', showStaff: false, debug: dbg },
                  file: 'test-bp-nostaff-p.svg' }
            ];
            for (const t of bpTests) {
                const result = assembleBartokPizzicato(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (mode: ${result.metadata.mode}, noteheadCenterX: ${result.metadata.noteheadCenterX_mm.toFixed(2)}mm)`);
            }
            return;
        }
        case 'bow-overpressure': {
            const dbg = true;
            const bopTests = [
                // 1. On staff, stem down (B4 = position 0, treble middle line)
                { params: { staffPosition: 0, accidental: null, debug: dbg },
                  file: 'test-bop-on-staff-B4.svg' },
                // 2. On staff, stem down with sharp (F#5 = position -1.5)
                { params: { staffPosition: -1.5, accidental: 'sharp', debug: dbg },
                  file: 'test-bop-above-Fs5.svg' },
                // 3. On staff, stem up (C4 = position 3 in treble, 1 ledger below)
                { params: { staffPosition: 3, accidental: null, debug: dbg },
                  file: 'test-bop-ledger-below-C4.svg' },
                // 4. High above staff, stem down (G5 = position -2.5, above top line)
                { params: { staffPosition: -2.5, accidental: null, debug: dbg },
                  file: 'test-bop-high-G5.svg' },
                // 5. Low below staff, stem up (A3 = position 5.5 in treble, 3 ledger lines below)
                { params: { staffPosition: 5.5, accidental: 'flat', debug: dbg },
                  file: 'test-bop-low-Ab3.svg' },
                // 6. Quarter sharp accidental, stem down
                { params: { staffPosition: 1, accidental: 'quarterSharp', debug: dbg },
                  file: 'test-bop-quarter-sharp.svg' },
                // 7. Three quarter flat, stem up (below staff)
                { params: { staffPosition: 4, accidental: 'threeQuarterFlat', debug: dbg },
                  file: 'test-bop-3qtr-flat.svg' },
                // 8. Extreme ledger lines above (4 ledger lines)
                { params: { staffPosition: -6, accidental: 'sharp', debug: dbg },
                  file: 'test-bop-4ledger-up.svg' },
                // 9. No-staff mode
                { params: { staffPosition: 0, accidental: null, showStaff: false, debug: dbg },
                  file: 'test-bop-nostaff.svg' }
            ];
            for (const t of bopTests) {
                const result = assembleBowOverpressureAccent(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (mode: ${result.metadata.mode || 'staff'}, noteheadCenterX: ${result.metadata.noteheadCenterX_mm.toFixed(2)}mm)`);
            }
            return;
        }
        case 'clb': {
            const dbg = true;
            const clbTests = [
                // Staff mode tests
                // 1. On staff, stem down, middle line (B4 in treble)
                { params: { staffPosition: 0, accidental: null, dynamic: 'p', showStaff: true, debug: dbg },
                  file: 'test-clb-staff-B4.svg' },
                // 2. Above staff, stem down with sharp
                { params: { staffPosition: -1.5, accidental: 'sharp', dynamic: 'pp', showStaff: true, debug: dbg },
                  file: 'test-clb-staff-Fs5.svg' },
                // 3. Below staff, stem up, 1 ledger line
                { params: { staffPosition: 3, accidental: null, dynamic: 'f', showStaff: true, debug: dbg },
                  file: 'test-clb-staff-C4.svg' },
                // 4. High above staff with flat
                { params: { staffPosition: -4, accidental: 'flat', dynamic: 'p', showStaff: true, debug: dbg },
                  file: 'test-clb-staff-high-Bb5.svg' },
                // 5. Low below staff with quarter sharp
                { params: { staffPosition: 5, accidental: 'quarterSharp', dynamic: 'ff', showStaff: true, debug: dbg },
                  file: 'test-clb-staff-low-qsharp.svg' },
                // No-staff mode tests
                // 6. No staff, p dynamic
                { params: { staffPosition: 0, accidental: null, dynamic: 'p', showStaff: false, debug: dbg },
                  file: 'test-clb-nostaff-p.svg' },
                // 7. No staff, ff dynamic
                { params: { staffPosition: 0, accidental: null, dynamic: 'ff', showStaff: false, debug: dbg },
                  file: 'test-clb-nostaff-ff.svg' }
            ];
            for (const t of clbTests) {
                const result = assembleColLegnoBattutoJete(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (mode: ${result.metadata.mode}, noteheadCenterX: ${result.metadata.noteheadCenterX_mm.toFixed(2)}mm)`);
            }
            return;
        }
        case 'feathered-beam': {
            const dbg = true;
            const fbTests = [
                // 1. Single pitch, on staff, accel, above, 2 dynamics, cresc
                { params: { variant: 'singlePitch', staffPosition: 1, accidental: null, noteheadType: 'longTone',
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', featheredType: 'accel', debug: dbg },
                  file: 'test-fb-single-accel-above.svg' },
                // 2. Single pitch, on staff, decel, above, 2 dynamics, decresc
                { params: { variant: 'singlePitch', staffPosition: 1, accidental: null, noteheadType: 'longTone',
                    dynamic1: 'f', dynamic2: 'p', hairpin: '>', featheredType: 'decel', debug: dbg },
                  file: 'test-fb-single-decel-above.svg' },
                // 3. Single pitch, ledger above (sp=-3), accel, BELOW, 2 dynamics
                { params: { variant: 'singlePitch', staffPosition: -3, accidental: 'sharp', noteheadType: 'longTone',
                    dynamic1: 'pp', dynamic2: 'ff', hairpin: '<', featheredType: 'accel', debug: dbg },
                  file: 'test-fb-single-accel-below-ledger.svg' },
                // 4. Single pitch, on staff, accel, above, 1 dynamic (steady)
                { params: { variant: 'singlePitch', staffPosition: 0, accidental: null, noteheadType: 'longTone',
                    dynamic1: 'mp', dynamic2: null, hairpin: 'none', featheredType: 'accel', debug: dbg },
                  file: 'test-fb-single-accel-steady.svg' },
                // 5. Single pitch, below staff (ledger below), decel, above, 2 dynamics
                { params: { variant: 'singlePitch', staffPosition: 4, accidental: 'flat', noteheadType: 'longTone',
                    dynamic1: 'pp', dynamic2: 'mf', hairpin: '<', featheredType: 'decel', debug: dbg },
                  file: 'test-fb-single-decel-ledger-below.svg' },
                // 6. Single pitch, high above (2 ledger lines), decel, BELOW, 1 dynamic
                { params: { variant: 'singlePitch', staffPosition: -4, accidental: null, noteheadType: 'longTone',
                    dynamic1: 'p', dynamic2: null, hairpin: 'none', featheredType: 'decel', debug: dbg },
                  file: 'test-fb-single-decel-below-2ledger.svg' },
                // 7. Glissando, on staff, accel, above, 2 dynamics, cresc
                { params: { variant: 'glissando', staffPosition1: 2, staffPosition2: 1,
                    accidental1: null, accidental2: null,
                    dynamic1: 'p', dynamic2: 'f', hairpin: '<', featheredType: 'accel', debug: dbg },
                  file: 'test-fb-gliss-accel-above.svg' },
                // 8. Glissando, on staff, decel, above, 2 dynamics, decresc
                { params: { variant: 'glissando', staffPosition1: 1, staffPosition2: -1,
                    accidental1: null, accidental2: 'sharp',
                    dynamic1: 'mf', dynamic2: 'pp', hairpin: '>', featheredType: 'decel', debug: dbg },
                  file: 'test-fb-gliss-decel-above.svg' },
                // 9. Glissando, one note with ledger above, accel, BELOW
                { params: { variant: 'glissando', staffPosition1: -3, staffPosition2: -1,
                    accidental1: 'flat', accidental2: null,
                    dynamic1: 'pp', dynamic2: 'f', hairpin: '<', featheredType: 'accel', debug: dbg },
                  file: 'test-fb-gliss-accel-below-ledger.svg' },
                // 10. Glissando, both on staff, decel, above, hairpin decresc
                { params: { variant: 'glissando', staffPosition1: 0, staffPosition2: 2,
                    accidental1: null, accidental2: null,
                    dynamic1: 'ff', dynamic2: 'p', hairpin: '>', featheredType: 'decel', debug: dbg },
                  file: 'test-fb-gliss-decel-above-decresc.svg' }
            ];
            for (const t of fbTests) {
                const result = assembleFeatheredBeam(t.params);
                const p = path.join(outputDir, t.file);
                fs.writeFileSync(p, result.svg);
                console.log(`Written: ${p} (${result.metadata.variant}, ${result.metadata.featheredType}, ${result.metadata.placement})`);
            }
            return;
        }
        default:
            console.log('Usage: node assemble_svg.js [staff|ledger|assemble|glissando|bartok-pizz|bow-overpressure|clb|feathered-beam]');
            process.exit(1);
    }
    
    const outputPath = path.join(outputDir, filename);
    fs.writeFileSync(outputPath, svg);
    console.log(`Written: ${outputPath}`);
    console.log(`Open in browser to compare with LilyPond output.`);
}

// ============================================
// PITCH MAPPING UTILITIES (for server pipeline)
// ============================================
//
// Convert user-format pitch strings (e.g., "C#4", "Bb3", "C+4") to assembly
// engine parameters (staffPosition, accidental).
//
// User pitch format: NoteAccidentalOctave
//   Note: A-G (case insensitive)
//   Accidental: # (sharp), b (flat), + (quarter sharp), d (quarter flat),
//               #+ (three-quarter sharp), bd (three-quarter flat), or empty (natural)
//   Octave: integer (e.g., 3, 4, 5)
//
// Clef: "treble", "alto", "bass"

const CLEF_MIDDLE_LINE = {
    // Diatonic position (octave * 7 + noteIndex) of the note on the middle staff line
    treble: 4 * 7 + 6,  // B4 = 34
    alto:   4 * 7 + 0,  // C4 = 28
    bass:   3 * 7 + 1   // D3 = 22
};

const NOTE_INDEX = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };

const ACCIDENTAL_MAP = {
    '#':  'sharp',
    'b':  'flat',
    '+':  'quarterSharp',
    'd':  'quarterFlat',
    '#+': 'threeQuarterSharp',
    'bd': 'threeQuarterFlat',
    '':   null
};

/**
 * Parse a user-format pitch string into its components.
 * @param {string} pitch - e.g., "C#4", "Bb3", "C+4", "Cbd4", "C#+5"
 * @returns {{ note: string, accidental: string, octave: number } | null}
 */
function parsePitch(pitch) {
    if (!pitch) return null;
    const match = pitch.match(/^([A-Ga-g])([#b+d]*)?(\d)$/);
    if (!match) return null;
    return {
        note: match[1].toLowerCase(),
        accidental: match[2] || '',
        octave: parseInt(match[3])
    };
}

/**
 * Convert a user-format pitch + clef to a staff position for the assembly engine.
 * Staff position 0 = middle line, negative = above, positive = below.
 * Each diatonic step = 0.5 staff-spaces.
 * 
 * @param {string} pitch - e.g., "C#4", "Bb3"
 * @param {string} clef - "treble", "alto", or "bass"
 * @returns {number} Staff position in staff-spaces
 */
function pitchToStaffPosition(pitch, clef) {
    const parsed = parsePitch(pitch);
    if (!parsed) return 0;
    const diatonicPos = parsed.octave * 7 + NOTE_INDEX[parsed.note];
    const middleLine = CLEF_MIDDLE_LINE[clef] || CLEF_MIDDLE_LINE.treble;
    return (middleLine - diatonicPos) * 0.5;
}

/**
 * Extract the accidental library name from a user-format pitch string.
 * @param {string} pitch - e.g., "C#4", "Bb3", "C+4"
 * @returns {string|null} Library accidental name, or null for natural
 */
function pitchToAccidental(pitch) {
    const parsed = parsePitch(pitch);
    if (!parsed) return null;
    return ACCIDENTAL_MAP[parsed.accidental] ?? null;
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
    generateGlissandoLine,
    isOnStaffLine,
    sameStaffLineCheck,
    generateSquareNotehead,
    generateStem,
    generateDownbow,
    generateMarcato,
    generateSfz,
    generateFlag,
    assembleSustainedTone,
    assembleSustainedToneGlissando,
    assembleBartokPizzicato,
    assembleBowOverpressureAccent,
    assembleColLegnoBattutoJete,
    generateFeatheredBeamBlock,
    assembleFeatheredBeam,
    generateSnapPizzicato,
    generateCrossNotehead,
    generateMarcatoUp,
    wrapSvg,
    LAYOUT,
    LAYOUT_RULES,
    PROFILES,
    createProfile,
    pitchToStaffPosition,
    pitchToAccidental,
    parsePitch,
    generateStaffLineTest,
    generateLedgerLineTest
};
