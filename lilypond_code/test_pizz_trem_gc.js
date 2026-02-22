// Pizzicato Tremolo GC + SVG Test — paste into browser console
// Creates a test GC at 243s and inserts an SVG with pre-alignment
//
// Usage (paste in browser console):
//   Copy the testPizzTremGC function, then call:
//     testPizzTremGC({ time: 243, track: 1, alignment: 'pre' })
//     testPizzTremGC({ time: 243, track: 1, alignment: 'post' })

async function testPizzTremGC({ time = 243, track = 1, alignment = 'pre', svgPath = '/SVG_graphics/pizz_tremolo/PizzTrem-treble-FTQS3-fff-cres.svg' } = {}) {
    // ── Step 1: Create GC (same model as Bartók Pizzicato) ──
    const GC_PARAMS = {
        stiffness: 62,
        damping: 100,
        ictus: 90,
        descentRatio: 60,
        duration: 0.6,
        color: 'neonMagenta'
    };

    if (!window.GCMaker) { console.error('GCMaker not found'); return; }

    // Save current params
    const saved = {
        stiffness: GCMaker.stiffness,
        damping: GCMaker.damping,
        ictus: GCMaker.ictus,
        descentRatio: GCMaker.descentRatio,
        duration: GCMaker.duration
    };

    // Set Bartók pizz params
    GCMaker.stiffness = GC_PARAMS.stiffness;
    GCMaker.damping = GC_PARAMS.damping;
    GCMaker.ictus = GC_PARAMS.ictus;
    GCMaker.descentRatio = GC_PARAMS.descentRatio;
    GCMaker.duration = GC_PARAMS.duration;

    // Set time and track
    if (GCMaker.impactInput) GCMaker.impactInput.value = time;
    if (GCMaker.trackSelect) GCMaker.trackSelect.value = String(track);

    // Create the GC
    GCMaker.createGC();
    const gc = GCMaker.gcs[GCMaker.gcs.length - 1];

    if (gc) {
        gc.color = GC_PARAMS.color;
        gc.name = `PizzTrem_${gc.name}`;
        GCMaker.rerenderAllGCs();
        console.log('GC created:', gc.name, {
            impactSeconds: gc.impactSeconds,
            startSeconds: gc.startSeconds,
            endSeconds: gc.endSeconds
        });
    }

    // Restore saved params
    Object.assign(GCMaker, saved);

    // ── Step 2: Insert SVG with alignment ──
    if (!window.SVGElementManager) { console.error('SVGElementManager not found'); return; }

    try {
        const response = await fetch(svgPath);
        if (!response.ok) { console.error('SVG fetch failed:', svgPath); return; }
        const svgContent = await response.text();

        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
        const svgEl = svgDoc.documentElement;

        // Parse dimensions (handle mm units from LilyPond)
        let svgWidth = parseFloat(svgEl.getAttribute('width')) || 100;
        let svgHeight = parseFloat(svgEl.getAttribute('height')) || 100;
        const widthStr = svgEl.getAttribute('width') || '';
        const heightStr = svgEl.getAttribute('height') || '';
        if (widthStr.includes('mm')) svgWidth = parseFloat(widthStr) * 3.78;
        if (heightStr.includes('mm')) svgHeight = parseFloat(heightStr) * 3.78;
        svgEl.setAttribute('width', String(svgWidth));
        svgEl.setAttribute('height', String(svgHeight));

        // Calculate scale (same as Bartók: 50% of track height)
        const trackNum = parseInt(track) || 1;
        const scoreEl = document.getElementById('ScoreTop');
        const scoreWidth = scoreEl.clientWidth;
        const trackDims = CompositionPanel.getTrackDimensions(String(trackNum), scoreEl);
        const trackHeight = trackDims.height;

        const heightFraction = 0.70;
        const targetHeight = trackHeight * heightFraction;
        const scale = targetHeight / svgHeight;
        const scaledContentWidth = svgWidth * scale;

        // Calculate time-per-pixel for offset
        const secondsPerPage = window.GraphicTimeline
            ? GraphicTimeline.getSecondsPerPage()
            : 30; // fallback
        const secondsPerPixel = secondsPerPage / scoreWidth;
        const svgWidthInSeconds = scaledContentWidth * secondsPerPixel;

        // Alignment: position SVG relative to GC curve
        let anchorSeconds, offsetSeconds;

        if (alignment === 'pre') {
            // Pre: left edge of SVG at gc.startSeconds (beginning of curve)
            anchorSeconds = gc ? gc.startSeconds : time;
            offsetSeconds = 0;
        } else {
            // Post: right edge of SVG at gc.endSeconds (end of curve)
            anchorSeconds = gc ? gc.endSeconds : time;
            offsetSeconds = -svgWidthInSeconds;
        }

        console.log(`SVG alignment: ${alignment}`, {
            anchorSeconds,
            offsetSeconds: offsetSeconds.toFixed(4),
            svgWidthInSeconds: svgWidthInSeconds.toFixed(4),
            leftEdge: (anchorSeconds + offsetSeconds).toFixed(3),
            rightEdge: (anchorSeconds + offsetSeconds + svgWidthInSeconds).toFixed(3)
        });

        // Create SVG element wrapper
        const id = SVGElementManager.nextId++;
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        wrapper.setAttribute('id', `svg-element-${id}`);
        wrapper.setAttribute('class', 'svg-element-wrapper');

        const image = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        let svgString = new XMLSerializer().serializeToString(svgEl);
        svgString = svgString.replace(/currentColor/g, '#000000');
        const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
        image.setAttribute('href', dataUrl);
        image.setAttribute('width', svgWidth);
        image.setAttribute('height', svgHeight);
        wrapper.appendChild(image);

        // ── Blue right-pointing arrow (alignment direction indicator) ──
        const arrowLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const arrowY = svgHeight + 4;        // just below SVG bottom
        arrowLine.setAttribute('x1', svgWidth * 0.1);   // start 10% from left
        arrowLine.setAttribute('x2', svgWidth);           // end at right edge (arrowhead)
        arrowLine.setAttribute('marker-end', 'url(#arrow-end-brightBlue-triangle-8)');
        arrowLine.setAttribute('y1', arrowY);
        arrowLine.setAttribute('y2', arrowY);
        arrowLine.setAttribute('stroke', 'rgba(56,126,211,255)'); // brightBlue
        arrowLine.setAttribute('stroke-width', '1.5');
        wrapper.appendChild(arrowLine);

        const elementData = {
            id: id,
            name: `PizzTrem_${alignment}_${time}s`,
            wrapper: wrapper,
            image: image,
            referenceSeconds: anchorSeconds,
            offsetSeconds: offsetSeconds,
            offsetYFraction: 0.10,
            width: svgWidth,
            height: svgHeight,
            scale: scale,
            heightFraction: heightFraction,
            track: trackNum
        };

        const pos = SVGElementManager.calcPixelPosition(elementData);
        elementData._x = pos.x;
        elementData._y = pos.y;
        elementData._page = pos.page;
        elementData._section = pos.section;

        SVGElementManager.elements.push(elementData);
        SVGElementManager.updateElementTransform(elementData);

        const targetContainer = pos.section === 'top'
            ? SVGElementManager.containerTop
            : SVGElementManager.containerBottom;
        targetContainer.appendChild(wrapper);

        wrapper.addEventListener('mousedown', (e) =>
            SVGElementManager.handleElementMouseDown(e, elementData));

        SVGElementManager.updateElementList();
        SVGElementManager.updateVisibility();

        console.log(`✓ SVG inserted: ${elementData.name} (page ${pos.page}, ${pos.section})`);
        return { gc, elementData };

    } catch (err) {
        console.error('testPizzTremGC error:', err);
    }
}

// Quick test calls:
// testPizzTremGC({ time: 243, track: 1, alignment: 'pre' })
// testPizzTremGC({ time: 243, track: 1, alignment: 'post' })
// testPizzTremGC({ time: 243, track: 1, alignment: 'pre', svgPath: '/SVG_graphics/pizz_tremolo/PizzTrem-treble-FTQS6-fff-hp.svg' })
