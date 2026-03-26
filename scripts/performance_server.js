#!/usr/bin/env node
/**
 * performance_server.js — Phase 5: Performance Score Server
 *
 * Serves the Performance Score app from builds/performance/ with Socket.IO
 * for multi-client synchronized playback.
 *
 * Usage:
 *   node scripts/performance_server.js                  # Start on default port 3001
 *   node scripts/performance_server.js --port 3005      # Custom port
 *
 * Sync architecture evolved from Workshop server.js (lines 3452-3592).
 * Room-based state: each room has independent sync (isPlaying, scoreTime, etc.).
 * Clients join rooms via ?room=X URL param. Default room: "default".
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PERF_DIR = path.join(ROOT, 'builds', 'performance');
const LANDING_DIR = path.join(ROOT, 'landing');
const HOMEPAGE_DIR = path.join(ROOT, 'homepage');
const DATA_DIR = path.join(ROOT, 'data');
const SESSIONS_DIR = path.join(DATA_DIR, 'sessions');
const PERFORMERS_DIR = path.join(DATA_DIR, 'performers');
const JWT_SECRET_PATH = path.join(DATA_DIR, '.jwt-secret');
const SYNC_INTERVAL_MS = 1000; // Clock sync broadcast interval
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes before empty room is cleaned up

// Parse CLI args
let PORT = 3001;
let gracePeriodMs = GRACE_PERIOD_MS;
for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--port' && process.argv[i + 1]) {
        PORT = parseInt(process.argv[i + 1]);
        i++;
    } else if (process.argv[i] === '--grace' && process.argv[i + 1]) {
        gracePeriodMs = parseInt(process.argv[i + 1]) * 1000; // seconds to ms
        i++;
    }
}

// ─── Validate prerequisites ─────────────────────────────────────────────────

if (!fs.existsSync(path.join(PERF_DIR, 'index.html'))) {
    console.error('builds/performance/index.html not found.');
    console.error('Run: node scripts/build_performance_app.js');
    process.exit(1);
}

if (!fs.existsSync(path.join(PERF_DIR, 'score.json'))) {
    console.error('builds/performance/score.json not found.');
    process.exit(1);
}

// ─── Data directory setup ──────────────────────────────────────────────────

// Ensure data directories exist
[DATA_DIR, SESSIONS_DIR, PERFORMERS_DIR].forEach(function(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log('Created directory: ' + path.relative(ROOT, dir));
    }
});

// JWT secret: auto-generate once, persist across restarts
var jwtSecret;
if (fs.existsSync(JWT_SECRET_PATH)) {
    jwtSecret = fs.readFileSync(JWT_SECRET_PATH, 'utf8').trim();
    console.log('JWT secret loaded from data/.jwt-secret');
} else {
    jwtSecret = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(JWT_SECRET_PATH, jwtSecret);
    console.log('JWT secret generated and saved to data/.jwt-secret');
}

// ─── Express + Socket.IO setup ──────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ─── Security middleware ──────────────────────────────────────────────────

// Security headers (X-Frame-Options, HSTS, CSP, etc.)
app.use(helmet({
    contentSecurityPolicy: false // CSP breaks inline scripts in score app
}));

// Parse JSON request bodies with size limit (prevent payload DoS)
app.use(express.json({ limit: '100kb' }));

// Serve homepage static files (CSS)
app.use('/homepage', express.static(HOMEPAGE_DIR));

// Serve landing page static files (CSS, etc.)
app.use('/landing', express.static(LANDING_DIR));

// Serve static files from builds/performance/ (score.json, etc.)
// index: false prevents express.static from serving index.html for '/' — 
// our explicit route handlers control which HTML is served for / and /score
app.use(express.static(PERF_DIR, { index: false }));

// Homepage at root
app.get('/', function(req, res) {
    res.sendFile(path.join(HOMEPAGE_DIR, 'index.html'));
});

// SQ1 landing page
app.get('/string-quartet-no1', function(req, res) {
    res.sendFile(path.join(LANDING_DIR, 'index.html'));
});

// Score app at /score
app.get('/score', function(req, res) {
    res.sendFile(path.join(PERF_DIR, 'index.html'));
});

// Documentation pages
var DOCS_DIR = path.join(ROOT, 'docs');
app.use('/docs/notation-instructions', express.static(path.join(DOCS_DIR, 'notation_instructions')));
app.use('/docs/technical-manual', express.static(path.join(DOCS_DIR, 'technical_manual')));

// Print score PDFs
app.use('/print', express.static(path.join(ROOT, 'builds', 'print')));

// ─── Security: Rate limiting ─────────────────────────────────────────────────

// Rate limit session creation: max 10 per minute per IP
var sessionCreateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    message: { error: 'Too many sessions created. Try again later.' }
});

// Rate limit join attempts: max 20 per minute per IP (allows retries)
var sessionJoinLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    message: { error: 'Too many join attempts. Try again later.' }
});

// General API rate limit: max 60 per minute per IP
var apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Too many requests. Try again later.' }
});
app.use('/api/', apiLimiter);

// ─── Security: Input sanitization ────────────────────────────────────────────

// Validate room code: alphanumeric only, 4-6 chars (prevents path traversal)
function sanitizeCode(code) {
    if (!code || typeof code !== 'string') return null;
    var cleaned = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length < 4 || cleaned.length > 6) return null;
    return cleaned;
}

// ─── Phase 7: Session management API ───────────────────────────────────────

// Generate a unique 6-character room code (uppercase alphanumeric, no ambiguous chars)
function generateRoomCode() {
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1
    var code;
    do {
        code = '';
        var bytes = crypto.randomBytes(6);
        for (var i = 0; i < 6; i++) {
            code += chars[bytes[i] % chars.length];
        }
    } while (fs.existsSync(path.join(SESSIONS_DIR, code + '.json')));
    return code;
}

// Atomic JSON file write (write to temp, then rename)
function writeJsonAtomic(filePath, data) {
    var tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
    fs.renameSync(tmp, filePath);
}

// POST /api/sessions — create a new rehearsal session
app.post('/api/sessions', sessionCreateLimiter, function(req, res) {
    var code = generateRoomCode();
    var session = {
        id: code,
        created_at: new Date().toISOString(),
        created_by: null, // set when first performer joins
        performers: [],
        state: {
            scoreTimeMs: 0,
            isPlaying: false
        }
    };
    writeJsonAtomic(path.join(SESSIONS_DIR, code + '.json'), session);
    console.log('Session created: ' + code);
    res.json({
        code: code,
        shareLink: '/session/' + code
    });
});

// GET /api/sessions/:code — get session info
app.get('/api/sessions/:code', function(req, res) {
    var code = sanitizeCode(req.params.code);
    if (!code) return res.status(400).json({ error: 'Invalid room code' });
    var sessionPath = path.join(SESSIONS_DIR, code + '.json');
    if (!fs.existsSync(sessionPath)) {
        return res.status(404).json({ error: 'Session not found' });
    }
    var session;
    try { session = JSON.parse(fs.readFileSync(sessionPath, 'utf8')); }
    catch (e) { return res.status(500).json({ error: 'Session data corrupted' }); }
    // Return session info with available slots
    var takenSlots = session.performers.map(function(p) { return p.slot; });
    var allSlots = ['violin1', 'violin2', 'viola', 'cello'];
    var availableSlots = allSlots.filter(function(s) { return takenSlots.indexOf(s) === -1; });
    res.json({
        id: session.id,
        created_at: session.created_at,
        performers: session.performers.map(function(p) {
            return { slot: p.slot, display_name: p.display_name };
        }),
        availableSlots: availableSlots
    });
});

// POST /api/sessions/:code/join — performer claims a slot, gets JWT
app.post('/api/sessions/:code/join', sessionJoinLimiter, function(req, res) {
    var code = sanitizeCode(req.params.code);
    if (!code) return res.status(400).json({ error: 'Invalid room code' });
    var sessionPath = path.join(SESSIONS_DIR, code + '.json');
    if (!fs.existsSync(sessionPath)) {
        return res.status(404).json({ error: 'Session not found' });
    }

    var displayName = (req.body.displayName || '').trim().substring(0, 50);
    var slot = (req.body.slot || '').toLowerCase();
    var validSlots = ['violin1', 'violin2', 'viola', 'cello'];

    if (!displayName) {
        return res.status(400).json({ error: 'displayName is required' });
    }
    if (validSlots.indexOf(slot) === -1) {
        return res.status(400).json({ error: 'Invalid slot. Must be one of: ' + validSlots.join(', ') });
    }

    var session;
    try { session = JSON.parse(fs.readFileSync(sessionPath, 'utf8')); }
    catch (e) { return res.status(500).json({ error: 'Session data corrupted' }); }

    // Check if slot is already taken
    var existingPerformer = session.performers.find(function(p) { return p.slot === slot; });
    if (existingPerformer) {
        return res.status(409).json({ error: 'Slot ' + slot + ' is already taken by ' + existingPerformer.display_name });
    }

    // Create new performer
    var performerId = crypto.randomBytes(16).toString('hex');
    var performer = {
        performerId: performerId,
        slot: slot,
        display_name: displayName,
        joined_at: new Date().toISOString()
    };

    // Add to session
    session.performers.push(performer);
    if (!session.created_by) {
        session.created_by = performerId;
    }
    writeJsonAtomic(sessionPath, session);

    // Create performer profile
    var performerDir = path.join(PERFORMERS_DIR, performerId);
    if (!fs.existsSync(performerDir)) {
        fs.mkdirSync(performerDir, { recursive: true });
    }
    writeJsonAtomic(path.join(performerDir, 'profile.json'), {
        performerId: performerId,
        display_name: displayName,
        created_at: new Date().toISOString(),
        email: null,
        preferences: {}
    });

    // Issue JWT
    var token = jwt.sign({
        performerId: performerId,
        displayName: displayName,
        slot: slot,
        sessionId: code
    }, jwtSecret, { expiresIn: '30d' });

    console.log('Session ' + code + ': ' + displayName + ' joined as ' + slot + ' (performer ' + performerId.substring(0, 8) + '...)');
    res.json({
        token: token,
        performerId: performerId,
        slot: slot,
        sessionId: code,
        isReconnect: false
    });
});

// GET /api/auth/verify — validate a JWT token
app.get('/api/auth/verify', function(req, res) {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    try {
        var decoded = jwt.verify(authHeader.substring(7), jwtSecret);
        res.json({
            valid: true,
            performerId: decoded.performerId,
            displayName: decoded.displayName,
            slot: decoded.slot,
            sessionId: decoded.sessionId
        });
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// Helper: extract and verify JWT from Authorization header
function authenticateRequest(req) {
    var authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    try {
        return jwt.verify(authHeader.substring(7), jwtSecret);
    } catch (err) {
        return null;
    }
}

// GET /api/performers/:id/preferences — load performer preferences
app.get('/api/performers/:id/preferences', function(req, res) {
    var decoded = authenticateRequest(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // Performers can only access their own preferences
    if (decoded.performerId !== req.params.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    var prefsPath = path.join(PERFORMERS_DIR, decoded.performerId, 'preferences.json');
    if (!fs.existsSync(prefsPath)) {
        return res.json({}); // No preferences yet — return empty object
    }
    var prefs;
    try { prefs = JSON.parse(fs.readFileSync(prefsPath, 'utf8')); }
    catch (e) { return res.status(500).json({ error: 'Preferences data corrupted' }); }
    res.json(prefs);
});

// PUT /api/performers/:id/preferences — save performer preferences
app.put('/api/performers/:id/preferences', function(req, res) {
    var decoded = authenticateRequest(req);
    if (!decoded) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    if (decoded.performerId !== req.params.id) {
        return res.status(403).json({ error: 'Access denied' });
    }
    var performerDir = path.join(PERFORMERS_DIR, decoded.performerId);
    if (!fs.existsSync(performerDir)) {
        fs.mkdirSync(performerDir, { recursive: true });
    }
    var prefs = req.body || {};
    // Limit preferences size to prevent storage abuse
    var prefsStr = JSON.stringify(prefs);
    if (prefsStr.length > 50000) {
        return res.status(400).json({ error: 'Preferences too large (max 50KB)' });
    }
    writeJsonAtomic(path.join(performerDir, 'preferences.json'), prefs);
    console.log('Preferences saved for performer ' + decoded.performerId.substring(0, 8) + '...');
    res.json({ saved: true });
});

// ─── Room-based sync state ──────────────────────────────────────────────────

const DEFAULT_ROOM = 'default';
const rooms = new Map();

function createRoomState() {
    return {
        isPlaying: false,
        currentScoreTimeMs: 0,
        scoreTimeOffset: 0,
        currentBpm: 60,
        currentBeatsPerPage: 8,
        tempoHistory: [
            { scoreTimeMs: 0, bpm: 60, beatsPerPage: 8 }
        ],
        clientCount: 0,
        connectedPerformers: [], // Phase 7: { performerId, displayName, slot, socketId }
        graceTimer: null,
        // Phase 8 Stage 5b: Leader tracking
        leaderId: null,       // socket.id of the room leader
        // Phase 8 Stage 5a: Room-based looping
        loopStartMs: null,
        loopEndMs: null,
        loopEnabled: false,
        loopCount: 0,
        // Phase 11: Auto-stop
        totalDurationMs: 0,     // reported by client
        autoStopTimer: null,    // setTimeout ID for end-of-score stop
        // Phase 11 Stage 2: Performance mode readiness
        mode: 'rehearsal',      // 'rehearsal' or 'performance'
        readyPerformers: {},    // socketId → true
        performanceModeClients: {} // socketId → true (clients in readiness/performance)
    };
}

function getRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createRoomState());
        console.log('Room created: ' + roomId);
    }
    var room = rooms.get(roomId);
    // Cancel any pending cleanup if someone is joining
    if (room.graceTimer) {
        clearTimeout(room.graceTimer);
        room.graceTimer = null;
        console.log('Room ' + roomId + ': grace period cancelled (client reconnected)');
    }
    return room;
}

function startGracePeriod(roomId) {
    var room = rooms.get(roomId);
    if (!room || room.clientCount > 0) return;

    // Freeze score time if still playing so reconnecting clients get correct position
    if (room.isPlaying) {
        room.currentScoreTimeMs = getRoomScoreTimeMs(room);
        room.isPlaying = false;
    }

    console.log('Room ' + roomId + ': grace period started (' + (gracePeriodMs / 1000) + 's)');
    room.graceTimer = setTimeout(function() {
        // Double-check no one reconnected
        if (room.clientCount === 0) {
            rooms.delete(roomId);
            console.log('Room ' + roomId + ': cleaned up after grace period');
        }
    }, gracePeriodMs);
}

function getRoomScoreTimeMs(room) {
    if (room.isPlaying) {
        return Date.now() - room.scoreTimeOffset;
    } else {
        return room.currentScoreTimeMs;
    }
}

// ─── Phase 11: Auto-stop helpers ──────────────────────────────────────────────

function scheduleAutoStop(roomId) {
    var room = rooms.get(roomId);
    if (!room || !room.isPlaying || room.totalDurationMs <= 0) return;
    cancelAutoStop(roomId);

    var currentMs = getRoomScoreTimeMs(room);
    var remainingMs = room.totalDurationMs - currentMs;
    if (remainingMs <= 0) {
        // Already past end — stop immediately
        remainingMs = 0;
    }

    console.log('[' + roomId + '] Auto-stop scheduled in ' + (remainingMs / 1000).toFixed(1) + 's');
    room.autoStopTimer = setTimeout(function() {
        room.autoStopTimer = null;
        if (!room.isPlaying) return; // already stopped
        room.currentScoreTimeMs = room.totalDurationMs;
        room.isPlaying = false;

        console.log('[' + roomId + '] Auto-stop: end of score at ' + (room.totalDurationMs / 1000).toFixed(1) + 's');
        io.to(roomId).emit('scoreStop', {
            isPlaying: false,
            currentScoreTimeMs: room.currentScoreTimeMs,
            reason: 'end-of-score',
            serverTime: Date.now()
        });
        // Stage 7: Reset room mode so reconnecting clients don't auto-rejoin
        room.mode = 'rehearsal';
        room.readyPerformers = {};
        room.performanceModeClients = {};
    }, remainingMs);
}

function cancelAutoStop(roomId) {
    var room = rooms.get(roomId);
    if (room && room.autoStopTimer) {
        clearTimeout(room.autoStopTimer);
        room.autoStopTimer = null;
    }
}

// ─── Phase 11 Stage 2: Readiness helpers ─────────────────────────────────────

function broadcastReadiness(roomId) {
    var room = rooms.get(roomId);
    if (!room) return;
    var readyList = Object.keys(room.readyPerformers);
    var perfCount = Object.keys(room.performanceModeClients).length;
    io.to(roomId).emit('readinessUpdate', {
        readyPerformers: readyList,
        readyCount: readyList.length,
        totalCount: perfCount,
        allReady: readyList.length >= perfCount && perfCount > 0
    });
}

// ─── Phase 8 Stage 5b: Leader helpers ────────────────────────────────────────

function assignLeader(roomId, newLeaderId) {
    var room = rooms.get(roomId);
    if (!room) return;
    room.leaderId = newLeaderId;
    console.log('[' + roomId + '] Leader is now: ' + (newLeaderId || 'none'));
    io.to(roomId).emit('leaderChange', { leaderId: newLeaderId });
}

function transferLeaderOnDisconnect(roomId) {
    var room = rooms.get(roomId);
    if (!room) return;
    // Pick next connected performer first
    if (room.connectedPerformers.length > 0) {
        assignLeader(roomId, room.connectedPerformers[0].socketId);
    } else if (room.clientCount > 0) {
        // Anonymous clients: use Socket.IO room membership to find remaining sockets
        var roomSockets = io.sockets.adapter.rooms.get(roomId);
        var oldLeaderId = room.leaderId;
        if (roomSockets && roomSockets.size > 0) {
            var nextId = null;
            for (var sid of roomSockets) {
                if (sid !== oldLeaderId) { nextId = sid; break; }
            }
            if (nextId) {
                assignLeader(roomId, nextId);
            } else {
                room.leaderId = null;
            }
        } else {
            room.leaderId = null;
        }
    } else {
        room.leaderId = null;
    }
}

function isLeader(room, socketId) {
    // If no leader set, first command claims leadership
    if (!room.leaderId) return true;
    return room.leaderId === socketId;
}

// ─── Socket.IO connection handling ──────────────────────────────────────────

// Phase 7: Socket.IO middleware — extract performer info from JWT if present
// Does NOT reject connections without JWT (anonymous fallback preserved)
io.use(function(socket, next) {
    var token = socket.handshake.auth && socket.handshake.auth.token;
    if (token) {
        try {
            var decoded = jwt.verify(token, jwtSecret);
            socket.performer = {
                performerId: decoded.performerId,
                displayName: decoded.displayName,
                slot: decoded.slot,
                sessionId: decoded.sessionId
            };
        } catch (err) {
            console.log('Client ' + socket.id + ': invalid JWT (' + err.message + ')');
            // Don't reject — allow as anonymous
        }
    }
    next();
});

io.on('connection', function(socket) {
    var isAuth = !!socket.performer;
    console.log('Client connected: ' + socket.id + (isAuth ? ' (auth: ' + socket.performer.displayName + ' / ' + socket.performer.slot + ')' : ' (anonymous)'));
    var socketRoomId = null;

    // Send immediate clock sync
    socket.emit('clockSync', { serverTime: Date.now() });

    // Helper: get all room members (auth + anonymous) for Transfer UI
    function getRoomMembers(roomId) {
        var room = rooms.get(roomId);
        if (!room) return [];
        var members = [];
        var roomSockets = io.sockets.adapter.rooms.get(roomId);
        if (roomSockets) {
            for (var sid of roomSockets) {
                var s = io.sockets.sockets.get(sid);
                var name = 'Anonymous';
                if (s && s.performer) name = s.performer.displayName;
                members.push({ socketId: sid, displayName: name });
            }
        }
        return members;
    }

    // Helper: remove performer from room's connectedPerformers
    function removePerformerFromRoom(roomId) {
        var room = rooms.get(roomId);
        if (room && socket.performer) {
            room.connectedPerformers = room.connectedPerformers.filter(function(p) {
                return p.socketId !== socket.id;
            });
            socket.to(roomId).emit('playerLeft', {
                performerId: socket.performer.performerId,
                displayName: socket.performer.displayName,
                slot: socket.performer.slot,
                connectedPerformers: room.connectedPerformers,
                roomMembers: getRoomMembers(roomId)
            });
        }
    }

    // Helper: add performer to room's connectedPerformers
    function addPerformerToRoom(roomId) {
        var room = rooms.get(roomId);
        if (room && socket.performer) {
            // Remove stale entry for same performerId (reconnection)
            room.connectedPerformers = room.connectedPerformers.filter(function(p) {
                return p.performerId !== socket.performer.performerId;
            });
            room.connectedPerformers.push({
                performerId: socket.performer.performerId,
                displayName: socket.performer.displayName,
                slot: socket.performer.slot,
                socketId: socket.id
            });
            io.to(roomId).emit('playerJoined', {
                performerId: socket.performer.performerId,
                displayName: socket.performer.displayName,
                slot: socket.performer.slot,
                connectedPerformers: room.connectedPerformers,
                roomMembers: getRoomMembers(roomId)
            });
        }
    }

    // JOIN ROOM — client sends roomId, server joins socket to that room
    // Authenticated clients: auto-use sessionId from JWT as roomId
    socket.on('joinRoom', function(data) {
        var roomId;
        if (socket.performer) {
            // Authenticated: use session code as room ID
            roomId = socket.performer.sessionId;
        } else {
            // Anonymous: use provided roomId or default
            roomId = (data && data.roomId) || DEFAULT_ROOM;
        }

        // Leave previous room if switching
        if (socketRoomId && socketRoomId !== roomId) {
            socket.leave(socketRoomId);
            var prevRoom = rooms.get(socketRoomId);
            if (prevRoom) {
                prevRoom.clientCount--;
                removePerformerFromRoom(socketRoomId);
                console.log('Client ' + socket.id + ' left room ' + socketRoomId + ' (' + prevRoom.clientCount + ' clients)');
            }
        }

        socketRoomId = roomId;
        socket.join(roomId);
        var room = getRoom(roomId);
        // Reset to zero when first client joins an empty room (new session).
        // Mid-session reconnects (other clients still present) keep position.
        // Performance mode will override this with full grace-period resume.
        if (room.clientCount === 0) {
            room.currentScoreTimeMs = 0;
            room.scoreTimeOffset = 0;
            room.isPlaying = false;
            console.log('Room ' + roomId + ': reset to zero (first client join)');
        }
        room.clientCount++;
        addPerformerToRoom(roomId);

        // Assign leader if none exists
        if (!room.leaderId) {
            assignLeader(roomId, socket.id);
        }

        // Broadcast updated room members to all (covers anonymous clients)
        io.to(roomId).emit('roomMembers', { roomMembers: getRoomMembers(roomId) });

        console.log('Client ' + socket.id + ' joined room ' + roomId + ' (' + room.clientCount + ' clients)');

        // Send full score state for initial sync
        socket.emit('scoreState', {
            isPlaying: room.isPlaying,
            currentScoreTimeMs: room.currentScoreTimeMs,
            scoreTimeOffset: room.scoreTimeOffset,
            tempoHistory: room.tempoHistory,
            connectedPerformers: room.connectedPerformers,
            roomMembers: getRoomMembers(roomId),
            leaderId: room.leaderId,
            mode: room.mode,  // Phase 11 Stage 5: tab recovery
            serverTime: Date.now()
        });
        // Send loop state if active
        if (room.loopStartMs !== null || room.loopEndMs !== null || room.loopEnabled) {
            socket.emit('loopState', {
                loopStartMs: room.loopStartMs,
                loopEndMs: room.loopEndMs,
                loopEnabled: room.loopEnabled,
                loopCount: room.loopCount
            });
        }
    });

    // For clients that don't send joinRoom (backward compat), auto-join default
    setTimeout(function() {
        if (!socketRoomId) {
            socketRoomId = DEFAULT_ROOM;
            socket.join(DEFAULT_ROOM);
            var room = getRoom(DEFAULT_ROOM);
            // Reset to zero when first client joins an empty room
            if (room.clientCount === 0) {
                room.currentScoreTimeMs = 0;
                room.scoreTimeOffset = 0;
                room.isPlaying = false;
                console.log('Room ' + DEFAULT_ROOM + ': reset to zero (first client auto-join)');
            }
            room.clientCount++;
            addPerformerToRoom(DEFAULT_ROOM);
            // Assign leader if none exists
            if (!room.leaderId) {
                assignLeader(DEFAULT_ROOM, socket.id);
            }

            console.log('Client ' + socket.id + ' auto-joined default room (' + room.clientCount + ' clients)');
            socket.emit('scoreState', {
                isPlaying: room.isPlaying,
                currentScoreTimeMs: room.currentScoreTimeMs,
                scoreTimeOffset: room.scoreTimeOffset,
                tempoHistory: room.tempoHistory,
                connectedPerformers: room.connectedPerformers,
                leaderId: room.leaderId,
                serverTime: Date.now()
            });
            // Send loop state if active
            if (room.loopStartMs !== null || room.loopEndMs !== null || room.loopEnabled) {
                socket.emit('loopState', {
                    loopStartMs: room.loopStartMs,
                    loopEndMs: room.loopEndMs,
                    loopEnabled: room.loopEnabled,
                    loopCount: room.loopCount
                });
            }
        }
    }, 500);

    // REQUEST STATE — client asks for current room state (e.g., after score.json loads)
    // Emits scoreGoto (which triggers GraphicTimeline.onGoto for page navigation)
    // followed by scoreGo if the room is currently playing.
    socket.on('requestState', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (room) {
            var currentMs = room.isPlaying ? getRoomScoreTimeMs(room) : room.currentScoreTimeMs;
            var targetSeconds = currentMs / 1000;

            // scoreGoto triggers page navigation via CursorControls.onScoreGoto
            socket.emit('scoreGoto', {
                isPlaying: false,
                currentScoreTimeMs: currentMs,
                targetSeconds: targetSeconds,
                tempoHistory: room.tempoHistory,
                serverTime: Date.now()
            });

            // If room is playing, resume playback after navigation
            if (room.isPlaying) {
                socket.emit('scoreGo', {
                    isPlaying: true,
                    scoreTimeOffset: room.scoreTimeOffset,
                    currentScoreTimeMs: currentMs,
                    serverTime: Date.now()
                });
            }

            // Send loop state if active
            if (room.loopStartMs !== null || room.loopEndMs !== null || room.loopEnabled) {
                socket.emit('loopState', {
                    loopStartMs: room.loopStartMs,
                    loopEndMs: room.loopEndMs,
                    loopEnabled: room.loopEnabled,
                    loopCount: room.loopCount
                });
            }
        }
    });

    // RTT measurement
    socket.on('pingRequest', function(clientData) {
        socket.emit('pongResponse', {
            serverTime: Date.now(),
            clientSendTime: clientData.clientSendTime
        });
    });

    // Phase 11: Client reports total score duration for auto-stop
    socket.on('reportScoreDuration', function(data) {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (room && data && typeof data.totalDurationMs === 'number' && data.totalDurationMs > 0 && data.totalDurationMs < 86400000) {
            room.totalDurationMs = data.totalDurationMs;
            console.log('[' + socketRoomId + '] Score duration reported: ' + (data.totalDurationMs / 1000).toFixed(1) + 's by ' + socket.id);
        }
    });

    // GO — start playback (leader-gated)
    socket.on('scoreGo', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'scoreGo' });
            return;
        }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        if (!room.isPlaying) {
            var now = Date.now();
            room.scoreTimeOffset = now - room.currentScoreTimeMs;
            room.isPlaying = true;

            console.log('[' + socketRoomId + '] Score GO by ' + socket.id + ' — starting from ' + room.currentScoreTimeMs + 'ms');
            var scheduledStart = now + 150; // Phase 13: 150ms buffer for latency-compensated start
            io.to(socketRoomId).emit('scoreGo', {
                isPlaying: true,
                scoreTimeOffset: room.scoreTimeOffset,
                currentScoreTimeMs: room.currentScoreTimeMs,
                serverTime: now,
                scheduledStartTime: scheduledStart
            });

            // Phase 11: Schedule auto-stop at end of score
            scheduleAutoStop(socketRoomId);
        }
    });

    // STOP — stop playback (leader-gated)
    socket.on('scoreStop', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'scoreStop' });
            return;
        }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        if (room.isPlaying) {
            cancelAutoStop(socketRoomId); // Phase 11
            room.currentScoreTimeMs = getRoomScoreTimeMs(room);
            room.isPlaying = false;

            console.log('[' + socketRoomId + '] Score STOP by ' + socket.id + ' — frozen at ' + room.currentScoreTimeMs + 'ms');
            io.to(socketRoomId).emit('scoreStop', {
                isPlaying: false,
                currentScoreTimeMs: room.currentScoreTimeMs,
                serverTime: Date.now()
            });
        }
    });

    // GOTO — jump to specific time position (stops playback) (leader-gated)
    socket.on('scoreGoto', function(data) {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'scoreGoto' });
            return;
        }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        var targetSeconds = Number(data.seconds) || 0;
        if (targetSeconds < 0 || targetSeconds > 86400) targetSeconds = 0;
        var targetMs = targetSeconds * 1000;

        cancelAutoStop(socketRoomId); // Phase 11
        room.isPlaying = false;
        room.currentScoreTimeMs = targetMs;

        // Reset tempo history to start from target position
        room.tempoHistory = [
            { scoreTimeMs: 0, bpm: room.currentBpm, beatsPerPage: room.currentBeatsPerPage }
        ];

        console.log('[' + socketRoomId + '] Score GOTO ' + targetSeconds + 's by ' + socket.id);
        io.to(socketRoomId).emit('scoreGoto', {
            isPlaying: false,
            currentScoreTimeMs: room.currentScoreTimeMs,
            targetSeconds: targetSeconds,
            tempoHistory: room.tempoHistory,
            serverTime: Date.now()
        });
    });

    // ─── Phase 8 Stage 5a: Room-based looping ─────────────────────────────

    // LOOP SET — client sets loop start/end point (leader-gated)
    socket.on('loopSet', function(data) {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) { socket.emit('notLeader', { action: 'loopSet' }); return; }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        var timeMs = Number(data.timeMs);
        if (isNaN(timeMs) || timeMs < 0 || timeMs > 86400000) return;
        if (data.point === 'A') {
            room.loopStartMs = timeMs;
        } else if (data.point === 'B') {
            room.loopEndMs = timeMs;
            // Auto-swap if B < A
            if (room.loopStartMs !== null && room.loopEndMs < room.loopStartMs) {
                var tmp = room.loopStartMs;
                room.loopStartMs = room.loopEndMs;
                room.loopEndMs = tmp;
            }
        }
        room.loopCount = 0;
        console.log('[' + socketRoomId + '] Loop ' + data.point + ' set to ' + data.timeMs + 'ms by ' + socket.id);
        io.to(socketRoomId).emit('loopState', {
            loopStartMs: room.loopStartMs,
            loopEndMs: room.loopEndMs,
            loopEnabled: room.loopEnabled,
            loopCount: room.loopCount
        });
    });

    // LOOP TOGGLE — enable/disable loop (leader-gated)
    socket.on('loopToggle', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) { socket.emit('notLeader', { action: 'loopToggle' }); return; }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        if (room.loopStartMs === null || room.loopEndMs === null) return;
        room.loopEnabled = !room.loopEnabled;
        if (room.loopEnabled) room.loopCount = 0;
        console.log('[' + socketRoomId + '] Loop ' + (room.loopEnabled ? 'ENABLED' : 'DISABLED') + ' by ' + socket.id);
        io.to(socketRoomId).emit('loopState', {
            loopStartMs: room.loopStartMs,
            loopEndMs: room.loopEndMs,
            loopEnabled: room.loopEnabled,
            loopCount: room.loopCount
        });
    });

    // LOOP CLEAR — clear loop region entirely (leader-gated)
    socket.on('loopClear', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!isLeader(room, socket.id)) { socket.emit('notLeader', { action: 'loopClear' }); return; }
        if (!room.leaderId) assignLeader(socketRoomId, socket.id);
        room.loopStartMs = null;
        room.loopEndMs = null;
        room.loopEnabled = false;
        room.loopCount = 0;
        console.log('[' + socketRoomId + '] Loop CLEARED by ' + socket.id);
        io.to(socketRoomId).emit('loopState', {
            loopStartMs: null,
            loopEndMs: null,
            loopEnabled: false,
            loopCount: 0
        });
    });

    // BPM change
    socket.on('setBpm', function(data) {
        if (!socketRoomId || !data) return;
        var bpm = Number(data.bpm);
        if (!bpm || bpm < 1 || bpm > 999) return;
        var room = getRoom(socketRoomId);
        var scoreTime = getRoomScoreTimeMs(room);
        room.currentBpm = bpm;
        room.tempoHistory.push({
            scoreTimeMs: scoreTime,
            bpm: room.currentBpm,
            beatsPerPage: room.currentBeatsPerPage
        });
        console.log('[' + socketRoomId + '] BPM changed to ' + room.currentBpm + ' by ' + socket.id);
        io.to(socketRoomId).emit('bpmChange', { bpm: room.currentBpm, scoreTimeMs: scoreTime });
    });

    // Beats per page change
    socket.on('setBeatsPerPage', function(data) {
        if (!socketRoomId || !data) return;
        var bpp = Number(data.beatsPerPage);
        if (!bpp || bpp < 1 || bpp > 100) return;
        var room = getRoom(socketRoomId);
        var scoreTime = getRoomScoreTimeMs(room);
        room.currentBeatsPerPage = bpp;
        room.tempoHistory.push({
            scoreTimeMs: scoreTime,
            bpm: room.currentBpm,
            beatsPerPage: room.currentBeatsPerPage
        });
        console.log('[' + socketRoomId + '] Beats per page changed to ' + room.currentBeatsPerPage + ' by ' + socket.id);
        io.to(socketRoomId).emit('beatsPerPageChange', { beatsPerPage: room.currentBeatsPerPage, scoreTimeMs: scoreTime });
    });

    // ─── Phase 8 Stage 5b: Leader management ──────────────────────────────

    // SET LEADER — transfer leadership to another socket (leader-only)
    socket.on('setLeader', function(data) {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'setLeader' });
            return;
        }
        var targetId = data && data.targetSocketId;
        if (targetId) {
            assignLeader(socketRoomId, targetId);
            console.log('[' + socketRoomId + '] Leader transferred to ' + targetId + ' by ' + socket.id);
        }
    });

    // RECALL ALL — leader pulls all independent clients back to synced position
    socket.on('recallAll', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'recallAll' });
            return;
        }
        var currentMs = room.isPlaying ? getRoomScoreTimeMs(room) : room.currentScoreTimeMs;
        console.log('[' + socketRoomId + '] RECALL ALL by ' + socket.id + ' at ' + currentMs + 'ms');
        io.to(socketRoomId).emit('recallAll', {
            currentScoreTimeMs: currentMs,
            isPlaying: room.isPlaying,
            scoreTimeOffset: room.scoreTimeOffset,
            tempoHistory: room.tempoHistory,
            serverTime: Date.now()
        });
    });

    // ─── Phase 11 Stage 2: Readiness tracking ──────────────────────────────

    socket.on('enterReadiness', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        room.performanceModeClients[socket.id] = true;
        console.log('[' + socketRoomId + '] Client entered readiness: ' + socket.id + ' (' + Object.keys(room.performanceModeClients).length + ' in perf mode)');
        broadcastReadiness(socketRoomId);
    });

    socket.on('exitReadiness', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        delete room.performanceModeClients[socket.id];
        delete room.readyPerformers[socket.id];
        console.log('[' + socketRoomId + '] Client exited readiness: ' + socket.id);
        broadcastReadiness(socketRoomId);
    });

    socket.on('performerReady', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        room.readyPerformers[socket.id] = true;
        console.log('[' + socketRoomId + '] Performer READY: ' + socket.id + ' (' + Object.keys(room.readyPerformers).length + '/' + room.clientCount + ')');
        broadcastReadiness(socketRoomId);
    });

    socket.on('performerUnready', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        delete room.readyPerformers[socket.id];
        console.log('[' + socketRoomId + '] Performer UNREADY: ' + socket.id);
        broadcastReadiness(socketRoomId);
    });

    // Leader starts performance — countdown then auto-play
    socket.on('performanceStart', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'performanceStart' });
            return;
        }
        room.mode = 'performance';

        // Reset score position to beginning
        room.currentScoreTimeMs = 0;
        room.isPlaying = false;
        cancelAutoStop(socketRoomId);

        var COUNTDOWN_SECONDS = 3;
        var now = Date.now();
        var goTime = now + (COUNTDOWN_SECONDS * 1000);

        console.log('[' + socketRoomId + '] PERFORMANCE START by leader ' + socket.id + ' — countdown ' + COUNTDOWN_SECONDS + 's');

        // Broadcast goto-zero so all clients navigate to start
        io.to(socketRoomId).emit('scoreGoto', {
            isPlaying: false,
            currentScoreTimeMs: 0,
            targetSeconds: 0,
            tempoHistory: room.tempoHistory,
            serverTime: now
        });

        // Broadcast countdown to all clients
        io.to(socketRoomId).emit('performanceStart', {
            serverTime: now,
            countdownSeconds: COUNTDOWN_SECONDS,
            goTime: goTime
        });

        // Schedule scoreGo after countdown
        setTimeout(function() {
            if (!room || room.mode !== 'performance') return;
            var goNow = Date.now();
            room.scoreTimeOffset = goNow - 0; // start from 0ms
            room.isPlaying = true;
            room.currentScoreTimeMs = 0;

            console.log('[' + socketRoomId + '] PERFORMANCE GO — playback starting');
            var scheduledStart = goNow + 150; // Phase 13: latency-compensated start
            io.to(socketRoomId).emit('scoreGo', {
                isPlaying: true,
                scoreTimeOffset: room.scoreTimeOffset,
                currentScoreTimeMs: 0,
                serverTime: goNow,
                scheduledStartTime: scheduledStart
            });

            scheduleAutoStop(socketRoomId);
        }, COUNTDOWN_SECONDS * 1000);
    });

    // Leader ends performance — returns to rehearsal
    socket.on('performanceEnd', function() {
        if (!socketRoomId) return;
        var room = rooms.get(socketRoomId);
        if (!room) return;
        if (!isLeader(room, socket.id)) {
            socket.emit('notLeader', { action: 'performanceEnd' });
            return;
        }
        room.mode = 'rehearsal';
        room.readyPerformers = {};
        console.log('[' + socketRoomId + '] PERFORMANCE END by leader ' + socket.id);
        io.to(socketRoomId).emit('performanceEnd', { serverTime: Date.now() });
    });

    socket.on('disconnect', function() {
        if (socketRoomId) {
            var room = rooms.get(socketRoomId);
            if (room) {
                room.clientCount--;
                delete room.readyPerformers[socket.id];
                delete room.performanceModeClients[socket.id];
                removePerformerFromRoom(socketRoomId);

                // Broadcast updated room members
                io.to(socketRoomId).emit('roomMembers', { roomMembers: getRoomMembers(socketRoomId) });

                console.log('Client ' + socket.id + ' disconnected from room ' + socketRoomId + ' (' + room.clientCount + ' clients)');

                // Transfer leader if disconnecting client was the leader
                if (room.leaderId === socket.id) {
                    transferLeaderOnDisconnect(socketRoomId);
                }

                if (room.clientCount <= 0) {
                    room.clientCount = 0;
                    startGracePeriod(socketRoomId);
                }
            }
        } else {
            console.log('Client disconnected: ' + socket.id);
        }
    });
});

// ─── Periodic clock sync broadcast ─────────────────────────────────────────

setInterval(function() {
    // Broadcast clock sync to each active room
    var now = Date.now();
    for (var roomId of rooms.keys()) {
        io.to(roomId).emit('clockSync', { serverTime: now });
    }
}, SYNC_INTERVAL_MS);

// ─── Phase 13: Server heartbeat (every 500ms) — fast disconnect detection ────

var heartbeatSeq = 0;
setInterval(function() {
    var now = Date.now();
    for (var roomId of rooms.keys()) {
        io.to(roomId).emit('heartbeat', { seq: heartbeatSeq, serverTime: now });
    }
    heartbeatSeq++;
}, 500);

// ─── Phase 6: Authoritative position check (every 3s during playback) ──────

setInterval(function() {
    var now = Date.now();
    for (var [roomId, room] of rooms.entries()) {
        if (room.isPlaying && room.clientCount > 0) {
            var scoreTimeMs = now - room.scoreTimeOffset;
            io.to(roomId).emit('scorePositionCheck', {
                scoreTimeMs: scoreTimeMs,
                serverTime: now
            });
        }
    }
}, 3000);

// ─── Phase 8 Stage 5a: Server-side loop check (every 200ms) ─────────────────

setInterval(function() {
    var now = Date.now();
    for (var [roomId, room] of rooms.entries()) {
        if (!room.isPlaying || !room.loopEnabled) continue;
        if (room.loopStartMs === null || room.loopEndMs === null) continue;
        if (room.clientCount <= 0) continue;

        var scoreTimeMs = now - room.scoreTimeOffset;
        if (scoreTimeMs >= room.loopEndMs) {
            // Rewind: jump to loop start and resume playback
            room.currentScoreTimeMs = room.loopStartMs;
            room.scoreTimeOffset = now - room.loopStartMs;
            room.loopCount++;

            // Broadcast goto (stops playback on clients, sets position)
            io.to(roomId).emit('scoreGoto', {
                isPlaying: false,
                currentScoreTimeMs: room.loopStartMs,
                targetSeconds: room.loopStartMs / 1000,
                tempoHistory: room.tempoHistory,
                serverTime: now
            });

            // Immediately restart playback from loop start
            io.to(roomId).emit('scoreGo', {
                isPlaying: true,
                scoreTimeOffset: room.scoreTimeOffset,
                currentScoreTimeMs: room.loopStartMs,
                serverTime: now
            });

            // Broadcast updated loop count
            io.to(roomId).emit('loopState', {
                loopStartMs: room.loopStartMs,
                loopEndMs: room.loopEndMs,
                loopEnabled: room.loopEnabled,
                loopCount: room.loopCount
            });

            console.log('[' + roomId + '] Loop ' + room.loopCount + ': rewind to ' + (room.loopStartMs / 1000).toFixed(1) + 's');
        }
    }
}, 200);

// ─── Start server ───────────────────────────────────────────────────────────

server.listen(PORT, function() {
    console.log('\n═══ Performance Score Server ═══');
    console.log('  URL: http://localhost:' + PORT);
    console.log('  Serving: builds/performance/');
    console.log('  Socket.IO: enabled (room-based state)');
    console.log('  Clock sync interval: ' + SYNC_INTERVAL_MS + 'ms');
    console.log('');
});

server.on('error', function(err) {
    if (err.code === 'EADDRINUSE') {
        console.error('Port ' + PORT + ' already in use.');
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});
