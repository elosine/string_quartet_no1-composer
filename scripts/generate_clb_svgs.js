/**
 * Generate CLB (Col Legno Battuto) no-staff SVGs for all dynamics.
 * Produces clean versions + versions with thin black bounding box.
 * Output: public/SVG_graphics/CLB_SVGs/
 */
const path = require('path');
const fs = require('fs');

const svgAssembly = require(path.join(__dirname, '..', 'lilypond_code', 'svg_assembly', 'assemble_svg.js'));

const outputDir = path.join(__dirname, '..', 'public', 'SVG_graphics', 'CLB_SVGs');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const dynamics = ['pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff'];

for (const dyn of dynamics) {
    const result = svgAssembly.assembleColLegnoBattutoJete({
        staffPosition: 0,
        accidental: null,
        dynamic: dyn,
        showStaff: false,
        debug: false
    });

    const cleanSvg = result.svg;
    const cleanFile = path.join(outputDir, `CLB-nostaff-${dyn}.svg`);
    fs.writeFileSync(cleanFile, cleanSvg);
    console.log(`✓ ${path.basename(cleanFile)}  (${result.metadata.width_mm.toFixed(1)}×${result.metadata.height_mm.toFixed(1)}mm)`);

    // Add thin black bounding box version
    // Parse the viewBox to get dimensions for the rect
    const vbMatch = cleanSvg.match(/viewBox="([^"]+)"/);
    if (vbMatch) {
        const [vx, vy, vw, vh] = vbMatch[1].split(/\s+/).map(Number);
        const strokeWidth = 0.04;
        const inset = strokeWidth / 2;
        const bboxRect = `<rect x="${(vx + inset).toFixed(4)}" y="${(vy + inset).toFixed(4)}" width="${(vw - strokeWidth).toFixed(4)}" height="${(vh - strokeWidth).toFixed(4)}" fill="none" stroke="#000000" stroke-width="${strokeWidth}"/>`;
        // Insert rect just before closing </svg>
        const bboxSvg = cleanSvg.replace('</svg>', bboxRect + '\n</svg>');
        const bboxFile = path.join(outputDir, `CLB-nostaff-${dyn}-bbox.svg`);
        fs.writeFileSync(bboxFile, bboxSvg);
        console.log(`✓ ${path.basename(bboxFile)}`);
    }
}

console.log(`\nDone. ${dynamics.length * 2} files written to ${outputDir}`);
