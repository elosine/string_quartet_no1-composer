// Pizzicato Tremolo Pipeline — Full automation from inputs to output files.
//
// Single mode:
//   node render_pizz_tremolo.js --pitch "ftqs" --dynamic fff --clef treble --track 1 --shape cres --duration 3
//
// Batch mode:
//   node render_pizz_tremolo.js --batch inputs.json
//
// inputs.json format:
//   [
//     { "pitch": "ftqs", "dynamic": "fff", "clef": "treble", "track": 1, "shape": "cres", "duration": 3 },
//     { "pitch": "ctqs'", "dynamic": "ff", "clef": "treble", "track": 2, "shape": "hp", "duration": 4 }
//   ]
//
// Outputs per input (in public/SVG_graphics/pizz_tremolo/):
//   PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].svg  (cropped)
//   PizzTrem-[clef]-[PitchName]-[dynamic]-[shape].mid  (tremolo MIDI, CC0=95)
//
// Also saves .ly file in lilypond_code/ for reference.
//
// See docs/PIZZICATO_TREMOLO_WORKFLOW.md for full documentation.
// See docs/LILYPOND_SETTINGS_REGISTRY.md §28 (pitch syntax) and §30 (Z-stem settings).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LILYPOND_DIR = __dirname;
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'SVG_graphics', 'pizz_tremolo');

// ── Pitch parsing (see Registry §28 for suffix reference) ────────────
const LETTER_DIATONIC = { c: 0, d: 1, e: 2, f: 3, g: 4, a: 5, b: 6 };
const ACCIDENTAL_SUFFIXES = ['tqs', 'tqf', 'ss', 'ff', 'qs', 'qf', 's', 'f']; // longest first
const MICROTONAL = new Set(['qs', 'qf', 'tqs', 'tqf']);

function parsePitch(pitchStr) {
    const letter = pitchStr[0].toLowerCase();
    if (!LETTER_DIATONIC.hasOwnProperty(letter)) {
        throw new Error(`Invalid pitch letter: "${letter}" in "${pitchStr}"`);
    }
    let rest = pitchStr.slice(1);

    // Extract accidental (longest match first)
    let accidental = '';
    for (const acc of ACCIDENTAL_SUFFIXES) {
        if (rest.startsWith(acc)) {
            accidental = acc;
            rest = rest.slice(acc.length);
            break;
        }
    }

    // Count octave marks — no marks = octave 3
    let octave = 3;
    for (const ch of rest) {
        if (ch === "'") octave++;
        else if (ch === ",") octave--;
    }

    const diatonic = (octave - 3) * 7 + LETTER_DIATONIC[letter];
    const isMicrotonal = MICROTONAL.has(accidental);
    const hasAccidental = accidental.length > 0;
    const displayName = letter.toUpperCase() + accidental.toUpperCase() + octave;

    return { letter, accidental, octave, diatonic, isMicrotonal, hasAccidental, displayName, raw: pitchStr };
}

// ── Ledger line calculation ──────────────────────────────────────────
const CLEF_LINES = {
    treble: [9, 11, 13, 15, 17],  // E4 G4 B4 D5 F5
    alto:   [3, 5, 7, 9, 11],     // F3 A3 C4 E4 G4
    bass:   [-3, -1, 1, 3, 5]     // G2 B2 D3 F3 A3
};

function getLedgerLines(diatonic, clef) {
    const lines = CLEF_LINES[clef];
    const bottom = lines[0];
    const top = lines[4];
    if (diatonic >= bottom - 1 && diatonic <= top + 1) return 0;
    if (diatonic < bottom - 1) return Math.ceil((bottom - 1 - diatonic) / 2);
    return Math.ceil((diatonic - top - 1) / 2);
}

// ── Paper dimensions (shape-dependent) ───────────────────────────────
function getPaperDims(ledgerLines, isMicrotonal, shape) {
    // Base widths derived from user-tuned templates
    let baseWidth;
    let lineWidth;
    if (shape === 'hp') {
        baseWidth = 27;  // hp has two hairpins, needs more width
        lineWidth = 45;
    } else {
        baseWidth = 20;  // cres/decres
        lineWidth = 31;
    }
    // Add width for ledger lines / microtonal accidentals
    let w = baseWidth;
    if (ledgerLines > 0 || isMicrotonal) w += 2;
    if (ledgerLines >= 3) w += 2;

    return { w, h: 50, lineWidth };
}

// ── LilyPond template generation ─────────────────────────────────────
function generateNotation(pitch, dynamic, shape) {
    // Pitch with quarter note duration
    const pitchNote = `${pitch}4`;

    if (shape === 'cres') {
        return `    ${pitchNote}

    % pizz. text
    -\\tweak extra-offset #'(0 . 0)
    ^\\markup {
      \\override #'(font-name . "Crimson Pro Light Italic")
      \\fontsize #-6
      "pizz."
    }

    % Dynamic
    -\\tweak extra-offset #'(-0.7 . -0.1)
    \\${dynamic}

    % Crescendo hairpin
    -\\tweak extra-offset #'(-1.3 . -0.1)
    -\\tweak shorten-pair #'(0 . 4)
    \\<

    % Spacer to end hairpin
    s4\\!`;
    }

    if (shape === 'decres') {
        return `    ${pitchNote}

    % pizz. text
    -\\tweak extra-offset #'(0 . 0)
    ^\\markup {
      \\override #'(font-name . "Crimson Pro Light Italic")
      \\fontsize #-6
      "pizz."
    }

    % Dynamic
    -\\tweak extra-offset #'(-0.7 . -0.1)
    \\${dynamic}

    % Decrescendo hairpin
    -\\tweak extra-offset #'(-1.3 . -0.1)
    -\\tweak shorten-pair #'(0 . 4)
    \\>

    % Spacer to end hairpin
    s4\\!`;
    }

    // hp (both: cres then decres)
    return `    ${pitchNote}

    % pizz. text
    -\\tweak extra-offset #'(0 . 0)
    ^\\markup {
      \\override #'(font-name . "Crimson Pro Light Italic")
      \\fontsize #-6
      "pizz."
    }

    % Dynamic
    -\\tweak extra-offset #'(-0.7 . -0.1)
    \\${dynamic}

    % Crescendo hairpin (first half)
    -\\tweak extra-offset #'(-1.3 . -0.1)
    -\\tweak shorten-pair #'(0 . 4)
    \\<

    % Midpoint — end crescendo, start decrescendo
    s4\\!

    -\\tweak extra-offset #'(-5.5 . -0.1)
    -\\tweak shorten-pair #'(0 . 5.3)
    \\>

    % Spacer to end decrescendo
    s4\\!`;
}

function generateLy(pitch, dynamic, clef, shape, paperW, paperH, lineWidth) {
    const timeSignature = shape === 'hp' ? '3/4' : '2/4';
    const notation = generateNotation(pitch, dynamic, shape);

    return `\\version "2.20.0"
\\language "english"

% \\u2554\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2557
% \\u2551  Pizzicato Tremolo — Generated by render_pizz_tremolo.js              \\u2551
% \\u255a\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u255d


% =====================================================================
% PAPER
% =====================================================================
\\paper {
  tagline = ##f
  paper-width = ${paperW}\\mm
  paper-height = ${paperH}\\mm
  top-margin = 0\\mm
  bottom-margin = 0\\mm
  left-margin = 1\\mm
  right-margin = 0\\mm
}


% =====================================================================
% SCHEME FUNCTIONS
% =====================================================================

% =====================================================================
% Z-STEM CALLIGRAPHIC BARS
% =====================================================================
#(define z-bar-width 1.1)
#(define z-bar-height 0.4)
#(define z-y-offset 0.85)
#(define z-bar-vpos 1.4)
#(define z-nib-ratio 0.6)
#(define z-diag-thick 0.09)
#(define z-diag-nudge 0.06)

#(define (stem-with-z grob)
   (let* ((orig (ly:stem::print grob))
          (yex (ly:stencil-extent orig Y))
          (ymid (/ (+ (car yex) (cdr yex)) 2))
          (W z-bar-width)
          (H z-bar-height)
          (h z-bar-vpos)
          (yo z-y-offset)
          (s (* H z-nib-ratio))
          (half (/ W 2))
          (s2 (/ s 2))
          (dt z-diag-thick)
          (dn (- z-diag-nudge))
          (top-y (+ (- h) yo))
          (bot-y (+ h yo))
          (bars-stencil
            (make-path-stencil
              \`(moveto ,(- s2 half) ,(+ top-y H)
                lineto ,(- (+ half s2)) ,top-y
                lineto ,(- half s2) ,top-y
                lineto ,(+ half s2) ,(+ top-y H)
                closepath
                moveto ,(- (+ half s2)) ,(- bot-y H)
                lineto ,(- s2 half) ,bot-y
                lineto ,(+ half s2) ,bot-y
                lineto ,(- half s2) ,(- bot-y H)
                closepath)
              0.01 1 1 #t))
          (diag-stencil
            (make-path-stencil
              \`(moveto ,(- (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (- (+ half s2 dn)) (/ dt 2)) ,top-y
                lineto ,(+ (+ half s2 dn) (/ dt 2)) ,bot-y
                lineto ,(- (+ half s2 dn) (/ dt 2)) ,bot-y
                closepath)
              0.01 1 1 #t)))
     (ly:stencil-add orig
       (ly:stencil-translate-axis diag-stencil ymid Y)
       (ly:stencil-translate-axis bars-stencil ymid Y))))

% =====================================================================
% CUSTOM STAFF LINES (Scheme)
% =====================================================================
#(define staff-line-width-mm 1.2)

#(define custom-staff-lines
   (lambda (grob)
     (let* ((staff-space (ly:staff-symbol-staff-space grob))
            (line-count (ly:grob-property grob 'line-count 5))
            (thickness (ly:grob-property grob 'thickness 1))
            (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
            (width staff-line-width-mm)
            (width-staff-spaces (/ (* width 3.1) staff-space))
            (half-height (* (/ (- line-count 1) 2) staff-space)))
       (apply ly:stencil-add
              (map (lambda (i)
                     (ly:make-stencil
                      (list 'draw-line line-thickness
                            0 (* i staff-space)
                            width-staff-spaces (* i staff-space))
                      (cons 0 width-staff-spaces)
                      (cons (- half-height) half-height)))
                   (iota line-count (- (/ (- line-count 1) 2))))))))


% =====================================================================
% SCORE
% =====================================================================
\\score {
  \\new Staff \\with {
    \\omit TimeSignature
    \\omit BarLine
    \\clef ${clef}
    \\omit Clef
    \\omit KeySignature
    \\override StaffSymbol.thickness = #1
    \\override StaffSymbol.stencil = #custom-staff-lines
  }
  {
    \\time ${timeSignature}

    % --- Noteheads ---
    \\override NoteHead.font-size = #-3.3

    % --- Accidentals ---
    \\override Accidental.font-size = #-4

    % --- Dynamics ---
    \\override DynamicText.font-size = #-8.5
    \\override DynamicLineSpanner.staff-padding = #1.2

    % --- Stems: visible, with Z overlay ---
    \\override Stem.transparent = ##f
    \\override Stem.direction = #UP
    \\override Stem.details.beamed-lengths = #'(5.5)
    \\override Stem.details.lengths = #'(6.2)
    \\override Stem.stencil = #stem-with-z

    % --- Hairpin ---
    \\override Hairpin.height = #0.4

    % --- Notation ---
    \\once \\override NoteColumn.X-offset = #-0.8

${notation}

  }
  \\layout {
    \\context {
      \\Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = 0
    line-width = ${lineWidth}\\mm
  }
  \\midi {}
}
`;
}

// ── Process one input ────────────────────────────────────────────────
function processOne(input, index, total) {
    const { pitch, dynamic, clef, track, shape, duration } = input;
    const prefix = total > 1 ? `[${index + 1}/${total}] ` : '';

    // Validate required fields
    if (!pitch || !dynamic || !clef || !track || !shape || !duration) {
        console.error(`${prefix}Error: missing required field (pitch, dynamic, clef, track, shape, duration)`);
        return false;
    }
    if (!CLEF_LINES[clef]) {
        console.error(`${prefix}Error: invalid clef "${clef}" — use treble, alto, or bass`);
        return false;
    }
    const trackNum = parseInt(track, 10);
    if (isNaN(trackNum) || trackNum < 1 || trackNum > 4) {
        console.error(`${prefix}Error: track must be 1-4, got "${track}"`);
        return false;
    }
    if (!['cres', 'decres', 'hp'].includes(shape)) {
        console.error(`${prefix}Error: shape must be cres|decres|hp, got "${shape}"`);
        return false;
    }
    const durationSec = parseFloat(duration);
    if (isNaN(durationSec) || durationSec <= 0) {
        console.error(`${prefix}Error: duration must be > 0, got "${duration}"`);
        return false;
    }

    // Parse pitch
    const p = parsePitch(pitch);
    const ledger = getLedgerLines(p.diatonic, clef);
    const paper = getPaperDims(ledger, p.isMicrotonal, shape);
    const baseName = `PizzTrem-${clef}-${p.displayName}-${dynamic}-${shape}`;

    console.log(`${prefix}${baseName}`);
    console.log(`  Pitch: ${pitch} → ${p.displayName} (diatonic ${p.diatonic}, ${ledger} ledger lines)`);
    console.log(`  Paper: ${paper.w}×${paper.h}mm | line-width: ${paper.lineWidth}mm`);
    console.log(`  Track ${trackNum} | Shape: ${shape} | Duration: ${durationSec}s`);

    // Step 2-3: Generate and save .ly
    const lyContent = generateLy(pitch, dynamic, clef, shape, paper.w, paper.h, paper.lineWidth);
    const lyPath = path.join(LILYPOND_DIR, `${baseName}.ly`);
    fs.writeFileSync(lyPath, lyContent);
    console.log(`  .ly saved: ${baseName}.ly`);

    // Step 4: Render with LilyPond
    const lyOutput = path.join(LILYPOND_DIR, baseName);
    try {
        execSync(`lilypond --svg -dbackend=svg -o "${lyOutput}" "${lyPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 30000
        });
    } catch (e) {
        console.error(`  Error: LilyPond render failed — ${e.message}`);
        return false;
    }

    // Find SVG (may be baseName.svg or baseName-1.svg)
    let svgPath = path.join(LILYPOND_DIR, `${baseName}.svg`);
    if (!fs.existsSync(svgPath)) {
        svgPath = path.join(LILYPOND_DIR, `${baseName}-1.svg`);
    }
    if (!fs.existsSync(svgPath)) {
        console.error(`  Error: SVG not found after render`);
        return false;
    }
    console.log(`  Rendered: SVG`);

    // Step 5: Crop SVG
    try {
        execSync(`node "${path.join(LILYPOND_DIR, 'crop_svg.js')}" "${svgPath}"`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000
        });
    } catch (e) {
        console.error(`  Error: SVG crop failed — ${e.message}`);
        return false;
    }
    console.log(`  Cropped SVG`);

    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Step 6: Move cropped SVG to output
    const outputSvg = path.join(OUTPUT_DIR, `${baseName}.svg`);
    fs.copyFileSync(svgPath, outputSvg);
    console.log(`  SVG → ${path.relative(PROJECT_ROOT, outputSvg)}`);

    // Step 7: Generate tremolo MIDI via generate_pizz_tremolo_midi.js
    const outputMid = path.join(OUTPUT_DIR, `${baseName}.mid`);
    try {
        const midiCmd = `node "${path.join(LILYPOND_DIR, 'generate_pizz_tremolo_midi.js')}" --pitch "${pitch}" --dynamic ${dynamic} --track ${trackNum} --shape ${shape} --duration ${durationSec} --output "${outputMid}"`;
        execSync(midiCmd, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
        });
    } catch (e) {
        console.error(`  Error: MIDI generation failed — ${e.message}`);
        return false;
    }
    console.log(`  MIDI → ${path.relative(PROJECT_ROOT, outputMid)} (CC0=95, ch ${trackNum + 7})`);

    // Also copy MIDI to public/midi_files/ for DAW inspection
    const MIDI_DIR = path.join(PROJECT_ROOT, 'public', 'midi_files');
    if (!fs.existsSync(MIDI_DIR)) {
        fs.mkdirSync(MIDI_DIR, { recursive: true });
    }
    const midiCopy = path.join(MIDI_DIR, `${baseName}.mid`);
    fs.copyFileSync(outputMid, midiCopy);
    console.log(`  MIDI copy → ${path.relative(PROJECT_ROOT, midiCopy)}`);

    // Clean up intermediate files in lilypond_code/
    try { fs.unlinkSync(svgPath); } catch (e) {}
    // Clean up LilyPond-generated MIDI (we use our own generator)
    const lyMidPath = path.join(LILYPOND_DIR, `${baseName}.mid`);
    if (fs.existsSync(lyMidPath) && lyMidPath !== outputMid) {
        try { fs.unlinkSync(lyMidPath); } catch (e) {}
    }
    const lyMidiPath = path.join(LILYPOND_DIR, `${baseName}.midi`);
    try { fs.unlinkSync(lyMidiPath); } catch (e) {}

    console.log(`  ✓ Done`);
    return true;
}

// ── Main ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`Pizzicato Tremolo Pipeline
Usage:
  Single:  node render_pizz_tremolo.js --pitch "ftqs" --dynamic fff --clef treble --track 1 --shape cres --duration 3
  Batch:   node render_pizz_tremolo.js --batch inputs.json

Outputs to: public/SVG_graphics/pizz_tremolo/
  [name].svg  — cropped notation (Z-stem + hairpin)
  [name].mid  — tremolo MIDI (CC0=95, sampled timing, CC7 ramp)

Naming: PizzTrem-[clef]-[PitchName]-[dynamic]-[shape]
Shapes: cres (crescendo), decres (decrescendo), hp (both)

See docs/PIZZICATO_TREMOLO_WORKFLOW.md for details.`);
    process.exit(0);
}

let inputs = [];

if (args[0] === '--batch') {
    if (!args[1]) {
        console.error('Error: --batch requires a JSON file path');
        process.exit(1);
    }
    const batchPath = path.resolve(args[1]);
    if (!fs.existsSync(batchPath)) {
        console.error(`Error: batch file not found: ${batchPath}`);
        process.exit(1);
    }
    inputs = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
    if (!Array.isArray(inputs)) {
        console.error('Error: batch file must contain a JSON array');
        process.exit(1);
    }
} else {
    // Parse single-mode args
    const single = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        single[key] = args[i + 1];
    }
    inputs = [single];
}

console.log(`\nPizzicato Tremolo Pipeline — ${inputs.length} input(s)\n`);

let success = 0;
for (let i = 0; i < inputs.length; i++) {
    if (processOne(inputs[i], i, inputs.length)) success++;
    if (inputs.length > 1) console.log('');
}

console.log(`\nComplete: ${success}/${inputs.length} succeeded`);
if (success < inputs.length) process.exit(1);
