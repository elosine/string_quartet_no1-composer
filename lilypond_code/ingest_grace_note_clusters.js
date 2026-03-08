// Grace Note Cluster MIDI Ingestion Script
// Parses a MIDI file with grace note cluster patterns and extracts
// note-on timing + velocity data into a JSON database.
// Durations are discarded — only relative onset times and velocities are stored.
//
// Usage:
//   node ingest_grace_note_clusters.js <input.mid> [options]
//
// Options:
//   --mode=new       Create a new database (default if no DB exists)
//   --mode=append    Append clusters to existing database
//   --db=<path>      Path to database JSON (default: ../public/midi_files/grace_note_cluster_db.json)
//   --gap=<ms>       Gap threshold in ms to split clusters (default: 200)
//   --label=<text>   Label for this ingestion batch (default: source filename)
//
// Examples:
//   node ingest_grace_note_clusters.js "../midi files/grace note figure for sample database.mid"
//   node ingest_grace_note_clusters.js recording2.mid --mode=append --label="session 2"

const fs = require('fs');
const path = require('path');

// ── Parse arguments ──────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 1 || args[0] === '--help') {
    console.log('Usage: node ingest_grace_note_clusters.js <input.mid> [--mode=new|append] [--db=<path>] [--gap=<ms>] [--label=<text>]');
    process.exit(args[0] === '--help' ? 0 : 1);
}

const inputPath = args[0];
let mode = 'auto'; // auto = new if no DB, append if DB exists
let dbPath = path.join(__dirname, '..', 'public', 'midi_files', 'grace_note_cluster_db.json');
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

// ── Extract note-ons only ────────────────────────────────────────────

function extractNoteOns(noteEvents) {
    // Filter to note-on events only, sort by time
    const noteOns = noteEvents
        .filter(e => e.type === 'noteOn')
        .sort((a, b) => a.timeMs - b.timeMs);
    return noteOns;
}

// ── Split into clusters by gap threshold ─────────────────────────────

function splitIntoClusters(noteOns, gapThreshold) {
    if (noteOns.length === 0) return [];

    const clusters = [];
    let currentCluster = [noteOns[0]];

    for (let i = 1; i < noteOns.length; i++) {
        const prev = noteOns[i - 1];
        const curr = noteOns[i];
        const gap = curr.timeMs - prev.timeMs;

        if (gap > gapThreshold) {
            // Large gap — start new cluster
            clusters.push(currentCluster);
            currentCluster = [curr];
        } else {
            currentCluster.push(curr);
        }
    }
    clusters.push(currentCluster);

    return clusters;
}

// ── Convert cluster to relative timing record ────────────────────────

function clusterToRecord(cluster, clusterIndex, sourceLabel) {
    if (cluster.length === 0) return null;

    const clusterStartMs = cluster[0].timeMs;
    const clusterEndMs = cluster[cluster.length - 1].timeMs;

    const notes = cluster.map((noteOn, i) => {
        const relativeOnsetMs = Math.round((noteOn.timeMs - clusterStartMs) * 100) / 100;
        return {
            relativeOnsetMs,
            velocity: noteOn.velocity
        };
    });

    // Verify no duplicate onset times
    const onsetSet = new Set(notes.map(n => n.relativeOnsetMs));
    if (onsetSet.size !== notes.length) {
        console.warn(`  Warning: Cluster ${clusterIndex} has ${notes.length - onsetSet.size} duplicate onset times`);
    }

    return {
        clusterIndex,
        source: sourceLabel,
        noteCount: notes.length,
        totalDurationMs: Math.round((clusterEndMs - clusterStartMs) * 100) / 100,
        stats: {
            velocity: {
                avg: Math.round(notes.reduce((s, n) => s + n.velocity, 0) / notes.length),
                min: Math.min(...notes.map(n => n.velocity)),
                max: Math.max(...notes.map(n => n.velocity))
            }
        },
        notes
    };
}

// ── Main ─────────────────────────────────────────────────────────────

console.log(`\nGrace Note Cluster MIDI Ingestion`);
console.log(`  Input: ${inputPath}`);
console.log(`  Gap threshold: ${gapThresholdMs} ms`);
console.log(`  Label: ${label}`);
console.log('');

// Parse MIDI
const { allNoteEvents } = parseMidiFile(inputPath);
console.log(`  Raw note events: ${allNoteEvents.length}`);

// Extract note-ons only
const noteOns = extractNoteOns(allNoteEvents);
console.log(`  Note-on events: ${noteOns.length}`);

if (noteOns.length === 0) {
    console.error('Error: No note-on events found in MIDI file');
    process.exit(1);
}

// Log pitch info (informational — pitch is discarded in DB)
const pitchCounts = {};
for (const n of noteOns) {
    pitchCounts[n.note] = (pitchCounts[n.note] || 0) + 1;
}
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
console.log(`  Pitches found (informational, discarded in DB):`);
for (const [midi, count] of Object.entries(pitchCounts)) {
    const note = noteNames[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    console.log(`    ${note}${oct} (MIDI ${midi}): ${count} notes`);
}

// Split into clusters
const clusters = splitIntoClusters(noteOns, gapThresholdMs);
console.log(`\n  Clusters detected: ${clusters.length} (gap threshold: ${gapThresholdMs} ms)`);
for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const dur = c[c.length - 1].timeMs - c[0].timeMs;
    console.log(`    Cluster ${i}: ${c.length} notes, ${Math.round(dur)} ms`);
}

// Load or create database
let db;
const dbExists = fs.existsSync(dbPath);

if (mode === 'new' || (mode === 'auto' && !dbExists)) {
    db = {
        type: 'grace_note_cluster_db',
        version: 1,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        description: 'Grace note cluster timing and velocity database. Pitch-agnostic — only relative onset times and velocities are stored. Durations are assigned at generation time.',
        gapThresholdMs,
        ingestions: [],
        clusters: []
    };
    if (dbExists && mode === 'new') {
        console.log(`\n  Mode: NEW (overwriting existing database)`);
    } else {
        console.log(`\n  Mode: NEW (creating database)`);
    }
} else {
    db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    console.log(`\n  Mode: APPEND (existing database has ${db.clusters.length} clusters)`);
}

// Determine starting cluster index
const startIndex = db.clusters.length;

// Convert clusters to records
const newClusters = [];
for (let i = 0; i < clusters.length; i++) {
    const record = clusterToRecord(clusters[i], startIndex + i, label);
    if (record) newClusters.push(record);
}

// Record ingestion metadata
db.ingestions.push({
    timestamp: new Date().toISOString(),
    source: label,
    inputFile: path.basename(inputPath),
    gapThresholdMs,
    rawNoteEvents: allNoteEvents.length,
    noteOnEvents: noteOns.length,
    clustersDetected: clusters.length,
    clustersAdded: newClusters.length,
    clusterIndexRange: newClusters.length > 0 ? [newClusters[0].clusterIndex, newClusters[newClusters.length - 1].clusterIndex] : []
});

// Add clusters
db.clusters.push(...newClusters);
db.updated = new Date().toISOString();

// Compute global stats
const allClusterNotes = db.clusters.flatMap(c => c.notes);
const allVelocities = allClusterNotes.map(n => n.velocity);
const clusterSizes = db.clusters.map(c => c.noteCount);
const clusterDurations = db.clusters.map(c => c.totalDurationMs);
const avgArr = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

db.globalStats = {
    totalClusters: db.clusters.length,
    totalNotes: allClusterNotes.length,
    clusterSize: {
        avg: Math.round(avgArr(clusterSizes) * 100) / 100,
        min: clusterSizes.length ? Math.min(...clusterSizes) : 0,
        max: clusterSizes.length ? Math.max(...clusterSizes) : 0
    },
    clusterDuration: {
        avgMs: Math.round(avgArr(clusterDurations) * 100) / 100,
        minMs: clusterDurations.length ? Math.round(Math.min(...clusterDurations) * 100) / 100 : 0,
        maxMs: clusterDurations.length ? Math.round(Math.max(...clusterDurations) * 100) / 100 : 0
    },
    velocity: {
        avg: Math.round(avgArr(allVelocities)),
        min: allVelocities.length ? Math.min(...allVelocities) : 0,
        max: allVelocities.length ? Math.max(...allVelocities) : 0
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
console.log(`  Total clusters: ${db.clusters.length}`);
console.log(`  Total notes: ${db.globalStats.totalNotes}`);
console.log(`  Global stats:`);
console.log(`    Cluster size: avg ${db.globalStats.clusterSize.avg}, min ${db.globalStats.clusterSize.min}, max ${db.globalStats.clusterSize.max}`);
console.log(`    Cluster duration: avg ${db.globalStats.clusterDuration.avgMs}ms, min ${db.globalStats.clusterDuration.minMs}ms, max ${db.globalStats.clusterDuration.maxMs}ms`);
console.log(`    Velocity: avg ${db.globalStats.velocity.avg}, min ${db.globalStats.velocity.min}, max ${db.globalStats.velocity.max}`);
console.log(`\nDone.`);
