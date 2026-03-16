#!/usr/bin/env node
/**
 * generate_print_html.js — Print HTML Generator (Build Step 5)
 * 
 * Reads the page SVGs and generates a print-ready HTML file.
 * Open in browser → Ctrl+P → Save as PDF (vector, scalable, colors preserved).
 *
 * Usage:
 *   node scripts/generate_print_html.js [engraving_dir]
 *   node scripts/generate_print_html.js builds/engraving
 */

const fs = require('fs');
const path = require('path');

const engravingDir = process.argv[2] || 'builds/engraving';
const pagesDir = path.join(engravingDir, 'pages');
const printDir = path.join(engravingDir, 'print');

if (!fs.existsSync(pagesDir)) {
    console.error(`Pages directory not found: ${pagesDir}`);
    console.error('Run compose_pages.js first.');
    process.exit(1);
}

fs.mkdirSync(printDir, { recursive: true });

// Read all page SVGs
const pageFiles = fs.readdirSync(pagesDir)
    .filter(f => f.endsWith('.svg'))
    .sort();

console.log(`\n═══ Print HTML Generator ═══`);
console.log(`Pages found: ${pageFiles.length}`);

// Read score_data.json for metadata
const scoreData = JSON.parse(fs.readFileSync(path.join(engravingDir, 'score_data.json'), 'utf8'));
const title = scoreData.config?.title || 'Score';

// Build HTML with inline SVGs for reliable PDF output
const svgContents = pageFiles.map(f => fs.readFileSync(path.join(pagesDir, f), 'utf8'));

const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${title} — Print Score</title>
    <style>
        @page {
            size: landscape;
            margin: 10mm;
        }
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #111;
            color: #ccc;
            font-family: 'Lato', 'Helvetica Neue', sans-serif;
        }
        
        /* Screen-only header */
        .screen-header {
            padding: 20px 40px;
            border-bottom: 1px solid #333;
        }
        
        .screen-header h1 {
            font-size: 18px;
            font-weight: 300;
            color: #aaa;
        }
        
        .screen-header p {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        
        .screen-header .print-btn {
            margin-top: 12px;
            padding: 8px 20px;
            background: #2a6;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .screen-header .print-btn:hover {
            background: #3b7;
        }
        
        /* Page container */
        .page-spread {
            display: flex;
            justify-content: center;
            gap: 2px;
            margin: 20px auto;
            max-width: 95vw;
        }
        
        .page-wrapper {
            flex: 1;
            max-width: 48%;
        }
        
        .page-wrapper svg {
            width: 100%;
            height: auto;
            display: block;
        }
        
        /* Print styles */
        @media print {
            .screen-header {
                display: none;
            }
            
            body {
                background: none;
            }
            
            .page-spread {
                page-break-after: always;
                margin: 0;
                gap: 0;
                max-width: 100%;
            }
            
            .page-spread:last-child {
                page-break-after: auto;
            }
            
            .page-wrapper {
                max-width: 50%;
            }
            
            .page-wrapper svg {
                width: 100%;
                height: auto;
            }
        }
    </style>
</head>
<body>
    <div class="screen-header">
        <h1>${title}</h1>
        <p>${pageFiles.length} pages · ${scoreData.layout?.totalPages || '?'} score pages · ${(scoreData.config?.totalDurationSeconds || 0).toFixed(0)}s duration</p>
        <p>Generated: ${new Date().toISOString().split('T')[0]}</p>
        <button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
    </div>
    
${
    // Group pages into spreads (top + bottom pairs)
    (() => {
        const spreads = [];
        for (let i = 0; i < svgContents.length; i += 2) {
            const topSvg = svgContents[i];
            const bottomSvg = i + 1 < svgContents.length ? svgContents[i + 1] : null;
            let spread = '    <div class="page-spread">\n';
            spread += `        <div class="page-wrapper">${topSvg}</div>\n`;
            if (bottomSvg) {
                spread += `        <div class="page-wrapper">${bottomSvg}</div>\n`;
            }
            spread += '    </div>';
            spreads.push(spread);
        }
        return spreads.join('\n');
    })()
}

</body>
</html>`;

const outputPath = path.join(printDir, 'score_print.html');
fs.writeFileSync(outputPath, html);
const fileSize = fs.statSync(outputPath).size;

console.log(`  Output: ${outputPath}`);
console.log(`  File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`  Page spreads: ${Math.ceil(pageFiles.length / 2)}`);
console.log(`\nTo create PDF:`);
console.log(`  1. Open ${outputPath} in Chrome/Edge`);
console.log(`  2. Press Ctrl+P (or Cmd+P)`);
console.log(`  3. Set "Destination" to "Save as PDF"`);
console.log(`  4. Set "Layout" to "Landscape"`);
console.log(`  5. Set "Background graphics" to ON`);
console.log(`  6. Save\n`);
