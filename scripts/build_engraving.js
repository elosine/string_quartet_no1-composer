#!/usr/bin/env node
/**
 * build_engraving.js — Workshop → Engraving Pipeline (Step 1 + Step 2)
 * 
 * Reads a score JSON file and produces:
 *   1. score_data.json   — unified element data (Bucket A)
 *   2. svgs/             — standalone SVG files (Bucket B)
 *   3. summary.json      — validation counts and statistics
 *
 * Usage:
 *   node scripts/build_engraving.js <score.json> [output_dir]
 *   node scripts/build_engraving.js scores/2295-FinalScore-preVersioning.json
 *   node scripts/build_engraving.js scores/2295-FinalScore-preVersioning.json builds/engraving
 */

const fs = require('fs');
const path = require('path');

// ─── CLI Arguments ──────────────────────────────────────────────────────────

const scoreFile = process.argv[2];
const outputDir = process.argv[3] || 'builds/engraving';

if (!scoreFile) {
    console.error('Usage: node scripts/build_engraving.js <score.json> [output_dir]');
    process.exit(1);
}

if (!fs.existsSync(scoreFile)) {
    console.error(`Score file not found: ${scoreFile}`);
    process.exit(1);
}

// ─── Load Score ─────────────────────────────────────────────────────────────

console.log(`\n═══ Build Engraving Pipeline ═══`);
console.log(`Input:  ${scoreFile}`);
console.log(`Output: ${outputDir}\n`);

const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8'));

// ─── Create Output Directories ──────────────────────────────────────────────

fs.mkdirSync(path.join(outputDir, 'svgs'), { recursive: true });

// ─── Step 1: Parse & Extract ────────────────────────────────────────────────

console.log('Step 1: Parse & Extract...');

// Build lookup maps
const curveMap = new Map();
(score.databases?.curves?.curves || []).forEach(c => curveMap.set(c.id, c));

const gcMap = new Map();
(score.databases?.gcs?.gcs || []).forEach(g => gcMap.set(g.id, g));

const svgElementMap = new Map();
(score.svgElements || []).forEach(el => svgElementMap.set(el.id, el));

// ─── Step 2: Unify into Engraving Data Model ───────────────────────────────

console.log('Step 2: Unify data model...');

// Track which SVG IDs are claimed by bundles
const bundledSvgIds = new Set();

// Bundle type definitions — maps bundle source key to its config
const BUNDLE_TYPES = {
    cdBundles:  { name: 'crescendo',       timeField: 'startTime', hasEndTime: true,  curveRef: 'curveId', gcRef: null },
    adBundles:  { name: 'accelDecel',      timeField: 'startTime', hasEndTime: true,  curveRef: 'curveId', gcRef: null },
    ptgBundles: { name: 'pizzTremGliss',   timeField: 'startTime', hasEndTime: true,  curveRef: 'curveId', gcRef: null },
    vibBundles: { name: 'vibrato',         timeField: 'startTime', hasEndTime: true,  curveRef: 'curveId', gcRef: null },
    bpBundles:  { name: 'bartokPizz',      timeField: 'impactTime', hasEndTime: false, curveRef: null,      gcRef: 'gcId' },
    bopBundles: { name: 'bowOverpressure', timeField: 'impactTime', hasEndTime: false, curveRef: null,      gcRef: 'gcId' },
    clbBundles: { name: 'colLegnoBattuto', timeField: 'impactTime', hasEndTime: false, curveRef: null,      gcRef: 'gcId' },
    nfBundles:  { name: 'notationFragment', timeField: 'impactTime', hasEndTime: false, curveRef: null,     gcRef: 'gcId' },
    ptBundles:  { name: 'pizzTrem',        timeField: 'startTime',  hasEndTime: false, curveRef: null,      gcRef: 'gcId' },
};

const unifiedElements = [];

// Process each bundle type
for (const [sourceKey, config] of Object.entries(BUNDLE_TYPES)) {
    const bundles = score[sourceKey]?.bundles || [];
    
    for (const bundle of bundles) {
        const svgId = bundle.svgId;
        const svgEl = svgElementMap.get(svgId);
        
        if (!svgEl) {
            console.warn(`  Warning: ${config.name} bundle ${bundle.id} references svgId ${svgId} — SVG element not found`);
            continue;
        }
        
        bundledSvgIds.add(svgId);
        
        // Build unified record
        const record = {
            id: svgEl.id,
            type: config.name,
            bundleId: bundle.id,
            bundleSource: sourceKey,
            track: svgEl.track,
            
            // Timing
            time: bundle[config.timeField],
            ...(config.hasEndTime && bundle.endTime != null ? { endTime: bundle.endTime } : {}),
            
            // SVG element positioning
            referenceSeconds: svgEl.referenceSeconds,
            offsetSeconds: svgEl.offsetSeconds,
            anchorOffsetX_mm: svgEl.anchorOffsetX_mm,
            offsetYFraction: svgEl.offsetYFraction,
            width: svgEl.width,
            height: svgEl.height,
            scale: svgEl.scale,
            heightFraction: svgEl.heightFraction,
            name: svgEl.name,
            
            // SVG file reference (will be written in Step 3)
            svgFile: `Track${svgEl.track}_${bundle[config.timeField].toFixed(1)}s_${svgEl.id}.svg`,
            
            // Bundle-specific metadata (everything except internal IDs)
            metadata: {}
        };
        
        // Copy all bundle fields as metadata, excluding internal refs
        const excludeKeys = new Set(['id', 'svgId', 'curveId', 'gcId', 'midiSnippetId', 'midiSnippetIds', 'needsRegeneration']);
        for (const [k, v] of Object.entries(bundle)) {
            if (!excludeKeys.has(k)) {
                record.metadata[k] = v;
            }
        }
        
        // Inline curve data if referenced
        if (config.curveRef && bundle[config.curveRef]) {
            const curve = curveMap.get(bundle[config.curveRef]);
            if (curve) {
                record.curve = {
                    id: curve.id,
                    model: curve.model,
                    slope: curve.slope,
                    y1: curve.y1,
                    y2: curve.y2,
                    startSeconds: curve.startSeconds,
                    endSeconds: curve.endSeconds,
                    color: curve.color,
                    fillMode: curve.fillMode,
                    section: curve.section,
                    gTrack: curve.gTrack,
                    tension: curve.tension,
                    // Curve samples for animation
                    ...(curve.curveData ? {
                        curveData: {
                            startTime: curve.curveData.startTime,
                            endTime: curve.curveData.endTime,
                            sampleInterval: curve.curveData.sampleInterval,
                            sampleCount: (curve.curveData.samples || []).length
                        }
                    } : {}),
                    // Glissando pitch data if present
                    ...(curve.glissando ? { glissando: curve.glissando } : {})
                };
                // Store samples separately (they're large arrays)
                if (curve.curveData?.samples?.length) {
                    record.curve.samples = curve.curveData.samples;
                }
            } else {
                console.warn(`  Warning: ${config.name} bundle ${bundle.id} references curveId ${bundle[config.curveRef]} — curve not found`);
            }
        }
        
        // Inline GC data if referenced
        if (config.gcRef && bundle[config.gcRef]) {
            const gc = gcMap.get(bundle[config.gcRef]);
            if (gc) {
                record.gc = {
                    id: gc.id,
                    name: gc.name,
                    impactSeconds: gc.impactSeconds,
                    startSeconds: gc.startSeconds,
                    endSeconds: gc.endSeconds,
                    stiffness: gc.stiffness,
                    damping: gc.damping,
                    ictus: gc.ictus,
                    descentRatio: gc.descentRatio,
                    duration: gc.duration,
                    color: gc.color,
                    gTrack: gc.gTrack
                };
            } else {
                console.warn(`  Warning: ${config.name} bundle ${bundle.id} references gcId ${bundle[config.gcRef]} — GC not found`);
            }
        }
        
        unifiedElements.push(record);
    }
}

// Process unbundled SVG elements
const unbundledElements = [];
for (const svgEl of (score.svgElements || [])) {
    if (bundledSvgIds.has(svgEl.id)) continue;
    
    const absTime = (svgEl.referenceSeconds || 0) + (svgEl.offsetSeconds || 0);
    
    const record = {
        id: svgEl.id,
        type: 'standalone',
        bundleId: null,
        bundleSource: null,
        track: svgEl.track,
        
        // Timing — use referenceSeconds as the primary time
        time: svgEl.referenceSeconds || 0,
        
        // SVG element positioning
        referenceSeconds: svgEl.referenceSeconds,
        offsetSeconds: svgEl.offsetSeconds,
        anchorOffsetX_mm: svgEl.anchorOffsetX_mm,
        offsetYFraction: svgEl.offsetYFraction,
        width: svgEl.width,
        height: svgEl.height,
        scale: svgEl.scale,
        heightFraction: svgEl.heightFraction,
        name: svgEl.name,
        
        // SVG file reference
        svgFile: `Track${svgEl.track}_${absTime.toFixed(1)}s_${svgEl.id}.svg`,
        
        // No bundle metadata for standalone items
        metadata: {}
    };
    
    unbundledElements.push(record);
}

// Combine and sort by time + track
const allElements = [...unifiedElements, ...unbundledElements];
allElements.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    return (a.track || 0) - (b.track || 0);
});

console.log(`  Bundled elements: ${unifiedElements.length}`);
console.log(`  Unbundled elements: ${unbundledElements.length}`);
console.log(`  Total elements: ${allElements.length}`);

// ─── Extract non-SVG visual elements ────────────────────────────────────────

// LineWedges — these are visual elements (wedge-shaped lines on tracks)
const lineWedges = (score.databases?.lineWedges?.lineWedges || []).map(lw => ({
    id: lw.id,
    name: lw.name,
    startSeconds: lw.startSeconds,
    endSeconds: lw.endSeconds,
    gTrack: lw.gTrack,
    color: lw.color,
    section: lw.section,
    nodes: lw.nodes,    // thickness profile
}));

// Badges — static snapshots (no animation in Engraving)
const badges = (score.databases?.badges?.badges || []).map(b => ({
    id: b.id,
    name: b.name,
    type: b.type,
    startSeconds: b.startSeconds,
    gTrack: b.gTrack,
    alignment: b.alignment,
    // svgContent would be captured separately if present
    hasSvgContent: !!(b.svgContent && b.svgContent.length > 0),
}));

// Motive groups — visual grouping rectangles
const motiveGroups = (score.databases?.motiveGroups?.groups || []).map(g => ({
    id: g.id,
    name: g.name,
    startSeconds: g.startSeconds,
    endSeconds: g.endSeconds,
    gTrack: g.gTrack,
    color: g.color,
    section: g.section,
    motiveIds: g.motiveIds,
}));

// Unbundled curves (visual-only — curves that are rendered on screen but not part of a bundle)
// Exclude orphans (no track or zero times)
const bundledCurveIds = new Set();
for (const el of unifiedElements) {
    if (el.curve) bundledCurveIds.add(el.curve.id);
}

const standaloneCurves = (score.databases?.curves?.curves || [])
    .filter(c => !bundledCurveIds.has(c.id))
    .filter(c => c.gTrack && (c.startSeconds > 0 || c.endSeconds > 0)) // exclude orphans
    .map(c => ({
        id: c.id,
        name: c.name,
        model: c.model,
        slope: c.slope,
        y1: c.y1,
        y2: c.y2,
        startSeconds: c.startSeconds,
        endSeconds: c.endSeconds,
        gTrack: c.gTrack,
        color: c.color,
        fillMode: c.fillMode,
        section: c.section,
        tension: c.tension,
        ...(c.glissando ? { glissando: c.glissando } : {}),
        ...(c.curveData?.samples?.length ? {
            curveData: {
                startTime: c.curveData.startTime,
                endTime: c.curveData.endTime,
                sampleInterval: c.curveData.sampleInterval,
                sampleCount: c.curveData.samples.length
            },
            samples: c.curveData.samples
        } : {})
    }));

// Unbundled GCs (visual-only — GC objects not referenced by any bundle)
const bundledGcIds = new Set();
for (const el of unifiedElements) {
    if (el.gc) bundledGcIds.add(el.gc.id);
}

const standaloneGCs = (score.databases?.gcs?.gcs || [])
    .filter(g => !bundledGcIds.has(g.id))
    .filter(g => g.impactSeconds > 0) // exclude orphans
    .map(g => ({
        id: g.id,
        name: g.name,
        impactSeconds: g.impactSeconds,
        startSeconds: g.startSeconds,
        endSeconds: g.endSeconds,
        stiffness: g.stiffness,
        damping: g.damping,
        ictus: g.ictus,
        descentRatio: g.descentRatio,
        duration: g.duration,
        color: g.color,
        gTrack: g.gTrack
    }));

console.log(`  LineWedges: ${lineWedges.length}`);
console.log(`  Badges: ${badges.length}`);
console.log(`  Motive groups: ${motiveGroups.length}`);
console.log(`  Standalone curves: ${standaloneCurves.length}`);
console.log(`  Standalone GCs: ${standaloneGCs.length}`);

// ─── Extract score config ───────────────────────────────────────────────────

const scoreConfig = {
    title: score.metadata?.title || 'Untitled',
    created: score.metadata?.created,
    modified: score.metadata?.modified,
    tempoHistory: score.tempoHistory || [],
    cursorState: score.cursorState || {},
    trackCount: 4,
};

// Compute total duration from all elements
let maxTime = 0;
for (const el of allElements) {
    const t = el.endTime || el.time || 0;
    if (t > maxTime) maxTime = t;
}
for (const lw of lineWedges) {
    if (lw.endSeconds > maxTime) maxTime = lw.endSeconds;
}
for (const c of standaloneCurves) {
    if (c.endSeconds > maxTime) maxTime = c.endSeconds;
}
scoreConfig.totalDurationSeconds = maxTime;

console.log(`  Total duration: ${maxTime.toFixed(1)}s`);

// ─── Step 3: Compute Layout & Timeline ──────────────────────────────────────

console.log('\nStep 3: Compute layout & timeline...');

// Layout parameters (from Workshop: GraphicTimeline, StaffPositions, SVGElementManager)
const tempo = score.tempoHistory?.[0] || { bpm: 60, beatsPerPage: 8 };
const beatsPerPage = tempo.beatsPerPage || 8;
const beatsPerMinute = tempo.bpm || 60;
const leadInSeconds = score.cursorState?.leadInSeconds || 2;
const secondsPerPage = (beatsPerPage / beatsPerMinute) * 60;
const timelineHeight = 8;  // px — matches StaffPositions.timelineHeight

const layout = {
    beatsPerPage,
    beatsPerMinute,
    leadInSeconds,
    secondsPerPage,
    timelineHeight,
    trackCount: 4,
    // Track Y layout: 4 equal tracks below timeline
    // At render time: staffHeight = (scoreHeight - timelineHeight) / 4
    // Track N Y position = timelineHeight + (N-1) * staffHeight
    // These are ratios, not pixels, since score height varies with viewport
    trackLayout: {
        description: 'Y positions are computed at render time from scoreHeight',
        formula: 'staffHeight = (scoreHeight - timelineHeight) / 4; trackY = timelineHeight + (trackIndex) * staffHeight',
    },
};

// Pre-compute page/section/xPercent for each element
// This matches SVGElementManager.calcPixelPosition() from the Workshop
function calcPageLayout(refSeconds, offSeconds) {
    let displayTime = (refSeconds || 0) + (offSeconds || 0) + leadInSeconds;
    
    // Clamp: if negative offset pulls element onto previous page, clamp to page start
    if ((offSeconds || 0) < 0) {
        const refDisplayTime = (refSeconds || 0) + leadInSeconds;
        const refPage = Math.floor(Math.max(0, refDisplayTime) / secondsPerPage);
        const pageStartTime = refPage * secondsPerPage;
        if (displayTime < pageStartTime) {
            displayTime = pageStartTime;
        }
    }
    
    const page = Math.floor(Math.max(0, displayTime) / secondsPerPage);
    const section = page % 2 === 0 ? 'top' : 'bottom';
    const xPercent = ((displayTime / secondsPerPage) - page) * 100;
    
    return { page, section, xPercent: Math.round(xPercent * 1000) / 1000 };
}

// Add layout data to each element
for (const el of allElements) {
    const pos = calcPageLayout(el.referenceSeconds, el.offsetSeconds);
    el.page = pos.page;
    el.section = pos.section;
    el.xPercent = pos.xPercent;
}

// Add layout data to lineWedges
for (const lw of lineWedges) {
    const startPos = calcPageLayout(lw.startSeconds, 0);
    const endPos = calcPageLayout(lw.endSeconds, 0);
    lw.startPage = startPos.page;
    lw.startSection = startPos.section;
    lw.startXPercent = startPos.xPercent;
    lw.endPage = endPos.page;
    lw.endSection = endPos.section;
    lw.endXPercent = endPos.xPercent;
}

// Add layout data to standalone curves
for (const c of standaloneCurves) {
    const startPos = calcPageLayout(c.startSeconds, 0);
    const endPos = calcPageLayout(c.endSeconds, 0);
    c.startPage = startPos.page;
    c.startSection = startPos.section;
    c.startXPercent = startPos.xPercent;
    c.endPage = endPos.page;
    c.endSection = endPos.section;
    c.endXPercent = endPos.xPercent;
}

// Add layout data to standalone GCs
for (const g of standaloneGCs) {
    const pos = calcPageLayout(g.impactSeconds, 0);
    g.page = pos.page;
    g.section = pos.section;
    g.xPercent = pos.xPercent;
}

// Add layout data to badges
for (const b of badges) {
    const pos = calcPageLayout(b.startSeconds, 0);
    b.page = pos.page;
    b.section = pos.section;
    b.xPercent = pos.xPercent;
}

// Compute total page count
const totalPages = Math.ceil((maxTime + leadInSeconds) / secondsPerPage);
layout.totalPages = totalPages;

// Build page index: which elements are on each page
const pageIndex = {};
for (const el of allElements) {
    const p = el.page;
    if (!pageIndex[p]) pageIndex[p] = [];
    pageIndex[p].push(el.id);
}

console.log(`  Seconds per page: ${secondsPerPage}s`);
console.log(`  Lead-in: ${leadInSeconds}s`);
console.log(`  Total pages: ${totalPages}`);
console.log(`  Pages with elements: ${Object.keys(pageIndex).length}`);

// Spot-check: element distribution across sections
const topCount = allElements.filter(e => e.section === 'top').length;
const bottomCount = allElements.filter(e => e.section === 'bottom').length;
console.log(`  Elements on top: ${topCount} | bottom: ${bottomCount}`);

// ─── Assemble score_data.json ───────────────────────────────────────────────

const scoreData = {
    version: '1.0',
    generatedFrom: path.basename(scoreFile),
    generatedAt: new Date().toISOString(),
    config: scoreConfig,
    layout: layout,
    pageIndex: pageIndex,
    elements: allElements,
    lineWedges: lineWedges,
    badges: badges,
    motiveGroups: motiveGroups,
    standaloneCurves: standaloneCurves,
    standaloneGCs: standaloneGCs,
};

// Write score_data.json
const scoreDataPath = path.join(outputDir, 'score_data.json');
fs.writeFileSync(scoreDataPath, JSON.stringify(scoreData, null, 2));
const scoreDataSize = fs.statSync(scoreDataPath).size;
console.log(`\nStep 2 complete: ${scoreDataPath} (${(scoreDataSize / 1024 / 1024).toFixed(2)} MB)`);

// ─── Step 4: Export SVGs ────────────────────────────────────────────────────

console.log('\nStep 4: Export SVG files...');

let svgExportCount = 0;
let svgExportErrors = 0;

for (const el of allElements) {
    const svgEl = svgElementMap.get(el.id);
    if (!svgEl || !svgEl.svgDataUrl) {
        svgExportErrors++;
        continue;
    }
    
    const dataUrl = svgEl.svgDataUrl;
    let svgContent;
    
    // Decode base64 data URL
    if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
        const base64 = dataUrl.replace('data:image/svg+xml;base64,', '');
        svgContent = Buffer.from(base64, 'base64').toString('utf8');
    } else if (dataUrl.startsWith('data:image/svg+xml;charset=utf-8,') || dataUrl.startsWith('data:image/svg+xml,')) {
        // URL-encoded SVG
        const encoded = dataUrl.replace(/^data:image\/svg\+xml[^,]*,/, '');
        svgContent = decodeURIComponent(encoded);
    } else {
        console.warn(`  Warning: Unknown SVG data URL format for element ${el.id}`);
        svgExportErrors++;
        continue;
    }
    
    const svgPath = path.join(outputDir, 'svgs', el.svgFile);
    fs.writeFileSync(svgPath, svgContent);
    svgExportCount++;
}

console.log(`  SVGs exported: ${svgExportCount}`);
if (svgExportErrors > 0) {
    console.log(`  SVG export errors: ${svgExportErrors}`);
}

// ─── Validation Summary ─────────────────────────────────────────────────────

console.log('\n═══ Validation Summary ═══');

const summary = {
    inputFile: path.basename(scoreFile),
    generatedAt: new Date().toISOString(),
    counts: {
        totalSvgElements: (score.svgElements || []).length,
        bundledElements: unifiedElements.length,
        unbundledElements: unbundledElements.length,
        totalUnifiedElements: allElements.length,
        svgFilesExported: svgExportCount,
        svgExportErrors: svgExportErrors,
        lineWedges: lineWedges.length,
        badges: badges.length,
        motiveGroups: motiveGroups.length,
        standaloneCurves: standaloneCurves.length,
        standaloneGCs: standaloneGCs.length,
        orphanedCurvesExcluded: (score.databases?.curves?.curves || []).length - standaloneCurves.length - bundledCurveIds.size,
        orphanedGCsExcluded: (score.databases?.gcs?.gcs || []).length - standaloneGCs.length - bundledGcIds.size,
    },
    bundleBreakdown: {},
    scoreDataSizeMB: (scoreDataSize / 1024 / 1024).toFixed(2),
    totalDurationSeconds: maxTime,
};

// Bundle breakdown by type
for (const [sourceKey, config] of Object.entries(BUNDLE_TYPES)) {
    summary.bundleBreakdown[config.name] = (score[sourceKey]?.bundles || []).length;
}

// Print summary
console.log(`  Total SVG elements in score: ${summary.counts.totalSvgElements}`);
console.log(`  Bundled: ${summary.counts.bundledElements} | Unbundled: ${summary.counts.unbundledElements}`);
console.log(`  SVG files exported: ${summary.counts.svgFilesExported}`);
console.log(`  LineWedges: ${summary.counts.lineWedges} | Badges: ${summary.counts.badges}`);
console.log(`  Standalone curves: ${summary.counts.standaloneCurves} | Standalone GCs: ${summary.counts.standaloneGCs}`);
console.log(`  Orphaned curves excluded: ${summary.counts.orphanedCurvesExcluded}`);
console.log(`  Orphaned GCs excluded: ${summary.counts.orphanedGCsExcluded}`);
console.log(`  score_data.json size: ${summary.scoreDataSizeMB} MB`);
console.log(`  Duration: ${summary.totalDurationSeconds.toFixed(1)}s`);
console.log(`\nBundle breakdown:`);
for (const [name, count] of Object.entries(summary.bundleBreakdown)) {
    console.log(`    ${name}: ${count}`);
}

// Check: total elements should match input
const elementCountMatch = summary.counts.totalUnifiedElements === summary.counts.totalSvgElements;
console.log(`\n  ✓ Element count check: ${elementCountMatch ? 'PASS' : 'FAIL'} (${summary.counts.totalUnifiedElements} unified vs ${summary.counts.totalSvgElements} in score)`);

// Check: all SVGs exported
const svgCountMatch = summary.counts.svgFilesExported === summary.counts.totalUnifiedElements;
console.log(`  ✓ SVG export check: ${svgCountMatch ? 'PASS' : 'FAIL'} (${summary.counts.svgFilesExported} files vs ${summary.counts.totalUnifiedElements} elements)`);

// Write summary
fs.writeFileSync(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));

// Check: all elements have page assignments
const allHavePages = allElements.every(e => e.page !== undefined && e.section !== undefined);
console.log(`  ✓ Page assignment check: ${allHavePages ? 'PASS' : 'FAIL'}`);

console.log(`\n═══ Pipeline Complete ═══`);
console.log(`Output: ${outputDir}/`);
console.log(`  score_data.json  — ${summary.scoreDataSizeMB} MB (includes layout + page assignments)`);
console.log(`  svgs/            — ${summary.counts.svgFilesExported} files`);
console.log(`  summary.json     — validation data\n`);
