// Audit pitch bend events in glissando notation fragment MIDI files
// Check that pitch bend resets to 0 (8192 / 0x2000) at the end

const fs = require('fs');
const path = require('path');

const MIDI_DIR = path.join(__dirname, '..', 'public', 'midi_files', 'notation_fragments');

// Files to audit: NF004 (Violin) and NF008 (Cello) — both have glissando
const files = fs.readdirSync(MIDI_DIR).filter(f => 
    (f.includes('Fragment004') || f.includes('Fragment008')) && f.endsWith('.mid')
);

function parseMidi(buf) {
    let pos = 0;
    const read = (n) => { const s = buf.slice(pos, pos + n); pos += n; return s; };
    const readUint16 = () => { const v = buf.readUInt16BE(pos); pos += 2; return v; };
    const readUint32 = () => { const v = buf.readUInt32BE(pos); pos += 4; return v; };
    const readVarLen = () => {
        let v = 0;
        while (true) {
            const b = buf[pos++];
            v = (v << 7) | (b & 0x7F);
            if (!(b & 0x80)) break;
        }
        return v;
    };

    // Header
    read(4); // MThd
    readUint32(); // header length
    const format = readUint16();
    const numTracks = readUint16();
    const ticksPerBeat = readUint16();

    const tracks = [];
    for (let t = 0; t < numTracks; t++) {
        read(4); // MTrk
        const trackLen = readUint32();
        const trackEnd = pos + trackLen;
        const events = [];
        let runningStatus = 0;
        let tickAcc = 0;

        while (pos < trackEnd) {
            const delta = readVarLen();
            tickAcc += delta;
            let status = buf[pos];
            
            if (status < 0x80) {
                status = runningStatus;
            } else {
                pos++;
                if (status < 0xF0) runningStatus = status;
            }

            const type = status & 0xF0;
            const ch = status & 0x0F;

            if (type === 0xE0) {
                // Pitch bend
                const lsb = buf[pos++];
                const msb = buf[pos++];
                const value = (msb << 7) | lsb; // 0-16383, center = 8192
                events.push({ tick: tickAcc, type: 'pitchBend', ch, value, cents: Math.round((value - 8192) / 8192 * 200) });
            } else if (type === 0x80 || type === 0x90) {
                const note = buf[pos++];
                const vel = buf[pos++];
                events.push({ tick: tickAcc, type: type === 0x90 && vel > 0 ? 'noteOn' : 'noteOff', ch, note, vel });
            } else if (type === 0xA0 || type === 0xB0) {
                pos += 2;
            } else if (type === 0xC0 || type === 0xD0) {
                pos += 1;
            } else if (status === 0xFF) {
                const metaType = buf[pos++];
                const metaLen = readVarLen();
                pos += metaLen;
            } else if (status === 0xF0 || status === 0xF7) {
                const sysexLen = readVarLen();
                pos += sysexLen;
            }
        }
        tracks.push(events);
    }
    return { format, numTracks, ticksPerBeat, tracks };
}

console.log('=== Pitch Bend Audit for Glissando Fragments ===\n');

for (const file of files) {
    const filePath = path.join(MIDI_DIR, file);
    const buf = fs.readFileSync(filePath);
    const midi = parseMidi(buf);
    
    let totalPB = 0;
    let lastPB = null;
    
    for (const track of midi.tracks) {
        const pbEvents = track.filter(e => e.type === 'pitchBend');
        totalPB += pbEvents.length;
        if (pbEvents.length > 0) {
            lastPB = pbEvents[pbEvents.length - 1];
        }
    }
    
    if (totalPB === 0) {
        console.log(`${file}: NO pitch bend events`);
    } else {
        const resetOk = lastPB && lastPB.value === 8192;
        const status = resetOk ? '✓ RESET OK' : '✗ NOT RESET';
        console.log(`${file}: ${totalPB} PB events, last value=${lastPB.value} (${lastPB.cents > 0 ? '+' : ''}${lastPB.cents} cents) [${status}]`);
    }
}
