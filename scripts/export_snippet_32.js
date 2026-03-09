#!/usr/bin/env node
// Export MIDI snippet (snippetId 32) from 1025-ReplacePressMidi.json, track 3, at 9.2s
// Writes a standard MIDI file (.mid) with no external dependencies.

const fs = require('fs');
const path = require('path');

// ── Snippet events (from save file, track 3 / channel 2) ──
// All times in ms, normalized to start at 0
const baseTime = 9200;
const events = [
    { deltaMs: 0,       data: [0xB2, 1, 0] },      // CC1=0 (mod reset)
    { deltaMs: 0,       data: [0xB2, 0, 113] },     // CC0=113 (technique)
    { deltaMs: 0,       data: [0xB2, 1, 0] },       // CC1=0 (duplicate)
    { deltaMs: 0,       data: [0x92, 55, 127] },    // noteOn G3 vel=127
    { deltaMs: 2.083,   data: [0xB2, 7, 73] },      // CC7=73 (volume)
    { deltaMs: 2089.583, data: [0xB2, 1, 127] },    // CC1=127
    { deltaMs: 2115.625, data: [0x92, 55, 0] },     // noteOn G3 vel=0 (noteOff)
];

// ── MIDI file constants ──
const TICKS_PER_QUARTER = 480;
const TEMPO_US = 500000; // 120 BPM → 500ms per beat → 1 tick ≈ 1.0417ms

// Convert ms to ticks: ticks = ms / (TEMPO_US/1000 / TICKS_PER_QUARTER)
// = ms / (500 / 480) = ms * 480 / 500 = ms * 0.96
function msToTicks(ms) {
    return Math.round(ms * TICKS_PER_QUARTER / (TEMPO_US / 1000));
}

// Variable-length quantity encoding
function writeVLQ(value) {
    if (value < 0) value = 0;
    const bytes = [];
    bytes.unshift(value & 0x7F);
    value >>= 7;
    while (value > 0) {
        bytes.unshift((value & 0x7F) | 0x80);
        value >>= 7;
    }
    return Buffer.from(bytes);
}

// Build track data
function buildTrack() {
    const chunks = [];

    // Tempo meta event: FF 51 03 <tempo 3 bytes>
    chunks.push(writeVLQ(0)); // delta=0
    chunks.push(Buffer.from([
        0xFF, 0x51, 0x03,
        (TEMPO_US >> 16) & 0xFF,
        (TEMPO_US >> 8) & 0xFF,
        TEMPO_US & 0xFF
    ]));

    // MIDI events
    let lastAbsTick = 0;
    for (const evt of events) {
        const absTick = msToTicks(evt.deltaMs);
        const delta = Math.max(0, absTick - lastAbsTick);
        chunks.push(writeVLQ(delta));
        chunks.push(Buffer.from(evt.data));
        lastAbsTick = absTick;
    }

    // End of track: FF 2F 00
    chunks.push(writeVLQ(0));
    chunks.push(Buffer.from([0xFF, 0x2F, 0x00]));

    return Buffer.concat(chunks);
}

// Build complete MIDI file
function buildMidiFile() {
    const trackData = buildTrack();

    // Header: MThd, length=6, format=0, nTracks=1, ticksPerQuarter
    const header = Buffer.alloc(14);
    header.write('MThd', 0, 'ascii');
    header.writeUInt32BE(6, 4);
    header.writeUInt16BE(0, 8);   // format 0
    header.writeUInt16BE(1, 10);  // 1 track
    header.writeUInt16BE(TICKS_PER_QUARTER, 12);

    // Track chunk: MTrk + length + data
    const trackHeader = Buffer.alloc(8);
    trackHeader.write('MTrk', 0, 'ascii');
    trackHeader.writeUInt32BE(trackData.length, 4);

    return Buffer.concat([header, trackHeader, trackData]);
}

// Write file
const outDir = path.join(__dirname, '..', 'public', 'midi_exports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, 'snippet32_track3_9200ms.mid');
fs.writeFileSync(outPath, buildMidiFile());

console.log(`Exported: ${outPath}`);
console.log(`  Source: 1025-ReplacePressMidi.json, track 3, snippetId 32`);
console.log(`  Time: ${baseTime}ms (9.2s)`);
console.log(`  Events: ${events.length}`);
console.log(`  Channel: 3 (0-indexed: 2)`);
console.log(`  Note: G3 (MIDI 55), vel 127`);
console.log(`  CC0: 113, CC7: 73, CC1: 0→127`);
console.log(`  Duration: ~2116ms`);
