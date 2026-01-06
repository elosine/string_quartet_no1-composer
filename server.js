const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 5000;
const SYNC_INTERVAL_MS = 1000; // Send sync every 1 second (typical for clock sync)

// Shared state for all clients
let currentFrameRate = 60;
let currentBpm = 60;
let currentBeatsPerPage = 8;  // How many beats fit in one page (ScoreTop or ScoreBottom width)

// Score time tracking - score starts STOPPED
// scoreTimeOffset: when score is running, scoreTime = clockTime - scoreTimeOffset
// When stopped, scoreTime is frozen at currentScoreTimeMs
let isPlaying = false;
let currentScoreTimeMs = 0;      // Current score time in ms (frozen when stopped)
let scoreTimeOffset = 0;         // Offset to calculate score time from clock time

// Tempo history for calculating exact cursor positions
// Each entry: { scoreTimeMs, bpm, beatsPerPage } - uses score time, not clock time
let tempoHistory = [
    { scoreTimeMs: 0, bpm: currentBpm, beatsPerPage: currentBeatsPerPage }
];

// Get current score time in ms
function getScoreTimeMs() {
    if (isPlaying) {
        return Date.now() - scoreTimeOffset;
    } else {
        return currentScoreTimeMs;
    }
}

// Calculate total "pages" traveled up to a given score time (in ms)
// A "page" is the width of one ScoreTop or ScoreBottom - position is expressed as percentage
function calculatePagesAtScoreTime(scoreTimeMs) {
    let totalPages = 0;
    for (let i = 0; i < tempoHistory.length; i++) {
        const segment = tempoHistory[i];
        const segmentStart = segment.scoreTimeMs;
        let segmentEnd;
        if (i < tempoHistory.length - 1) {
            segmentEnd = tempoHistory[i + 1].scoreTimeMs;
        } else {
            segmentEnd = scoreTimeMs;
        }
        const segmentDuration = segmentEnd - segmentStart;
        if (segmentDuration > 0) {
            // Calculate pages per ms for this segment
            // msPerBeat = 60000 / bpm
            // beatsPerMs = bpm / 60000
            // pagesPerMs = beatsPerMs / beatsPerPage = bpm / (60000 * beatsPerPage)
            const pagesPerMs = segment.bpm / (60000 * segment.beatsPerPage);
            totalPages += segmentDuration * pagesPerMs;
        }
    }
    return totalPages;
}

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Send immediate sync on connection
    socket.emit('clockSync', { serverTime: Date.now() });
    
    // Send score state for exact sync - includes all info needed to calculate position
    socket.emit('scoreState', {
        isPlaying: isPlaying,
        currentScoreTimeMs: currentScoreTimeMs,
        scoreTimeOffset: scoreTimeOffset,
        tempoHistory: tempoHistory,
        serverTime: Date.now()
    });
    
    // Handle ping request from client for round-trip time calculation
    socket.on('pingRequest', (clientData) => {
        socket.emit('pongResponse', {
            serverTime: Date.now(),
            clientSendTime: clientData.clientSendTime
        });
    });
    
    // Handle frame rate change request - broadcast to all clients
    socket.on('setFrameRate', (data) => {
        currentFrameRate = data.frameRate;
        console.log(`Frame rate changed to ${currentFrameRate} FPS by client ${socket.id}`);
        // Broadcast to all clients (including sender)
        io.emit('frameRateChange', { frameRate: currentFrameRate });
    });
    
    // Handle request for current frame rate
    socket.on('requestFrameRate', () => {
        socket.emit('currentFrameRate', { frameRate: currentFrameRate });
    });
    
    // Handle BPM change request - broadcast to all clients
    socket.on('setBpm', (data) => {
        const scoreTime = getScoreTimeMs();
        currentBpm = data.bpm;
        // Record tempo change in history using score time
        tempoHistory.push({
            scoreTimeMs: scoreTime,
            bpm: currentBpm,
            beatsPerPage: currentBeatsPerPage
        });
        console.log(`BPM changed to ${currentBpm} by client ${socket.id} at score time ${scoreTime}ms`);
        io.emit('bpmChange', { bpm: currentBpm, scoreTimeMs: scoreTime });
    });
    
    // Handle request for current BPM
    socket.on('requestBpm', () => {
        socket.emit('currentBpm', { bpm: currentBpm });
    });
    
    // Handle beats per page change request - broadcast to all clients
    socket.on('setBeatsPerPage', (data) => {
        const scoreTime = getScoreTimeMs();
        currentBeatsPerPage = data.beatsPerPage;
        // Record tempo change in history using score time
        tempoHistory.push({
            scoreTimeMs: scoreTime,
            bpm: currentBpm,
            beatsPerPage: currentBeatsPerPage
        });
        console.log(`Beats per page changed to ${currentBeatsPerPage} by client ${socket.id} at score time ${scoreTime}ms`);
        io.emit('beatsPerPageChange', { beatsPerPage: currentBeatsPerPage, scoreTimeMs: scoreTime });
    });
    
    // Handle request for current beats per page
    socket.on('requestBeatsPerPage', () => {
        socket.emit('currentBeatsPerPage', { beatsPerPage: currentBeatsPerPage });
    });
    
    // Handle GO (start playing)
    socket.on('scoreGo', () => {
        if (!isPlaying) {
            const now = Date.now();
            // Set offset so that scoreTime continues from where it was frozen
            scoreTimeOffset = now - currentScoreTimeMs;
            isPlaying = true;
            
            console.log(`Score GO by client ${socket.id} - starting from ${currentScoreTimeMs}ms`);
            io.emit('scoreGo', {
                isPlaying: true,
                scoreTimeOffset: scoreTimeOffset,
                currentScoreTimeMs: currentScoreTimeMs,
                serverTime: now
            });
        }
    });
    
    // Handle STOP (stop playing)
    socket.on('scoreStop', () => {
        if (isPlaying) {
            // Freeze score time at current position
            currentScoreTimeMs = getScoreTimeMs();
            isPlaying = false;
            
            console.log(`Score STOP by client ${socket.id} - frozen at ${currentScoreTimeMs}ms`);
            io.emit('scoreStop', {
                isPlaying: false,
                currentScoreTimeMs: currentScoreTimeMs,
                serverTime: Date.now()
            });
        }
    });
    
    // Handle GOTO (jump to specific second) - stops score, jumps, stays stopped
    socket.on('scoreGoto', (data) => {
        const targetSeconds = data.seconds || 0;
        const targetMs = targetSeconds * 1000;
        
        // Stop the score and set to target position
        isPlaying = false;
        currentScoreTimeMs = targetMs;
        
        // Reset tempo history to start from target position
        tempoHistory = [
            { scoreTimeMs: 0, bpm: currentBpm, beatsPerPage: currentBeatsPerPage }
        ];
        
        console.log(`Score GOTO ${targetSeconds}s by client ${socket.id}`);
        io.emit('scoreGoto', {
            isPlaying: false,
            currentScoreTimeMs: currentScoreTimeMs,
            targetSeconds: targetSeconds,
            tempoHistory: tempoHistory,
            serverTime: Date.now()
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Broadcast clock sync to all clients at regular intervals
setInterval(() => {
    io.emit('clockSync', { serverTime: Date.now() });
}, SYNC_INTERVAL_MS);

server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
