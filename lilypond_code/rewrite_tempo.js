// Rewrite the tempo of a MIDI file by scaling all delta times.
// This physically changes when notes occur so it works in any DAW
// regardless of the DAW's own tempo setting.
//
// Also updates the Set Tempo meta-event for correctness.
//
// Usage:
//   node rewrite_tempo.js <input.mid> <output.mid> <bpm>
//
// Example:
//   node rewrite_tempo.js NotationFragment001-Cello-Mod.mid NF001-100bpm.mid 100

const fs = require('fs');

const args = process.argv.slice(2);
if (args.length < 3) {
    console.error('Usage: node rewrite_tempo.js <input.mid> <output.mid> <bpm>');
    process.exit(1);
}

const inputPath = args[0];
const outputPath = args[1];
const targetBPM = parseFloat(args[2]);

if (isNaN(targetBPM) || targetBPM <= 0) {
    console.error('Error: BPM must be a positive number');
    process.exit(1);
}

const buf = fs.readFileSync(inputPath);

if (buf.toString('ascii', 0, 4) !== 'MThd') {
    console.error('Error: Not a valid MIDI file');
    process.exit(1);
}

const headerLen = buf.readUInt32BE(4);
const numTracks = buf.readUInt16BE(10);
const ticksPerBeat = buf.readUInt16BE(12);

// Detect original BPM from Set Tempo event
let originalBPM = 120; // MIDI default
for (let i = 0; i < buf.length - 5; i++) {
    if (buf[i] === 0xFF && buf[i + 1] === 0x51 && buf[i + 2] === 0x03) {
        const uspb = (buf[i + 3] << 16) | (buf[i + 4] << 8) | buf[i + 5];
        originalBPM = 60000000 / uspb;
        break;
    }
}

const scaleFactor = originalBPM / targetBPM;
const targetUSPB = Math.round(60000000 / targetBPM);

console.log(`Input: ${inputPath}`);
console.log(`Original: ${originalBPM.toFixed(1)} BPM`);
console.log(`Target: ${targetBPM} BPM (scale factor: ${scaleFactor.toFixed(4)})`);
console.log(`Ticks/beat: ${ticksPerBeat}`);

// ── Helper: encode variable-length quantity ──
function encodeVLQ(value) {
    if (value < 0) value = 0;
    const bytes = [];
    bytes.unshift(value & 0x7F);
    value >>= 7;
    while (value > 0) {
        bytes.unshift((value & 0x7F) | 0x80);
        value >>= 7;
    }
    return bytes;
}

// ── Process each track ──
const outputChunks = [buf.slice(0, 8 + headerLen)]; // copy MIDI header

let pos = 8 + headerLen;
for (let t = 0; t < numTracks; t++) {
    const trackHeader = buf.toString('ascii', pos, pos + 4);
    if (trackHeader !== 'MTrk') {
        console.error(`Error: Expected MTrk at offset ${pos}`);
        process.exit(1);
    }
    const trackLen = buf.readUInt32BE(pos + 4);
    const trackStart = pos + 8;
    const trackEnd = trackStart + trackLen;
    const trackData = buf.slice(trackStart, trackEnd);

    const newEvents = [];
    let tPos = 0;

    while (tPos < trackData.length) {
        // Read variable-length delta
        let delta = 0;
        while (tPos < trackData.length) {
            const b = trackData[tPos++];
            delta = (delta << 7) | (b & 0x7F);
            if ((b & 0x80) === 0) break;
        }

        // Scale the delta
        const scaledDelta = Math.round(delta * scaleFactor);
        newEvents.push(...encodeVLQ(scaledDelta));

        if (tPos >= trackData.length) break;

        const statusByte = trackData[tPos];

        if (statusByte === 0xFF) {
            // Meta event
            newEvents.push(trackData[tPos++]); // 0xFF
            const metaType = trackData[tPos++];
            newEvents.push(metaType);
            // Read variable-length meta length
            let metaLen = 0;
            while (tPos < trackData.length) {
                const b = trackData[tPos];
                newEvents.push(b);
                tPos++;
                metaLen = (metaLen << 7) | (b & 0x7F);
                if ((b & 0x80) === 0) break;
            }
            // If Set Tempo, overwrite the 3 data bytes
            if (metaType === 0x51 && metaLen === 3) {
                newEvents.push((targetUSPB >> 16) & 0xFF);
                newEvents.push((targetUSPB >> 8) & 0xFF);
                newEvents.push(targetUSPB & 0xFF);
                tPos += 3; // skip original tempo bytes
            } else {
                for (let j = 0; j < metaLen; j++) {
                    newEvents.push(trackData[tPos++]);
                }
            }
        } else if ((statusByte & 0xF0) === 0xC0 || (statusByte & 0xF0) === 0xD0) {
            // Program Change or Channel Pressure (1 data byte)
            newEvents.push(trackData[tPos++]);
            newEvents.push(trackData[tPos++]);
        } else if ((statusByte & 0x80) !== 0) {
            // All other channel messages (2 data bytes)
            newEvents.push(trackData[tPos++]);
            newEvents.push(trackData[tPos++]);
            newEvents.push(trackData[tPos++]);
        } else {
            // Running status or unknown — copy byte
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

const output = Buffer.concat(outputChunks);
fs.writeFileSync(outputPath, output);
console.log(`\nOutput: ${outputPath} (${output.length} bytes) — ${targetBPM} BPM (ticks scaled ×${scaleFactor.toFixed(4)})`);
