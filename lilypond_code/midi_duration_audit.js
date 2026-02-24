// Parse all tempo variant MIDI files and extract timing data:
//   - firstNoteOn (seconds from file start)
//   - lastNoteOn (seconds from file start)
//   - lastNoteOff (seconds from file start)
//   - noteOnToNoteOn duration (lastNoteOn - firstNoteOn)
//   - fullDuration (lastNoteOff - firstNoteOn)
//
// Usage: node midi_duration_audit.js
// Reads files from ../public/midi_files/notation_fragments/
// Outputs JSON to stdout

const fs = require('fs');
const path = require('path');

const midiDir = path.join(__dirname, '..', 'public', 'midi_files', 'notation_fragments');

function parseMidiTiming(filePath) {
    const buf = fs.readFileSync(filePath);
    
    if (buf.toString('ascii', 0, 4) !== 'MThd') {
        throw new Error('Not a valid MIDI file');
    }
    
    const headerLen = buf.readUInt32BE(4);
    const numTracks = buf.readUInt16BE(10);
    const ticksPerBeat = buf.readUInt16BE(12);
    
    // Find tempo from Set Tempo meta-event (FF 51 03)
    let microsecondsPerBeat = 1000000; // default 60 BPM
    for (let i = 0; i < buf.length - 5; i++) {
        if (buf[i] === 0xFF && buf[i + 1] === 0x51 && buf[i + 2] === 0x03) {
            microsecondsPerBeat = (buf[i + 3] << 16) | (buf[i + 4] << 8) | buf[i + 5];
            break;
        }
    }
    
    const secondsPerTick = (microsecondsPerBeat / 1000000) / ticksPerBeat;
    const bpm = Math.round(60000000 / microsecondsPerBeat);
    
    // Parse all tracks to find noteOn and noteOff events
    let pos = 8 + headerLen; // skip header chunk
    let firstNoteOnTick = null;
    let lastNoteOnTick = null;
    let lastNoteOffTick = null;
    
    for (let t = 0; t < numTracks; t++) {
        if (pos + 8 > buf.length) break;
        const chunkType = buf.toString('ascii', pos, pos + 4);
        const chunkLen = buf.readUInt32BE(pos + 4);
        
        if (chunkType !== 'MTrk') {
            pos += 8 + chunkLen;
            continue;
        }
        
        const trackStart = pos + 8;
        const trackEnd = trackStart + chunkLen;
        let trackPos = trackStart;
        let absoluteTick = 0;
        let runningStatus = 0;
        
        while (trackPos < trackEnd) {
            // Read variable-length delta time
            let delta = 0;
            let b;
            do {
                b = buf[trackPos++];
                delta = (delta << 7) | (b & 0x7F);
            } while (b & 0x80);
            
            absoluteTick += delta;
            
            // Read event
            let statusByte = buf[trackPos];
            if (statusByte & 0x80) {
                runningStatus = statusByte;
                trackPos++;
            } else {
                statusByte = runningStatus;
            }
            
            const eventType = statusByte & 0xF0;
            
            if (eventType === 0x90) {
                // Note On
                const velocity = buf[trackPos + 1];
                if (velocity > 0) {
                    // Real note on
                    if (firstNoteOnTick === null || absoluteTick < firstNoteOnTick) {
                        firstNoteOnTick = absoluteTick;
                    }
                    if (lastNoteOnTick === null || absoluteTick > lastNoteOnTick) {
                        lastNoteOnTick = absoluteTick;
                    }
                } else {
                    // Note On with velocity 0 = Note Off
                    if (lastNoteOffTick === null || absoluteTick > lastNoteOffTick) {
                        lastNoteOffTick = absoluteTick;
                    }
                }
                trackPos += 2; // pitch + velocity
            } else if (eventType === 0x80) {
                // Note Off
                if (lastNoteOffTick === null || absoluteTick > lastNoteOffTick) {
                    lastNoteOffTick = absoluteTick;
                }
                trackPos += 2;
            } else if (eventType === 0xA0 || eventType === 0xB0 || eventType === 0xE0) {
                trackPos += 2; // 2-byte data
            } else if (eventType === 0xC0 || eventType === 0xD0) {
                trackPos += 1; // 1-byte data
            } else if (statusByte === 0xFF) {
                // Meta event
                const metaType = buf[trackPos++];
                let metaLen = 0;
                do {
                    b = buf[trackPos++];
                    metaLen = (metaLen << 7) | (b & 0x7F);
                } while (b & 0x80);
                trackPos += metaLen;
            } else if (statusByte === 0xF0 || statusByte === 0xF7) {
                // SysEx
                let sysexLen = 0;
                do {
                    b = buf[trackPos++];
                    sysexLen = (sysexLen << 7) | (b & 0x7F);
                } while (b & 0x80);
                trackPos += sysexLen;
            } else {
                // Unknown, skip
                trackPos++;
            }
        }
        
        pos = trackEnd;
    }
    
    if (firstNoteOnTick === null) {
        return null; // No notes found
    }
    
    const firstNoteOnSec = firstNoteOnTick * secondsPerTick;
    const lastNoteOnSec = lastNoteOnTick * secondsPerTick;
    const lastNoteOffSec = lastNoteOffTick ? lastNoteOffTick * secondsPerTick : lastNoteOnSec;
    
    return {
        bpm,
        ticksPerBeat,
        microsecondsPerBeat,
        firstNoteOnTick,
        lastNoteOnTick,
        lastNoteOffTick,
        firstNoteOnSec: Math.round(firstNoteOnSec * 10000) / 10000,
        lastNoteOnSec: Math.round(lastNoteOnSec * 10000) / 10000,
        lastNoteOffSec: Math.round(lastNoteOffSec * 10000) / 10000,
        noteOnSpanSec: Math.round((lastNoteOnSec - firstNoteOnSec) * 10000) / 10000,
        fullDurationSec: Math.round((lastNoteOffSec - firstNoteOnSec) * 10000) / 10000
    };
}

// Read all MIDI files matching the tempo variant pattern
const files = fs.readdirSync(midiDir)
    .filter(f => f.endsWith('bpm.mid'))
    .sort();

const results = {};

for (const file of files) {
    const filePath = path.join(midiDir, file);
    try {
        const timing = parseMidiTiming(filePath);
        results[file] = timing;
        console.error(`${file}: noteOnSpan=${timing.noteOnSpanSec}s, fullDur=${timing.fullDurationSec}s, BPM=${timing.bpm}`);
    } catch (e) {
        console.error(`${file}: ERROR - ${e.message}`);
    }
}

// Output full JSON
console.log(JSON.stringify(results, null, 2));
