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

                // Evaluate gesture only for single-pointer (non-pinch) interactions
                if (p && this.pointerCount === 1 && !this.isPinching && !this.wasPinching) {
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
                    this.prevPage();
                } else if (xRatio > (1 - this.EDGE_ZONE)) {
                    // Right edge tap → next page (immediate, no double-tap conflict)
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
                // During playback, ignore swipe (until Stage 5 adds independent mode)
                if (window.ScoreTime && ScoreTime.isPlaying) return;

                if (direction === 'left') {
                    this.nextPage();
                } else {
                    this.prevPage();
                }
            },

            onLongPress: function(p) {
                // Stage 3: context menu (marker creation, loop start/end)
                console.log('[RehearsalGestures] Long press at (' +
                    Math.round(p.startX) + ', ' + Math.round(p.startY) + ')');
            },

            togglePlayPause: function() {
                if (window.CursorControls && CursorControls.toggleGoStop) {
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
                    var pos = window.StaffCursors ? StaffCursors.getPosition(0) : null;
                    return pos ? (pos.page || 0) : 0;
                }
                // Full score: top page (even number) is the reference
                return window.GraphicTimeline ? GraphicTimeline.currentTopPage : 0;
            },

            getPageStep: function() {
                // Full score shows 2 pages (top+bottom), parts mode 1 page per section
                return (window.PartsMode && PartsMode.active) ? 1 : 2;
            },

            nextPage: function() {
                if (!window.GraphicTimeline) return;
                var current = this.getCurrentPage();
                var step = this.getPageStep();
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var targetSeconds = (current + step) * secondsPerPage;
                GraphicTimeline.onGoto(targetSeconds);
                console.log('[RehearsalGestures] Next page → page ' + (current + step));
            },

            prevPage: function() {
                if (!window.GraphicTimeline) return;
                var current = this.getCurrentPage();
                var step = this.getPageStep();
                var newPage = Math.max(0, current - step);
                var secondsPerPage = GraphicTimeline.getSecondsPerPage();
                var targetSeconds = newPage * secondsPerPage;
                GraphicTimeline.onGoto(targetSeconds);
                console.log('[RehearsalGestures] Prev page → page ' + newPage);
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
        var scoreTop = document.getElementById('ScoreTop');
        var scoreBottom = document.getElementById('ScoreBottom');
        if (!scoreTop || !scoreBottom) {
            console.error('InteractionBlocker: ScoreTop/ScoreBottom not found');
            return;
        }

        var blockedMouseEvents = ['mousedown', 'click', 'dblclick'];

        function blockEvent(e) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }

        // Capturing phase (3rd arg = true) fires BEFORE all other listeners
        blockedMouseEvents.forEach(function(type) {
            scoreTop.addEventListener(type, blockEvent, true);
            scoreBottom.addEventListener(type, blockEvent, true);
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

        console.log('InteractionBlocker: all Workshop mouse/keyboard interaction disabled');
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
            '  position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);',
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
            '.co-zoom { font-size: 13px; opacity: 0.9; }'
        ].join('');
        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // ─── Overlay controller ──────────────────────────────────────────
        var FADE_DELAY = 3000;
        var fadeTimer = null;
        var isVisible = false;

        var panel = overlay.querySelector('.co-panel');
        var playBtn = overlay.querySelector('.co-play');
        var prevBtn = overlay.querySelector('.co-prev');
        var nextBtn = overlay.querySelector('.co-next');
        var zoomBtn = overlay.querySelector('.co-zoom');
        var jumpInput = overlay.querySelector('.co-jump-input');
        var jumpGo = overlay.querySelector('.co-jump-go');
        var pageNum = overlay.querySelector('.co-page-num');
        var pageTotal = overlay.querySelector('.co-page-total');

        function getPageInfo() {
            var current = 0;
            var total = 0;
            if (window.PartsMode && PartsMode.active) {
                var pos = window.StaffCursors ? StaffCursors.getPosition(0) : null;
                current = pos ? (pos.page || 0) : 0;
                total = window.PartsMode ? (PartsMode.pageCount || 0) : 0;
            } else if (window.GraphicTimeline) {
                current = GraphicTimeline.currentTopPage || 0;
                var spp = GraphicTimeline.getSecondsPerPage();
                if (spp > 0) {
                    var totalSeconds = (beatsPerPage * 32) / beatsPerMinute * 60;
                    total = Math.ceil(totalSeconds / spp);
                }
            }
            return { current: current, total: total };
        }

        function refreshState() {
            // Play/Stop
            var playing = window.ScoreTime && ScoreTime.isPlaying;
            playBtn.textContent = playing ? '■ Stop' : '▶ Play';
            playBtn.classList.toggle('co-playing', !!playing);
            // Page
            var info = getPageInfo();
            pageNum.textContent = info.current;
            pageTotal.textContent = info.total;
            // Zoom
            var zoom = (window.ScoreZoom) ? ScoreZoom.zoomLevel : 100;
            zoomBtn.textContent = '⊙ ' + zoom + '%';
            // Jump input: show current display time
            var displaySec = 0;
            if (window.ScoreTime) {
                displaySec = ((ScoreTime.currentScoreTimeMs || 0) / 1000) - (window.leadInSeconds || 0);
            }
            jumpInput.value = Math.max(0, displaySec).toFixed(1);
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
        playBtn.addEventListener('pointerup', function(e) {
            e.stopPropagation();
            if (window.CursorControls) CursorControls.toggleGoStop();
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
            var actualSec = displaySec + (window.leadInSeconds || 0);
            if (window.ClockSync && ClockSync.socket) {
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
            refresh: refreshState
        };

        console.log('ControlsOverlay: initialized (center tap to toggle)');
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
