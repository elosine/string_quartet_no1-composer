const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Enable JSON body parsing (large limit for audio file migration)
app.use(express.json({ limit: '200mb' }));

const PORT = 5000;
const SYNC_INTERVAL_MS = 1000; // Send sync every 1 second (typical for clock sync)
const SCORES_DIR = path.join(__dirname, 'scores');
const VERSIONS_DIR = path.join(__dirname, 'scores', 'versions');

// Ensure scores directories exist
if (!fs.existsSync(SCORES_DIR)) {
    fs.mkdirSync(SCORES_DIR, { recursive: true });
}
if (!fs.existsSync(VERSIONS_DIR)) {
    fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

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

// ============================================
// SCORE PERSISTENCE SYSTEM
// ============================================

// Current loaded score name
let currentScoreName = 'untitled';

// Registered data sources that can be saved/loaded
// Each source: { name, getData: () => data, setData: (data) => void }
const registeredDataSources = new Map();

// Server-side score data (authoritative copy)
let scoreData = {
    version: '1.0',
    metadata: {
        title: 'Untitled Score',
        created: new Date().toISOString(),
        modified: new Date().toISOString(),
        author: ''
    },
    tempoHistory: [],
    midiTracks: [
        { channel: 1, midiEvents: [] },
        { channel: 2, midiEvents: [] },
        { channel: 3, midiEvents: [] },
        { channel: 4, midiEvents: [] }
    ],
    graphicTracks: [
        { graphicItems: [] },
        { graphicItems: [] },
        { graphicItems: [] },
        { graphicItems: [] }
    ],
    databases: {
        curves: { curves: [], nextId: 1 },
        notation: { items: [], nextId: 1 },
        gcs: { gcs: [], nextId: 1 }
    },
    svgGraphics: []
};

// Generate version filename with timestamp
function generateVersionFilename(scoreName) {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    return `${scoreName}_v${timestamp}.json`;
}

// Save score to file with version control
function saveScore(scoreName, data, createVersion = true) {
    const filename = `${scoreName}.json`;
    const filepath = path.join(SCORES_DIR, filename);
    
    // Update metadata
    data.metadata.modified = new Date().toISOString();
    
    // Create version backup before overwriting
    if (createVersion && fs.existsSync(filepath)) {
        const versionFilename = generateVersionFilename(scoreName);
        const versionPath = path.join(VERSIONS_DIR, versionFilename);
        const existingData = fs.readFileSync(filepath, 'utf8');
        fs.writeFileSync(versionPath, existingData);
        console.log(`Version backup created: ${versionFilename}`);
    }
    
    // Save current score
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Score saved: ${filename}`);
    
    return { success: true, filename, modified: data.metadata.modified };
}

// Load score from file
function loadScore(scoreName) {
    const filename = `${scoreName}.json`;
    const filepath = path.join(SCORES_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return { success: false, error: 'Score not found' };
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return { success: true, data, filename };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// List all saved scores
function listScores() {
    const files = fs.readdirSync(SCORES_DIR)
        .filter(f => f.endsWith('.json') && !fs.statSync(path.join(SCORES_DIR, f)).isDirectory())
        .map(f => {
            const filepath = path.join(SCORES_DIR, f);
            const stats = fs.statSync(filepath);
            try {
                const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                return {
                    name: f.replace('.json', ''),
                    filename: f,
                    title: data.metadata?.title || f.replace('.json', ''),
                    modified: data.metadata?.modified || stats.mtime.toISOString(),
                    size: stats.size
                };
            } catch {
                return {
                    name: f.replace('.json', ''),
                    filename: f,
                    title: f.replace('.json', ''),
                    modified: stats.mtime.toISOString(),
                    size: stats.size
                };
            }
        });
    return files;
}

// List versions for a score
function listVersions(scoreName) {
    const prefix = `${scoreName}_v`;
    const files = fs.readdirSync(VERSIONS_DIR)
        .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
        .map(f => {
            const filepath = path.join(VERSIONS_DIR, f);
            const stats = fs.statSync(filepath);
            return {
                filename: f,
                created: stats.mtime.toISOString(),
                size: stats.size
            };
        })
        .sort((a, b) => new Date(b.created) - new Date(a.created));
    return files;
}

// Load a specific version
function loadVersion(versionFilename) {
    const filepath = path.join(VERSIONS_DIR, versionFilename);
    
    if (!fs.existsSync(filepath)) {
        return { success: false, error: 'Version not found' };
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        return { success: true, data, filename: versionFilename };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

// ============================================
// REST API ENDPOINTS FOR SCORE PERSISTENCE
// ============================================

// Save score
app.post('/api/score/save', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) {
        return res.status(400).json({ success: false, error: 'Name and data required' });
    }
    
    const result = saveScore(name, data);
    if (result.success) {
        scoreData = data;
        currentScoreName = name;
        // Broadcast to all clients that score was saved
        io.emit('scoreSaved', { name, modified: result.modified });
    }
    res.json(result);
});

// Load score
app.get('/api/score/load/:name', (req, res) => {
    const result = loadScore(req.params.name);
    if (result.success) {
        scoreData = result.data;
        currentScoreName = req.params.name;
        // Update server tempo state from loaded score
        if (result.data.tempoHistory && result.data.tempoHistory.length > 0) {
            tempoHistory = result.data.tempoHistory;
            const latest = tempoHistory[tempoHistory.length - 1];
            currentBpm = latest.bpm;
            currentBeatsPerPage = latest.beatsPerPage;
        }
    }
    res.json(result);
});

// Load score and broadcast to all clients
app.post('/api/score/load-broadcast/:name', (req, res) => {
    const result = loadScore(req.params.name);
    if (result.success) {
        scoreData = result.data;
        currentScoreName = req.params.name;
        // Update server tempo state from loaded score
        if (result.data.tempoHistory && result.data.tempoHistory.length > 0) {
            tempoHistory = result.data.tempoHistory;
            const latest = tempoHistory[tempoHistory.length - 1];
            currentBpm = latest.bpm;
            currentBeatsPerPage = latest.beatsPerPage;
        }
        // Broadcast to all clients to load this score
        io.emit('scoreLoaded', { name: req.params.name, data: result.data });
    }
    res.json(result);
});

// Extract single track data
app.get('/api/score/track/:name/:trackIndex', (req, res) => {
    const result = loadScore(req.params.name);
    if (!result.success) {
        return res.json(result);
    }
    
    const trackIndex = parseInt(req.params.trackIndex) - 1; // Convert 1-based to 0-based
    if (trackIndex < 0 || trackIndex > 3) {
        return res.json({ success: false, error: 'Track index must be 1-4' });
    }
    
    const trackData = {
        trackIndex: trackIndex + 1,
        midi: result.data.midiTracks?.[trackIndex] || { channel: trackIndex, midiEvents: [] },
        graphics: result.data.graphicTracks?.[trackIndex] || { graphicItems: [] },
        svgElements: (result.data.svgElements || []).filter(el => el.track === trackIndex + 1),
        curves: (result.data.databases?.curves?.curves || []).filter(c => c.gTrack === trackIndex + 1)
    };
    
    res.json({ success: true, data: trackData });
});

// List all scores
app.get('/api/scores', (req, res) => {
    res.json(listScores());
});

// List versions for a score
app.get('/api/score/versions/:name', (req, res) => {
    res.json(listVersions(req.params.name));
});

// Load a specific version
app.get('/api/score/version/:filename', (req, res) => {
    res.json(loadVersion(req.params.filename));
});

// Get current score data
app.get('/api/score/current', (req, res) => {
    res.json({
        name: currentScoreName,
        data: scoreData
    });
});

// Export as MIDI file (returns the MIDI data for client to download)
app.post('/api/score/export/midi', (req, res) => {
    // MIDI export is handled client-side, this just confirms the data
    res.json({ success: true, message: 'Use client-side MIDI export' });
});

// ============================================
// CURVE LIBRARY SYSTEM
// ============================================

const CURVE_LIBRARY_DIR = path.join(__dirname, 'curve_library');

// Ensure curve library directory exists
if (!fs.existsSync(CURVE_LIBRARY_DIR)) {
    fs.mkdirSync(CURVE_LIBRARY_DIR, { recursive: true });
}

// Save curve to library
app.post('/api/curve-library/save', (req, res) => {
    const { curveData } = req.body;
    if (!curveData || !curveData.name) {
        return res.status(400).json({ success: false, error: 'Curve data with name required' });
    }
    
    const filename = `${curveData.name}.json`;
    const filepath = path.join(CURVE_LIBRARY_DIR, filename);
    
    try {
        curveData.savedAt = new Date().toISOString();
        fs.writeFileSync(filepath, JSON.stringify(curveData, null, 2));
        console.log(`Curve saved to library: ${filename}`);
        res.json({ success: true, filename, name: curveData.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all curves in library
app.get('/api/curve-library/list', (req, res) => {
    try {
        const files = fs.readdirSync(CURVE_LIBRARY_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(CURVE_LIBRARY_DIR, f);
                try {
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                    return {
                        name: data.name,
                        filename: f,
                        description: data.description || '',
                        savedAt: data.savedAt || '',
                        gTrack: data.gTrack,
                        duration: data.endSeconds - data.startSeconds
                    };
                } catch {
                    return null;
                }
            })
            .filter(f => f !== null)
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        res.json({ success: true, curves: files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Load curve from library
app.get('/api/curve-library/load/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(CURVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Curve not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({ success: true, curveData: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete curve from library
app.delete('/api/curve-library/delete/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(CURVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Curve not found' });
    }
    
    try {
        fs.unlinkSync(filepath);
        console.log(`Curve deleted from library: ${filename}`);
        res.json({ success: true, name: req.params.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// MOTIVE LIBRARY SYSTEM
// ============================================

const MOTIVE_LIBRARY_DIR = path.join(__dirname, 'motive_library');

// Ensure motive library directory exists
if (!fs.existsSync(MOTIVE_LIBRARY_DIR)) {
    fs.mkdirSync(MOTIVE_LIBRARY_DIR, { recursive: true });
}

// Save motive to library
app.post('/api/motive-library/save', (req, res) => {
    const { motiveData } = req.body;
    if (!motiveData || !motiveData.name) {
        return res.status(400).json({ success: false, error: 'Motive data with name required' });
    }
    
    const filename = `${motiveData.name}.json`;
    const filepath = path.join(MOTIVE_LIBRARY_DIR, filename);
    
    try {
        motiveData.savedAt = new Date().toISOString();
        fs.writeFileSync(filepath, JSON.stringify(motiveData, null, 2));
        console.log(`Motive saved to library: ${filename}`);
        res.json({ success: true, filename, name: motiveData.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all motives in library
app.get('/api/motive-library/list', (req, res) => {
    try {
        const files = fs.readdirSync(MOTIVE_LIBRARY_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(MOTIVE_LIBRARY_DIR, f);
                try {
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                    return {
                        name: data.name,
                        filename: f,
                        description: data.description || '',
                        savedAt: data.savedAt || '',
                        gTrack: data.gTrack,
                        duration: data.duration || (data.endSeconds - data.startSeconds)
                    };
                } catch {
                    return null;
                }
            })
            .filter(f => f !== null)
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        res.json({ success: true, motives: files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Load motive from library
app.get('/api/motive-library/load/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(MOTIVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Motive not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({ success: true, motiveData: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete motive from library
app.delete('/api/motive-library/delete/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(MOTIVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Motive not found' });
    }
    
    try {
        fs.unlinkSync(filepath);
        console.log(`Motive deleted from library: ${filename}`);
        res.json({ success: true, name: req.params.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// MIDI MOTIVE LIBRARY SYSTEM
// ============================================

const MIDI_MOTIVE_LIBRARY_DIR = path.join(__dirname, 'midi_motive_library');

// Ensure MIDI motive library directory exists
if (!fs.existsSync(MIDI_MOTIVE_LIBRARY_DIR)) {
    fs.mkdirSync(MIDI_MOTIVE_LIBRARY_DIR, { recursive: true });
}

// Save MIDI motive to library
app.post('/api/midi-motive-library/save', (req, res) => {
    const { motiveData } = req.body;
    if (!motiveData || !motiveData.name) {
        return res.status(400).json({ success: false, error: 'MIDI motive data with name required' });
    }
    
    const filename = `${motiveData.name}.json`;
    const filepath = path.join(MIDI_MOTIVE_LIBRARY_DIR, filename);
    
    try {
        motiveData.savedAt = new Date().toISOString();
        fs.writeFileSync(filepath, JSON.stringify(motiveData, null, 2));
        console.log(`MIDI motive saved to library: ${filename}`);
        res.json({ success: true, filename, name: motiveData.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all MIDI motives in library
app.get('/api/midi-motive-library/list', (req, res) => {
    try {
        const files = fs.readdirSync(MIDI_MOTIVE_LIBRARY_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(MIDI_MOTIVE_LIBRARY_DIR, f);
                try {
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                    return {
                        name: data.name,
                        filename: f,
                        description: data.description || '',
                        savedAt: data.savedAt || '',
                        noteCount: data.notes ? data.notes.length : 0,
                        durationMs: data.durationMs || 0,
                        durationBeats: data.durationBeats || 0
                    };
                } catch {
                    return null;
                }
            })
            .filter(f => f !== null)
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        res.json({ success: true, motives: files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Load MIDI motive from library
app.get('/api/midi-motive-library/load/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(MIDI_MOTIVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'MIDI motive not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({ success: true, motiveData: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete MIDI motive from library
app.delete('/api/midi-motive-library/delete/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(MIDI_MOTIVE_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'MIDI motive not found' });
    }
    
    try {
        fs.unlinkSync(filepath);
        console.log(`MIDI motive deleted from library: ${filename}`);
        res.json({ success: true, name: req.params.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// GC (GRAVITATIONAL CONDUCTOR) LIBRARY SYSTEM
// ============================================

const GC_LIBRARY_DIR = path.join(__dirname, 'gc_library');

// Ensure GC library directory exists
if (!fs.existsSync(GC_LIBRARY_DIR)) {
    fs.mkdirSync(GC_LIBRARY_DIR, { recursive: true });
}

// Save GC to library
app.post('/api/gc-library/save', (req, res) => {
    const { gcData } = req.body;
    if (!gcData || !gcData.name) {
        return res.status(400).json({ success: false, error: 'GC data with name required' });
    }
    
    const filename = `${gcData.name}.json`;
    const filepath = path.join(GC_LIBRARY_DIR, filename);
    
    try {
        gcData.savedAt = new Date().toISOString();
        fs.writeFileSync(filepath, JSON.stringify(gcData, null, 2));
        console.log(`GC saved to library: ${filename}`);
        res.json({ success: true, filename, name: gcData.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all GCs in library
app.get('/api/gc-library/list', (req, res) => {
    try {
        const files = fs.readdirSync(GC_LIBRARY_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(GC_LIBRARY_DIR, f);
                try {
                    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
                    return {
                        name: data.name,
                        filename: f,
                        description: data.description || '',
                        savedAt: data.savedAt || '',
                        gTrack: data.gTrack,
                        duration: data.duration
                    };
                } catch {
                    return null;
                }
            })
            .filter(f => f !== null)
            .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
        res.json({ success: true, gcs: files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Load GC from library
app.get('/api/gc-library/load/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(GC_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'GC not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({ success: true, gcData: data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete GC from library
app.delete('/api/gc-library/delete/:name', (req, res) => {
    const filename = `${req.params.name}.json`;
    const filepath = path.join(GC_LIBRARY_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'GC not found' });
    }
    
    try {
        fs.unlinkSync(filepath);
        console.log(`GC deleted from library: ${filename}`);
        res.json({ success: true, name: req.params.name });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// AUDIO FILE SYSTEM
// ============================================

const AUDIO_FILES_DIR = path.join(__dirname, 'public', 'audio_files');

// Ensure audio files directory exists
if (!fs.existsSync(AUDIO_FILES_DIR)) {
    fs.mkdirSync(AUDIO_FILES_DIR, { recursive: true });
}

// Save audio file from base64 data
app.post('/api/audio/save', (req, res) => {
    const { audioData, filename } = req.body;
    if (!audioData || !filename) {
        return res.status(400).json({ success: false, error: 'Audio data and filename required' });
    }
    
    try {
        // Extract base64 data from data URL (format: data:audio/xxx;base64,XXXXX)
        const matches = audioData.match(/^data:audio\/([^;]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ success: false, error: 'Invalid audio data format' });
        }
        
        const extension = matches[1] === 'mpeg' ? 'mp3' : matches[1];
        const base64Data = matches[2];
        
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const safeName = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        const savedFilename = `${safeName}_${timestamp}.${extension}`;
        const filepath = path.join(AUDIO_FILES_DIR, savedFilename);
        
        // Write the file
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filepath, buffer);
        
        console.log(`Audio file saved: ${savedFilename} (${buffer.length} bytes)`);
        res.json({ 
            success: true, 
            filename: savedFilename,
            path: `/audio_files/${savedFilename}`,
            size: buffer.length
        });
    } catch (err) {
        console.error('Error saving audio file:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Check if audio file exists
app.get('/api/audio/exists/:filename', (req, res) => {
    const filepath = path.join(AUDIO_FILES_DIR, req.params.filename);
    const exists = fs.existsSync(filepath);
    res.json({ success: true, exists, filename: req.params.filename });
});

// ============================================
// LILYPOND RENDERING SYSTEM
// ============================================

const { exec } = require('child_process');
const LILYPOND_DIR = path.join(__dirname, 'lilypond_code');
const NOTATION_OUTPUT_DIR = path.join(__dirname, 'public', 'notation');

// Ensure LilyPond directories exist
if (!fs.existsSync(LILYPOND_DIR)) {
    fs.mkdirSync(LILYPOND_DIR, { recursive: true });
}
if (!fs.existsSync(NOTATION_OUTPUT_DIR)) {
    fs.mkdirSync(NOTATION_OUTPUT_DIR, { recursive: true });
}

// Default LilyPond template for clean SVG snippets
const LILYPOND_TEMPLATE = `\\version "2.24.0"

\\paper {
  indent = 0
  line-width = #LINE_WIDTH#\\mm
  ragged-right = ##t
  page-breaking = #ly:one-line-breaking
  left-margin = 0
  right-margin = 0
  top-margin = 0
  bottom-margin = 0
}

\\header { tagline = ##f }

\\layout {
  \\context {
    \\Score
    \\remove "Bar_number_engraver"
  }
}

#MUSIC_CONTENT#
`;

// Render LilyPond code to SVG
app.post('/api/lilypond/render', async (req, res) => {
    const { code, name, lineWidth = 100 } = req.body;
    
    if (!code) {
        return res.status(400).json({ success: false, error: 'LilyPond code required' });
    }
    
    const timestamp = Date.now();
    const safeName = (name || 'snippet').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}_${timestamp}`;
    const lyFile = path.join(LILYPOND_DIR, `${filename}.ly`);
    const outputBase = path.join(NOTATION_OUTPUT_DIR, filename);
    
    // Check if code includes \version - if not, wrap in template
    let finalCode = code;
    if (!code.includes('\\version')) {
        finalCode = LILYPOND_TEMPLATE
            .replace('#LINE_WIDTH#', lineWidth.toString())
            .replace('#MUSIC_CONTENT#', code);
    }
    
    try {
        // Write LilyPond file
        fs.writeFileSync(lyFile, finalCode);
        
        // Execute LilyPond
        const command = `lilypond -dbackend=svg -dno-point-and-click -o "${outputBase}" "${lyFile}"`;
        
        exec(command, { timeout: 30000 }, (err, stdout, stderr) => {
            if (err) {
                console.error('LilyPond error:', stderr);
                return res.status(500).json({ 
                    success: false, 
                    error: 'LilyPond rendering failed',
                    details: stderr 
                });
            }
            
            // Read the generated SVG
            const svgFile = `${outputBase}.svg`;
            if (!fs.existsSync(svgFile)) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'SVG file not generated' 
                });
            }
            
            const svgContent = fs.readFileSync(svgFile, 'utf8');
            
            // Return success with SVG data and file path
            res.json({
                success: true,
                filename: `${filename}.svg`,
                path: `/notation/${filename}.svg`,
                svg: svgContent,
                lilypondFile: `${filename}.ly`
            });
            
            console.log(`LilyPond rendered: ${filename}.svg`);
        });
    } catch (err) {
        console.error('LilyPond processing error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// List all rendered notation files
app.get('/api/lilypond/list', (req, res) => {
    try {
        const svgFiles = fs.readdirSync(NOTATION_OUTPUT_DIR)
            .filter(f => f.endsWith('.svg'))
            .map(f => {
                const filepath = path.join(NOTATION_OUTPUT_DIR, f);
                const stats = fs.statSync(filepath);
                return {
                    filename: f,
                    path: `/notation/${f}`,
                    created: stats.mtime.toISOString(),
                    size: stats.size
                };
            })
            .sort((a, b) => new Date(b.created) - new Date(a.created));
        
        res.json(svgFiles);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get LilyPond source for a notation file
app.get('/api/lilypond/source/:name', (req, res) => {
    const lyFile = path.join(LILYPOND_DIR, `${req.params.name}.ly`);
    
    if (!fs.existsSync(lyFile)) {
        return res.status(404).json({ success: false, error: 'Source file not found' });
    }
    
    const code = fs.readFileSync(lyFile, 'utf8');
    res.json({ success: true, code });
});

// Check if LilyPond file exists
app.get('/api/lilypond/exists/:filename', (req, res) => {
    const lyFile = path.join(LILYPOND_DIR, req.params.filename);
    const exists = fs.existsSync(lyFile);
    res.json({ exists, filename: req.params.filename, path: lyFile });
});

// Create glissando LilyPond file from template
app.post('/api/lilypond/create-glissando', (req, res) => {
    const { filename, clef, startPitch, endPitch, glissOffset, dynamic } = req.body;
    
    if (!filename || !clef || !startPitch || !endPitch) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    const templatePath = path.join(LILYPOND_DIR, 'GlissandoNotationTemplate.ly');
    const outputPath = path.join(LILYPOND_DIR, filename);
    
    // Check if template exists
    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ success: false, error: 'Template file not found' });
    }
    
    // Always overwrite - each prompt creates fresh notation
    try {
        // Read template
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // Substitute variables
        // Clef: replace "\clef alto" with appropriate clef
        template = template.replace(/\\clef alto/g, `\\clef ${clef}`);
        
        // Start pitch + dynamic: replace "a4\p" with new pitch + dynamic marking
        // Dynamic is a LilyPond dynamic like \p, \ff, \mp, etc. Empty = no dynamic.
        const dynamicMarkup = dynamic ? `\\${dynamic}` : '';
        template = template.replace(/^(\s*)(a4\\p)(\s*$)/m, `$1${startPitch}${dynamicMarkup}$3`);
        
        // End pitch: replace "af4" on the line after END_PITCH comment  
        template = template.replace(/^(\s*)(af4)(\s*$)/m, `$1${endPitch}$3`);
        
        // Gliss offset: replace "#'(0 . 0)" with the offset value
        const offsetValue = glissOffset || '0';
        template = template.replace(/#'\(0 \. 0\)/g, `#'(0 . ${offsetValue})`);
        
        // Write new file
        fs.writeFileSync(outputPath, template);
        
        console.log(`Created glissando LilyPond file: ${filename}`);
        res.json({ success: true, created: true, filename, path: outputPath });
    } catch (err) {
        console.error('Error creating glissando file:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Crop SVG to content bounds (replaces Inkscape cropping)
// Parses LilyPond SVG structure: <g transform="translate(tx,ty)"> containing <line>, <rect>, <path>
function cropSvgToContent(svgFilePath) {
    let content = fs.readFileSync(svgFilePath, 'utf-8');
    
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    function expandBounds(x1, y1, x2, y2) {
        minX = Math.min(minX, x1, x2);
        minY = Math.min(minY, y1, y2);
        maxX = Math.max(maxX, x1, x2);
        maxY = Math.max(maxY, y1, y2);
    }
    
    // Parse SVG path d attribute and compute bounding box in path coordinates
    function getPathBounds(d) {
        const tokens = d.match(/[MmCcLlHhVvSsZz]|[-+]?\d*\.?\d+/g) || [];
        let cx = 0, cy = 0;
        let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
        function addPt(x, y) {
            pMinX = Math.min(pMinX, x); pMinY = Math.min(pMinY, y);
            pMaxX = Math.max(pMaxX, x); pMaxY = Math.max(pMaxY, y);
        }
        let i = 0;
        while (i < tokens.length) {
            const cmd = tokens[i];
            if (!/[A-Za-z]/.test(cmd)) { i++; continue; }
            i++;
            const nums = [];
            while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
                nums.push(parseFloat(tokens[i])); i++;
            }
            if (cmd === 'M') { cx = nums[0]; cy = nums[1]; addPt(cx, cy); }
            else if (cmd === 'm') { cx += nums[0]; cy += nums[1]; addPt(cx, cy); }
            else if (cmd === 'c') {
                for (let j = 0; j < nums.length; j += 6) {
                    addPt(cx + nums[j], cy + nums[j+1]);
                    addPt(cx + nums[j+2], cy + nums[j+3]);
                    cx += nums[j+4]; cy += nums[j+5]; addPt(cx, cy);
                }
            } else if (cmd === 'C') {
                for (let j = 0; j < nums.length; j += 6) {
                    addPt(nums[j], nums[j+1]); addPt(nums[j+2], nums[j+3]);
                    cx = nums[j+4]; cy = nums[j+5]; addPt(cx, cy);
                }
            } else if (cmd === 'l') {
                for (let j = 0; j < nums.length; j += 2) { cx += nums[j]; cy += nums[j+1]; addPt(cx, cy); }
            } else if (cmd === 'L') {
                for (let j = 0; j < nums.length; j += 2) { cx = nums[j]; cy = nums[j+1]; addPt(cx, cy); }
            } else if (cmd === 'h') { for (const n of nums) { cx += n; addPt(cx, cy); } }
            else if (cmd === 'H') { for (const n of nums) { cx = n; addPt(cx, cy); } }
            else if (cmd === 'v') { for (const n of nums) { cy += n; addPt(cx, cy); } }
            else if (cmd === 'V') { for (const n of nums) { cy = n; addPt(cx, cy); } }
            else if (cmd === 's') {
                for (let j = 0; j < nums.length; j += 4) {
                    addPt(cx + nums[j], cy + nums[j+1]);
                    cx += nums[j+2]; cy += nums[j+3]; addPt(cx, cy);
                }
            }
        }
        return { minX: pMinX, minY: pMinY, maxX: pMaxX, maxY: pMaxY };
    }
    
    // Match each <g transform="translate(tx, ty)"> and its child element
    const groupRegex = /<g\s+transform="translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)">\s*\n?\s*<(line|rect|path)\s+([^>]*?)\/>/g;
    let match;
    
    while ((match = groupRegex.exec(content)) !== null) {
        const tx = parseFloat(match[1]);
        const ty = parseFloat(match[2]);
        const tag = match[3];
        const attrs = match[4];
        
        if (tag === 'line') {
            const x1 = parseFloat((attrs.match(/x1="([^"]+)"/) || [])[1] || 0);
            const y1 = parseFloat((attrs.match(/y1="([^"]+)"/) || [])[1] || 0);
            const x2 = parseFloat((attrs.match(/x2="([^"]+)"/) || [])[1] || 0);
            const y2 = parseFloat((attrs.match(/y2="([^"]+)"/) || [])[1] || 0);
            const sw = parseFloat((attrs.match(/stroke-width="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x1, ty + y1 - sw/2, tx + x2, ty + y2 + sw/2);
        } else if (tag === 'rect') {
            const x = parseFloat((attrs.match(/\bx="([^"]+)"/) || [])[1] || 0);
            const y = parseFloat((attrs.match(/\by="([^"]+)"/) || [])[1] || 0);
            const w = parseFloat((attrs.match(/width="([^"]+)"/) || [])[1] || 0);
            const h = parseFloat((attrs.match(/height="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x, ty + y, tx + x + w, ty + y + h);
        } else if (tag === 'path') {
            const scaleMatch = attrs.match(/transform="scale\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)"/);
            const dMatch = attrs.match(/d="([^"]+)"/);
            if (scaleMatch && dMatch) {
                const sx = parseFloat(scaleMatch[1]);
                const sy = parseFloat(scaleMatch[2]);
                const pb = getPathBounds(dMatch[1]);
                // Apply scale (negative scale flips coordinates)
                const x1 = pb.minX * sx, x2 = pb.maxX * sx;
                const y1 = pb.minY * sy, y2 = pb.maxY * sy;
                expandBounds(tx + Math.min(x1,x2), ty + Math.min(y1,y2),
                             tx + Math.max(x1,x2), ty + Math.max(y1,y2));
            } else {
                expandBounds(tx - 0.5, ty - 0.5, tx + 0.5, ty + 0.5);
            }
        }
    }
    
    if (minX === Infinity) {
        throw new Error('No visual elements found in SVG');
    }
    
    // Add small padding
    const pad = 0.1;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;
    
    const cropW = maxX - minX;
    const cropH = maxY - minY;
    
    // Convert viewBox units to mm (LilyPond uses ~1.7573mm per viewBox unit)
    const mmPerUnit = 1.7573;
    const widthMm = (cropW * mmPerUnit).toFixed(2);
    const heightMm = (cropH * mmPerUnit).toFixed(2);
    
    // Replace viewBox
    content = content.replace(
        /viewBox="[^"]+"/,
        `viewBox="${minX.toFixed(4)} ${minY.toFixed(4)} ${cropW.toFixed(4)} ${cropH.toFixed(4)}"`
    );
    
    // Replace width and height
    content = content.replace(/width="[^"]+"/, `width="${widthMm}mm"`);
    content = content.replace(/height="[^"]+"/, `height="${heightMm}mm"`);
    
    fs.writeFileSync(svgFilePath, content, 'utf-8');
    console.log(`  Cropped SVG: viewBox ${minX.toFixed(2)},${minY.toFixed(2)} ${cropW.toFixed(2)}x${cropH.toFixed(2)} → ${widthMm}x${heightMm}mm`);
}

// Render glissando LilyPond file to cropped SVG using PowerShell script
app.post('/api/lilypond/render-glissando', (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ success: false, error: 'Filename required' });
    }
    
    const scriptPath = path.join(LILYPOND_DIR, 'render_glissando.ps1');
    const svgOutputDir = path.join(__dirname, 'public', 'SVG_graphics');
    
    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
        return res.status(404).json({ success: false, error: 'Render script not found' });
    }
    
    // Check if LilyPond file exists
    const lyFile = path.join(LILYPOND_DIR, filename);
    if (!fs.existsSync(lyFile)) {
        return res.status(404).json({ success: false, error: 'LilyPond file not found' });
    }
    
    // Always re-render - each prompt creates fresh SVG
    const baseName = path.basename(filename, '.ly');
    const svgPath = path.join(svgOutputDir, `${baseName}.svg`);
    
    // Execute PowerShell script
    const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Filename "${filename}"`;
    
    exec(command, { timeout: 60000 }, (err, stdout, stderr) => {
        if (err) {
            console.error('Render glissando error:', stderr || err.message);
            return res.status(500).json({ 
                success: false, 
                error: 'Rendering failed',
                details: stderr || err.message
            });
        }
        
        // Parse output for SVG path
        const outputMatch = stdout.match(/OUTPUT:(.+)/);
        const outputPath = outputMatch ? outputMatch[1].trim() : svgPath;
        
        if (fs.existsSync(svgPath)) {
            // Crop SVG to content bounds (replaces Inkscape cropping)
            try {
                cropSvgToContent(svgPath);
                console.log(`Rendered + cropped glissando SVG: ${baseName}.svg`);
            } catch (cropErr) {
                console.warn(`SVG crop warning (using uncropped): ${cropErr.message}`);
            }
            res.json({ 
                success: true, 
                rendered: true,
                svgPath: `/SVG_graphics/${baseName}.svg`,
                fullPath: outputPath
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'SVG not created',
                stdout: stdout,
                stderr: stderr
            });
        }
    });
});

// ============================================
// MIDI FILE SAVING
// ============================================

const MIDI_FILES_DIR = path.join(__dirname, 'public', 'midi_files');

// Ensure MIDI files directory exists
if (!fs.existsSync(MIDI_FILES_DIR)) {
    fs.mkdirSync(MIDI_FILES_DIR, { recursive: true });
}

// Save MIDI file (receives base64-encoded MIDI data)
app.post('/api/midi/save', (req, res) => {
    const { filename, midiData } = req.body;
    
    if (!filename || !midiData) {
        return res.status(400).json({ success: false, error: 'Filename and midiData required' });
    }
    
    try {
        const filepath = path.join(MIDI_FILES_DIR, filename);
        const buffer = Buffer.from(midiData, 'base64');
        fs.writeFileSync(filepath, buffer);
        console.log(`MIDI file saved: ${filename}`);
        res.json({ success: true, filename, path: `/midi_files/${filename}` });
    } catch (err) {
        console.error('Error saving MIDI file:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Check if MIDI file exists
app.get('/api/midi/exists/:filename', (req, res) => {
    const filepath = path.join(MIDI_FILES_DIR, req.params.filename);
    res.json({ exists: fs.existsSync(filepath), filename: req.params.filename });
});

// Delete a notation file
app.delete('/api/lilypond/:filename', (req, res) => {
    const svgFile = path.join(NOTATION_OUTPUT_DIR, req.params.filename);
    const lyFile = path.join(LILYPOND_DIR, req.params.filename.replace('.svg', '.ly'));
    
    try {
        if (fs.existsSync(svgFile)) fs.unlinkSync(svgFile);
        if (fs.existsSync(lyFile)) fs.unlinkSync(lyFile);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// SVG COMPOSER PERSISTENCE
// ============================================

const SVG_COMPOSER_DIR = path.join(__dirname, 'svg_compositions');

// Ensure SVG composer directory exists
if (!fs.existsSync(SVG_COMPOSER_DIR)) {
    fs.mkdirSync(SVG_COMPOSER_DIR, { recursive: true });
}

// Save SVG composition
app.post('/api/svg-composer/save', (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) {
        return res.status(400).json({ success: false, error: 'Name and data required' });
    }
    
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}.json`;
    const filepath = path.join(SVG_COMPOSER_DIR, filename);
    
    try {
        data.metadata = {
            ...data.metadata,
            modified: new Date().toISOString()
        };
        fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
        console.log(`SVG composition saved: ${filename}`);
        res.json({ success: true, filename });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Load SVG composition
app.get('/api/svg-composer/load/:name', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}.json`;
    const filepath = path.join(SVG_COMPOSER_DIR, filename);
    
    if (!fs.existsSync(filepath)) {
        return res.status(404).json({ success: false, error: 'Composition not found' });
    }
    
    try {
        const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        res.json({ success: true, data, filename });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// List SVG compositions
app.get('/api/svg-composer/list', (req, res) => {
    try {
        const files = fs.readdirSync(SVG_COMPOSER_DIR)
            .filter(f => f.endsWith('.json'))
            .map(f => {
                const filepath = path.join(SVG_COMPOSER_DIR, f);
                const stats = fs.statSync(filepath);
                return {
                    name: f.replace('.json', ''),
                    filename: f,
                    modified: stats.mtime.toISOString(),
                    size: stats.size
                };
            })
            .sort((a, b) => new Date(b.modified) - new Date(a.modified));
        res.json(files);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Delete SVG composition
app.delete('/api/svg-composer/:name', (req, res) => {
    const safeName = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeName}.json`;
    const filepath = path.join(SVG_COMPOSER_DIR, filename);
    
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// STATIC FILES AND ROUTES
// ============================================

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve lilypond_code directory for staff header SVGs
app.use('/lilypond_code', express.static(path.join(__dirname, 'lilypond_code')));

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
