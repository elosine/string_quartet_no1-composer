/**
 * Go-Time Generator Algorithm
 * 
 * Generates a series of event times within a duration, where the density
 * increases (gaps shrink) according to a scale ramp.
 * 
 * Scale-to-gap formula (linear interpolation):
 *   gap(scale) = 2.0 + (scale - 1) * (0.15 - 2.0) / 9
 *   i.e. scale 1 → 2.0s gap, scale 10 → 0.15s gap
 * 
 * The scale ramps linearly from startScale to endScale over the duration.
 * Each gap gets ±noise jitter (default ±12%).
 * 
 * Two-level structure:
 *   Level 1 (L1): Primary go-times spaced by the scale ramp.
 *   Level 2 (L2): Cascade sub-events after each L1, with tight gaps (0.12–0.19s).
 * 
 * Track distribution (tracks 1–4):
 *   L1 track: 'first-go' (track 1 starts first, then random) or 'random'.
 *   L2 tracks: remaining tracks randomly shuffled among cascade sub-events.
 *   Per-track cooldown: 0.15s (LRU fallback if all tracks in cooldown).
 * 
 * Usage:
 *   node generate_go_times.js <duration> <startScale> <endScale> [noisePercent] [offsetSeconds] [cascadeCount] [trackMode]
 * 
 * Examples:
 *   node generate_go_times.js 24.5 4 10                    (L1 only)
 *   node generate_go_times.js 24.5 4 10 12 0 3             (L1 + 3 L2, no track assignment)
 *   node generate_go_times.js 24.5 4 10 12 0 3 random      (with random track distribution)
 *   node generate_go_times.js 24.5 4 10 12 0 3 first-go    (track 1 gets first L1)
 */

// ── CORE ALGORITHM ──────────────────────────────────────────────

/**
 * Linear interpolation: maps a scale value (1–10) to a gap in seconds.
 *   scale 1  → 2.00s
 *   scale 10 → 0.15s
 * Works for any fractional scale value.
 */
function scaleToGap(scale) {
    const minScale = 1, maxScale = 10;
    const gapAtMin = 2.0, gapAtMax = 0.15;
    return gapAtMin + (scale - minScale) * (gapAtMax - gapAtMin) / (maxScale - minScale);
}

/**
 * Generate Level 1 go-times.
 * @param {object} params
 * @param {number} params.duration     - Total time window in seconds
 * @param {number} params.startScale   - Scale value at t=0 (1–10)
 * @param {number} params.endScale     - Scale value at t=duration (1–10)
 * @param {number} [params.noisePercent=12] - ± jitter as percentage of gap (0–50)
 * @param {number} [params.offset=0]   - Seconds to add to all output times (score offset)
 * @returns {number[]} Array of L1 go-times in seconds
 */
function generateGoTimes(params) {
    const {
        duration,
        startScale,
        endScale,
        noisePercent = 12,
        offset = 0
    } = params;

    const times = [0]; // always start at 0
    let t = 0;

    while (true) {
        const progress = t / duration;
        const scale = startScale + (endScale - startScale) * progress;

        let gap = scaleToGap(scale);
        const noiseFactor = 1 + (Math.random() * 2 - 1) * (noisePercent / 100);
        gap = gap * noiseFactor;
        gap = Math.max(gap, 0.05);

        const nextT = t + gap;
        if (nextT > duration) break;

        times.push(parseFloat(nextT.toFixed(3)));
        t = nextT;
    }

    if (offset !== 0) {
        return times.map(t => parseFloat((t + offset).toFixed(3)));
    }
    return times;
}

/**
 * Generate Level 2 cascade sub-events after each L1 time.
 * Each cascade has `count` sub-events with gaps randomly between
 * cascadeGapMin and cascadeGapMax seconds.
 * 
 * @param {number[]} l1Times         - Array of L1 go-times
 * @param {number} count             - Number of L2 sub-events per L1 event
 * @param {number} [cascadeGapMin=0.12] - Minimum gap between cascade events (seconds)
 * @param {number} [cascadeGapMax=0.19] - Maximum gap between cascade events (seconds)
 * @param {number} [maxTime=Infinity]   - Don't generate L2 events beyond this time
 * @returns {{ l1: number[], l2: number[][], all: {time: number, level: number, l1Index: number}[] }}
 */
function generateCascade(l1Times, count, cascadeGapMin = 0.12, cascadeGapMax = 0.19, maxTime = Infinity) {
    const l2Groups = [];
    const all = [];

    l1Times.forEach((l1t, i) => {
        all.push({ time: l1t, level: 1, l1Index: i });

        const subs = [];
        let prev = l1t;
        for (let j = 0; j < count; j++) {
            const gap = cascadeGapMin + Math.random() * (cascadeGapMax - cascadeGapMin);
            const subT = parseFloat((prev + gap).toFixed(3));
            if (subT > maxTime) break;
            subs.push(subT);
            all.push({ time: subT, level: 2, l1Index: i });
            prev = subT;
        }
        l2Groups.push(subs);
    });

    // Sort all events by time
    all.sort((a, b) => a.time - b.time);

    return { l1: l1Times, l2: l2Groups, all };
}

// ── TRACK DISTRIBUTION ──────────────────────────────────────────

const TRACKS = [1, 2, 3, 4];

/**
 * Shuffle an array in place (Fisher-Yates).
 */
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

/**
 * Assign tracks to L1+L2 cascade events.
 * 
 * Hard cooldown rule: no track can re-articulate within `cooldown` seconds.
 * Option A: If no track is available at the event's time, delay the event
 *           to the earliest moment a track opens up.
 * Plan B:   If the delayed time would reach or pass the next L1 event,
 *           drop the event entirely.
 * 
 * @param {object} cascadeResult  - Output from generateCascade()
 * @param {string} [mode='random'] - 'first-go' (track 1 gets first L1) or 'random'
 * @param {number} [cooldown=0.15] - Min seconds before a track can re-articulate
 * @returns {{ events: {time, level, l1Index, track}[], delayed: number, dropped: number, log: string[] }}
 */
function assignTracks(cascadeResult, mode = 'random', cooldown = 0.15) {
    const { l1, l2 } = cascadeResult;
    const lastUsed = {};  // track → last event time
    TRACKS.forEach(t => lastUsed[t] = -Infinity);
    const events = [];
    const log = [];
    let delayed = 0, dropped = 0;

    /**
     * Find a random available track from candidates at the given time.
     * Returns { track, time } or null if none available on time.
     */
    function findAvailableTrack(candidates, time) {
        const available = candidates.filter(t => (time - lastUsed[t]) >= cooldown);
        if (available.length > 0) {
            return { track: available[Math.floor(Math.random() * available.length)], time };
        }
        return null;
    }

    /**
     * Option A: find the earliest time any candidate track becomes available.
     * Returns { track, time } with the delayed time.
     */
    function findEarliestAvailable(candidates) {
        let earliest = Infinity, bestTrack = null;
        for (const t of candidates) {
            const availAt = lastUsed[t] + cooldown;
            if (availAt < earliest) {
                earliest = availAt;
                bestTrack = t;
            }
        }
        return { track: bestTrack, time: parseFloat(earliest.toFixed(3)) };
    }

    l1.forEach((l1t, i) => {
        const nextL1 = i < l1.length - 1 ? l1[i + 1] : Infinity;

        // ── Assign L1 track ──
        let l1Track;
        if (mode === 'first-go' && i === 0) {
            // First-go mode: track 1 gets the very first L1
            const result = findAvailableTrack([1], l1t);
            l1Track = result ? 1 : 1; // track 1 is always available at t=0
        } else {
            const result = findAvailableTrack([...TRACKS], l1t);
            if (result) {
                l1Track = result.track;
            } else {
                // Delay L1 to earliest available (L1 always fires, never dropped)
                const earliest = findEarliestAvailable([...TRACKS]);
                l1Track = earliest.track;
                if (earliest.time !== l1t) {
                    log.push(`L1 ${i + 1} delayed ${(earliest.time - l1t).toFixed(3)}s → ${earliest.time.toFixed(3)}s [T${l1Track}]`);
                    delayed++;
                }
                // Note: we keep the original l1t in the group structure but record actual fire time
                events.push({ time: earliest.time, level: 1, l1Index: i, track: l1Track, originalTime: l1t, wasDelayed: true });
                lastUsed[l1Track] = earliest.time;
                // Still process L2 events below
                assignL2(i, l1Track, l1t, nextL1);
                return;
            }
        }
        lastUsed[l1Track] = l1t;
        events.push({ time: l1t, level: 1, l1Index: i, track: l1Track });

        assignL2(i, l1Track, l1t, nextL1);
    });

    function assignL2(groupIndex, l1Track, l1t, nextL1) {
        const remaining = TRACKS.filter(t => t !== l1Track);
        const l2Events = l2[groupIndex] || [];
        const shuffled = shuffle([...remaining]);

        l2Events.forEach((l2t, j) => {
            // Determine candidate pool
            let candidates;
            if (j < shuffled.length) {
                // Prefer the pre-shuffled track, but consider all remaining unused in group
                const usedInGroup = events.filter(e => e.l1Index === groupIndex).map(e => e.track);
                candidates = remaining.filter(t => !usedInGroup.includes(t));
                if (candidates.length === 0) candidates = [...TRACKS];
            } else {
                candidates = [...TRACKS];
            }

            // Try on-time placement
            const onTime = findAvailableTrack(candidates, l2t);
            if (onTime) {
                lastUsed[onTime.track] = l2t;
                events.push({ time: l2t, level: 2, l1Index: groupIndex, track: onTime.track });
                return;
            }

            // Option A: delay to earliest available
            const earliest = findEarliestAvailable(candidates);

            // Plan B: if delayed time >= next L1, drop the event
            if (earliest.time >= nextL1) {
                log.push(`L2 ${String.fromCharCode(97 + j)} of group ${groupIndex + 1} DROPPED at ${l2t.toFixed(3)}s (would delay to ${earliest.time.toFixed(3)}s, next L1 at ${nextL1.toFixed(3)}s)`);
                dropped++;
                return;
            }

            // Accept the delay
            log.push(`L2 ${String.fromCharCode(97 + j)} of group ${groupIndex + 1} delayed ${(earliest.time - l2t).toFixed(3)}s → ${earliest.time.toFixed(3)}s [T${earliest.track}]`);
            delayed++;
            lastUsed[earliest.track] = earliest.time;
            events.push({ time: earliest.time, level: 2, l1Index: groupIndex, track: earliest.track, originalTime: l2t, wasDelayed: true });
        });
    }

    events.sort((a, b) => a.time - b.time);
    return { events, delayed, dropped, log };
}

// ── CLI ─────────────────────────────────────────────────────────

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.log('Usage: node generate_go_times.js <duration> <startScale> <endScale> [noisePercent] [offsetSeconds] [cascadeCount]');
        console.log('  duration     : total time window (seconds)');
        console.log('  startScale   : scale at start (1-10, where 1=sparse/2.0s gaps, 10=dense/0.15s gaps)');
        console.log('  endScale     : scale at end (1-10)');
        console.log('  noisePercent : ± jitter (default 12)');
        console.log('  offsetSeconds: added to all times (default 0)');
        console.log('  cascadeCount : L2 sub-events per L1 event (default 0 = L1 only)');
        console.log('\nScale reference:');
        for (let s = 1; s <= 10; s++) {
            console.log(`  ${s.toString().padStart(2)} → ${scaleToGap(s).toFixed(3)}s`);
        }
        process.exit(0);
    }

    const duration = parseFloat(args[0]);
    const startScale = parseFloat(args[1]);
    const endScale = parseFloat(args[2]);
    const noisePercent = args[3] !== undefined ? parseFloat(args[3]) : 12;
    const offset = args[4] !== undefined ? parseFloat(args[4]) : 0;
    const cascadeCount = args[5] !== undefined ? parseInt(args[5]) : 0;
    const trackMode = args[6] || null;  // 'random' or 'first-go', null = no track assignment

    const l1Times = generateGoTimes({ duration, startScale, endScale, noisePercent, offset });

    console.log(`\n── Go-Time Generator ──`);
    console.log(`Duration: ${duration}s | Scale: ${startScale} → ${endScale} | Noise: ±${noisePercent}% | Offset: ${offset}s`);

    if (cascadeCount > 0) {
        const maxTime = duration + offset;
        const result = generateCascade(l1Times, cascadeCount, 0.12, 0.19, maxTime);
        const totalL2 = result.l2.reduce((sum, g) => sum + g.length, 0);
        console.log(`Cascade: ${cascadeCount} L2 per L1 (gaps 0.12–0.19s)`);

        if (trackMode) {
            // ── WITH TRACK ASSIGNMENT ──
            const { events, delayed: delayedCount, dropped: droppedCount, log: trackLog } = assignTracks(result, trackMode, 0.15);
            console.log(`Track mode: ${trackMode} | Cooldown: 0.15s (hard)`);
            console.log(`Generated ${events.length} events (${delayedCount} delayed, ${droppedCount} dropped)\n`);

            // Print grouped by L1
            l1Times.forEach((l1t, i) => {
                const localT = l1t - offset;
                const progress = localT / duration;
                const scale = startScale + (endScale - startScale) * progress;
                const gap = i > 0 ? (l1t - l1Times[i - 1]).toFixed(3) + 's' : '—';
                const l1Event = events.find(e => e.l1Index === i && e.level === 1);
                const l1Marker = l1Event.wasDelayed ? ' ⏩' : '';
                console.log(`  L1 ${(i + 1).toString().padStart(3)}. ${l1Event.time.toFixed(3)}s  [T${l1Event.track}]  (gap: ${gap}  scale: ${scale.toFixed(1)})${l1Marker}`);
                const l2Evts = events.filter(e => e.l1Index === i && e.level === 2).sort((a, b) => a.time - b.time);
                l2Evts.forEach((e, j) => {
                    const l2gap = j === 0 ? (e.time - l1Event.time).toFixed(3) : (e.time - l2Evts[j - 1].time).toFixed(3);
                    const marker = e.wasDelayed ? ' ⏩' : '';
                    console.log(`    L2 ${String.fromCharCode(97 + j)}. ${e.time.toFixed(3)}s  [T${e.track}]  (+${l2gap}s)${marker}`);
                });
            });

            if (trackLog.length > 0) {
                console.log(`\n── Delay/Drop log (${trackLog.length}) ──`);
                trackLog.forEach(msg => console.log(`  ${msg}`));
            }

            // Per-track summary
            console.log(`\n// Per-track arrays for console script:`);
            for (const tr of TRACKS) {
                const trEvts = events.filter(e => e.track === tr);
                console.log(`const track${tr}Times = [${trEvts.map(e => e.time.toFixed(3)).join(', ')}];  // ${trEvts.length} events`);
            }
            console.log(`const allEvents = ${JSON.stringify(events.map(e => ({ t: +e.time.toFixed(3), tr: e.track, lv: e.level })))};`);

        } else {
            // ── WITHOUT TRACK ASSIGNMENT ──
            console.log(`Generated ${l1Times.length} L1 + ${totalL2} L2 = ${l1Times.length + totalL2} total events\n`);

            l1Times.forEach((l1t, i) => {
                const localT = l1t - offset;
                const progress = localT / duration;
                const scale = startScale + (endScale - startScale) * progress;
                const gap = i > 0 ? (l1t - l1Times[i - 1]).toFixed(3) + 's' : '—';
                console.log(`  L1 ${(i + 1).toString().padStart(3)}. ${l1t.toFixed(3)}s  (gap: ${gap}  scale: ${scale.toFixed(1)})`);
                result.l2[i].forEach((l2t, j) => {
                    const l2gap = j === 0 ? (l2t - l1t).toFixed(3) : (l2t - result.l2[i][j - 1]).toFixed(3);
                    console.log(`    L2 ${String.fromCharCode(97 + j)}. ${l2t.toFixed(3)}s  (+${l2gap}s)`);
                });
            });

            console.log(`\n// Arrays for console script:`);
            console.log(`const l1Times = [${l1Times.map(t => t.toFixed(3)).join(', ')}];`);
            console.log(`const l2Times = [${result.l2.flat().map(t => t.toFixed(3)).join(', ')}];`);
        }
    } else {
        // L1 only output
        console.log(`Generated ${l1Times.length} L1 events:\n`);

        l1Times.forEach((t, i) => {
            const localT = t - offset;
            const progress = localT / duration;
            const scale = startScale + (endScale - startScale) * progress;
            const gap = i > 0 ? (t - l1Times[i - 1]).toFixed(3) : '—';
            console.log(`  ${(i + 1).toString().padStart(3)}. ${t.toFixed(3)}s  (gap: ${typeof gap === 'string' ? gap : gap + 's'}  scale: ${scale.toFixed(1)})`);
        });

        console.log(`\n// Array for console script:`);
        console.log(`const goTimes = [${l1Times.map(t => t.toFixed(1)).join(', ')}];`);
    }
}

module.exports = { generateGoTimes, generateCascade, assignTracks, scaleToGap };
