// Temporary script to scan score.json SVG data URLs for <text> elements and fonts
const fs = require('fs');
const path = require('path');

const scoreFile = path.join(__dirname, '..', 'scores', '2295-FinalScore-preVersioning.json');
const score = JSON.parse(fs.readFileSync(scoreFile, 'utf8'));
const els = score.svgElements || [];

let textCount = 0;
let noTextCount = 0;
const fonts = new Set();
const allChars = new Set();
const textLabels = {};  // label -> count
let needsRegular = 0;
let needsItalic = 0;

els.forEach(el => {
    if (!el.svgDataUrl) return;
    let svg;
    try {
        if (el.svgDataUrl.startsWith('data:image/svg+xml;base64,')) {
            svg = Buffer.from(el.svgDataUrl.slice(26), 'base64').toString('utf8');
        } else {
            svg = decodeURIComponent(el.svgDataUrl.replace(/^data:image\/svg\+xml[^,]*,/, ''));
        }
    } catch (e) { return; }

    if (!svg.includes('<text')) { noTextCount++; return; }
    textCount++;

    // Extract font-family values
    const fm = svg.match(/font-family="([^"]+)"/g);
    if (fm) fm.forEach(f => {
        fonts.add(f.replace('font-family="', '').replace('"', ''));
    });

    // Check for italic
    if (svg.includes('font-style="italic"')) needsItalic++;
    else needsRegular++;

    // Extract ALL text content (including tspan)
    const allText = svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // Better: extract text between text tags
    const textEls = svg.match(/<text[^>]*>[\s\S]*?<\/text>/g);
    if (textEls) {
        textEls.forEach(te => {
            const content = te.replace(/<[^>]+>/g, '').trim();
            if (content) {
                textLabels[content] = (textLabels[content] || 0) + 1;
                for (const ch of content) allChars.add(ch);
            }
        });
    }
});

// Sort labels by frequency
const sorted = Object.entries(textLabels).sort((a,b) => b[1] - a[1]);

console.log('=== SVG Font Scan ===');
console.log('Total SVG elements:', els.length);
console.log('SVGs WITHOUT text:', noTextCount);
console.log('SVGs WITH text:', textCount);
console.log('  Needs regular font:', needsRegular);
console.log('  Needs italic font:', needsItalic);
console.log('\nFont families found:', Array.from(fonts));
console.log('\nUnique characters used:', allChars.size, '-', JSON.stringify(Array.from(allChars).sort().join('')));
console.log('\nText labels (top 30):');
sorted.slice(0, 30).forEach(([label, count]) => {
    console.log('  ' + count + 'x  "' + label + '"');
});
console.log('\nAll unique labels:', sorted.length);

// Size impact
const fontRegSize = fs.statSync(path.join(__dirname, '..', 'public', 'fonts', 'CrimsonPro-Light.ttf')).size;
const fontItaSize = fs.statSync(path.join(__dirname, '..', 'public', 'fonts', 'CrimsonPro-LightItalic.ttf')).size;
const regB64 = Math.ceil(fontRegSize * 4/3);
const itaB64 = Math.ceil(fontItaSize * 4/3);
console.log('\nSize impact (full font embedding):');
console.log('  Regular font:', (fontRegSize/1024).toFixed(1), 'KB raw,', (regB64/1024).toFixed(1), 'KB base64');
console.log('  Italic font:', (fontItaSize/1024).toFixed(1), 'KB raw,', (itaB64/1024).toFixed(1), 'KB base64');
console.log('  If embed BOTH in all', textCount, 'SVGs:', ((regB64 + itaB64) * textCount / 1024 / 1024).toFixed(1), 'MB added');
console.log('  If embed only needed variant:', ((regB64 * needsRegular + itaB64 * needsItalic) / 1024 / 1024).toFixed(1), 'MB added');
