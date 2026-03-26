/**
 * Performance Rehearsal Patches — Phase 8: Rehearsal Mode
 * 
 * Applied by build_performance_app.js AFTER parts patches (Phase 3).
 * Injects a runtime IIFE that adds touch gesture handling:
 *   - Swipe left/right for page turns
 *   - Tap edge zones (15%) for page turns
 *   - Tap center (70%) for controls overlay toggle (Stage 2)
 *   - Long press for context menu (Stage 3)
 *   - Pinch zoom via ScoreZoom
 *   - Works in both full score (2 sections) and parts mode (N sections)
 * 
 * Gesture system uses Pointer Events (supported on iPad Safari since iOS 13).
 * Apple Pencil (pointerType === 'pen') is reserved for annotation (Phase 9).
 */

'use strict';

module.exports = function applyRehearsalPatches(html) {

    // Runtime code injected into the Performance Score HTML.
    // It runs AFTER all systems are initialized (including PartsMode if active).
    const runtimeCode = `

    // ═══ Phase 8: Rehearsal Mode — Touch Gesture System ═══
    (function initRehearsalGestures() {

        var RehearsalGestures = {
            // ─── Pointer tracking ───────────────────────────────────────────
            pointers: {},        // pointerId → {startX, startY, currentX, currentY, startTime, type}
            pointerCount: 0,

            // ─── Gesture thresholds ─────────────────────────────────────────
            SWIPE_MIN_DISTANCE: 50,   // px — minimum horizontal travel
            SWIPE_MAX_TIME: 500,      // ms — maximum swipe duration
            SWIPE_DIRECTION_RATIO: 2, // horizontal must be 2× vertical
            SWIPE_DOWN_MIN_DISTANCE: 30, // px — minimum vertical travel for swipe-down
            SWIPE_DOWN_RATIO: 1.5,       // vertical must be 1.5× horizontal
            TAP_MAX_DISTANCE: 10,     // px — maximum movement for a tap
            TAP_MAX_TIME: 300,        // ms — maximum duration for a tap
            LONG_PRESS_TIME: 600,     // ms — hold duration for long press
            EDGE_ZONE: 0.15,          // 15% from each edge for page-turn taps
            DOUBLE_TAP_TIME: 300,     // ms — max interval between taps for double-tap
            DOUBLE_TAP_DISTANCE: 30,  // px — max distance between taps for double-tap

            // ─── State ──────────────────────────────────────────────────────
            longPressTimer: null,
            isPinching: false,
            wasPinching: false,
            initialPinchDistance: 0,
            initialZoom: 100,
            lastTapTime: 0,
            lastTapX: 0,
            lastTapY: 0,
            container: null,

            // ─── Init ───────────────────────────────────────────────────────
            init: function() {
                this.container = document.getElementById('ScoreContainer');
                if (!this.container) {
                    console.error('[RehearsalGestures] ScoreContainer not found');
                    return;
                }

                var self = this;

                this.container.addEventListener('pointerdown', function(e) { self.onPointerDown(e); });
                this.container.addEventListener('pointermove', function(e) { self.onPointerMove(e); });
                this.container.addEventListener('pointerup', function(e) { self.onPointerUp(e); });
                this.container.addEventListener('pointercancel', function(e) { self.onPointerUp(e); });

                // Prevent default touch actions on the score (scroll, browser zoom)
                // This lets us handle all gestures ourselves
                this.container.style.touchAction = 'none';

                // Guard checkPageChange: skip when not playing to prevent
                // stale ScoreTime from overriding gesture page navigation
                if (window.GraphicTimeline) {
                    var origCheck = GraphicTimeline.checkPageChange.bind(GraphicTimeline);
                    GraphicTimeline.checkPageChange = function() {
                        if (!ScoreTime.isPlaying) return;
                        origCheck();
                    };
                }

                console.log('[RehearsalGestures] Initialized — swipe, tap, pinch-zoom, long-press');
            },

            // ─── Pointer handlers ───────────────────────────────────────────
            onPointerDown: function(e) {
                // Reserve Apple Pencil for annotation (Phase 9)
                if (e.pointerType === 'pen') return;

                this.pointers[e.pointerId] = {
                    startX: e.clientX,
                    startY: e.clientY,
                    currentX: e.clientX,
                    currentY: e.clientY,
                    startTime: Date.now(),
                    type: e.pointerType
                };
                this.pointerCount++;

                // Phase 11: Track pointers but skip gesture initiation when performance locked
                if (window.PerformanceMode && PerformanceMode.locked) {
                    // Stage 4: 2-finger long press (2s) for emergency menu
                    if (this.pointerCount === 2) {
                        var self = this;
                        this._emergencyTimer = setTimeout(function() {
                            self._emergencyTimer = null;
                            if (self.pointerCount === 2 && window.PerformanceMode.showEmergencyMenu) {
                                PerformanceMode.showEmergencyMenu();
                            }
                        }, 2000);
                    } else if (this.pointerCount !== 2 && this._emergencyTimer) {
                        clearTimeout(this._emergencyTimer);
                        this._emergencyTimer = null;
                    }
                    return;
                }

                if (this.pointerCount === 1) {
                    // Single pointer — start long press timer
                    var self = this;
                    var pid = e.pointerId;
                    this.longPressTimer = setTimeout(function() {
                        var p = self.pointers[pid];
                        if (p) self.onLongPress(p);
                    }, this.LONG_PRESS_TIME);
                } else if (this.pointerCount === 2) {
                    // Two pointers — start pinch, cancel long press
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                    this.startPinch();
                }
            },

            onPointerMove: function(e) {
                var p = this.pointers[e.pointerId];
                if (!p) return;
                p.currentX = e.clientX;
                p.currentY = e.clientY;

                // Cancel long press if finger moved too far
                var dx = p.currentX - p.startX;
                var dy = p.currentY - p.startY;
                if (Math.abs(dx) > this.TAP_MAX_DISTANCE || Math.abs(dy) > this.TAP_MAX_DISTANCE) {
                    if (this.longPressTimer) {
                        clearTimeout(this.longPressTimer);
                        this.longPressTimer = null;
                    }
                    // Stage 4: Cancel emergency timer if fingers move
                    if (this._emergencyTimer) {
                        clearTimeout(this._emergencyTimer);
                        this._emergencyTimer = null;
                    }
                }

                // Update pinch zoom if active
                if (this.pointerCount === 2 && this.isPinching) {
                    this.updatePinch();
                }
            },

            onPointerUp: function(e) {
                var p = this.pointers[e.pointerId];

                // Clear long press timer
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }

                // Phase 11 Stage 4: Cancel emergency timer when fingers lift
                if (this._emergencyTimer && this.pointerCount < 2) {
                    clearTimeout(this._emergencyTimer);
                    this._emergencyTimer = null;
                }

                // Evaluate gesture only for single-pointer (non-pinch) interactions
                if (p && this.pointerCount === 1 && !this.isPinching && !this.wasPinching &&
                    !(window.PerformanceMode && PerformanceMode.locked)) {
                    var dx = p.currentX - p.startX;
                    var dy = p.currentY - p.startY;
                    var dt = Date.now() - p.startTime;
                    var dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < this.TAP_MAX_DISTANCE && dt < this.TAP_MAX_TIME) {
                        // Tap gesture
                        this.onTap(p);
                    } else if (Math.abs(dx) > this.SWIPE_MIN_DISTANCE &&
                               dt < this.SWIPE_MAX_TIME &&
                               Math.abs(dx) > Math.abs(dy) * this.SWIPE_DIRECTION_RATIO) {
                        // Horizontal swipe gesture
                        this.onSwipe(dx > 0 ? 'right' : 'left');
                    } else if (dy > this.SWIPE_DOWN_MIN_DISTANCE &&
                               dt < this.SWIPE_MAX_TIME &&
                               Math.abs(dy) > Math.abs(dx) * this.SWIPE_DOWN_RATIO) {
                        // Swipe down → add marker
                        this.onSwipeDown();
                    } else if (-dy > this.SWIPE_DOWN_MIN_DISTANCE &&
                               dt < this.SWIPE_MAX_TIME &&
                               Math.abs(dy) > Math.abs(dx) * this.SWIPE_DOWN_RATIO) {
                        // Swipe up → toggle part/full score view (Phase 12)
                        this.onSwipeUp();
                    }
                }

                // Clean up pointer
                if (this.pointers[e.pointerId]) {
                    delete this.pointers[e.pointerId];
                    this.pointerCount--;
                }

                // End pinch when fewer than 2 pointers
                if (this.pointerCount < 2) {
                    if (this.isPinching) this.wasPinching = true;
                    this.isPinching = false;
                }

                // Reset wasPinching when all pointers released
                if (this.pointerCount === 0) {
                    this.wasPinching = false;
                }
            },

            // ─── Gesture handlers ───────────────────────────────────────────
            onTap: function(p) {
                var self = this;
                var now = Date.now();
                var rect = this.container.getBoundingClientRect();
                var xRatio = (p.startX - rect.left) / rect.width;

                // Check for double-tap (center zone only)
                var isCenter = xRatio >= this.EDGE_ZONE && xRatio <= (1 - this.EDGE_ZONE);
                if (isCenter) {
                    var dtSinceLast = now - this.lastTapTime;
                    var dxFromLast = Math.abs(p.startX - this.lastTapX);
                    var dyFromLast = Math.abs(p.startY - this.lastTapY);
                    if (dtSinceLast < this.DOUBLE_TAP_TIME &&
                        dxFromLast < this.DOUBLE_TAP_DISTANCE &&
                        dyFromLast < this.DOUBLE_TAP_DISTANCE) {
                        // Double-tap — cancel pending single-tap, reset zoom
                        clearTimeout(this._singleTapTimer);
                        this._singleTapTimer = null;
                        this.resetZoom();
                        this.lastTapTime = 0; // prevent triple-tap triggering
                        return;
                    }
                }

                // Record this tap for double-tap detection
                this.lastTapTime = now;
                this.lastTapX = p.startX;
                this.lastTapY = p.startY;

                if (xRatio < this.EDGE_ZONE) {
                    // Left edge tap → previous page (immediate, no double-tap conflict)
                    // Auto-detach during playback (same as swipe) so page turn doesn't stop playback
                    if (window.ScoreTime && ScoreTime.isPlaying && window.SyncMode && !SyncMode.isIndependent) {
                        SyncMode.isIndependent = true;
                        SyncMode.showToast('Auto-detached — tap during playback', 2000);
                    }
                    this.prevPage();
                } else if (xRatio > (1 - this.EDGE_ZONE)) {
                    // Right edge tap → next page (immediate, no double-tap conflict)
                    if (window.ScoreTime && ScoreTime.isPlaying && window.SyncMode && !SyncMode.isIndependent) {
                        SyncMode.isIndependent = true;
                        SyncMode.showToast('Auto-detached — tap during playback', 2000);
                    }
                    this.nextPage();
                } else {
                    // Center zone — defer action to allow double-tap detection
                    clearTimeout(this._singleTapTimer);
                    var yRatio = (p.startY - rect.top) / rect.height;
                    this._singleTapTimer = setTimeout(function() {
                        self._singleTapTimer = null;
                        if (yRatio < 0.5) {
                            self.togglePlayPause();
                        } else {
                            self.onCenterTap();
                        }
                    }, self.DOUBLE_TAP_TIME);
                }
            },

            onSwipe: function(direction) {
                // During playback while synced: auto-detach to independent mode
                if (window.ScoreTime && ScoreTime.isPlaying) {
                    if (window.SyncMode && !SyncMode.isIndependent) {
                        SyncMode.isIndependent = true;
                        SyncMode.showToast('Auto-detached — swipe during playback', 2000);
                    }
                }

                if (direction === 'left') {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
            },

            onLongPress: function(p) {
                console.log('[RehearsalGestures] Long press at (' +
                    Math.round(p.startX) + ', ' + Math.round(p.startY) + ')');
            },

            onSwipeDown: function() {
                // Swipe down → add marker at current position
                if (window.ControlsOverlay) {
                    ControlsOverlay.show();
                    ControlsOverlay.clearFadeTimer();
                }
                if (window.MarkerSystem && window.MarkerSystem._showAddFlow) {
                    MarkerSystem._showAddFlow();
                }
                console.log('[RehearsalGestures] Swipe down → add marker');
            },

            onSwipeUp: function() {
                // Swipe up → toggle between part view and full score (Phase 12)
                // Uses URL reload with position preservation via ?goto= param
                var currentSec = 0;
                if (window.ScoreTime) {
                    currentSec = (ScoreTime.currentScoreTimeMs || 0) / 1000;
                }

                var params = new URLSearchParams(window.location.search);

                if (window.PartsMode && PartsMode.active) {
                    // Currently in parts mode → switch to full score
                    params.delete('track');
                    params.delete('pages');
                    console.log('[RehearsalGestures] Swipe up → switching to full score');
                } else {
                    // Currently in full score → switch to parts mode
                    // Default to track 1, 6 pages (performer can change via ControlsOverlay)
                    var lastTrack = localStorage.getItem('sq1_lastPartTrack') || '1';
                    var lastPages = localStorage.getItem('sq1_lastPartPages') || '6';
                    params.set('track', lastTrack);
                    params.set('pages', lastPages);
                    console.log('[RehearsalGestures] Swipe up → switching to parts mode (track ' + lastTrack + ', ' + lastPages + ' pages)');
                }

                // Preserve position
                params.set('goto', currentSec.toFixed(2));

                // Save current parts mode settings for round-trip
                if (window.PartsMode && PartsMode.active) {
                    localStorage.setItem('sq1_lastPartTrack', String(PartsMode.track));
                    localStorage.setItem('sq1_lastPartPages', String(PartsMode.pageCount));
                }

                // Stop playback before reload
                if (window.ScoreTime && ScoreTime.isPlaying) {
                    if (window.CursorControls && CursorControls.toggleGoStop) {
                        CursorControls.toggleGoStop();
                    }
                }

                window.location.search = params.toString();
            },

            togglePlayPause: function() {
                if (window.SyncMode && SyncMode.isIndependent) {
                    SyncMode.localToggleGoStop();
                    console.log('[RehearsalGestures] Play/Pause toggled (local)');
                } else if (window.CursorControls && CursorControls.toggleGoStop) {
                    CursorControls.toggleGoStop();
                    if (window.ControlsOverlay) ControlsOverlay.refresh();
                    console.log('[RehearsalGestures] Play/Pause toggled');
                }
            },

            onCenterTap: function() {
                if (window.ControlsOverlay) ControlsOverlay.toggle();
            },

            resetZoom: function() {
                if (!window.ScoreZoom) return;
                ScoreZoom.setZoom(100);
                if (window.ControlsOverlay) ControlsOverlay.refresh();
                console.log('[RehearsalGestures] Double-tap — zoom reset to 100%');
            },

            // ─── Page navigation ────────────────────────────────────────────
            getCurrentPage: function() {
                if (window.PartsMode && PartsMode.active) {
                    // Return the base page of the current screen (first visible page)
                    // so manual turns advance by a full screenful
                    var pos = window.StaffCursors ? StaffCursors.getPosition(0) : null;
                    var curPage = pos ? (pos.page || 0) : 0;
                    return Math.floor(curPage / PartsMode.pageCount) * PartsMode.pageCount;
                }
                // Full score: top page (even number) is the reference
                return window.GraphicTimeline ? GraphicTimeline.currentTopPage : 0;
            },

            getPageStep: function() {
                // Full score shows 2 pages (top+bottom); parts mode advances one full screen
                return (window.PartsMode && PartsMode.active) ? PartsMode.pageCount : 2;
            },

            nextPage: function() {
                if (!window.GraphicTimeline) return;
                if (window.LoopSystem && LoopSystem.isEnabled() && !(window.SyncMode && SyncMode.isIndependent)) return;
                var current = this.getCurrentPage();
                var step = this.getPageStep();
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var screenDuration = step * secondsPerPage;
                if (window.SyncMode && SyncMode.isIndependent && window.ScoreTime && ScoreTime.isPlaying) {
                    // Playing: offset from current time to preserve cursor position within screen
                    var nowSec = ScoreTime.now() / 1000;
                    SyncMode.localGoto(nowSec + screenDuration, true);
                } else if (window.SyncMode && SyncMode.isIndependent) {
                    SyncMode.localGoto((current + step) * secondsPerPage, true);
                } else if (window.ClockSync && ClockSync.socket) {
                    ClockSync.socket.emit('scoreGoto', { seconds: (current + step) * secondsPerPage });
                } else {
                    GraphicTimeline.onGoto((current + step) * secondsPerPage);
                }
                console.log('[RehearsalGestures] Next page → page ' + (current + step));
            },

            prevPage: function() {
                if (!window.GraphicTimeline) return;
                if (window.LoopSystem && LoopSystem.isEnabled() && !(window.SyncMode && SyncMode.isIndependent)) return;
                var current = this.getCurrentPage();
                var step = this.getPageStep();
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var screenDuration = step * secondsPerPage;
                if (window.SyncMode && SyncMode.isIndependent && window.ScoreTime && ScoreTime.isPlaying) {
                    // Playing: offset from current time to preserve cursor position within screen
                    var nowSec = ScoreTime.now() / 1000;
                    SyncMode.localGoto(Math.max(0, nowSec - screenDuration), true);
                } else if (window.SyncMode && SyncMode.isIndependent) {
                    var newPage = Math.max(0, current - step);
                    SyncMode.localGoto(newPage * secondsPerPage, true);
                } else if (window.ClockSync && ClockSync.socket) {
                    var newPage = Math.max(0, current - step);
                    ClockSync.socket.emit('scoreGoto', { seconds: newPage * secondsPerPage });
                } else {
                    var newPage = Math.max(0, current - step);
                    GraphicTimeline.onGoto(newPage * secondsPerPage);
                }
                console.log('[RehearsalGestures] Prev page → page ' + Math.max(0, current - step));
            },

            // ─── Pinch zoom ─────────────────────────────────────────────────
            startPinch: function() {
                this.isPinching = true;
                var pts = this.getPointerArray();
                if (pts.length < 2) return;
                var dx = pts[1].currentX - pts[0].currentX;
                var dy = pts[1].currentY - pts[0].currentY;
                this.initialPinchDistance = Math.sqrt(dx * dx + dy * dy);
                this.initialZoom = (window.ScoreZoom) ? ScoreZoom.zoomLevel : 100;
            },

            updatePinch: function() {
                if (!window.ScoreZoom) return;
                var pts = this.getPointerArray();
                if (pts.length < 2) return;
                var dx = pts[1].currentX - pts[0].currentX;
                var dy = pts[1].currentY - pts[0].currentY;
                var dist = Math.sqrt(dx * dx + dy * dy);
                if (this.initialPinchDistance === 0) return;
                var scale = dist / this.initialPinchDistance;
                var newZoom = Math.round(this.initialZoom * scale);
                newZoom = Math.max(ScoreZoom.minZoom, Math.min(ScoreZoom.maxZoom, newZoom));
                ScoreZoom.setZoom(newZoom);
            },

            getPointerArray: function() {
                var arr = [];
                for (var id in this.pointers) {
                    if (this.pointers.hasOwnProperty(id)) arr.push(this.pointers[id]);
                }
                return arr;
            }
        };

        RehearsalGestures.init();
        window.RehearsalGestures = RehearsalGestures;

    })();

    // ═══ Phase 8 Stage 1b: Workshop Interaction Blocker ═══
    // Blocks all Workshop mouse interaction on score sections using capturing-phase
    // event listeners. Pointer events (used by gesture system) are unaffected.
    // See IMPLEMENTATION_PROGRESS.md §Phase 8 Stage 1b for full analysis.
    (function initInteractionBlocker() {
        var blockedMouseEvents = ['mousedown', 'click', 'dblclick'];

        function blockEvent(e) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }

        // Collect ALL score SVG sections: ScoreTop, ScoreBottom,
        // plus dynamically created parts mode sections (ScoreSection2..N-1)
        var targets = [];
        if (window.PartsMode && PartsMode.active && PartsMode.sections) {
            for (var i = 0; i < PartsMode.sections.length; i++) {
                if (PartsMode.sections[i].el) targets.push(PartsMode.sections[i].el);
            }
        } else {
            var scoreTop = document.getElementById('ScoreTop');
            var scoreBottom = document.getElementById('ScoreBottom');
            if (scoreTop) targets.push(scoreTop);
            if (scoreBottom) targets.push(scoreBottom);
        }

        if (targets.length === 0) {
            console.error('InteractionBlocker: no score sections found');
            return;
        }

        // Capturing phase (3rd arg = true) fires BEFORE all other listeners
        blockedMouseEvents.forEach(function(type) {
            targets.forEach(function(el) {
                el.addEventListener(type, blockEvent, true);
            });
        });

        // Block editing keyboard shortcuts (Delete, Backspace, Ctrl+Alt+D)
        // but allow them inside input/textarea elements (right panel controls)
        document.addEventListener('keydown', function(e) {
            var tag = e.target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
            if (e.ctrlKey && e.altKey && (e.key === 'd' || e.key === 'D')) {
                e.stopImmediatePropagation();
                e.preventDefault();
            }
        }, true);

        console.log('InteractionBlocker: blocked ' + targets.length + ' score sections + keyboard shortcuts');
    })();

    // ═══ Phase 8 Stage 2: Controls Overlay ═══
    // Floating touch-friendly panel: Play/Stop, page nav, jump-to, zoom reset.
    // Toggled by center tap. Auto-fades after 3s.
    (function initControlsOverlay() {

        // ─── Create overlay DOM ──────────────────────────────────────────
        var overlay = document.createElement('div');
        overlay.id = 'controlsOverlay';
        overlay.innerHTML = [
            '<div class="co-panel">',
            '  <div class="co-row co-row-main">',
            '    <button class="co-btn co-prev" title="Previous page">◀</button>',
            '    <span class="co-page">Page <span class="co-page-num">0</span> / <span class="co-page-total">0</span></span>',
            '    <button class="co-btn co-next" title="Next page">▶</button>',
            '    <span class="co-divider"></span>',
            '    <button class="co-btn co-play" title="Play/Stop">▶ Play</button>',
            '    <span class="co-divider"></span>',
            '    <button class="co-btn co-zoom" title="Reset zoom">⊙ 100%</button>',
            '    <span class="co-divider"></span>',
            '    <button class="co-btn co-view-btn" title="Toggle Part/Full view">📄</button>',
            '    <button class="co-btn co-track-btn" title="Switch instrument" style="display:none">Vln I</button>',
            '    <button class="co-btn co-pages-btn" title="Pages per screen" style="display:none">6p</button>',
            '    <span class="co-divider"></span>',
            '    <button class="co-btn co-marker-btn" title="Markers">🔖</button>',
            '    <button class="co-btn co-loop-btn" title="Loop">🔁</button>',
            '    <button class="co-btn co-speed-btn" title="Playback speed">1.0x</button>',
            '    <span class="co-divider"></span>',
            '    <button class="co-btn co-home-btn" title="Back to home">🏠</button>',
            '    <button class="co-btn co-close" title="Close">✕</button>',
            '  </div>',
            '  <div class="co-row co-row-jump">',
            '    <label class="co-jump-label">Jump to</label>',
            '    <input class="co-jump-input" type="number" step="0.1" value="0" />',
            '    <span class="co-jump-unit">sec</span>',
            '    <button class="co-btn co-jump-go">Go</button>',
            '  </div>',
            '</div>'
        ].join('');

        // ─── Inject CSS ──────────────────────────────────────────────────
        var style = document.createElement('style');
        style.textContent = [
            '#controlsOverlay {',
            '  position: fixed; bottom: 36px; left: 50%; transform: translateX(-50%);',
            '  z-index: 10000; pointer-events: none;',
            '  opacity: 0; transition: opacity 0.25s ease;',
            '  display: none;',
            '}',
            '#controlsOverlay.co-visible {',
            '  display: block; pointer-events: auto; opacity: 1;',
            '}',
            '#controlsOverlay.co-fading {',
            '  opacity: 0;',
            '}',
            '.co-panel {',
            '  background: rgba(20, 20, 20, 0.88); backdrop-filter: blur(12px);',
            '  border-radius: 14px; padding: 10px 14px;',
            '  box-shadow: 0 4px 24px rgba(0,0,0,0.5);',
            '  color: #fff; font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
            '  font-size: 15px; user-select: none; -webkit-user-select: none;',
            '}',
            '.co-row { display: flex; align-items: center; gap: 8px; justify-content: center; }',
            '.co-row-jump { margin-top: 8px; }',
            '.co-btn {',
            '  background: rgba(255,255,255,0.12); border: none; color: #fff;',
            '  border-radius: 8px; padding: 10px 16px; font-size: 15px;',
            '  cursor: pointer; min-width: 48px; min-height: 44px;',
            '  display: flex; align-items: center; justify-content: center;',
            '  transition: background 0.15s;',
            '}',
            '.co-btn:active { background: rgba(255,255,255,0.25); }',
            '.co-play {',
            '  background: rgb(0,147,92); font-weight: 600; padding: 10px 20px;',
            '}',
            '.co-play.co-playing {',
            '  background: rgb(200,50,50);',
            '}',
            '.co-page { font-size: 14px; opacity: 0.8; min-width: 100px; text-align: center; }',
            '.co-divider { width: 1px; height: 28px; background: rgba(255,255,255,0.2); }',
            '.co-jump-label { font-size: 13px; opacity: 0.7; }',
            '.co-jump-input {',
            '  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);',
            '  color: #fff; border-radius: 6px; padding: 8px 10px; width: 80px;',
            '  font-size: 14px; text-align: center;',
            '}',
            '.co-jump-input:focus { outline: none; border-color: rgba(255,255,255,0.5); }',
            '.co-jump-unit { font-size: 13px; opacity: 0.6; }',
            '.co-zoom { font-size: 13px; opacity: 0.9; }',
            '.co-close { font-size: 15px; opacity: 0.6; padding: 6px 8px; }',
            '.co-close:hover, .co-close:active { opacity: 1; }',
            '.co-marker-btn { font-size: 14px; padding: 6px 8px; }',
            '.co-loop-btn { font-size: 14px; padding: 6px 8px; }',
            '.co-loop-btn.co-loop-active { background: rgba(0,147,92,0.5); }',
            '.co-view-btn { font-size: 13px; padding: 8px 12px; }',
            '.co-view-btn.co-parts-active { background: rgba(0,120,200,0.4); }',
            '.co-pages-btn { font-size: 13px; padding: 8px 12px; font-weight: 600; }',
            '.co-track-btn { font-size: 13px; padding: 8px 12px; font-weight: 600; }',
            '.co-speed-btn { font-size: 13px; padding: 8px 12px; font-weight: 600; }',
            '.co-speed-btn.co-speed-active { background: rgba(200,120,0,0.5); }'
        ].join('');
        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // ─── Overlay controller ──────────────────────────────────────────
        var FADE_DELAY = 4000;
        var fadeTimer = null;
        var isVisible = false;

        var panel = overlay.querySelector('.co-panel');
        var closeBtn = overlay.querySelector('.co-close');
        var playBtn = overlay.querySelector('.co-play');
        var prevBtn = overlay.querySelector('.co-prev');
        var nextBtn = overlay.querySelector('.co-next');
        var zoomBtn = overlay.querySelector('.co-zoom');
        var jumpInput = overlay.querySelector('.co-jump-input');
        var jumpGo = overlay.querySelector('.co-jump-go');
        var pageNum = overlay.querySelector('.co-page-num');
        var pageTotal = overlay.querySelector('.co-page-total');
        var viewBtn = overlay.querySelector('.co-view-btn');
        var trackBtn = overlay.querySelector('.co-track-btn');
        var pagesBtn = overlay.querySelector('.co-pages-btn');
        var speedBtn = overlay.querySelector('.co-speed-btn');
        var TRACK_NAMES = ['Vln I', 'Vln II', 'Vla', 'Vc'];

        var _cachedTotalPages = 0;
        function computeTotalPages(spp) {
            if (_cachedTotalPages > 0) return _cachedTotalPages;
            var leadIn = typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0;
            var maxEnd = 0;
            // SVG element start + offset (approximation of visual extent)
            if (window.SVGElementManager && SVGElementManager.elements) {
                for (var i = 0; i < SVGElementManager.elements.length; i++) {
                    var el = SVGElementManager.elements[i];
                    var t = (el.referenceSeconds || 0) + (el.offsetSeconds || 0);
                    if (t > maxEnd) maxEnd = t;
                }
            }
            // Curves: use endSeconds
            if (window.CurveMaker && CurveMaker.curves) {
                for (var c = 0; c < CurveMaker.curves.length; c++) {
                    var ce = CurveMaker.curves[c].endSeconds || 0;
                    if (ce > maxEnd) maxEnd = ce;
                }
            }
            // Line wedges: use endSeconds
            if (window.LineWedgeMaker && LineWedgeMaker.lineWedges) {
                for (var l = 0; l < LineWedgeMaker.lineWedges.length; l++) {
                    var le = LineWedgeMaker.lineWedges[l].endSeconds || 0;
                    if (le > maxEnd) maxEnd = le;
                }
            }
            // GCs: use endSeconds
            if (window.GCMaker && GCMaker.gcs) {
                for (var g = 0; g < GCMaker.gcs.length; g++) {
                    var ge = GCMaker.gcs[g].endSeconds || 0;
                    if (ge > maxEnd) maxEnd = ge;
                }
            }
            if (maxEnd > 0) {
                var maxActualSec = maxEnd + leadIn;
                _cachedTotalPages = Math.floor(maxActualSec / spp) + 1;
            }
            return _cachedTotalPages;
        }
        function getPageInfo() {
            var current = 0;
            var total = 0;
            var currentScreen = 0;
            var totalScreens = 0;
            var pagesPerScreen = 1;
            if (window.PartsMode && PartsMode.active) {
                var pos = window.StaffCursors ? StaffCursors.getPosition(0) : null;
                current = pos ? (pos.page || 0) : 0;
                pagesPerScreen = PartsMode.pageCount || 1;
                if (window.GraphicTimeline) {
                    var spp = GraphicTimeline.getSecondsPerPage();
                    if (spp > 0) total = computeTotalPages(spp);
                }
            } else if (window.GraphicTimeline) {
                current = GraphicTimeline.currentTopPage || 0;
                pagesPerScreen = 2;
                var spp = GraphicTimeline.getSecondsPerPage();
                if (spp > 0) total = computeTotalPages(spp);
            }
            currentScreen = Math.floor(current / pagesPerScreen) + 1;
            totalScreens = total > 0 ? Math.ceil(total / pagesPerScreen) : 0;
            return { current: current, total: total, currentScreen: currentScreen, totalScreens: totalScreens, pagesPerScreen: pagesPerScreen };
        }

        function refreshState() {
            // Play/Stop
            var playing = window.ScoreTime && ScoreTime.isPlaying;
            playBtn.textContent = playing ? '■ Stop' : '▶ Play';
            playBtn.classList.toggle('co-playing', !!playing);
            // Page (display as spreads in full score: 2 pages per view)
            var info = getPageInfo();
            pageNum.textContent = 'S' + info.currentScreen + ' of ' + info.totalScreens + ' | P' + (info.current + 1);
            pageTotal.textContent = info.total;
            // Zoom
            var zoom = (window.ScoreZoom) ? ScoreZoom.zoomLevel : 100;
            zoomBtn.textContent = '⊙ ' + zoom + '%';
            // View toggle + Pages
            var inParts = window.PartsMode && PartsMode.active;
            viewBtn.textContent = inParts ? '📄 Full' : '📄 Part';
            viewBtn.classList.toggle('co-parts-active', !!inParts);
            trackBtn.style.display = inParts ? '' : 'none';
            pagesBtn.style.display = inParts ? '' : 'none';
            if (inParts) {
                trackBtn.textContent = TRACK_NAMES[(PartsMode.track || 1) - 1] || 'T' + PartsMode.track;
                pagesBtn.textContent = (PartsMode.pageCount || 6) + 'p';
            }
            // Jump input: show current display time
            var displaySec = 0;
            if (window.ScoreTime) {
                displaySec = ((ScoreTime.currentScoreTimeMs || 0) / 1000) - (typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0);
            }
            jumpInput.value = Math.max(0, displaySec).toFixed(1);
            // Speed button
            var spd = window.SpeedControl ? SpeedControl.speed : 1.0;
            speedBtn.textContent = spd + 'x';
            speedBtn.classList.toggle('co-speed-active', spd !== 1.0);
        }

        function show() {
            isVisible = true;
            overlay.classList.remove('co-fading');
            overlay.classList.add('co-visible');
            refreshState();
            resetFadeTimer();
        }

        function hide() {
            overlay.classList.add('co-fading');
            clearTimeout(fadeTimer);
            setTimeout(function() {
                overlay.classList.remove('co-visible', 'co-fading');
                isVisible = false;
            }, 250);
        }

        function toggle() {
            if (isVisible) { hide(); } else { show(); }
        }

        function resetFadeTimer() {
            clearTimeout(fadeTimer);
            fadeTimer = setTimeout(function() { hide(); }, FADE_DELAY);
        }

        // ─── Button handlers ─────────────────────────────────────────────
        closeBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            hide();
        });

        playBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (window.SyncMode && SyncMode.isIndependent) {
                SyncMode.localToggleGoStop();
            } else if (window.CursorControls) {
                CursorControls.toggleGoStop();
            }
            // Update button state after a short delay (server roundtrip)
            setTimeout(refreshState, 150);
            resetFadeTimer();
        });

        prevBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (window.RehearsalGestures) RehearsalGestures.prevPage();
            setTimeout(refreshState, 50);
            resetFadeTimer();
        });

        nextBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (window.RehearsalGestures) RehearsalGestures.nextPage();
            setTimeout(refreshState, 50);
            resetFadeTimer();
        });

        zoomBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (window.ScoreZoom) ScoreZoom.setZoom(100);
            refreshState();
            resetFadeTimer();
        });

        jumpGo.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var displaySec = parseFloat(jumpInput.value) || 0;
            var actualSec = displaySec + (typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0);
            if (window.SyncMode && SyncMode.isIndependent) {
                SyncMode.localGoto(actualSec);
            } else if (window.ClockSync && ClockSync.socket) {
                ClockSync.socket.emit('scoreGoto', { seconds: actualSec });
            }
            setTimeout(refreshState, 150);
            resetFadeTimer();
        });

        jumpInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') jumpGo.click();
        });

        // Auto-select text on focus so user can type immediately
        jumpInput.addEventListener('focus', function() {
            jumpInput.select();
            clearTimeout(fadeTimer);
        });
        jumpInput.addEventListener('blur', function() {
            resetFadeTimer();
        });
        jumpInput.addEventListener('input', function() {
            clearTimeout(fadeTimer);
        });

        viewBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            // Same as swipe-up: toggle Part ↔ Full via URL reload
            if (window.RehearsalGestures && RehearsalGestures.onSwipeUp) {
                RehearsalGestures.onSwipeUp();
            }
        });

        trackBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (!window.PartsMode || !PartsMode.active) return;
            // Cycle track: 1 → 2 → 3 → 4 → 1
            var current = PartsMode.track || 1;
            var next = (current % 4) + 1;
            var currentSec = 0;
            if (window.ScoreTime) {
                currentSec = (ScoreTime.currentScoreTimeMs || 0) / 1000;
            }
            var params = new URLSearchParams(window.location.search);
            params.set('track', String(next));
            params.set('goto', currentSec.toFixed(2));
            localStorage.setItem('sq1_lastPartTrack', String(next));
            // Stop playback before reload
            if (window.ScoreTime && ScoreTime.isPlaying) {
                if (window.CursorControls && CursorControls.toggleGoStop) {
                    CursorControls.toggleGoStop();
                }
            }
            console.log('[ControlsOverlay] Track: ' + TRACK_NAMES[current - 1] + ' → ' + TRACK_NAMES[next - 1]);
            window.location.search = params.toString();
        });

        pagesBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (!window.PartsMode || !PartsMode.active) return;
            // Cycle pages: 4 → 6 → 8 → 4
            var current = PartsMode.pageCount || 6;
            var next = current === 4 ? 6 : current === 6 ? 8 : 4;
            var currentSec = 0;
            if (window.ScoreTime) {
                currentSec = (ScoreTime.currentScoreTimeMs || 0) / 1000;
            }
            var params = new URLSearchParams(window.location.search);
            params.set('pages', String(next));
            params.set('goto', currentSec.toFixed(2));
            localStorage.setItem('sq1_lastPartPages', String(next));
            // Stop playback before reload
            if (window.ScoreTime && ScoreTime.isPlaying) {
                if (window.CursorControls && CursorControls.toggleGoStop) {
                    CursorControls.toggleGoStop();
                }
            }
            console.log('[ControlsOverlay] Pages: ' + current + ' → ' + next);
            window.location.search = params.toString();
        });

        var SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
        speedBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (!window.SpeedControl) return;
            var current = SpeedControl.speed;
            var idx = SPEED_OPTIONS.indexOf(current);
            var next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
            SpeedControl.setSpeed(next);
            speedBtn.textContent = next + 'x';
            speedBtn.classList.toggle('co-speed-active', next !== 1.0);
            resetFadeTimer();
            console.log('[ControlsOverlay] Speed: ' + current + 'x → ' + next + 'x');
        });

        // Home button — navigate back to landing page (rehearsal mode only)
        var homeBtn = panel.querySelector('.co-home-btn');
        homeBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            // Hide in performance mode — only allow in rehearsal
            if (window.PerformanceMode && PerformanceMode.locked) return;
            window.location.href = '/';
        });

        // Prevent overlay interactions from bubbling to gesture system
        panel.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        panel.addEventListener('pointerup', function(e) { e.stopPropagation(); });
        panel.addEventListener('pointermove', function(e) { e.stopPropagation(); });
        // Allow typing in jump input (unblock keyboard)
        jumpInput.addEventListener('keydown', function(e) { e.stopPropagation(); });

        // ─── Public API ──────────────────────────────────────────────────
        window.ControlsOverlay = {
            show: show,
            hide: hide,
            toggle: toggle,
            refresh: refreshState,
            clearFadeTimer: function() { clearTimeout(fadeTimer); },
            resetFadeTimer: resetFadeTimer,
            panelEl: panel,
            getPageInfo: getPageInfo
        };

        console.log('ControlsOverlay: initialized (center tap to toggle)');
    })();

    // ═══ Speed Control: Local playback speed scaling ═══
    // Formula: speedTime = (_origNow() - _refOrig) * speed + _refScore
    // At speed=1.0 with matching refs, this equals _origNow(). No overhead path when speed never used.
    (function initSpeedControl() {
        if (!window.ScoreTime) { console.warn('SpeedControl: ScoreTime not found'); return; }

        var _speed = 1.0;
        var _refOrig = 0;           // _origNow() value at reference point
        var _refScore = 0;          // desired score position at reference point
        var _wasPlaying = false;
        var _speedStopPos = null;   // saved speed-adjusted position from last stop
        var _everUsedSpeed = false; // fast path: skip formula if speed was never changed
        var _hasOffset = false;     // true when client position has diverged from server
        var _origNow = ScoreTime.now.bind(ScoreTime);

        function currentSpeedPos() {
            return (_origNow() - _refOrig) * _speed + _refScore;
        }

        ScoreTime.now = function() {
            if (!this.isPlaying) {
                _wasPlaying = false;
                return this.currentScoreTimeMs;
            }
            // Fast path: speed was never changed
            if (!_everUsedSpeed) {
                _wasPlaying = true;
                return _origNow();
            }
            // Detect play-start transition: set reference point
            if (!_wasPlaying) {
                _wasPlaying = true;
                _refOrig = _origNow();
                if (_speedStopPos !== null) {
                    _refScore = _speedStopPos;
                    _speedStopPos = null;
                    _hasOffset = true; // Position is offset from server
                } else {
                    _refScore = _origNow();
                    _hasOffset = (_speed !== 1.0); // Offset if speed isn't 1x
                }
            }
            return currentSpeedPos();
        };

        // Wrap CursorControls.onScoreStop to save speed-adjusted position
        function hookStopWrapper() {
            if (!window.CursorControls || !CursorControls.onScoreStop) {
                setTimeout(hookStopWrapper, 500); return;
            }
            var _prevStop = CursorControls.onScoreStop;
            CursorControls.onScoreStop = function(data) {
                if (_hasOffset && ScoreTime.isPlaying && _wasPlaying) {
                    _speedStopPos = currentSpeedPos();
                }
                _prevStop(data);
                if (_speedStopPos !== null) {
                    ScoreTime.currentScoreTimeMs = _speedStopPos;
                }
            };
        }
        hookStopWrapper();

        // Wrap CursorControls.onScoreGoto to clear stale speed position
        function hookGotoWrapper() {
            if (!window.CursorControls || !CursorControls.onScoreGoto) {
                setTimeout(hookGotoWrapper, 500); return;
            }
            var _prevGoto = CursorControls.onScoreGoto;
            CursorControls.onScoreGoto = function(data) {
                _speedStopPos = null;
                _hasOffset = false;
                _prevGoto(data);
            };
        }
        hookGotoWrapper();

        window.SpeedControl = {
            get speed() { return _speed; },
            get hasOffset() { return _hasOffset; },
            setSpeed: function(val) {
                if (val === _speed) return;
                _everUsedSpeed = true;
                if (ScoreTime.isPlaying && _wasPlaying) {
                    // Capture current position at old speed, then re-anchor
                    _refScore = currentSpeedPos();
                    _refOrig = _origNow();
                }
                if (val !== 1.0) _hasOffset = true;
                _speed = val;
                console.log('[SpeedControl] Speed set to ' + val + 'x');
            }
        };

        console.log('SpeedControl: initialized (default 1.0x)');
    })();

    // ═══ Phase 8 Stage 3: Marker System ═══
    // Custom markers with localStorage persistence, overlay panel, and list.
    (function initMarkerSystem() {

        var STORAGE_KEY = 'sq1_markers';
        var COLORS = ['#ff6600', '#00aaff', '#44cc44', '#ff44aa', '#ffcc00', '#aa66ff'];
        var markers = [];
        var nextId = 1;
        var markerPanelVisible = false;

        // ─── Load from localStorage ─────────────────────────────────────
        function load() {
            try {
                var raw = localStorage.getItem(STORAGE_KEY);
                if (raw) {
                    var data = JSON.parse(raw);
                    markers = data.markers || [];
                    nextId = data.nextId || 1;
                }
            } catch (e) { /* ignore */ }
        }

        function save() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify({
                    markers: markers,
                    nextId: nextId
                }));
            } catch (e) { /* ignore */ }
        }

        load();

        // ─── CRUD ───────────────────────────────────────────────────────
        function addMarker(name) {
            var scoreTimeMs = 0;
            if (window.ScoreTime) {
                scoreTimeMs = (ScoreTime.isPlaying && typeof ScoreTime.now === 'function')
                    ? ScoreTime.now()
                    : (ScoreTime.currentScoreTimeMs || 0);
            }
            var displaySec = (scoreTimeMs / 1000) - (typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0);
            displaySec = Math.max(0, displaySec);
            var page = 0;
            if (window.GraphicTimeline) {
                page = GraphicTimeline.currentTopPage || 0;
            }
            var marker = {
                id: 'm' + nextId++,
                name: name || ('Marker ' + (markers.length + 1)),
                scoreTimeMs: scoreTimeMs,
                displaySec: displaySec,
                page: page,
                color: COLORS[markers.length % COLORS.length],
                type: 'personal'
            };
            markers.push(marker);
            save();
            renderList();
            if (window.MiniMap) MiniMap.renderMarkers();
            console.log('[MarkerSystem] Added: ' + marker.name + ' at ' + displaySec.toFixed(1) + 's');
            return marker;
        }

        function removeMarker(id) {
            markers = markers.filter(function(m) { return m.id !== id; });
            save();
            renderList();
            if (window.MiniMap) MiniMap.renderMarkers();
        }

        function jumpTo(id) {
            var m = markers.find(function(mk) { return mk.id === id; });
            if (!m) return;
            if (window.SyncMode && SyncMode.isIndependent) {
                SyncMode.localGoto(m.scoreTimeMs / 1000);
            } else if (window.ClockSync && ClockSync.socket) {
                ClockSync.socket.emit('scoreGoto', { seconds: m.scoreTimeMs / 1000 });
            }
            if (window.ControlsOverlay) {
                setTimeout(function() { ControlsOverlay.refresh(); }, 150);
            }
        }

        // ─── Build marker panel DOM ─────────────────────────────────────
        var panelEl = null;
        if (window.ControlsOverlay && ControlsOverlay.panelEl) {
            panelEl = ControlsOverlay.panelEl;
        }

        // Create marker sub-panel
        var markerPanel = document.createElement('div');
        markerPanel.className = 'co-marker-panel';
        markerPanel.style.display = 'none';
        markerPanel.innerHTML = [
            '<div class="co-row co-marker-header">',
            '  <span class="co-marker-title">Markers</span>',
            '  <button class="co-btn co-marker-add">+ Mark Here</button>',
            '</div>',
            '<div class="co-row co-marker-name-row" style="display:none">',
            '  <input class="co-marker-name-input" type="text" placeholder="Marker name..." />',
            '  <button class="co-btn co-marker-save">Save</button>',
            '  <button class="co-btn co-marker-cancel">✕</button>',
            '</div>',
            '<div class="co-marker-list"></div>'
        ].join('');

        if (panelEl) panelEl.appendChild(markerPanel);

        // Inject CSS for marker panel
        var mStyle = document.createElement('style');
        mStyle.textContent = [
            '.co-marker-panel { margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; }',
            '.co-marker-header { justify-content: space-between; }',
            '.co-marker-title { font-size: 14px; font-weight: 600; }',
            '.co-marker-add { font-size: 12px; padding: 6px 10px; }',
            '.co-marker-name-row { margin-top: 6px; }',
            '.co-marker-name-input {',
            '  background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.2);',
            '  color: #fff; border-radius: 6px; padding: 6px 8px; flex: 1;',
            '  font-size: 13px;',
            '}',
            '.co-marker-name-input:focus { outline: none; border-color: rgba(255,255,255,0.5); }',
            '.co-marker-save, .co-marker-cancel { font-size: 12px; padding: 6px 10px; }',
            '.co-marker-list { max-height: 150px; overflow-y: auto; margin-top: 6px; }',
            '.co-marker-item {',
            '  display: flex; align-items: center; gap: 6px; padding: 6px 8px;',
            '  border-radius: 6px; cursor: pointer; font-size: 13px;',
            '  transition: background 0.15s;',
            '}',
            '.co-marker-item:active { background: rgba(255,255,255,0.15); }',
            '.co-marker-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }',
            '.co-marker-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
            '.co-marker-time { opacity: 0.6; font-size: 12px; white-space: nowrap; }',
            '.co-marker-del {',
            '  opacity: 0.4; cursor: pointer; font-size: 14px; padding: 2px 6px;',
            '  border-radius: 4px;',
            '}',
            '.co-marker-del:active { opacity: 1; background: rgba(255,50,50,0.3); }',
            '.co-marker-empty { text-align: center; opacity: 0.5; padding: 12px; font-size: 13px; }'
        ].join('');
        document.head.appendChild(mStyle);

        // ─── DOM references ─────────────────────────────────────────────
        var markerBtn = document.querySelector('.co-marker-btn');
        var addBtn = markerPanel.querySelector('.co-marker-add');
        var nameRow = markerPanel.querySelector('.co-marker-name-row');
        var nameInput = markerPanel.querySelector('.co-marker-name-input');
        var saveBtn = markerPanel.querySelector('.co-marker-save');
        var cancelBtn = markerPanel.querySelector('.co-marker-cancel');
        var listEl = markerPanel.querySelector('.co-marker-list');

        // ─── Render marker list ─────────────────────────────────────────
        function formatTime(sec) {
            var m = Math.floor(sec / 60);
            var s = (sec % 60).toFixed(1);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        function renderList() {
            if (!listEl) return;
            if (markers.length === 0) {
                listEl.innerHTML = '<div class="co-marker-empty">No markers yet</div>';
                return;
            }
            var sorted = markers.slice().sort(function(a, b) { return a.scoreTimeMs - b.scoreTimeMs; });
            listEl.innerHTML = sorted.map(function(m) {
                return '<div class="co-marker-item" data-id="' + m.id + '">' +
                    '<span class="co-marker-dot" style="background:' + m.color + '"></span>' +
                    '<span class="co-marker-name">' + m.name + '</span>' +
                    '<span class="co-marker-time">' + formatTime(m.displaySec) + '</span>' +
                    '<span class="co-marker-del" data-del="' + m.id + '">✕</span>' +
                    '</div>';
            }).join('');
        }

        // ─── Event handlers ─────────────────────────────────────────────
        if (markerBtn) {
            markerBtn.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                markerPanelVisible = !markerPanelVisible;
                markerPanel.style.display = markerPanelVisible ? 'block' : 'none';
                if (markerPanelVisible) {
                    renderList();
                    if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
                } else {
                    nameRow.style.display = 'none';
                    if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
                }
            });
        }

        if (addBtn) {
            addBtn.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                nameRow.style.display = 'flex';
                nameInput.value = 'Marker ' + (markers.length + 1);
                nameInput.focus();
                nameInput.select();
                if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
            });
        }

        function saveMarker() {
            var name = nameInput.value.trim() || ('Marker ' + (markers.length + 1));
            addMarker(name);
            nameRow.style.display = 'none';
            nameInput.value = '';
            if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
        }

        if (saveBtn) {
            saveBtn.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                saveMarker();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                nameRow.style.display = 'none';
                if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
            });
        }

        if (nameInput) {
            nameInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') saveMarker();
            });
            nameInput.addEventListener('keydown', function(e) { e.stopPropagation(); });
            nameInput.addEventListener('focus', function() {
                if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
            });
        }

        // Marker list: click to jump, × to delete
        if (listEl) {
            listEl.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                var delBtn = e.target.closest('[data-del]');
                if (delBtn) {
                    removeMarker(delBtn.getAttribute('data-del'));
                    return;
                }
                var item = e.target.closest('.co-marker-item');
                if (item) {
                    jumpTo(item.getAttribute('data-id'));
                }
                if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
            });
        }

        // Block pointer events from reaching gesture system
        markerPanel.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        markerPanel.addEventListener('pointerup', function(e) { e.stopPropagation(); });
        markerPanel.addEventListener('pointermove', function(e) { e.stopPropagation(); });

        // ─── Public API ─────────────────────────────────────────────────
        window.MarkerSystem = {
            add: addMarker,
            remove: removeMarker,
            jumpTo: jumpTo,
            getAll: function() { return markers.slice(); },
            renderList: renderList,
            _showAddFlow: function() {
                // Show marker panel, open name input, focus it
                markerPanelVisible = true;
                markerPanel.style.display = 'block';
                nameRow.style.display = 'flex';
                nameInput.value = 'Marker ' + (markers.length + 1);
                nameInput.focus();
                nameInput.select();
                renderList();
            }
        };

        renderList();
        console.log('[MarkerSystem] Initialized (' + markers.length + ' markers loaded)');
    })();

    // ═══ Phase 8 Stage 4: Loop System ═══
    // Per-client loop: set A/B points, auto-jump at loop end, count display.
    (function initLoopSystem() {

        var loopStartMs = null;   // scoreTimeMs
        var loopEndMs = null;     // scoreTimeMs
        var loopEnabled = false;
        var loopCount = 0;
        var maxLoops = Infinity;  // 0 = infinite
        var loopPanelVisible = false;

        // ─── Build loop panel DOM ───────────────────────────────────────
        var panelEl = null;
        if (window.ControlsOverlay && ControlsOverlay.panelEl) {
            panelEl = ControlsOverlay.panelEl;
        }

        var loopPanel = document.createElement('div');
        loopPanel.className = 'co-loop-panel';
        loopPanel.style.display = 'none';
        loopPanel.innerHTML = [
            '<div class="co-row co-loop-header">',
            '  <span class="co-loop-title">Loop</span>',
            '  <span class="co-loop-count"></span>',
            '</div>',
            '<div class="co-row co-loop-points">',
            '  <button class="co-btn co-loop-set-a">Set A</button>',
            '  <span class="co-loop-range">—</span>',
            '  <button class="co-btn co-loop-set-b">Set B</button>',
            '</div>',
            '<div class="co-row co-loop-actions">',
            '  <button class="co-btn co-loop-toggle" disabled>▶ Loop Off</button>',
            '  <button class="co-btn co-loop-clear">Clear</button>',
            '</div>'
        ].join('');

        if (panelEl) panelEl.appendChild(loopPanel);

        // ─── CSS ────────────────────────────────────────────────────────
        var lStyle = document.createElement('style');
        lStyle.textContent = [
            '.co-loop-panel { margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.15); padding-top: 8px; }',
            '.co-loop-header { justify-content: space-between; }',
            '.co-loop-title { font-size: 14px; font-weight: 600; }',
            '.co-loop-count { font-size: 12px; opacity: 0.6; }',
            '.co-loop-points { gap: 6px; }',
            '.co-loop-set-a, .co-loop-set-b { font-size: 12px; padding: 6px 12px; min-width: 56px; }',
            '.co-loop-set-a.co-set { background: rgba(0,170,255,0.35); }',
            '.co-loop-set-b.co-set { background: rgba(255,102,0,0.35); }',
            '.co-loop-range { font-size: 12px; opacity: 0.6; flex: 1; text-align: center; }',
            '.co-loop-actions { gap: 6px; margin-top: 4px; }',
            '.co-loop-toggle { font-size: 12px; padding: 6px 12px; }',
            '.co-loop-toggle.co-on { background: rgba(0,147,92,0.5); }',
            '.co-loop-clear { font-size: 12px; padding: 6px 12px; opacity: 0.7; }',
            '#miniMap .mm-loop-region {',
            '  position: absolute; top: 0; height: 100%;',
            '  background: rgba(0,170,255,0.2); border-left: 1px solid rgba(0,170,255,0.6);',
            '  border-right: 1px solid rgba(255,102,0,0.6); pointer-events: none;',
            '}'
        ].join('');
        document.head.appendChild(lStyle);

        // ─── DOM refs ───────────────────────────────────────────────────
        var loopBtn = document.querySelector('.co-loop-btn');
        var setABtn = loopPanel.querySelector('.co-loop-set-a');
        var setBBtn = loopPanel.querySelector('.co-loop-set-b');
        var rangeEl = loopPanel.querySelector('.co-loop-range');
        var toggleBtn = loopPanel.querySelector('.co-loop-toggle');
        var clearBtn = loopPanel.querySelector('.co-loop-clear');
        var countEl = loopPanel.querySelector('.co-loop-count');

        // ─── Helpers ────────────────────────────────────────────────────
        function formatSec(ms) {
            var s = Math.max(0, (ms / 1000) - (typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0));
            var m = Math.floor(s / 60);
            var sec = (s % 60).toFixed(1);
            return m + ':' + (sec < 10 ? '0' : '') + sec;
        }

        function refreshUI() {
            // A/B buttons
            if (loopStartMs !== null) {
                setABtn.textContent = 'A: ' + formatSec(loopStartMs);
                setABtn.classList.add('co-set');
            } else {
                setABtn.textContent = 'Set A';
                setABtn.classList.remove('co-set');
            }
            if (loopEndMs !== null) {
                setBBtn.textContent = 'B: ' + formatSec(loopEndMs);
                setBBtn.classList.add('co-set');
            } else {
                setBBtn.textContent = 'Set B';
                setBBtn.classList.remove('co-set');
            }

            // Range display
            if (loopStartMs !== null && loopEndMs !== null) {
                rangeEl.textContent = formatSec(loopStartMs) + ' → ' + formatSec(loopEndMs);
                toggleBtn.disabled = false;
            } else {
                rangeEl.textContent = loopStartMs !== null ? 'A set, need B' : '—';
                toggleBtn.disabled = (loopStartMs === null || loopEndMs === null);
            }

            // Toggle button
            toggleBtn.textContent = loopEnabled ? '🔁 Looping' : '▶ Start Loop';
            toggleBtn.classList.toggle('co-on', loopEnabled);

            // Loop button glow
            if (loopBtn) loopBtn.classList.toggle('co-loop-active', loopEnabled);

            // Count
            if (loopEnabled && loopCount > 0) {
                countEl.textContent = 'Loop ' + loopCount + (maxLoops === Infinity ? ' / ∞' : ' / ' + maxLoops);
            } else {
                countEl.textContent = '';
            }

            // Mini-map loop region
            if (window.MiniMap && MiniMap.renderLoopRegion) MiniMap.renderLoopRegion();
        }

        // ─── Event handlers ─────────────────────────────────────────────
        if (loopBtn) {
            loopBtn.addEventListener('pointerup', function(e) {
                e.stopPropagation();
                loopPanelVisible = !loopPanelVisible;
                loopPanel.style.display = loopPanelVisible ? 'block' : 'none';
                if (loopPanelVisible) {
                    refreshUI();
                    if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
                } else {
                    if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
                }
            });
        }

        // ─── Server-based loop controls ─────────────────────────────────
        // All loop actions go through the server. The server stores loop
        // state per room and broadcasts loopState to all clients.
        // The server's loop check interval handles the rewind (scoreGoto
        // + scoreGo), so no client-side loop checking or offset hacking
        // is needed.

        function getSocket() {
            return (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
        }

        setABtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var timeMs = (window.ScoreTime) ? (ScoreTime.currentScoreTimeMs || 0) : 0;
            var sock = getSocket();
            if (sock) sock.emit('loopSet', { point: 'A', timeMs: timeMs });
            if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
        });

        setBBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var timeMs = (window.ScoreTime) ? (ScoreTime.currentScoreTimeMs || 0) : 0;
            var sock = getSocket();
            if (sock) sock.emit('loopSet', { point: 'B', timeMs: timeMs });
            if (window.ControlsOverlay) ControlsOverlay.clearFadeTimer();
        });

        toggleBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var sock = getSocket();
            if (sock) sock.emit('loopToggle');
            if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
        });

        clearBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var sock = getSocket();
            if (sock) sock.emit('loopClear');
            if (window.ControlsOverlay) ControlsOverlay.resetFadeTimer();
        });

        // ─── Listen for server loopState broadcasts ─────────────────────
        function onLoopState(data) {
            var wasEnabled = loopEnabled;
            loopStartMs = data.loopStartMs;
            loopEndMs = data.loopEndMs;
            loopEnabled = data.loopEnabled;
            loopCount = data.loopCount || 0;
            refreshUI();
            // When loop disables during playback, sections may be stale
            // from the frozen circular buffer — refresh all sections
            if (wasEnabled && !loopEnabled && window.ScoreTime && ScoreTime.isPlaying) {
                var currentSec = ScoreTime.now() / 1000;
                if (window.GraphicTimeline) GraphicTimeline.onGoto(currentSec);
            }
        }

        // Register listener (works with both real socket.io and stub)
        var sock = getSocket();
        if (sock) {
            sock.on('loopState', onLoopState);
        }

        // Block pointer events from reaching gesture system
        loopPanel.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        loopPanel.addEventListener('pointerup', function(e) { e.stopPropagation(); });
        loopPanel.addEventListener('pointermove', function(e) { e.stopPropagation(); });

        // ─── Public API ─────────────────────────────────────────────────
        window.LoopSystem = {
            getRegion: function() {
                return { startMs: loopStartMs, endMs: loopEndMs, enabled: loopEnabled };
            },
            isEnabled: function() { return loopEnabled; },
            setMaxLoops: function(n) { maxLoops = n; refreshUI(); }
        };

        console.log('[LoopSystem] Initialized');
    })();

    // ═══ Phase 8 Stage 3: Mini-Map ═══
    // Always-visible bar at bottom showing score position, page badge,
    // marker ticks, and tap-to-jump navigation.
    (function initMiniMap() {

        // ─── Create DOM ─────────────────────────────────────────────────
        var bar = document.createElement('div');
        bar.id = 'miniMap';
        bar.innerHTML = [
            '<span class="mm-page-badge">P0/0</span>',
            '<div class="mm-bar">',
            '  <div class="mm-progress"></div>',
            '  <div class="mm-cursor"></div>',
            '</div>',
            '<span class="mm-time">0:00</span>'
        ].join('');
        document.body.appendChild(bar);

        // ─── CSS ────────────────────────────────────────────────────────
        var style = document.createElement('style');
        style.textContent = [
            '#miniMap {',
            '  position: fixed; bottom: 0; left: 0; right: 0; height: 28px;',
            '  background: rgba(10,10,10,0.9); z-index: 9999;',
            '  display: flex; align-items: center; padding: 0 10px;',
            '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
            '  user-select: none; -webkit-user-select: none;',
            '  transition: height 0.25s ease, opacity 0.25s ease;',
            '  overflow: hidden;',
            '}',
            '#miniMap.mm-collapsed {',
            '  height: 3px; opacity: 0.3; cursor: pointer;',
            '}',
            '#miniMapHoverZone {',
            '  position: fixed; bottom: 0; left: 0; right: 0; height: 30px;',
            '  z-index: 9998; pointer-events: auto;',
            '}',
            '#miniMap .mm-page-badge {',
            '  color: rgba(255,255,255,0.7); font-size: 11px; white-space: nowrap;',
            '  min-width: 42px;',
            '}',
            '#miniMap .mm-bar {',
            '  flex: 1; height: 6px; background: rgba(255,255,255,0.1);',
            '  border-radius: 3px; position: relative; cursor: pointer;',
            '  margin: 0 8px;',
            '}',
            '#miniMap .mm-progress {',
            '  position: absolute; top: 0; left: 0; height: 100%;',
            '  background: rgba(0,147,92,0.5); border-radius: 3px;',
            '  pointer-events: none;',
            '}',
            '#miniMap .mm-cursor {',
            '  position: absolute; top: -3px; width: 3px; height: 12px;',
            '  background: #fff; border-radius: 2px; pointer-events: none;',
            '}',
            '#miniMap .mm-marker {',
            '  position: absolute; top: -2px; width: 2px; height: 10px;',
            '  border-radius: 1px; pointer-events: none;',
            '}',
            '#miniMap .mm-time {',
            '  color: rgba(255,255,255,0.5); font-size: 11px; white-space: nowrap;',
            '  min-width: 42px; text-align: right;',
            '}'
        ].join('');
        document.head.appendChild(style);

        // ─── DOM refs ───────────────────────────────────────────────────
        var pageBadge = bar.querySelector('.mm-page-badge');
        var mmBar = bar.querySelector('.mm-bar');
        var progress = bar.querySelector('.mm-progress');
        var cursor = bar.querySelector('.mm-cursor');
        var timeEl = bar.querySelector('.mm-time');

        // ─── Auto-show/hide ─────────────────────────────────────────────
        var hoverZone = document.createElement('div');
        hoverZone.id = 'miniMapHoverZone';
        document.body.appendChild(hoverZone);

        var mmHideTimer = null;
        function showMiniMap() {
            bar.classList.remove('mm-collapsed');
            clearTimeout(mmHideTimer);
            mmHideTimer = setTimeout(hideMiniMap, 3000);
        }
        function hideMiniMap() {
            bar.classList.add('mm-collapsed');
            clearTimeout(mmHideTimer);
        }

        // Start collapsed
        bar.classList.add('mm-collapsed');

        // Hover/touch triggers
        hoverZone.addEventListener('pointerenter', showMiniMap);
        bar.addEventListener('pointerenter', showMiniMap);
        bar.addEventListener('pointerleave', function() {
            clearTimeout(mmHideTimer);
            mmHideTimer = setTimeout(hideMiniMap, 3000);
        });

        // ─── Helpers ────────────────────────────────────────────────────
        function getTotalDurationSec() {
            if (window.ControlsOverlay && ControlsOverlay.getPageInfo) {
                var info = ControlsOverlay.getPageInfo();
                if (info.total > 0 && window.GraphicTimeline) {
                    return info.total * GraphicTimeline.getSecondsPerPage();
                }
            }
            return 1; // prevent division by zero
        }

        function getCurrentSec() {
            if (!window.ScoreTime) return 0;
            return (ScoreTime.currentScoreTimeMs || 0) / 1000;
        }

        function formatTime(sec) {
            var ds = sec - (typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0);
            ds = Math.max(0, ds);
            var m = Math.floor(ds / 60);
            var s = Math.floor(ds % 60);
            return m + ':' + (s < 10 ? '0' : '') + s;
        }

        // ─── Render markers on bar ──────────────────────────────────────
        function renderMarkers() {
            // Remove existing marker ticks
            var existing = mmBar.querySelectorAll('.mm-marker');
            for (var i = 0; i < existing.length; i++) existing[i].remove();

            if (!window.MarkerSystem) return;
            var all = MarkerSystem.getAll();
            var total = getTotalDurationSec();
            all.forEach(function(m) {
                var sec = m.scoreTimeMs / 1000;
                var pct = Math.min(100, (sec / total) * 100);
                var tick = document.createElement('div');
                tick.className = 'mm-marker';
                tick.style.left = pct + '%';
                tick.style.background = m.color;
                mmBar.appendChild(tick);
            });
        }

        // ─── Update loop ────────────────────────────────────────────────
        function update() {
            var total = getTotalDurationSec();
            var current = getCurrentSec();
            var pct = Math.min(100, (current / total) * 100);

            progress.style.width = pct + '%';
            cursor.style.left = 'calc(' + pct + '% - 1.5px)';
            timeEl.textContent = formatTime(current);

            // Page badge (display as spreads in full score mode)
            if (window.ControlsOverlay && ControlsOverlay.getPageInfo) {
                var info = ControlsOverlay.getPageInfo();
                pageBadge.textContent = 'S' + info.currentScreen + '/' + info.totalScreens + ' P' + (info.current + 1) + '/' + info.total;
            }
        }

        // Update every 200ms (smooth enough, low overhead)
        setInterval(update, 200);
        update();
        renderMarkers();

        // ─── Tap to jump ────────────────────────────────────────────────
        mmBar.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var rect = mmBar.getBoundingClientRect();
            var ratio = (e.clientX - rect.left) / rect.width;
            ratio = Math.max(0, Math.min(1, ratio));
            var targetSec = ratio * getTotalDurationSec();
            if (window.SyncMode && SyncMode.isIndependent) {
                SyncMode.localGoto(targetSec);
            } else if (window.ClockSync && ClockSync.socket) {
                ClockSync.socket.emit('scoreGoto', { seconds: targetSec });
            }
            setTimeout(update, 150);
        });

        // Block events from reaching gesture system
        bar.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        bar.addEventListener('pointermove', function(e) { e.stopPropagation(); });

        // ─── Loop region rendering ──────────────────────────────────────
        function renderLoopRegion() {
            var existing = mmBar.querySelector('.mm-loop-region');
            if (existing) existing.remove();

            if (!window.LoopSystem) return;
            var region = LoopSystem.getRegion();
            if (region.startMs === null || region.endMs === null) return;

            var total = getTotalDurationSec();
            var startPct = Math.min(100, (region.startMs / 1000 / total) * 100);
            var endPct = Math.min(100, (region.endMs / 1000 / total) * 100);

            var el = document.createElement('div');
            el.className = 'mm-loop-region';
            el.style.left = startPct + '%';
            el.style.width = (endPct - startPct) + '%';
            mmBar.appendChild(el);
        }

        // ─── Public API ─────────────────────────────────────────────────
        window.MiniMap = {
            update: update,
            renderMarkers: renderMarkers,
            renderLoopRegion: renderLoopRegion,
            show: showMiniMap,
            hide: hideMiniMap
        };

        console.log('[MiniMap] Initialized');
    })();

    // ═══ Phase 8 Stage 5b: Sync Mode + Leader ═══
    // Manages synced vs. independent playback and leader privileges.
    // Leader: first client in room; only leader can send room-wide commands.
    // Independent mode: client ignores server scoreGo/Stop/Goto; uses local controls.
    (function initSyncMode() {

        var _isIndependent = false;
        var _isLeader = false;
        var _leaderId = null;
        var _mySocketId = null;
        var _toastTimer = null;
        var _performers = []; // { socketId, displayName, performerId }

        function getSocket() {
            return (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
        }

        // ─── Determine own socket ID ─────────────────────────────────────
        var sock = getSocket();
        function resolveSocketId() {
            if (_mySocketId) return;
            if (sock && sock.id) {
                _mySocketId = sock.id;
                console.log('[SyncMode] Socket ID resolved: ' + _mySocketId);
                // Re-check leadership now that we know our ID
                if (_leaderId) {
                    _isLeader = (_leaderId === _mySocketId);
                    refreshSyncUI();
                }
            }
        }
        if (sock) {
            if (sock.id) _mySocketId = sock.id;
            sock.on('connect', function() { _mySocketId = sock.id; resolveSocketId(); });
            // Poll in case connect already fired
            if (!_mySocketId) {
                var idPoll = setInterval(function() {
                    if (sock.id) { clearInterval(idPoll); resolveSocketId(); }
                }, 100);
                setTimeout(function() { clearInterval(idPoll); }, 5000);
            }
        }

        // ─── Intercept server events when independent ────────────────────
        // Wrap CursorControls handlers so they no-op when independent
        function wrapHandler(obj, methodName) {
            if (!obj || typeof obj[methodName] !== 'function') return;
            var orig = obj[methodName].bind(obj);
            obj[methodName] = function(data) {
                if (_isIndependent) return; // ignore server event
                orig(data);
            };
        }

        // Wait a tick for CursorControls to be available
        setTimeout(function() {
            if (window.CursorControls) {
                wrapHandler(CursorControls, 'onScoreGo');
                wrapHandler(CursorControls, 'onScoreStop');
                wrapHandler(CursorControls, 'onScoreGoto');

                // Phase 13: Latency-compensated starts — delay scoreGo until scheduledStartTime
                var _wrappedScoreGo = CursorControls.onScoreGo;
                CursorControls.onScoreGo = function(data) {
                    if (data && data.scheduledStartTime && window.ClockSync) {
                        var delay = data.scheduledStartTime - ClockSync.now();
                        if (delay > 0 && delay < 5000) {
                            setTimeout(function() { _wrappedScoreGo(data); }, delay);
                            return;
                        }
                    }
                    _wrappedScoreGo(data);
                };
            }
        }, 100);

        // ─── Local goto for independent mode ───────────────────────────
        function localGoto(targetSeconds, keepPlaying) {
            if (!window.ScoreTime) return;
            var wasPlaying = keepPlaying && ScoreTime.isPlaying;
            ScoreTime.currentScoreTimeMs = targetSeconds * 1000;
            ScoreTime.isPlaying = false;
            if (window.GraphicTimeline) GraphicTimeline.onGoto(targetSeconds);
            if (window.TrackSystem) TrackSystem.onGoto(targetSeconds);
            if (wasPlaying && window.ClockSync) {
                ScoreTime.scoreTimeOffset = ClockSync.now() - ScoreTime.currentScoreTimeMs;
                ScoreTime.isPlaying = true;
            }
            if (window.ControlsOverlay) ControlsOverlay.refresh();
        }

        // ─── Local play/stop for independent mode ────────────────────────
        function localToggleGoStop() {
            if (!window.ScoreTime || !window.ClockSync) return;
            if (ScoreTime.isPlaying) {
                ScoreTime.currentScoreTimeMs = ScoreTime.now();
                ScoreTime.isPlaying = false;
            } else {
                ScoreTime.scoreTimeOffset = ClockSync.now() - ScoreTime.currentScoreTimeMs;
                ScoreTime.isPlaying = true;
            }
            if (window.ControlsOverlay) ControlsOverlay.refresh();
            if (ScoreTime.isPlaying && window.MiniMap) MiniMap.show();
        }

        // ─── Create UI ──────────────────────────────────────────────────
        var syncBar = document.createElement('div');
        syncBar.id = 'syncBar';
        syncBar.innerHTML = [
            '<span class="sb-leader-badge"></span>',
            '<button class="sb-btn sb-sync-toggle" title="Toggle sync mode">🔗 Synced</button>',
            '<button class="sb-btn sb-resync" title="Re-sync to room" style="display:none">↩ Re-sync</button>',
            '<button class="sb-btn sb-recall" title="Recall all to your position" style="display:none">📢 Recall All</button>',
            '<button class="sb-btn sb-transfer" title="Transfer leadership" style="display:none">👑 Transfer</button>',
            '<div class="sb-transfer-list" style="display:none"></div>',
            '<div class="sb-toast" style="display:none"></div>'
        ].join('');

        var sbStyle = document.createElement('style');
        sbStyle.textContent = [
            '#syncBar {',
            '  position: fixed; top: 8px; right: 8px; z-index: 10001;',
            '  display: flex; align-items: center; gap: 6px;',
            '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
            '  user-select: none; -webkit-user-select: none;',
            '}',
            '.sb-leader-badge {',
            '  color: #ffd700; font-size: 12px; font-weight: 600;',
            '  background: rgba(20,20,20,0.75); border-radius: 8px; padding: 4px 8px;',
            '}',
            '.sb-btn {',
            '  background: rgba(20,20,20,0.75); border: 1px solid rgba(255,255,255,0.15);',
            '  color: #fff; border-radius: 8px; padding: 6px 10px; font-size: 12px;',
            '  cursor: pointer; white-space: nowrap;',
            '}',
            '.sb-btn:active { background: rgba(60,60,60,0.9); }',
            '.sb-sync-toggle.sb-independent {',
            '  background: rgba(200,100,0,0.6); border-color: rgba(255,165,0,0.4);',
            '}',
            '.sb-transfer { font-size: 11px; padding: 4px 8px; }',
            '.sb-transfer-list {',
            '  position: fixed; top: 40px; right: 8px;',
            '  background: rgba(20,20,20,0.92); border: 1px solid rgba(255,255,255,0.2);',
            '  border-radius: 8px; padding: 4px 0; min-width: 160px;',
            '  font-size: 13px; color: #fff; z-index: 10002;',
            '}',
            '.sb-transfer-item {',
            '  padding: 8px 14px; cursor: pointer; white-space: nowrap;',
            '}',
            '.sb-transfer-item:active { background: rgba(255,255,255,0.15); }',
            '.sb-transfer-empty { padding: 8px 14px; opacity: 0.5; font-size: 12px; }',
            '.sb-toast {',
            '  position: fixed; top: 50px; right: 8px;',
            '  background: rgba(200,50,50,0.85); color: #fff;',
            '  padding: 8px 14px; border-radius: 8px; font-size: 13px;',
            '  pointer-events: none; transition: opacity 0.3s;',
            '}'
        ].join('');
        document.head.appendChild(sbStyle);
        document.body.appendChild(syncBar);

        var leaderBadge = syncBar.querySelector('.sb-leader-badge');
        var syncToggle = syncBar.querySelector('.sb-sync-toggle');
        var resyncBtn = syncBar.querySelector('.sb-resync');
        var recallBtn = syncBar.querySelector('.sb-recall');
        var transferBtn = syncBar.querySelector('.sb-transfer');
        var transferList = syncBar.querySelector('.sb-transfer-list');
        var toast = syncBar.querySelector('.sb-toast');
        var transferListVisible = false;

        // ─── UI updates ─────────────────────────────────────────────────
        function refreshSyncUI() {
            // Sync toggle
            if (_isIndependent) {
                syncToggle.textContent = '🔓 Independent';
                syncToggle.classList.add('sb-independent');
                resyncBtn.style.display = '';
            } else {
                syncToggle.textContent = '🔗 Synced';
                syncToggle.classList.remove('sb-independent');
                resyncBtn.style.display = 'none';
            }
            // Leader badge + transfer button
            if (_isLeader) {
                leaderBadge.textContent = '⭐ Leader';
                recallBtn.style.display = '';
                transferBtn.style.display = _performers.length > 0 ? '' : 'none';
            } else {
                leaderBadge.textContent = '';
                recallBtn.style.display = 'none';
                transferBtn.style.display = 'none';
                transferList.style.display = 'none';
                transferListVisible = false;
            }
        }

        function showToast(msg, durationMs) {
            toast.textContent = msg;
            toast.style.display = '';
            toast.style.opacity = '1';
            clearTimeout(_toastTimer);
            _toastTimer = setTimeout(function() {
                toast.style.opacity = '0';
                setTimeout(function() { toast.style.display = 'none'; }, 300);
            }, durationMs || 2000);
        }

        // ─── Event handlers ─────────────────────────────────────────────
        syncToggle.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            _isIndependent = !_isIndependent;
            if (_isIndependent) {
                showToast('Independent mode — local controls only', 2000);
            } else {
                // Re-sync with server when returning to synced mode
                var s = getSocket();
                if (s) s.emit('requestState');
                showToast('Re-synced to room', 1500);
            }
            refreshSyncUI();
        });

        resyncBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            _isIndependent = false;
            refreshSyncUI();
            // Request current state from server to re-sync
            var s = getSocket();
            if (s) s.emit('requestState');
            showToast('Re-synced to room', 1500);
        });

        recallBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var s = getSocket();
            if (s) s.emit('recallAll');
        });

        transferBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            transferListVisible = !transferListVisible;
            if (transferListVisible) {
                // Build performer list (exclude self)
                var others = _performers.filter(function(p) { return p.socketId !== _mySocketId; });
                if (others.length === 0) {
                    transferList.innerHTML = '<div class="sb-transfer-empty">No other performers</div>';
                } else {
                    transferList.innerHTML = others.map(function(p) {
                        return '<div class="sb-transfer-item" data-sid="' + p.socketId + '">' +
                            (p.displayName || 'Anonymous') + '</div>';
                    }).join('');
                }
                transferList.style.display = 'block';
            } else {
                transferList.style.display = 'none';
            }
        });

        transferList.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            var item = e.target.closest('.sb-transfer-item');
            if (!item) return;
            var targetSid = item.getAttribute('data-sid');
            if (targetSid) {
                var s = getSocket();
                if (s) s.emit('setLeader', { targetSocketId: targetSid });
                showToast('Leadership transferred', 2000);
            }
            transferList.style.display = 'none';
            transferListVisible = false;
        });

        transferList.addEventListener('pointerdown', function(e) { e.stopPropagation(); });

        // Block pointer events from reaching gesture system
        syncBar.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
        syncBar.addEventListener('pointermove', function(e) { e.stopPropagation(); });

        // ─── Socket event listeners ─────────────────────────────────────
        if (sock) {
            sock.on('leaderChange', function(data) {
                resolveSocketId();
                _leaderId = data.leaderId;
                _isLeader = (_mySocketId && _leaderId === _mySocketId);
                console.log('[SyncMode] Leader changed: ' + _leaderId + ' myId=' + _mySocketId + (_isLeader ? ' (me)' : ''));
                refreshSyncUI();
            });

            // scoreState includes leaderId + roomMembers on initial sync
            sock.on('scoreState', function(data) {
                resolveSocketId();
                if (data.leaderId) {
                    _leaderId = data.leaderId;
                    _isLeader = (_mySocketId && _leaderId === _mySocketId);
                }
                if (data.roomMembers) _performers = data.roomMembers;
                else if (data.connectedPerformers) _performers = data.connectedPerformers;
                refreshSyncUI();
            });

            sock.on('roomMembers', function(data) {
                if (data.roomMembers) _performers = data.roomMembers;
                refreshSyncUI();
            });

            sock.on('playerJoined', function(data) {
                if (data.roomMembers) _performers = data.roomMembers;
                else if (data.connectedPerformers) _performers = data.connectedPerformers;
                refreshSyncUI();
            });

            sock.on('playerLeft', function(data) {
                if (data.roomMembers) _performers = data.roomMembers;
                else if (data.connectedPerformers) _performers = data.connectedPerformers;
                refreshSyncUI();
            });

            sock.on('notLeader', function(data) {
                showToast('Only the leader can ' + (data.action || 'do that'), 2000);
                console.log('[SyncMode] Not leader — action rejected: ' + data.action);
            });

            sock.on('recallAll', function(data) {
                // Force re-sync regardless of independent mode
                _isIndependent = false;
                refreshSyncUI();
                // Request full state to apply server position
                sock.emit('requestState');
                showToast('Leader recalled all — re-synced', 2000);
                console.log('[SyncMode] Recall all — re-synced to ' + data.currentScoreTimeMs + 'ms');
            });
        }

        // ─── Public API ─────────────────────────────────────────────────
        window.SyncMode = {
            get isIndependent() { return _isIndependent; },
            get isLeader() { return _isLeader; },
            set isIndependent(v) { _isIndependent = !!v; refreshSyncUI(); },
            localGoto: localGoto,
            localToggleGoStop: localToggleGoStop,
            showToast: showToast,
            refreshUI: refreshSyncUI
        };

        refreshSyncUI();
        console.log('[SyncMode] Initialized');
    })();

    // ═══ Phase 11 Stage 0: Auto-stop at end of score ═══
    // Reports total score duration to server. Shows "End of Score" indicator on auto-stop.
    (function initAutoStop() {

        // ─── Compute and report score duration ──────────────────────────
        var LEAD_OUT_SECONDS = 4; // silence after last gesture before auto-stop

        function computeScoreDurationMs() {
            var maxEnd = 0;
            if (window.SVGElementManager && SVGElementManager.elements) {
                for (var i = 0; i < SVGElementManager.elements.length; i++) {
                    var el = SVGElementManager.elements[i];
                    var t = (el.referenceSeconds || 0) + (el.offsetSeconds || 0);
                    if (t > maxEnd) maxEnd = t;
                }
            }
            if (window.CurveMaker && CurveMaker.curves) {
                for (var c = 0; c < CurveMaker.curves.length; c++) {
                    var ce = CurveMaker.curves[c].endSeconds || 0;
                    if (ce > maxEnd) maxEnd = ce;
                }
            }
            if (window.LineWedgeMaker && LineWedgeMaker.lineWedges) {
                for (var l = 0; l < LineWedgeMaker.lineWedges.length; l++) {
                    var le = LineWedgeMaker.lineWedges[l].endSeconds || 0;
                    if (le > maxEnd) maxEnd = le;
                }
            }
            if (window.GCMaker && GCMaker.gcs) {
                for (var g = 0; g < GCMaker.gcs.length; g++) {
                    var ge = GCMaker.gcs[g].endSeconds || 0;
                    if (ge > maxEnd) maxEnd = ge;
                }
            }
            if (maxEnd <= 0) return 0;
            // Convert score time → actual time (add leadIn), then add lead-out buffer
            var leadIn = typeof leadInSeconds !== 'undefined' ? leadInSeconds : 0;
            return (maxEnd + leadIn + LEAD_OUT_SECONDS) * 1000;
        }

        function reportDuration() {
            var durationMs = computeScoreDurationMs();
            if (durationMs <= 0) return;
            var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
            if (sock && typeof sock.emit === 'function') {
                sock.emit('reportScoreDuration', { totalDurationMs: durationMs });
                console.log('[AutoStop] Reported score duration: ' + (durationMs / 1000).toFixed(1) + 's');
            }
        }

        // Report after score data loads (retry until data available)
        var _reportAttempts = 0;
        function tryReport() {
            _reportAttempts++;
            var hasData = (window.CurveMaker && CurveMaker.curves && CurveMaker.curves.length > 0) ||
                          (window.GCMaker && GCMaker.gcs && GCMaker.gcs.length > 0);
            if (hasData) {
                reportDuration();
            } else if (_reportAttempts < 20) {
                setTimeout(tryReport, 500);
            }
        }
        setTimeout(tryReport, 1000);

        // ─── End of Score indicator ─────────────────────────────────────
        function showEndOfScoreIndicator() {
            if (document.getElementById('endOfScoreBanner')) return;
            var banner = document.createElement('div');
            banner.id = 'endOfScoreBanner';
            banner.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);padding:20px 40px;background:rgba(0,0,0,0.85);color:#fff;font-family:sans-serif;font-size:20px;text-align:center;z-index:99999;border-radius:8px;pointer-events:none;opacity:0;transition:opacity 0.5s;';
            banner.textContent = 'End of Score';
            document.body.appendChild(banner);
            // Fade in
            requestAnimationFrame(function() { banner.style.opacity = '1'; });
            // Fade out after 5 seconds
            setTimeout(function() {
                banner.style.opacity = '0';
                setTimeout(function() { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 500);
            }, 5000);
        }

        // Wrap CursorControls.onScoreStop to detect end-of-score reason
        function hookScoreStop() {
            if (!window.CursorControls) {
                setTimeout(hookScoreStop, 500);
                return;
            }
            var origStop = CursorControls.onScoreStop.bind(CursorControls);
            CursorControls.onScoreStop = function(data) {
                origStop(data);
                if (data && data.reason === 'end-of-score') {
                    // Stage 7: If in performance mode PLAYING, transition to ceremony
                    if (window.PerformanceMode && PerformanceMode.state === 'PLAYING') {
                        console.log('[AutoStop] End of score in performance — entering CEREMONY');
                        if (PerformanceMode.enterCeremony) PerformanceMode.enterCeremony();
                    } else {
                        showEndOfScoreIndicator();
                    }
                    console.log('[AutoStop] End of score reached');
                }
            };
            console.log('[AutoStop] Hooked onScoreStop for end-of-score detection');
        }
        hookScoreStop();

        console.log('[AutoStop] Initialized');
    })();

    // ═══ Phase 11 Stages 1-2: Performance Mode + Readiness Panel ═══
    // State machine for rehearsal ↔ performance transition.
    // READINESS state shows fullscreen + ready panel.
    // PLAYING/COUNTDOWN/CEREMONY states are locked (all gestures blocked).
    (function initPerformanceMode() {

        var STATES = {
            REHEARSAL: 'REHEARSAL',
            READINESS: 'READINESS',
            COUNTDOWN: 'COUNTDOWN',
            PLAYING: 'PLAYING',
            EMERGENCY_STOP: 'EMERGENCY_STOP',
            CEREMONY: 'CEREMONY'
        };

        var _state = STATES.REHEARSAL;
        var _locked = false;
        var _isFullscreen = false;
        var _isReady = false;
        var _readyCount = 0;
        var _totalCount = 0;
        var _allReady = false;
        var _panel = null;

        // ─── Lockdown helpers ───────────────────────────────────────────
        function applyLockdown() {
            if (window.ControlsOverlay) ControlsOverlay.hide();
            var toolbar = document.getElementById('annotationToolbar');
            if (toolbar) toolbar.style.display = 'none';
            if (window.AnnotationSystem && AnnotationSystem._isAnnotationMode) {
                AnnotationSystem._isAnnotationMode = false;
            }
            var minimap = document.getElementById('miniMap');
            if (minimap) minimap.style.display = 'none';
            var mmHover = document.getElementById('miniMapHoverZone');
            if (mmHover) mmHover.style.display = 'none';
            var syncBar = document.getElementById('syncBar');
            if (syncBar) syncBar.style.display = 'none';
        }

        function releaseLockdown() {
            var toolbar = document.getElementById('annotationToolbar');
            if (toolbar) toolbar.style.display = '';
            var minimap = document.getElementById('miniMap');
            if (minimap) minimap.style.display = '';
            var mmHover = document.getElementById('miniMapHoverZone');
            if (mmHover) mmHover.style.display = '';
            var syncBar = document.getElementById('syncBar');
            if (syncBar) syncBar.style.display = '';
        }

        // ─── State machine ──────────────────────────────────────────────
        function setState(newState) {
            var oldState = _state;
            _state = newState;
            _locked = (newState === STATES.COUNTDOWN ||
                       newState === STATES.PLAYING ||
                       newState === STATES.EMERGENCY_STOP ||
                       newState === STATES.CEREMONY);
            console.log('[PerformanceMode] ' + oldState + ' → ' + newState + (_locked ? ' (LOCKED)' : ''));

            if (_locked) {
                applyLockdown();
                blockNativeGestures();
                requestWakeLock();
                destroyPanel();
            } else if (newState === STATES.READINESS) {
                applyLockdown(); // also lock during readiness (panel is the only UI)
                blockNativeGestures();
                requestWakeLock();
                createPanel();
            } else {
                releaseLockdown();
                unblockNativeGestures();
                releaseWakeLock();
                destroyPanel();
                destroyEmergencyMenu();
                destroyCountdown();
                destroyCeremony();
            }
        }

        // ─── Fullscreen ─────────────────────────────────────────────────
        function requestFullscreen() {
            var el = document.documentElement;
            var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            if (req) {
                req.call(el).then(function() {
                    _isFullscreen = true;
                    updatePanel();
                    console.log('[PerformanceMode] Fullscreen entered');
                }).catch(function(err) {
                    console.warn('[PerformanceMode] Fullscreen failed:', err.message);
                    // Allow proceeding anyway (iOS Safari doesn't support fullscreen)
                    _isFullscreen = true;
                    updatePanel();
                });
            } else {
                // No fullscreen API (iOS Safari) — allow proceeding
                _isFullscreen = true;
                updatePanel();
                console.log('[PerformanceMode] Fullscreen API not available — skipping');
            }
        }

        function checkFullscreen() {
            return !!(document.fullscreenElement || document.webkitFullscreenElement);
        }

        // Listen for fullscreen changes (user may exit via Esc)
        document.addEventListener('fullscreenchange', function() {
            if (_state === STATES.READINESS) {
                _isFullscreen = checkFullscreen();
                if (!_isFullscreen && _isReady) {
                    // Exited fullscreen while ready — unready
                    _isReady = false;
                    var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
                    if (sock) sock.emit('performerUnready');
                }
                updatePanel();
            }
        });

        // ─── Readiness panel ────────────────────────────────────────────
        function createPanel() {
            if (_panel) return;
            _panel = document.createElement('div');
            _panel.id = 'perfReadinessPanel';
            _panel.innerHTML = [
                '<div class="prp-content">',
                '  <h1 class="prp-title">Performance Mode</h1>',
                '  <div class="prp-status-box">',
                '    <div class="prp-step prp-step-fs">',
                '      <span class="prp-icon">⬜</span>',
                '      <button class="prp-btn prp-fs-btn">Go Fullscreen</button>',
                '    </div>',
                '    <div class="prp-step prp-step-ready">',
                '      <span class="prp-icon">⬜</span>',
                '      <button class="prp-btn prp-ready-btn" disabled>Ready</button>',
                '    </div>',
                '  </div>',
                '  <div class="prp-readiness-list"></div>',
                '  <div class="prp-leader-section" style="display:none">',
                '    <button class="prp-btn prp-begin-btn" disabled>Begin Performance</button>',
                '  </div>',
                '  <button class="prp-btn prp-back-btn">← Back to Rehearsal</button>',
                '</div>'
            ].join('\\n');

            var style = document.createElement('style');
            style.id = 'perfReadinessPanelStyle';
            style.textContent = [
                '#perfReadinessPanel {',
                '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
                '  background: rgba(0,0,0,0.95); z-index: 100000;',
                '  display: flex; align-items: center; justify-content: center;',
                '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
                '  color: #fff; user-select: none; -webkit-user-select: none;',
                '}',
                '.prp-content { text-align: center; max-width: 400px; padding: 30px; }',
                '.prp-title { font-size: 28px; font-weight: 300; margin: 0 0 30px; letter-spacing: 1px; }',
                '.prp-status-box { margin: 0 0 30px; }',
                '.prp-step { display: flex; align-items: center; gap: 12px; margin: 12px 0; justify-content: center; }',
                '.prp-icon { font-size: 20px; width: 28px; text-align: center; }',
                '.prp-btn {',
                '  padding: 10px 24px; border: 1px solid rgba(255,255,255,0.3);',
                '  border-radius: 6px; background: transparent; color: #fff;',
                '  font-size: 16px; cursor: pointer; transition: all 0.2s;',
                '}',
                '.prp-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); }',
                '.prp-btn:disabled { opacity: 0.3; cursor: default; }',
                '.prp-fs-btn.prp-done { border-color: #00934c; color: #00934c; }',
                '.prp-ready-btn.prp-active {',
                '  background: rgba(0,147,76,0.3); border-color: #00934c; color: #00ffaa;',
                '}',
                '.prp-begin-btn {',
                '  padding: 14px 36px; font-size: 18px; font-weight: 600;',
                '  border-color: rgba(255,215,0,0.5); color: #ffd700;',
                '}',
                '.prp-begin-btn:hover:not(:disabled) { background: rgba(255,215,0,0.15); }',
                '.prp-readiness-list {',
                '  margin: 20px 0; padding: 12px; border-radius: 8px;',
                '  background: rgba(255,255,255,0.05); min-height: 40px;',
                '  font-size: 14px; color: rgba(255,255,255,0.6);',
                '}',
                '.prp-readiness-list .prp-ready-dot {',
                '  display: inline-block; width: 8px; height: 8px; border-radius: 50%;',
                '  margin-right: 6px; vertical-align: middle;',
                '}',
                '.prp-readiness-list .prp-performer { margin: 4px 0; }',
                '.prp-back-btn { margin-top: 20px; font-size: 13px; opacity: 0.5; border: none; }',
                '.prp-back-btn:hover { opacity: 0.8; }'
            ].join('\\n');
            document.head.appendChild(style);
            document.body.appendChild(_panel);

            // Wire up buttons
            var fsBtn = _panel.querySelector('.prp-fs-btn');
            var readyBtn = _panel.querySelector('.prp-ready-btn');
            var beginBtn = _panel.querySelector('.prp-begin-btn');
            var backBtn = _panel.querySelector('.prp-back-btn');

            fsBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                requestFullscreen();
            });

            readyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!_isFullscreen) return;
                _isReady = !_isReady;
                var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
                if (sock) {
                    sock.emit(_isReady ? 'performerReady' : 'performerUnready');
                }
                updatePanel();
            });

            beginBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (!_allReady) return;
                var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
                if (sock) sock.emit('performanceStart');
            });

            backBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                _isReady = false;
                var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
                if (sock) {
                    sock.emit('performerUnready');
                    sock.emit('exitReadiness');
                }
                // Exit fullscreen if active
                if (document.exitFullscreen) document.exitFullscreen();
                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                setState(STATES.REHEARSAL);
            });

            updatePanel();

            // Tell server we're in performance mode
            var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
            if (sock) sock.emit('enterReadiness');

            console.log('[PerformanceMode] Readiness panel created');
        }

        function updatePanel() {
            if (!_panel) return;
            // Fullscreen step
            var fsIcon = _panel.querySelector('.prp-step-fs .prp-icon');
            var fsBtn = _panel.querySelector('.prp-fs-btn');
            if (_isFullscreen) {
                fsIcon.textContent = '✅';
                fsBtn.textContent = 'Fullscreen ✓';
                fsBtn.classList.add('prp-done');
                fsBtn.disabled = true;
            } else {
                fsIcon.textContent = '⬜';
                fsBtn.textContent = 'Go Fullscreen';
                fsBtn.classList.remove('prp-done');
                fsBtn.disabled = false;
            }
            // Ready step
            var readyIcon = _panel.querySelector('.prp-step-ready .prp-icon');
            var readyBtn = _panel.querySelector('.prp-ready-btn');
            readyBtn.disabled = !_isFullscreen;
            if (_isReady) {
                readyIcon.textContent = '✅';
                readyBtn.textContent = 'Ready ✓';
                readyBtn.classList.add('prp-active');
            } else {
                readyIcon.textContent = '⬜';
                readyBtn.textContent = 'Ready';
                readyBtn.classList.remove('prp-active');
            }
            // Readiness list
            var listEl = _panel.querySelector('.prp-readiness-list');
            if (_totalCount > 0) {
                listEl.textContent = _readyCount + ' of ' + _totalCount + ' performers ready';
            } else {
                listEl.textContent = 'Waiting for connection...';
            }
            // Leader section
            var leaderSection = _panel.querySelector('.prp-leader-section');
            var beginBtn = _panel.querySelector('.prp-begin-btn');
            var isLeader = window.SyncMode && SyncMode.isLeader;
            leaderSection.style.display = isLeader ? '' : 'none';
            beginBtn.disabled = !_allReady;
        }

        function destroyPanel() {
            if (_panel && _panel.parentNode) {
                _panel.parentNode.removeChild(_panel);
            }
            _panel = null;
            var style = document.getElementById('perfReadinessPanelStyle');
            if (style && style.parentNode) style.parentNode.removeChild(style);
        }

        // ─── Countdown overlay ──────────────────────────────────────────
        var _countdownEl = null;

        function showCountdown(seconds) {
            // Create countdown overlay
            _countdownEl = document.createElement('div');
            _countdownEl.id = 'perfCountdown';
            _countdownEl.style.cssText = [
                'position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
                'background: rgba(0,0,0,0.85); z-index: 100001;',
                'display: flex; align-items: center; justify-content: center;',
                'font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
                'color: #fff; user-select: none; -webkit-user-select: none;'
            ].join(' ');

            var numEl = document.createElement('div');
            numEl.style.cssText = [
                'font-size: 120px; font-weight: 200; letter-spacing: -4px;',
                'transition: opacity 0.3s ease, transform 0.3s ease;'
            ].join(' ');
            numEl.textContent = seconds;
            _countdownEl.appendChild(numEl);
            document.body.appendChild(_countdownEl);

            var remaining = seconds;
            var interval = setInterval(function() {
                remaining--;
                if (remaining > 0) {
                    numEl.style.opacity = '0';
                    numEl.style.transform = 'scale(0.8)';
                    setTimeout(function() {
                        numEl.textContent = remaining;
                        numEl.style.opacity = '1';
                        numEl.style.transform = 'scale(1)';
                    }, 150);
                } else {
                    clearInterval(interval);
                    numEl.style.opacity = '0';
                    numEl.style.transform = 'scale(1.5)';
                    // scoreGo from server will transition us to PLAYING
                    // Keep overlay briefly to cover any network delay
                    setTimeout(function() {
                        destroyCountdown();
                    }, 1500);
                }
            }, 1000);

            console.log('[PerformanceMode] Countdown: ' + seconds);
        }

        function destroyCountdown() {
            if (_countdownEl && _countdownEl.parentNode) {
                _countdownEl.parentNode.removeChild(_countdownEl);
            }
            _countdownEl = null;
        }

        // ─── Stage 6: Wake Lock ─────────────────────────────────────────
        var _wakeLock = null;

        function requestWakeLock() {
            if (_wakeLock) return; // already held
            if (!('wakeLock' in navigator)) {
                console.log('[PerformanceMode] Wake Lock API not supported');
                return;
            }
            navigator.wakeLock.request('screen').then(function(lock) {
                _wakeLock = lock;
                _wakeLock.addEventListener('release', function() {
                    console.log('[PerformanceMode] Wake lock released');
                    _wakeLock = null;
                });
                console.log('[PerformanceMode] Wake lock acquired — screen will stay on');
            }).catch(function(err) {
                console.warn('[PerformanceMode] Wake lock failed:', err.message);
            });
        }

        function releaseWakeLock() {
            if (_wakeLock) {
                _wakeLock.release();
                _wakeLock = null;
            }
        }

        // Re-acquire wake lock when tab becomes visible again (browser releases on hide)
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'visible' && _state !== STATES.REHEARSAL) {
                requestWakeLock();
            }
        });

        // ─── Stage 4: Native gesture suppression ─────────────────────────
        var _gestureBlocker = null;
        var _contextMenuBlocker = null;
        function blockNativeGestures() {
            if (_gestureBlocker) return;
            // CSS: prevent touch-action, overscroll, selection
            var style = document.createElement('style');
            style.id = 'perfGestureBlock';
            style.textContent = [
                'html, body {',
                '  touch-action: none !important;',
                '  overscroll-behavior: none !important;',
                '  -webkit-overflow-scrolling: auto !important;',
                '  -webkit-user-select: none !important;',
                '  user-select: none !important;',
                '}'
            ].join('\\n');
            document.head.appendChild(style);
            // Block touchmove (prevents pull-to-refresh, Safari swipe nav, pinch zoom)
            _gestureBlocker = function(e) { e.preventDefault(); };
            document.addEventListener('touchmove', _gestureBlocker, { passive: false });
            // Block context menu (long-press right-click)
            _contextMenuBlocker = function(e) { e.preventDefault(); };
            document.addEventListener('contextmenu', _contextMenuBlocker);
            // Update viewport meta
            var vp = document.querySelector('meta[name="viewport"]');
            if (vp) {
                vp._origContent = vp.content;
                vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
            }
            console.log('[PerformanceMode] Native gestures blocked');
        }

        function unblockNativeGestures() {
            var style = document.getElementById('perfGestureBlock');
            if (style && style.parentNode) style.parentNode.removeChild(style);
            if (_gestureBlocker) {
                document.removeEventListener('touchmove', _gestureBlocker);
                _gestureBlocker = null;
            }
            if (_contextMenuBlocker) {
                document.removeEventListener('contextmenu', _contextMenuBlocker);
                _contextMenuBlocker = null;
            }
            var vp = document.querySelector('meta[name="viewport"]');
            if (vp && vp._origContent) {
                vp.content = vp._origContent;
                delete vp._origContent;
            }
            console.log('[PerformanceMode] Native gestures unblocked');
        }

        // ─── Stage 4: Emergency menu (3-finger) ─────────────────────────
        var _emergencyEl = null;

        function showEmergencyMenu() {
            if (_emergencyEl) return;
            console.log('[PerformanceMode] Emergency menu triggered (3-finger)');

            _emergencyEl = document.createElement('div');
            _emergencyEl.id = 'perfEmergency';
            _emergencyEl.innerHTML = [
                '<div class="pe-content">',
                '  <h2 class="pe-title">⚠ Emergency Menu</h2>',
                '  <button class="pe-btn pe-stop">Stop Performance</button>',
                '  <button class="pe-btn pe-resume">Resume</button>',
                '</div>'
            ].join('\\n');

            var style = document.createElement('style');
            style.id = 'perfEmergencyStyle';
            style.textContent = [
                '#perfEmergency {',
                '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
                '  background: rgba(0,0,0,0.9); z-index: 100002;',
                '  display: flex; align-items: center; justify-content: center;',
                '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
                '  color: #fff; user-select: none; -webkit-user-select: none;',
                '}',
                '.pe-content { text-align: center; }',
                '.pe-title { font-size: 22px; font-weight: 400; margin: 0 0 30px; }',
                '.pe-btn {',
                '  display: block; width: 220px; margin: 12px auto; padding: 14px 24px;',
                '  border-radius: 8px; font-size: 16px; cursor: pointer;',
                '  border: none; transition: all 0.2s;',
                '}',
                '.pe-stop {',
                '  background: rgba(200,40,40,0.8); color: #fff;',
                '}',
                '.pe-stop:hover { background: rgba(220,50,50,0.95); }',
                '.pe-resume {',
                '  background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7);',
                '  border: 1px solid rgba(255,255,255,0.2);',
                '}',
                '.pe-resume:hover { background: rgba(255,255,255,0.2); }'
            ].join('\\n');
            document.head.appendChild(style);
            document.body.appendChild(_emergencyEl);

            _emergencyEl.querySelector('.pe-stop').addEventListener('click', function(e) {
                e.stopPropagation();
                destroyEmergencyMenu();
                // Exit performance mode locally (any performer can do this)
                // Leader also stops playback for everyone
                var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
                if (sock && window.SyncMode && SyncMode.isLeader) {
                    sock.emit('scoreStop');
                    sock.emit('performanceEnd');
                }
                exitPerformanceMode();
            });

            _emergencyEl.querySelector('.pe-resume').addEventListener('click', function(e) {
                e.stopPropagation();
                destroyEmergencyMenu();
            });
        }

        function destroyEmergencyMenu() {
            if (_emergencyEl && _emergencyEl.parentNode) {
                _emergencyEl.parentNode.removeChild(_emergencyEl);
            }
            _emergencyEl = null;
            var style = document.getElementById('perfEmergencyStyle');
            if (style && style.parentNode) style.parentNode.removeChild(style);
        }

        // ─── Stage 7: End-of-performance ceremony ─────────────────────────
        var _ceremonyEl = null;

        function showCeremony() {
            if (_ceremonyEl) return;
            _ceremonyEl = document.createElement('div');
            _ceremonyEl.innerHTML = [
                '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:100000;',
                'display:flex;flex-direction:column;align-items:center;justify-content:center;',
                'font-family:sans-serif;color:#fff;text-align:center;">',
                '  <div style="font-size:14px;letter-spacing:3px;text-transform:uppercase;',
                '    opacity:0.5;margin-bottom:12px;">Performance Complete</div>',
                '  <div style="font-size:48px;font-weight:200;margin-bottom:40px;',
                '    opacity:0;animation:ceremonyFadeIn 1.5s ease forwards;">&#10003;</div>',
                '  <button class="pc-exit" style="margin-top:20px;padding:14px 36px;',
                '    font-size:16px;border:none;border-radius:6px;cursor:pointer;',
                '    background:rgba(255,255,255,0.12);color:rgba(255,255,255,0.7);',
                '    border:1px solid rgba(255,255,255,0.2);transition:background 0.2s;">',
                '    Return to Rehearsal</button>',
                '</div>'
            ].join('');
            var style = document.createElement('style');
            style.id = 'perfCeremonyStyle';
            style.textContent = '@keyframes ceremonyFadeIn { from { opacity:0; transform:scale(0.5); } to { opacity:1; transform:scale(1); } } .pc-exit:hover { background:rgba(255,255,255,0.25) !important; }';
            document.head.appendChild(style);
            document.body.appendChild(_ceremonyEl);

            _ceremonyEl.querySelector('.pc-exit').addEventListener('click', function(e) {
                e.stopPropagation();
                destroyCeremony();
                exitPerformanceMode();
            });
        }

        function destroyCeremony() {
            if (_ceremonyEl && _ceremonyEl.parentNode) {
                _ceremonyEl.parentNode.removeChild(_ceremonyEl);
            }
            _ceremonyEl = null;
            var style = document.getElementById('perfCeremonyStyle');
            if (style && style.parentNode) style.parentNode.removeChild(style);
        }

        function enterCeremony() {
            setState(STATES.CEREMONY);
            showCeremony();
        }

        // ─── Socket event hooks ─────────────────────────────────────────
        function hookSocketEvents() {
            var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
            if (!sock) {
                setTimeout(hookSocketEvents, 500);
                return;
            }

            // Stage 5: Tab recovery — if room is in performance mode, auto-rejoin
            sock.on('scoreState', function(data) {
                if (!startInPerfMode) return; // only for ?mode=performance clients
                if (data && data.mode === 'performance' && _state === STATES.REHEARSAL) {
                    console.log('[PerformanceMode] Tab recovery — room is in performance mode, auto-entering PLAYING');
                    _isFullscreen = checkFullscreen();
                    setState(STATES.PLAYING);
                }
            });

            sock.on('readinessUpdate', function(data) {
                _readyCount = data.readyCount || 0;
                _totalCount = data.totalCount || 0;
                _allReady = !!data.allReady;
                updatePanel();
            });

            sock.on('scoreGo', function() {
                if (_state === STATES.COUNTDOWN) {
                    console.log('[PerformanceMode] scoreGo received — entering PLAYING');
                    destroyCountdown();
                    setState(STATES.PLAYING);
                }
            });

            sock.on('performanceStart', function(data) {
                console.log('[PerformanceMode] Countdown started');
                _isReady = false;
                destroyPanel();
                setState(STATES.COUNTDOWN);
                showCountdown(data && data.countdownSeconds ? data.countdownSeconds : 3);
            });

            sock.on('performanceEnd', function() {
                console.log('[PerformanceMode] Performance ended by leader');
                _isReady = false;
                _isFullscreen = false;
                setState(STATES.REHEARSAL);
            });

            console.log('[PerformanceMode] Socket events hooked');
        }
        hookSocketEvents();

        // ─── Public API ─────────────────────────────────────────────────
        function enterPerformanceMode() {
            if (_state !== STATES.REHEARSAL) return;
            setState(STATES.READINESS);
        }

        function exitPerformanceMode() {
            _isReady = false;
            _isFullscreen = false;
            var sock = (window.ClockSync && ClockSync.socket) ? ClockSync.socket : null;
            if (sock) {
                sock.emit('performerUnready');
                sock.emit('exitReadiness');
            }
            if (document.exitFullscreen) document.exitFullscreen();
            else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
            setState(STATES.REHEARSAL);
        }

        // ─── URL param detection ────────────────────────────────────────
        var urlParams = new URLSearchParams(window.location.search);
        var startInPerfMode = urlParams.get('mode') === 'performance';

        window.PerformanceMode = {
            get state() { return _state; },
            get locked() { return _locked; },
            STATES: STATES,
            enter: enterPerformanceMode,
            exit: exitPerformanceMode,
            setState: setState,
            showEmergencyMenu: showEmergencyMenu,
            enterCeremony: enterCeremony
        };

        if (startInPerfMode) {
            setTimeout(function() { enterPerformanceMode(); }, 500);
        }

        console.log('[PerformanceMode] Initialized' + (startInPerfMode ? ' — will enter readiness' : ''));
    })();

    // ═══ Phase 12: URL goto param — restore position after view toggle ═══
    // Uses event-based timing: listens for the initial scoreState/scoreGoto
    // event (fired after score loads), then emits scoreGoto through the socket
    // to override position. Using socket.emit (not localGoto) is critical —
    // it updates the stub's internal _scoreTimeMs so subsequent Play starts
    // from the correct position.
    (function initGotoParam() {
        var params = new URLSearchParams(window.location.search);
        var gotoSec = parseFloat(params.get('goto'));
        if (isNaN(gotoSec) || gotoSec <= 0) return;

        console.log('[GotoParam] Will navigate to ' + gotoSec.toFixed(2) + 's after score loads');

        var fired = false;
        function doGoto() {
            if (fired) return;
            fired = true;
            // Small delay to let all handlers for the initial event finish
            setTimeout(function() {
                if (window.ClockSync && ClockSync.socket) {
                    ClockSync.socket.emit('scoreGoto', { seconds: gotoSec });
                }
                if (window.ControlsOverlay) ControlsOverlay.refresh();
                console.log('[GotoParam] Navigated to ' + gotoSec.toFixed(2) + 's');

                // Clean the goto param from URL without reload
                params.delete('goto');
                var cleanSearch = params.toString();
                var cleanUrl = window.location.pathname + (cleanSearch ? '?' + cleanSearch : '');
                window.history.replaceState(null, '', cleanUrl);
            }, 150);
        }

        // Poll for socket availability, then attach one-shot listeners.
        // Stub fires 'scoreState' ~200ms after distributeData().
        // Real server responds to requestState with 'scoreGoto'.
        var attempts = 0;
        var maxAttempts = 300; // 15 seconds at 50ms intervals
        var poll = setInterval(function() {
            attempts++;
            if (window.ClockSync && ClockSync.socket && ClockSync.socket.on) {
                clearInterval(poll);
                ClockSync.socket.on('scoreState', doGoto);
                ClockSync.socket.on('scoreGoto', doGoto);
            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
                console.warn('[GotoParam] Timed out waiting for socket');
            }
        }, 50);
    })();
    `;

    // Inject before the closing </script> tag (last occurrence)
    var lastScriptClose = html.lastIndexOf('</script>');
    if (lastScriptClose !== -1) {
        html = html.substring(0, lastScriptClose) + runtimeCode + '\n    ' + html.substring(lastScriptClose);
        console.log('  ✓ Rehearsal gesture system injected');
    } else {
        console.error('  ✗ Rehearsal gestures: could not find </script> injection point');
    }

    return html;
};
