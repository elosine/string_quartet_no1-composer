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
//   Optional "gliss" field triggers pitch bend ramp insertion:
//     { "gliss": { "semitones": 1 } }    // +1 = up, -1 = down
//   The script inserts a 20-step linear pitch bend ramp across the note's
//   duration, then resets pitch bend to center (8192) before the next Note On.
//   Synth pitch bend range assumed: ±1 semitone.
//   Fractional semitones supported (e.g. 0.5 = quarter tone).
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
const glissMap = new Map(); // noteGroupIndex → { semitones: number }
if (mapFile) {
    const mapData = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
    if (mapData.noteEvents) {
        for (const entry of mapData.noteEvents) {
            if (entry.cc) noteEventMap.set(entry.noteIndex, entry.cc);
            if (entry.vel !== undefined) velocityOverrideMap.set(entry.noteIndex, entry.vel);
            if (entry.gliss) glissMap.set(entry.noteIndex, entry.gliss);
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
if (noteEventMap.size > 0 || velocityOverrideMap.size > 0 || glissMap.size > 0) {
    console.log(`Per-note map: ${noteEventMap.size} CC group(s), ${velocityOverrideMap.size} velocity override(s), ${glissMap.size} gliss bend(s)`);
    const allIndices = new Set([...noteEventMap.keys(), ...velocityOverrideMap.keys(), ...glissMap.keys()]);
    for (const idx of [...allIndices].sort((a, b) => a - b)) {
        const parts = [];
        if (noteEventMap.has(idx)) parts.push(noteEventMap.get(idx).map(c => `CC${c.num}=${c.val}`).join(', '));
        if (velocityOverrideMap.has(idx)) parts.push(`vel=${velocityOverrideMap.get(idx)}`);
        if (glissMap.has(idx)) parts.push(`gliss=${glissMap.get(idx).semitones}st`);
        console.log(`  Note group ${idx}: ${parts.join(', ')}`);
    }
}

// ── Pitch bend constants ────────────────────────────────────────────
const PITCH_BEND_CENTER = 8192;    // no bend
const PITCH_BEND_MAX = 16383;     // +1 semitone (with ±1 range)
const PITCH_BEND_MIN = 0;         // -1 semitone (with ±1 range)
const GLISS_STEPS = 20;           // resolution of pitch bend ramp

// Helper: encode integer as MIDI variable-length quantity
function encodeVarLen(value) {
    if (value < 0) value = 0;
    const bytes = [];
    bytes.push(value & 0x7F);
    value >>= 7;
    while (value > 0) {
        bytes.push((value & 0x7F) | 0x80);
        value >>= 7;
    }
    bytes.reverse();
    return bytes;
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

    // ── Phase 2: Insert pitch bend ramps for gliss-marked notes ─────
    // Parse Phase 1 output into absolute-tick event list, insert ramps,
    // then re-encode with delta times.
    if (glissMap.size > 0) {
        // 2a. Parse the Phase 1 byte array into an event list with absolute ticks
        const events = [];
        let p2Pos = 0;
        let p2AbsTick = 0;
        const p1Buf = Buffer.from(newEvents);

        while (p2Pos < p1Buf.length) {
            // Read variable-length delta
            let delta = 0;
            while (p2Pos < p1Buf.length) {
                const b = p1Buf[p2Pos++];
                delta = (delta << 7) | (b & 0x7F);
                if ((b & 0x80) === 0) break;
            }
            p2AbsTick += delta;

            if (p2Pos >= p1Buf.length) break;
            const status = p1Buf[p2Pos];

            let eventBytes;
            if (status === 0xFF) {
                // Meta event: 0xFF type varlen data
                const metaStart = p2Pos;
                p2Pos++; // skip 0xFF
                p2Pos++; // skip meta type
                let metaLen = 0;
                while (p2Pos < p1Buf.length) {
                    const b = p1Buf[p2Pos++];
                    metaLen = (metaLen << 7) | (b & 0x7F);
                    if ((b & 0x80) === 0) break;
                }
                p2Pos += metaLen;
                eventBytes = p1Buf.slice(metaStart, p2Pos);
            } else if ((status & 0xF0) === 0xC0 || (status & 0xF0) === 0xD0) {
                // 1 data byte
                eventBytes = p1Buf.slice(p2Pos, p2Pos + 2);
                p2Pos += 2;
            } else if ((status & 0xF0) >= 0x80) {
                // 2 data bytes (Note On/Off, CC, Pitch Bend, etc.)
                eventBytes = p1Buf.slice(p2Pos, p2Pos + 3);
                p2Pos += 3;
            } else {
                // Unknown — skip one byte
                eventBytes = p1Buf.slice(p2Pos, p2Pos + 1);
                p2Pos += 1;
            }

            events.push({ tick: p2AbsTick, bytes: Buffer.from(eventBytes) });
        }

        // 2b. Build note group info: map noteGroupIndex → { noteOnTick, noteOffTick, noteNum }
        const noteGroupInfo = new Map();
        let p2NoteGroupIdx = -1;
        let p2LastNoteOnTick = -1;
        const activeNotes = new Map(); // noteNum → noteGroupIndex

        for (const ev of events) {
            const st = ev.bytes[0] & 0xF0;
            if (st === 0x90 && ev.bytes.length >= 3 && ev.bytes[2] > 0) {
                // Note On
                const isNewGroup = (ev.tick !== p2LastNoteOnTick);
                if (isNewGroup) {
                    p2NoteGroupIdx++;
                    p2LastNoteOnTick = ev.tick;
                }
                const noteNum = ev.bytes[1];
                activeNotes.set(noteNum, p2NoteGroupIdx);
                if (!noteGroupInfo.has(p2NoteGroupIdx)) {
                    noteGroupInfo.set(p2NoteGroupIdx, { noteOnTick: ev.tick, noteOffTick: null, noteNum });
                }
            } else if (st === 0x80 || (st === 0x90 && ev.bytes.length >= 3 && ev.bytes[2] === 0)) {
                // Note Off
                const noteNum = ev.bytes[1];
                if (activeNotes.has(noteNum)) {
                    const groupIdx = activeNotes.get(noteNum);
                    const info = noteGroupInfo.get(groupIdx);
                    if (info && info.noteOffTick === null) {
                        info.noteOffTick = ev.tick;
                    }
                    activeNotes.delete(noteNum);
                }
            }
        }

        // 2c. Insert pitch bend ramps for gliss-marked notes
        const newEventsToInsert = [];

        for (const [groupIdx, glissInfo] of glissMap) {
            const info = noteGroupInfo.get(groupIdx);
            if (!info || info.noteOffTick === null) {
                console.warn(`  Warning: gliss note group ${groupIdx} — could not determine duration, skipping`);
                continue;
            }

            const { noteOnTick, noteOffTick } = info;
            const duration = noteOffTick - noteOnTick;
            if (duration <= 0) {
                console.warn(`  Warning: gliss note group ${groupIdx} — zero/negative duration, skipping`);
                continue;
            }

            const semitones = glissInfo.semitones;
            // Calculate target pitch bend value
            // semitones = +1 → bend from center to max (16383)
            // semitones = -1 → bend from center to min (0)
            // Fractional values scale proportionally
            const bendRange = semitones > 0
                ? (PITCH_BEND_MAX - PITCH_BEND_CENTER)
                : (PITCH_BEND_CENTER - PITCH_BEND_MIN);
            const targetBend = Math.round(PITCH_BEND_CENTER + (semitones * bendRange));
            const clampedTarget = Math.max(PITCH_BEND_MIN, Math.min(PITCH_BEND_MAX, targetBend));

            console.log(`  Gliss group ${groupIdx}: tick ${noteOnTick}→${noteOffTick} (${duration} ticks), bend ${PITCH_BEND_CENTER}→${clampedTarget} (${semitones} st)`);

            // Generate ramp: GLISS_STEPS evenly spaced pitch bend messages
            // Start immediately at note on, last step reaches target at end of note
            for (let step = 0; step < GLISS_STEPS; step++) {
                const t = Math.round(noteOnTick + (step / (GLISS_STEPS - 1)) * (duration - 1));
                const progress = step / (GLISS_STEPS - 1);
                const bendVal = Math.round(PITCH_BEND_CENTER + progress * (clampedTarget - PITCH_BEND_CENTER));
                const lsb = bendVal & 0x7F;
                const msb = (bendVal >> 7) & 0x7F;
                newEventsToInsert.push({
                    tick: t,
                    bytes: Buffer.from([0xE0 | midiChannel, lsb, msb])
                });
            }

            // Reset pitch bend to center at note off tick
            // (before next Note On — avoids audible slide down on next note)
            const centerLsb = PITCH_BEND_CENTER & 0x7F;
            const centerMsb = (PITCH_BEND_CENTER >> 7) & 0x7F;
            newEventsToInsert.push({
                tick: noteOffTick,
                bytes: Buffer.from([0xE0 | midiChannel, centerLsb, centerMsb])
            });
        }

        // 2d. Merge new events into the event list and re-sort by tick
        events.push(...newEventsToInsert);
        // Stable sort: pitch bend resets at noteOff tick should come after the Note Off
        events.sort((a, b) => a.tick - b.tick);

        // 2e. Re-encode event list with delta times
        newEvents.length = 0;
        let prevTick = 0;
        for (const ev of events) {
            const delta = ev.tick - prevTick;
            prevTick = ev.tick;
            const deltaEnc = encodeVarLen(delta);
            for (const db of deltaEnc) newEvents.push(db);
            for (const eb of ev.bytes) newEvents.push(eb);
        }

        console.log(`  Phase 2: inserted ${newEventsToInsert.length} pitch bend events`);
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
if (glissMap.size > 0) {
    console.log(`  ${glissMap.size} note group(s) with pitch bend glissando`);
}
