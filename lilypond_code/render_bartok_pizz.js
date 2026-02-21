// Bartók Pizzicato Pipeline — Full automation from inputs to output files.
//
// Single mode:
//   node render_bartok_pizz.js --pitch "b'" --dynamic fff --clef treble --track 1
//
// Batch mode:
//   node render_bartok_pizz.js --batch inputs.json
//
// inputs.json format:
//   [
//     { "pitch": "b'", "dynamic": "fff", "clef": "treble", "track": 1 },
//     { "pitch": "ftqs'''", "dynamic": "fff", "clef": "treble", "track": 2 },
//     { "pitch": "eqf", "dynamic": "ff", "clef": "alto", "track": 3 }
//   ]
//
// Outputs per input (in public/SVG_graphics/bartok_pizzicato/):
//   BartokPizz-[clef]-[PitchName]-[dynamic].svg  (cropped)
//   BartokPizz-[clef]-[PitchName]-[dynamic].mid   (channel + CC0 set)
//
// Also saves .ly file in lilypond_code/ for reference.
//
// See docs/BARTOK_PIZZICATO_WORKFLOW.md for full documentation.
// See docs/LILYPOND_SETTINGS_REGISTRY.md §28 (pitch syntax) and §29 (settings).

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LILYPOND_DIR = __dirname;
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'SVG_graphics', 'bartok_pizzicato');

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
// Staff line diatonic positions (C3=0): bottom to top
const CLEF_LINES = {
    treble: [9, 11, 13, 15, 17],  // E4 G4 B4 D5 F5
    alto:   [3, 5, 7, 9, 11],     // F3 A3 C4 E4 G4
    bass:   [-3, -1, 1, 3, 5]     // G2 B2 D3 F3 A3
};

function getLedgerLines(diatonic, clef) {
    const lines = CLEF_LINES[clef];
    const bottom = lines[0];
    const top = lines[4];
    // One space beyond top/bottom line needs no ledger lines
    if (diatonic >= bottom - 1 && diatonic <= top + 1) return 0;
    if (diatonic < bottom - 1) return Math.ceil((bottom - 1 - diatonic) / 2);
    return Math.ceil((diatonic - top - 1) / 2);
}

// ── Paper dimensions (from workflow doc) ─────────────────────────────
function getPaperDims(ledgerLines, isMicrotonal) {
    if (ledgerLines === 0)                          return { w: 9,  h: 23 };
    if (ledgerLines <= 2 && !isMicrotonal)          return { w: 9,  h: 25 };
    if (ledgerLines <= 2 && isMicrotonal)           return { w: 11, h: 25 };
    return { w: 11, h: 30 }; // 3+ ledger lines
}

// ── LilyPond template (Registry §29 settings) ───────────────────────
function generateLy(pitch, dynamic, clef, paperW, paperH) {
    return `\\version "2.20.0"
\\language "english"
\\paper{
  tagline = ##f
  paper-width = ${paperW}\\mm
  paper-height = ${paperH}\\mm
  top-margin = 0\\mm
  bottom-margin = 0\\mm
  left-margin = 1\\mm
  right-margin = 0\\mm
} 
\\score {
  \\new Staff \\with {
    \\omit TimeSignature
    \\omit BarLine
    \\clef ${clef}
    \\omit Clef
    \\omit KeySignature
    \\override StaffSymbol.thickness = #1

    % Custom shorter staff lines using Scheme stencil
    \\override StaffSymbol.stencil = #(lambda (grob)
                                       (let* ((staff-space (ly:staff-symbol-staff-space grob))
                                              (line-count (ly:grob-property grob 'line-count 5))
                                              (thickness (ly:grob-property grob 'thickness 1))
                                              (line-thickness (* thickness (ly:staff-symbol-line-thickness grob)))
                                              ;Adjust Staff Line  Width Here /////////
                                              (width 1.2)  ; staff line width in mm
                                              (width-staff-spaces (/ (* width 2.8346) staff-space))  ; convert mm to staff spaces
                                              (half-height (* (/ (- line-count 1) 2) staff-space)))
                                         (apply ly:stencil-add
                                                (map (lambda (i)
                                                       (ly:make-stencil
                                                        (list 'draw-line line-thickness 0 (* i staff-space) width-staff-spaces (* i staff-space))
                                                        (cons 0 width-staff-spaces)
                                                        (cons (- half-height) half-height)))
                                                     (iota line-count (- (/ (- line-count 1) 2)))))))
  }
  {
    \\time 1/4
    \\override NoteHead.font-size = #-2
    \\override DynamicText.font-size = #-6
    \\override Stem.details.beamed-lengths = #'(5.5)
    \\override Stem.details.lengths = #'(6.5)
    \\override Accidental.font-size = -4
    
    
    % NOTATION HERE /////////////////////////////////////////////////////
    \\override Stem.transparent = ##f
    % Shift notation left to start closer to left edge of staff
    \\once \\override NoteColumn.X-offset = #-0.8
    
    ${pitch}16\\snappizzicato\\${dynamic}
    
    
  }
  \\layout{
    \\context {
      \\Score
      proportionalNotationDuration = #(ly:make-moment 1/28)
    }
    indent = 0
    line-width = 37\\mm
  }
  \\midi{}
}
`;
}

// ── Process one input ────────────────────────────────────────────────
function processOne(input, index, total) {
    const { pitch, dynamic, clef, track } = input;
    const prefix = total > 1 ? `[${index + 1}/${total}] ` : '';

    // Validate
    if (!pitch || !dynamic || !clef || !track) {
        console.error(`${prefix}Error: missing required field (pitch, dynamic, clef, track)`);
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

    // Parse pitch
    const p = parsePitch(pitch);
    const ledger = getLedgerLines(p.diatonic, clef);
    const paper = getPaperDims(ledger, p.isMicrotonal);
    const baseName = `BartokPizz-${clef}-${p.displayName}-${dynamic}`;
    const midiChannel = trackNum - 1;

    console.log(`${prefix}${baseName}`);
    console.log(`  Pitch: ${pitch} → ${p.displayName} (diatonic ${p.diatonic}, ${ledger} ledger lines)`);
    console.log(`  Paper: ${paper.w}×${paper.h}mm | Track ${trackNum} → MIDI ch ${midiChannel}`);

    // Step 2-3: Generate and save .ly
    const lyContent = generateLy(pitch, dynamic, clef, paper.w, paper.h);
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

    // Find MIDI (.mid or .midi)
    let midPath = path.join(LILYPOND_DIR, `${baseName}.mid`);
    if (!fs.existsSync(midPath)) {
        midPath = path.join(LILYPOND_DIR, `${baseName}.midi`);
    }
    if (!fs.existsSync(midPath)) {
        console.error(`  Error: MIDI not found after render`);
        return false;
    }
    console.log(`  Rendered: SVG + MIDI`);

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

    // Step 7: Modify MIDI (CC0=97, channel assignment) and save to output
    const outputMid = path.join(OUTPUT_DIR, `${baseName}.mid`);
    try {
        execSync(`node "${path.join(LILYPOND_DIR, 'modify_midi.js')}" "${midPath}" "${outputMid}" ${midiChannel} --cc 0 97`, {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000
        });
    } catch (e) {
        console.error(`  Error: MIDI modify failed — ${e.message}`);
        return false;
    }
    console.log(`  MIDI → ${path.relative(PROJECT_ROOT, outputMid)} (ch ${midiChannel}, CC0=97)`);

    // Clean up intermediate files in lilypond_code/
    try { fs.unlinkSync(svgPath); } catch (e) {}
    try { fs.unlinkSync(midPath); } catch (e) {}

    console.log(`  ✓ Done`);
    return true;
}

// ── Main ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length === 0) {
    console.log(`Bartók Pizzicato Pipeline
Usage:
  Single:  node render_bartok_pizz.js --pitch "b'" --dynamic fff --clef treble --track 1
  Batch:   node render_bartok_pizz.js --batch inputs.json

Outputs to: public/SVG_graphics/bartok_pizzicato/
  [name].svg  — cropped notation
  [name].mid  — modified MIDI (CC0=97, channel set)
  
See docs/BARTOK_PIZZICATO_WORKFLOW.md for details.`);
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

console.log(`\nBartók Pizzicato Pipeline — ${inputs.length} input(s)\n`);

let success = 0;
for (let i = 0; i < inputs.length; i++) {
    if (processOne(inputs[i], i, inputs.length)) success++;
    if (inputs.length > 1) console.log('');
}

console.log(`\nComplete: ${success}/${inputs.length} succeeded`);
if (success < inputs.length) process.exit(1);
