// clock.js — the server's clock (DESIGN §4; PLAN 9g).
//
// FREE-RUNNING MONOTONIC (process.hrtime), epoch-anchored once at start, never
// slewed: an NTP correction on the server would look to every stand exactly like
// a drifting lie (the kit's finding, RUNNING_LOG 67 finding 3). The same clock
// the kit's server runs, so testkit/js/syncclock.js reads it unchanged.
//
// Milliseconds, fractional. Every stamp the server hands out comes from here.

const HR0 = process.hrtime.bigint();
const EPOCH0 = Date.now();

const now = () => EPOCH0 + Number(process.hrtime.bigint() - HR0) / 1e6;

module.exports = { now, EPOCH0 };
