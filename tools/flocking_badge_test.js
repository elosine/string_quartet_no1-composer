// Flocking Badge — Console Test Script
// Paste this into the browser console to insert an animated Boids badge
// Remove with: document.querySelector('.flocking-badge')?.remove()
//
// CONFIG: Change SCORE_TIME and TRACK before pasting
(function() {
    const SCORE_TIME = 3.6;    // score time in seconds to place badge
    const TRACK = '2';       // track number ('1'-'4')

    // === Badge Config ===
    const BOID_COUNT = 13;
    const FRAMES = 120;      // keyframes (30fps, browser interpolates)
    const DUR = 4;           // seconds per loop
    const TRI_SIZE = 3;      // triangle size in px
    const BORDER_R = 4;      // corner radius
    const BG = '#2D3748';    // dark background
    const BOID_CLR = '#5B9BF5'; // cornflower blue triangles

    // === Compute badge size (= max LW height = trackDims.height / 3) ===
    const scoreTopEl = document.getElementById('ScoreTop');
    const scoreBotEl = document.getElementById('ScoreBottom');
    const td = CompositionPanel.getTrackDimensions(TRACK, scoreTopEl);
    const sz = Math.round(td.height / 3);
    console.log(`Flocking badge: ${sz}×${sz}px (track ${TRACK}, height/3=${td.height}/3)`);

    // === Compute position ===
    const spp = GraphicTimeline.getSecondsPerPage();
    const dispTime = SCORE_TIME + leadInSeconds;
    const page = Math.floor(Math.max(0, dispTime) / spp);
    const section = page % 2 === 0 ? 'top' : 'bottom';
    const targetEl = section === 'top' ? scoreTopEl : scoreBotEl;
    const sw = targetEl.clientWidth;
    const xPct = (dispTime / spp) - page;
    const px = xPct * sw;
    const py = td.y + td.height / 6 - sz / 2; // center in top-third of track (LW center)

    // === Boids Simulation ===
    const M = 3; // inner margin
    const boids = Array.from({length: BOID_COUNT}, () => ({
        x: M + Math.random() * (sz - 2 * M),
        y: M + Math.random() * (sz - 2 * M),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
    }));

    const maxSpd = 1.1, minSpd = 0.2;
    const vRange = sz * 0.5;
    const sDist = sz * 0.12;
    const tFact = 0.25;
    const edge = M + 2;

    function tick() {
        for (const b of boids) {
            let sx = 0, sy = 0, ax = 0, ay = 0, cx = 0, cy = 0, n = 0;
            for (const o of boids) {
                if (o === b) continue;
                const dx = b.x - o.x, dy = b.y - o.y;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d < vRange) {
                    cx += o.x; cy += o.y;
                    ax += o.vx; ay += o.vy;
                    n++;
                    if (d < sDist) { sx += dx / (d + 0.1); sy += dy / (d + 0.1); }
                }
            }
            if (n) {
                b.vx += (cx / n - b.x) * 0.005 + (ax / n - b.vx) * 0.05 + sx * 0.3;
                b.vy += (cy / n - b.y) * 0.005 + (ay / n - b.vy) * 0.05 + sy * 0.3;
            }
            if (b.x < edge) b.vx += tFact;
            if (b.x > sz - edge) b.vx -= tFact;
            if (b.y < edge) b.vy += tFact;
            if (b.y > sz - edge) b.vy -= tFact;
            const spd = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (spd > maxSpd) { b.vx *= maxSpd / spd; b.vy *= maxSpd / spd; }
            if (spd < minSpd && spd > 0) { b.vx *= minSpd / spd; b.vy *= minSpd / spd; }
        }
        for (const b of boids) {
            b.x = Math.max(M, Math.min(sz - M, b.x + b.vx));
            b.y = Math.max(M, Math.min(sz - M, b.y + b.vy));
        }
    }

    // Warm up (stabilize flock)
    for (let i = 0; i < 200; i++) tick();

    // Record keyframes
    const data = Array.from({length: BOID_COUNT}, () => []);
    for (let f = 0; f < FRAMES; f++) {
        tick();
        for (let i = 0; i < BOID_COUNT; i++) {
            data[i].push({
                x: boids[i].x,
                y: boids[i].y,
                a: Math.atan2(boids[i].vy, boids[i].vx) * 180 / Math.PI
            });
        }
    }

    // Unwrap angles for smooth SMIL interpolation
    for (let i = 0; i < BOID_COUNT; i++) {
        for (let f = 1; f < FRAMES; f++) {
            while (data[i][f].a - data[i][f - 1].a > 180) data[i][f].a -= 360;
            while (data[i][f].a - data[i][f - 1].a < -180) data[i][f].a += 360;
        }
    }

    // === Build SVG ===
    const ns = 'http://www.w3.org/2000/svg';
    const badge = document.createElementNS(ns, 'g');
    badge.setAttribute('transform', `translate(${px.toFixed(1)}, ${py.toFixed(1)})`);
    badge.setAttribute('class', 'flocking-badge');

    // Background rounded rect
    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', sz); bg.setAttribute('height', sz);
    bg.setAttribute('rx', BORDER_R); bg.setAttribute('ry', BORDER_R);
    bg.setAttribute('fill', BG);
    badge.appendChild(bg);

    // Clip path (unique ID)
    const clipId = 'flock-clip-' + Date.now();
    const defs = document.createElementNS(ns, 'defs');
    const cp = document.createElementNS(ns, 'clipPath');
    cp.setAttribute('id', clipId);
    const cr = bg.cloneNode();
    cp.appendChild(cr);
    defs.appendChild(cp);
    badge.appendChild(defs);

    // Flock container clipped to badge bounds
    const flock = document.createElementNS(ns, 'g');
    flock.setAttribute('clip-path', `url(#${clipId})`);

    // Triangle shape (pointing right, centered at origin)
    const s = TRI_SIZE;
    const triD = `M ${s} 0 L ${-s * 0.6} ${s * 0.6} L ${-s * 0.6} ${-s * 0.6} Z`;

    for (let i = 0; i < BOID_COUNT; i++) {
        // Outer group: translate animation
        const outer = document.createElementNS(ns, 'g');
        const atVal = data[i].map(d => `${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(';');
        const at = document.createElementNS(ns, 'animateTransform');
        at.setAttribute('attributeName', 'transform');
        at.setAttribute('type', 'translate');
        at.setAttribute('values', atVal);
        at.setAttribute('dur', `${DUR}s`);
        at.setAttribute('repeatCount', 'indefinite');
        outer.appendChild(at);

        // Inner group: rotate animation
        const inner = document.createElementNS(ns, 'g');
        const arVal = data[i].map(d => `${d.a.toFixed(0)}`).join(';');
        const ar = document.createElementNS(ns, 'animateTransform');
        ar.setAttribute('attributeName', 'transform');
        ar.setAttribute('type', 'rotate');
        ar.setAttribute('values', arVal);
        ar.setAttribute('dur', `${DUR}s`);
        ar.setAttribute('repeatCount', 'indefinite');
        inner.appendChild(ar);

        // Triangle path
        const tri = document.createElementNS(ns, 'path');
        tri.setAttribute('d', triD);
        tri.setAttribute('fill', BOID_CLR);
        inner.appendChild(tri);

        outer.appendChild(inner);
        flock.appendChild(outer);
    }

    badge.appendChild(flock);

    // Add to score
    targetEl.appendChild(badge);

    console.log(`%cFlocking badge inserted at ${SCORE_TIME}s, track ${TRACK}, page ${page} (${section})`,
        'color: #5B9BF5; font-weight: bold');
    console.log('Remove with: document.querySelector(".flocking-badge")?.remove()');
})();
