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
const { Server } = require('socket.io');

// ─── Config ──────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');
const PERF_DIR = path.join(ROOT, 'builds', 'performance');
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

// ─── Express + Socket.IO setup ──────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from builds/performance/
app.use(express.static(PERF_DIR));

// Serve index.html for the root route
app.get('/', function(req, res) {
    res.sendFile(path.join(PERF_DIR, 'index.html'));
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
        graceTimer: null
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

// ─── Socket.IO connection handling ──────────────────────────────────────────

io.on('connection', function(socket) {
    console.log('Client connected: ' + socket.id);
    var socketRoomId = null;

    // Send immediate clock sync
    socket.emit('clockSync', { serverTime: Date.now() });

    // JOIN ROOM — client sends roomId, server joins socket to that room
    socket.on('joinRoom', function(data) {
        var roomId = (data && data.roomId) || DEFAULT_ROOM;

        // Leave previous room if switching
        if (socketRoomId && socketRoomId !== roomId) {
            socket.leave(socketRoomId);
            var prevRoom = rooms.get(socketRoomId);
            if (prevRoom) {
                prevRoom.clientCount--;
                console.log('Client ' + socket.id + ' left room ' + socketRoomId + ' (' + prevRoom.clientCount + ' clients)');
            }
        }

        socketRoomId = roomId;
        socket.join(roomId);
        var room = getRoom(roomId);
        room.clientCount++;

        console.log('Client ' + socket.id + ' joined room ' + roomId + ' (' + room.clientCount + ' clients)');

        // Send full score state for initial sync
        socket.emit('scoreState', {
            isPlaying: room.isPlaying,
            currentScoreTimeMs: room.currentScoreTimeMs,
            scoreTimeOffset: room.scoreTimeOffset,
            tempoHistory: room.tempoHistory,
            serverTime: Date.now()
        });
    });

    // For clients that don't send joinRoom (backward compat), auto-join default
    setTimeout(function() {
        if (!socketRoomId) {
            socketRoomId = DEFAULT_ROOM;
            socket.join(DEFAULT_ROOM);
            var room = getRoom(DEFAULT_ROOM);
            room.clientCount++;
            console.log('Client ' + socket.id + ' auto-joined default room (' + room.clientCount + ' clients)');
            socket.emit('scoreState', {
                isPlaying: room.isPlaying,
                currentScoreTimeMs: room.currentScoreTimeMs,
                scoreTimeOffset: room.scoreTimeOffset,
                tempoHistory: room.tempoHistory,
                serverTime: Date.now()
            });
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
        }
    });

    // RTT measurement
    socket.on('pingRequest', function(clientData) {
        socket.emit('pongResponse', {
            serverTime: Date.now(),
            clientSendTime: clientData.clientSendTime
        });
    });

    // GO — start playback
    socket.on('scoreGo', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (!room.isPlaying) {
            var now = Date.now();
            room.scoreTimeOffset = now - room.currentScoreTimeMs;
            room.isPlaying = true;

            console.log('[' + socketRoomId + '] Score GO by ' + socket.id + ' — starting from ' + room.currentScoreTimeMs + 'ms');
            io.to(socketRoomId).emit('scoreGo', {
                isPlaying: true,
                scoreTimeOffset: room.scoreTimeOffset,
                currentScoreTimeMs: room.currentScoreTimeMs,
                serverTime: now
            });
        }
    });

    // STOP — stop playback
    socket.on('scoreStop', function() {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        if (room.isPlaying) {
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

    // GOTO — jump to specific time position (stops playback)
    socket.on('scoreGoto', function(data) {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        var targetSeconds = data.seconds || 0;
        var targetMs = targetSeconds * 1000;

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

    // BPM change
    socket.on('setBpm', function(data) {
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        var scoreTime = getRoomScoreTimeMs(room);
        room.currentBpm = data.bpm;
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
        if (!socketRoomId) return;
        var room = getRoom(socketRoomId);
        var scoreTime = getRoomScoreTimeMs(room);
        room.currentBeatsPerPage = data.beatsPerPage;
        room.tempoHistory.push({
            scoreTimeMs: scoreTime,
            bpm: room.currentBpm,
            beatsPerPage: room.currentBeatsPerPage
        });
        console.log('[' + socketRoomId + '] Beats per page changed to ' + room.currentBeatsPerPage + ' by ' + socket.id);
        io.to(socketRoomId).emit('beatsPerPageChange', { beatsPerPage: room.currentBeatsPerPage, scoreTimeMs: scoreTime });
    });

    socket.on('disconnect', function() {
        if (socketRoomId) {
            var room = rooms.get(socketRoomId);
            if (room) {
                room.clientCount--;
                console.log('Client ' + socket.id + ' disconnected from room ' + socketRoomId + ' (' + room.clientCount + ' clients)');
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
