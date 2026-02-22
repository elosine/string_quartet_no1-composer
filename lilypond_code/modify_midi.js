// General-purpose MIDI post-processor for LilyPond-rendered MIDI files.
// Rewrites all channel voice events to a specified MIDI channel and
// inserts CC messages at tick 0 and/or at specific note positions.
//
// Usage:
//   node modify_midi.js <input.mid> <output.mid> <channel> [--cc <num> <val>] ... [--map <file.json>]
//
// Arguments:
//   input.mid   — source MIDI file (LilyPond output)
//   output.mid  — destination path for modified MIDI
//   channel     — MIDI channel, 0-indexed (track 1→0, track 2→1, track 3→2, track 4→3)
//   --cc        — repeatable; inserts CC <num> with <val> at tick 0
//   --map       — JSON file with per-note CC insertion instructions
//
// JSON map format:
//   {
//     "noteEvents": [
//       { "noteIndex": 0, "cc": [{ "num": 0, "val": 95 }] },
//       { "noteIndex": 1, "cc": [{ "num": 0, "val": 97 }, { "num": 7, "val": 100 }] }
//     ]
//   }
//
//   noteIndex is 0-based and refers to note *groups* — notes at the same
//   tick (e.g. chords) count as one group. CC messages are injected just
//   before the first Note On of the targeted group.
//
//   Optional "vel" field overrides velocity for all notes in the group
//   (e.g. sforzando → 127). Applies to every Note On at that tick.
//
//   Multiple CC types per note are supported for expandability:
//     CC0  — articulation/preset select (e.g. 95=pizz, 97=Bartók pizz)
//     CC7  — volume (e.g. crescendo shaping)
//     Any CC 0–127 can be used.
//
// Examples:
//   Tick-0 only (backward compatible):
//     node modify_midi.js input.mid output.mid 0 --cc 0 97
//
//   Per-note CC from JSON map:
//     node modify_midi.js input.mid output.mid 0 --map instructions.json
//
//   Both (tick-0 CC + per-note CC):
//     node modify_midi.js input.mid output.mid 0 --cc 0 89 --map instructions.json
//
//   Channel-only (no CC insertion):
//     node modify_midi.js input.mid output.mid 1

const fs = require('fs');

// ── Parse arguments ──────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node modify_midi.js <input.mid> <output.mid> <channel> [--cc <num> <val>] ... [--map <file.json>]');
    process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const midiChannel = parseInt(args[2], 10);

if (isNaN(midiChannel) || midiChannel < 0 || midiChannel > 15) {
    console.error('Error: channel must be 0-15');
    process.exit(1);
}

// Collect --cc pairs and --map file
const ccMessages = [];
let mapFile = null;
let i = 3;
while (i < args.length) {
    if (args[i] === '--cc') {
        if (i + 2 >= args.length) {
            console.error('Error: --cc requires two arguments: <num> <val>');
            process.exit(1);
        }
        const ccNum = parseInt(args[i + 1], 10);
        const ccVal = parseInt(args[i + 2], 10);
        if (isNaN(ccNum) || ccNum < 0 || ccNum > 127) {
            console.error(`Error: CC number must be 0-127, got "${args[i + 1]}"`);
            process.exit(1);
        }
        if (isNaN(ccVal) || ccVal < 0 || ccVal > 127) {
            console.error(`Error: CC value must be 0-127, got "${args[i + 2]}"`);
            process.exit(1);
        }
        ccMessages.push({ num: ccNum, val: ccVal });
        i += 3;
    } else if (args[i] === '--map') {
        if (i + 1 >= args.length) {
            console.error('Error: --map requires a JSON file path');
            process.exit(1);
        }
        mapFile = args[i + 1];
        i += 2;
    } else {
        console.error(`Error: unexpected argument "${args[i]}"`);
        process.exit(1);
    }
}

// Load note event map if provided
const noteEventMap = new Map(); // noteGroupIndex → [{num, val}, ...]
const velocityOverrideMap = new Map(); // noteGroupIndex → velocity (0-127)
if (mapFile) {
    const mapData = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    if (mapData.noteEvents) {
        for (const entry of mapData.noteEvents) {
            if (entry.cc) noteEventMap.set(entry.noteIndex, entry.cc);
            if (entry.vel !== undefined) velocityOverrideMap.set(entry.noteIndex, entry.vel);
        }
    }
}

// ── Read and validate MIDI file ──────────────────────────────────────
const buf = fs.readFileSync(inputPath);

if (buf.toString('ascii', 0, 4) !== 'MThd') {
    console.error('Error: Not a valid MIDI file');
    process.exit(1);
}

const headerLen = buf.readUInt32BE(4);
const format = buf.readUInt16BE(8);
const numTracks = buf.readUInt16BE(10);
const ticksPerBeat = buf.readUInt16BE(12);

console.log(`Input: ${inputPath}`);
console.log(`Format: ${format}, Tracks: ${numTracks}, Ticks/beat: ${ticksPerBeat}`);
console.log(`Target channel: ${midiChannel} (MIDI ch ${midiChannel + 1})`);
if (ccMessages.length > 0) {
    console.log(`CC messages to insert at tick 0:`);
    for (const cc of ccMessages) {
        console.log(`  CC${cc.num} = ${cc.val}`);
    }
} else if (noteEventMap.size === 0) {
    console.log(`No CC messages to insert (channel rewrite only)`);
}
if (noteEventMap.size > 0 || velocityOverrideMap.size > 0) {
    console.log(`Per-note map: ${noteEventMap.size} CC group(s), ${velocityOverrideMap.size} velocity override(s)`);
    const allIndices = new Set([...noteEventMap.keys(), ...velocityOverrideMap.keys()]);
    for (const idx of [...allIndices].sort((a, b) => a - b)) {
        const parts = [];
        if (noteEventMap.has(idx)) parts.push(noteEventMap.get(idx).map(c => `CC${c.num}=${c.val}`).join(', '));
        if (velocityOverrideMap.has(idx)) parts.push(`vel=${velocityOverrideMap.get(idx)}`);
        console.log(`  Note group ${idx}: ${parts.join(', ')}`);
    }
}

// ── Process tracks ───────────────────────────────────────────────────
const outputChunks = [buf.slice(0, 8 + headerLen)];

let pos = 8 + headerLen;
for (let t = 0; t < numTracks; t++) {
    const trackHeader = buf.toString('ascii', pos, pos + 4);
    if (trackHeader !== 'MTrk') {
        console.error(`Error: Expected MTrk at offset ${pos}, got ${trackHeader}`);
        process.exit(1);
    }
    const trackLen = buf.readUInt32BE(pos + 4);
    const trackStart = pos + 8;
    const trackEnd = trackStart + trackLen;

    if (t === 0) {
        // Track 0 is meta/tempo — copy unchanged
        outputChunks.push(buf.slice(pos, trackEnd));
        pos = trackEnd;
        continue;
    }

    // Track 1+ (note track): rewrite channel + insert CC messages
    const trackData = buf.slice(trackStart, trackEnd);
    const newEvents = [];

    // Insert CC messages at delta 0
    for (const cc of ccMessages) {
        newEvents.push(0x00);  // delta time 0
        newEvents.push(0xB0 | midiChannel, cc.num, cc.val);
    }

    // Parse and rewrite existing events, injecting per-note CC from map
    let tPos = 0;
    let absoluteTick = 0;
    let noteGroupIndex = -1;
    let lastNoteOnTick = -1;
    while (tPos < trackData.length) {
        // Read variable-length delta time
        let delta = 0;
        let deltaBytes = [];
        while (tPos < trackData.length) {
            const b = trackData[tPos];
            deltaBytes.push(b);
            tPos++;
            delta = (delta << 7) | (b & 0x7F);
            if ((b & 0x80) === 0) break;
        }

        absoluteTick += delta;
        if (tPos >= trackData.length) break;

        const statusByte = trackData[tPos];

        if (statusByte === 0xFF) {
            // Meta event — copy as-is
            newEvents.push(...deltaBytes);
            newEvents.push(trackData[tPos++]); // 0xFF
            const metaType = trackData[tPos++];
            newEvents.push(metaType);
            // Read variable-length meta length
            let metaLen = 0;
            let metaLenBytes = [];
            while (tPos < trackData.length) {
                const b = trackData[tPos];
                metaLenBytes.push(b);
                tPos++;
                metaLen = (metaLen << 7) | (b & 0x7F);
                if ((b & 0x80) === 0) break;
            }
            newEvents.push(...metaLenBytes);
            for (let j = 0; j < metaLen; j++) {
                newEvents.push(trackData[tPos++]);
            }
        } else if ((statusByte & 0xF0) === 0x90 && trackData[tPos + 2] > 0) {
            // Note On (velocity > 0) — check for per-note CC injection
            const isNewGroup = (absoluteTick !== lastNoteOnTick);
            if (isNewGroup) {
                noteGroupIndex++;
                lastNoteOnTick = absoluteTick;
            }

            const hasCC = isNewGroup && noteEventMap.has(noteGroupIndex);
            const hasVel = velocityOverrideMap.has(noteGroupIndex);

            if (hasCC) {
                // Inject CC events before this Note On
                const ccList = noteEventMap.get(noteGroupIndex);
                for (let c = 0; c < ccList.length; c++) {
                    newEvents.push(...(c === 0 ? deltaBytes : [0x00]));
                    newEvents.push(0xB0 | midiChannel, ccList[c].num, ccList[c].val);
                }
                // Note On at delta 0 (CC consumed the timing)
                newEvents.push(0x00);
                newEvents.push(0x90 | midiChannel);
                tPos++;
                newEvents.push(trackData[tPos++]); // note number
                const origVel = trackData[tPos++];
                newEvents.push(hasVel ? velocityOverrideMap.get(noteGroupIndex) : origVel);
            } else {
                // No CC map entry — just rewrite channel
                newEvents.push(...deltaBytes);
                newEvents.push(0x90 | midiChannel);
                tPos++;
                newEvents.push(trackData[tPos++]); // note number
                const origVel = trackData[tPos++];
                newEvents.push(hasVel ? velocityOverrideMap.get(noteGroupIndex) : origVel);
            }
        } else if ((statusByte & 0xF0) === 0x90 || (statusByte & 0xF0) === 0x80) {
            // Note Off (0x80) or Note On with velocity 0 — rewrite channel
            newEvents.push(...deltaBytes);
            newEvents.push((statusByte & 0xF0) | midiChannel);
            tPos++;
            newEvents.push(trackData[tPos++]); // note number
            newEvents.push(trackData[tPos++]); // velocity
        } else if ((statusByte & 0xF0) === 0xB0) {
            // Control Change — rewrite channel
            newEvents.push(...deltaBytes);
            newEvents.push(0xB0 | midiChannel);
            tPos++;
            newEvents.push(trackData[tPos++]); // CC number
            newEvents.push(trackData[tPos++]); // CC value
        } else if ((statusByte & 0xF0) === 0xC0 || (statusByte & 0xF0) === 0xD0) {
            // Program Change or Channel Pressure — rewrite channel (1 data byte)
            newEvents.push(...deltaBytes);
            newEvents.push((statusByte & 0xF0) | midiChannel);
            tPos++;
            newEvents.push(trackData[tPos++]);
        } else if ((statusByte & 0xF0) === 0xE0) {
            // Pitch Bend — rewrite channel (2 data bytes)
            newEvents.push(...deltaBytes);
            newEvents.push(0xE0 | midiChannel);
            tPos++;
            newEvents.push(trackData[tPos++]); // LSB
            newEvents.push(trackData[tPos++]); // MSB
        } else {
            // Unknown — copy as-is
            newEvents.push(...deltaBytes);
            newEvents.push(trackData[tPos++]);
        }
    }

    // Build new track chunk
    const newTrackData = Buffer.from(newEvents);
    const newTrackHeader = Buffer.alloc(8);
    newTrackHeader.write('MTrk', 0);
    newTrackHeader.writeUInt32BE(newTrackData.length, 4);
    outputChunks.push(newTrackHeader, newTrackData);

    pos = trackEnd;
}

// ── Write output ─────────────────────────────────────────────────────
const output = Buffer.concat(outputChunks);
fs.writeFileSync(outputPath, output);
console.log(`\nOutput: ${outputPath} (${output.length} bytes)`);
console.log(`  Channel: ${midiChannel} (MIDI ch ${midiChannel + 1})`);
if (ccMessages.length > 0) {
    console.log(`  ${ccMessages.length} CC message(s) inserted at tick 0`);
}
if (noteEventMap.size > 0) {
    console.log(`  ${noteEventMap.size} note group(s) with per-note CC`);
}
