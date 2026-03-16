#!/usr/bin/env node
/**
 * export_score_midi.js
 *
 * Exports MIDI snippets from a score JSON file as Standard MIDI Files (Format 1).
 * One .mid file per instrument track, with sub-tracks per channel bank
 * (Base, Vibrato, Volume). Empty channel banks are skipped.
 *
 * Usage:
 *   node scripts/export_score_midi.js <score_json_path> [output_dir]
 *
 * Example:
 *   node scripts/export_score_midi.js scores/2295-FinalScore-preVersioning.json midi_exports/
 *
 * Output: 4 files (one per instrument) in the output directory:
 *   Track0_Violin1.mid, Track1_Violin2.mid, Track2_Viola.mid, Track3_Cello.mid
 *
 * Each file is SMF Format 1 with up to 3 sub-tracks:
 *   - Base (channels 0-3): one-shots, CC0, pitch bend
 *   - Vibrato (channels 4-7): CC4, channel pressure
 *   - Volume (channels 8-11): CC7, sustained tone notes
 */

const fs = require('fs');
const path = require('path');

// --- Configuration ---
const TICKS_PER_QUARTER = 480;
const TEMPO_BPM = 120;
const MICROSECONDS_PER_BEAT = Math.round(60000000 / TEMPO_BPM); // 500000 µs

const TRACK_NAMES = ['Violin1', 'Violin2', 'Viola', 'Cello'];

// Channel bank definitions per instrument track
const CHANNEL_BANKS = {
    0: { base: 0, vibrato: 4, volume: 8 },
    1: { base: 1, vibrato: 5, volume: 9 },
    2: { base: 2, vibrato: 6, volume: 10 },
    3: { base: 3, vibrato: 7, volume: 11 }
};

const BANK_LABELS = { base: 'Base', vibrato: 'Vibrato', volume: 'Volume' };

// --- SMF Binary Helpers ---

function writeVarLen(value) {
    const bytes = [];
    let v = value & 0x0FFFFFFF;
    bytes.unshift(v & 0x7F);
    while ((v >>= 7) > 0) {
        bytes.unshift((v & 0x7F) | 0x80);
    }
    return Buffer.from(bytes);
}

function msToTicks(ms) {
    // At 120 BPM, 480 TPQ: 1 beat = 500ms = 480 ticks → 1ms = 0.96 ticks
    return Math.round(ms * TICKS_PER_QUARTER / (60000 / TEMPO_BPM));
}

function buildTrackChunk(events, trackName) {
    const buffers = [];

    // Track name meta event (delta=0)
    const nameBytes = Buffer.from(trackName, 'ascii');
    buffers.push(Buffer.from([0x00, 0xFF, 0x03]));
    buffers.push(writeVarLen(nameBytes.length));
    buffers.push(nameBytes);

    // Sort events by absolute tick time (stable sort preserves insertion order for ties)
    events.sort((a, b) => a.tickTime - b.tickTime);

    let prevTick = 0;
    for (const evt of events) {
        const delta = Math.max(0, evt.tickTime - prevTick);
        buffers.push(writeVarLen(delta));
        buffers.push(Buffer.from(evt.bytes));
        prevTick = evt.tickTime;
    }

    // End of track meta event
    buffers.push(Buffer.from([0x00, 0xFF, 0x2F, 0x00]));

    const trackData = Buffer.concat(buffers);

    // MTrk header
    const header = Buffer.alloc(8);
    header.write('MTrk', 0, 4, 'ascii');
    header.writeUInt32BE(trackData.length, 4);

    return Buffer.concat([header, trackData]);
}

function buildTempoTrack() {
    const buffers = [];

    // Track name
    const name = Buffer.from('Tempo', 'ascii');
    buffers.push(Buffer.from([0x00, 0xFF, 0x03]));
    buffers.push(writeVarLen(name.length));
    buffers.push(name);

    // Time signature: 4/4
    buffers.push(Buffer.from([0x00, 0xFF, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08]));

    // Tempo meta event
    const tempoBytes = Buffer.alloc(3);
    tempoBytes.writeUIntBE(MICROSECONDS_PER_BEAT, 0, 3);
    buffers.push(Buffer.from([0x00, 0xFF, 0x51, 0x03]));
    buffers.push(tempoBytes);

    // End of track
    buffers.push(Buffer.from([0x00, 0xFF, 0x2F, 0x00]));

    const trackData = Buffer.concat(buffers);
    const header = Buffer.alloc(8);
    header.write('MTrk', 0, 4, 'ascii');
    header.writeUInt32BE(trackData.length, 4);

    return Buffer.concat([header, trackData]);
}

function buildSMF(trackChunks) {
    // MThd: format 1, N tracks, TPQ
    const numTracks = trackChunks.length;
    const mthd = Buffer.alloc(14);
    mthd.write('MThd', 0, 4, 'ascii');
    mthd.writeUInt32BE(6, 4);          // header length
    mthd.writeUInt16BE(1, 8);          // format 1
    mthd.writeUInt16BE(numTracks, 10); // number of tracks
    mthd.writeUInt16BE(TICKS_PER_QUARTER, 12);

    return Buffer.concat([mthd, ...trackChunks]);
}

// --- Event Parsing ---

function getStatusByte(event) {
    // data[0] always contains the full status byte (message type + channel)
    if (event.data && event.data.length > 0) {
        return event.data[0];
    }
    return null;
}

function getChannel(event) {
    const status = getStatusByte(event);
    if (status === null) return -1;
    return status & 0x0F;
}

function eventToBytes(event) {
    // data[] contains [statusByte, ...dataBytes]
    // For most messages: [status, byte1, byte2]
    // For channel pressure: [status, byte1]
    // For pitch bend: [status, lsb, msb]
    const data = event.data;
    if (!data || data.length === 0) return null;

    const status = data[0] & 0xF0;

    switch (status) {
        case 0x80: // Note Off: 3 bytes
        case 0x90: // Note On: 3 bytes
        case 0xB0: // Control Change: 3 bytes
        case 0xE0: // Pitch Bend: 3 bytes
            if (data.length >= 3) return [data[0], data[1], data[2]];
            break;
        case 0xD0: // Channel Pressure: 2 bytes
            if (data.length >= 2) return [data[0], data[1]];
            break;
    }

    // Fallback: pass all data bytes as-is
    return data.slice();
}

function classifyEventType(typeName) {
    // Normalize both string and numeric event type identifiers
    if (typeof typeName === 'number') {
        const high = typeName & 0xF0;
        switch (high) {
            case 0x80: return 'noteOff';
            case 0x90: return 'noteOn';
            case 0xB0: return 'controlChange';
            case 0xE0: return 'pitchBend';
            case 0xD0: return 'channelPressure';
        }
        return 'unknown';
    }
    // String type — normalize
    const t = String(typeName).toLowerCase();
    if (t === 'cc' || t === 'controlchange') return 'controlChange';
    if (t === 'noteon') return 'noteOn';
    if (t === 'noteoff') return 'noteOff';
    if (t === 'pitchbend') return 'pitchBend';
    if (t === 'channelpressure') return 'channelPressure';
    return t;
}

// --- Main Export Logic ---

function exportScoreMidi(scorePath, outputDir) {
    console.log(`Reading score: ${scorePath}`);
    const raw = fs.readFileSync(scorePath, 'utf8');
    const score = JSON.parse(raw);

    const snippets = score.databases?.midiSnippets?.snippets;
    if (!snippets || !Array.isArray(snippets)) {
        console.error('No MIDI snippets found in score.');
        process.exit(1);
    }

    console.log(`Found ${snippets.length} MIDI snippets`);

    // Ensure output directory exists
    fs.mkdirSync(outputDir, { recursive: true });

    const summary = [];

    for (let trackIdx = 0; trackIdx < 4; trackIdx++) {
        const trackSnippets = snippets.filter(s => s.trackIndex === trackIdx);
        if (trackSnippets.length === 0) {
            console.log(`Track ${trackIdx} (${TRACK_NAMES[trackIdx]}): no snippets, skipping`);
            continue;
        }

        const banks = CHANNEL_BANKS[trackIdx];
        const channelToBankName = {};
        channelToBankName[banks.base] = 'base';
        channelToBankName[banks.vibrato] = 'vibrato';
        channelToBankName[banks.volume] = 'volume';

        // Collect events per bank
        const bankEvents = { base: [], vibrato: [], volume: [] };
        let totalEvents = 0;
        let skippedEvents = 0;

        for (const snippet of trackSnippets) {
            for (const event of snippet.events) {
                const ch = getChannel(event);
                const bankName = channelToBankName[ch];
                if (!bankName) {
                    // Event on unexpected channel — try to route by channel range
                    if (ch >= 0 && ch <= 3) {
                        bankEvents.base.push(event);
                    } else if (ch >= 4 && ch <= 7) {
                        bankEvents.vibrato.push(event);
                    } else if (ch >= 8 && ch <= 11) {
                        bankEvents.volume.push(event);
                    } else {
                        skippedEvents++;
                    }
                    totalEvents++;
                    continue;
                }
                bankEvents[bankName].push(event);
                totalEvents++;
            }
        }

        // Build MIDI track chunks for non-empty banks
        const trackChunks = [buildTempoTrack()];
        const bankInfo = [];

        for (const [bankName, events] of Object.entries(bankEvents)) {
            if (events.length === 0) continue;

            // Convert to tick-timed byte events
            const midiEvents = [];
            for (const evt of events) {
                const bytes = eventToBytes(evt);
                if (!bytes) continue;
                const tickTime = msToTicks(evt.timeMs);
                midiEvents.push({ tickTime, bytes });
            }

            if (midiEvents.length === 0) continue;

            const label = `${TRACK_NAMES[trackIdx]}-${BANK_LABELS[bankName]}`;
            trackChunks.push(buildTrackChunk(midiEvents, label));
            bankInfo.push(`${BANK_LABELS[bankName]}(${midiEvents.length} events)`);
        }

        if (trackChunks.length <= 1) {
            console.log(`Track ${trackIdx} (${TRACK_NAMES[trackIdx]}): all banks empty after conversion, skipping`);
            continue;
        }

        // Write SMF file
        const smfBuffer = buildSMF(trackChunks);
        const filename = `Track${trackIdx}_${TRACK_NAMES[trackIdx]}.mid`;
        const outPath = path.join(outputDir, filename);
        fs.writeFileSync(outPath, smfBuffer);

        const info = `Track ${trackIdx} (${TRACK_NAMES[trackIdx]}): ${trackSnippets.length} snippets, ${totalEvents} events → ${filename} [${bankInfo.join(', ')}]`;
        console.log(info);
        if (skippedEvents > 0) console.log(`  (${skippedEvents} events on unexpected channels skipped)`);
        summary.push(info);
    }

    console.log('\n--- Export Complete ---');
    summary.forEach(s => console.log(s));
    console.log(`Output: ${outputDir}`);
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length < 1) {
    console.log('Usage: node scripts/export_score_midi.js <score_json_path> [output_dir]');
    console.log('Example: node scripts/export_score_midi.js scores/2295-FinalScore-preVersioning.json midi_exports/');
    process.exit(1);
}

const scorePath = args[0];
const outputDir = args[1] || path.join(path.dirname(scorePath), 'midi_export');

if (!fs.existsSync(scorePath)) {
    console.error(`Score file not found: ${scorePath}`);
    process.exit(1);
}

exportScoreMidi(scorePath, outputDir);
