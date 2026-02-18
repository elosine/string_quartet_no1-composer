# Bulk Move Objects in Save Score

**Purpose:** Move all score objects at or after a given time threshold forward or backward by a specified number of seconds.

**Last used:** Feb 18, 2026 — moved all objects ≥135s by -17.4s (170-MoveTo118 → 171-MoveTo118)

---

## Quick Reference

```
THRESHOLD = 135       ← objects at or after this second get moved
DELTA     = -17.4     ← negative = earlier, positive = later
INPUT     = scores/170-MoveTo118.json       ← original (never modified)
OUTPUT    = scores/171-MoveTo118.json       ← working copy with moves applied
START_NUM = 171       ← first output file number (increment from here for additional copies)
```

Change these values for any future bulk move.

---

## Object Types and Time Fields

| Object Type | Location in JSON | Selection Field | Fields to Shift |
|---|---|---|---|
| **Curves** | `databases.curves.curves[]` | `startSeconds >= THRESHOLD` | `startSeconds`, `endSeconds` |
| **Motives** | `databases.motives.motives[]` | `startSeconds >= THRESHOLD` | `startSeconds`, `endSeconds` |
| **MIDI Snippets** | `databases.midiSnippets.snippets[]` | `startSeconds >= THRESHOLD` | `startSeconds`, `endSeconds`, `events[].timeMs` (ms!) |
| **Audio Clips** | `databases.audioClips.clips[]` | `startSeconds >= THRESHOLD` | `startSeconds`, `endSeconds` |
| **GCs** | `databases.gcs.gcs[]` | `startSeconds >= THRESHOLD` | `startSeconds`, `endSeconds`, `impactSeconds` |
| **SVG Elements** | `svgElements[]` | `referenceSeconds >= THRESHOLD` | `referenceSeconds` only (`offsetSeconds` is relative — don't touch) |
| **MIDI Track Events** | `midiTracks[].midiEvents[]` | `snippetId` matches a moved snippet | `timeMs` (ms!), `timestamp` (ms!) |

### Important Notes

- **MIDI snippet internal events** (`events[].timeMs`) use **milliseconds** — multiply DELTA by 1000.
- **MIDI track events** also use **milliseconds** for `timeMs` and `timestamp`.
- **SVG offsetSeconds** is relative to `referenceSeconds` — do NOT shift it.
- **GC impactSeconds** must be shifted along with start/end.
- **Audio clips spanning the boundary** (startSeconds < THRESHOLD but endSeconds > THRESHOLD) are a judgment call. Default: don't move them.

---

## Step-by-Step Process

### Step 1: Copy the original score

```powershell
Copy-Item "scores\INPUT.json" "scores\OUTPUT.json"
```

Always keep the original untouched as a revert point.

**File numbering:** Output files use incrementing numbers starting from `START_NUM`. If you create multiple copies (e.g. wrong direction then correct), increment each time: 162, 163, 164, etc.

**Save menu registration:** After creating the copy, update `metadata.title` inside the JSON to match the new filename. The app's save/load menu (`GET /api/scores`) reads all `.json` files from `scores/` automatically — but the dropdown displays `metadata.title`, so a stale title makes the file hard to find. After running the move script, refresh the score list in the browser (re-open the Load Score dialog or reload the page).

### Step 2: Run the move script

Run from the project root directory. Adjust the three constants at the top:

```javascript
node -e "
const fs = require('fs');
const THRESHOLD = 84;     // seconds — objects at or after this get moved
const DELTA = -56.3;      // seconds — negative=earlier, positive=later
const INPUT = 'scores/145-movedForward.json';  // file to modify IN PLACE

const data = JSON.parse(fs.readFileSync(INPUT,'utf8'));
const db = data.databases;
let log = { curves:0, motives:0, midiSnippets:0, snippetEvents:0, audioClips:0, gcs:0, svgElements:0, trackEvents:0 };

// Curves
for (const c of db.curves.curves) {
  if (c.startSeconds >= THRESHOLD) { c.startSeconds += DELTA; c.endSeconds += DELTA; log.curves++; }
}

// Motives
for (const m of db.motives.motives) {
  if (m.startSeconds >= THRESHOLD) { m.startSeconds += DELTA; m.endSeconds += DELTA; log.motives++; }
}

// MIDI Snippets + internal events
const movedSnippetIds = new Set();
for (const s of db.midiSnippets.snippets) {
  if (s.startSeconds >= THRESHOLD) {
    s.startSeconds += DELTA; s.endSeconds += DELTA;
    if (s.events) for (const e of s.events) { e.timeMs += DELTA*1000; log.snippetEvents++; }
    movedSnippetIds.add(s.id); log.midiSnippets++;
  }
}

// Audio Clips
for (const a of db.audioClips.clips) {
  if (a.startSeconds >= THRESHOLD) { a.startSeconds += DELTA; a.endSeconds += DELTA; log.audioClips++; }
}

// GCs
for (const g of db.gcs.gcs) {
  if (g.startSeconds >= THRESHOLD) { g.startSeconds += DELTA; g.endSeconds += DELTA; g.impactSeconds += DELTA; log.gcs++; }
}

// SVG Elements
for (const s of data.svgElements) {
  if (s.referenceSeconds >= THRESHOLD) { s.referenceSeconds += DELTA; log.svgElements++; }
}

// MIDI Track Events
for (const t of data.midiTracks) {
  for (const e of t.midiEvents) {
    if (movedSnippetIds.has(e.snippetId)) { e.timeMs += DELTA*1000; if (e.timestamp !== undefined) e.timestamp += DELTA*1000; log.trackEvents++; }
  }
}

// Update metadata for save menu registration
const outName = INPUT.replace('scores/','').replace('.json','');
data.metadata.title = outName;
data.metadata.modified = new Date().toISOString();
fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
console.log('MOVE COMPLETE:', JSON.stringify(log, null, 2));
"
```

### Step 3: Run the verification script

Compares the original against the modified file. Every moved object must differ by exactly DELTA; every unmoved object must be identical.

```javascript
node -e "
const fs = require('fs');
const THRESHOLD = 84;
const DELTA = -56.3;
const EPSILON = 0.0001;
const ORIG = 'scores/143-moveAll.json';
const MOD  = 'scores/145-movedForward.json';

const orig = JSON.parse(fs.readFileSync(ORIG,'utf8'));
const mod  = JSON.parse(fs.readFileSync(MOD,'utf8'));
let tests=0, passed=0, fail=false;

function chk(lbl, exp, act) { tests++; if(Math.abs(exp-act)>EPSILON){console.log('FAIL:',lbl,'exp='+exp,'got='+act);fail=true;}else{passed++;}}

// Curves
for(let i=0;i<orig.databases.curves.curves.length;i++){const o=orig.databases.curves.curves[i],m=mod.databases.curves.curves[i];if(o.startSeconds>=THRESHOLD){chk('crv '+o.id+' s',o.startSeconds+DELTA,m.startSeconds);chk('crv '+o.id+' e',o.endSeconds+DELTA,m.endSeconds);}else{chk('crv '+o.id+' s unch',o.startSeconds,m.startSeconds);chk('crv '+o.id+' e unch',o.endSeconds,m.endSeconds);}}

// Motives
for(let i=0;i<orig.databases.motives.motives.length;i++){const o=orig.databases.motives.motives[i],m=mod.databases.motives.motives[i];if(o.startSeconds>=THRESHOLD){chk('mot '+o.id+' s',o.startSeconds+DELTA,m.startSeconds);chk('mot '+o.id+' e',o.endSeconds+DELTA,m.endSeconds);}else{chk('mot '+o.id+' s unch',o.startSeconds,m.startSeconds);chk('mot '+o.id+' e unch',o.endSeconds,m.endSeconds);}}

// MIDI Snippets + events
for(let i=0;i<orig.databases.midiSnippets.snippets.length;i++){const o=orig.databases.midiSnippets.snippets[i],m=mod.databases.midiSnippets.snippets[i];if(o.startSeconds>=THRESHOLD){chk('snp '+o.id+' s',o.startSeconds+DELTA,m.startSeconds);chk('snp '+o.id+' e',o.endSeconds+DELTA,m.endSeconds);for(let j=0;j<o.events.length;j++)chk('snp '+o.id+' ev'+j,o.events[j].timeMs+DELTA*1000,m.events[j].timeMs);}else{chk('snp '+o.id+' s unch',o.startSeconds,m.startSeconds);chk('snp '+o.id+' e unch',o.endSeconds,m.endSeconds);if(o.events)for(let j=0;j<o.events.length;j++)chk('snp '+o.id+' ev'+j+' unch',o.events[j].timeMs,m.events[j].timeMs);}}

// Audio Clips
for(let i=0;i<orig.databases.audioClips.clips.length;i++){const o=orig.databases.audioClips.clips[i],m=mod.databases.audioClips.clips[i];if(o.startSeconds>=THRESHOLD){chk('aud '+o.id+' s',o.startSeconds+DELTA,m.startSeconds);chk('aud '+o.id+' e',o.endSeconds+DELTA,m.endSeconds);}else{chk('aud '+o.id+' s unch',o.startSeconds,m.startSeconds);chk('aud '+o.id+' e unch',o.endSeconds,m.endSeconds);}}

// GCs
for(let i=0;i<orig.databases.gcs.gcs.length;i++){const o=orig.databases.gcs.gcs[i],m=mod.databases.gcs.gcs[i];if(o.startSeconds>=THRESHOLD){chk('gc '+o.id+' s',o.startSeconds+DELTA,m.startSeconds);chk('gc '+o.id+' e',o.endSeconds+DELTA,m.endSeconds);chk('gc '+o.id+' i',o.impactSeconds+DELTA,m.impactSeconds);}else{chk('gc '+o.id+' s unch',o.startSeconds,m.startSeconds);chk('gc '+o.id+' e unch',o.endSeconds,m.endSeconds);chk('gc '+o.id+' i unch',o.impactSeconds,m.impactSeconds);}}

// SVG Elements
for(let i=0;i<orig.svgElements.length;i++){const o=orig.svgElements[i],m=mod.svgElements[i];if(o.referenceSeconds>=THRESHOLD){chk('svg '+o.id+' ref',o.referenceSeconds+DELTA,m.referenceSeconds);chk('svg '+o.id+' off unch',o.offsetSeconds,m.offsetSeconds);}else{chk('svg '+o.id+' ref unch',o.referenceSeconds,m.referenceSeconds);chk('svg '+o.id+' off unch',o.offsetSeconds,m.offsetSeconds);}}

// MIDI Track Events
const moved=new Set(orig.databases.midiSnippets.snippets.filter(s=>s.startSeconds>=THRESHOLD).map(s=>s.id));
for(let t=0;t<orig.midiTracks.length;t++)for(let e=0;e<orig.midiTracks[t].midiEvents.length;e++){const o=orig.midiTracks[t].midiEvents[e],m=mod.midiTracks[t].midiEvents[e];if(moved.has(o.snippetId))chk('trk'+t+' e'+e,o.timeMs+DELTA*1000,m.timeMs);else chk('trk'+t+' e'+e+' unch',o.timeMs,m.timeMs);}

// Formation check
const omc=orig.databases.curves.curves.filter(c=>c.startSeconds>=THRESHOLD).sort((a,b)=>a.startSeconds-b.startSeconds);
const mmc=mod.databases.curves.curves.filter(c=>c.startSeconds>=THRESHOLD+DELTA-1).sort((a,b)=>a.startSeconds-b.startSeconds);
let fOk=true;for(let i=1;i<omc.length;i++){if(Math.abs((omc[i].startSeconds-omc[i-1].startSeconds)-(mmc[i].startSeconds-mmc[i-1].startSeconds))>EPSILON){fOk=false;break;}}

console.log('TESTS:',tests,'PASSED:',passed,'FAILED:',tests-passed);
console.log('FORMATION:',fOk?'PRESERVED':'BROKEN');
console.log((!fail&&fOk)?'ALL PASS ✓':'FAILURES ✗');
"
```

---

## Edge Cases

### Objects spanning the boundary
Audio clips (or any object) that start BEFORE the threshold but end AFTER it are flagged during analysis. Decide per-case:
- **Don't move** (default) — object stays at its original position
- **Move** — shift start+end by delta
- **Extend only** — shift only endSeconds (makes object longer)

### Negative delta safety
If DELTA is negative, verify no object ends up with a negative `startSeconds`. Run this check:
```javascript
// After move, check for negative times
const allStarts = [
  ...db.curves.curves.map(c => c.startSeconds),
  ...db.motives.motives.map(m => m.startSeconds),
  ...db.midiSnippets.snippets.map(s => s.startSeconds),
  ...db.audioClips.clips.map(a => a.startSeconds),
  ...db.gcs.gcs.map(g => g.startSeconds),
  ...data.svgElements.map(s => s.referenceSeconds)
];
const negatives = allStarts.filter(t => t < 0);
if (negatives.length > 0) console.log('WARNING: ' + negatives.length + ' objects have negative start times!');
```

---

## Analysis Script (run before moving)

Use this to survey what will be affected:

```javascript
node -e "
const fs = require('fs');
const THRESHOLD = 84;
const data = JSON.parse(fs.readFileSync('scores/YOUR_FILE.json','utf8'));
const db = data.databases;

const types = [
  { name:'Curves',       items:db.curves.curves,           field:'startSeconds' },
  { name:'Motives',      items:db.motives.motives,         field:'startSeconds' },
  { name:'MIDI Snippets', items:db.midiSnippets.snippets,  field:'startSeconds' },
  { name:'Audio Clips',  items:db.audioClips.clips,        field:'startSeconds' },
  { name:'GCs',          items:db.gcs.gcs,                 field:'startSeconds' },
  { name:'SVG Elements', items:data.svgElements,           field:'referenceSeconds' }
];

for (const t of types) {
  const move = t.items.filter(i => i[t.field] >= THRESHOLD).length;
  const keep = t.items.filter(i => i[t.field] < THRESHOLD).length;
  const span = t.name !== 'SVG Elements' ? t.items.filter(i => i[t.field] < THRESHOLD && i.endSeconds > THRESHOLD).length : 0;
  console.log(t.name + ': ' + move + ' move, ' + keep + ' keep' + (span ? ', ' + span + ' SPANNING' : ''));
}

const movedIds = new Set(db.midiSnippets.snippets.filter(s => s.startSeconds >= THRESHOLD).map(s => s.id));
const evtMove = data.midiTracks.reduce((s,t) => s + t.midiEvents.filter(e => movedIds.has(e.snippetId)).length, 0);
const evtKeep = data.midiTracks.reduce((s,t) => s + t.midiEvents.filter(e => !movedIds.has(e.snippetId)).length, 0);
console.log('MIDI Track Events: ' + evtMove + ' move, ' + evtKeep + ' keep');
"
```

---

## History

| Date | Original | Output | Threshold | Delta | Objects Moved |
|---|---|---|---|---|---|
| 2026-02-18 | 143-moveAll | 144-moveAll | ≥84s | +56.3s | 374 objects + 5435 MIDI events (wrong direction — discarded) |
| 2026-02-18 | 143-moveAll | 145-movedForward | ≥84s | -56.3s | 374 objects + 5435 MIDI events ✓ |
| 2026-02-18 | 161-Mv97plus23_3 | 162-Mv97plus23_3 | ≥97s | +23.3s | 305 objects + 5435 MIDI events (wrong direction — discarded) |
| 2026-02-18 | 161-Mv97plus23_3 | 163-Mv97plus23_3 | ≥97s | -23.3s | 305 objects + 5435 MIDI events ✓ |
| 2026-02-18 | 170-MoveTo118 | 171-MoveTo118 | ≥135s | -17.4s | 38 objects + 2839 MIDI events ✓ |
