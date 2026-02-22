// Pizzicato Tremolo MIDI Ingestion Script
// Parses a MIDI file recorded with tremolo note patterns and extracts
// note-on/off timing + velocity data into a JSON database.
//
// Usage:
//   node ingest_pizz_tremolo.js <input.mid> [options]
//
// Options:
//   --mode=new       Create a new database (default if no DB exists)
//   --mode=append    Append segments to existing database
//   --db=<path>      Path to database JSON (default: ../public/midi_files/pizz_tremolo_db.json)
//   --gap=<ms>       Gap threshold in ms to split bursts (default: 200)
//   --label=<text>   Label for this ingestion batch (default: source filename)
//
// Examples:
//   node ingest_pizz_tremolo.js ../public/midi_files/PizzTremeloMidiSampleforDB.mid
//   node ingest_pizz_tremolo.js recording2.mid --mode=append --label="session 2"
//   node ingest_pizz_tremolo.js recording3.mid --db=./my_db.json --gap=300

const fs = require('fs');
const path = require('path');

// ── Parse arguments ──────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 1 || args[0] === '--help') {
    console.log('Usage: node ingest_pizz_tremolo.js <input.mid> [--mode=new|append] [--db=<path>] [--gap=<ms>] [--label=<text>]');
    process.exit(args[0] === '--help' ? 0 : 1);
}

const inputPath = args[0];
let mode = 'auto'; // auto = new if no DB, append if DB exists
let dbPath = path.join(__dirname, '..', 'public', 'midi_files', 'pizz_tremolo_db.json');
let gapThresholdMs = 200;
let label = path.basename(inputPath, path.extname(inputPath));

for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--mode=')) {
        mode = args[i].split('=')[1];
        if (mode !== 'new' && mode !== 'append') {
            console.error('Error: --mode must be "new" or "append"');
            process.exit(1);
        }
    } else if (args[i].startsWith('--db=')) {
        dbPath = args[i].split('=')[1];
    } else if (args[i].startsWith('--gap=')) {
        gapThresholdMs = parseInt(args[i].split('=')[1], 10);
        if (isNaN(gapThresholdMs) || gapThresholdMs < 0) {
            console.error('Error: --gap must be a positive number (ms)');
            process.exit(1);
        }
    } else if (args[i].startsWith('--label=')) {
        label = args[i].split('=')[1];
    }
}

if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
}

// ── MIDI Parser ──────────────────────────────────────────────────────

function parseMidiFile(filePath) {
    const buf = fs.readFileSync(filePath);

    // Validate header
    if (buf.toString('ascii', 0, 4) !== 'MThd') {
        throw new Error('Not a valid MIDI file (missing MThd header)');
    }

    const headerLen = buf.readUInt32BE(4);
    const format = buf.readUInt16BE(8);
    const numTracks = buf.readUInt16BE(10);
    const ticksPerBeat = buf.readUInt16BE(12);

    console.log(`MIDI: Format ${format}, ${numTracks} tracks, ${ticksPerBeat} ticks/beat`);

    // Find tempo from tempo track (default 120 BPM if not found)
    let microsecondsPerBeat = 500000; // 120 BPM default
    let pos = 8 + headerLen;

    // Parse all tracks, collect note events
    const allNoteEvents = [];

    for (let t = 0; t < numTracks; t++) {
        if (buf.toString('ascii', pos, pos + 4) !== 'MTrk') {
            throw new Error(`Expected MTrk at offset ${pos}`);
        }
        const trackLen = buf.readUInt32BE(pos + 4);
        const trackStart = pos + 8;
        const trackEnd = trackStart + trackLen;

        let tPos = trackStart;
        let currentTick = 0;
        let runningStatus = 0;

        while (tPos < trackEnd) {
            // Read variable-length delta time
            let deltaTime = 0;
            let byte;
            do {
                byte = buf[tPos++];
                deltaTime = (deltaTime << 7) | (byte & 0x7F);
            } while (byte & 0x80);
            currentTick += deltaTime;

            // Read status byte
            let status = buf[tPos];
            if (status < 0x80) {
                // Running status
                status = runningStatus;
            } else {
                tPos++;
                if (status < 0xF0) runningStatus = status;
            }

            const eventType = status & 0xF0;

            if (status === 0xFF) {
                // Meta event
                const metaType = buf[tPos++];
                let metaLen = 0;
                do {
                    byte = buf[tPos++];
                    metaLen = (metaLen << 7) | (byte & 0x7F);
                } while (byte & 0x80);

                if (metaType === 0x51 && metaLen === 3) {
                    // Tempo change
                    microsecondsPerBeat = (buf[tPos] << 16) | (buf[tPos + 1] << 8) | buf[tPos + 2];
                    const bpm = Math.round(60000000 / microsecondsPerBeat);
                    console.log(`  Tempo: ${bpm} BPM (${microsecondsPerBeat} µs/beat)`);
                }
                tPos += metaLen;
            } else if (eventType === 0x90) {
                // Note On
                const note = buf[tPos++];
                const vel = buf[tPos++];
                const timeMs = (currentTick / ticksPerBeat) * (microsecondsPerBeat / 1000);
                if (vel > 0) {
                    allNoteEvents.push({ type: 'noteOn', tick: currentTick, timeMs, note, velocity: vel });
                } else {
                    // Note On with velocity 0 = Note Off
                    allNoteEvents.push({ type: 'noteOff', tick: currentTick, timeMs, note, velocity: 0 });
                }
            } else if (eventType === 0x80) {
                // Note Off
                const note = buf[tPos++];
                const vel = buf[tPos++];
                const timeMs = (currentTick / ticksPerBeat) * (microsecondsPerBeat / 1000);
                allNoteEvents.push({ type: 'noteOff', tick: currentTick, timeMs, note, velocity: vel });
            } else if (eventType === 0xB0 || eventType === 0xA0 || eventType === 0xE0) {
                tPos += 2; // 2 data bytes — skip
            } else if (eventType === 0xC0 || eventType === 0xD0) {
                tPos += 1; // 1 data byte — skip
            } else if (status === 0xF0 || status === 0xF7) {
                let sysexLen = 0;
                do {
                    byte = buf[tPos++];
                    sysexLen = (sysexLen << 7) | (byte & 0x7F);
                } while (byte & 0x80);
                tPos += sysexLen;
            }
        }

        pos = trackEnd;
    }

    return { allNoteEvents, ticksPerBeat, microsecondsPerBeat };
}

// ── Pair note-ons with note-offs ─────────────────────────────────────

function pairNotes(noteEvents) {
    // Sort by time, then noteOff before noteOn at same time
    noteEvents.sort((a, b) => {
        if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
        if (a.type === 'noteOff' && b.type === 'noteOn') return -1;
        if (a.type === 'noteOn' && b.type === 'noteOff') return 1;
        return 0;
    });

    const pendingNotes = new Map(); // note number → [{ onEvent }]
    const pairedNotes = [];

    for (const event of noteEvents) {
        if (event.type === 'noteOn') {
            if (!pendingNotes.has(event.note)) {
                pendingNotes.set(event.note, []);
            }
            pendingNotes.get(event.note).push(event);
        } else if (event.type === 'noteOff') {
            const pending = pendingNotes.get(event.note);
            if (pending && pending.length > 0) {
                const onEvent = pending.shift();
                pairedNotes.push({
                    onsetMs: onEvent.timeMs,
                    offsetMs: event.timeMs,
                    durationMs: event.timeMs - onEvent.timeMs,
                    velocity: onEvent.velocity,
                    midiNote: onEvent.note
                });
            }
        }
    }

    // Sort by onset time
    pairedNotes.sort((a, b) => a.onsetMs - b.onsetMs);
    return pairedNotes;
}

// ── Split into tremolo bursts ────────────────────────────────────────

function splitIntoBursts(pairedNotes, gapThreshold) {
    if (pairedNotes.length === 0) return [];

    const bursts = [];
    let currentBurst = [pairedNotes[0]];

    for (let i = 1; i < pairedNotes.length; i++) {
        const prevNote = pairedNotes[i - 1];
        const currNote = pairedNotes[i];
        const gap = currNote.onsetMs - prevNote.offsetMs;

        if (gap > gapThreshold) {
            // Large gap — start new burst
            bursts.push(currentBurst);
            currentBurst = [currNote];
        } else {
            currentBurst.push(currNote);
        }
    }
    bursts.push(currentBurst);

    return bursts;
}

// ── Convert burst to relative timing segment ─────────────────────────

function burstToSegment(burst, segmentIndex, sourceLabel) {
    if (burst.length === 0) return null;

    const burstStartMs = burst[0].onsetMs;
    const burstEndMs = burst[burst.length - 1].offsetMs;

    const notes = burst.map((note, i) => {
        const relativeOnsetMs = note.onsetMs - burstStartMs;
        const gapBeforeMs = i > 0 ? note.onsetMs - burst[i - 1].offsetMs : 0;
        return {
            relativeOnsetMs: Math.round(relativeOnsetMs * 100) / 100,
            durationMs: Math.round(note.durationMs * 100) / 100,
            gapBeforeMs: Math.round(gapBeforeMs * 100) / 100,
            velocity: note.velocity
        };
    });

    // Compute statistics
    const durations = notes.map(n => n.durationMs);
    const velocities = notes.map(n => n.velocity);
    const gaps = notes.slice(1).map(n => n.gapBeforeMs);
    const ioiMs = []; // inter-onset intervals
    for (let i = 1; i < notes.length; i++) {
        ioiMs.push(notes[i].relativeOnsetMs - notes[i - 1].relativeOnsetMs);
    }

    const avg = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
    const min = arr => arr.length ? Math.min(...arr) : 0;
    const max = arr => arr.length ? Math.max(...arr) : 0;

    return {
        segmentIndex,
        source: sourceLabel,
        noteCount: notes.length,
        totalDurationMs: Math.round((burstEndMs - burstStartMs) * 100) / 100,
        stats: {
            noteDuration: { avgMs: Math.round(avg(durations) * 100) / 100, minMs: Math.round(min(durations) * 100) / 100, maxMs: Math.round(max(durations) * 100) / 100 },
            velocity: { avg: Math.round(avg(velocities)), min: min(velocities), max: max(velocities) },
            gap: { avgMs: Math.round(avg(gaps) * 100) / 100, minMs: Math.round(min(gaps) * 100) / 100, maxMs: Math.round(max(gaps) * 100) / 100 },
            ioi: { avgMs: Math.round(avg(ioiMs) * 100) / 100, minMs: Math.round(min(ioiMs) * 100) / 100, maxMs: Math.round(max(ioiMs) * 100) / 100 }
        },
        notes
    };
}

// ── Main ─────────────────────────────────────────────────────────────

console.log(`\nPizz Tremolo MIDI Ingestion`);
console.log(`  Input: ${inputPath}`);
console.log(`  Gap threshold: ${gapThresholdMs} ms`);
console.log(`  Label: ${label}`);
console.log('');

// Parse MIDI
const { allNoteEvents } = parseMidiFile(inputPath);
console.log(`  Raw note events: ${allNoteEvents.length}`);

// Pair note-ons with note-offs
const pairedNotes = pairNotes(allNoteEvents);
console.log(`  Paired notes: ${pairedNotes.length}`);

if (pairedNotes.length === 0) {
    console.error('Error: No note pairs found in MIDI file');
    process.exit(1);
}

// Log pitch info (informational — pitch is discarded in DB)
const pitchCounts = {};
for (const n of pairedNotes) {
    pitchCounts[n.midiNote] = (pitchCounts[n.midiNote] || 0) + 1;
}
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
console.log(`  Pitches found (informational, discarded in DB):`);
for (const [midi, count] of Object.entries(pitchCounts)) {
    const note = noteNames[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    console.log(`    ${note}${oct} (MIDI ${midi}): ${count} notes`);
}

// Split into bursts
const bursts = splitIntoBursts(pairedNotes, gapThresholdMs);
console.log(`\n  Bursts detected: ${bursts.length} (gap threshold: ${gapThresholdMs} ms)`);
for (let i = 0; i < bursts.length; i++) {
    const b = bursts[i];
    const dur = b[b.length - 1].offsetMs - b[0].onsetMs;
    console.log(`    Burst ${i}: ${b.length} notes, ${Math.round(dur)} ms`);
}

// Load or create database
let db;
const dbExists = fs.existsSync(dbPath);

if (mode === 'new' || (mode === 'auto' && !dbExists)) {
    db = {
        type: 'pizz_tremolo_timing_db',
        version: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        description: 'Pizzicato tremolo note-on/off timing and velocity database. Pitch-agnostic — only timing and dynamics are stored.',
        gapThresholdMs,
        ingestions: [],
        segments: []
    };
    if (dbExists && mode === 'new') {
        console.log(`\n  Mode: NEW (overwriting existing database)`);
    } else {
        console.log(`\n  Mode: NEW (creating database)`);
    }
} else {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`\n  Mode: APPEND (existing database has ${db.segments.length} segments)`);
}

// Determine starting segment index
const startIndex = db.segments.length;

// Convert bursts to segments
const newSegments = [];
for (let i = 0; i < bursts.length; i++) {
    const segment = burstToSegment(bursts[i], startIndex + i, label);
    if (segment) newSegments.push(segment);
}

// Record ingestion metadata
db.ingestions.push({
    timestamp: new Date().toISOString(),
    source: label,
    inputFile: path.basename(inputPath),
    gapThresholdMs,
    rawNoteEvents: allNoteEvents.length,
    pairedNotes: pairedNotes.length,
    burstsDetected: bursts.length,
    segmentsAdded: newSegments.length,
    segmentIndexRange: newSegments.length > 0 ? [newSegments[0].segmentIndex, newSegments[newSegments.length - 1].segmentIndex] : []
});

// Add segments
db.segments.push(...newSegments);
db.updated = new Date().toISOString();

// Compute global stats
const allSegmentNotes = db.segments.flatMap(s => s.notes);
const allDurations = allSegmentNotes.map(n => n.durationMs);
const allVelocities = allSegmentNotes.map(n => n.velocity);
const allGaps = allSegmentNotes.filter(n => n.gapBeforeMs > 0).map(n => n.gapBeforeMs);
const avgArr = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

db.globalStats = {
    totalSegments: db.segments.length,
    totalNotes: allSegmentNotes.length,
    noteDuration: {
        avgMs: Math.round(avgArr(allDurations) * 100) / 100,
        minMs: allDurations.length ? Math.round(Math.min(...allDurations) * 100) / 100 : 0,
        maxMs: allDurations.length ? Math.round(Math.max(...allDurations) * 100) / 100 : 0
    },
    velocity: {
        avg: Math.round(avgArr(allVelocities)),
        min: allVelocities.length ? Math.min(...allVelocities) : 0,
        max: allVelocities.length ? Math.max(...allVelocities) : 0
    },
    gap: {
        avgMs: Math.round(avgArr(allGaps) * 100) / 100,
        minMs: allGaps.length ? Math.round(Math.min(...allGaps) * 100) / 100 : 0,
        maxMs: allGaps.length ? Math.round(Math.max(...allGaps) * 100) / 100 : 0
    }
};

// Ensure output directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Write database
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

console.log(`\n  Database written: ${dbPath}`);
console.log(`  Total segments: ${db.segments.length}`);
console.log(`  Total notes: ${db.globalStats.totalNotes}`);
console.log(`  Global stats:`);
console.log(`    Note duration: avg ${db.globalStats.noteDuration.avgMs}ms, min ${db.globalStats.noteDuration.minMs}ms, max ${db.globalStats.noteDuration.maxMs}ms`);
console.log(`    Velocity: avg ${db.globalStats.velocity.avg}, min ${db.globalStats.velocity.min}, max ${db.globalStats.velocity.max}`);
console.log(`    Gap between notes: avg ${db.globalStats.gap.avgMs}ms, min ${db.globalStats.gap.minMs}ms, max ${db.globalStats.gap.maxMs}ms`);
console.log(`\nDone.`);
