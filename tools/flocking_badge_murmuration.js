// Flocking Badge — Murmuration Style
// Paste this into the browser console to insert an animated murmuration badge
// Remove with: document.querySelector('.flocking-badge')?.remove()
//
// Key differences from basic Boids:
// - Invisible leader follows a figure-8 path, boids are mildly attracted to it
// - Topological neighbors (nearest 7) instead of distance-based
// - Stronger alignment → coordinated sweeping turns
// - Tighter separation distance → closer formation
//
// CONFIG: Change SCORE_TIME and TRACK before pasting
(function() {
    const SCORE_TIME = 0.75;    // score time in seconds to place badge
    const TRACK = '1';         // track number ('1'-'4')

    // === Badge Config ===
    const BOID_COUNT = 9;
    const FRAMES = 120;        // keyframes (30fps, browser interpolates)
    const DUR = 4;             // seconds per loop
    const TRI_SIZE = 2;        // triangle size in px
    const BORDER_R = 4;        // corner radius
    const BG = '#2D3748';      // dark background
    const BOID_CLR = '#5B9BF5'; // cornflower blue triangles

    // === Murmuration tuning ===
    const NEIGHBOR_COUNT = 7;       // topological neighbors (starlings use ~7)
    const SEPARATION_DIST_FRAC = 0.08; // fraction of badge size
    const ALIGNMENT_WEIGHT = 0.12;  // stronger than basic boids (0.05)
    const COHESION_WEIGHT = 0.008;  // mild cohesion
    const SEPARATION_WEIGHT = 0.4;  // moderate separation
    const LEADER_WEIGHT = 0.003;    // mild leader attraction
    const MAX_SPEED = 1;
    const MIN_SPEED = 0.35;
    const TURN_FACTOR = 0.3;

    // === Compute badge size ===
    const scoreTopEl = document.getElementById('ScoreTop');
    const scoreBotEl = document.getElementById('ScoreBottom');
    const td = CompositionPanel.getTrackDimensions(TRACK, scoreTopEl);
    const sz = Math.round(td.height / 4);
    console.log(`Murmuration badge: ${sz}×${sz}px`);

    // === Compute position ===
    const spp = GraphicTimeline.getSecondsPerPage();
    const dispTime = SCORE_TIME + leadInSeconds;
    const page = Math.floor(Math.max(0, dispTime) / spp);
    const section = page % 2 === 0 ? 'top' : 'bottom';
    const targetEl = section === 'top' ? scoreTopEl : scoreBotEl;
    const sw = targetEl.clientWidth;
    const xPct = (dispTime / spp) - page;
    const px = xPct * sw;
    const py = td.y + td.height / 6 - sz / 2;

    // === Leader path: figure-8 within badge ===
    const cx = sz / 2, cy = sz / 2;
    const rx = sz * 0.3, ry = sz * 0.25;
    function leaderPos(t) {
        // Lemniscate of Bernoulli (figure-8), t in [0, 2π]
        const sint = Math.sin(t);
        const cost = Math.cos(t);
        const denom = 1 + sint * sint;
        return {
            x: cx + rx * cost / denom,
            y: cy + ry * sint * cost / denom
        };
    }

    // === Boids Simulation ===
    const M = 4; // inner margin
    const sDist = sz * SEPARATION_DIST_FRAC;
    const edge = M + 2;

    const boids = Array.from({length: BOID_COUNT}, () => ({
        x: M + Math.random() * (sz - 2 * M),
        y: M + Math.random() * (sz - 2 * M),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2
    }));

    function getNearest(boid, count) {
        const dists = boids
            .filter(o => o !== boid)
            .map(o => ({ o, d: Math.hypot(boid.x - o.x, boid.y - o.y) }))
            .sort((a, b) => a.d - b.d);
        return dists.slice(0, count);
    }

    let leaderT = 0;
    const leaderSpeed = (2 * Math.PI) / (FRAMES); // one full figure-8 per loop

    function tick() {
        // Advance leader along figure-8
        leaderT += leaderSpeed;
        const leader = leaderPos(leaderT);

        for (const b of boids) {
            const neighbors = getNearest(b, NEIGHBOR_COUNT);
            let sx = 0, sy = 0, ax = 0, ay = 0, cohX = 0, cohY = 0;

            for (const { o, d } of neighbors) {
                // Cohesion: steer toward neighbor centroid
                cohX += o.x; cohY += o.y;
                // Alignment: match neighbor heading
                ax += o.vx; ay += o.vy;
                // Separation: push away if too close
                if (d < sDist && d > 0) {
                    sx += (b.x - o.x) / d;
                    sy += (b.y - o.y) / d;
                }
            }

            const n = neighbors.length;
            if (n > 0) {
                // Cohesion
                b.vx += (cohX / n - b.x) * COHESION_WEIGHT;
                b.vy += (cohY / n - b.y) * COHESION_WEIGHT;
                // Alignment
                b.vx += (ax / n - b.vx) * ALIGNMENT_WEIGHT;
                b.vy += (ay / n - b.vy) * ALIGNMENT_WEIGHT;
                // Separation
                b.vx += sx * SEPARATION_WEIGHT;
                b.vy += sy * SEPARATION_WEIGHT;
            }

            // Leader attraction (mild — guides the flock direction)
            b.vx += (leader.x - b.x) * LEADER_WEIGHT;
            b.vy += (leader.y - b.y) * LEADER_WEIGHT;

            // Boundary steering
            if (b.x < edge) b.vx += TURN_FACTOR;
            if (b.x > sz - edge) b.vx -= TURN_FACTOR;
            if (b.y < edge) b.vy += TURN_FACTOR;
            if (b.y > sz - edge) b.vy -= TURN_FACTOR;

            // Clamp speed
            const spd = Math.hypot(b.vx, b.vy);
            if (spd > MAX_SPEED) { b.vx *= MAX_SPEED / spd; b.vy *= MAX_SPEED / spd; }
            if (spd < MIN_SPEED && spd > 0) { b.vx *= MIN_SPEED / spd; b.vy *= MIN_SPEED / spd; }
        }

        // Update positions
        for (const b of boids) {
            b.x = Math.max(M, Math.min(sz - M, b.x + b.vx));
            b.y = Math.max(M, Math.min(sz - M, b.y + b.vy));
        }
    }

    // Warm up
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

    // Unwrap angles
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

    const bg = document.createElementNS(ns, 'rect');
    bg.setAttribute('width', sz); bg.setAttribute('height', sz);
    bg.setAttribute('rx', BORDER_R); bg.setAttribute('ry', BORDER_R);
    bg.setAttribute('fill', BG);
    badge.appendChild(bg);

    const clipId = 'murm-clip-' + Date.now();
    const defs = document.createElementNS(ns, 'defs');
    const cp = document.createElementNS(ns, 'clipPath');
    cp.setAttribute('id', clipId);
    const cr = bg.cloneNode();
    cp.appendChild(cr);
    defs.appendChild(cp);
    badge.appendChild(defs);

    const flock = document.createElementNS(ns, 'g');
    flock.setAttribute('clip-path', `url(#${clipId})`);

    const s = TRI_SIZE;
    const triD = `M ${s} 0 L ${-s * 0.6} ${s * 0.6} L ${-s * 0.6} ${-s * 0.6} Z`;

    for (let i = 0; i < BOID_COUNT; i++) {
        const outer = document.createElementNS(ns, 'g');
        const atVal = data[i].map(d => `${d.x.toFixed(1)} ${d.y.toFixed(1)}`).join(';');
        const at = document.createElementNS(ns, 'animateTransform');
        at.setAttribute('attributeName', 'transform');
        at.setAttribute('type', 'translate');
        at.setAttribute('values', atVal);
        at.setAttribute('dur', `${DUR}s`);
        at.setAttribute('repeatCount', 'indefinite');
        outer.appendChild(at);

        const inner = document.createElementNS(ns, 'g');
        const arVal = data[i].map(d => `${d.a.toFixed(0)}`).join(';');
        const ar = document.createElementNS(ns, 'animateTransform');
        ar.setAttribute('attributeName', 'transform');
        ar.setAttribute('type', 'rotate');
        ar.setAttribute('values', arVal);
        ar.setAttribute('dur', `${DUR}s`);
        ar.setAttribute('repeatCount', 'indefinite');
        inner.appendChild(ar);

        const tri = document.createElementNS(ns, 'path');
        tri.setAttribute('d', triD);
        tri.setAttribute('fill', BOID_CLR);
        inner.appendChild(tri);

        outer.appendChild(inner);
        flock.appendChild(outer);
    }

    badge.appendChild(flock);
    targetEl.appendChild(badge);

    console.log(`%cMurmuration badge inserted at ${SCORE_TIME}s, track ${TRACK}, page ${page} (${section})`,
        'color: #5B9BF5; font-weight: bold');
    console.log('Remove with: document.querySelector(".flocking-badge")?.remove()');
})();
