const path = require('path');
const fs = require('fs');
const sa = require(path.join(__dirname, '..', 'lilypond_code', 'svg_assembly', 'assemble_svg.js'));

const dir = path.join(__dirname, '..', 'public', 'SVG_graphics', 'CLB_SVGs');
const r = sa.assembleColLegnoBattutoJete({
    staffPosition: 0,
    accidental: null,
    dynamic: null,
    showStaff: false,
    debug: false
});

// Clean version
fs.writeFileSync(path.join(dir, 'CLB-nostaff-nodynamic.svg'), r.svg);
console.log('CLB-nostaff-nodynamic.svg  (' + r.metadata.width_mm.toFixed(1) + 'x' + r.metadata.height_mm.toFixed(1) + 'mm)');

// Bounding box version
const m = r.svg.match(/viewBox="([^"]+)"/);
if (m) {
    const parts = m[1].split(/\s+/).map(Number);
    const vx = parts[0], vy = parts[1], vw = parts[2], vh = parts[3];
    const sw = 0.04, ins = sw / 2;
    const rect = '<rect x="' + (vx + ins).toFixed(4) + '" y="' + (vy + ins).toFixed(4) +
        '" width="' + (vw - sw).toFixed(4) + '" height="' + (vh - sw).toFixed(4) +
        '" fill="none" stroke="#000000" stroke-width="' + sw + '"/>';
    const bboxSvg = r.svg.replace('</svg>', rect + '\n</svg>');
    fs.writeFileSync(path.join(dir, 'CLB-nostaff-nodynamic-bbox.svg'), bboxSvg);
    console.log('CLB-nostaff-nodynamic-bbox.svg');
}
