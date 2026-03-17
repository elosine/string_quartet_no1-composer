#!/usr/bin/env node
/**
 * compose_pages.js — Page Compositor (Build Step 4/5)
 * 
 * Reads score_data.json + exported SVGs and generates:
 *   - pages/page_NN.svg  — composite page SVGs for print
 *
 * Usage:
 *   node scripts/compose_pages.js [engraving_dir]
 *   node scripts/compose_pages.js builds/engraving
 */

const fs = require('fs');
const path = require('path');

// ─── Config ─────────────────────────────────────────────────────────────────

const engravingDir = process.argv[2] || 'builds/engraving';
const scoreDataPath = path.join(engravingDir, 'score_data.json');
const svgsDir = path.join(engravingDir, 'svgs');
const pagesDir = path.join(engravingDir, 'pages');

if (!fs.existsSync(scoreDataPath)) {
    console.error(`score_data.json not found at: ${scoreDataPath}`);
    console.error('Run build_engraving.js first.');
    process.exit(1);
}

// ─── Page Dimensions ────────────────────────────────────────────────────────

// SVG coordinate space for each page (scales to any print size)
const PAGE_WIDTH = 1200;
const PAGE_HEIGHT = 400;
const TIMELINE_HEIGHT = 20;      // Top area for second ticks
const TRACK_AREA_HEIGHT = PAGE_HEIGHT - TIMELINE_HEIGHT;
const TRACK_HEIGHT = TRACK_AREA_HEIGHT / 4;
const TRACK_COLORS = ['#f5f5f5', '#ebebf0', '#f5f5f5', '#ebebf0'];  // Alternating track bg
const BG_COLOR = '#ffffff';
const GRID_COLOR = '#bbb';
const TICK_COLOR = '#999';
const TICK_LABEL_COLOR = '#666';

// ─── Load Data ──────────────────────────────────────────────────────────────

console.log(`\n═══ Page Compositor ═══`);
console.log(`Input: ${engravingDir}`);

const scoreData = JSON.parse(fs.readFileSync(scoreDataPath, 'utf8'));
const layout = scoreData.layout;
const elements = scoreData.elements;
const standaloneCurves = scoreData.standaloneCurves || [];
const standaloneGCs = scoreData.standaloneGCs || [];
const lineWedges = scoreData.lineWedges || [];
const badges = scoreData.badges || [];

fs.mkdirSync(pagesDir, { recursive: true });

console.log(`Pages to generate: ${layout.totalPages}`);
console.log(`Elements: ${elements.length}`);

// ─── Helper: Get track Y position ──────────────────────────────────────────

function getTrackY(track) {
    // track is 1-4 (from element data) or "1"-"4" (from gTrack)
    const idx = (parseInt(track) || 1) - 1;
    return TIMELINE_HEIGHT + idx * TRACK_HEIGHT;
}

// ─── Helper: XML-escape text ────────────────────────────────────────────────

function escapeXml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
        .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Helper: Read and prepare SVG content for inline embedding ──────────────

function readSvgForEmbed(svgFile) {
    const svgPath = path.join(svgsDir, svgFile);
    if (!fs.existsSync(svgPath)) return null;
    
    let content = fs.readFileSync(svgPath, 'utf8');
    
    // Remove XML declaration if present
    content = content.replace(/<\?xml[^?]*\?>\s*/g, '');
    
    // Extract viewBox, width, height from the outer <svg> tag
    const svgMatch = content.match(/<svg[^>]*>/);
    if (!svgMatch) return null;
    
    const svgTag = svgMatch[0];
    const viewBoxMatch = svgTag.match(/viewBox="([^"]*)"/);
    const widthMatch = svgTag.match(/width="([^"]*)"/);
    const heightMatch = svgTag.match(/height="([^"]*)"/);
    
    // Get the inner content (everything between <svg> and </svg>)
    const innerMatch = content.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
    const innerContent = innerMatch ? innerMatch[1] : '';
    
    return {
        viewBox: viewBoxMatch ? viewBoxMatch[1] : null,
        origWidth: widthMatch ? parseFloat(widthMatch[1]) : null,
        origHeight: heightMatch ? parseFloat(heightMatch[1]) : null,
        inner: innerContent,
        fullTag: svgTag,
    };
}

// ─── Helper: Map color names to hex ─────────────────────────────────────────

const COLOR_MAP = {
    'neonMagenta': '#ff00ff',
    'limeGreen': '#00ff00',
    'brightGreen': '#00ff00',
    'cyan': '#00ffff',
    'neonCyan': '#00ffff',
    'brightYellow': '#ffff00',
    'orange': '#ff8800',
    'red': '#ff0000',
    'white': '#ffffff',
    'blue': '#0088ff',
    'purple': '#aa00ff',
    'pink': '#ff66cc',
    'gold': '#ffd700',
};

function resolveColor(colorName) {
    if (!colorName) return '#333333';
    if (colorName.startsWith('#')) return colorName;
    return COLOR_MAP[colorName] || '#333333';
}

// ─── Helper: Compute seconds-to-X mapping for a page ────────────────────────

function secondsToX(seconds, pageNumber) {
    const displayTime = seconds + layout.leadInSeconds;
    const xFraction = (displayTime / layout.secondsPerPage) - pageNumber;
    return xFraction * PAGE_WIDTH;
}

// ─── Generate Pages ─────────────────────────────────────────────────────────

let pagesGenerated = 0;
let elementsPlaced = 0;
let curvesRendered = 0;
let lineWedgesRendered = 0;

for (let pageNum = 0; pageNum < layout.totalPages; pageNum++) {
    const parts = [];
    
    // SVG header
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" viewBox="0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}">`);
    
    // Background
    parts.push(`<rect width="${PAGE_WIDTH}" height="${PAGE_HEIGHT}" fill="${BG_COLOR}"/>`);
    
    // Track backgrounds (alternating for visual clarity)
    for (let t = 0; t < 4; t++) {
        const ty = getTrackY(t + 1);
        parts.push(`<rect x="0" y="${ty}" width="${PAGE_WIDTH}" height="${TRACK_HEIGHT}" fill="${TRACK_COLORS[t]}" opacity="0.3"/>`);
    }
    
    // Track separator lines
    for (let t = 0; t <= 4; t++) {
        const y = TIMELINE_HEIGHT + t * TRACK_HEIGHT;
        parts.push(`<line x1="0" y1="${y}" x2="${PAGE_WIDTH}" y2="${y}" stroke="${GRID_COLOR}" stroke-width="0.5"/>`);
    }
    
    // Timeline ticks
    const pageStartSec = pageNum * layout.secondsPerPage - layout.leadInSeconds;
    const pageEndSec = pageStartSec + layout.secondsPerPage;
    
    for (let sec = Math.floor(pageStartSec); sec <= Math.ceil(pageEndSec); sec++) {
        const x = secondsToX(sec, pageNum);
        if (x < -5 || x > PAGE_WIDTH + 5) continue;
        
        const isFifth = sec % 5 === 0;
        const isLeadIn = sec < 0;
        const color = isLeadIn ? '#cc3333' : TICK_COLOR;
        
        if (isFifth) {
            parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="6" stroke="${color}" stroke-width="1"/>`);
            const anchor = x < 20 ? 'start' : (x > PAGE_WIDTH - 20 ? 'end' : 'middle');
            parts.push(`<text x="${x}" y="14" font-family="Lato, sans-serif" font-size="8" fill="${TICK_LABEL_COLOR}" text-anchor="${anchor}">${sec}</text>`);
        } else {
            parts.push(`<circle cx="${x}" cy="3" r="1" fill="${color}"/>`);
        }
    }
    
    // ─── Render curves (bundled + standalone) on this page ───────────────
    
    // Collect all curves visible on this page
    // Bundled curves are in element records; standalone curves are separate
    const pageCurves = [];
    
    // From bundled elements that have curve data
    for (const el of elements) {
        if (!el.curve || !el.curve.samples || el.curve.samples.length === 0) continue;
        const c = el.curve;
        const startX = secondsToX(c.startSeconds, pageNum);
        const endX = secondsToX(c.endSeconds, pageNum);
        // Skip if entirely off this page
        if (endX < 0 || startX > PAGE_WIDTH) continue;
        pageCurves.push({
            startSeconds: c.startSeconds,
            endSeconds: c.endSeconds,
            y1: c.y1,
            y2: c.y2,
            gTrack: c.gTrack || el.track,
            color: c.color,
            fillMode: c.fillMode,
            samples: c.samples,
            model: c.model,
        });
    }
    
    // Standalone curves
    for (const c of standaloneCurves) {
        if (!c.samples || c.samples.length === 0) continue;
        const startX = secondsToX(c.startSeconds, pageNum);
        const endX = secondsToX(c.endSeconds, pageNum);
        if (endX < 0 || startX > PAGE_WIDTH) continue;
        pageCurves.push({
            startSeconds: c.startSeconds,
            endSeconds: c.endSeconds,
            y1: c.y1,
            y2: c.y2,
            gTrack: c.gTrack,
            color: c.color,
            fillMode: c.fillMode,
            samples: c.samples,
            model: c.model,
        });
    }
    
    // Render each curve
    for (const curve of pageCurves) {
        const trackY = getTrackY(curve.gTrack);
        const color = resolveColor(curve.color);
        const samples = curve.samples;
        const numSamples = samples.length;
        
        if (numSamples < 2) continue;
        
        // Build SVG path from samples
        // Samples are normalized Y values (0-1 range typically, but check against y1/y2)
        const startX = secondsToX(curve.startSeconds, pageNum);
        const endX = secondsToX(curve.endSeconds, pageNum);
        const curveWidth = endX - startX;
        
        let pathD = '';
        for (let i = 0; i < numSamples; i++) {
            const xFrac = i / (numSamples - 1);
            const x = startX + xFrac * curveWidth;
            // Clamp to page bounds
            if (x < -10 || x > PAGE_WIDTH + 10) continue;
            
            // Samples represent normalized curve values
            // Map to track Y coordinates: y1/y2 are 0-10 scale (0=top, 10=bottom)
            // The sample value interpolates between y1 and y2 scaled to track height
            const sampleVal = samples[i];
            // sampleVal is typically in a normalized range — map it to track height
            // In the Workshop, y1Pixel = trackBottom - (y1/10)*trackHeight
            // So higher y values = lower on screen (closer to bottom of track)
            const yNorm = sampleVal;  // 0-1 range (from curveData)
            const y = trackY + (1 - yNorm) * TRACK_HEIGHT;  // Invert: 1=top, 0=bottom
            
            if (pathD === '') {
                pathD = `M${x.toFixed(1)},${y.toFixed(1)}`;
            } else {
                pathD += ` L${x.toFixed(1)},${y.toFixed(1)}`;
            }
        }
        
        if (pathD) {
            // Fill area under/over curve
            if (curve.fillMode === 'bottom') {
                // Fill from curve to bottom of track
                const bottomY = trackY + TRACK_HEIGHT;
                pathD += ` L${Math.min(endX, PAGE_WIDTH).toFixed(1)},${bottomY} L${Math.max(startX, 0).toFixed(1)},${bottomY} Z`;
                parts.push(`<path d="${pathD}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
            } else if (curve.fillMode === 'top') {
                pathD += ` L${Math.min(endX, PAGE_WIDTH).toFixed(1)},${trackY} L${Math.max(startX, 0).toFixed(1)},${trackY} Z`;
                parts.push(`<path d="${pathD}" fill="${color}" fill-opacity="0.15" stroke="none"/>`);
            }
            
            // Stroke the curve line
            // Rebuild path without the fill closure for the stroke
            let strokeD = '';
            for (let i = 0; i < numSamples; i++) {
                const xFrac = i / (numSamples - 1);
                const x = startX + xFrac * curveWidth;
                if (x < -10 || x > PAGE_WIDTH + 10) continue;
                const sampleVal = samples[i];
                const y = trackY + (1 - sampleVal) * TRACK_HEIGHT;
                if (strokeD === '') {
                    strokeD = `M${x.toFixed(1)},${y.toFixed(1)}`;
                } else {
                    strokeD += ` L${x.toFixed(1)},${y.toFixed(1)}`;
                }
            }
            parts.push(`<path d="${strokeD}" fill="none" stroke="${color}" stroke-width="1.5" stroke-opacity="0.8"/>`);
            curvesRendered++;
        }
    }
    
    // ─── Render lineWedges on this page ─────────────────────────────────
    
    for (const lw of lineWedges) {
        const startX = secondsToX(lw.startSeconds, pageNum);
        const endX = secondsToX(lw.endSeconds, pageNum);
        if (endX < 0 || startX > PAGE_WIDTH) continue;
        
        const trackY = getTrackY(lw.gTrack);
        const trackMidY = trackY + TRACK_HEIGHT / 2;
        const color = resolveColor(lw.color);
        const nodes = lw.nodes || [];
        
        if (nodes.length < 2) continue;
        
        // LineWedge: a shape with variable thickness along its length
        // Build top and bottom edges from node positions + thicknesses
        const wedgeWidth = endX - startX;
        const topEdge = [];
        const bottomEdge = [];
        
        for (const node of nodes) {
            const x = startX + node.pos * wedgeWidth;
            const halfThick = (node.thickness || 1) * 0.5;
            topEdge.push({ x, y: trackMidY - halfThick });
            bottomEdge.push({ x, y: trackMidY + halfThick });
        }
        
        // Build closed path: top edge forward, bottom edge backward
        let wedgeD = `M${topEdge[0].x.toFixed(1)},${topEdge[0].y.toFixed(1)}`;
        for (let i = 1; i < topEdge.length; i++) {
            wedgeD += ` L${topEdge[i].x.toFixed(1)},${topEdge[i].y.toFixed(1)}`;
        }
        for (let i = bottomEdge.length - 1; i >= 0; i--) {
            wedgeD += ` L${bottomEdge[i].x.toFixed(1)},${bottomEdge[i].y.toFixed(1)}`;
        }
        wedgeD += ' Z';
        
        parts.push(`<path d="${wedgeD}" fill="${color}" fill-opacity="0.7" stroke="${color}" stroke-width="0.5"/>`);
        lineWedgesRendered++;
    }
    
    // ─── Render GC arcs on this page ────────────────────────────────────
    
    // Bundled GCs (from elements)
    for (const el of elements) {
        if (!el.gc) continue;
        const gc = el.gc;
        const x = secondsToX(gc.impactSeconds, pageNum);
        if (x < -20 || x > PAGE_WIDTH + 20) continue;
        
        const trackY = getTrackY(gc.gTrack || el.track);
        const color = resolveColor(gc.color);
        
        // Draw a simple impact marker: vertical line + small diamond
        parts.push(`<line x1="${x}" y1="${trackY}" x2="${x}" y2="${trackY + TRACK_HEIGHT}" stroke="${color}" stroke-width="0.5" stroke-opacity="0.4" stroke-dasharray="2,2"/>`);
    }
    
    // Standalone GCs
    for (const gc of standaloneGCs) {
        const x = secondsToX(gc.impactSeconds, pageNum);
        if (x < -20 || x > PAGE_WIDTH + 20) continue;
        
        const trackY = getTrackY(gc.gTrack);
        const color = resolveColor(gc.color);
        parts.push(`<line x1="${x}" y1="${trackY}" x2="${x}" y2="${trackY + TRACK_HEIGHT}" stroke="${color}" stroke-width="0.5" stroke-opacity="0.4" stroke-dasharray="2,2"/>`);
    }
    
    // ─── Render notation SVG elements on this page ──────────────────────
    
    const pageElements = elements.filter(e => e.page === pageNum);
    
    for (const el of pageElements) {
        const svgData = readSvgForEmbed(el.svgFile);
        if (!svgData || !svgData.inner) continue;
        
        // Compute position and size
        const x = (el.xPercent / 100) * PAGE_WIDTH;
        const trackY = getTrackY(el.track);
        const y = trackY + (el.offsetYFraction || 0) * TRACK_HEIGHT;
        
        // Size: heightFraction of track height
        const renderHeight = (el.heightFraction || 0.5) * TRACK_HEIGHT;
        const aspectRatio = (el.width && el.height) ? (el.width / el.height) : 1;
        const renderWidth = renderHeight * aspectRatio;
        
        // Embed as nested <svg> with viewBox for correct scaling
        const viewBox = svgData.viewBox || `0 0 ${svgData.origWidth || el.width} ${svgData.origHeight || el.height}`;
        
        parts.push(`<svg x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${renderWidth.toFixed(1)}" height="${renderHeight.toFixed(1)}" viewBox="${viewBox}" overflow="visible">`);
        parts.push(svgData.inner);
        parts.push(`</svg>`);
        
        elementsPlaced++;
    }
    
    // ─── Page number label ──────────────────────────────────────────────
    
    const section = pageNum % 2 === 0 ? 'top' : 'bottom';
    parts.push(`<text x="${PAGE_WIDTH - 5}" y="${PAGE_HEIGHT - 5}" font-family="Lato, sans-serif" font-size="6" fill="#555" text-anchor="end">Page ${pageNum} (${section})</text>`);
    
    // Close SVG
    parts.push('</svg>');
    
    // Write page file
    const pageFileName = `page_${String(pageNum).padStart(2, '0')}.svg`;
    fs.writeFileSync(path.join(pagesDir, pageFileName), parts.join('\n'));
    pagesGenerated++;
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log(`\n═══ Page Compositor Summary ═══`);
console.log(`  Pages generated: ${pagesGenerated}`);
console.log(`  Elements placed: ${elementsPlaced}`);
console.log(`  Curves rendered: ${curvesRendered}`);
console.log(`  LineWedges rendered: ${lineWedgesRendered}`);
console.log(`  Output: ${pagesDir}/`);

// Verify element count
const expectedElements = elements.length;
console.log(`\n  ✓ Element placement check: ${elementsPlaced === expectedElements ? 'PASS' : 'FAIL'} (${elementsPlaced}/${expectedElements})`);
console.log(`  ✓ Page count check: ${pagesGenerated === layout.totalPages ? 'PASS' : 'FAIL'} (${pagesGenerated}/${layout.totalPages})`);

console.log(`\nDone.\n`);
