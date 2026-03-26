/**
 * generate_doc_pdfs.js — Generate PDF versions of documentation pages
 * 
 * Uses Puppeteer to render HTML docs and print to PDF.
 * Requires the performance server to be running (for serving CSS/images).
 * 
 * Usage:
 *   node scripts/generate_doc_pdfs.js [--port 3001]
 * 
 * Output:
 *   docs/notation_instructions/Music_Performance_Instructions.pdf
 *   docs/technical_manual/Technical_Manual.pdf
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

var port = 3001;
for (var i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' && process.argv[i + 1]) {
        port = parseInt(process.argv[i + 1]);
    }
}

var docs = [
    {
        url: 'http://localhost:' + port + '/docs/notation-instructions/',
        output: path.join(__dirname, '..', 'docs', 'notation_instructions', 'Music_Performance_Instructions.pdf'),
        title: 'Music Performance Instructions'
    },
    {
        url: 'http://localhost:' + port + '/docs/technical-manual/',
        output: path.join(__dirname, '..', 'docs', 'technical_manual', 'Technical_Manual.pdf'),
        title: 'Technical Manual'
    }
];

(async function() {
    console.log('Launching browser...');
    var browser = await puppeteer.launch({ headless: 'new' });

    for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        console.log('\nGenerating: ' + doc.title);
        console.log('  URL: ' + doc.url);

        var page = await browser.newPage();

        // Navigate and wait for fonts + images to load
        await page.goto(doc.url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Give Google Fonts a moment to render
        await new Promise(function(resolve) { setTimeout(resolve, 1000); });

        await page.pdf({
            path: doc.output,
            format: 'Letter',
            margin: { top: '0.6in', right: '0.6in', bottom: '0.6in', left: '0.6in' },
            printBackground: true,
            displayHeaderFooter: false
        });

        var size = fs.statSync(doc.output).size;
        console.log('  Output: ' + doc.output);
        console.log('  Size: ' + (size / 1024).toFixed(0) + ' KB');

        await page.close();
    }

    await browser.close();
    console.log('\nDone — ' + docs.length + ' PDFs generated.');
})();
