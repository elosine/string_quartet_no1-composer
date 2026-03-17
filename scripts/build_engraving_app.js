#!/usr/bin/env node
/**
 * build_engraving_app.js — Engraving App Generator (Build Step 6)
 * 
 * Generates builds/engraving/index.html — a self-contained score viewer/editor
 * with minimal editing capabilities (select, drag, resize, element inspector).
 *
 * Usage:
 *   node scripts/build_engraving_app.js [engraving_dir]
 *   node scripts/build_engraving_app.js builds/engraving
 */

const fs = require('fs');
const path = require('path');

const engravingDir = process.argv[2] || 'builds/engraving';
const scoreDataPath = path.join(engravingDir, 'score_data.json');

if (!fs.existsSync(scoreDataPath)) {
    console.error(`score_data.json not found. Run build_engraving.js first.`);
    process.exit(1);
}

console.log(`\n═══ Build Engraving App ═══`);

const scoreData = JSON.parse(fs.readFileSync(scoreDataPath, 'utf8'));
const title = scoreData.config?.title || 'Score';

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title} — Engraving</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #f0f0f0; color: #333; font-family: 'Lato', 'Helvetica Neue', sans-serif; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }

/* Header */
#header { display: flex; align-items: center; gap: 16px; padding: 6px 16px; background: #fff; border-bottom: 1px solid #ccc; flex-shrink: 0; font-size: 13px; }
#header h1 { font-size: 14px; font-weight: 400; color: #555; }
#header button { padding: 4px 12px; background: #e8e8e8; color: #444; border: 1px solid #bbb; border-radius: 3px; cursor: pointer; font-size: 12px; }
#header button:hover { background: #ddd; }
#header button.active { background: #2a6; color: #fff; border-color: #2a6; }
#header input[type="number"] { width: 60px; padding: 3px 6px; background: #fff; color: #333; border: 1px solid #bbb; border-radius: 3px; font-size: 12px; }
#header label { color: #888; font-size: 11px; }
#page-info { color: #888; font-size: 11px; }

/* Score area */
#score-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.score-panel { flex: 1; position: relative; overflow: hidden; }
.score-panel svg { width: 100%; height: 100%; display: block; }
#panel-divider { height: 2px; background: #bbb; flex-shrink: 0; }

/* Inspector */
#inspector { position: fixed; right: 10px; top: 50px; width: 240px; background: #fff; border: 1px solid #ccc; border-radius: 6px; padding: 12px; font-size: 12px; display: none; z-index: 100; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
#inspector h3 { font-size: 13px; color: #555; margin-bottom: 8px; font-weight: 400; }
#inspector .field { display: flex; align-items: center; margin-bottom: 6px; }
#inspector .field label { width: 80px; color: #777; flex-shrink: 0; }
#inspector .field input, #inspector .field select { flex: 1; padding: 3px 6px; background: #fafafa; color: #333; border: 1px solid #ccc; border-radius: 3px; font-size: 12px; }
#inspector .field input[type="range"] { padding: 0; }
#inspector .field span { color: #666; margin-left: 6px; font-size: 11px; }
#inspector .name { color: #666; font-size: 11px; margin-bottom: 6px; word-break: break-all; }
#inspector .type-badge { display: inline-block; padding: 1px 6px; background: #2a6; color: #fff; border-radius: 3px; font-size: 10px; margin-bottom: 6px; }

/* Selection highlight */
.selected-highlight { stroke: #07f; stroke-width: 2; fill: none; pointer-events: none; }

/* Status bar */
#status { padding: 4px 16px; background: #fff; border-top: 1px solid #ccc; font-size: 11px; color: #888; flex-shrink: 0; }
</style>
</head>
<body>

<div id="header">
    <h1>${title}</h1>
    <button id="btn-prev" title="Previous page">◀</button>
    <button id="btn-next" title="Next page">▶</button>
    <label>Go to sec:</label>
    <input type="number" id="goto-sec" value="0" min="0" step="1">
    <button id="btn-goto">Go</button>
    <span id="page-info"></span>
    <div style="flex:1"></div>
    <button id="btn-save" title="Save changes">💾 Save</button>
    <button id="btn-print" title="Open print view">🖨 Print</button>
</div>

<div id="score-area">
    <div class="score-panel" id="top-panel">
        <svg id="ScoreTop" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
    <div id="panel-divider"></div>
    <div class="score-panel" id="bottom-panel">
        <svg id="ScoreBottom" xmlns="http://www.w3.org/2000/svg"></svg>
    </div>
</div>

<div id="inspector">
    <h3>Element Inspector</h3>
    <div class="name" id="insp-name"></div>
    <div><span class="type-badge" id="insp-type"></span></div>
    <div class="field"><label>Time (s)</label><input type="number" id="insp-time" step="0.1"></div>
    <div class="field"><label>Track</label><select id="insp-track"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>
    <div class="field"><label>Scale</label><input type="range" id="insp-scale" min="0.1" max="3" step="0.01" value="1"><span id="insp-scale-val"></span></div>
    <div class="field"><label>Y Offset</label><input type="range" id="insp-yoff" min="-0.2" max="1.0" step="0.01" value="0"><span id="insp-yoff-val"></span></div>
    <div class="field"><label>Page</label><span id="insp-page"></span></div>
    <div class="field"><label>Section</label><span id="insp-section"></span></div>
</div>

<div id="status">Ready</div>

<script>
// ─── Score Data ─────────────────────────────────────────────────────────────
let scoreData = null;
let layout = null;
let elements = [];
let standaloneCurves = [];
let standaloneGCs = [];
let lineWedges = [];

// ─── State ──────────────────────────────────────────────────────────────────
let currentTopPage = 0;
let currentBottomPage = 1;
let selectedElement = null;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragStartOffsetSeconds = 0;
let dragStartOffsetYFraction = 0;

const TIMELINE_HEIGHT = 20;
const TRACK_COLORS = ['rgba(245,245,245,1)', 'rgba(235,235,240,1)', 'rgba(245,245,245,1)', 'rgba(235,235,240,1)'];
const GRID_COLOR = '#bbb';
const BG_COLOR = '#ffffff';

const COLOR_MAP = {
    neonMagenta:'#ff00ff', limeGreen:'#00ff00', brightGreen:'#00ff00',
    cyan:'#00ffff', neonCyan:'#00ffff', brightYellow:'#ffff00',
    orange:'#ff8800', red:'#ff0000', white:'#ffffff',
    blue:'#0088ff', purple:'#aa00ff', pink:'#ff66cc', gold:'#ffd700'
};

function resolveColor(c) {
    if (!c) return '#333333';
    if (c.startsWith('#')) return c;
    return COLOR_MAP[c] || '#333333';
}

// ─── SVG Element Cache ──────────────────────────────────────────────────────
const svgCache = {};

async function loadSvgContent(svgFile) {
    if (svgCache[svgFile]) return svgCache[svgFile];
    try {
        const resp = await fetch('svgs/' + svgFile);
        if (!resp.ok) return null;
        const text = await resp.text();
        svgCache[svgFile] = text;
        return text;
    } catch (e) {
        return null;
    }
}

// ─── Layout Computation ─────────────────────────────────────────────────────

function recalcPageLayout(el) {
    let displayTime = (el.referenceSeconds || 0) + (el.offsetSeconds || 0) + layout.leadInSeconds;
    if ((el.offsetSeconds || 0) < 0) {
        const refDisplayTime = (el.referenceSeconds || 0) + layout.leadInSeconds;
        const refPage = Math.floor(Math.max(0, refDisplayTime) / layout.secondsPerPage);
        const pageStartTime = refPage * layout.secondsPerPage;
        if (displayTime < pageStartTime) displayTime = pageStartTime;
    }
    el.page = Math.floor(Math.max(0, displayTime) / layout.secondsPerPage);
    el.section = el.page % 2 === 0 ? 'top' : 'bottom';
    el.xPercent = ((displayTime / layout.secondsPerPage) - el.page) * 100;
}

// ─── Rendering ──────────────────────────────────────────────────────────────

function getTrackY(track, scoreHeight) {
    const idx = (parseInt(track) || 1) - 1;
    const trackH = (scoreHeight - TIMELINE_HEIGHT) / 4;
    return TIMELINE_HEIGHT + idx * trackH;
}

function getTrackHeight(scoreHeight) {
    return (scoreHeight - TIMELINE_HEIGHT) / 4;
}

function secondsToXPercent(seconds, pageNum) {
    const displayTime = seconds + layout.leadInSeconds;
    return ((displayTime / layout.secondsPerPage) - pageNum) * 100;
}

function renderPage(svgEl, pageNum) {
    const ns = 'http://www.w3.org/2000/svg';
    // Clear
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
    
    const rect = svgEl.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;
    if (W < 10 || H < 10) return;
    
    svgEl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const trackH = getTrackHeight(H);
    
    // Background
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', W); bg.setAttribute('height', H);
    bg.setAttribute('fill', BG_COLOR);
    svgEl.appendChild(bg);
    
    // Track backgrounds and separators
    for (let t = 0; t < 4; t++) {
        const ty = getTrackY(t + 1, H);
        const r = document.createElementNS(ns, 'rect');
        r.setAttribute('x', 0); r.setAttribute('y', ty);
        r.setAttribute('width', W); r.setAttribute('height', trackH);
        r.setAttribute('fill', TRACK_COLORS[t]);
        svgEl.appendChild(r);
        
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', 0); line.setAttribute('y1', ty);
        line.setAttribute('x2', W); line.setAttribute('y2', ty);
        line.setAttribute('stroke', GRID_COLOR); line.setAttribute('stroke-width', 0.5);
        svgEl.appendChild(line);
    }
    // Bottom line
    const bline = document.createElementNS(ns, 'line');
    bline.setAttribute('x1', 0); bline.setAttribute('y1', H);
    bline.setAttribute('x2', W); bline.setAttribute('y2', H);
    bline.setAttribute('stroke', GRID_COLOR); bline.setAttribute('stroke-width', 0.5);
    svgEl.appendChild(bline);
    
    // Timeline ticks
    const pageStartSec = pageNum * layout.secondsPerPage - layout.leadInSeconds;
    const pageEndSec = pageStartSec + layout.secondsPerPage;
    for (let sec = Math.floor(pageStartSec); sec <= Math.ceil(pageEndSec); sec++) {
        const xPct = secondsToXPercent(sec, pageNum);
        if (xPct < -2 || xPct > 102) continue;
        const x = (xPct / 100) * W;
        const isFifth = sec % 5 === 0;
        const isLeadIn = sec < 0;
        const color = isLeadIn ? '#cc3333' : '#999';
        
        if (isFifth) {
            const tick = document.createElementNS(ns, 'line');
            tick.setAttribute('x1', x); tick.setAttribute('y1', 0);
            tick.setAttribute('x2', x); tick.setAttribute('y2', 6);
            tick.setAttribute('stroke', color); tick.setAttribute('stroke-width', 1);
            svgEl.appendChild(tick);
            
            const label = document.createElementNS(ns, 'text');
            label.setAttribute('x', x); label.setAttribute('y', 14);
            label.setAttribute('font-family', 'Lato, sans-serif');
            label.setAttribute('font-size', '9');
            label.setAttribute('fill', '#666');
            label.setAttribute('text-anchor', xPct < 3 ? 'start' : (xPct > 97 ? 'end' : 'middle'));
            label.textContent = sec;
            svgEl.appendChild(label);
        } else {
            const dot = document.createElementNS(ns, 'circle');
            dot.setAttribute('cx', x); dot.setAttribute('cy', 3);
            dot.setAttribute('r', 1); dot.setAttribute('fill', color);
            svgEl.appendChild(dot);
        }
    }
    
    // Render curves
    renderCurvesOnPage(svgEl, pageNum, W, H, trackH);
    
    // Render lineWedges
    renderLineWedgesOnPage(svgEl, pageNum, W, H, trackH);
    
    // Render GC markers
    renderGCsOnPage(svgEl, pageNum, W, H, trackH);
    
    // Render notation elements
    renderElementsOnPage(svgEl, pageNum, W, H, trackH);
}

function renderCurvesOnPage(svgEl, pageNum, W, H, trackH) {
    const ns = 'http://www.w3.org/2000/svg';
    
    // Collect curves visible on this page
    const allCurves = [];
    for (const el of elements) {
        if (!el.curve || !el.curve.samples || el.curve.samples.length < 2) continue;
        const c = el.curve;
        const startXPct = secondsToXPercent(c.startSeconds, pageNum);
        const endXPct = secondsToXPercent(c.endSeconds, pageNum);
        if (endXPct < 0 || startXPct > 100) continue;
        allCurves.push({ ...c, gTrack: c.gTrack || el.track });
    }
    for (const c of standaloneCurves) {
        if (!c.samples || c.samples.length < 2) continue;
        const startXPct = secondsToXPercent(c.startSeconds, pageNum);
        const endXPct = secondsToXPercent(c.endSeconds, pageNum);
        if (endXPct < 0 || startXPct > 100) continue;
        allCurves.push(c);
    }
    
    for (const curve of allCurves) {
        const ty = getTrackY(curve.gTrack, H);
        const color = resolveColor(curve.color);
        const samples = curve.samples;
        const startX = (secondsToXPercent(curve.startSeconds, pageNum) / 100) * W;
        const endX = (secondsToXPercent(curve.endSeconds, pageNum) / 100) * W;
        const curveW = endX - startX;
        
        let pathD = '';
        for (let i = 0; i < samples.length; i++) {
            const x = startX + (i / (samples.length - 1)) * curveW;
            if (x < -20 || x > W + 20) continue;
            const y = ty + (1 - samples[i]) * trackH;
            pathD += (pathD ? ' L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
        }
        if (!pathD) continue;
        
        // Fill
        if (curve.fillMode === 'bottom' || curve.fillMode === 'top') {
            const fillY = curve.fillMode === 'bottom' ? ty + trackH : ty;
            let fillD = pathD + ' L' + Math.min(endX, W).toFixed(1) + ',' + fillY +
                ' L' + Math.max(startX, 0).toFixed(1) + ',' + fillY + ' Z';
            const fillPath = document.createElementNS(ns, 'path');
            fillPath.setAttribute('d', fillD);
            fillPath.setAttribute('fill', color);
            fillPath.setAttribute('fill-opacity', '0.12');
            fillPath.setAttribute('stroke', 'none');
            svgEl.appendChild(fillPath);
        }
        
        // Stroke
        const strokePath = document.createElementNS(ns, 'path');
        strokePath.setAttribute('d', pathD);
        strokePath.setAttribute('fill', 'none');
        strokePath.setAttribute('stroke', color);
        strokePath.setAttribute('stroke-width', '1.5');
        strokePath.setAttribute('stroke-opacity', '0.7');
        svgEl.appendChild(strokePath);
    }
}

function renderLineWedgesOnPage(svgEl, pageNum, W, H, trackH) {
    const ns = 'http://www.w3.org/2000/svg';
    for (const lw of lineWedges) {
        const startXPct = secondsToXPercent(lw.startSeconds, pageNum);
        const endXPct = secondsToXPercent(lw.endSeconds, pageNum);
        if (endXPct < 0 || startXPct > 100) continue;
        
        const ty = getTrackY(lw.gTrack, H);
        const midY = ty + trackH / 2;
        const color = resolveColor(lw.color);
        const startX = (startXPct / 100) * W;
        const endX = (endXPct / 100) * W;
        const wedgeW = endX - startX;
        const nodes = lw.nodes || [];
        if (nodes.length < 2) continue;
        
        const top = [], bot = [];
        for (const n of nodes) {
            const x = startX + n.pos * wedgeW;
            const half = (n.thickness || 1) * 0.5;
            top.push(x.toFixed(1) + ',' + (midY - half).toFixed(1));
            bot.push(x.toFixed(1) + ',' + (midY + half).toFixed(1));
        }
        const d = 'M' + top.join(' L') + ' L' + bot.reverse().join(' L') + ' Z';
        const path = document.createElementNS(ns, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', color);
        path.setAttribute('fill-opacity', '0.6');
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '0.5');
        svgEl.appendChild(path);
    }
}

function renderGCsOnPage(svgEl, pageNum, W, H, trackH) {
    const ns = 'http://www.w3.org/2000/svg';
    const allGCs = [];
    for (const el of elements) {
        if (!el.gc) continue;
        allGCs.push({ ...el.gc, track: el.gc.gTrack || el.track });
    }
    for (const gc of standaloneGCs) {
        allGCs.push({ ...gc, track: gc.gTrack });
    }
    for (const gc of allGCs) {
        const xPct = secondsToXPercent(gc.impactSeconds, pageNum);
        if (xPct < -2 || xPct > 102) continue;
        const x = (xPct / 100) * W;
        const ty = getTrackY(gc.track, H);
        const color = resolveColor(gc.color);
        const line = document.createElementNS(ns, 'line');
        line.setAttribute('x1', x); line.setAttribute('y1', ty);
        line.setAttribute('x2', x); line.setAttribute('y2', ty + trackH);
        line.setAttribute('stroke', color);
        line.setAttribute('stroke-width', '0.5');
        line.setAttribute('stroke-opacity', '0.35');
        line.setAttribute('stroke-dasharray', '3,3');
        svgEl.appendChild(line);
    }
}

async function renderElementsOnPage(svgEl, pageNum, W, H, trackH) {
    const ns = 'http://www.w3.org/2000/svg';
    const pageEls = elements.filter(e => e.page === pageNum);
    
    for (const el of pageEls) {
        const x = (el.xPercent / 100) * W;
        const ty = getTrackY(el.track, H);
        const y = ty + (el.offsetYFraction || 0) * trackH;
        const renderH = (el.heightFraction || 0.5) * trackH;
        const aspect = (el.width && el.height) ? (el.width / el.height) : 1;
        const renderW = renderH * aspect;
        
        // Create group for this element
        const g = document.createElementNS(ns, 'g');
        g.setAttribute('data-el-id', el.id);
        g.style.cursor = 'pointer';
        
        // Load and embed SVG via <image>
        const img = document.createElementNS(ns, 'image');
        img.setAttribute('href', 'svgs/' + el.svgFile);
        img.setAttribute('x', x);
        img.setAttribute('y', y);
        img.setAttribute('width', renderW);
        img.setAttribute('height', renderH);
        img.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        g.appendChild(img);
        
        // Click handler for selection
        g.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            selectElement(el);
            // Start drag
            isDragging = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            dragStartOffsetSeconds = el.offsetSeconds || 0;
            dragStartOffsetYFraction = el.offsetYFraction || 0;
        });
        
        // Store DOM reference
        el._group = g;
        el._img = img;
        el._svgEl = svgEl;
        
        svgEl.appendChild(g);
    }
}

// ─── Selection & Editing ────────────────────────────────────────────────────

function selectElement(el) {
    // Remove previous highlight
    deselectElement();
    
    selectedElement = el;
    
    // Add highlight rectangle
    if (el._img && el._svgEl) {
        const ns = 'http://www.w3.org/2000/svg';
        const highlight = document.createElementNS(ns, 'rect');
        highlight.setAttribute('x', el._img.getAttribute('x'));
        highlight.setAttribute('y', el._img.getAttribute('y'));
        highlight.setAttribute('width', el._img.getAttribute('width'));
        highlight.setAttribute('height', el._img.getAttribute('height'));
        highlight.classList.add('selected-highlight');
        highlight.id = 'sel-highlight';
        el._svgEl.appendChild(highlight);
    }
    
    // Update inspector
    const insp = document.getElementById('inspector');
    insp.style.display = 'block';
    document.getElementById('insp-name').textContent = el.name || 'Unnamed';
    document.getElementById('insp-type').textContent = el.type || 'unknown';
    document.getElementById('insp-time').value = (el.referenceSeconds || 0).toFixed(2);
    document.getElementById('insp-track').value = el.track || 1;
    document.getElementById('insp-scale').value = el.scale || 1;
    document.getElementById('insp-scale-val').textContent = (el.scale || 1).toFixed(2);
    document.getElementById('insp-yoff').value = el.offsetYFraction || 0;
    document.getElementById('insp-yoff-val').textContent = (el.offsetYFraction || 0).toFixed(3);
    document.getElementById('insp-page').textContent = el.page;
    document.getElementById('insp-section').textContent = el.section;
    
    setStatus('Selected: ' + (el.name || 'element ' + el.id));
}

function deselectElement() {
    const old = document.getElementById('sel-highlight');
    if (old) old.remove();
    selectedElement = null;
    document.getElementById('inspector').style.display = 'none';
}

function updateElementVisual(el) {
    if (!el._img || !el._svgEl) return;
    const svgEl = el._svgEl;
    const rect = svgEl.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const trackH = getTrackHeight(H);
    
    const x = (el.xPercent / 100) * W;
    const ty = getTrackY(el.track, H);
    const y = ty + (el.offsetYFraction || 0) * trackH;
    const renderH = (el.heightFraction || 0.5) * trackH;
    const aspect = (el.width && el.height) ? (el.width / el.height) : 1;
    const renderW = renderH * aspect;
    
    el._img.setAttribute('x', x);
    el._img.setAttribute('y', y);
    el._img.setAttribute('width', renderW);
    el._img.setAttribute('height', renderH);
    
    // Update highlight
    const hl = document.getElementById('sel-highlight');
    if (hl) {
        hl.setAttribute('x', x);
        hl.setAttribute('y', y);
        hl.setAttribute('width', renderW);
        hl.setAttribute('height', renderH);
    }
}

// ─── Inspector Events ───────────────────────────────────────────────────────

document.getElementById('insp-scale').addEventListener('input', (e) => {
    if (!selectedElement) return;
    const newScale = parseFloat(e.target.value);
    selectedElement.scale = newScale;
    // Recompute heightFraction from new scale
    const svgEl = selectedElement._svgEl;
    const H = svgEl.getBoundingClientRect().height;
    const trackH = getTrackHeight(H);
    selectedElement.heightFraction = (newScale * selectedElement.height) / trackH;
    document.getElementById('insp-scale-val').textContent = newScale.toFixed(2);
    updateElementVisual(selectedElement);
});

document.getElementById('insp-yoff').addEventListener('input', (e) => {
    if (!selectedElement) return;
    selectedElement.offsetYFraction = parseFloat(e.target.value);
    document.getElementById('insp-yoff-val').textContent = selectedElement.offsetYFraction.toFixed(3);
    updateElementVisual(selectedElement);
});

document.getElementById('insp-time').addEventListener('change', (e) => {
    if (!selectedElement) return;
    selectedElement.referenceSeconds = parseFloat(e.target.value);
    recalcPageLayout(selectedElement);
    // Re-render both pages to show the change
    renderBothPages();
    // Re-select to update inspector
    selectElement(selectedElement);
});

document.getElementById('insp-track').addEventListener('change', (e) => {
    if (!selectedElement) return;
    selectedElement.track = parseInt(e.target.value);
    recalcPageLayout(selectedElement);
    renderBothPages();
    selectElement(selectedElement);
});

// ─── Drag Handler ───────────────────────────────────────────────────────────

document.addEventListener('mousemove', (e) => {
    if (!isDragging || !selectedElement || !selectedElement._svgEl) return;
    
    const svgEl = selectedElement._svgEl;
    const rect = svgEl.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const trackH = getTrackHeight(H);
    
    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;
    
    // Convert pixel delta to seconds
    const secondsPerPixel = layout.secondsPerPage / W;
    selectedElement.offsetSeconds = dragStartOffsetSeconds + (dx * secondsPerPixel);
    
    // Convert pixel delta to Y fraction
    selectedElement.offsetYFraction = dragStartOffsetYFraction + (dy / trackH);
    
    recalcPageLayout(selectedElement);
    updateElementVisual(selectedElement);
    
    // Update inspector
    document.getElementById('insp-yoff').value = selectedElement.offsetYFraction;
    document.getElementById('insp-yoff-val').textContent = selectedElement.offsetYFraction.toFixed(3);
    document.getElementById('insp-page').textContent = selectedElement.page;
    document.getElementById('insp-section').textContent = selectedElement.section;
});

document.addEventListener('mouseup', () => {
    isDragging = false;
});

// Click on score background to deselect
document.getElementById('ScoreTop').addEventListener('click', (e) => {
    if (e.target.tagName === 'rect' || e.target.tagName === 'svg') deselectElement();
});
document.getElementById('ScoreBottom').addEventListener('click', (e) => {
    if (e.target.tagName === 'rect' || e.target.tagName === 'svg') deselectElement();
});

// ─── Navigation ─────────────────────────────────────────────────────────────

function renderBothPages() {
    renderPage(document.getElementById('ScoreTop'), currentTopPage);
    renderPage(document.getElementById('ScoreBottom'), currentBottomPage);
    updatePageInfo();
}

function updatePageInfo() {
    const topSec = (currentTopPage * layout.secondsPerPage - layout.leadInSeconds).toFixed(0);
    const botSec = (currentBottomPage * layout.secondsPerPage - layout.leadInSeconds).toFixed(0);
    document.getElementById('page-info').textContent = 
        'Top: p' + currentTopPage + ' (' + topSec + 's) | Bottom: p' + currentBottomPage + ' (' + botSec + 's) | ' +
        layout.totalPages + ' pages total';
}

document.getElementById('btn-next').addEventListener('click', () => {
    currentTopPage += 2;
    currentBottomPage += 2;
    if (currentTopPage >= layout.totalPages) {
        currentTopPage = layout.totalPages - 2;
        currentBottomPage = layout.totalPages - 1;
    }
    deselectElement();
    renderBothPages();
});

document.getElementById('btn-prev').addEventListener('click', () => {
    currentTopPage -= 2;
    currentBottomPage -= 2;
    if (currentTopPage < 0) {
        currentTopPage = 0;
        currentBottomPage = 1;
    }
    deselectElement();
    renderBothPages();
});

document.getElementById('btn-goto').addEventListener('click', () => {
    const sec = parseFloat(document.getElementById('goto-sec').value) || 0;
    const displayTime = sec + layout.leadInSeconds;
    const targetPage = Math.floor(displayTime / layout.secondsPerPage);
    if (targetPage % 2 === 0) {
        currentTopPage = targetPage;
        currentBottomPage = targetPage + 1;
    } else {
        currentBottomPage = targetPage;
        currentTopPage = targetPage + 1;
    }
    deselectElement();
    renderBothPages();
});

// ─── Save ───────────────────────────────────────────────────────────────────

document.getElementById('btn-save').addEventListener('click', () => {
    // Clean up DOM references before serializing
    const cleanElements = elements.map(el => {
        const { _group, _img, _svgEl, ...clean } = el;
        return clean;
    });
    
    const saveData = { ...scoreData, elements: cleanElements };
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'score_data.json';
    a.click();
    URL.revokeObjectURL(url);
    setStatus('Saved score_data.json');
});

document.getElementById('btn-print').addEventListener('click', () => {
    window.open('print/score_print.html', '_blank');
});

// ─── Status ─────────────────────────────────────────────────────────────────

function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

// ─── Keyboard Shortcuts ─────────────────────────────────────────────────────

document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if (e.key === 'ArrowRight') { document.getElementById('btn-next').click(); }
    if (e.key === 'ArrowLeft') { document.getElementById('btn-prev').click(); }
    if (e.key === 'Escape') { deselectElement(); }
});

// ─── Init ───────────────────────────────────────────────────────────────────

async function init() {
    setStatus('Loading score data...');
    const resp = await fetch('score_data.json');
    scoreData = await resp.json();
    layout = scoreData.layout;
    elements = scoreData.elements;
    standaloneCurves = scoreData.standaloneCurves || [];
    standaloneGCs = scoreData.standaloneGCs || [];
    lineWedges = scoreData.lineWedges || [];
    
    setStatus('Loaded ' + elements.length + ' elements, ' + layout.totalPages + ' pages');
    
    renderBothPages();
    
    // Re-render on resize
    window.addEventListener('resize', () => {
        deselectElement();
        renderBothPages();
    });
}

init();
</script>
</body>
</html>`;

const outputPath = path.join(engravingDir, 'index.html');
fs.writeFileSync(outputPath, html);
const fileSize = fs.statSync(outputPath).size;

console.log(`  Output: ${outputPath}`);
console.log(`  File size: ${(fileSize / 1024).toFixed(1)} KB`);
console.log(`\nTo use:`);
console.log(`  1. Start a local server: npx serve ${engravingDir}`);
console.log(`  2. Open http://localhost:3000 in browser`);
console.log(`  3. Navigate with ◀▶ buttons or Arrow keys`);
console.log(`  4. Click elements to select, drag to move`);
console.log(`  5. Use Inspector panel to adjust scale/timing/track`);
console.log(`  6. Save changes with 💾 button\n`);
