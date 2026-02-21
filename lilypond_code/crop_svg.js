#!/usr/bin/env node
// Standalone SVG cropper — extracted from server.js cropSvgToContent()
// Usage: node crop_svg.js <file1.svg> [file2.svg] [file3.svg] ...
// Crops LilyPond SVG files to their content bounds in-place.

const fs = require('fs');
const path = require('path');

function cropSvgToContent(svgFilePath) {
    let content = fs.readFileSync(svgFilePath, 'utf-8');
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    function expandBounds(x1, y1, x2, y2) {
        minX = Math.min(minX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxX = Math.max(maxX, x1, x2);
        maxY = Math.max(maxY, y1, y2);
    }
    
    function getPathBounds(d) {
        const tokens = d.match(/[MmCcLlHhVvSsZz]|[-+]?\d*\.?\d+/g) || [];
        let cx = 0, cy = 0;
        let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
        function addPt(x, y) {
            pMinX = Math.min(pMinX, x); pMinY = Math.min(pMinY, y);
            pMaxX = Math.max(pMaxX, x); pMaxY = Math.max(pMaxY, y);
        }
        let i = 0;
        while (i < tokens.length) {
            const cmd = tokens[i];
            if (!/[A-Za-z]/.test(cmd)) { i++; continue; }
            i++;
            const nums = [];
            while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
                nums.push(parseFloat(tokens[i])); i++;
            }
            if (cmd === 'M') { cx = nums[0]; cy = nums[1]; addPt(cx, cy); }
            else if (cmd === 'm') { cx += nums[0]; cy += nums[1]; addPt(cx, cy); }
            else if (cmd === 'c') {
                for (let j = 0; j < nums.length; j += 6) {
                    addPt(cx + nums[j], cy + nums[j+1]);
                    addPt(cx + nums[j+2], cy + nums[j+3]);
                    cx += nums[j+4]; cy += nums[j+5]; addPt(cx, cy);
                }
            } else if (cmd === 'C') {
                for (let j = 0; j < nums.length; j += 6) {
                    addPt(nums[j], nums[j+1]); addPt(nums[j+2], nums[j+3]);
                    cx = nums[j+4]; cy = nums[j+5]; addPt(cx, cy);
                }
            } else if (cmd === 'l') {
                for (let j = 0; j < nums.length; j += 2) { cx += nums[j]; cy += nums[j+1]; addPt(cx, cy); }
            } else if (cmd === 'L') {
                for (let j = 0; j < nums.length; j += 2) { cx = nums[j]; cy = nums[j+1]; addPt(cx, cy); }
            } else if (cmd === 'h') { for (const n of nums) { cx += n; addPt(cx, cy); } }
            else if (cmd === 'H') { for (const n of nums) { cx = n; addPt(cx, cy); } }
            else if (cmd === 'v') { for (const n of nums) { cy += n; addPt(cx, cy); } }
            else if (cmd === 'V') { for (const n of nums) { cy = n; addPt(cx, cy); } }
            else if (cmd === 's') {
                for (let j = 0; j < nums.length; j += 4) {
                    addPt(cx + nums[j], cy + nums[j+1]);
                    cx += nums[j+2]; cy += nums[j+3]; addPt(cx, cy);
                }
            }
        }
        return { minX: pMinX, minY: pMinY, maxX: pMaxX, maxY: pMaxY };
    }
    
    // Pass 1: Find all <g transform="translate(tx,ty)"> and map to content
    const translateRegex = /<g\s+transform="translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)">/g;
    let tMatch;
    const translatePositions = [];
    while ((tMatch = translateRegex.exec(content)) !== null) {
        translatePositions.push({
            tx: parseFloat(tMatch[1]),
            ty: parseFloat(tMatch[2]),
            contentStart: tMatch.index + tMatch[0].length
        });
    }
    
    // Pass 2: For each translate group, find child element and compute bounds
    for (const tPos of translatePositions) {
        const snippet = content.substring(tPos.contentStart, tPos.contentStart + 3000).trimStart();
        const tx = tPos.tx;
        const ty = tPos.ty;
        
        if (snippet.startsWith('<line ')) {
            const x1 = parseFloat((snippet.match(/x1="([^"]+)"/) || [])[1] || 0);
            const y1 = parseFloat((snippet.match(/y1="([^"]+)"/) || [])[1] || 0);
            const x2 = parseFloat((snippet.match(/x2="([^"]+)"/) || [])[1] || 0);
            const y2 = parseFloat((snippet.match(/y2="([^"]+)"/) || [])[1] || 0);
            const sw = parseFloat((snippet.match(/stroke-width="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x1, ty + y1 - sw/2, tx + x2, ty + y2 + sw/2);
        } else if (snippet.startsWith('<rect ')) {
            const x = parseFloat((snippet.match(/\bx="([^"]+)"/) || [])[1] || 0);
            const y = parseFloat((snippet.match(/\by="([^"]+)"/) || [])[1] || 0);
            const w = parseFloat((snippet.match(/width="([^"]+)"/) || [])[1] || 0);
            const h = parseFloat((snippet.match(/height="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x, ty + y, tx + x + w, ty + y + h);
        } else if (snippet.startsWith('<path ')) {
            const scaleMatch = snippet.match(/transform="scale\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)"/);
            const dMatch = snippet.match(/\bd="([^"]+)"/);
            if (scaleMatch && dMatch) {
                const sx = parseFloat(scaleMatch[1]);
                const sy = parseFloat(scaleMatch[2]);
                const pb = getPathBounds(dMatch[1]);
                const x1 = pb.minX * sx, x2 = pb.maxX * sx;
                const y1 = pb.minY * sy, y2 = pb.maxY * sy;
                expandBounds(tx + Math.min(x1,x2), ty + Math.min(y1,y2),
                             tx + Math.max(x1,x2), ty + Math.max(y1,y2));
            } else if (dMatch) {
                const pb = getPathBounds(dMatch[1]);
                expandBounds(tx + pb.minX, ty + pb.minY, tx + pb.maxX, ty + pb.maxY);
            } else {
                expandBounds(tx - 0.5, ty - 0.5, tx + 0.5, ty + 0.5);
            }
        } else if (snippet.startsWith('<text ')) {
            const fsMatch = snippet.match(/font-size="([^"]+)"/);
            const fontSize = fsMatch ? parseFloat(fsMatch[1]) : 1.0;
            const textMatch = snippet.match(/<tspan>([^<]*)<\/tspan>/);
            const textLen = textMatch ? textMatch[1].length : 5;
            const estWidth = textLen * fontSize * 0.5;
            expandBounds(tx, ty - fontSize, tx + estWidth, ty + fontSize * 0.3);
        }
    }
    
    // Pass 3: Find ALL <path> elements, parse their local transforms, and
    // trace back to the nearest ancestor <g transform="translate(tx,ty)">
    // This handles paths inside nested <g>, <a>, etc. (e.g. dynamics like fff)
    let searchPos = 0;
    while (true) {
        const pathIdx = content.indexOf('<path ', searchPos);
        if (pathIdx === -1) break;
        searchPos = pathIdx + 6;
        
        const closeIdx = content.indexOf('/>', pathIdx);
        if (closeIdx === -1) continue;
        const pathTag = content.substring(pathIdx, closeIdx + 2);
        
        const dIdx = pathTag.indexOf(' d="');
        if (dIdx === -1) continue;
        const dValStart = dIdx + 4;
        const dValEnd = pathTag.indexOf('"', dValStart);
        if (dValEnd === -1) continue;
        const dValue = pathTag.substring(dValStart, dValEnd);
        if (!dValue.startsWith('M')) continue;
        
        // Parse local transform on the <path> itself (scale, translate+scale, or none)
        let localTx = 0, localTy = 0, localSx = 1, localSy = 1;
        const localTransform = pathTag.match(/transform="([^"]+)"/);
        if (localTransform) {
            const tVal = localTransform[1];
            const ltMatch = tVal.match(/translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)/);
            if (ltMatch) { localTx = parseFloat(ltMatch[1]); localTy = parseFloat(ltMatch[2]); }
            const lsMatch = tVal.match(/scale\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)/);
            if (lsMatch) { localSx = parseFloat(lsMatch[1]); localSy = parseFloat(lsMatch[2]); }
        }
        
        // Find nearest ancestor <g transform="translate(tx,ty)"> — search back further
        // to handle intermediate <g>, <a>, whitespace between translate group and path
        const before = content.substring(Math.max(0, pathIdx - 500), pathIdx);
        const parentMatch = before.match(/<g\s+transform="translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)">/g);
        if (parentMatch) {
            // Use the last (nearest) translate group found
            const last = parentMatch[parentMatch.length - 1];
            const coords = last.match(/translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)/);
            const tx = parseFloat(coords[1]);
            const ty = parseFloat(coords[2]);
            const pb = getPathBounds(dValue);
            // Apply local scale, then local translate, then parent translate
            const x1 = pb.minX * localSx + localTx;
            const x2 = pb.maxX * localSx + localTx;
            const y1 = pb.minY * localSy + localTy;
            const y2 = pb.maxY * localSy + localTy;
            expandBounds(tx + Math.min(x1,x2), ty + Math.min(y1,y2),
                         tx + Math.max(x1,x2), ty + Math.max(y1,y2));
        }
    }
    
    if (minX === Infinity) {
        throw new Error('No visual elements found in SVG');
    }
    
    const pad = 0.5;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    
    const mmPerUnit = 1.7573;
    const widthMm = (cropW * mmPerUnit).toFixed(2);
    const heightMm = (cropH * mmPerUnit).toFixed(2);
    
    content = content.replace(
        /viewBox="[^"]+"/,
        `viewBox="${minX.toFixed(4)} ${minY.toFixed(4)} ${cropW.toFixed(4)} ${cropH.toFixed(4)}"`
    );
    
    content = content.replace(/width="[^"]+"/, `width="${widthMm}mm"`);
    content = content.replace(/height="[^"]+"/, `height="${heightMm}mm"`);
    
    fs.writeFileSync(svgFilePath, content, 'utf-8');
    return { widthMm, heightMm, viewBox: `${minX.toFixed(2)},${minY.toFixed(2)} ${cropW.toFixed(2)}x${cropH.toFixed(2)}` };
}

// --- CLI ---
const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('Usage: node crop_svg.js <file1.svg> [file2.svg] ...');
    process.exit(1);
}

for (const arg of args) {
    const filePath = path.resolve(arg);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        continue;
    }
    try {
        const result = cropSvgToContent(filePath);
        console.log(`Cropped: ${path.basename(filePath)} → ${result.widthMm}x${result.heightMm}mm (viewBox: ${result.viewBox})`);
    } catch (err) {
        console.error(`Error cropping ${path.basename(filePath)}: ${err.message}`);
    }
}
