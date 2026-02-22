#!/usr/bin/env node
/**
 * state_tracker.js — Converts a Scheme engraver event log into a CC map
 * for modify_midi.js.
 *
 * Usage:
 *   node state_tracker.js <event-log.json> [--out <output.json>]
 *
 * Input:  JSON event log from midi-logger.ily (array of timestep objects)
 * Output: JSON map compatible with modify_midi.js --map format
 *
 * Each event log entry:
 *   { "moment": "0/1", "notes": ["fs'"], "midiCCZero": 95, "midiVelocity": null }
 *
 * Output format:
 *   {
 *     "source": "state_tracker.js",
 *     "inputFile": "...",
 *     "noteEvents": [
 *       { "noteIndex": 0, "cc": [{ "num": 0, "val": 95 }] },
 *       { "noteIndex": 7, "cc": [{ "num": 0, "val": 95 }], "vel": 127 }
 *     ]
 *   }
 */

const fs = require('fs');
const path = require('path');

// --- Parse arguments ---
const args = process.argv.slice(2);
if (args.length < 1) {
    console.error('Usage: node state_tracker.js <event-log.json> [--out <output.json>]');
    process.exit(1);
}

const inputFile = args[0];
let outputFile = null;

for (let i = 1; i < args.length; i++) {
    if (args[i] === '--out' && i + 1 < args.length) {
        outputFile = args[++i];
    }
}

// --- Read event log ---
let eventLog;
try {
    const raw = fs.readFileSync(inputFile, 'utf8');
    eventLog = JSON.parse(raw);
} catch (e) {
    console.error(`Error reading event log: ${e.message}`);
    process.exit(1);
}

if (!Array.isArray(eventLog)) {
    console.error('Event log must be a JSON array');
    process.exit(1);
}

// --- Build CC map ---
const noteEvents = [];

for (let i = 0; i < eventLog.length; i++) {
    const entry = eventLog[i];
    const noteIndex = i;
    const ccList = [];

    // CC0 from midiCCZero
    if (entry.midiCCZero !== null && entry.midiCCZero !== undefined) {
        ccList.push({ num: 0, val: entry.midiCCZero });
    }

    // Build the note event object
    const noteEvent = { noteIndex };

    if (ccList.length > 0) {
        noteEvent.cc = ccList;
    }

    // Velocity override from midiVelocity
    if (entry.midiVelocity !== null && entry.midiVelocity !== undefined) {
        noteEvent.vel = entry.midiVelocity;
    }

    // Only include entries that have CC or velocity data
    if (noteEvent.cc || noteEvent.vel !== undefined) {
        noteEvents.push(noteEvent);
    }
}

// --- Build output ---
const output = {
    source: 'state_tracker.js',
    inputFile: path.basename(inputFile),
    noteEvents
};

const jsonStr = JSON.stringify(output, null, 2);

if (outputFile) {
    fs.writeFileSync(outputFile, jsonStr + '\n', 'utf8');
    console.log(`CC map written to: ${outputFile}`);
} else {
    // Write to stdout
    console.log(jsonStr);
}

// --- Summary ---
console.error(`\nState tracker summary:`);
console.error(`  Input events: ${eventLog.length}`);
console.error(`  Output note events: ${noteEvents.length}`);

const ccCount = noteEvents.filter(e => e.cc).length;
const velCount = noteEvents.filter(e => e.vel !== undefined).length;
console.error(`  CC injections: ${ccCount}`);
console.error(`  Velocity overrides: ${velCount}`);
