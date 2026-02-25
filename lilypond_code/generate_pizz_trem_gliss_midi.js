// Pizzicato Tremolo Glissando MIDI Generator
//
// Generates MIDI files for Z-stem pizzicato tremolo with glissando.
// Combines timing database sampling (from pizz tremolo) with pitch bend
// segmentation (from long tone glissando) and per-note velocity interpolation.
//
// Usage:
//   node generate_pizz_trem_gliss_midi.js --startPitch C4 --endPitch "A+4" --startDynamic pp --endDynamic fff --track 2 --duration 4.2
//   node generate_pizz_trem_gliss_midi.js --startPitch C4 --endPitch "A+4" --startDynamic pp --endDynamic fff --track 2 --duration 4.2 --model logarithmic --slope -0.536 --y1 10 --y2 0.1
//
// Pitch format (plain English notation):
//   C4, C#4 (sharp), Bb3 (flat), C+4 (quarter sharp), Cd4 (quarter flat),
//   C#+4 (three-quarter sharp), Cbd4 (three-quarter flat)
//
// MIDI structure (Format 1, 2 tracks, 480 ticks/beat, 60 BPM):
//   Track 0: tempo meta event (60 BPM = real-time clock)
//   Track 1: CC0=95, pitch bend segments, per-note velocity, rapid note-on/off
//
// Pitch bend: ±1 semitone range (center=8192, ±8192/semitone).
// 2-semitone traversal per segment (MIDI note offset by 1 from effective pitch).
// Pitch bend NOT reset between notes within a segment.
//
// See docs/PIZZICATO_TREMOLO_GLISSANDO_WORKFLOW.md for full documentation.

const fs = require('fs');
const path = require('path');

// ── Constants ────────────────────────────────────────────────────────
const TICKS_PER_BEAT = 480;
const MICROSECONDS_PER_BEAT = 1000000; // 60 BPM → 1 beat = 1 second
const MS_TO_TICKS = TICKS_PER_BEAT / 1000; // 0.48 ticks per ms

const CC0_PIZZ_TREMOLO = 95;
const CHANNEL_OFFSET = -1; // channel = track - 1 (channels 0-3: no CC7/CC4 conflicts)

const BEND_CENTER = 8192;
const BEND_PER_SEMITONE = 8192;
const BEND_MIN = 0;
const BEND_MAX = 16383;

// Dynamic → MIDI velocity
const DYNAMIC_VELOCITY = {
    ppp: 30, pp: 45, p: 60, mp: 70,
    mf: 85, f: 95, ff: 107, fff: 120
};

// Timing database path
const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_DB_PATH = path.join(PROJECT_ROOT, 'public', 'midi_files', 'pizz_tremolo_db.json');

// ── Pitch parsing (plain English notation → effective MIDI pitch) ────
function parsePitchEnglish(pitchStr) {
    // Format: Letter + optional accidental + octave
    // Accidentals: # (sharp), b (flat), + (quarter sharp), d (quarter flat),
    //              #+ (three-quarter sharp), bd (three-quarter flat)
    const match = pitchStr.match(/^([A-Ga-g])(#\+|bd|#|b|\+|d)?(\d)$/);
    if (!match) throw new Error(`Invalid pitch: "${pitchStr}" — expected format like C4, C#4, A+4, Bb3`);

    const [, letter, accidental = '', octave] = match;
    const noteMap = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

    let midiNote = (parseInt(octave) + 1) * 12 + noteMap[letter.toUpperCase()];
    let quarterToneOffset = 0;

    switch (accidental) {
        case '#':  midiNote += 1; break;
        case 'b':  midiNote -= 1; break;
        case '#+': midiNote += 1; quarterToneOffset = 0.5; break;
        case 'bd': midiNote -= 1; quarterToneOffset = -0.5; break;
        case '+':  quarterToneOffset = 0.5; break;
        case 'd':  quarterToneOffset = -0.5; break;
    }

    return {
        midiNote,
        quarterToneOffset,
        effectivePitch: midiNote + quarterToneOffset,
        displayName: letter.toUpperCase() + (accidental || '') + octave
    };
}

// ── Curve generation (same formula as CurveMaker.computeYAtT) ────────
function generateCurveSamples(model, slope, y1, y2, durationSec) {
    const SAMPLE_INTERVAL = 0.01; // 10ms, same as CurveMaker
    const y1Norm = y1 / 10;
    const y2Norm = y2 / 10;
    const sampleCount = Math.ceil(durationSec / SAMPLE_INTERVAL) + 1;
    const samples = [];

    for (let i = 0; i < sampleCount; i++) {
        const t = Math.min(1, i * SAMPLE_INTERVAL / durationSec);
        let normalizedY;

        switch (model) {
            case 'logarithmic': {
                const absK = Math.abs(slope) * 5;
                let shaped;
                if (absK < 0.01) {
                    shaped = t;
                } else if (slope < 0) {
                    shaped = Math.tanh(absK * t) / Math.tanh(absK);
                } else {
                    shaped = 1 - Math.tanh(absK * (1 - t)) / Math.tanh(absK);
                }
                normalizedY = y1Norm + (y2Norm - y1Norm) * shaped;
                break;
            }
            case 'power': {
                const exponent = Math.pow(4, slope);
                const shaped = Math.pow(t, exponent);
                normalizedY = y1Norm + (y2Norm - y1Norm) * shaped;
                break;
            }
            case 'sigmoid': {
                const steepness = slope * 4;
                let shaped;
                if (Math.abs(steepness) < 0.01) {
                    shaped = t;
                } else {
                    const raw = 1 / (1 + Math.exp(-steepness * (t - 0.5)));
                    const atZero = 1 / (1 + Math.exp(-steepness * -0.5));
                    const atOne = 1 / (1 + Math.exp(-steepness * 0.5));
                    shaped = (raw - atZero) / (atOne - atZero);
                }
                normalizedY = y1Norm + (y2Norm - y1Norm) * shaped;
                break;
            }
            default: {
                // Linear fallback
                normalizedY = y1Norm + (y2Norm - y1Norm) * t;
            }
        }

        samples.push(Math.max(0, Math.min(1, normalizedY)));
    }

    return { samples, sampleInterval: SAMPLE_INTERVAL };
}

// ── Sample notes from timing database ────────────────────────────────
// (Same algorithm as generate_pizz_tremolo_midi.js)
function sampleNotes(db, durationMs) {
    const allNotes = [];
    for (const segment of db.segments) {
        for (const note of segment.notes) {
            allNotes.push(note);
        }
    }
    if (allNotes.length === 0) throw new Error('No notes in timing database');

    let totalGap = 0, gapCount = 0;
    for (const n of allNotes) {
        if (n.gapBeforeMs > 0) { totalGap += n.gapBeforeMs; gapCount++; }
    }
    const avgGap = gapCount > 0 ? totalGap / gapCount : 45;

    const startIdx = Math.floor(Math.random() * allNotes.length);
    const sampled = [];
    let currentTimeMs = 0;
    let idx = startIdx;
    let wrapCount = 0;

    while (currentTimeMs < durationMs) {
        const poolIdx = idx % allNotes.length;
        const note = allNotes[poolIdx];

        if (idx > startIdx && poolIdx === 0) wrapCount++;

        if (sampled.length === 0) {
            sampled.push({ onsetMs: 0, durationMs: note.durationMs });
            currentTimeMs = note.durationMs;
        } else {
            const gap = (poolIdx === 0 && wrapCount > 0) ? avgGap : (note.gapBeforeMs || avgGap);
            const onset = currentTimeMs + gap;
            sampled.push({ onsetMs: onset, durationMs: note.durationMs });
            currentTimeMs = onset + note.durationMs;
        }

        idx++;
        if (idx - startIdx > allNotes.length * 10) {
            console.warn('Warning: wrapped timing database >10 times');
            break;
        }
    }

    // Clip last note to fit duration
    if (sampled.length > 0) {
        const lastNote = sampled[sampled.length - 1];
        const noteEnd = lastNote.onsetMs + lastNote.durationMs;
        if (noteEnd > durationMs) {
            lastNote.durationMs = Math.max(10, durationMs - lastNote.onsetMs);
        }
    }

    return sampled;
}

// ── Map curve Y to effective pitch at a given time ───────────────────
function getEffectivePitchAtTime(curveData, timeMs, lowPitch, pitchRange) {
    const sampleIdx = Math.round(timeMs / (curveData.sampleInterval * 1000));
    const clampedIdx = Math.max(0, Math.min(curveData.samples.length - 1, sampleIdx));
    const normalizedY = curveData.samples[clampedIdx];
    // Y=1 → highPitch, Y=0 → lowPitch
    return lowPitch + normalizedY * pitchRange;
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

function bendToBytes(bendValue) {
    const clamped = Math.max(BEND_MIN, Math.min(BEND_MAX, Math.round(bendValue)));
    return { lsb: clamped & 0x7F, msb: (clamped >> 7) & 0x7F };
}

// ── Build MIDI file ──────────────────────────────────────────────────
function buildMidiFile(sampledNotes, noteData, channel) {
    // noteData: array of { midiNote, bendValue, velocity, isTransition } per note

    // ── Track 0: tempo ──
    const track0Events = [];
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x51, 0x03);
    track0Events.push((MICROSECONDS_PER_BEAT >> 16) & 0xFF);
    track0Events.push((MICROSECONDS_PER_BEAT >> 8) & 0xFF);
    track0Events.push(MICROSECONDS_PER_BEAT & 0xFF);
    track0Events.push(...writeVarInt(0));
    track0Events.push(0xFF, 0x2F, 0x00);

    // ── Track 1: note data ──
    const events = [];

    // CC0 = 95 at tick 0
    events.push({ tick: 0, priority: 0, data: [0xB0 | channel, 0x00, CC0_PIZZ_TREMOLO] });

    // Initial pitch bend at tick 0
    const initBend = bendToBytes(noteData[0].bendValue);
    events.push({ tick: 0, priority: 1, data: [0xE0 | channel, initBend.lsb, initBend.msb] });

    for (let i = 0; i < sampledNotes.length; i++) {
        const note = sampledNotes[i];
        const nd = noteData[i];
        const onTick = msToTicks(note.onsetMs);
        const offTick = msToTicks(note.onsetMs + note.durationMs);

        if (nd.isTransition && i > 0) {
            // Segment transition: pitch bend set BEFORE note on
            // The previous note's off is already scheduled
            const bend = bendToBytes(nd.bendValue);
            events.push({ tick: onTick - 1, priority: 1, data: [0xE0 | channel, bend.lsb, bend.msb] });
        } else if (i > 0) {
            // Normal note within segment: update pitch bend before note on
            const bend = bendToBytes(nd.bendValue);
            events.push({ tick: onTick - 1, priority: 1, data: [0xE0 | channel, bend.lsb, bend.msb] });
        }

        // Note on
        events.push({ tick: onTick, priority: 4, data: [0x90 | channel, nd.midiNote, nd.velocity] });
        // Note off
        events.push({ tick: offTick, priority: 3, data: [0x80 | channel, nd.midiNote, 0] });
    }

    // Pitch bend reset at end
    const lastNote = sampledNotes[sampledNotes.length - 1];
    const endTick = msToTicks(lastNote.onsetMs + lastNote.durationMs);
    events.push({ tick: endTick + 1, priority: 5, data: [0xE0 | channel, 0x00, 0x40] }); // center

    // Sort by tick, then priority
    events.sort((a, b) => {
        if (a.tick !== b.tick) return a.tick - b.tick;
        return a.priority - b.priority;
    });

    // Convert to delta-time
    const track1Events = [];
    let prevTick = 0;
    for (const event of events) {
        const delta = Math.max(0, event.tick - prevTick);
        track1Events.push(...writeVarInt(delta));
        track1Events.push(...event.data);
        prevTick = event.tick;
    }
    track1Events.push(...writeVarInt(0));
    track1Events.push(0xFF, 0x2F, 0x00);

    // ── Assemble ──
    const track0Data = Buffer.from(track0Events);
    const track1Data = Buffer.from(track1Events);

    const header = Buffer.alloc(14);
    header.write('MThd', 0);
    header.writeUInt32BE(6, 4);
    header.writeUInt16BE(1, 8);
    header.writeUInt16BE(2, 10);
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
        console.log(`Pizzicato Tremolo Glissando MIDI Generator

Usage:
  node generate_pizz_trem_gliss_midi.js --startPitch C4 --endPitch "A+4" --startDynamic pp --endDynamic fff --track 2 --duration 4.2
  node generate_pizz_trem_gliss_midi.js --startPitch C4 --endPitch "A+4" --startDynamic pp --endDynamic fff --track 2 --duration 4.2 --model logarithmic --slope -0.536 --y1 10 --y2 0.1

Required:
  --startPitch    Starting pitch (C4, C#4, A+4, Bb3, etc.)
  --endPitch      Ending pitch
  --startDynamic  ppp|pp|p|mp|mf|f|ff|fff
  --endDynamic    ppp|pp|p|mp|mf|f|ff|fff
  --track         1-4 (maps to MIDI channels 0-3)
  --duration      seconds (decimal OK)

Optional (curve shape — defaults to linear if omitted):
  --model         logarithmic|power|sigmoid|linear (default: linear)
  --slope         Curve slope (-3 to +3, default: 0)
  --y1            Curve start intensity (0-10, default: 10)
  --y2            Curve end intensity (0-10, default: 0)

Optional:
  --output        output file path
  --db            timing database path`);
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
    for (const key of ['startPitch', 'endPitch', 'startDynamic', 'endDynamic', 'track', 'duration']) {
        if (!opts[key]) {
            console.error(`Error: missing required --${key}`);
            process.exit(1);
        }
    }

    // Parse pitches
    const startPitch = parsePitchEnglish(opts.startPitch);
    const endPitch = parsePitchEnglish(opts.endPitch);

    // Parse dynamics → velocities
    const startDyn = opts.startDynamic.toLowerCase();
    const endDyn = opts.endDynamic.toLowerCase();
    const startVel = DYNAMIC_VELOCITY[startDyn];
    const endVel = DYNAMIC_VELOCITY[endDyn];
    if (startVel === undefined) { console.error(`Error: unknown startDynamic "${opts.startDynamic}"`); process.exit(1); }
    if (endVel === undefined) { console.error(`Error: unknown endDynamic "${opts.endDynamic}"`); process.exit(1); }

    // Track → channel
    const track = parseInt(opts.track, 10);
    if (isNaN(track) || track < 1 || track > 4) { console.error(`Error: track must be 1-4`); process.exit(1); }
    const channel = track + CHANNEL_OFFSET;

    // Duration
    const durationSec = parseFloat(opts.duration);
    if (isNaN(durationSec) || durationSec <= 0) { console.error(`Error: duration must be > 0`); process.exit(1); }
    const durationMs = durationSec * 1000;

    // Curve parameters (optional — defaults to descending linear)
    const model = opts.model || 'linear';
    const slope = parseFloat(opts.slope || '0');
    const y1 = parseFloat(opts.y1 ?? '10');
    const y2 = parseFloat(opts.y2 ?? '0');

    // Load timing database
    const dbPath = opts.db ? path.resolve(opts.db) : DEFAULT_DB_PATH;
    if (!fs.existsSync(dbPath)) { console.error(`Error: timing DB not found: ${dbPath}`); process.exit(1); }
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    // ── Generate curve samples ──
    const curveData = generateCurveSamples(model, slope, y1, y2, durationSec);

    // ── Pitch mapping ──
    const highPitch = Math.max(startPitch.effectivePitch, endPitch.effectivePitch);
    const lowPitch = Math.min(startPitch.effectivePitch, endPitch.effectivePitch);
    const pitchRange = highPitch - lowPitch;

    // Determine direction from curve: if first sample > last sample, pitch goes high→low
    const firstY = curveData.samples[0];
    const lastY = curveData.samples[curveData.samples.length - 1];
    const isDescending = firstY > lastY;

    // ── Sample notes from timing database ──
    const sampledNotes = sampleNotes(db, durationMs);

    // ── Compute per-note data: effective pitch, MIDI note, bend, velocity ──
    const noteData = [];
    let currentSegmentMidiNote = null;

    for (let i = 0; i < sampledNotes.length; i++) {
        const note = sampledNotes[i];
        const t = sampledNotes.length > 1 ? i / (sampledNotes.length - 1) : 0;

        // Per-note velocity (linear interpolation)
        const velocity = Math.round(startVel + t * (endVel - startVel));

        // Effective pitch from curve at this note's onset time
        const effectivePitch = getEffectivePitchAtTime(curveData, note.onsetMs, lowPitch, pitchRange);

        // Determine if we need a new segment
        let isTransition = false;
        if (currentSegmentMidiNote === null) {
            // First note: choose MIDI note offset by 1 in direction of travel
            if (isDescending) {
                currentSegmentMidiNote = Math.round(effectivePitch) - 1;
            } else {
                currentSegmentMidiNote = Math.round(effectivePitch) + 1;
            }
        } else {
            // Check if effective pitch is within ±1 semitone of current segment note
            const offset = effectivePitch - currentSegmentMidiNote;
            if (Math.abs(offset) > 1.0) {
                // Transition needed
                isTransition = true;
                if (isDescending) {
                    currentSegmentMidiNote = Math.round(effectivePitch) - 1;
                } else {
                    currentSegmentMidiNote = Math.round(effectivePitch) + 1;
                }
            }
        }

        // Calculate pitch bend
        const offset = effectivePitch - currentSegmentMidiNote;
        const bendValue = BEND_CENTER + (offset * BEND_PER_SEMITONE);

        noteData.push({
            midiNote: currentSegmentMidiNote,
            bendValue: Math.max(BEND_MIN, Math.min(BEND_MAX, Math.round(bendValue))),
            velocity: Math.max(1, Math.min(127, velocity)),
            effectivePitch,
            isTransition
        });
    }

    // Clef (for naming only — doesn't affect MIDI)
    const clef = opts.clef || 'treble';

    // ── Output path ──
    const defaultName = `PizzTremGliss-${clef}-${startPitch.displayName}-${endPitch.displayName}-${startDyn}-${endDyn}.mid`;
    const outputPath = opts.output ? path.resolve(opts.output) : path.join(__dirname, defaultName);

    // ── Build and write MIDI ──
    const midiBuffer = buildMidiFile(sampledNotes, noteData, channel);
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, midiBuffer);

    // ── Report ──
    console.log(`\nPizzicato Tremolo Glissando MIDI Generator`);
    console.log(`  Start Pitch: ${opts.startPitch} → effective MIDI ${startPitch.effectivePitch}`);
    console.log(`  End Pitch:   ${opts.endPitch} → effective MIDI ${endPitch.effectivePitch}`);
    console.log(`  Dynamics:    ${startDyn} (vel ${startVel}) → ${endDyn} (vel ${endVel})`);
    console.log(`  Track:       ${track} → MIDI channel ${channel} (ch ${channel + 1} display)`);
    console.log(`  Duration:    ${durationSec}s (${durationMs}ms)`);
    console.log(`  Curve:       ${model}, slope=${slope}, y1=${y1}, y2=${y2}`);
    console.log(`  Direction:   ${isDescending ? 'descending' : 'ascending'} (${highPitch.toFixed(1)} → ${lowPitch.toFixed(1)})`);
    console.log(`  CC0:         ${CC0_PIZZ_TREMOLO} (pizz tremolo)`);
    console.log(`  Notes:       ${sampledNotes.length} from timing database`);

    // Count segments
    const transitions = noteData.filter(n => n.isTransition).length;
    console.log(`  Segments:    ${transitions + 1} (${transitions} transitions)`);

    // Show segment details
    let segStart = 0;
    for (let i = 0; i < noteData.length; i++) {
        if (noteData[i].isTransition || i === noteData.length - 1) {
            const segEnd = noteData[i].isTransition ? i - 1 : i;
            const segMidi = noteData[segStart].midiNote;
            const segStartPitch = noteData[segStart].effectivePitch.toFixed(2);
            const segEndPitch = noteData[Math.min(segEnd, noteData.length - 1)].effectivePitch.toFixed(2);
            const segStartBend = noteData[segStart].bendValue;
            const segEndBend = noteData[Math.min(segEnd, noteData.length - 1)].bendValue;
            console.log(`    Seg ${Math.floor(segStart === 0 ? 1 : transitions - noteData.slice(i).filter(n=>n.isTransition).length + 1)}: MIDI note ${segMidi}, pitch ${segStartPitch}→${segEndPitch}, bend ${segStartBend}→${segEndBend}, notes ${segStart}–${segEnd}`);
            if (noteData[i].isTransition) segStart = i;
        }
    }

    console.log(`\n  Output: ${outputPath} (${midiBuffer.length} bytes)`);
    console.log(`  ✓ Done\n`);
}

main();
