// Pizzicato Tremolo MIDI Generator
//
// Generates MIDI files for Z-stem pizzicato tremolo by sampling a timing
// database of human-played tremolo. Notes are rapid repeated pitches with
// natural timing variation; volume shape is controlled by CC7 ramp.
//
// Usage:
//   node generate_pizz_tremolo_midi.js --pitch "c'" --dynamic ff --track 1 --shape cres --duration 3
//   node generate_pizz_tremolo_midi.js --pitch "ftqs''" --dynamic ff --track 1 --shape hp --duration 3 --output myfile.mid
//
// Inputs:
//   --pitch     LilyPond English notation (e.g. c', fs'', ftqs''', atqf')
//   --dynamic   ppp|pp|p|mp|mf|f|ff|fff — sets note velocity
//   --track     1-4 — maps to MIDI channels 8-11 (0-indexed)
//   --shape     cres|decres|hp — CC7 volume envelope
//   --duration  seconds (decimal OK)
//   --output    (optional) output file path; default: auto-named in cwd
//
// MIDI structure (Format 1, 2 tracks, 480 ticks/beat, 60 BPM):
//   Track 0: tempo meta event (60 BPM = real-time clock)
//   Track 1: CC0=95 (patch select), pitch bend (if quarter-tone), CC7 ramp,
//            rapid note-on/off events, pitch bend reset
//
// CC0 = 95 selects the "pizzicato velocity" patch in the user's software
// synthesizer. CC0 (Bank Select) is used as a technique/articulation
// identifier across all systems in this project:
//   CC0 = 89  → Senza vibrato (vibrato, glissando, crescendo systems)
//   CC0 = 97  → Bartók pizzicato (snap pizz)
//   CC0 = 95  → Pizzicato tremolo
//
// See docs/MIDI_MUSIC_GENERATION.md for full MIDI conventions.
// See docs/PIZZICATO_TREMOLO_WORKFLOW.md for workflow context.

const fs = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────────────
const TICKS_PER_BEAT = 480;
const MICROSECONDS_PER_BEAT = 1000000; // 60 BPM → 1 beat = 1 second
const MS_TO_TICKS = TICKS_PER_BEAT / 1000; // 0.48 ticks per ms

const CC0_PIZZ_TREMOLO = 95;   // Patch select: pizzicato velocity
const CC7_PP_VOLUME = 50;      // CC7 starting volume for cres/hp shapes
const CC7_INTERVAL_MS = 20;    // CC7 message density for smooth volume ramp

// Channel mapping: track 1→ch8, track 2→ch9, track 3→ch10, track 4→ch11
// These are MIDI channels 9-12 (1-indexed display), shared with nothing else.
const CHANNEL_OFFSET = 7; // channel = track + 7 (track is 1-based)

// Dynamic → MIDI velocity (standard mapping, same as Bartók Pizzicato)
const DYNAMIC_VELOCITY = {
    ppp: 30, pp: 45, p: 60, mp: 70,
    mf: 85, f: 95, ff: 107, fff: 120
};

// Default timing database path (relative to project root)
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, 'public', 'midi_files', 'pizz_tremolo_db.json');

// ── Pitch parsing (LilyPond English → MIDI note + pitch bend) ───────
const LETTER_SEMITONES = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
const ACCIDENTAL_SUFFIXES = ['tqs', 'tqf', 'ss', 'ff', 'qs', 'qf', 's', 'f']; // longest first

// Integer semitone offset for MIDI note number
const ACCIDENTAL_SEMITONES = {
    '': 0, s: 1, f: -1, ss: 2, ff: -2,
    qs: 0, qf: 0, tqs: 1, tqf: -1
};

// Pitch bend value (center=8192, ±1 semitone range: 8192 per semitone)
// Quarter sharp (+50 cents) = 12288, Quarter flat (-50 cents) = 4096
const ACCIDENTAL_BEND = {
    '': 8192, s: 8192, f: 8192, ss: 8192, ff: 8192,
    qs: 12288, qf: 4096, tqs: 12288, tqf: 4096
};

function parsePitch(pitchStr) {
    const letter = pitchStr[0].toLowerCase();
    if (!LETTER_SEMITONES.hasOwnProperty(letter)) {
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

    const midiNote = (octave + 1) * 12 + LETTER_SEMITONES[letter] + ACCIDENTAL_SEMITONES[accidental];
    const bendValue = ACCIDENTAL_BEND[accidental];
    const needsBend = bendValue !== 8192;

    // Display name for filenames
    const displayName = letter.toUpperCase() + accidental.toUpperCase() + octave;

    return { midiNote, bendValue, needsBend, displayName, octave, accidental, raw: pitchStr };
}

// ── MIDI helpers ─────────────────────────────────────────────────────
function writeVarInt(value) {
    if (value < 0) value = 0;
    const bytes = [];
    bytes.push(value & 0x7F);
    value >>= 7;
    while (value > 0) {
        bytes.unshift((value & 0x7F) | 0x80);
        value >>= 7;
    }
    return bytes;
}

function msToTicks(ms) {
    return Math.round(ms * MS_TO_TICKS);
}

// ── Sample notes from timing database ────────────────────────────────
function sampleNotes(db, durationMs) {
    // Pool all notes from all segments into one flat array
    const allNotes = [];
    for (const segment of db.segments) {
        for (const note of segment.notes) {
            allNotes.push(note);
        }
    }

    if (allNotes.length === 0) throw new Error('No notes in timing database');

    // Calculate average gap for wrap-around points
    let totalGap = 0, gapCount = 0;
    for (const n of allNotes) {
        if (n.gapBeforeMs > 0) { totalGap += n.gapBeforeMs; gapCount++; }
    }
    const avgGap = gapCount > 0 ? totalGap / gapCount : 45;

    // Pick a random start index
    const startIdx = Math.floor(Math.random() * allNotes.length);

    const sampled = [];
    let currentTimeMs = 0;
    let idx = startIdx;
    let wrapCount = 0;

    while (currentTimeMs < durationMs) {
        const poolIdx = idx % allNotes.length;
        const note = allNotes[poolIdx];

        // Detect wrap-around
        if (idx > startIdx && poolIdx === 0) wrapCount++;

        if (sampled.length === 0) {
            // First note starts at time 0
            sampled.push({
                onsetMs: 0,
                durationMs: note.durationMs
            });
            currentTimeMs = note.durationMs;
        } else {
            // Use gap from database; at wrap points use average gap
            const gap = (poolIdx === 0 && wrapCount > 0) ? avgGap : (note.gapBeforeMs || avgGap);
            const onset = currentTimeMs + gap;
            sampled.push({
                onsetMs: onset,
                durationMs: note.durationMs
            });
            currentTimeMs = onset + note.durationMs;
        }

        idx++;

        // Safety: prevent infinite loop if DB is tiny
        if (idx - startIdx > allNotes.length * 10) {
            console.warn('Warning: wrapped timing database >10 times');
            break;
        }
    }

    // Adjust last note to fit duration exactly
    if (sampled.length > 0) {
        const lastNote = sampled[sampled.length - 1];
        const noteEnd = lastNote.onsetMs + lastNote.durationMs;

        if (noteEnd > durationMs) {
            // Clip: shorten note so it ends at durationMs
            lastNote.durationMs = Math.max(10, durationMs - lastNote.onsetMs);
        } else if (noteEnd < durationMs) {
            // Extend: grow note to fill remaining time
            lastNote.durationMs = durationMs - lastNote.onsetMs;
        }
    }

    return sampled;
}

// ── Generate CC7 volume ramp ─────────────────────────────────────────
function generateCC7Ramp(shape, durationMs) {
    const points = [];
    const numSteps = Math.max(1, Math.floor(durationMs / CC7_INTERVAL_MS));

    for (let i = 0; i <= numSteps; i++) {
        const t = i / numSteps; // 0 to 1
        const timeMs = t * durationMs;
        let volume;

        switch (shape) {
            case 'cres':
                // pp → max (linear)
                volume = CC7_PP_VOLUME + t * (127 - CC7_PP_VOLUME);
                break;
            case 'decres':
                // max → 0 (linear)
                volume = 127 - t * 127;
                break;
            case 'hp':
                // pp → max (first half) → 0 (second half)
                if (t <= 0.5) {
                    const t2 = t * 2; // 0→1 over first half
                    volume = CC7_PP_VOLUME + t2 * (127 - CC7_PP_VOLUME);
                } else {
                    const t2 = (t - 0.5) * 2; // 0→1 over second half
                    volume = 127 - t2 * 127;
                }
                break;
            default:
                throw new Error(`Unknown shape: "${shape}"`);
        }

        points.push({
            timeMs,
            volume: Math.round(Math.max(0, Math.min(127, volume)))
        });
    }

    return points;
}

// ── Build MIDI file ──────────────────────────────────────────────────
function buildMidiFile(pitch, velocity, channel, sampledNotes, cc7Points) {
    // ── Track 0: tempo ──
    const track0Events = [];
    // Tempo meta event: FF 51 03 <3-byte tempo>
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x51, 0x03);
    track0Events.push((MICROSECONDS_PER_BEAT >> 16) & 0xFF);
    track0Events.push((MICROSECONDS_PER_BEAT >> 8) & 0xFF);
    track0Events.push(MICROSECONDS_PER_BEAT & 0xFF);
    // End of track
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x2F, 0x00);

    // ── Track 1: note data ──
    // Collect all events with absolute tick positions, then sort and convert to delta
    const events = [];

    // CC0 = 95 (pizzicato velocity patch) at tick 0
    events.push({ tick: 0, priority: 0, data: [0xB0 | channel, 0x00, CC0_PIZZ_TREMOLO] });

    // Pitch bend at tick 0 (if quarter-tone)
    if (pitch.needsBend) {
        const lsb = pitch.bendValue & 0x7F;
        const msb = (pitch.bendValue >> 7) & 0x7F;
        events.push({ tick: 0, priority: 1, data: [0xE0 | channel, lsb, msb] });
    }

    // CC7 volume ramp points
    for (const pt of cc7Points) {
        const tick = msToTicks(pt.timeMs);
        events.push({ tick, priority: 2, data: [0xB0 | channel, 0x07, pt.volume] });
    }

    // Note events
    for (const note of sampledNotes) {
        const onTick = msToTicks(note.onsetMs);
        const offTick = msToTicks(note.onsetMs + note.durationMs);
        events.push({ tick: onTick, priority: 4, data: [0x90 | channel, pitch.midiNote, velocity] });
        events.push({ tick: offTick, priority: 3, data: [0x80 | channel, pitch.midiNote, 0] });
    }

    // Pitch bend reset at end (if quarter-tone was used)
    if (pitch.needsBend) {
        const lastNote = sampledNotes[sampledNotes.length - 1];
        const endTick = msToTicks(lastNote.onsetMs + lastNote.durationMs);
        events.push({ tick: endTick + 1, priority: 5, data: [0xE0 | channel, 0x00, 0x40] }); // center = 8192
    }

    // Sort: by tick, then by priority (CC before bend before note-off before note-on)
    events.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.priority - b.priority;
    });

    // Convert to delta-time format
    const track1Events = [];
    let prevTick = 0;
    for (const event of events) {
        const delta = Math.max(0, event.tick - prevTick);
        track1Events.push(...writeVarInt(delta));
        track1Events.push(...event.data);
        prevTick = event.tick;
    }

    // End of track
    track1Events.push(...writeVarInt(0));
    track1Events.push(0xFF, 0x2F, 0x00);

    // ── Assemble MIDI file ──
    const track0Data = Buffer.from(track0Events);
    const track1Data = Buffer.from(track1Events);

    // MThd header: format 1, 2 tracks, 480 ticks/beat
    const header = Buffer.alloc(14);
    header.write('MThd', 0);
    header.writeUInt32BE(6, 4);
    header.writeUInt16BE(1, 8);              // format 1
    header.writeUInt16BE(2, 10);             // 2 tracks
    header.writeUInt16BE(TICKS_PER_BEAT, 12);

    const track0Header = Buffer.alloc(8);
    track0Header.write('MTrk', 0);
    track0Header.writeUInt32BE(track0Data.length, 4);

    const track1Header = Buffer.alloc(8);
    track1Header.write('MTrk', 0);
    track1Header.writeUInt32BE(track1Data.length, 4);

    return Buffer.concat([header, track0Header, track0Data, track1Header, track1Data]);
}

// ── Main ─────────────────────────────────────────────────────────────
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`Pizzicato Tremolo MIDI Generator

Usage:
  node generate_pizz_tremolo_midi.js --pitch "c'" --dynamic ff --track 1 --shape cres --duration 3
  node generate_pizz_tremolo_midi.js --pitch "ftqs''" --dynamic ff --track 2 --shape hp --duration 3 --output myfile.mid

Required:
  --pitch     LilyPond English pitch (c', fs'', ftqs''', atqf')
  --dynamic   ppp|pp|p|mp|mf|f|ff|fff
  --track     1-4 (maps to MIDI channels 8-11)
  --shape     cres|decres|hp (CC7 volume envelope)
  --duration  seconds (decimal OK)

Optional:
  --output    output file path (default: auto-named in lilypond_code/)
  --db        timing database path (default: public/midi_files/pizz_tremolo_db.json)

CC0 = 95 selects "pizzicato velocity" patch in software synth.
CC7 shapes volume: cres (pp→max), decres (max→0), hp (pp→max→0).

See docs/PIZZICATO_TREMOLO_WORKFLOW.md for full context.`);
        process.exit(0);
    }

    // Parse arguments
    const opts = {};
    for (let i = 0; i < args.length; i += 2) {
        const key = args[i].replace(/^--/, '');
        if (i + 1 >= args.length) {
            console.error(`Error: missing value for --${key}`);
            process.exit(1);
        }
        opts[key] = args[i + 1];
    }

    // Validate required
    const required = ['pitch', 'dynamic', 'track', 'shape', 'duration'];
    for (const key of required) {
        if (!opts[key]) {
            console.error(`Error: missing required --${key}`);
            process.exit(1);
        }
    }

    // Parse pitch
    const pitch = parsePitch(opts.pitch);

    // Dynamic → velocity
    const dynamic = opts.dynamic.toLowerCase();
    const velocity = DYNAMIC_VELOCITY[dynamic];
    if (velocity === undefined) {
        console.error(`Error: unknown dynamic "${opts.dynamic}" — use ppp|pp|p|mp|mf|f|ff|fff`);
        process.exit(1);
    }

    // Track → channel
    const track = parseInt(opts.track, 10);
    if (isNaN(track) || track < 1 || track > 4) {
        console.error(`Error: track must be 1-4, got "${opts.track}"`);
        process.exit(1);
    }
    const channel = track + CHANNEL_OFFSET; // track 1→ch8, track 2→ch9, etc.

    // Shape
    const shape = opts.shape.toLowerCase();
    if (!['cres', 'decres', 'hp'].includes(shape)) {
        console.error(`Error: shape must be cres|decres|hp, got "${opts.shape}"`);
        process.exit(1);
    }

    // Duration
    const durationSec = parseFloat(opts.duration);
    if (isNaN(durationSec) || durationSec <= 0) {
        console.error(`Error: duration must be > 0, got "${opts.duration}"`);
        process.exit(1);
    }
    const durationMs = durationSec * 1000;

    // Load timing database
    const dbPath = opts.db ? path.resolve(opts.db) : DEFAULT_DB_PATH;
    if (!fs.existsSync(dbPath)) {
        console.error(`Error: timing database not found: ${dbPath}`);
        process.exit(1);
    }
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // Output path
    const defaultName = `PizzTrem-${pitch.displayName}-${dynamic}-${shape}.mid`;
    const outputPath = opts.output ? path.resolve(opts.output) : path.join(__dirname, defaultName);

    // ── Generate ──
    console.log(`\nPizzicato Tremolo MIDI Generator`);
    console.log(`  Pitch: ${opts.pitch} → ${pitch.displayName} (MIDI note ${pitch.midiNote}${pitch.needsBend ? ', bend ' + pitch.bendValue : ''})`);
    console.log(`  Dynamic: ${dynamic} → velocity ${velocity}`);
    console.log(`  Track: ${track} → MIDI channel ${channel} (ch ${channel + 1} display)`);
    console.log(`  Shape: ${shape} (CC7 volume envelope)`);
    console.log(`  Duration: ${durationSec}s (${durationMs}ms)`);
    console.log(`  CC0: ${CC0_PIZZ_TREMOLO} (pizzicato velocity patch)`);

    // Sample notes from timing database
    const sampledNotes = sampleNotes(db, durationMs);
    console.log(`  Sampled: ${sampledNotes.length} notes from timing database`);

    // Generate CC7 ramp
    const cc7Points = generateCC7Ramp(shape, durationMs);
    console.log(`  CC7 ramp: ${cc7Points.length} points (${shape}: ${cc7Points[0].volume}→${cc7Points[Math.floor(cc7Points.length / 2)].volume}→${cc7Points[cc7Points.length - 1].volume})`);

    // Build MIDI file
    const midiBuffer = buildMidiFile(pitch, velocity, channel, sampledNotes, cc7Points);

    // Write output
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, midiBuffer);

    console.log(`\n  Output: ${outputPath} (${midiBuffer.length} bytes)`);
    console.log(`  ✓ Done\n`);
}

main();
