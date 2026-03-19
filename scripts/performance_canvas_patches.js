/**
 * Performance Canvas Patches — Phase 2 Animation Optimizations
 * 
 * Applied by build_performance_app.js to replace SVG per-frame updates
 * with HTML5 canvas overlay rendering. This eliminates GPU rasterization
 * bottleneck from per-frame SVG setAttribute calls.
 * 
 * Patches:
 *   O3b: Replace createCursor + updateCursorDimensions (add canvas overlay methods)
 *   O3c: Replace update() through getPosition() (canvas draw methods)
 *   O4:  Replace GCMaker.update() (draw balls on canvas instead of SVG)
 */

'use strict';

module.exports = function applyCanvasPatches(html) {

    function replaceOnce(oldStr, newStr, label) {
        const idx = html.indexOf(oldStr);
        if (idx === -1) {
            console.error(`  ✗ PATCH FAILED [${label}]: marker not found`);
            console.error(`    Looking for: ${oldStr.substring(0, 80)}...`);
            return;
        }
        html = html.substring(0, idx) + newStr + html.substring(idx + oldStr.length);
        console.log(`  ✓ ${label}`);
    }

    function stripBetween(startMarker, endMarker, label) {
        const startIdx = html.indexOf(startMarker);
        if (startIdx === -1) {
            console.error(`  ✗ STRIP FAILED [${label}]: start marker not found`);
            console.error(`    Looking for: ${startMarker.substring(0, 80)}...`);
            return;
        }
        const endIdx = html.indexOf(endMarker, startIdx + startMarker.length);
        if (endIdx === -1) {
            console.error(`  ✗ STRIP FAILED [${label}]: end marker not found`);
            console.error(`    Looking for: ${endMarker.substring(0, 80)}...`);
            return;
        }
        const removed = html.substring(startIdx, endIdx);
        html = html.substring(0, startIdx) + html.substring(endIdx);
        console.log(`  ✓ ${label} (removed ${removed.length} chars)`);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // O3b: Replace createCursor + updateCursorDimensions with canvas versions
    // ═════════════════════════════════════════════════════════════════════════

    stripBetween(
        'createCursor(staffIndex) {\n                // Create SVG rect elements for both ScoreTop and ScoreBottom',
        '            // Staff header SVG paths',
        'O3b: Strip old createCursor + updateCursorDimensions'
    );

    const newCursorBlock = `createCursor(staffIndex) {
                // Phase 2: No SVG elements — all drawing done on canvas overlay
                return {
                    staffIndex: staffIndex,
                    currentSection: 'top',
                    xPosition: 0,
                    xPercent: 0,
                    currentCurveValue: null,
                    currentMotiveProgress: null
                };
            },
            
            // Phase 2: Create canvas overlays for animated elements
            _createCanvasOverlays() {
                const baseStyle = 'position:absolute;pointer-events:none;z-index:10;';
                this._canvasTop = document.createElement('canvas');
                this._canvasTop.style.cssText = baseStyle;
                this.scoreTopEl.parentElement.style.position = 'relative';
                this.scoreTopEl.parentElement.appendChild(this._canvasTop);
                this._canvasBottom = document.createElement('canvas');
                this._canvasBottom.style.cssText = baseStyle;
                this.scoreBottomEl.parentElement.style.position = 'relative';
                this.scoreBottomEl.parentElement.appendChild(this._canvasBottom);
                this._resizeCanvases();
            },
            
            // Phase 2: Resize canvases to match SVG dimensions (HiDPI-aware)
            _resizeCanvases() {
                if (!this._canvasTop || !this._canvasBottom) return;
                const dpr = window.devicePixelRatio || 1;
                [[this._canvasTop, this.scoreTopEl], [this._canvasBottom, this.scoreBottomEl]].forEach(([canvas, svg]) => {
                    const rect = svg.getBoundingClientRect();
                    const parentRect = svg.parentElement.getBoundingClientRect();
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    canvas.style.left = (rect.left - parentRect.left) + 'px';
                    canvas.style.top = (rect.top - parentRect.top) + 'px';
                    canvas.style.width = rect.width + 'px';
                    canvas.style.height = rect.height + 'px';
                });
                this._ctxTop = this._canvasTop.getContext('2d');
                this._ctxTop.setTransform(dpr, 0, 0, dpr, 0, 0);
                this._ctxBottom = this._canvasBottom.getContext('2d');
                this._ctxBottom.setTransform(dpr, 0, 0, dpr, 0, 0);
                this._cachedScoreWidth = this.scoreTopEl.clientWidth;
                this._cachedScoreHeight = this.scoreTopEl.clientHeight;
                this._cachedStaffHeight = (this._cachedScoreHeight - this.timelineHeight) / 4;
            },
            
            // Phase 2: Cache dimensions only — no SVG cursor elements to resize
            updateCursorDimensions() {
                this._cachedScoreWidth = this.scoreTopEl.clientWidth;
                this._cachedScoreHeight = this.scoreTopEl.clientHeight;
                this._cachedStaffHeight = (this._cachedScoreHeight - this.timelineHeight) / 4;
                this.updateStaffDividers();
            },
            
            `;

    replaceOnce(
        '            // Staff header SVG paths',
        newCursorBlock + '// Staff header SVG paths',
        'O3b: Insert canvas createCursor + overlay methods'
    );

    // ═════════════════════════════════════════════════════════════════════════
    // O3c: Replace update() through getPosition() with canvas draw methods
    // ═════════════════════════════════════════════════════════════════════════

    stripBetween(
        '            update() {\n                // Get current score time (not clock time)',
        '        };\n        \n        // Initialize staff cursors after DOM is ready',
        'O3c: Strip old update/pie/lw/curve/getPosition'
    );

    const newUpdateBlock = `            update() {
                const currentScoreTimeMs = ScoreTime.now();
                const totalPagesTraveled = this.calculateTotalPages(currentScoreTimeMs);
                this.updateStaticMotiveWindows(currentScoreTimeMs, totalPagesTraveled);
                const positionInCycle = totalPagesTraveled % 2;
                let xPercent, inTop, inBottom;
                if (positionInCycle < 1) {
                    xPercent = positionInCycle * 100;
                    inTop = true; inBottom = false;
                } else {
                    xPercent = (positionInCycle - 1) * 100;
                    inTop = false; inBottom = true;
                }
                const scoreWidth = this._cachedScoreWidth || this.scoreTopEl.clientWidth;
                const xPixel = (xPercent / 100) * scoreWidth;
                const currentSection = inTop ? 'top' : 'bottom';
                const currentDisplayTimeSec = (currentScoreTimeMs / 1000) - leadInSeconds;
                // Canvas: clear both, draw on active
                const ctxTop = this._ctxTop;
                const ctxBottom = this._ctxBottom;
                if (!ctxTop || !ctxBottom) return;
                const dpr = window.devicePixelRatio || 1;
                ctxTop.clearRect(0, 0, this._canvasTop.width / dpr, this._canvasTop.height / dpr);
                ctxBottom.clearRect(0, 0, this._canvasBottom.width / dpr, this._canvasBottom.height / dpr);
                const ctx = inTop ? ctxTop : ctxBottom;
                const scoreHeight = this._cachedScoreHeight || this.scoreTopEl.clientHeight;
                const staffHeight = this._cachedStaffHeight || ((scoreHeight - this.timelineHeight) / 4);
                this.cursors.forEach((cursor, staffIndex) => {
                    cursor.currentSection = currentSection;
                    cursor.xPosition = xPixel;
                    cursor.xPercent = xPercent;
                    const yPosition = this.timelineHeight + (staffIndex * staffHeight);
                    // Draw cursor line (3px wide)
                    ctx.fillStyle = this.colors[staffIndex];
                    ctx.fillRect(xPixel - 1.5, yPosition, 3, staffHeight);
                    // Draw overlay elements
                    this._drawCurveFollower(ctx, cursor, staffIndex, xPixel, xPercent, currentSection, currentDisplayTimeSec, yPosition, staffHeight);
                    this._drawMotivePie(ctx, cursor, staffIndex, xPixel, currentDisplayTimeSec, yPosition, staffHeight);
                    this._drawLineWedgeMeter(ctx, cursor, staffIndex, xPixel, currentDisplayTimeSec, yPosition, staffHeight);
                });
            },
            
            // Phase 2 canvas: Draw motive pie dial
            _drawMotivePie(ctx, cursor, staffIndex, xPixel, currentTimeSec, yPosition, staffHeight) {
                const gTrack = String(staffIndex + 1);
                let activeItem = null;
                if (window.MotiveMaker) {
                    for (const m of MotiveMaker.motives) {
                        if (m.gTrack === gTrack && currentTimeSec >= m.startSeconds && currentTimeSec <= m.endSeconds) {
                            activeItem = m; break;
                        }
                    }
                }
                if (!activeItem && window.CurveMaker) {
                    for (const c of CurveMaker.curves) {
                        if (c.gTrack === gTrack && currentTimeSec >= c.startSeconds && currentTimeSec <= c.endSeconds) {
                            activeItem = c; break;
                        }
                    }
                }
                if (!activeItem) { cursor.currentMotiveProgress = null; return; }
                const progress = (currentTimeSec - activeItem.startSeconds) / (activeItem.endSeconds - activeItem.startSeconds);
                cursor.currentMotiveProgress = progress;
                const pieSize = staffHeight / 4;
                const pieX = xPixel - 11 - pieSize - 2;
                const pieY = yPosition;
                const centerX = pieX + pieSize / 2;
                const centerY = pieY + pieSize / 2;
                const radius = pieSize / 2 - 1;
                const color = ColorMap[activeItem.color] || activeItem.color;
                const remaining = 1 - progress;
                if (remaining > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.3;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    if (remaining >= 1) {
                        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                    } else {
                        const startAngle = -Math.PI / 2 + (progress * 2 * Math.PI);
                        const endAngle = -Math.PI / 2 + (2 * Math.PI);
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
                        ctx.closePath();
                    }
                    ctx.fill();
                    ctx.restore();
                }
                // Clock hand
                const handAngle = -Math.PI / 2 + (progress * 2 * Math.PI);
                const handX = centerX + radius * Math.cos(handAngle);
                const handY = centerY + radius * Math.sin(handAngle);
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.lineTo(handX, handY);
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.lineCap = 'round';
                ctx.stroke();
                // Border
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 1;
                ctx.strokeRect(pieX, pieY, pieSize, pieSize);
            },
            
            // Phase 2 canvas: Draw line-wedge meter (donut ring)
            _drawLineWedgeMeter(ctx, cursor, staffIndex, xPixel, currentTimeSec, yPosition, staffHeight) {
                const gTrack = String(staffIndex + 1);
                let activeLW = null;
                if (window.LineWedgeMaker) {
                    for (const lw of LineWedgeMaker.lineWedges) {
                        if (lw.gTrack === gTrack && currentTimeSec >= lw.startSeconds && currentTimeSec <= lw.endSeconds) {
                            activeLW = lw; break;
                        }
                    }
                }
                if (!activeLW) return;
                const duration = activeLW.endSeconds - activeLW.startSeconds;
                const progress = duration > 0 ? (currentTimeSec - activeLW.startSeconds) / duration : 0;
                const meterSize = staffHeight / 3;
                const meterX = xPixel - meterSize;
                const meterY = yPosition;
                // Border
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 0.5;
                ctx.strokeRect(meterX, meterY, meterSize, meterSize);
                // Donut ring
                const centerX = meterX + meterSize / 2;
                const centerY = meterY + meterSize / 2;
                const outerR = meterSize / 2 - 1;
                const ringWidth = outerR * 0.35;
                const midR = outerR - ringWidth / 2;
                const remaining = 1 - progress;
                if (remaining > 0) {
                    ctx.save();
                    ctx.globalAlpha = 0.7;
                    ctx.beginPath();
                    ctx.strokeStyle = '#000000';
                    ctx.lineWidth = ringWidth;
                    ctx.lineCap = 'butt';
                    if (remaining >= 1) {
                        ctx.arc(centerX, centerY, midR, 0, Math.PI * 2);
                    } else {
                        const startAngle = -Math.PI / 2 + (progress * 2 * Math.PI);
                        const endAngle = -Math.PI / 2 + (2 * Math.PI);
                        ctx.arc(centerX, centerY, midR, startAngle, endAngle);
                    }
                    ctx.stroke();
                    ctx.restore();
                }
            },
            
            // Phase 2 canvas: Draw curve follower rectangle
            _drawCurveFollower(ctx, cursor, staffIndex, xPixel, xPercent, section, currentTimeSec, yPosition, staffHeight) {
                const gTrack = window.GTrackSystem ? GTrackSystem.getGTrack(staffIndex) : null;
                if (!gTrack) {
                    cursor.currentCurveValue = null;
                    if (window.GlissandoSystem) GlissandoSystem.hidePitchDisplay(staffIndex);
                    return;
                }
                let foundCurve = null;
                let normalizedY = null;
                for (const item of gTrack.graphicItems) {
                    if (item.type !== 'curve' || !item.curveData) continue;
                    const { startTime, endTime, sampleInterval, samples } = item.curveData;
                    if (currentTimeSec >= startTime && currentTimeSec <= endTime) {
                        const timeOffset = currentTimeSec - startTime;
                        const sampleIndex = Math.floor(timeOffset / sampleInterval);
                        if (sampleIndex >= 0 && sampleIndex < samples.length) {
                            foundCurve = item;
                            normalizedY = samples[sampleIndex];
                            break;
                        }
                    }
                }
                if (!foundCurve || normalizedY === null) {
                    cursor.currentCurveValue = null;
                    if (window.GlissandoSystem) GlissandoSystem.hidePitchDisplay(staffIndex);
                    return;
                }
                const curveColor = foundCurve.color ? (ColorMap[foundCurve.color] || foundCurve.color) : this.colors[staffIndex];
                const fillMode = foundCurve.fillMode || 'line';
                const meterX = xPixel - 11;
                const meterW = 8;
                let fillY, fillHeight;
                if (fillMode === 'top') {
                    fillHeight = (1 - normalizedY) * staffHeight;
                    fillY = yPosition;
                } else {
                    fillHeight = normalizedY * staffHeight;
                    fillY = yPosition + staffHeight - fillHeight;
                }
                // Filled rectangle
                ctx.save();
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = curveColor;
                ctx.fillRect(meterX, fillY, meterW, fillHeight);
                ctx.restore();
                // Meter outline
                ctx.save();
                ctx.globalAlpha = 0.8;
                ctx.strokeStyle = curveColor;
                ctx.lineWidth = 1.5;
                ctx.strokeRect(meterX, yPosition, meterW, staffHeight);
                ctx.restore();
                cursor.currentCurveValue = normalizedY;
                if (window.GlissandoSystem && foundCurve.glissando) {
                    const trackDims = { y: yPosition, height: staffHeight };
                    GlissandoSystem.updatePitchDisplay(staffIndex, section, foundCurve, normalizedY, xPercent, trackDims);
                } else if (window.GlissandoSystem) {
                    GlissandoSystem.hidePitchDisplay(staffIndex);
                }
            },
            
            // Phase 2: Get position from cached cursor data (no SVG attribute reads)
            getPosition(staffIndex) {
                if (staffIndex >= 0 && staffIndex < this.cursors.length) {
                    const cursor = this.cursors[staffIndex];
                    return {
                        xPercent: cursor.xPercent || 0,
                        section: cursor.currentSection || 'top'
                    };
                }
                return null;
            }
        `;

    replaceOnce(
        '        };\n        \n        // Initialize staff cursors after DOM is ready',
        newUpdateBlock + '};\n        \n        // Initialize staff cursors after DOM is ready',
        'O3c: Insert canvas update + draw methods + getPosition'
    );

    // ═════════════════════════════════════════════════════════════════════════
    // O4: GCMaker — draw balls on canvas instead of SVG circles
    // ═════════════════════════════════════════════════════════════════════════

    replaceOnce(
        '// Create ball containers for dynamic ball creation (one ball per active GC)\n                this.ballsTop = {};  // keyed by gc.id\n                this.ballsBottom = {};  // keyed by gc.id',
        '// Phase 2: GC balls drawn on StaffCursors canvas — no SVG containers needed',
        'O4a: Remove ballsTop/ballsBottom init'
    );

    stripBetween(
        '// Update ball position each frame (supports multiple balls for overlapping GCs)\n            update() {',
        '            // Calculate ball position for a specific page',
        'O4b: Strip old GCMaker.update SVG'
    );

    const newGCUpdate = `// Phase 2: Draw GC balls on StaffCursors canvas overlay
            update() {
                const currentScoreTimeMs = ScoreTime.now();
                const currentDisplayTimeSec = (currentScoreTimeMs / 1000) - leadInSeconds;
                const totalPagesTraveled = StaffCursors.calculateTotalPages(currentScoreTimeMs);
                const positionInCycle = totalPagesTraveled % 2;
                const inTop = positionInCycle < 1;
                const currentPage = Math.floor(totalPagesTraveled);
                // Draw on the StaffCursors canvas (after StaffCursors.update clears it)
                const ctx = inTop ? StaffCursors._ctxTop : StaffCursors._ctxBottom;
                if (!ctx) return;
                for (const gc of this.gcs) {
                    if (currentDisplayTimeSec >= gc.startSeconds && currentDisplayTimeSec <= gc.endSeconds) {
                        const ballPos = this.calculateBallPositionForPage(gc, currentDisplayTimeSec, currentPage, inTop);
                        if (ballPos) {
                            ctx.beginPath();
                            ctx.arc(ballPos.x, ballPos.y, 5, 0, Math.PI * 2);
                            ctx.fillStyle = ColorMap[gc.color] || gc.color;
                            ctx.fill();
                        }
                    }
                }
            },
            
            `;

    replaceOnce(
        '            // Calculate ball position for a specific page',
        newGCUpdate + '// Calculate ball position for a specific page',
        'O4b: Insert canvas GCMaker.update'
    );

    return html;
};
