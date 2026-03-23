/**
 * Performance Parts Patches — Phase 3: Multi-page single-track view
 * 
 * Applied by build_performance_app.js AFTER canvas patches (Phase 2).
 * Injects a runtime IIFE that activates when URL has ?track=N&pages=M.
 * 
 * When active:
 *   - Filters score data to show only selected track
 *   - Creates N score sections (4, 6, or 8) instead of 2
 *   - Each section shows 1 track at full available height
 *   - Circular buffer page turns (cursor flows top→bottom, wraps)
 *   - Canvas overlays for each section
 *   - All maker systems (Curves, Motives, LW, Badges, GCs, SVGs) section-aware
 * 
 * URL params:
 *   ?track=1  (1=Violin I, 2=Violin II, 3=Viola, 4=Cello)
 *   ?pages=6  (4, 6, or 8; default 6)
 */

'use strict';

module.exports = function applyPartsPatches(html) {

    // The runtime code is a single IIFE injected before </script>.
    // It runs AFTER all systems are initialized but BEFORE score.json loads.
    const runtimeCode = `

    // ═══ Phase 3: Parts Mode — Multi-page single-track view ═══
    (function initPartsMode() {
        var params = new URLSearchParams(window.location.search);
        var trackParam = parseInt(params.get('track'));
        var pagesParam = parseInt(params.get('pages'));

        if (!(trackParam >= 1 && trackParam <= 4)) return; // Not parts mode

        var TRACK = trackParam;
        var PAGE_COUNT = [4, 6, 8].indexOf(pagesParam) !== -1 ? pagesParam : 6;
        var TRACK_NAMES = { 1: 'Violin I', 2: 'Violin II', 3: 'Viola', 4: 'Cello' };
        var STAFF_INDEX = TRACK - 1; // 0-based

        // Cap SVG element and GC sizes: when PAGE_COUNT < this, constrain to this equivalent
        var MAX_ELEMENT_PAGES = 5;

        console.log('[PartsMode] Track ' + TRACK + ' (' + TRACK_NAMES[TRACK] + '), ' + PAGE_COUNT + ' pages');

        // ─── Global config ──────────────────────────────────────────────────
        var PM = {
            active: true,
            track: TRACK,
            pageCount: PAGE_COUNT,
            sections: [],       // { el, row, canvas, ctx, tickGroup }
            sectionPages: [],   // which page number each section currently shows
        };
        window.PartsMode = PM;

        // ═══════════════════════════════════════════════════════════════════════
        // 1. DOM: Keep existing 2 sections, add N-2 more
        // ═══════════════════════════════════════════════════════════════════════

        var scoreContainer = document.getElementById('ScoreContainer');
        var scoreTopEl = document.getElementById('ScoreTop');
        var scoreBottomEl = document.getElementById('ScoreBottom');

        // Section 0 = existing ScoreTop
        PM.sections.push({
            el: scoreTopEl,
            row: scoreTopEl.parentElement,
            canvas: StaffCursors._canvasTop || null,
            ctx: StaffCursors._ctxTop || null,
            tickGroup: GraphicTimeline.topGroup || null
        });
        // Section 1 = existing ScoreBottom
        PM.sections.push({
            el: scoreBottomEl,
            row: scoreBottomEl.parentElement,
            canvas: StaffCursors._canvasBottom || null,
            ctx: StaffCursors._ctxBottom || null,
            tickGroup: GraphicTimeline.bottomGroup || null
        });

        // Sections 2..N-1 = new
        for (var si = 2; si < PAGE_COUNT; si++) {
            var row = document.createElement('div');
            row.className = 'score-row';
            row.style.position = 'relative';

            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('id', 'ScoreSection' + si);
            svg.style.width = '100%';
            svg.style.display = 'block';
            svg.style.background = 'white';
            svg.style.overflow = 'hidden';
            svg.style.contain = 'layout style paint';

            row.appendChild(svg);
            scoreContainer.appendChild(row);

            // Tick group
            var tg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            tg.setAttribute('class', 'timeline-ticks');
            svg.appendChild(tg);

            // Canvas overlay
            var canvas = document.createElement('canvas');
            canvas.style.cssText = 'position:absolute;pointer-events:none;z-index:10;';
            row.appendChild(canvas);

            PM.sections.push({ el: svg, row: row, canvas: canvas, ctx: null, tickGroup: tg });
        }

        // ─── Layout fixes: explicit pixel heights for SVGs ─────
        // SVG elements ignore flex sizing and return intrinsic 150px clientHeight.
        // We compute explicit pixel heights from the container's actual height.
        scoreTopEl.style.margin = '0';
        scoreBottomEl.style.margin = '0';
        scoreTopEl.style.width = '100%';
        scoreTopEl.style.display = 'block';
        scoreBottomEl.style.width = '100%';
        scoreBottomEl.style.display = 'block';

        var GAP_PX = 3;
        scoreContainer.style.gap = GAP_PX + 'px';

        // Hide the .score-row flex:1 default — rows now get explicit heights too
        var allRows = scoreContainer.querySelectorAll('.score-row');
        for (var ri = 0; ri < allRows.length; ri++) {
            allRows[ri].style.flex = 'none';
        }

        function resizeSections() {
            var containerH = scoreContainer.clientHeight;
            var totalGap = (PAGE_COUNT - 1) * GAP_PX;
            var sectionH = Math.floor((containerH - totalGap) / PAGE_COUNT);
            for (var i = 0; i < PAGE_COUNT; i++) {
                var sec = PM.sections[i];
                sec.el.style.height = sectionH + 'px';
                sec.row.style.height = sectionH + 'px';
            }
            PM.sectionHeight = sectionH;
            return sectionH;
        }

        // Set PM.sectionHeight immediately (synchronous) so GC code has a value
        // even before rAF fires. Container may not have final height yet but it's
        // better than SVG intrinsic 150px.
        resizeSections();

        // Deferred re-size after layout settles, then trigger dependent handlers
        requestAnimationFrame(function() {
            resizeSections();
            if (window.GCMaker && GCMaker._importedData && GCMaker._importedData.gcs) {
                GCMaker.reloadFromDatabase();
            }
            window.dispatchEvent(new Event('resize'));
        });

        // Use ResizeObserver on container — catches ALL size changes
        // (window resize, toolbar appearing, DOM layout changes)
        var _resizeObsTimer = null;
        var resizeObs = new ResizeObserver(function() {
            // Debounce to avoid thrashing
            clearTimeout(_resizeObsTimer);
            _resizeObsTimer = setTimeout(function() {
                var oldH = PM.sectionHeight;
                resizeSections();
                // Only reload GCs if height actually changed
                if (PM.sectionHeight !== oldH) {
                    // Resize canvas overlays and update cached dimensions
                    resizeAllCanvases();
                    if (window.StaffCursors) {
                        StaffCursors._cachedScoreWidth = PM.sections[0].el.clientWidth;
                        StaffCursors._cachedScoreHeight = PM.sectionHeight;
                        StaffCursors._cachedStaffHeight = PM.sectionHeight - StaffCursors.timelineHeight;
                    }
                    // Re-render ticks (font sizes are proportional to sectionHeight)
                    if (window.GraphicTimeline && GraphicTimeline._renderSectionTicks) {
                        for (var ti = 0; ti < PAGE_COUNT; ti++) GraphicTimeline._renderSectionTicks(ti);
                    }
                    // Update staff header sizing
                    if (window.StaffCursors && StaffCursors.updateStaffHeaders) {
                        StaffCursors.updateStaffHeaders();
                    }
                    if (window.GCMaker && GCMaker._importedData && GCMaker._importedData.gcs) {
                        GCMaker.reloadFromDatabase();
                    }
                }
            }, 50);
        });
        resizeObs.observe(scoreContainer);

        // Remove existing staff divider lines (created in StaffCursors.init before parts mode)
        if (StaffCursors.staffDividers) {
            StaffCursors.staffDividers.forEach(function(d) {
                if (d.topEl) d.topEl.remove();
                if (d.bottomEl) d.bottomEl.remove();
            });
            StaffCursors.staffDividers = [];
        }

        // Fix staff header: show only selected track's label + clef, hide connector line
        if (StaffCursors.staffConnector) StaffCursors.staffConnector.style.display = 'none';
        for (var hi = 0; hi < 4; hi++) {
            if (hi !== STAFF_INDEX) {
                if (StaffCursors.staffHeaders[hi]) StaffCursors.staffHeaders[hi].style.display = 'none';
                if (StaffCursors.staffLabels[hi]) StaffCursors.staffLabels[hi].style.display = 'none';
            }
        }

        // Override updateStaffHeaders for parts mode: 3x bigger, vertically centered
        StaffCursors.updateStaffHeaders = function() {
            if (!this.staffHeaderGroup) return;
            var scoreHeight = PM.sectionHeight || PM.sections[0].el.clientHeight;
            var scoreWidth = PM.sections[0].el.clientWidth;
            if (!scoreHeight || !scoreWidth) return;
            var availableHeight = scoreHeight - this.timelineHeight;

            var secondsPerPage = (60 / beatsPerMinute) * beatsPerPage;
            var leadInFraction = leadInSeconds / secondsPerPage;
            var leadInPixels = leadInFraction * scoreWidth;
            var pixelsPerSecond = scoreWidth / secondsPerPage;

            // Header clef: 40% of available height (3x the original 1/3-of-track size)
            var headerHeight = availableHeight * 0.4;
            var svgAspectRatio = 5.8450 / 7.2360;
            var headerWidth = headerHeight * svgAspectRatio;
            var staffLineStartFraction = 0.775 / 5.8450;

            var svgRightEdge = leadInPixels - pixelsPerSecond;
            var svgLeftEdge = svgRightEdge - headerWidth;
            var connectorX = svgLeftEdge + (staffLineStartFraction * headerWidth);
            var labelRightEdge = connectorX - 8;

            var fontSize = Math.max(10, headerHeight * 0.35);

            // Vertically center in the section
            var headerYOffset = (availableHeight - headerHeight) / 2;
            var yPosition = this.timelineHeight + headerYOffset;

            var header = this.staffHeaders[STAFF_INDEX];
            if (header) {
                header.setAttribute('x', svgLeftEdge);
                header.setAttribute('y', yPosition);
                header.setAttribute('height', headerHeight);
            }

            var label = this.staffLabels[STAFF_INDEX];
            if (label) {
                label.setAttribute('x', labelRightEdge);
                label.setAttribute('y', this.timelineHeight + availableHeight / 2);
                label.setAttribute('font-size', fontSize + 'px');
            }
        };

        // Initialize sectionPages: section i shows page i
        for (var i = 0; i < PAGE_COUNT; i++) PM.sectionPages.push(i);

        // ═══════════════════════════════════════════════════════════════════════
        // 2. Canvas management: resize all N canvases
        // ═══════════════════════════════════════════════════════════════════════

        function resizeAllCanvases() {
            var dpr = window.devicePixelRatio || 1;
            for (var i = 0; i < PAGE_COUNT; i++) {
                var sec = PM.sections[i];
                if (!sec.canvas) continue;
                var rect = sec.el.getBoundingClientRect();
                var parentRect = sec.row.getBoundingClientRect();
                sec.canvas.width = rect.width * dpr;
                sec.canvas.height = rect.height * dpr;
                sec.canvas.style.left = (rect.left - parentRect.left) + 'px';
                sec.canvas.style.top = (rect.top - parentRect.top) + 'px';
                sec.canvas.style.width = rect.width + 'px';
                sec.canvas.style.height = rect.height + 'px';
                sec.ctx = sec.canvas.getContext('2d');
                sec.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            }
            // Keep Phase 2 aliases in sync
            StaffCursors._canvasTop = PM.sections[0].canvas;
            StaffCursors._canvasBottom = PM.sections[1].canvas;
            StaffCursors._ctxTop = PM.sections[0].ctx;
            StaffCursors._ctxBottom = PM.sections[1].ctx;
        }

        // Initial canvas sizing (deferred to let layout settle)
        requestAnimationFrame(function() { resizeAllCanvases(); });

        // ═══════════════════════════════════════════════════════════════════════
        // 3. StaffCursors overrides
        // ═══════════════════════════════════════════════════════════════════════

        StaffCursors._resizeCanvases = function() {
            resizeAllCanvases();
            this._cachedScoreWidth = PM.sections[0].el.clientWidth;
            this._cachedScoreHeight = PM.sections[0].el.clientHeight;
            this._cachedStaffHeight = this._cachedScoreHeight - this.timelineHeight;
        };

        StaffCursors.updateCursorDimensions = function() {
            this._cachedScoreWidth = PM.sections[0].el.clientWidth || this.scoreTopEl.clientWidth;
            this._cachedScoreHeight = PM.sections[0].el.clientHeight || this.scoreTopEl.clientHeight;
            this._cachedStaffHeight = this._cachedScoreHeight - this.timelineHeight;
        };

        // No staff dividers in parts mode (1 track per section)
        StaffCursors.createStaffDividers = function() {};
        StaffCursors.updateStaffDividers = function() {};

        // Override update(): draw 1 cursor on the active section's canvas
        StaffCursors.update = function() {
            var currentScoreTimeMs = ScoreTime.now();
            var totalPagesTraveled = this.calculateTotalPages(currentScoreTimeMs);
            this.updateStaticMotiveWindows(currentScoreTimeMs, totalPagesTraveled);

            var positionInCycle = totalPagesTraveled % PAGE_COUNT;
            var sectionIndex = Math.floor(positionInCycle);
            var xPercent = (positionInCycle - sectionIndex) * 100;
            var currentPage = Math.floor(totalPagesTraveled);

            var scoreWidth = this._cachedScoreWidth || PM.sections[0].el.clientWidth;
            var xPixel = (xPercent / 100) * scoreWidth;
            var scoreHeight = this._cachedScoreHeight || PM.sections[0].el.clientHeight;
            var staffHeight = this._cachedStaffHeight || (scoreHeight - this.timelineHeight);
            var yPosition = this.timelineHeight;

            var currentDisplayTimeSec = (currentScoreTimeMs / 1000) - leadInSeconds;
            var sectionName = sectionIndex === 0 ? 'top' : (sectionIndex === 1 ? 'bottom' : 'section' + sectionIndex);

            // Store cursor state for getPosition()
            var cursor = this.cursors[STAFF_INDEX];
            if (cursor) {
                cursor.currentSection = sectionName;
                cursor.xPosition = xPixel;
                cursor.xPercent = xPercent;
                cursor._page = currentPage;
                cursor._sectionIndex = sectionIndex;
            }

            // Clear ALL canvases
            var dpr = window.devicePixelRatio || 1;
            for (var ci = 0; ci < PAGE_COUNT; ci++) {
                var s = PM.sections[ci];
                if (s.ctx) s.ctx.clearRect(0, 0, s.canvas.width / dpr, s.canvas.height / dpr);
            }

            // Draw cursor on active section
            var ctx = PM.sections[sectionIndex].ctx;
            if (!ctx) return;

            ctx.fillStyle = this.colors[STAFF_INDEX];
            ctx.fillRect(xPixel - 1.5, yPosition, 3, staffHeight);

            // Draw overlay elements
            if (this._drawMotivePie)
                this._drawMotivePie(ctx, cursor, STAFF_INDEX, xPixel, currentDisplayTimeSec, yPosition, staffHeight);
            if (this._drawLineWedgeMeter)
                this._drawLineWedgeMeter(ctx, cursor, STAFF_INDEX, xPixel, currentDisplayTimeSec, yPosition, staffHeight);
            if (this._drawCurveFollower)
                this._drawCurveFollower(ctx, cursor, STAFF_INDEX, xPixel, xPercent, sectionName, currentDisplayTimeSec, yPosition, staffHeight);
        };

        // Override getPosition to return page + sectionIndex
        StaffCursors.getPosition = function(staffIndex) {
            var cursor = this.cursors[STAFF_INDEX];
            if (!cursor) return null;
            return {
                xPercent: cursor.xPercent || 0,
                section: cursor.currentSection || 'top',
                page: cursor._page || 0,
                sectionIndex: cursor._sectionIndex || 0
            };
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 4. GraphicTimeline overrides
        // ═══════════════════════════════════════════════════════════════════════

        GraphicTimeline._lastSectionIndex = 0;

        // Helper: render ticks for a section by index
        GraphicTimeline._renderSectionTicks = function(sIdx) {
            var sec = PM.sections[sIdx];
            if (!sec || !sec.tickGroup) return;
            var group = sec.tickGroup;
            while (group.firstChild) group.removeChild(group.firstChild);

            var pageNumber = PM.sectionPages[sIdx];
            var secondsPerPage = this.getSecondsPerPage();
            var rawStartSecond = pageNumber * secondsPerPage;
            var startSecond = rawStartSecond - leadInSeconds;
            var endSecond = startSecond + secondsPerPage;

            // Second markers (matching original renderTicksForSection but 2x size)
            for (var s = Math.floor(startSecond); s <= Math.ceil(endSecond); s++) {
                var adjustedSec = s + leadInSeconds;
                var xPercent = ((adjustedSec - rawStartSecond) / secondsPerPage) * 100;
                if (xPercent < 0 || xPercent > 100) continue;

                var isFifthSecond = s % 5 === 0;
                var isLeadIn = s < 0;
                var color = isLeadIn ? '#cc3333' : '#000';

                if (isFifthSecond) {
                    var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    line.setAttribute('x1', xPercent + '%');
                    line.setAttribute('y1', '0');
                    line.setAttribute('x2', xPercent + '%');
                    line.setAttribute('y2', '6');
                    line.setAttribute('stroke', color);
                    line.setAttribute('stroke-width', '1.5');
                    group.appendChild(line);

                    var secLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    secLabel.setAttribute('x', xPercent + '%');
                    secLabel.setAttribute('y', '18');
                    secLabel.setAttribute('font-family', 'Lato, sans-serif');
                    var tickFontSize = Math.max(6, Math.round(PM.sectionHeight * 0.08));
                    secLabel.setAttribute('font-size', tickFontSize);
                    secLabel.setAttribute('fill', color);
                    var anchor = 'middle';
                    if (xPercent < 3) anchor = 'start';
                    else if (xPercent > 97) anchor = 'end';
                    secLabel.setAttribute('text-anchor', anchor);
                    secLabel.textContent = s.toString();
                    group.appendChild(secLabel);
                } else {
                    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    dot.setAttribute('cx', xPercent + '%');
                    dot.setAttribute('cy', '2');
                    dot.setAttribute('r', '1.5');
                    dot.setAttribute('fill', color);
                    group.appendChild(dot);
                }
            }

            // Page number label (top-left, bigger)
            var label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', '3');
            label.setAttribute('y', '7');
            label.setAttribute('font-family', 'Lato, sans-serif');
            var pgFontSize = Math.max(6, Math.round(PM.sectionHeight * 0.08));
            label.setAttribute('font-size', pgFontSize);
            label.setAttribute('font-weight', 'bold');
            label.setAttribute('fill', '#000');
            label.textContent = 'P' + (pageNumber + 1);
            group.appendChild(label);
        };

        // Override checkPageChange: circular buffer
        GraphicTimeline.checkPageChange = function() {
            var position = StaffCursors.getPosition(0);
            if (!position || position.sectionIndex === undefined) return;

            var si = position.sectionIndex;
            if (si !== this._lastSectionIndex) {
                // When loop is active, suppress section flips — pages stay static.
                // The server's scoreGoto on loop rewind calls onGoto for full layout.
                var loopActive = window.LoopSystem && LoopSystem.isEnabled();

                if (!loopActive && this._lastSectionIndex !== undefined && this._lastSectionIndex !== null) {
                    // Reload the section we just left with future content
                    var prev = this._lastSectionIndex;
                    PM.sectionPages[prev] = position.page + PAGE_COUNT - 1;
                    this._renderSectionTicks(prev);
                }
                this._lastSectionIndex = si;

                // Backward compat
                this.currentTopPage = PM.sectionPages[0];
                this.currentBottomPage = PM.sectionPages[1];

                this.updateGraphicObjectsVisibility();
            }
        };

        // Override onGoto: sequential layout — all N sections show consecutive
        // pages starting from the screen that contains targetPage.
        // Section 0 = basePage, section N-1 = basePage + N - 1.
        // The circular buffer (checkPageChange) handles continuous playback
        // separately — it rotates one section at a time as the cursor passes.
        GraphicTimeline.onGoto = function(targetSeconds) {
            var secondsPerPage = this.getSecondsPerPage();
            var targetPage = Math.floor(targetSeconds / secondsPerPage);
            var targetSi = targetPage % PAGE_COUNT;

            // Circular buffer layout: target page on its natural section,
            // sections ahead get upcoming pages, sections behind (already
            // passed) get future pages — matches normal playback state.
            // For screen-aligned targets (manual page turn), targetSi=0
            // and this reduces to sequential [basePage..basePage+N-1].
            for (var i = 0; i < PAGE_COUNT; i++) {
                PM.sectionPages[i] = targetPage + ((i - targetSi + PAGE_COUNT) % PAGE_COUNT);
            }
            this._lastSectionIndex = targetSi;
            this.currentTopPage = PM.sectionPages[0];
            this.currentBottomPage = PM.sectionPages[1];

            // Sync ScoreTime so cursor matches and checkPageChange won't revert
            var targetMs = targetSeconds * 1000;
            if (window.ScoreTime) {
                if (ScoreTime.isPlaying && window.ClockSync) {
                    ScoreTime.scoreTimeOffset = ClockSync.now() - targetMs;
                } else {
                    ScoreTime.currentScoreTimeMs = targetMs;
                }
            }

            for (var j = 0; j < PAGE_COUNT; j++) this._renderSectionTicks(j);
            this.updateGraphicObjectsVisibility();

            // Force staff content re-render (animation loop may not be running)
            if (window.TrackSystem) TrackSystem.update();

            // Update overlay and minimap page display
            if (window.ControlsOverlay) ControlsOverlay.refresh();
        };

        // Override reset
        GraphicTimeline.reset = function() {
            for (var i = 0; i < PAGE_COUNT; i++) PM.sectionPages[i] = i;
            this._lastSectionIndex = 0;
            this.currentTopPage = 0;
            this.currentBottomPage = 1;
            for (var j = 0; j < PAGE_COUNT; j++) this._renderSectionTicks(j);
            this.updateGraphicObjectsVisibility();
        };

        // Override renderTicks to render all N sections
        GraphicTimeline.renderTicks = function() {
            for (var i = 0; i < PAGE_COUNT; i++) this._renderSectionTicks(i);
        };

        // Override renderTicksForSection to use section index mapping
        GraphicTimeline.renderTicksForSection = function(section) {
            var idx = section === 'top' ? 0 : (section === 'bottom' ? 1 : parseInt(section) || 0);
            this._renderSectionTicks(idx);
        };

        // Render initial ticks
        for (var ti = 0; ti < PAGE_COUNT; ti++) GraphicTimeline._renderSectionTicks(ti);

        // Override staff header visibility: show only on section 0
        var origUpdateGOV = GraphicTimeline.updateGraphicObjectsVisibility.bind(GraphicTimeline);
        GraphicTimeline.updateGraphicObjectsVisibility = function() {
            origUpdateGOV();
            // Show staff header only on section showing page 0
            if (window.StaffCursors && StaffCursors.staffHeaderGroup) {
                var showHeaders = PM.sectionPages.indexOf(0) !== -1;
                StaffCursors.staffHeaderGroup.style.display = showHeaders ? '' : 'none';
            }
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 4b. StaffPositions override — single track fills full height
        // ═══════════════════════════════════════════════════════════════════════

        // This is the ROOT dimension function. CompositionPanel.getTrackDimensions
        // calls it, and all maker systems (CurveMaker, MotiveMaker, LineWedgeMaker,
        // BadgeMaker, GCMaker) use CompositionPanel.getTrackDimensions for Y layout.
        // By overriding here, ALL rendering automatically uses parts-mode dimensions.
        if (window.StaffPositions) {
            StaffPositions.getPositions = function(scoreEl) {
                var scoreHeight = scoreEl.clientHeight;
                var availableHeight = scoreHeight - this.timelineHeight;
                // Parts mode: 1 track at full height, all staves at same Y
                var yPos = this.timelineHeight;
                return {
                    Staff1Y: yPos,
                    Staff2Y: yPos,
                    Staff3Y: yPos,
                    Staff4Y: yPos,
                    staffHeight: availableHeight,
                    availableHeight: availableHeight
                };
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 5. SVGElementManager overrides
        // ═══════════════════════════════════════════════════════════════════════

        // Create element containers in new sections
        SVGElementManager._sectionContainers = [
            SVGElementManager.containerTop,
            SVGElementManager.containerBottom
        ];
        for (var sci = 2; sci < PAGE_COUNT; sci++) {
            var c = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            c.setAttribute('id', 'svg-elements-section' + sci);
            PM.sections[sci].el.appendChild(c);
            SVGElementManager._sectionContainers.push(c);
        }

        // Override calcPixelPosition for N sections + 1 track
        SVGElementManager.calcPixelPosition = function(el) {
            var secondsPerPage = window.GraphicTimeline
                ? GraphicTimeline.getSecondsPerPage()
                : (beatsPerPage / beatsPerMinute) * 60;
            var actualSeconds = el.referenceSeconds + el.offsetSeconds;
            var displayTime = actualSeconds + leadInSeconds;

            if (el.offsetSeconds < 0) {
                var refDisplayTime = el.referenceSeconds + leadInSeconds;
                var refPage = Math.floor(Math.max(0, refDisplayTime) / secondsPerPage);
                var pageStartTime = refPage * secondsPerPage;
                if (displayTime < pageStartTime) displayTime = pageStartTime;
            }

            var page = Math.floor(Math.max(0, displayTime) / secondsPerPage);
            var sectionIndex = page % PAGE_COUNT;
            var section = sectionIndex === 0 ? 'top' : (sectionIndex === 1 ? 'bottom' : 'section' + sectionIndex);
            var scoreEl = PM.sections[sectionIndex].el;
            var scoreWidth = scoreEl.clientWidth;

            var xPercent = ((displayTime / secondsPerPage) - page) * 100;
            var x = (xPercent / 100) * scoreWidth;

            // Parts mode: 1 track fills full available height
            var scoreHeight = scoreEl.clientHeight;
            var availableHeight = scoreHeight - StaffCursors.timelineHeight;
            // Cap element sizing at MAX_ELEMENT_PAGES equivalent, center vertically
            var maxTrackH = (window.innerHeight / MAX_ELEMENT_PAGES) - StaffCursors.timelineHeight;
            var usedH = (PAGE_COUNT < MAX_ELEMENT_PAGES) ? Math.min(availableHeight, maxTrackH) : availableHeight;
            var yOff = (availableHeight - usedH) / 2;
            var trackDims = { y: StaffCursors.timelineHeight + yOff, height: usedH };
            var y = trackDims.y + el.offsetYFraction * trackDims.height;

            return { x: x, y: y, page: page, section: section, scoreEl: scoreEl, trackDims: trackDims, secondsPerPage: secondsPerPage, sectionIndex: sectionIndex };
        };

        // Override updateVisibility for N sections
        SVGElementManager.updateVisibility = function() {
            if (!window.GraphicTimeline) return;
            var sp = PM.sectionPages;
            var containers = this._sectionContainers;

            this.elements.forEach(function(el) {
                var visible = false;
                var targetContainer = null;
                for (var i = 0; i < PAGE_COUNT; i++) {
                    if (el._page === sp[i]) {
                        visible = true;
                        targetContainer = containers[i];
                        break;
                    }
                }
                if (!targetContainer) {
                    targetContainer = containers[el._page % PAGE_COUNT];
                }
                if (el.wrapper.parentNode !== targetContainer) {
                    targetContainer.appendChild(el.wrapper);
                }
                el.wrapper.style.display = visible ? '' : 'none';
            });
        };

        // Override reRenderAllElements
        SVGElementManager.reRenderAllElements = function() {
            void PM.sections[0].el.offsetHeight;
            var self = this;
            this.elements.forEach(function(el) {
                var pos = self.calcPixelPosition(el);
                el._x = pos.x;
                el._y = pos.y;
                el._page = pos.page;
                el._section = pos.section;

                var th = pos.trackDims ? pos.trackDims.height : 0;
                // trackDims already has the MAX_ELEMENT_PAGES cap applied from calcPixelPosition
                if (el.heightFraction && el.height && th > 0) {
                    el.scale = (el.heightFraction * th) / el.height;
                }
                self._recalcOffsetSeconds(el);

                var si = pos.sectionIndex !== undefined ? pos.sectionIndex : 0;
                var tc = self._sectionContainers[si];
                if (el.wrapper.parentNode !== tc) tc.appendChild(el.wrapper);
                self.updateElementTransform(el);
            });
            this.updateVisibility();
            if (this.selectedElement) {
                this.updateResizeHandles();
                this.updateAnchorLine(this.selectedElement);
            }
        };

        // ═══════════════════════════════════════════════════════════════════════
        // 6. Generic section-aware visibility for maker systems
        // ═══════════════════════════════════════════════════════════════════════

        // Helper: find section index for a page (-1 if not currently visible)
        function sectionForPage(page) {
            for (var i = 0; i < PAGE_COUNT; i++) {
                if (PM.sectionPages[i] === page) return i;
            }
            return -1;
        }

        // Helper: call showContinuationSegment on a maker with swapped references
        // Saves/restores ALL three element refs (group, path, hitPath) per section
        // so that multi-section continuations don't cross-contaminate path data.
        function callContinuation(maker, item, page, secondsPerPage, leadInSec, sIdx, groupProp) {
            var origEl = maker.scoreTopEl;
            var origBotEl = maker.scoreBottomEl;
            var origGroup = maker[groupProp];
            maker.scoreTopEl = PM.sections[sIdx].el;
            maker.scoreBottomEl = PM.sections[sIdx].el;
            maker[groupProp] = PM.sections[sIdx].el;
            // Save all three continuation refs
            var savedGroup = item.elements.continuationGroupTop;
            var savedPath = item.elements.continuationPathTop;
            var savedHitPath = item.elements.continuationHitPathTop;
            // Set section-specific refs
            var contKey = '_cont_' + sIdx;
            var pathKey = '_contPath_' + sIdx;
            var hitPathKey = '_contHitPath_' + sIdx;
            item.elements.continuationGroupTop = item.elements[contKey] || null;
            item.elements.continuationPathTop = item.elements[pathKey] || null;
            item.elements.continuationHitPathTop = item.elements[hitPathKey] || null;
            maker.showContinuationSegment(item, page, secondsPerPage, leadInSec, 'top');
            // Capture section-specific refs back
            item.elements[contKey] = item.elements.continuationGroupTop;
            item.elements[pathKey] = item.elements.continuationPathTop;
            item.elements[hitPathKey] = item.elements.continuationHitPathTop;
            // Restore original refs
            item.elements.continuationGroupTop = savedGroup;
            item.elements.continuationPathTop = savedPath;
            item.elements.continuationHitPathTop = savedHitPath;
            maker.scoreTopEl = origEl;
            maker.scoreBottomEl = origBotEl;
            maker[groupProp] = origGroup;
            if (item.elements[contKey]) {
                item.elements[contKey].style.display = '';
                if (item.elements[contKey].parentNode !== PM.sections[sIdx].el)
                    PM.sections[sIdx].el.appendChild(item.elements[contKey]);
            }
        }

        // === DIAGNOSTIC: sequence counter to detect reload vs visibility ordering ===
        var _curveSeqCounter = 0;
        var _lastReloadSeq = 0;
        var _lastVisibilitySeq = 0;

        // Override CurveMaker.updateVisibility — with continuation support
        if (window.CurveMaker) {
            CurveMaker.updateVisibility = function() {
                if (!window.GraphicTimeline) return;
                _curveSeqCounter++;
                _lastVisibilitySeq = _curveSeqCounter;
                if (_lastReloadSeq > _lastVisibilitySeq - 2) {
                    console.warn('[CurveDiag ORDER] updateVisibility seq=' + _lastVisibilitySeq + ' right after reloadFromDatabase seq=' + _lastReloadSeq + ' (gap=' + (_lastVisibilitySeq - _lastReloadSeq) + ')');
                }
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;
                var _visLog = [];

                for (var i = 0; i < this.curves.length; i++) {
                    var curve = this.curves[i];
                    if (!curve.elements || !curve.elements.group) continue;

                    var startActual = curve.startSeconds + leadInSec;
                    var endActual = curve.endSeconds + leadInSec;
                    var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
                    var endPage = Math.floor(Math.max(0, endActual) / secondsPerPage);
                    var isMultiPage = endPage > startPage;

                    // Main group: only show if start page is actually visible
                    var startSi = sectionForPage(startPage);
                    if (startSi >= 0) {
                        _visLog.push('curve ' + curve.id + ' start=' + curve.startSeconds.toFixed(1) + 's page=' + startPage + '→sec' + startSi + ' color=' + curve.color);
                        curve.elements.group.style.display = '';
                        var oldParent = curve.elements.group.parentNode;
                        if (oldParent !== PM.sections[startSi].el) {
                            // TEST 2: Log every move — is the curve stuck in bottomCurveGroup?
                            var oldParentName = 'unknown';
                            for (var osi = 0; osi < PAGE_COUNT; osi++) { if (PM.sections[osi].el === oldParent) { oldParentName = 'sec' + osi; break; } }
                            if (oldParent === CurveMaker.topCurveGroup) oldParentName = 'topCurveGroup';
                            if (oldParent === CurveMaker.bottomCurveGroup) oldParentName = 'bottomCurveGroup';
                            console.warn('[CurveDiag MOVE] curve ' + curve.id + ' pg=' + startPage + ' MOVING from ' + oldParentName + ' to sec' + startSi);
                            PM.sections[startSi].el.appendChild(curve.elements.group);
                        }
                        if (isMultiPage) {
                            // Swap ALL section refs so clipCurveToPageEnd's page%2
                            // logic always targets the correct section SVG
                            var origTopEl = this.scoreTopEl;
                            var origTopGroup = this.topCurveGroup;
                            var origBotEl = this.scoreBottomEl;
                            var origBotGroup = this.bottomCurveGroup;
                            this.scoreTopEl = PM.sections[startSi].el;
                            this.topCurveGroup = PM.sections[startSi].el;
                            this.scoreBottomEl = PM.sections[startSi].el;
                            this.bottomCurveGroup = PM.sections[startSi].el;
                            this.clipCurveToPageEnd(curve, startPage, secondsPerPage, leadInSec);
                            this.scoreTopEl = origTopEl;
                            this.topCurveGroup = origTopGroup;
                            this.scoreBottomEl = origBotEl;
                            this.bottomCurveGroup = origBotGroup;
                        }
                    } else {
                        curve.elements.group.style.display = 'none';
                    }

                    // Continuation segments for multi-page curves
                    if (isMultiPage) {
                        for (var si = 0; si < PAGE_COUNT; si++) {
                            var sp = PM.sectionPages[si];
                            var contKey = '_cont_' + si;
                            if (sp > startPage && sp <= endPage) {
                                callContinuation(this, curve, sp, secondsPerPage, leadInSec, si, 'topCurveGroup');
                            } else if (curve.elements[contKey]) {
                                curve.elements[contKey].style.display = 'none';
                            }
                        }
                    }

                    // Hide legacy continuation keys
                    if (curve.elements.continuationGroup)
                        curve.elements.continuationGroup.style.display = 'none';
                    if (curve.elements.continuationGroupTop)
                        curve.elements.continuationGroupTop.style.display = 'none';
                    if (curve.elements.continuationGroupBottom)
                        curve.elements.continuationGroupBottom.style.display = 'none';
                }
            };
        }

        // Wrap CurveMaker.reloadFromDatabase — clean up orphaned elements
        // (updateVisibility moves curve groups OUT of topCurveGroup/bottomCurveGroup
        // into section SVGs, so the original innerHTML='' misses them)
        if (window.CurveMaker && CurveMaker.reloadFromDatabase) {
            var origCurveReload = CurveMaker.reloadFromDatabase.bind(CurveMaker);
            CurveMaker.reloadFromDatabase = function() {
                _curveSeqCounter++;
                _lastReloadSeq = _curveSeqCounter;
                console.warn('[CurveDiag] reloadFromDatabase called. seq=' + _lastReloadSeq + ' (lastVis=' + _lastVisibilitySeq + ') Stack:', new Error().stack);
                for (var ci = 0; ci < this.curves.length; ci++) {
                    var c = this.curves[ci];
                    if (!c.elements) continue;
                    if (c.elements.group) c.elements.group.remove();
                    if (c.elements.continuationGroupTop) c.elements.continuationGroupTop.remove();
                    if (c.elements.continuationGroupBottom) c.elements.continuationGroupBottom.remove();
                    for (var si = 0; si < PAGE_COUNT; si++) {
                        var ck = '_cont_' + si;
                        if (c.elements[ck]) c.elements[ck].remove();
                    }
                }
                origCurveReload();
            };
        }

        // === DIAGNOSTIC: Periodic DOM audit for misplaced curves ===
        setInterval(function() {
            if (!window.CurveMaker || !CurveMaker.curves || CurveMaker.curves.length === 0) return;
            if (!window.AnimationEngine || !AnimationEngine.running) return;
            var secondsPerPage = GraphicTimeline.getSecondsPerPage();
            var leadInSec = leadInSeconds;
            var problems = [];
            for (var ci = 0; ci < CurveMaker.curves.length; ci++) {
                var c = CurveMaker.curves[ci];
                if (!c.elements || !c.elements.group) continue;
                var grp = c.elements.group;
                var disp = grp.style.display;
                var parent = grp.parentNode;
                // Find which section the group is actually in
                var actualSi = -1;
                for (var si = 0; si < PAGE_COUNT; si++) {
                    if (PM.sections[si].el === parent) { actualSi = si; break; }
                    // Also check if parent is a child of the section (topCurveGroup/bottomCurveGroup)
                    if (PM.sections[si].el.contains(parent)) { actualSi = si; break; }
                }
                var startActual = c.startSeconds + leadInSec;
                var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
                var expectedSi = sectionForPage(startPage);
                // Problem: curve is SHOWN but in wrong section
                if (disp !== 'none' && actualSi >= 0 && expectedSi >= 0 && actualSi !== expectedSi) {
                    problems.push('WRONG-SECTION: curve ' + c.id + ' pg=' + startPage + ' expectedSec=' + expectedSi + ' actualSec=' + actualSi);
                }
                // Problem: curve is SHOWN but its page is not in sectionPages
                if (disp !== 'none' && expectedSi === -1) {
                    problems.push('SHOWN-BUT-INVISIBLE: curve ' + c.id + ' pg=' + startPage + ' actualSec=' + actualSi + ' sectionPages=' + JSON.stringify(PM.sectionPages));
                }
                // Problem: curve is HIDDEN but its page IS in sectionPages
                if (disp === 'none' && expectedSi >= 0) {
                    problems.push('HIDDEN-BUT-SHOULD-SHOW: curve ' + c.id + ' pg=' + startPage + ' expectedSec=' + expectedSi + ' actualSec=' + actualSi);
                }
            }
            if (problems.length > 0) {
                console.error('[CurveDiag AUDIT] ' + problems.length + ' problems found: ' + problems.join(' | '));
            }
        }, 5000);

        // Override MotiveMaker.updateVisibility
        if (window.MotiveMaker) {
            MotiveMaker.updateVisibility = function() {
                if (!window.GraphicTimeline) return;
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;

                for (var i = 0; i < this.motives.length; i++) {
                    var motive = this.motives[i];
                    if (!motive.elements || !motive.elements.group) continue;

                    var startActual = motive.startSeconds + leadInSec;
                    var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);

                    var si = sectionForPage(startPage);
                    if (si >= 0) {
                        motive.elements.group.style.display = '';
                        if (motive.elements.group.parentNode !== PM.sections[si].el)
                            PM.sections[si].el.appendChild(motive.elements.group);
                    } else {
                        motive.elements.group.style.display = 'none';
                    }
                }
            };
        }

        // Wrap MotiveMaker.reloadFromDatabase — clean up orphaned elements
        if (window.MotiveMaker && MotiveMaker.reloadFromDatabase) {
            var origMotiveReload = MotiveMaker.reloadFromDatabase.bind(MotiveMaker);
            MotiveMaker.reloadFromDatabase = function() {
                for (var mi = 0; mi < this.motives.length; mi++) {
                    var m = this.motives[mi];
                    if (m.elements && m.elements.group) m.elements.group.remove();
                }
                origMotiveReload();
            };
        }

        // Override LineWedgeMaker.updateVisibility — with continuation support
        if (window.LineWedgeMaker) {
            LineWedgeMaker.updateVisibility = function() {
                if (!window.GraphicTimeline) return;
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;

                for (var i = 0; i < this.lineWedges.length; i++) {
                    var lw = this.lineWedges[i];
                    if (!lw.elements || !lw.elements.group) continue;

                    var startActual = lw.startSeconds + leadInSec;
                    var endActual = lw.endSeconds + leadInSec;
                    var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
                    var endPage = Math.floor(Math.max(0, endActual) / secondsPerPage);
                    var isMultiPage = endPage > startPage;

                    // Main group: only show if start page is actually visible
                    var startSi = sectionForPage(startPage);
                    if (startSi >= 0) {
                        lw.elements.group.style.display = '';
                        if (lw.elements.group.parentNode !== PM.sections[startSi].el)
                            PM.sections[startSi].el.appendChild(lw.elements.group);
                        if (isMultiPage && this.clipToPageEnd) {
                            var origTopEl = this.scoreTopEl;
                            var origTopGroup = this.topLWGroup;
                            var origBotEl = this.scoreBottomEl;
                            var origBotGroup = this.bottomLWGroup;
                            this.scoreTopEl = PM.sections[startSi].el;
                            this.topLWGroup = PM.sections[startSi].el;
                            this.scoreBottomEl = PM.sections[startSi].el;
                            this.bottomLWGroup = PM.sections[startSi].el;
                            this.clipToPageEnd(lw, startPage, secondsPerPage, leadInSec);
                            this.scoreTopEl = origTopEl;
                            this.topLWGroup = origTopGroup;
                            this.scoreBottomEl = origBotEl;
                            this.bottomLWGroup = origBotGroup;
                        }
                    } else {
                        lw.elements.group.style.display = 'none';
                    }

                    // Continuation segments for multi-page line wedges
                    if (isMultiPage && this.showContinuationSegment) {
                        for (var si = 0; si < PAGE_COUNT; si++) {
                            var sp = PM.sectionPages[si];
                            var contKey = '_cont_' + si;
                            if (sp > startPage && sp <= endPage) {
                                callContinuation(this, lw, sp, secondsPerPage, leadInSec, si, 'topLWGroup');
                            } else if (lw.elements[contKey]) {
                                lw.elements[contKey].style.display = 'none';
                            }
                        }
                    }

                    // Hide legacy continuation keys
                    if (lw.elements.continuationGroupTop)
                        lw.elements.continuationGroupTop.style.display = 'none';
                    if (lw.elements.continuationGroupBottom)
                        lw.elements.continuationGroupBottom.style.display = 'none';
                }
            };
        }

        // Wrap LineWedgeMaker.reloadFromDatabase — clean up orphaned elements
        if (window.LineWedgeMaker && LineWedgeMaker.reloadFromDatabase) {
            var origLWReload = LineWedgeMaker.reloadFromDatabase.bind(LineWedgeMaker);
            LineWedgeMaker.reloadFromDatabase = function() {
                for (var li = 0; li < this.lineWedges.length; li++) {
                    var lw = this.lineWedges[li];
                    if (!lw.elements) continue;
                    if (lw.elements.group) lw.elements.group.remove();
                    if (lw.elements.continuationGroupTop) lw.elements.continuationGroupTop.remove();
                    if (lw.elements.continuationGroupBottom) lw.elements.continuationGroupBottom.remove();
                    for (var si = 0; si < PAGE_COUNT; si++) {
                        var ck = '_cont_' + si;
                        if (lw.elements[ck]) lw.elements[ck].remove();
                    }
                }
                origLWReload();
            };
        }

        // Override BadgeMaker.updateVisibility
        if (window.BadgeMaker) {
            BadgeMaker.updateVisibility = function() {
                if (!window.GraphicTimeline) return;
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;

                for (var i = 0; i < this.badges.length; i++) {
                    var badge = this.badges[i];
                    if (!badge.elements || !badge.elements.wrapper) continue;

                    var startActual = badge.startSeconds + leadInSec;
                    var badgePage = Math.floor(Math.max(0, startActual) / secondsPerPage);

                    var si = sectionForPage(badgePage);
                    if (si >= 0) {
                        badge.elements.wrapper.style.display = '';
                        if (badge.elements.wrapper.parentNode !== PM.sections[si].el)
                            PM.sections[si].el.appendChild(badge.elements.wrapper);
                    } else {
                        badge.elements.wrapper.style.display = 'none';
                    }
                }
            };

            // Override getBadgeSize — 20% of track height
            BadgeMaker.getBadgeSize = function(gTrack) {
                var scoreH = PM.sections[0].el.clientHeight || PM.sectionHeight || 100;
                var trackHeight = scoreH - 8; // subtract timeline
                var sz = Math.round(trackHeight * 0.20);
                // Get track dims for positioning (uses parts-mode getPositions)
                var td = window.CompositionPanel
                    ? CompositionPanel.getTrackDimensions(String(gTrack), PM.sections[0].el)
                    : { y: 8, height: trackHeight, bottom: scoreH };
                return { sz: sz, trackDims: td };
            };
        }

        // Wrap BadgeMaker.reloadFromDatabase — clean up orphaned elements
        if (window.BadgeMaker && BadgeMaker.reloadFromDatabase) {
            var origBadgeReload = BadgeMaker.reloadFromDatabase.bind(BadgeMaker);
            BadgeMaker.reloadFromDatabase = function() {
                for (var bi = 0; bi < this.badges.length; bi++) {
                    var b = this.badges[bi];
                    if (b.elements && b.elements.wrapper) b.elements.wrapper.remove();
                }
                origBadgeReload();
            };
        }

        // Override GCMaker for parts mode
        if (window.GCMaker) {
            // Create GC container <g> in each section SVG
            var gcGroups = [];
            for (var gi = 0; gi < PAGE_COUNT; gi++) {
                var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('class', 'gc-container');
                PM.sections[gi].el.appendChild(g);
                gcGroups.push(g);
            }
            // Alias section 0/1 containers for compatibility
            GCMaker.topGCGroup = gcGroups[0];
            GCMaker.bottomGCGroup = gcGroups[1];
            PM.gcGroups = gcGroups;

            // Z-order: re-append SVG element containers AFTER GC groups
            // so notation SVGs render in front of GC trajectory arcs
            for (var zi = 0; zi < PAGE_COUNT; zi++) {
                if (SVGElementManager._sectionContainers[zi]) {
                    PM.sections[zi].el.appendChild(SVGElementManager._sectionContainers[zi]);
                }
            }

            // Override reloadFromDatabase — use full track height
            var origReloadGC = GCMaker.reloadFromDatabase.bind(GCMaker);
            GCMaker.reloadFromDatabase = function() {
                // Clear all section GC containers
                for (var ci = 0; ci < PAGE_COUNT; ci++) {
                    if (PM.gcGroups[ci]) PM.gcGroups[ci].innerHTML = '';
                }
                this.gcs = [];
                this.selectedGC = null;

                if (!this._importedData || !this._importedData.gcs) return;

                // Use PM.sectionHeight (set by resizeSections) — NOT clientHeight
                // clientHeight returns 150 (SVG intrinsic default) before layout settles
                var scoreHeight = PM.sectionHeight || PM.sections[0].el.clientHeight || 112;
                var timelineHeight = 8;
                var availableHeight = scoreHeight - timelineHeight;
                // Cap GC trajectory at MAX_ELEMENT_PAGES equivalent
                var maxGcH = (window.innerHeight / MAX_ELEMENT_PAGES) - timelineHeight;
                var staffHeight = (PAGE_COUNT < MAX_ELEMENT_PAGES) ? Math.min(availableHeight, maxGcH) : availableHeight;

                for (var di = 0; di < this._importedData.gcs.length; di++) {
                    var gcData = this._importedData.gcs[di];
                    var trajectory = this.calculateTrajectory({
                        impactSeconds: gcData.impactSeconds,
                        stiffness: gcData.stiffness,
                        damping: gcData.damping,
                        ictus: gcData.ictus,
                        descentRatio: gcData.descentRatio,
                        duration: gcData.duration,
                        staffHeight: staffHeight
                    });

                    var gc = {
                        id: gcData.id,
                        name: gcData.name,
                        description: gcData.description,
                        gTrack: gcData.gTrack,
                        impactSeconds: gcData.impactSeconds,
                        startSeconds: trajectory.startSeconds,
                        endSeconds: trajectory.endSeconds,
                        stiffness: gcData.stiffness,
                        damping: gcData.damping,
                        ictus: gcData.ictus,
                        descentRatio: gcData.descentRatio,
                        duration: gcData.duration,
                        trajectory: trajectory.trajectoryPoints,
                        dropHeightPx: trajectory.dropHeightPixels,
                        bounceHeightPx: trajectory.bounceHeightPixels,
                        timeFall: trajectory.timeFall,
                        timeRise: trajectory.timeRise,
                        color: gcData.color || 'neonMagenta',
                        elements: {}
                    };

                    this.gcs.push(gc);
                    this.renderGC(gc);
                }

                this.updateVisibility();
            };

            // Override renderGC — N sections, full track height
            GCMaker.renderGC = function(gc) {
                var secondsPerPage = (beatsPerPage / beatsPerMinute) * 60;
                var impactActual = gc.impactSeconds + leadInSeconds;
                var impactPage = Math.floor(Math.max(0, impactActual) / secondsPerPage);
                var sIdx = sectionForPage(impactPage);
                var scoreEl = PM.sections[sIdx >= 0 ? sIdx : 0].el;

                var scoreWidth = scoreEl.clientWidth;
                var scoreHeight = PM.sectionHeight || scoreEl.clientHeight || 112;
                var timelineHeight = 8;
                var availableHeight = scoreHeight - timelineHeight;
                // Cap GC arc at MAX_ELEMENT_PAGES equivalent, bottom-justified
                var maxGcH = (window.innerHeight / MAX_ELEMENT_PAGES) - timelineHeight;
                var usedGcH = (PAGE_COUNT < MAX_ELEMENT_PAGES) ? Math.min(availableHeight, maxGcH) : availableHeight;
                var trackY = timelineHeight + (availableHeight - usedGcH);
                var trackBottom = timelineHeight + availableHeight;
                var impactXPercent = ((impactActual / secondsPerPage) - impactPage) * 100;
                var impactX = (impactXPercent / 100) * scoreWidth;
                var impactY = trackBottom - 5;
                var timeScale = scoreWidth / secondsPerPage;

                var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                group.setAttribute('class', 'gc-group');
                group.setAttribute('data-gc-id', gc.id);
                var color = ColorMap[gc.color] || gc.color || '#ff15a0';

                var pathD = '';
                var pixelPoints = [];
                for (var i = 0; i < gc.trajectory.length; i++) {
                    var pt = gc.trajectory[i];
                    var timeDelta = pt.time - gc.impactSeconds;
                    var px = impactX + (timeDelta * timeScale);
                    var py = impactY - pt.relY;
                    pixelPoints.push({ x: px, y: py, time: pt.time });
                    pathD += (i === 0 ? 'M ' : ' L ') + px + ' ' + py;
                }

                var trajectoryPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                trajectoryPath.setAttribute('d', pathD);
                trajectoryPath.setAttribute('stroke', color);
                trajectoryPath.setAttribute('stroke-width', '1.5');
                trajectoryPath.setAttribute('fill', 'none');
                group.appendChild(trajectoryPath);

                var impactMarker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                impactMarker.setAttribute('cx', impactX);
                impactMarker.setAttribute('cy', impactY);
                impactMarker.setAttribute('r', '4');
                impactMarker.setAttribute('fill', color);
                impactMarker.setAttribute('stroke', 'none');
                group.appendChild(impactMarker);

                var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
                for (var bi = 0; bi < pixelPoints.length; bi++) {
                    if (pixelPoints[bi].x < minX) minX = pixelPoints[bi].x;
                    if (pixelPoints[bi].x > maxX) maxX = pixelPoints[bi].x;
                    if (pixelPoints[bi].y < minY) minY = pixelPoints[bi].y;
                    if (pixelPoints[bi].y > maxY) maxY = pixelPoints[bi].y;
                }
                var padding = 8;
                var boundingBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                boundingBox.setAttribute('x', minX - padding);
                boundingBox.setAttribute('y', minY - padding);
                boundingBox.setAttribute('width', maxX - minX + padding * 2);
                boundingBox.setAttribute('height', maxY - minY + padding * 2);
                boundingBox.setAttribute('stroke', color);
                boundingBox.setAttribute('stroke-dasharray', '4,2');
                boundingBox.setAttribute('fill', color);
                boundingBox.setAttribute('fill-opacity', '0.1');
                boundingBox.style.display = 'none';
                group.appendChild(boundingBox);

                // Append to correct section's GC container
                var targetIdx = sIdx >= 0 ? sIdx : 0;
                PM.gcGroups[targetIdx].appendChild(group);

                gc.elements = { group: group, trajectoryPath: trajectoryPath, impactMarker: impactMarker, boundingBox: boundingBox };
                gc.pixelPoints = pixelPoints;
                gc.page = impactPage;
                gc.impactX = impactX;
                gc.impactY = impactY;
                gc.trackY = trackY;
                gc.trackBottom = trackBottom;
                gc.staffHeight = availableHeight;
                gc.timeScale = timeScale;
                gc.trackDims = { y: trackY, height: availableHeight };

                // Continuation segments for multi-page GCs
                var startActual = gc.startSeconds + leadInSeconds;
                var endActual = gc.endSeconds + leadInSeconds;
                var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
                var endPage = Math.floor(Math.max(0, endActual) / secondsPerPage);

                for (var cp = startPage; cp <= endPage; cp++) {
                    if (cp === impactPage) continue;
                    var xShift = (impactPage - cp) * scoreWidth;

                    var contPathD = '';
                    var ptCount = 0;
                    for (var ci = 0; ci < pixelPoints.length; ci++) {
                        var shiftedX = pixelPoints[ci].x + xShift;
                        if (shiftedX >= -20 && shiftedX <= scoreWidth + 20) {
                            contPathD += (ptCount === 0 ? 'M ' : ' L ') + shiftedX + ' ' + pixelPoints[ci].y;
                            ptCount++;
                        }
                    }
                    if (ptCount < 2) continue;

                    var contGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    contGroup.setAttribute('class', 'gc-continuation');
                    contGroup.setAttribute('data-gc-id', gc.id);
                    var contPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    contPath.setAttribute('d', contPathD);
                    contPath.setAttribute('stroke', color);
                    contPath.setAttribute('stroke-width', '1.5');
                    contPath.setAttribute('fill', 'none');
                    contGroup.appendChild(contPath);

                    var contSi = sectionForPage(cp);
                    if (contSi >= 0 && PM.gcGroups[contSi]) {
                        PM.gcGroups[contSi].appendChild(contGroup);
                    }
                    gc.elements['_gcCont_' + cp] = contGroup;
                }
            };

            // Override updateVisibility — move GC groups + continuations to correct sections
            GCMaker.updateVisibility = function() {
                if (!window.GraphicTimeline) return;
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;

                for (var vi = 0; vi < this.gcs.length; vi++) {
                    var gc = this.gcs[vi];
                    if (!gc.elements || !gc.elements.group) continue;

                    // Main group: show on impact page's section
                    var impactSi = sectionForPage(gc.page);
                    if (impactSi >= 0 && PM.gcGroups[impactSi]) {
                        gc.elements.group.style.display = '';
                        if (gc.elements.group.parentNode !== PM.gcGroups[impactSi])
                            PM.gcGroups[impactSi].appendChild(gc.elements.group);
                    } else {
                        gc.elements.group.style.display = 'none';
                    }

                    // Continuation groups: show/hide each on its page's section
                    var startActual = gc.startSeconds + leadInSec;
                    var endActual = gc.endSeconds + leadInSec;
                    var startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
                    var endPage = Math.floor(Math.max(0, endActual) / secondsPerPage);
                    for (var cp = startPage; cp <= endPage; cp++) {
                        if (cp === gc.page) continue;
                        var contKey = '_gcCont_' + cp;
                        var contEl = gc.elements[contKey];
                        if (!contEl) continue;
                        var contSi = sectionForPage(cp);
                        if (contSi >= 0 && PM.gcGroups[contSi]) {
                            contEl.style.display = '';
                            if (contEl.parentNode !== PM.gcGroups[contSi])
                                PM.gcGroups[contSi].appendChild(contEl);
                        } else {
                            contEl.style.display = 'none';
                        }
                    }
                }
            };

            // Override calculateBallPositionForPage for parts-mode dimensions
            GCMaker.calculateBallPositionForPage = function(gc, currentSeconds, currentPage, inTop) {
                if (!gc.trajectory || gc.trajectory.length < 2) return null;
                var pt1 = null, pt2 = null;
                for (var i = 0; i < gc.trajectory.length - 1; i++) {
                    if (gc.trajectory[i].time <= currentSeconds && gc.trajectory[i + 1].time >= currentSeconds) {
                        pt1 = gc.trajectory[i];
                        pt2 = gc.trajectory[i + 1];
                        break;
                    }
                }
                if (!pt1 || !pt2) return null;

                var t = (currentSeconds - pt1.time) / (pt2.time - pt1.time);
                var relY = pt1.relY + t * (pt2.relY - pt1.relY);

                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var pageStartTime = currentPage * secondsPerPage - leadInSeconds;
                var timeFromPageStart = currentSeconds - pageStartTime;

                var sIdx = currentPage % PAGE_COUNT;
                var scoreEl = PM.sections[sIdx].el;
                var scoreWidth = scoreEl.clientWidth;
                var scoreHeight = PM.sectionHeight || scoreEl.clientHeight || 112;
                var timeScale = scoreWidth / secondsPerPage;
                var px = timeFromPageStart * timeScale;

                // Parts mode: 1 track fills full available height
                var timelineHeight = 8;
                var availableHeight = scoreHeight - timelineHeight;
                // Cap GC trajectory at MAX_ELEMENT_PAGES equivalent, bottom-justified
                var maxGcH = (window.innerHeight / MAX_ELEMENT_PAGES) - timelineHeight;
                var usedGcH = (PAGE_COUNT < MAX_ELEMENT_PAGES) ? Math.min(availableHeight, maxGcH) : availableHeight;
                var trackBottom = timelineHeight + availableHeight;
                var impactY = trackBottom - 5;
                var py = impactY - relY;

                return { x: px, y: py };
            };

            // Override GCMaker.update to draw on correct section canvas
            GCMaker.update = function() {
                var currentScoreTimeMs = ScoreTime.now();
                var currentDisplayTimeSec = (currentScoreTimeMs / 1000) - leadInSeconds;
                var totalPagesTraveled = StaffCursors.calculateTotalPages(currentScoreTimeMs);
                var sectionIndex = Math.floor(totalPagesTraveled % PAGE_COUNT);
                var currentPage = Math.floor(totalPagesTraveled);

                var ctx = PM.sections[sectionIndex].ctx;
                if (!ctx) return;

                for (var g = 0; g < this.gcs.length; g++) {
                    var gc = this.gcs[g];
                    if (currentDisplayTimeSec >= gc.startSeconds && currentDisplayTimeSec <= gc.endSeconds) {
                        var ballPos = this.calculateBallPositionForPage(gc, currentDisplayTimeSec, currentPage, false);
                        if (ballPos) {
                            ctx.beginPath();
                            ctx.arc(ballPos.x, ballPos.y, 5, 0, Math.PI * 2);
                            ctx.fillStyle = ColorMap[gc.color] || gc.color;
                            ctx.fill();
                        }
                    }
                }
            };

            // Register GCMaker.update as AnimationEngine subscriber (was missing since Phase 2)
            if (window.AnimationEngine && AnimationEngine.subscribe) {
                AnimationEngine.subscribe('GCMaker', function() { GCMaker.update(); }, 2);
            }

            // Override rerenderAllGCs — the ORIGINAL uses staffHeight = availableHeight / 4
            // and fires on window resize (100ms debounce), silently shrinking arcs
            GCMaker.rerenderAllGCs = function() {
                var scoreHeight = PM.sectionHeight || PM.sections[0].el.clientHeight || 112;
                var timelineHeight = 8;
                var availableHeight = scoreHeight - timelineHeight;
                // Cap GC trajectory at MAX_ELEMENT_PAGES equivalent
                var maxGcH = (window.innerHeight / MAX_ELEMENT_PAGES) - timelineHeight;
                var staffHeight = (PAGE_COUNT < MAX_ELEMENT_PAGES) ? Math.min(availableHeight, maxGcH) : availableHeight;

                for (var ri = 0; ri < this.gcs.length; ri++) {
                    var gc = this.gcs[ri];
                    if (gc.elements.group) gc.elements.group.remove();
                    // Remove all continuation groups (_gcCont_N keys)
                    for (var ek in gc.elements) {
                        if (ek.indexOf('_gcCont_') === 0 && gc.elements[ek]) gc.elements[ek].remove();
                    }
                    if (gc.elements.continuationGroupTop) gc.elements.continuationGroupTop.remove();
                    if (gc.elements.continuationGroupBottom) gc.elements.continuationGroupBottom.remove();
                    gc.elements = {};

                    var trajectory = this.calculateTrajectory({
                        impactSeconds: gc.impactSeconds,
                        stiffness: gc.stiffness,
                        damping: gc.damping,
                        ictus: gc.ictus,
                        descentRatio: gc.descentRatio,
                        duration: gc.duration,
                        staffHeight: staffHeight
                    });

                    gc.trajectory = trajectory.trajectoryPoints;
                    gc.startSeconds = trajectory.startSeconds;
                    gc.endSeconds = trajectory.endSeconds;
                    gc.dropHeightPx = trajectory.dropHeightPixels;
                    gc.bounceHeightPx = trajectory.bounceHeightPixels;
                    gc.timeFall = trajectory.timeFall;
                    gc.timeRise = trajectory.timeRise;

                    this.renderGC(gc);
                }
                this.updateVisibility();
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 7. TrackSystem overrides (N sections, 1 track)
        // ═══════════════════════════════════════════════════════════════════════

        if (window.TrackSystem) {
            var track = TrackSystem.tracks[STAFF_INDEX];

            if (track) {
                // Create containers in new sections
                track._sectionContainers = [track.topContainer, track.bottomContainer];
                track._sectionRendered = [track.renderedElements.top || [], track.renderedElements.bottom || []];

                for (var tsi = 2; tsi < PAGE_COUNT; tsi++) {
                    var sectionEl = PM.sections[tsi].el;

                    var defs = sectionEl.querySelector('defs');
                    if (!defs) {
                        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
                        sectionEl.insertBefore(defs, sectionEl.firstChild);
                    }
                    var clipId = 'track' + TRACK + '-clip-s' + tsi;
                    var clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                    clipPath.setAttribute('id', clipId);
                    var clipRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                    clipRect.setAttribute('x', '0');
                    clipRect.setAttribute('y', '0');
                    clipRect.setAttribute('width', '100%');
                    clipRect.setAttribute('height', '100%');
                    clipPath.appendChild(clipRect);
                    defs.appendChild(clipPath);

                    var cont = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    cont.setAttribute('id', 'track' + TRACK + '-s' + tsi);
                    cont.setAttribute('class', 'track-container');
                    cont.setAttribute('clip-path', 'url(#' + clipId + ')');
                    sectionEl.appendChild(cont);

                    track._sectionContainers.push(cont);
                    track._sectionRendered.push([]);
                }

                // Override updateTrackDimensions for 1 track at full height
                // Use 8 for timelineHeight (consistent with StaffPositions/StaffCursors)
                var TIMELINE_H = 8;
                TrackSystem.updateTrackDimensions = function() {
                    var scoreHeight = PM.sections[0].el.clientHeight;
                    var scoreWidth = PM.sections[0].el.clientWidth;
                    var availableHeight = scoreHeight - TIMELINE_H;

                    this.tracks.forEach(function(t, ti) {
                        if (ti === STAFF_INDEX) {
                            t.yPosition = TIMELINE_H;
                            t.height = availableHeight;
                        } else {
                            t.yPosition = -9999;
                            t.height = 0;
                        }
                        t.width = scoreWidth;
                        if (t.clipRectTop) {
                            t.clipRectTop.setAttribute('y', t.yPosition);
                            t.clipRectTop.setAttribute('height', t.height);
                        }
                        if (t.clipRectBottom) {
                            t.clipRectBottom.setAttribute('y', t.yPosition);
                            t.clipRectBottom.setAttribute('height', t.height);
                        }
                    });
                    this.renderAllTracks();
                };

                // Override onGoto: no-op in parts mode.
                // The original Workshop TrackSystem.onGoto sets a 2-page (top/bottom) layout
                // and calls renderAllTracks(), which corrupts our 6-section layout.
                // GraphicTimeline.onGoto already calls TrackSystem.update() for all sections.
                TrackSystem.onGoto = function() {};

                // Override update for circular buffer page turns
                TrackSystem.update = function() {
                    var currentScoreTimeMs = ScoreTime.now();
                    var secondsPerPage = (beatsPerPage / beatsPerMinute) * 60;
                    var currentPage = Math.floor(currentScoreTimeMs / (secondsPerPage * 1000));
                    var t = this.tracks[STAFF_INDEX];
                    if (!t) return;

                    // Re-render any section whose page changed
                    for (var i = 0; i < PAGE_COUNT; i++) {
                        var expectedPage = PM.sectionPages[i];
                        if (t._sectionContainers && t._sectionContainers[i]) {
                            var lastKey = '_lastRenderedPage' + i;
                            if (t[lastKey] !== expectedPage) {
                                this._renderTrackForSection(STAFF_INDEX, i, expectedPage);
                                t[lastKey] = expectedPage;
                            }
                        }
                    }
                };

                // New method: render track content for a specific section index
                TrackSystem._renderTrackForSection = function(trkIdx, sIdx, pageNumber) {
                    var t = this.tracks[trkIdx];
                    if (!t || !t._sectionContainers || !t._sectionContainers[sIdx]) return;

                    var container = t._sectionContainers[sIdx];
                    var rendered = t._sectionRendered[sIdx] || [];

                    // Clear
                    rendered.forEach(function(el) { if (el && el.remove) el.remove(); });
                    t._sectionRendered[sIdx] = [];

                    var secondsPerPage = (beatsPerPage / beatsPerMinute) * 60;
                    var pageStartMs = pageNumber * secondsPerPage * 1000;
                    var pageEndMs = (pageNumber + 1) * secondsPerPage * 1000;

                    var visibleItems = t.graphicItems.filter(function(item) {
                        var itemEndMs = item.scoreTimeMs + (item.duration || 0);
                        return item.scoreTimeMs < pageEndMs && itemEndMs >= pageStartMs;
                    });

                    visibleItems.forEach(function(item) {
                        var itemOffsetMs = item.scoreTimeMs - pageStartMs;
                        var xPercent = (itemOffsetMs / (secondsPerPage * 1000)) * 100;
                        var element;

                        switch (item.type) {
                            case 'rect':
                                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                                element.setAttribute('x', xPercent + '%');
                                element.setAttribute('y', t.yPosition + (item.y || 0));
                                element.setAttribute('width', item.width || 10);
                                element.setAttribute('height', item.height || t.height);
                                element.setAttribute('fill', item.color || '#666');
                                break;
                            case 'line':
                                element = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                                element.setAttribute('x1', xPercent + '%');
                                element.setAttribute('y1', t.yPosition + (item.y1 || 0));
                                element.setAttribute('x2', (xPercent + (item.widthPercent || 0)) + '%');
                                element.setAttribute('y2', t.yPosition + (item.y2 || t.height));
                                element.setAttribute('stroke', item.color || '#666');
                                element.setAttribute('stroke-width', item.strokeWidth || 1);
                                break;
                            case 'text':
                                element = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                                element.setAttribute('x', xPercent + '%');
                                element.setAttribute('y', t.yPosition + (item.y || t.height / 2));
                                element.setAttribute('font-size', item.fontSize || 10);
                                element.setAttribute('fill', item.color || '#333');
                                element.textContent = item.text || '';
                                break;
                            case 'note':
                                element = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                                var noteHeight = t.height / 128;
                                var noteY = t.yPosition + t.height - ((item.note || 60) * noteHeight);
                                var durationPercent = ((item.duration || 100) / (secondsPerPage * 1000)) * 100;
                                element.setAttribute('x', xPercent + '%');
                                element.setAttribute('y', noteY);
                                element.setAttribute('width', durationPercent + '%');
                                element.setAttribute('height', noteHeight * 2);
                                element.setAttribute('fill', item.color || StaffCursors.colors[trkIdx]);
                                element.setAttribute('opacity', (item.velocity || 100) / 127);
                                break;
                            default:
                                return;
                        }

                        if (element) {
                            container.appendChild(element);
                            t._sectionRendered[sIdx].push(element);
                        }
                    });
                };

                // Override renderTrack to render all N sections
                TrackSystem.renderTrack = function(trackIndex) {
                    var t = this.tracks[trackIndex];
                    if (!t) return;
                    if (trackIndex !== STAFF_INDEX) return; // Only render selected track

                    // Clear all sections
                    for (var i = 0; i < PAGE_COUNT; i++) {
                        var rendered = t._sectionRendered ? t._sectionRendered[i] : null;
                        if (rendered) {
                            rendered.forEach(function(el) { if (el && el.remove) el.remove(); });
                            t._sectionRendered[i] = [];
                        }
                    }

                    // Render each section
                    for (var j = 0; j < PAGE_COUNT; j++) {
                        this._renderTrackForSection(trackIndex, j, PM.sectionPages[j]);
                        t['_lastRenderedPage' + j] = PM.sectionPages[j];
                    }
                };
            }
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 8. ScoreManager.distributeData wrapper — track filtering
        // ═══════════════════════════════════════════════════════════════════════

        if (window.ScoreManager) {
            var origDistribute = ScoreManager.distributeData.bind(ScoreManager);
            ScoreManager.distributeData = function(data) {
                var trackStr = String(TRACK);
                var db = data.databases || {};

                function matchTrack(gt) { return gt === trackStr || gt === 'A'; }

                // Filter SVG elements (top-level array, .track is a number)
                if (data.svgElements && Array.isArray(data.svgElements)) {
                    var before = data.svgElements.length;
                    data.svgElements = data.svgElements.filter(function(el) {
                        return el.track === TRACK || el.track === trackStr;
                    });
                    console.log('[PartsMode] SVG elements: ' + before + ' -> ' + data.svgElements.length);
                }

                // Filter curves (databases.curves = { curves: [...], nextId })
                if (db.curves && db.curves.curves) {
                    var cb = db.curves.curves.length;
                    db.curves.curves = db.curves.curves.filter(function(c) { return matchTrack(c.gTrack); });
                    console.log('[PartsMode] Curves: ' + cb + ' -> ' + db.curves.curves.length);
                }

                // Filter GCs (databases.gcs = { gcs: [...], nextId })
                if (db.gcs && db.gcs.gcs) {
                    db.gcs.gcs = db.gcs.gcs.filter(function(gc) { return matchTrack(gc.gTrack); });
                }

                // Filter lineWedges
                if (db.lineWedges && db.lineWedges.lineWedges) {
                    db.lineWedges.lineWedges = db.lineWedges.lineWedges.filter(function(lw) { return matchTrack(lw.gTrack); });
                }

                // Filter badges
                if (db.badges && db.badges.badges) {
                    db.badges.badges = db.badges.badges.filter(function(b) { return matchTrack(b.gTrack); });
                }

                // Filter motiveGroups
                if (db.motiveGroups && db.motiveGroups.groups) {
                    db.motiveGroups.groups = db.motiveGroups.groups.filter(function(g) { return matchTrack(g.gTrack); });
                }

                // Filter motives
                if (db.motives && db.motives.motives) {
                    db.motives.motives = db.motives.motives.filter(function(m) { return matchTrack(m.gTrack); });
                }

                // Filter graphicTracks — keep only selected track's items
                if (data.graphicTracks && Array.isArray(data.graphicTracks)) {
                    for (var gi = 0; gi < data.graphicTracks.length; gi++) {
                        if (gi !== STAFF_INDEX && data.graphicTracks[gi]) {
                            data.graphicTracks[gi].graphicItems = [];
                        }
                    }
                }

                origDistribute(data);
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 9. GlissandoSystem section awareness
        // ═══════════════════════════════════════════════════════════════════════

        if (window.GlissandoSystem) {
            // Override createPitchDisplays: N sections instead of top/bottom
            var origCreatePitchDisplays = GlissandoSystem.createPitchDisplays.bind(GlissandoSystem);
            GlissandoSystem.createPitchDisplays = function() {
                this.pitchDisplays = [];
                for (var staffIdx = 0; staffIdx < 4; staffIdx++) {
                    var displayEntry = { staffIndex: staffIdx };
                    for (var si = 0; si < PAGE_COUNT; si++) {
                        var img = document.createElement('img');
                        img.style.position = 'absolute';
                        img.style.display = 'none';
                        img.style.pointerEvents = 'none';
                        img.className = 'glissando-pitch-display';
                        img.dataset.staffIndex = staffIdx;
                        img.dataset.sectionIndex = si;
                        document.body.appendChild(img);
                        displayEntry['sec' + si] = img;
                    }
                    // Backward compat: alias sec0 as top, sec1 as bottom
                    displayEntry.top = displayEntry.sec0;
                    displayEntry.bottom = displayEntry.sec1;
                    this.pitchDisplays.push(displayEntry);
                }
            };
            // Re-create displays with N sections
            GlissandoSystem.createPitchDisplays();

            // Override updatePitchDisplay: handle N sections
            GlissandoSystem.updatePitchDisplay = function(staffIndex, section, curveItem, normalizedY, xPercent, trackDims) {
                if (!curveItem || !curveItem.glissando || staffIndex >= this.pitchDisplays.length) {
                    this.hidePitchDisplay(staffIndex);
                    return;
                }
                var display = this.pitchDisplays[staffIndex];
                // Determine section index from section name
                var sectionIdx = 0;
                if (section === 'top') sectionIdx = 0;
                else if (section === 'bottom') sectionIdx = 1;
                else {
                    var parsed = parseInt(section.replace('section', ''));
                    if (!isNaN(parsed)) sectionIdx = parsed;
                }
                var imgEl = display['sec' + sectionIdx];
                if (!imgEl) { this.hidePitchDisplay(staffIndex); return; }
                // Hide all other section displays for this staff
                for (var hi = 0; hi < PAGE_COUNT; hi++) {
                    if (hi !== sectionIdx && display['sec' + hi]) display['sec' + hi].style.display = 'none';
                }
                var gliss = curveItem.glissando;
                var lowIdx = Math.min(gliss.startIndex, gliss.endIndex);
                var highIdx = Math.max(gliss.startIndex, gliss.endIndex);
                var pitchRange = highIdx - lowIdx;
                var currentPitchIndex = lowIdx + Math.round(normalizedY * pitchRange);
                var clampedIdx = Math.max(0, Math.min(this.pitchList.length - 1, currentPitchIndex));
                var currentPitch = this.pitchList[clampedIdx];
                if (!currentPitch) { this.hidePitchDisplay(staffIndex); return; }
                var svgPath = 'pitchesSVGs/' + gliss.clef + '/' + currentPitch.name + '-cropped.svg';
                if (imgEl.dataset.currentPitch !== currentPitch.name) {
                    imgEl.src = svgPath;
                    imgEl.dataset.currentPitch = currentPitch.name;
                }
                // Position relative to correct section SVG
                var scoreEl = PM.sections[sectionIdx] ? PM.sections[sectionIdx].el : null;
                if (!scoreEl) { this.hidePitchDisplay(staffIndex); return; }
                var scoreRect = scoreEl.getBoundingClientRect();
                var pitchDisplayHeight = trackDims.height * 0.5;
                var gap = 2;
                imgEl.style.position = 'fixed';
                imgEl.style.display = 'block';
                imgEl.style.height = pitchDisplayHeight + 'px';
                imgEl.style.width = 'auto';
                imgEl.style.zIndex = '1000';
                var actualWidth = imgEl.offsetWidth;
                if (!actualWidth || actualWidth < 5) actualWidth = pitchDisplayHeight * 0.4;
                var meterLeftInViewport = scoreRect.left + (xPercent / 100) * scoreRect.width - 11;
                imgEl.style.left = (meterLeftInViewport - actualWidth - gap) + 'px';
                var verticalOffset = (trackDims.height - pitchDisplayHeight) / 2;
                imgEl.style.top = (scoreRect.top + trackDims.y + verticalOffset) + 'px';
            };

            // Override hidePitchDisplay: hide all N sections
            GlissandoSystem.hidePitchDisplay = function(staffIndex) {
                if (staffIndex >= this.pitchDisplays.length) return;
                var display = this.pitchDisplays[staffIndex];
                for (var si = 0; si < PAGE_COUNT; si++) {
                    if (display['sec' + si]) display['sec' + si].style.display = 'none';
                }
            };

            // Override renderStaticPitchMarkers: check N section pages
            var origRenderMarkers = GlissandoSystem.renderStaticPitchMarkers.bind(GlissandoSystem);
            GlissandoSystem.renderStaticPitchMarkers = function(curve) {
                this.removeStaticPitchMarkers(curve);
                if (!curve || !curve.glissando) return;
                if (!curve.glissando.clef ||
                    curve.glissando.startIndex === undefined ||
                    curve.glissando.endIndex === undefined) return;
                var changePoints = this.calculatePitchChangePoints(curve);
                if (changePoints.length === 0) return;
                var clef = curve.glissando.clef;
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var leadInSec = leadInSeconds;
                // Create a marker group per section
                var markerGroups = [];
                for (var gi = 0; gi < PAGE_COUNT; gi++) {
                    var mg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                    mg.setAttribute('class', 'glissando-pitch-markers');
                    mg.setAttribute('data-curve-id', curve.id);
                    mg.setAttribute('data-section', gi);
                    markerGroups.push(mg);
                }
                var scoreWidth = PM.sections[0].el.clientWidth;
                for (var pi = 0; pi < changePoints.length; pi++) {
                    var point = changePoints[pi];
                    if (!point.pitch) continue;
                    var pointTimeActual = point.time + leadInSec;
                    var pointPage = Math.floor(Math.max(0, pointTimeActual) / secondsPerPage);
                    // Find which section shows this page
                    var targetSi = -1;
                    for (var si = 0; si < PAGE_COUNT; si++) {
                        if (PM.sectionPages[si] === pointPage) { targetSi = si; break; }
                    }
                    if (targetSi < 0) continue;
                    var targetEl = PM.sections[targetSi].el;
                    var trackDims = curve.gTrack && window.CompositionPanel
                        ? CompositionPanel.getTrackDimensions(curve.gTrack, targetEl)
                        : null;
                    if (!trackDims) continue;
                    var pageStartTime = pointPage * secondsPerPage;
                    var timeOnPage = pointTimeActual - pageStartTime;
                    var xPct = (timeOnPage / secondsPerPage) * 100;
                    var xPos = (xPct / 100) * scoreWidth;
                    var markerHeight = trackDims.height * 0.25;
                    var estWidth = markerHeight * 0.6;
                    if (xPos < 0) xPos = 0;
                    if (xPos + estWidth > scoreWidth) xPos = scoreWidth - estWidth;
                    var yPos = trackDims.y + (trackDims.height - markerHeight) / 2;
                    var imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
                    imgEl.setAttributeNS('http://www.w3.org/1999/xlink', 'href',
                        'pitchesSVGs/' + clef + '/' + point.pitch.name + '-cropped.svg');
                    imgEl.setAttribute('height', markerHeight);
                    imgEl.setAttribute('x', xPos);
                    imgEl.setAttribute('y', yPos);
                    imgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
                    imgEl.setAttribute('class', 'pitch-marker');
                    imgEl.setAttribute('data-pitch', point.pitch.name);
                    imgEl.style.pointerEvents = 'none';
                    markerGroups[targetSi].appendChild(imgEl);
                }
                // Append non-empty groups to section SVGs, store refs for cleanup
                curve._pitchMarkerGroups = [];
                for (var ai = 0; ai < PAGE_COUNT; ai++) {
                    if (markerGroups[ai].children.length > 0) {
                        PM.sections[ai].el.appendChild(markerGroups[ai]);
                    }
                    curve._pitchMarkerGroups.push(markerGroups[ai]);
                }
                // Backward compat
                curve.pitchMarkerGroupTop = markerGroups[0];
                curve.pitchMarkerGroupBottom = markerGroups[1];
            };

            // Override removeStaticPitchMarkers: clean up N section groups
            var origRemoveMarkers = GlissandoSystem.removeStaticPitchMarkers.bind(GlissandoSystem);
            GlissandoSystem.removeStaticPitchMarkers = function(curve) {
                if (curve && curve._pitchMarkerGroups) {
                    for (var ri = 0; ri < curve._pitchMarkerGroups.length; ri++) {
                        if (curve._pitchMarkerGroups[ri] && curve._pitchMarkerGroups[ri].remove) {
                            curve._pitchMarkerGroups[ri].remove();
                        }
                    }
                    delete curve._pitchMarkerGroups;
                }
                // Fallback: call original cleanup too
                origRemoveMarkers(curve);
            };
        }

        // ═══════════════════════════════════════════════════════════════════════
        // 10. Title update
        // ═══════════════════════════════════════════════════════════════════════

        var titleEl = document.querySelector('h1');
        if (titleEl) {
            titleEl.textContent = titleEl.textContent + ' — ' + TRACK_NAMES[TRACK] + ' Part';
        }

        console.log('[PartsMode] Initialized: ' + PAGE_COUNT + ' sections, track ' + TRACK);
    })();
    `;

    // Inject before the closing </script> tag (last occurrence)
    var lastScriptClose = html.lastIndexOf('</script>');
    if (lastScriptClose !== -1) {
        html = html.substring(0, lastScriptClose) + runtimeCode + '\n    ' + html.substring(lastScriptClose);
        console.log('  ✓ Parts mode runtime injected');
    } else {
        console.error('  ✗ Parts mode: could not find </script> injection point');
    }

    return html;
};
