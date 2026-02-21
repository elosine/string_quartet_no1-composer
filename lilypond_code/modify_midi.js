// General-purpose MIDI post-processor for LilyPond-rendered MIDI files.
// Rewrites all channel voice events to a specified MIDI channel and
// inserts one or more CC messages at tick 0.
//
// Usage:
//   node modify_midi.js <input.mid> <output.mid> <channel> [--cc <num> <val>] ...
//
// Arguments:
//   input.mid   — source MIDI file (LilyPond output)
//   output.mid  — destination path for modified MIDI
//   channel     — MIDI channel, 0-indexed (track 1→0, track 2→1, track 3→2, track 4→3)
//   --cc        — repeatable; inserts CC <num> with <val> at tick 0
//
// Examples:
//   Bartók pizzicato (CC0=97, channel 0):
//     node modify_midi.js input.mid output.mid 0 --cc 0 97
//
//   Some other technique (CC0=42 + CC1=64, channel 2):
//     node modify_midi.js input.mid output.mid 2 --cc 0 42 --cc 1 64
//
//   Channel-only (no CC insertion):
//     node modify_midi.js input.mid output.mid 1

const fs = require('fs');

// ── Parse arguments ──────────────────────────────────────────────────
const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node modify_midi.js <input.mid> <output.mid> <channel> [--cc <num> <val>] ...');
    process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const midiChannel = parseInt(args[2], 10);

if (isNaN(midiChannel) || midiChannel < 0 || midiChannel > 15) {
    console.error('Error: channel must be 0-15');
    process.exit(1);
}

// Collect --cc pairs
const ccMessages = [];
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
    } else {
        console.error(`Error: unexpected argument "${args[i]}"`);
        process.exit(1);
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
} else {
    console.log(`No CC messages to insert (channel rewrite only)`);
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

    // Parse and rewrite existing events
    let tPos = 0;
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
        } else if ((statusByte & 0xF0) === 0x90 || (statusByte & 0xF0) === 0x80) {
            // Note On or Note Off — rewrite channel
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
