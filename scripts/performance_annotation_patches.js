/**
 * Performance Annotation Patches — Phase 9: Annotation System
 * 
 * Applied by build_performance_app.js AFTER rehearsal patches (Phase 8).
 * Injects a runtime IIFE that adds annotation capabilities:
 *   - SVG overlay layer per score section (sibling of score SVG, z-index 5)
 *   - Apple Pencil capture (pointerType === 'pen') — always active
 *   - Mouse/finger annotation mode toggle (🖊️ button in ControlsOverlay)
 *   - Coordinate mapping: clientX/Y → section-relative fractions (0-1)
 *   - In-memory annotation data model with page-based storage
 *   - Works in both full score (2 sections) and parts mode (N sections)
 * 
 * Gesture system (Phase 8) already passes pen events through:
 *   RehearsalGestures.onPointerDown: if (e.pointerType === 'pen') return;
 */

'use strict';

module.exports = function applyAnnotationPatches(html) {

    const runtimeCode = `

    // ═══ Phase 9: Annotation System ═══
    (function initAnnotationSystem() {

        // ─── Annotation Data Model ───────────────────────────────────────
        // Annotations stored per page: _annotations[pageNumber] = [ann, ann, ...]
        var AnnotationModel = {
            _annotations: {},   // pageNumber → array of annotation objects
            _nextId: 1,
            _undoStack: [],     // snapshots before each mutation
            _redoStack: [],     // snapshots after undo
            _maxUndo: 50,

            _snapshot: function() {
                return JSON.parse(JSON.stringify({ a: this._annotations, n: this._nextId }));
            },
            _pushUndo: function() {
                this._undoStack.push(this._snapshot());
                if (this._undoStack.length > this._maxUndo) this._undoStack.shift();
                this._redoStack = [];
            },
            undo: function() {
                if (this._undoStack.length === 0) return false;
                this._redoStack.push(this._snapshot());
                var snap = this._undoStack.pop();
                this._annotations = snap.a;
                this._nextId = snap.n;
                this.save();
                return true;
            },
            redo: function() {
                if (this._redoStack.length === 0) return false;
                this._undoStack.push(this._snapshot());
                var snap = this._redoStack.pop();
                this._annotations = snap.a;
                this._nextId = snap.n;
                this.save();
                return true;
            },

            add: function(annotation) {
                this._pushUndo();
                annotation.id = 'ann-' + (this._nextId++);
                annotation.createdAt = Date.now();
                if (!this._annotations[annotation.page]) {
                    this._annotations[annotation.page] = [];
                }
                this._annotations[annotation.page].push(annotation);
                this.save();
                console.log('[Annotation] Added:', annotation.type, 'on page', annotation.page,
                    'at (' + annotation.position.x.toFixed(3) + ', ' + annotation.position.y.toFixed(3) + ')');
                return annotation;
            },

            getForPage: function(page) {
                return this._annotations[page] || [];
            },

            getAll: function() {
                var all = [];
                for (var page in this._annotations) {
                    if (this._annotations.hasOwnProperty(page)) {
                        all = all.concat(this._annotations[page]);
                    }
                }
                return all;
            },

            remove: function(id) {
                for (var page in this._annotations) {
                    if (this._annotations.hasOwnProperty(page)) {
                        var arr = this._annotations[page];
                        for (var i = 0; i < arr.length; i++) {
                            if (arr[i].id === id) {
                                this._pushUndo();
                                arr.splice(i, 1);
                                this.save();
                                console.log('[Annotation] Removed:', id);
                                return true;
                            }
                        }
                    }
                }
                return false;
            },

            clear: function() {
                this._pushUndo();
                this._annotations = {};
                this._nextId = 1;
                this.save();
            },

            toJSON: function() {
                return JSON.parse(JSON.stringify(this._annotations));
            },

            fromJSON: function(data) {
                this._annotations = data || {};
                // Restore nextId from existing annotations
                var maxId = 0;
                for (var page in this._annotations) {
                    if (this._annotations.hasOwnProperty(page)) {
                        var arr = this._annotations[page];
                        for (var i = 0; i < arr.length; i++) {
                            var num = parseInt((arr[i].id || '').replace('ann-', ''), 10);
                            if (num > maxId) maxId = num;
                        }
                    }
                }
                this._nextId = maxId + 1;
            },

            // ─── Persistence (localStorage) ─────────────────────────────
            _storageKey: function() {
                // Separate storage for full score vs each parts track
                var key = 'annotations';
                if (window.PartsMode && PartsMode.active && PartsMode.track != null) {
                    key += '_track' + PartsMode.track;
                } else {
                    key += '_fullscore';
                }
                return key;
            },

            save: function() {
                try {
                    var key = this._storageKey();
                    localStorage.setItem(key, JSON.stringify(this._annotations));
                } catch (e) {
                    console.warn('[Annotation] Save failed:', e.message);
                }
            },

            load: function() {
                try {
                    var key = this._storageKey();
                    var raw = localStorage.getItem(key);
                    if (raw) {
                        this.fromJSON(JSON.parse(raw));
                        var count = this.getAll().length;
                        if (count > 0) {
                            console.log('[Annotation] Loaded ' + count + ' annotations from localStorage (' + key + ')');
                        }
                        return count;
                    }
                } catch (e) {
                    console.warn('[Annotation] Load failed:', e.message);
                }
                return 0;
            }
        };

        // ─── Overlay Manager ─────────────────────────────────────────────
        // Creates and manages one SVG overlay per score section
        var AnnotationOverlay = {
            overlays: [],       // { svg, sectionEl, row, sectionIndex }
            _isAnnotationMode: false,
            _isEraser: false,
            _isStampMode: false,
            _isTextMode: false,
            _annotationsVisible: true,
            _currentStamp: null,
            _activeStroke: null,    // { points: [], overlay, page }
            _currentColor: '#ff0000',
            _currentWidth: 1.5,
            _colors: ['#000000', '#ff0000', '#0066ff', '#00aa44', '#ff8800', '#aa00cc', '#ffffff'],
            _widths: [1.5, 3, 6],
            _stamps: [
                { symbol: '\\u2293', label: 'Down bow', category: 'bow' },
                { symbol: '\\u2228', label: 'Up bow', category: 'bow' },
                { symbol: '>', label: 'Accent', category: 'artic' },
                { symbol: '\\u2022', label: 'Staccato', category: 'artic' },
                { symbol: '\\u2014', label: 'Tenuto', category: 'artic' },
                { symbol: ',', label: 'Breath', category: 'misc' },
                { symbol: 'pppp', label: 'pppp', category: 'dyn', font: 'dyn' },
                { symbol: 'ppp', label: 'ppp', category: 'dyn', font: 'dyn' },
                { symbol: 'pp', label: 'pp', category: 'dyn', font: 'dyn' },
                { symbol: 'p', label: 'p', category: 'dyn', font: 'dyn' },
                { symbol: 'mp', label: 'mp', category: 'dyn', font: 'dyn' },
                { symbol: 'mf', label: 'mf', category: 'dyn', font: 'dyn' },
                { symbol: 'f', label: 'f', category: 'dyn', font: 'dyn' },
                { symbol: 'ff', label: 'ff', category: 'dyn', font: 'dyn' },
                { symbol: 'fff', label: 'fff', category: 'dyn', font: 'dyn' },
                { symbol: 'ffff', label: 'ffff', category: 'dyn', font: 'dyn' },
                { symbol: 'sfz', label: 'sfz', category: 'dyn', font: 'dyn' },
                { symbol: 'fp', label: 'fp', category: 'dyn', font: 'dyn' },
                { symbol: '\\u2713', label: 'Check', category: 'mark' },
                { symbol: '\\u2717', label: 'X mark', category: 'mark' },
                { symbol: '!', label: 'Attention', category: 'mark' },
                { symbol: '\\u2605', label: 'Star', category: 'mark' },
                { symbol: '\\u2192', label: 'Arrow R', category: 'misc' },
                { symbol: '\\u2190', label: 'Arrow L', category: 'misc' }
            ],

            init: function() {
                var sections = this._getSections();
                if (sections.length === 0) {
                    console.error('[Annotation] No score sections found');
                    return;
                }

                for (var i = 0; i < sections.length; i++) {
                    var sec = sections[i];
                    var svg = this._createOverlaySVG(sec.el);
                    sec.row.appendChild(svg);
                    this.overlays.push({
                        svg: svg,
                        sectionEl: sec.el,
                        row: sec.row,
                        sectionIndex: i
                    });
                }

                // Listen for pointer events on ScoreContainer in CAPTURING phase.
                // This fires BEFORE the gesture system (which uses bubbling phase).
                // When annotation mode is active, we stopImmediatePropagation to
                // suppress gesture handlers (tap-to-play, swipe, overlay toggle).
                var container = document.getElementById('ScoreContainer');
                if (container) {
                    var self = this;
                    container.addEventListener('pointerdown', function(e) { self._onPointerDown(e); }, true);
                    container.addEventListener('pointermove', function(e) { self._onPointerMove(e); }, true);
                    container.addEventListener('pointerup', function(e) { self._onPointerUp(e); }, true);
                    container.addEventListener('pointercancel', function(e) { self._onPointerUp(e); }, true);
                }

                // Resize observer: keep overlays matched to section dimensions
                var self = this;
                window.addEventListener('resize', function() { self._resizeOverlays(); });

                this._addAnnotationToggle();

                console.log('[Annotation] Overlay initialized — ' + this.overlays.length + ' sections');
            },

            _getSections: function() {
                var sections = [];
                if (window.PartsMode && PartsMode.active && PartsMode.sections) {
                    for (var i = 0; i < PartsMode.sections.length; i++) {
                        var s = PartsMode.sections[i];
                        if (s.el && s.row) sections.push({ el: s.el, row: s.row });
                    }
                } else {
                    var scoreTop = document.getElementById('ScoreTop');
                    var scoreBottom = document.getElementById('ScoreBottom');
                    if (scoreTop) sections.push({ el: scoreTop, row: scoreTop.parentElement });
                    if (scoreBottom) sections.push({ el: scoreBottom, row: scoreBottom.parentElement });
                }
                return sections;
            },

            _createOverlaySVG: function(sectionEl) {
                var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('class', 'annotation-layer');
                svg.style.cssText = [
                    'position: absolute',
                    'top: 0',
                    'left: 0',
                    'width: 100%',
                    'height: 100%',
                    'z-index: 5',
                    'pointer-events: none',
                    'overflow: hidden'
                ].join('; ') + ';';

                // Set viewBox to 0 0 1000 1000 — we'll map fractions to this
                // This means fraction 0.5 → coordinate 500 in the SVG
                svg.setAttribute('viewBox', '0 0 1000 1000');
                svg.setAttribute('preserveAspectRatio', 'none');

                return svg;
            },

            _resizeOverlays: function() {
                // Overlays are 100% width/height via CSS — just ensure viewBox is consistent
                // No pixel-based sizing needed since we use fraction-based viewBox
                for (var i = 0; i < this.overlays.length; i++) {
                    var ov = this.overlays[i];
                    // Ensure overlay dimensions match section
                    var rect = ov.sectionEl.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        ov.svg.style.width = rect.width + 'px';
                        ov.svg.style.height = rect.height + 'px';
                    }
                }
            },

            // ─── Pointer event handlers ──────────────────────────────────
            _onPointerDown: function(e) {
                // Phase 11: Block all annotation input in performance mode
                if (window.PerformanceMode && PerformanceMode.locked) return;
                // Pen is always captured for annotation
                var isPen = (e.pointerType === 'pen');
                // Mouse/touch only captured when annotation mode is active
                var isMouseAnnotation = this._isAnnotationMode && (e.pointerType === 'mouse' || e.pointerType === 'touch');

                if (!isPen && !isMouseAnnotation) return;

                // Find which overlay/section this event is over
                var target = this._findOverlayAtPoint(e.clientX, e.clientY);
                if (!target) return;

                // Block gesture system: stop event from reaching rehearsal gesture handlers
                e.preventDefault();
                e.stopImmediatePropagation();

                // Eraser mode: erase annotation at point
                if (this._isEraser) {
                    this._eraseAtPoint(e.clientX, e.clientY, target);
                    return;
                }

                // Get fractional coordinates
                var pos = this._clientToFraction(e.clientX, e.clientY, target);

                // Determine which page this section is showing
                var page = this._getPageForSection(target.sectionIndex);

                // Text mode: show floating input at tap point
                if (this._isTextMode) {
                    this._showTextInput(e.clientX, e.clientY, pos, page, target);
                    return;
                }

                // Stamp mode: place stamp on tap
                if (this._isStampMode && this._currentStamp) {
                    // Base sizes 40/60/80 (S/M/L) are tuned for full score sections.
                    // In parts mode, sections are smaller so scale up to maintain
                    // consistent visual size. Reference: full score ~350px sections.
                    var baseSize = this._currentWidth < 3 ? 40 : (this._currentWidth < 6 ? 60 : 80);
                    var scaledSize = baseSize;
                    if (window.PartsMode && PartsMode.active) {
                        var sectionRect = target.sectionEl.getBoundingClientRect();
                        scaledSize = Math.round(baseSize * 350 / Math.max(50, sectionRect.height));
                        scaledSize = Math.max(baseSize, Math.min(250, scaledSize));
                    }
                    var stamp = {
                        type: 'stamp',
                        page: page,
                        position: pos,
                        data: {
                            symbol: this._currentStamp.symbol,
                            label: this._currentStamp.label,
                            color: this._currentColor,
                            size: scaledSize,
                            font: this._currentStamp.font || null
                        }
                    };
                    AnnotationModel.add(stamp);
                    this._renderAnnotation(stamp, target);
                    return;
                }

                this._activeStroke = {
                    points: [pos],
                    overlay: target,
                    page: page,
                    color: this._currentColor,
                    width: this._currentWidth
                };

                console.log('[Annotation] Stroke start — section ' + target.sectionIndex +
                    ', page ' + page + ', pos (' + pos.x.toFixed(3) + ', ' + pos.y.toFixed(3) + ')' +
                    ', pointerType: ' + e.pointerType);
            },

            _onPointerMove: function(e) {
                var isPen = (e.pointerType === 'pen');
                var isMouseAnnotation = this._isAnnotationMode && (e.pointerType === 'mouse' || e.pointerType === 'touch');
                if (!isPen && !isMouseAnnotation) return;

                // Eraser drag: erase as pointer moves
                if (this._isEraser) {
                    var target = this._findOverlayAtPoint(e.clientX, e.clientY);
                    if (target) {
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        this._eraseAtPoint(e.clientX, e.clientY, target);
                    }
                    return;
                }

                if (!this._activeStroke) return;
                e.preventDefault();
                e.stopImmediatePropagation();

                var pos = this._clientToFraction(e.clientX, e.clientY, this._activeStroke.overlay);
                this._activeStroke.points.push(pos);

                // Live preview: render current stroke
                this._renderLiveStroke();
            },

            _onPointerUp: function(e) {
                var isPen = (e.pointerType === 'pen');
                var isMouseAnnotation = this._isAnnotationMode && (e.pointerType === 'mouse' || e.pointerType === 'touch');

                // Suppress gesture system on up too (prevent tap-to-play etc.)
                if ((isPen || isMouseAnnotation) && (this._activeStroke || this._isEraser)) {
                    e.stopImmediatePropagation();
                }

                if (!this._activeStroke) return;
                if (!isPen && !isMouseAnnotation) return;

                // Remove live preview
                this._clearLiveStroke();

                // Only save strokes with enough points
                if (this._activeStroke.points.length >= 2) {
                    // Sample points to reduce data size (every 3rd point, always keep first and last)
                    var sampled = this._samplePoints(this._activeStroke.points, 3);

                    var annotation = {
                        type: 'freehand',
                        page: this._activeStroke.page,
                        position: {
                            x: sampled[0].x,
                            y: sampled[0].y
                        },
                        data: {
                            paths: [{
                                points: sampled,
                                color: this._activeStroke.color,
                                width: this._activeStroke.width
                            }]
                        }
                    };

                    AnnotationModel.add(annotation);

                    // Render the completed annotation
                    this._renderAnnotation(annotation, this._activeStroke.overlay);
                }

                this._activeStroke = null;
            },

            // ─── Coordinate mapping ──────────────────────────────────────
            _findOverlayAtPoint: function(clientX, clientY) {
                for (var i = 0; i < this.overlays.length; i++) {
                    var ov = this.overlays[i];
                    var rect = ov.sectionEl.getBoundingClientRect();
                    if (clientX >= rect.left && clientX <= rect.right &&
                        clientY >= rect.top && clientY <= rect.bottom) {
                        return ov;
                    }
                }
                return null;
            },

            _clientToFraction: function(clientX, clientY, overlay) {
                // getBoundingClientRect accounts for CSS transforms (ScoreZoom)
                var rect = overlay.sectionEl.getBoundingClientRect();
                return {
                    x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
                    y: Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
                };
            },

            _getPageForSection: function(sectionIndex) {
                if (window.PartsMode && PartsMode.active && PartsMode.sectionPages) {
                    return PartsMode.sectionPages[sectionIndex] || 0;
                }
                // Full score: section 0 = top page, section 1 = top page + 1
                if (window.GraphicTimeline && GraphicTimeline.currentTopPage != null) {
                    return GraphicTimeline.currentTopPage + sectionIndex;
                }
                return sectionIndex;
            },

            // ─── Point sampling ──────────────────────────────────────────
            _samplePoints: function(points, n) {
                if (points.length <= n * 2) return points.slice(); // too few to sample
                var sampled = [points[0]];
                for (var i = n; i < points.length - 1; i += n) {
                    sampled.push(points[i]);
                }
                sampled.push(points[points.length - 1]); // always keep last
                return sampled;
            },

            // ─── Live stroke rendering ───────────────────────────────────
            _renderLiveStroke: function() {
                if (!this._activeStroke || this._activeStroke.points.length < 2) return;

                var ov = this._activeStroke.overlay;
                // Remove old live preview
                this._clearLiveStroke();

                var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('class', 'annotation-live');
                path.setAttribute('d', this._pointsToSVGPath(this._activeStroke.points));
                path.setAttribute('stroke', this._activeStroke.color);
                path.setAttribute('stroke-width', String(this._activeStroke.width));
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke-linecap', 'round');
                path.setAttribute('stroke-linejoin', 'round');
                path.setAttribute('vector-effect', 'non-scaling-stroke');

                ov.svg.appendChild(path);
            },

            _clearLiveStroke: function() {
                for (var i = 0; i < this.overlays.length; i++) {
                    var live = this.overlays[i].svg.querySelectorAll('.annotation-live');
                    for (var j = 0; j < live.length; j++) {
                        live[j].remove();
                    }
                }
            },

            // ─── Text input ───────────────────────────────────────────────
            _showTextInput: function(clientX, clientY, pos, page, overlay) {
                // Remove any existing text input
                var existing = document.getElementById('annotationTextInput');
                if (existing) existing.remove();

                var self = this;
                var input = document.createElement('input');
                input.id = 'annotationTextInput';
                input.type = 'text';
                input.placeholder = 'Type annotation...';
                input.style.cssText = [
                    'position: fixed',
                    'left: ' + clientX + 'px',
                    'top: ' + (clientY - 36) + 'px',
                    'z-index: 10001',
                    'background: rgba(20,20,20,0.95)',
                    'color: #fff',
                    'border: 2px solid ' + this._currentColor,
                    'border-radius: 6px',
                    'padding: 6px 10px',
                    'font-family: -apple-system, BlinkMacSystemFont, sans-serif',
                    'font-size: 14px',
                    'min-width: 120px',
                    'outline: none',
                    'box-shadow: 0 4px 16px rgba(0,0,0,0.5)'
                ].join('; ') + ';';

                function commit() {
                    var text = input.value.trim();
                    if (text) {
                        var fontSize = self._currentWidth < 3 ? 28 : (self._currentWidth < 6 ? 40 : 56);
                        if (window.PartsMode && PartsMode.active) {
                            var sRect = overlay.sectionEl.getBoundingClientRect();
                            fontSize = Math.round(fontSize * 350 / Math.max(50, sRect.height));
                            fontSize = Math.max(28, Math.min(180, fontSize));
                        }
                        var ann = {
                            type: 'text',
                            page: page,
                            position: pos,
                            data: {
                                text: text,
                                color: self._currentColor,
                                fontSize: fontSize
                            }
                        };
                        AnnotationModel.add(ann);
                        self._renderAnnotation(ann, overlay);
                    }
                    input.remove();
                }

                input.addEventListener('keydown', function(e) {
                    e.stopPropagation();
                    if (e.key === 'Enter') commit();
                    if (e.key === 'Escape') input.remove();
                });
                input.addEventListener('blur', function() {
                    commit();
                });
                input.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                });

                document.body.appendChild(input);
                setTimeout(function() { input.focus(); }, 50);
            },

            // ─── Annotation rendering ────────────────────────────────────
            _renderAnnotation: function(annotation, overlay) {
                if (annotation.type === 'freehand') {
                    this._renderFreehand(annotation, overlay);
                } else if (annotation.type === 'stamp') {
                    this._renderStamp(annotation, overlay);
                } else if (annotation.type === 'text') {
                    this._renderText(annotation, overlay);
                }
            },

            _renderText: function(annotation, overlay) {
                if (!annotation.data || !annotation.data.text) return;

                var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('data-annotation-id', annotation.id);
                g.setAttribute('class', 'annotation-element');

                var cx = annotation.position.x * 1000;
                var cy = annotation.position.y * 1000;

                // Aspect ratio correction (same as stamps)
                var rect = overlay.svg.getBoundingClientRect();
                var ar = (rect.width > 0 && rect.height > 0) ? rect.height / rect.width : 1;
                g.setAttribute('transform',
                    'translate(' + cx + ',' + cy + ') scale(' + ar.toFixed(4) + ',1) translate(' + (-cx) + ',' + (-cy) + ')');

                var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', String(cx));
                text.setAttribute('y', String(cy));
                text.setAttribute('fill', annotation.data.color || '#ff0000');
                text.setAttribute('font-size', String(annotation.data.fontSize || 28));
                text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
                text.setAttribute('dominant-baseline', 'middle');
                text.textContent = annotation.data.text;

                g.appendChild(text);
                overlay.svg.appendChild(g);
            },

            _renderStamp: function(annotation, overlay) {
                if (!annotation.data || !annotation.data.symbol) return;

                var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('data-annotation-id', annotation.id);
                g.setAttribute('class', 'annotation-element');

                // Aspect ratio correction: viewBox is 1000x1000 (square) but
                // section is a wide rectangle. Text gets stretched horizontally.
                // Counter-scale X by (height/width) to restore correct proportions.
                var cx = annotation.position.x * 1000;
                var cy = annotation.position.y * 1000;
                var rect = overlay.svg.getBoundingClientRect();
                var ar = (rect.width > 0 && rect.height > 0) ? rect.height / rect.width : 1;
                g.setAttribute('transform',
                    'translate(' + cx + ',' + cy + ') scale(' + ar.toFixed(4) + ',1) translate(' + (-cx) + ',' + (-cy) + ')');

                // Check for pre-generated glyph paths (injected at build time)
                var glyphKey = annotation.data.symbol;
                var glyphPaths = window._STAMP_GLYPH_PATHS;
                if (glyphPaths && glyphPaths[glyphKey]) {
                    var glyph = glyphPaths[glyphKey];
                    var size = annotation.data.size || 40;
                    var scaleFactor = size / (glyph.unitsPerEm || 1000);
                    var pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    pathEl.setAttribute('d', glyph.d);
                    if (glyph.stroke) {
                        pathEl.setAttribute('fill', 'none');
                        pathEl.setAttribute('stroke', annotation.data.color || '#ff0000');
                        pathEl.setAttribute('stroke-width', String(60 / scaleFactor));
                        pathEl.setAttribute('stroke-linecap', 'round');
                        pathEl.setAttribute('stroke-linejoin', 'round');
                    } else {
                        pathEl.setAttribute('fill', annotation.data.color || '#ff0000');
                    }
                    pathEl.setAttribute('transform',
                        'translate(' + cx + ',' + cy + ') scale(' + scaleFactor.toFixed(6) + ',' + (-scaleFactor).toFixed(6) + ') translate(' + (-glyph.cx).toFixed(1) + ',' + (-glyph.cy).toFixed(1) + ')');
                    g.appendChild(pathEl);
                } else {
                    // Fallback: render as text
                    var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    text.setAttribute('x', String(cx));
                    text.setAttribute('y', String(cy));
                    text.setAttribute('fill', annotation.data.color || '#ff0000');
                    text.setAttribute('font-size', String(annotation.data.size || 40));
                    text.setAttribute('text-anchor', 'middle');
                    text.setAttribute('dominant-baseline', 'central');

                    if (annotation.data.font === 'dyn') {
                        text.setAttribute('font-family', 'Century Schoolbook, Georgia, "Times New Roman", serif');
                        text.setAttribute('font-style', 'italic');
                        text.setAttribute('font-weight', '700');
                    } else {
                        text.setAttribute('font-family', '-apple-system, BlinkMacSystemFont, sans-serif');
                        text.setAttribute('font-weight', '700');
                    }
                    text.textContent = annotation.data.symbol;
                    g.appendChild(text);
                }

                overlay.svg.appendChild(g);
            },

            _renderFreehand: function(annotation, overlay) {
                if (!annotation.data || !annotation.data.paths) return;

                var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('data-annotation-id', annotation.id);
                g.setAttribute('class', 'annotation-element');

                for (var i = 0; i < annotation.data.paths.length; i++) {
                    var pathData = annotation.data.paths[i];
                    if (!pathData.points || pathData.points.length < 2) continue;

                    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                    path.setAttribute('d', this._pointsToSVGPath(pathData.points));
                    path.setAttribute('stroke', pathData.color || '#ff0000');
                    path.setAttribute('stroke-width', String(pathData.width || 2));
                    path.setAttribute('fill', 'none');
                    path.setAttribute('stroke-linecap', 'round');
                    path.setAttribute('stroke-linejoin', 'round');
                    path.setAttribute('vector-effect', 'non-scaling-stroke');

                    g.appendChild(path);
                }

                overlay.svg.appendChild(g);
            },

            // ─── SVG path generation ─────────────────────────────────────
            // Converts fraction-based points to SVG path with cubic bezier smoothing
            _pointsToSVGPath: function(points) {
                if (points.length < 2) return '';

                // Map fractions to viewBox coordinates (0-1000)
                var mapped = [];
                for (var i = 0; i < points.length; i++) {
                    mapped.push({
                        x: points[i].x * 1000,
                        y: points[i].y * 1000
                    });
                }

                if (mapped.length === 2) {
                    return 'M ' + mapped[0].x.toFixed(1) + ' ' + mapped[0].y.toFixed(1) +
                           ' L ' + mapped[1].x.toFixed(1) + ' ' + mapped[1].y.toFixed(1);
                }

                // Catmull-Rom to cubic bezier for smooth curves
                var d = 'M ' + mapped[0].x.toFixed(1) + ' ' + mapped[0].y.toFixed(1);

                for (var i = 0; i < mapped.length - 1; i++) {
                    var p0 = mapped[Math.max(0, i - 1)];
                    var p1 = mapped[i];
                    var p2 = mapped[Math.min(mapped.length - 1, i + 1)];
                    var p3 = mapped[Math.min(mapped.length - 1, i + 2)];

                    // Catmull-Rom to Bezier control points
                    var cp1x = p1.x + (p2.x - p0.x) / 6;
                    var cp1y = p1.y + (p2.y - p0.y) / 6;
                    var cp2x = p2.x - (p3.x - p1.x) / 6;
                    var cp2y = p2.y - (p3.y - p1.y) / 6;

                    d += ' C ' + cp1x.toFixed(1) + ' ' + cp1y.toFixed(1) +
                         ' ' + cp2x.toFixed(1) + ' ' + cp2y.toFixed(1) +
                         ' ' + p2.x.toFixed(1) + ' ' + p2.y.toFixed(1);
                }

                return d;
            },

            // ─── Page visibility ─────────────────────────────────────────
            // Renders annotations for currently visible pages on each section
            renderVisibleAnnotations: function() {
                for (var i = 0; i < this.overlays.length; i++) {
                    var ov = this.overlays[i];
                    // Clear all annotation elements (keep live stroke if any)
                    var elements = ov.svg.querySelectorAll('.annotation-element');
                    for (var j = 0; j < elements.length; j++) {
                        elements[j].remove();
                    }

                    // Get which page this section is currently showing
                    var page = this._getPageForSection(i);
                    var annotations = AnnotationModel.getForPage(page);

                    for (var k = 0; k < annotations.length; k++) {
                        this._renderAnnotation(annotations[k], ov);
                    }
                }
            },

            // ─── Eraser hit-test ─────────────────────────────────────────
            _eraseAtPoint: function(clientX, clientY, overlay) {
                var pos = this._clientToFraction(clientX, clientY, overlay);
                var page = this._getPageForSection(overlay.sectionIndex);
                var annotations = AnnotationModel.getForPage(page);
                var hitRadius = 0.015; // freehand hit radius

                for (var i = annotations.length - 1; i >= 0; i--) {
                    var ann = annotations[i];
                    if (ann.type === 'freehand' && ann.data && ann.data.paths) {
                        for (var p = 0; p < ann.data.paths.length; p++) {
                            var pts = ann.data.paths[p].points;
                            for (var j = 0; j < pts.length; j++) {
                                var dx = pts[j].x - pos.x;
                                var dy = pts[j].y - pos.y;
                                if (Math.sqrt(dx * dx + dy * dy) < hitRadius) {
                                    AnnotationModel.remove(ann.id);
                                    this.renderVisibleAnnotations();
                                    return true;
                                }
                            }
                        }
                    } else if (ann.type === 'stamp' || ann.type === 'text') {
                        var stampHitRadius = 0.06; // larger radius for stamps
                        var dx = ann.position.x - pos.x;
                        var dy = ann.position.y - pos.y;
                        if (Math.sqrt(dx * dx + dy * dy) < stampHitRadius) {
                            AnnotationModel.remove(ann.id);
                            this.renderVisibleAnnotations();
                            return true;
                        }
                    }
                }
                return false;
            },

            // ─── Annotation mode toggle + toolbar ─────────────────────────
            _addAnnotationToggle: function() {
                // Add 🖊️ button to controls overlay (if it exists)
                var mainRow = document.querySelector('.co-row-main');
                if (!mainRow) {
                    console.warn('[Annotation] ControlsOverlay .co-row-main not found — toggle not added');
                    return;
                }

                // Find the close button and insert before it
                var closeBtn = mainRow.querySelector('.co-close');

                var btn = document.createElement('button');
                btn.className = 'co-btn co-annotate-btn';
                btn.title = 'Annotation Mode';
                btn.textContent = '✏️';
                btn.style.fontSize = '18px';

                var self = this;
                btn.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                });
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._isAnnotationMode = !self._isAnnotationMode;
                    btn.style.background = self._isAnnotationMode
                        ? 'rgba(255, 100, 100, 0.4)'
                        : 'rgba(255,255,255,0.12)';
                    self._updateToolbarVisibility();
                    console.log('[Annotation] Mode ' + (self._isAnnotationMode ? 'ON' : 'OFF'));
                });

                // Insert before close button (or append)
                if (closeBtn) {
                    var divider = document.createElement('span');
                    divider.className = 'co-divider';
                    mainRow.insertBefore(divider, closeBtn);
                    mainRow.insertBefore(btn, closeBtn);
                } else {
                    mainRow.appendChild(btn);
                }

                // Create the annotation toolbar
                this._createToolbar();

                console.log('[Annotation] Toggle button + toolbar added (close X on toolbar exits mode)');
            },

            _createToolbar: function() {
                // Prevent duplicate toolbars
                if (document.getElementById('annotationToolbar')) {
                    this._toolbar = document.getElementById('annotationToolbar');
                    console.warn('[Annotation] Toolbar already exists — reusing');
                    return;
                }
                var self = this;

                // Inject toolbar CSS
                var style = document.createElement('style');
                style.textContent = [
                    '#annotationToolbar {',
                    '  position: fixed; z-index: 10000; display: none;',
                    '  background: rgba(20, 20, 20, 0.92); backdrop-filter: blur(12px);',
                    '  border-radius: 12px; padding: 8px 12px;',
                    '  box-shadow: 0 4px 20px rgba(0,0,0,0.5);',
                    '  font-family: -apple-system, BlinkMacSystemFont, sans-serif;',
                    '  user-select: none; -webkit-user-select: none; touch-action: none;',
                    '}',
                    '#annotationToolbar.at-visible { display: flex; align-items: center; gap: 8px; }',
                    '.at-drag-handle {',
                    '  cursor: grab; padding: 6px 8px; margin-right: 2px;',
                    '  color: rgba(255,255,255,0.4); font-size: 18px; line-height: 1;',
                    '  touch-action: none; -webkit-touch-callout: none;',
                    '}',
                    '.at-drag-handle:active { cursor: grabbing; }',
                    '.at-drag-handle:hover { color: rgba(255,255,255,0.7); }',
                    '.at-section { display: flex; align-items: center; gap: 4px; }',
                    '.at-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.2); margin: 0 4px; }',
                    '.at-color {',
                    '  width: 26px; height: 26px; border-radius: 50%; border: 2px solid transparent;',
                    '  cursor: pointer; transition: border-color 0.15s;',
                    '}',
                    '.at-color.at-selected { border-color: #fff; }',
                    '.at-color:hover { border-color: rgba(255,255,255,0.5); }',
                    '.at-width {',
                    '  width: 36px; height: 30px; border-radius: 6px; cursor: pointer;',
                    '  background: rgba(255,255,255,0.08); border: 2px solid transparent;',
                    '  display: flex; align-items: center; justify-content: center;',
                    '  transition: border-color 0.15s, background 0.15s;',
                    '}',
                    '.at-width.at-selected { border-color: #fff; background: rgba(255,255,255,0.2); }',
                    '.at-width:hover { background: rgba(255,255,255,0.15); }',
                    '.at-tool-btn {',
                    '  background: rgba(255,255,255,0.08); border: 2px solid transparent;',
                    '  color: #fff; border-radius: 8px; padding: 4px 10px; font-size: 14px;',
                    '  cursor: pointer; min-height: 30px;',
                    '  transition: border-color 0.15s, background 0.15s;',
                    '}',
                    '.at-tool-btn:hover { background: rgba(255,255,255,0.15); }',
                    '.at-tool-btn.at-selected { border-color: #fff; background: rgba(255,100,100,0.3); }',
                    '.at-label { color: rgba(255,255,255,0.5); font-size: 11px; margin-right: 2px; }',
                    '#stampPalette {',
                    '  position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);',
                    '  margin-bottom: 8px; display: none;',
                    '  background: rgba(20, 20, 20, 0.95); backdrop-filter: blur(12px);',
                    '  border-radius: 10px; padding: 8px;',
                    '  box-shadow: 0 4px 20px rgba(0,0,0,0.5);',
                    '  max-width: 380px;',
                    '}',
                    '#stampPalette.sp-visible { display: grid; grid-template-columns: repeat(6, 1fr); gap: 2px; }',
                    '.sp-stamp {',
                    '  min-width: 36px; height: 32px; border-radius: 6px; border: 2px solid transparent;',
                    '  background: rgba(255,255,255,0.06); color: #fff; font-size: 15px;',
                    '  display: flex; align-items: center; justify-content: center; cursor: pointer;',
                    '  padding: 0 4px; white-space: nowrap;',
                    '  transition: background 0.12s, border-color 0.12s;',
                    '}',
                    '.sp-stamp.sp-dyn { font-family: Georgia, serif; font-style: italic; font-weight: 700; }',
                    '.sp-stamp:hover { background: rgba(255,255,255,0.15); }',
                    '.sp-stamp.sp-selected { border-color: #fff; background: rgba(255,100,100,0.3); }'
                ].join('\\n');
                document.head.appendChild(style);

                // Build toolbar DOM
                var toolbar = document.createElement('div');
                toolbar.id = 'annotationToolbar';
                this._toolbar = toolbar;

                // Position toolbar centered near bottom
                toolbar.style.bottom = '80px';
                toolbar.style.left = '50%';
                toolbar.style.transform = 'translateX(-50%)';

                // Drag handle
                var dragHandle = document.createElement('div');
                dragHandle.className = 'at-drag-handle';
                dragHandle.textContent = '\\u2630';
                dragHandle.title = 'Drag to move toolbar';
                toolbar.appendChild(dragHandle);

                // Drag behavior — document-level move/up for reliable tracking
                var isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
                dragHandle.addEventListener('pointerdown', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    isDragging = true;
                    dragHandle.setPointerCapture(e.pointerId);
                    // Switch to absolute left/top positioning on first drag
                    var rect = toolbar.getBoundingClientRect();
                    toolbar.style.transform = 'none';
                    toolbar.style.left = rect.left + 'px';
                    toolbar.style.top = rect.top + 'px';
                    toolbar.style.bottom = 'auto';
                    dragOffsetX = e.clientX - rect.left;
                    dragOffsetY = e.clientY - rect.top;
                });
                dragHandle.addEventListener('pointermove', function(e) {
                    if (!isDragging) return;
                    e.preventDefault();
                    // Clamp to viewport bounds
                    var tw = toolbar.offsetWidth || 200;
                    var th = toolbar.offsetHeight || 40;
                    var nx = Math.max(0, Math.min(window.innerWidth - tw, e.clientX - dragOffsetX));
                    var ny = Math.max(0, Math.min(window.innerHeight - th - 30, e.clientY - dragOffsetY));
                    toolbar.style.left = nx + 'px';
                    toolbar.style.top = ny + 'px';
                });
                dragHandle.addEventListener('pointerup', function() {
                    isDragging = false;
                });
                dragHandle.addEventListener('pointercancel', function() {
                    isDragging = false;
                });

                // Undo/Redo buttons
                var undoBtn = document.createElement('button');
                undoBtn.className = 'at-tool-btn';
                undoBtn.textContent = '↩';
                undoBtn.title = 'Undo';
                undoBtn.style.fontSize = '16px';
                undoBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                undoBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (AnnotationModel.undo()) {
                        self.renderVisibleAnnotations();
                        console.log('[Annotation] Undo');
                    }
                });
                toolbar.appendChild(undoBtn);

                var redoBtn = document.createElement('button');
                redoBtn.className = 'at-tool-btn';
                redoBtn.textContent = '↪';
                redoBtn.title = 'Redo';
                redoBtn.style.fontSize = '16px';
                redoBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                redoBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (AnnotationModel.redo()) {
                        self.renderVisibleAnnotations();
                        console.log('[Annotation] Redo');
                    }
                });
                toolbar.appendChild(redoBtn);

                // Visibility toggle
                var visBtn = document.createElement('button');
                visBtn.className = 'at-tool-btn';
                visBtn.textContent = '👁';
                visBtn.title = 'Toggle annotation visibility';
                visBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                visBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._annotationsVisible = !self._annotationsVisible;
                    for (var i = 0; i < self.overlays.length; i++) {
                        self.overlays[i].svg.style.display = self._annotationsVisible ? '' : 'none';
                    }
                    visBtn.style.opacity = self._annotationsVisible ? '1' : '0.4';
                    console.log('[Annotation] Visibility ' + (self._annotationsVisible ? 'ON' : 'OFF'));
                });
                toolbar.appendChild(visBtn);

                // Divider
                var div0 = document.createElement('div');
                div0.className = 'at-divider';
                toolbar.appendChild(div0);

                // Color swatches
                var colorSection = document.createElement('div');
                colorSection.className = 'at-section';
                var colorLabel = document.createElement('span');
                colorLabel.className = 'at-label';
                colorLabel.textContent = 'Color';
                colorSection.appendChild(colorLabel);

                this._colorBtns = [];
                for (var i = 0; i < this._colors.length; i++) {
                    (function(color, idx) {
                        var swatch = document.createElement('div');
                        swatch.className = 'at-color' + (idx === 0 ? ' at-selected' : '');
                        swatch.style.background = color;
                        if (color === '#ffffff') swatch.style.border = '2px solid rgba(255,255,255,0.4)';
                        swatch.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                        swatch.addEventListener('click', function(e) {
                            e.stopPropagation();
                            self._currentColor = color;
                            self._isEraser = false;
                            self._updateToolbarState();
                        });
                        colorSection.appendChild(swatch);
                        self._colorBtns.push(swatch);
                    })(this._colors[i], i);
                }
                toolbar.appendChild(colorSection);

                // Divider
                var div1 = document.createElement('div');
                div1.className = 'at-divider';
                toolbar.appendChild(div1);

                // Width buttons
                var widthSection = document.createElement('div');
                widthSection.className = 'at-section';
                var widthLabel = document.createElement('span');
                widthLabel.className = 'at-label';
                widthLabel.textContent = 'Width';
                widthSection.appendChild(widthLabel);

                this._widthBtns = [];
                var widthLabels = ['S', 'M', 'L'];
                for (var i = 0; i < this._widths.length; i++) {
                    (function(w, idx) {
                        var wBtn = document.createElement('div');
                        wBtn.className = 'at-width' + (idx === 0 ? ' at-selected' : '');
                        wBtn.textContent = widthLabels[idx];
                        wBtn.style.color = '#fff';
                        wBtn.style.fontSize = '12px';
                        wBtn.style.fontWeight = '600';
                        wBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                        wBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            self._currentWidth = w;
                            self._updateToolbarState();
                        });
                        widthSection.appendChild(wBtn);
                        self._widthBtns.push(wBtn);
                    })(this._widths[i], i);
                }
                toolbar.appendChild(widthSection);

                // Divider
                var div2 = document.createElement('div');
                div2.className = 'at-divider';
                toolbar.appendChild(div2);

                // Stamp button + palette
                var stampBtn = document.createElement('button');
                stampBtn.className = 'at-tool-btn at-stamp';
                stampBtn.textContent = '\\u2293';
                stampBtn.title = 'Stamps';
                stampBtn.style.fontSize = '16px';
                stampBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                stampBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._isStampMode = !self._isStampMode;
                    if (self._isStampMode) {
                        self._isEraser = false;
                        self._isTextMode = false;
                        if (!self._currentStamp) self._currentStamp = self._stamps[0];
                    }
                    self._updateToolbarState();
                    self._toggleStampPalette();
                });
                this._stampBtn = stampBtn;
                toolbar.appendChild(stampBtn);

                // Stamp palette (popup above toolbar)
                var stampPalette = document.createElement('div');
                stampPalette.id = 'stampPalette';
                this._stampPalette = stampPalette;
                this._stampPaletteBtns = [];

                for (var i = 0; i < this._stamps.length; i++) {
                    (function(st, idx) {
                        var sBtn = document.createElement('div');
                        var cls = 'sp-stamp';
                        if (st.font === 'dyn') cls += ' sp-dyn';
                        if (idx === 0) cls += ' sp-selected';
                        sBtn.className = cls;
                        sBtn.textContent = st.symbol;
                        sBtn.title = st.label;
                        sBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                        sBtn.addEventListener('click', function(e) {
                            e.stopPropagation();
                            self._currentStamp = st;
                            self._updateStampPaletteState();
                        });
                        stampPalette.appendChild(sBtn);
                        self._stampPaletteBtns.push(sBtn);
                    })(this._stamps[i], i);
                }
                toolbar.appendChild(stampPalette);

                // Text button
                var textBtn = document.createElement('button');
                textBtn.className = 'at-tool-btn at-text';
                textBtn.textContent = 'T';
                textBtn.title = 'Text annotation';
                textBtn.style.fontWeight = '700';
                textBtn.style.fontStyle = 'italic';
                textBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                textBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._isTextMode = !self._isTextMode;
                    if (self._isTextMode) {
                        self._isEraser = false;
                        self._isStampMode = false;
                        self._toggleStampPalette();
                    }
                    self._updateToolbarState();
                });
                this._textBtn = textBtn;
                toolbar.appendChild(textBtn);

                // Eraser button
                var eraserBtn = document.createElement('button');
                eraserBtn.className = 'at-tool-btn at-eraser';
                eraserBtn.textContent = '🧹';
                eraserBtn.title = 'Eraser';
                eraserBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                eraserBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._isEraser = !self._isEraser;
                    if (self._isEraser) {
                        self._isStampMode = false;
                        self._isTextMode = false;
                        self._toggleStampPalette();
                    }
                    self._updateToolbarState();
                });
                this._eraserBtn = eraserBtn;
                toolbar.appendChild(eraserBtn);

                // Clear page button
                var clearBtn = document.createElement('button');
                clearBtn.className = 'at-tool-btn';
                clearBtn.textContent = '🗑️';
                clearBtn.title = 'Clear page annotations';
                clearBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                clearBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    // Clear annotations on all currently visible pages
                    for (var i = 0; i < self.overlays.length; i++) {
                        var page = self._getPageForSection(i);
                        var anns = AnnotationModel.getForPage(page);
                        for (var j = anns.length - 1; j >= 0; j--) {
                            AnnotationModel.remove(anns[j].id);
                        }
                    }
                    self.renderVisibleAnnotations();
                    console.log('[Annotation] Cleared visible page annotations');
                });
                toolbar.appendChild(clearBtn);

                // Export button — download annotations as JSON
                var exportBtn = document.createElement('button');
                exportBtn.className = 'at-tool-btn';
                exportBtn.textContent = '💾';
                exportBtn.title = 'Export annotations';
                exportBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                exportBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var data = AnnotationModel.toJSON();
                    var key = AnnotationModel._storageKey();
                    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = key + '.json';
                    a.click();
                    URL.revokeObjectURL(a.href);
                    console.log('[Annotation] Exported annotations (' + key + ')');
                });
                toolbar.appendChild(exportBtn);

                // Import button — load annotations from JSON file
                var importBtn = document.createElement('button');
                importBtn.className = 'at-tool-btn';
                importBtn.textContent = '📂';
                importBtn.title = 'Import annotations';
                importBtn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                importBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    var fileInput = document.createElement('input');
                    fileInput.type = 'file';
                    fileInput.accept = '.json';
                    fileInput.style.display = 'none';
                    fileInput.addEventListener('change', function() {
                        if (!fileInput.files || !fileInput.files[0]) return;
                        var reader = new FileReader();
                        reader.onload = function(ev) {
                            try {
                                var data = JSON.parse(ev.target.result);
                                AnnotationModel.fromJSON(data);
                                AnnotationModel.save();
                                self.renderVisibleAnnotations();
                                console.log('[Annotation] Imported annotations — ' + AnnotationModel.getAll().length + ' items');
                            } catch (err) {
                                console.error('[Annotation] Import failed:', err.message);
                                alert('Invalid annotation file');
                            }
                        };
                        reader.readAsText(fileInput.files[0]);
                        fileInput.remove();
                    });
                    document.body.appendChild(fileInput);
                    fileInput.click();
                });
                toolbar.appendChild(importBtn);

                // Divider before close
                var div3 = document.createElement('div');
                div3.className = 'at-divider';
                toolbar.appendChild(div3);

                // Close button — exits annotation mode
                var closeToolbar = document.createElement('button');
                closeToolbar.className = 'at-tool-btn at-close';
                closeToolbar.textContent = '✕';
                closeToolbar.title = 'Exit annotation mode';
                closeToolbar.style.fontWeight = '700';
                closeToolbar.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
                closeToolbar.addEventListener('click', function(e) {
                    e.stopPropagation();
                    self._isAnnotationMode = false;
                    self._isEraser = false;
                    self._isStampMode = false;
                    self._isTextMode = false;
                    self._toggleStampPalette();
                    self._updateToolbarVisibility();
                    // Also update the controls overlay toggle button
                    var coBtn = document.querySelector('.co-annotate-btn');
                    if (coBtn) coBtn.style.background = 'rgba(255,255,255,0.12)';
                    console.log('[Annotation] Mode OFF (toolbar close)');
                });
                toolbar.appendChild(closeToolbar);

                document.body.appendChild(toolbar);
            },

            _updateToolbarVisibility: function() {
                if (!this._toolbar) return;
                if (this._isAnnotationMode) {
                    this._toolbar.classList.add('at-visible');
                } else {
                    this._toolbar.classList.remove('at-visible');
                }
            },

            _updateToolbarState: function() {
                // Color selection
                for (var i = 0; i < this._colorBtns.length; i++) {
                    var isSelected = !this._isEraser && this._colors[i] === this._currentColor;
                    this._colorBtns[i].className = 'at-color' + (isSelected ? ' at-selected' : '');
                    if (this._colors[i] === '#ffffff') {
                        this._colorBtns[i].style.border = isSelected
                            ? '2px solid #fff'
                            : '2px solid rgba(255,255,255,0.4)';
                    }
                }
                // Width selection
                for (var i = 0; i < this._widthBtns.length; i++) {
                    var isSelected = this._widths[i] === this._currentWidth;
                    this._widthBtns[i].className = 'at-width' + (isSelected ? ' at-selected' : '');
                }
                // Eraser
                this._eraserBtn.className = 'at-tool-btn at-eraser' + (this._isEraser ? ' at-selected' : '');
                // Stamp
                this._stampBtn.className = 'at-tool-btn at-stamp' + (this._isStampMode ? ' at-selected' : '');
                if (this._currentStamp) this._stampBtn.textContent = this._currentStamp.symbol;
                // Text
                if (this._textBtn) {
                    this._textBtn.className = 'at-tool-btn at-text' + (this._isTextMode ? ' at-selected' : '');
                }
            },

            _toggleStampPalette: function() {
                if (!this._stampPalette) return;
                if (this._isStampMode) {
                    this._stampPalette.classList.add('sp-visible');
                } else {
                    this._stampPalette.classList.remove('sp-visible');
                }
            },

            _updateStampPaletteState: function() {
                for (var i = 0; i < this._stampPaletteBtns.length; i++) {
                    var isSelected = this._currentStamp === this._stamps[i];
                    var cls = 'sp-stamp';
                    if (this._stamps[i].font === 'dyn') cls += ' sp-dyn';
                    if (isSelected) cls += ' sp-selected';
                    this._stampPaletteBtns[i].className = cls;
                }
                if (this._currentStamp) this._stampBtn.textContent = this._currentStamp.symbol;
            },

            // ─── Public API ──────────────────────────────────────────────
            get isAnnotationMode() { return this._isAnnotationMode; },
            set isAnnotationMode(v) {
                this._isAnnotationMode = !!v;
                var btn = document.querySelector('.co-annotate-btn');
                if (btn) {
                    btn.style.background = this._isAnnotationMode
                        ? 'rgba(255, 100, 100, 0.4)'
                        : 'rgba(255,255,255,0.12)';
                }
            }
        };

        // ─── Initialize ──────────────────────────────────────────────────
        AnnotationModel.load();
        AnnotationOverlay.init();

        // ─── Page visibility hooks ───────────────────────────────────────
        // Wrap GraphicTimeline.onGoto and checkPageChange so annotations
        // re-render when pages change. Track last-known pages to avoid
        // unnecessary re-renders on every animation frame.
        (function initPageHooks() {
            if (!window.GraphicTimeline) {
                console.warn('[Annotation] GraphicTimeline not found — page hooks skipped');
                return;
            }

            var _lastPages = null; // JSON string of current page array for cheap comparison

            function getCurrentPages() {
                var pages = [];
                for (var i = 0; i < AnnotationOverlay.overlays.length; i++) {
                    pages.push(AnnotationOverlay._getPageForSection(i));
                }
                return pages;
            }

            function checkAndRender() {
                var pages = getCurrentPages();
                var key = pages.join(',');
                if (key !== _lastPages) {
                    _lastPages = key;
                    AnnotationOverlay.renderVisibleAnnotations();
                }
            }

            // Wrap onGoto — fires on manual page turns, goto, loop rewind
            var origOnGoto = GraphicTimeline.onGoto.bind(GraphicTimeline);
            GraphicTimeline.onGoto = function(targetSeconds) {
                origOnGoto(targetSeconds);
                checkAndRender();
            };

            // Wrap checkPageChange — fires every frame during playback
            var origCheck = GraphicTimeline.checkPageChange.bind(GraphicTimeline);
            GraphicTimeline.checkPageChange = function() {
                origCheck();
                checkAndRender();
            };

            // Initial render for current pages
            _lastPages = getCurrentPages().join(',');
            AnnotationOverlay.renderVisibleAnnotations();

            console.log('[Annotation] Page visibility hooks installed');
        })();

        // Expose globals
        window.AnnotationModel = AnnotationModel;
        window.AnnotationOverlay = AnnotationOverlay;

        console.log('[Annotation] System initialized — pen always active, mouse toggle via overlay button');

    })();
    `;

    // Inject before the closing </script> tag (last occurrence)
    var lastScriptClose = html.lastIndexOf('</script>');
    if (lastScriptClose !== -1) {
        html = html.substring(0, lastScriptClose) + runtimeCode + '\n    ' + html.substring(lastScriptClose);
        console.log('  ✓ Annotation system injected');
    } else {
        console.error('  ✗ Annotation system: could not find </script> injection point');
    }

    return html;
};
