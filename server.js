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
    // Sort descending by modified date (most recent first)
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));
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

// Get the most recently modified score name (for auto-load after automation)
app.get('/api/score/latest', (req, res) => {
    const scores = listScores();
    if (scores.length === 0) return res.json({ name: null });
    res.json({ name: scores[0].name }); // listScores already sorted descending by modified
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

// Create vibrato LilyPond file from template
app.post('/api/lilypond/create-vibrato', (req, res) => {
    const { filename, direction, clef, pitch, startDynamic, endDynamic } = req.body;
    
    if (!filename || !direction || !clef || !pitch || !startDynamic || !endDynamic) {
        return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    // Select template based on direction
    const templateName = direction === 'wide-narrow' 
        ? 'DynamicVibrato-Wide-Narrow_Template.ly'
        : 'DynamicVibrato-Narrow-Wide_Template.ly';
    const templatePath = path.join(LILYPOND_DIR, templateName);
    const outputPath = path.join(LILYPOND_DIR, filename);
    
    if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ success: false, error: `Template not found: ${templateName}` });
    }
    
    try {
        let template = fs.readFileSync(templatePath, 'utf8');
        
        // 1. Substitute clef (line 84: \clef treble)
        template = template.replace(/\\clef treble/, `\\clef ${clef}`);
        
        // 2. Substitute pitch: c'2 immediately before \startTrillSpan
        //    Strip trailing duration from lpPitch (e.g. "c'4" -> "c'") then append "2" for half note
        const pitchNoDuration = pitch.replace(/\d+$/, '');
        template = template.replace(/(c'2)(\s*\n\s*\\startTrillSpan)/, `${pitchNoDuration}2$2`);
        
        // 3. First dynamic: replace dynamic marking AND zero out Y offset for auto-positioning
        template = template.replace(
            /(extra-offset #'\(0 \. )0\.3(\)[^\n]*\n\s*)\\[a-z]+/,
            `$10$2\\${startDynamic}`
        );
        
        // 4. Second dynamic: replace dynamic marking AND zero out Y offset
        template = template.replace(
            /(extra-offset #'\(-8 \. )0\.3(\)[^\n]*\n\s*)\\[a-z]+/,
            `$10$2\\${endDynamic}`
        );
        
        // 5. Replace fixed Hairpin.Y-offset with DynamicLineSpanner.staff-padding
        //    This lets LilyPond auto-position dynamics just below staff (or below noteheads
        //    if notes extend below the staff)
        template = template.replace(
            /\\override Hairpin\.Y-offset = #-0\.9[^\n]*/,
            '\\override DynamicLineSpanner.staff-padding = #1.2'
        );
        
        // 6. Zero out hairpin extra-offset Y (was 1.2, now let staff-padding handle it)
        template = template.replace(
            /(-\\tweak extra-offset #'\(-0\.5 \. )1\.2(\))/,
            '$10$2'
        );
        
        fs.writeFileSync(outputPath, template);
        console.log(`Created vibrato LilyPond file: ${filename} (${direction}, ${clef}, ${pitch}, ${startDynamic}->${endDynamic})`);
        res.json({ success: true, created: true, filename, path: outputPath });
    } catch (err) {
        console.error('Error creating vibrato file:', err);
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
    
    // Pass 1: Find all <g transform="translate(tx,ty)"> positions and map to their content
    // Build a map of translate groups by finding opening <g> tags with translate transforms
    const translateRegex = /<g\s+transform="translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)">/g;
    let tMatch;
    const translatePositions = [];
    while ((tMatch = translateRegex.exec(content)) !== null) {
        translatePositions.push({
            tx: parseFloat(tMatch[1]),
            ty: parseFloat(tMatch[2]),
            contentStart: tMatch.index + tMatch[0].length
        });
    }
    
    // Pass 2: For each translate group, find the child element and compute bounds
    for (const tPos of translatePositions) {
        // Extract the content after the <g> opening tag (up to 2000 chars to cover long paths)
        const snippet = content.substring(tPos.contentStart, tPos.contentStart + 3000).trimStart();
        const tx = tPos.tx;
        const ty = tPos.ty;
        
        if (snippet.startsWith('<line ')) {
            const x1 = parseFloat((snippet.match(/x1="([^"]+)"/) || [])[1] || 0);
            const y1 = parseFloat((snippet.match(/y1="([^"]+)"/) || [])[1] || 0);
            const x2 = parseFloat((snippet.match(/x2="([^"]+)"/) || [])[1] || 0);
            const y2 = parseFloat((snippet.match(/y2="([^"]+)"/) || [])[1] || 0);
            const sw = parseFloat((snippet.match(/stroke-width="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x1, ty + y1 - sw/2, tx + x2, ty + y2 + sw/2);
        } else if (snippet.startsWith('<rect ')) {
            const x = parseFloat((snippet.match(/\bx="([^"]+)"/) || [])[1] || 0);
            const y = parseFloat((snippet.match(/\by="([^"]+)"/) || [])[1] || 0);
            const w = parseFloat((snippet.match(/width="([^"]+)"/) || [])[1] || 0);
            const h = parseFloat((snippet.match(/height="([^"]+)"/) || [])[1] || 0);
            expandBounds(tx + x, ty + y, tx + x + w, ty + y + h);
        } else if (snippet.startsWith('<path ')) {
            const scaleMatch = snippet.match(/transform="scale\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)"/);
            const dMatch = snippet.match(/\bd="([^"]+)"/);
            if (scaleMatch && dMatch) {
                const sx = parseFloat(scaleMatch[1]);
                const sy = parseFloat(scaleMatch[2]);
                const pb = getPathBounds(dMatch[1]);
                const x1 = pb.minX * sx, x2 = pb.maxX * sx;
                const y1 = pb.minY * sy, y2 = pb.maxY * sy;
                expandBounds(tx + Math.min(x1,x2), ty + Math.min(y1,y2),
                             tx + Math.max(x1,x2), ty + Math.max(y1,y2));
            } else if (dMatch) {
                // Path without scale (vibrato wave from make-path-stencil)
                const pb = getPathBounds(dMatch[1]);
                expandBounds(tx + pb.minX, ty + pb.minY, tx + pb.maxX, ty + pb.maxY);
            } else {
                expandBounds(tx - 0.5, ty - 0.5, tx + 0.5, ty + 0.5);
            }
        } else if (snippet.startsWith('<text ')) {
            // Estimate text bounds (approximate: 0.5 units per character, font-size height)
            const fsMatch = snippet.match(/font-size="([^"]+)"/);
            const fontSize = fsMatch ? parseFloat(fsMatch[1]) : 1.0;
            const textMatch = snippet.match(/<tspan>([^<]*)<\/tspan>/);
            const textLen = textMatch ? textMatch[1].length : 5;
            const estWidth = textLen * fontSize * 0.5;
            expandBounds(tx, ty - fontSize, tx + estWidth, ty + fontSize * 0.3);
        }
    }
    
    // Pass 3: String-search fallback for <path d="..."> without scale transforms
    // This catches vibrato waves that Pass 2 may miss due to regex/substring edge cases
    let searchPos = 0;
    while (true) {
        const pathIdx = content.indexOf('<path ', searchPos);
        if (pathIdx === -1) break;
        searchPos = pathIdx + 6;
        
        const closeIdx = content.indexOf('/>', pathIdx);
        if (closeIdx === -1) continue;
        const pathTag = content.substring(pathIdx, closeIdx + 2);
        
        // Skip paths with scale transform (already handled by Pass 2)
        if (pathTag.includes('scale(')) continue;
        
        // Extract d= attribute value using indexOf (no regex on long strings)
        const dIdx = pathTag.indexOf(' d="');
        if (dIdx === -1) continue;
        const dValStart = dIdx + 4;
        const dValEnd = pathTag.indexOf('"', dValStart);
        if (dValEnd === -1) continue;
        const dValue = pathTag.substring(dValStart, dValEnd);
        if (!dValue.startsWith('M')) continue;
        
        // Find parent <g transform="translate(tx,ty)"> by searching backwards
        const before = content.substring(Math.max(0, pathIdx - 300), pathIdx);
        const parentMatch = before.match(/<g\s+transform="translate\(\s*([\d.e+-]+)\s*,\s*([\d.e+-]+)\s*\)">\s*$/s);
        if (parentMatch) {
            const tx = parseFloat(parentMatch[1]);
            const ty = parseFloat(parentMatch[2]);
            const pb = getPathBounds(dValue);
            expandBounds(tx + pb.minX, ty + pb.minY, tx + pb.maxX, ty + pb.maxY);
        }
    }
    
    if (minX === Infinity) {
        throw new Error('No visual elements found in SVG');
    }
    
    // Add padding (larger to accommodate vibrato waves and text at edges)
    const pad = 0.5;
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
// VIBRATO MOTIVE AUTOMATION - Create and save to score
// ============================================

// Replicate client-side CurveMaker.computeYAtT for server-side curve generation
function computeYAtT(model, slope, y1Norm, y2Norm, t) {
    t = Math.max(0, Math.min(1, t));
    switch (model) {
        case 'power': {
            const exponent = Math.pow(4, slope);
            const shaped = Math.pow(t, exponent);
            return y1Norm + (y2Norm - y1Norm) * shaped;
        }
        case 'sigmoid': {
            const steepness = slope * 4;
            let shaped;
            if (Math.abs(steepness) < 0.01) {
                shaped = t;
            } else {
                const raw = 1 / (1 + Math.exp(-steepness * (t - 0.5)));
                const atZero = 1 / (1 + Math.exp(-steepness * -0.5));
                const atOne = 1 / (1 + Math.exp(-steepness * 0.5));
                shaped = (raw - atZero) / (atOne - atZero);
            }
            return y1Norm + (y2Norm - y1Norm) * shaped;
        }
        case 'exponential': {
            const k = slope * 4;
            let shaped;
            if (Math.abs(k) < 0.01) {
                shaped = t;
            } else {
                shaped = (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
            }
            return y1Norm + (y2Norm - y1Norm) * shaped;
        }
        case 'logarithmic': {
            const absK = Math.abs(slope) * 5;
            let shaped;
            if (absK < 0.01) {
                shaped = t;
            } else if (slope < 0) {
                shaped = Math.tanh(absK * t) / Math.tanh(absK);
            } else {
                shaped = 1 - Math.tanh(absK * (1 - t)) / Math.tanh(absK);
            }
            return y1Norm + (y2Norm - y1Norm) * shaped;
        }
        case 'bezier':
        default: {
            const ctrlYNorm = slope >= 0
                ? y1Norm + (y2Norm - y1Norm) * (1 - Math.abs(slope)) * 0.5
                : y2Norm - (y2Norm - y1Norm) * (1 - Math.abs(slope)) * 0.5;
            const ctrlXNorm = 0.5 + Math.max(-1, Math.min(1, slope)) * 0.49;
            const a = 1 - 2 * ctrlXNorm;
            const b = 2 * ctrlXNorm;
            const c = -t;
            let bT;
            if (Math.abs(a) < 0.0001) {
                bT = t;
            } else {
                const discriminant = b * b - 4 * a * c;
                if (discriminant < 0) {
                    bT = t;
                } else {
                    const sqrtD = Math.sqrt(discriminant);
                    const t1 = (-b + sqrtD) / (2 * a);
                    const t2 = (-b - sqrtD) / (2 * a);
                    bT = (t1 >= 0 && t1 <= 1) ? t1 : t2;
                    bT = Math.max(0, Math.min(1, bT));
                }
            }
            const oneMinusT = 1 - bT;
            return oneMinusT * oneMinusT * y1Norm
                 + 2 * oneMinusT * bT * ctrlYNorm
                 + bT * bT * y2Norm;
        }
    }
}

// Generate curve sample data array (replicates client-side generateCurveDataArray)
function generateCurveSamples(startSeconds, endSeconds, y1, y2, model, slope) {
    const SAMPLE_INTERVAL = 0.01; // 10ms = 100 samples/second
    const duration = endSeconds - startSeconds;
    if (duration <= 0) return { startTime: startSeconds, endTime: endSeconds, sampleInterval: SAMPLE_INTERVAL, samples: [] };
    const sampleCount = Math.ceil(duration / SAMPLE_INTERVAL) + 1;
    const samples = [];
    const y1Norm = y1 / 10;
    const y2Norm = y2 / 10;
    for (let i = 0; i < sampleCount; i++) {
        const timeT = Math.min(1, (i * SAMPLE_INTERVAL) / duration);
        const normalizedY = computeYAtT(model, slope, y1Norm, y2Norm, timeT);
        samples.push(Math.max(0, Math.min(1, normalizedY)));
    }
    return { startTime: startSeconds, endTime: endSeconds, sampleInterval: SAMPLE_INTERVAL, samples };
}

// Convert pitch string (e.g. "C#4", "Bb3") to LilyPond format
function pitchToLilyPond(pitch) {
    if (!pitch) return "c'4";
    const match = pitch.match(/^([A-Ga-g])([#b+d]*)?(\d)$/);
    if (!match) return "c'4";
    let [, note, accidentals, octave] = match;
    note = note.toLowerCase();
    accidentals = accidentals || '';
    let lpAccidental = '';
    if (accidentals === '#') lpAccidental = 's';
    else if (accidentals === 'b') lpAccidental = 'f';
    else if (accidentals === '+') lpAccidental = 'qs';
    else if (accidentals === 'd') lpAccidental = 'qf';
    else if (accidentals === '#+') lpAccidental = 'tqs';
    else if (accidentals === 'bd') lpAccidental = 'tqf';
    const oct = parseInt(octave);
    let lpOctave = '';
    if (oct > 3) lpOctave = "'".repeat(oct - 3);
    else if (oct < 3) lpOctave = ','.repeat(3 - oct);
    return note + lpAccidental + lpOctave + '4';
}

function clefToLilyPond(clef) {
    if (clef === 'cClef') return 'alto';
    return clef;
}

// Convert pitch string to MIDI note number
function pitchToMidi(pitchStr) {
    const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const match = pitchStr.trim().toUpperCase().match(/^([A-G])([#B]?)([+D]?)(-?\d)$/);
    if (!match) return 60; // default middle C
    let [, noteName, accidental, quarterTone, octave] = match;
    let midi = noteMap[noteName];
    if (accidental === '#') midi += 1;
    else if (accidental === 'B') midi -= 1;
    midi += (parseInt(octave) + 1) * 12;
    return Math.max(0, Math.min(127, midi));
}

// Generate vibrato filename
function generateVibratoFilename(direction, clef, pitch, startDyn, endDyn) {
    const dirCode = direction === 'wide-narrow' ? 'WN' : 'NW';
    const clefName = clef === 'cClef' ? 'alto' : clef;
    const safePitch = pitch.replace('#', 's').replace('+', 'q').replace('d', 'qf');
    return `Vib-${dirCode}-${clefName}-${safePitch}-${startDyn}-${endDyn}.ly`;
}

// Build vibrato MIDI file bytes (returns Buffer)
function buildVibratoMidiFile(midiNote, velocity, duration, ccSamples, bpm, midiChannel = 0) {
    const TICKS_PER_BEAT = 480;
    const CC0_ARTICULATION = 89;
    const MICROSECONDS_PER_BEAT = Math.round(60000000 / bpm);

    const writeVarInt = (value) => {
        const bytes = [];
        bytes.push(value & 0x7f);
        value >>= 7;
        while (value > 0) {
            bytes.unshift((value & 0x7f) | 0x80);
            value >>= 7;
        }
        return bytes;
    };
    const writeInt = (value, length) => {
        const bytes = [];
        for (let i = length - 1; i >= 0; i--) bytes.push((value >> (i * 8)) & 0xff);
        return bytes;
    };
    const secondsToTicks = (seconds) => Math.round(seconds * TICKS_PER_BEAT * bpm / 60);

    // Build track events
    const trackEvents = [];
    let lastTick = 0;

    // CC0 = 89 at tick 0
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xB0 | midiChannel, 0x00, CC0_ARTICULATION);

    // Note On at tick 0
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0x90 | midiChannel, midiNote, velocity);

    // CC4 + Channel Pressure samples
    let prevTick = 0;
    for (let i = 0; i < ccSamples.length; i++) {
        const sample = ccSamples[i];
        const tick = secondsToTicks(sample.timeRelative);
        const deltaTick = Math.max(0, tick - prevTick);
        trackEvents.push(...writeVarInt(deltaTick));
        trackEvents.push(0xB0 | midiChannel, 0x04, sample.value);
        trackEvents.push(...writeVarInt(0));
        trackEvents.push(0xD0 | midiChannel, sample.value);
        prevTick = tick;
    }
    lastTick = prevTick;

    // Note Off
    const endTick = secondsToTicks(duration);
    const noteOffDelta = Math.max(0, endTick - lastTick);
    trackEvents.push(...writeVarInt(noteOffDelta));
    trackEvents.push(0x80 | midiChannel, midiNote, 0);

    // End of track
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xFF, 0x2F, 0x00);

    // Build tempo track
    const tempoTrack = [];
    tempoTrack.push(...writeVarInt(0));
    tempoTrack.push(0xFF, 0x51, 0x03);
    tempoTrack.push((MICROSECONDS_PER_BEAT >> 16) & 0xFF);
    tempoTrack.push((MICROSECONDS_PER_BEAT >> 8) & 0xFF);
    tempoTrack.push(MICROSECONDS_PER_BEAT & 0xFF);
    tempoTrack.push(...writeVarInt(0));
    tempoTrack.push(0xFF, 0x2F, 0x00);

    // Build MIDI file
    const midiFile = [];
    midiFile.push(0x4D, 0x54, 0x68, 0x64); // MThd
    midiFile.push(...writeInt(6, 4));
    midiFile.push(...writeInt(1, 2)); // Format 1
    midiFile.push(...writeInt(2, 2)); // 2 tracks
    midiFile.push(...writeInt(TICKS_PER_BEAT, 2));
    midiFile.push(0x4D, 0x54, 0x72, 0x6B); // MTrk (tempo)
    midiFile.push(...writeInt(tempoTrack.length, 4));
    midiFile.push(...tempoTrack);
    midiFile.push(0x4D, 0x54, 0x72, 0x6B); // MTrk (data)
    midiFile.push(...writeInt(trackEvents.length, 4));
    midiFile.push(...trackEvents);

    return Buffer.from(midiFile);
}

// Parse MIDI file bytes to event array (replicates client-side parseMidiFileToEvents)
function parseMidiToEvents(midiData, baseTimeMs, bpm) {
    const events = [];
    let pos = 0;
    if (midiData[0] !== 0x4D || midiData[1] !== 0x54 || midiData[2] !== 0x68 || midiData[3] !== 0x64) return events;
    const ticksPerBeat = (midiData[12] << 8) | midiData[13];
    pos = 14;
    // Skip tempo track
    if (midiData[pos] === 0x4D && midiData[pos+1] === 0x54 && midiData[pos+2] === 0x72 && midiData[pos+3] === 0x6B) {
        const len = (midiData[pos+4] << 24) | (midiData[pos+5] << 16) | (midiData[pos+6] << 8) | midiData[pos+7];
        pos += 8 + len;
    }
    // Parse data track
    if (midiData[pos] !== 0x4D || midiData[pos+1] !== 0x54 || midiData[pos+2] !== 0x72 || midiData[pos+3] !== 0x6B) return events;
    const dataTrackLen = (midiData[pos+4] << 24) | (midiData[pos+5] << 16) | (midiData[pos+6] << 8) | midiData[pos+7];
    pos += 8;
    const trackEnd = pos + dataTrackLen;
    const msPerTick = 60000 / (bpm * ticksPerBeat);
    let currentTick = 0;
    let runningStatus = 0;
    while (pos < trackEnd) {
        let deltaTime = 0;
        let byte;
        do { byte = midiData[pos++]; deltaTime = (deltaTime << 7) | (byte & 0x7F); } while (byte & 0x80);
        currentTick += deltaTime;
        const timeMs = baseTimeMs + (currentTick * msPerTick);
        let status = midiData[pos];
        if (status < 0x80) { status = runningStatus; } else { pos++; if (status < 0xF0) runningStatus = status; }
        const eventType = status & 0xF0;
        if (eventType === 0x90) {
            const note = midiData[pos++]; const vel = midiData[pos++];
            events.push({ timeMs, type: vel > 0 ? 'noteOn' : 'noteOff', data: [status, note, vel] });
        } else if (eventType === 0x80) {
            const note = midiData[pos++]; const vel = midiData[pos++];
            events.push({ timeMs, type: 'noteOff', data: [status, note, vel] });
        } else if (eventType === 0xB0) {
            const cc = midiData[pos++]; const val = midiData[pos++];
            events.push({ timeMs, type: 'cc', data: [status, cc, val] });
        } else if (eventType === 0xD0) {
            const pressure = midiData[pos++];
            events.push({ timeMs, type: 'channelPressure', data: [status, pressure] });
        } else if (eventType === 0xE0) {
            const lsb = midiData[pos++]; const msb = midiData[pos++];
            events.push({ timeMs, type: 'pitchBend', data: [status, lsb, msb] });
        } else if (eventType === 0xA0) {
            pos += 2; // poly pressure, skip
        } else if (status === 0xFF) {
            const metaType = midiData[pos++];
            let metaLen = 0;
            do { byte = midiData[pos++]; metaLen = (metaLen << 7) | (byte & 0x7F); } while (byte & 0x80);
            pos += metaLen;
        } else if (status === 0xF0 || status === 0xF7) {
            let sysexLen = 0;
            do { byte = midiData[pos++]; sysexLen = (sysexLen << 7) | (byte & 0x7F); } while (byte & 0x80);
            pos += sysexLen;
        }
    }
    return events;
}

// Find latest score (highest leading number) and determine next name
function findLatestScoreAndNext() {
    const files = fs.readdirSync(SCORES_DIR)
        .filter(f => f.endsWith('.json') && !fs.statSync(path.join(SCORES_DIR, f)).isDirectory());
    if (files.length === 0) return { latest: null, nextName: '1' };
    
    // Extract leading number from each filename
    let maxNum = 0;
    let latestFile = null;
    for (const f of files) {
        const name = f.replace('.json', '');
        const numMatch = name.match(/^(\d+)/);
        if (numMatch) {
            const num = parseInt(numMatch[1]);
            if (num > maxNum) {
                maxNum = num;
                latestFile = name;
            }
        }
    }
    if (!latestFile) {
        // No numbered files, use most recently modified
        const sorted = files.map(f => ({ name: f.replace('.json', ''), mtime: fs.statSync(path.join(SCORES_DIR, f)).mtime }))
            .sort((a, b) => b.mtime - a.mtime);
        return { latest: sorted[0].name, nextName: '1' };
    }
    return { latest: latestFile, nextName: String(maxNum + 1) };
}

// Promisified exec for async/await
function execAsync(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (err, stdout, stderr) => {
            if (err) reject({ err, stdout, stderr });
            else resolve({ stdout, stderr });
        });
    });
}

// Main automation endpoint: create vibrato motive and save to score
app.post('/api/vibrato/create-and-save', async (req, res) => {
    const {
        start, end, track = 1, pitch = 'C4', clef = 'treble',
        startDynamic = 'mp', endDynamic = 'p',
        velocity = 115, y1 = 10, y2 = 0,
        model = 'logarithmic', slope = -0.65,
        color = 'limeGreen', fillMode = 'bottom'
    } = req.body;

    // Validate required params
    if (start === undefined || end === undefined) {
        return res.status(400).json({ success: false, error: 'start and end times are required' });
    }
    if (end <= start) {
        return res.status(400).json({ success: false, error: 'end must be greater than start' });
    }

    const startSeconds = parseFloat(start);
    const endSeconds = parseFloat(end);
    const trackNum = parseInt(track);
    const gTrack = String(trackNum);

    console.log(`VibratoAutomation: Creating motive ${pitch} on track ${gTrack}, ${startSeconds}s-${endSeconds}s, ${model} slope ${slope}`);

    try {
        // 1. Find latest score and load it
        const { latest, nextName } = findLatestScoreAndNext();
        if (!latest) {
            return res.status(404).json({ success: false, error: 'No score files found in scores directory' });
        }
        const scoreData = JSON.parse(fs.readFileSync(path.join(SCORES_DIR, `${latest}.json`), 'utf8'));
        console.log(`VibratoAutomation: Loaded score '${latest}', will save as '${nextName}'`);

        // 2. Get BPM from score's tempo history
        const bpm = (scoreData.tempoHistory && scoreData.tempoHistory[0]) ? scoreData.tempoHistory[0].bpm : 60;
        const beatsPerPage = (scoreData.tempoHistory && scoreData.tempoHistory[0]) ? scoreData.tempoHistory[0].beatsPerPage : 8;
        const secondsPerPage = (beatsPerPage / bpm) * 60;
        const leadIn = scoreData.cursorState ? (scoreData.cursorState.leadInSeconds || 0) : 0;

        // 3. Compute curve data
        const curveData = generateCurveSamples(startSeconds, endSeconds, y1, y2, model, slope);
        const duration = endSeconds - startSeconds;

        // 4. Determine direction from Y values
        const direction = y1 >= y2 ? 'wide-narrow' : 'narrow-wide';

        // 5. Determine page/section for the curve
        const startActual = startSeconds + leadIn;
        const startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
        const section = startPage % 2 === 0 ? 'top' : 'bottom';

        // 6. Create curve entry for databases.curves
        // Find next curve ID
        const existingCurves = scoreData.databases?.curves?.curves || [];
        const maxCurveId = existingCurves.reduce((max, c) => Math.max(max, c.id || 0), 0);
        const newCurveId = maxCurveId + 1;
        const curveName = `CRV_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}`;

        const curveEntry = {
            id: newCurveId,
            name: curveName,
            startSeconds,
            endSeconds,
            y1,
            y2,
            gTrack,
            color,
            fillMode,
            section,
            page: startPage,
            x1: 0,      // placeholder, recalculated on load
            y1Pixel: 0,  // placeholder
            x2: 100,     // placeholder
            y2Pixel: 0,  // placeholder
            origY1Pixel: 0,
            origY2Pixel: 0,
            tension: 0,
            slope,
            model,
            trackDims: { y: 0, height: 80 }, // placeholder
            curveData
        };

        // 7. Create LilyPond file
        const lpPitch = pitchToLilyPond(pitch);
        const lpClef = clefToLilyPond(clef);
        const lyFilename = generateVibratoFilename(direction, clef, pitch, startDynamic, endDynamic);

        const templateName = direction === 'wide-narrow'
            ? 'DynamicVibrato-Wide-Narrow_Template.ly'
            : 'DynamicVibrato-Narrow-Wide_Template.ly';
        const templatePath = path.join(LILYPOND_DIR, templateName);

        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ success: false, error: `Template not found: ${templateName}` });
        }

        let template = fs.readFileSync(templatePath, 'utf8');
        template = template.replace(/\\clef treble/, `\\clef ${lpClef}`);
        const pitchNoDuration = lpPitch.replace(/\d+$/, '');
        template = template.replace(/(c'2)(\s*\n\s*\\startTrillSpan)/, `${pitchNoDuration}2$2`);
        template = template.replace(
            /(extra-offset #'\(0 \. )0\.3(\)[^\n]*\n\s*)\\[a-z]+/,
            `$10$2\\${startDynamic}`
        );
        template = template.replace(
            /(extra-offset #'\(-8 \. )0\.3(\)[^\n]*\n\s*)\\[a-z]+/,
            `$10$2\\${endDynamic}`
        );
        template = template.replace(
            /\\override Hairpin\.Y-offset = #-0\.9[^\n]*/,
            '\\override DynamicLineSpanner.staff-padding = #1.2'
        );
        template = template.replace(
            /(-\\tweak extra-offset #'\(-0\.5 \. )1\.2(\))/,
            '$10$2'
        );
        fs.writeFileSync(path.join(LILYPOND_DIR, lyFilename), template);
        console.log(`VibratoAutomation: Created LilyPond file: ${lyFilename}`);

        // 8. Render SVG
        const scriptPath = path.join(LILYPOND_DIR, 'render_glissando.ps1');
        const svgOutputDir = path.join(__dirname, 'public', 'SVG_graphics');
        const baseName = path.basename(lyFilename, '.ly');
        const svgFilePath = path.join(svgOutputDir, `${baseName}.svg`);

        try {
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Filename "${lyFilename}"`;
            await execAsync(command, { timeout: 60000 });
            if (fs.existsSync(svgFilePath)) {
                try { cropSvgToContent(svgFilePath); } catch (e) { console.warn('SVG crop warning:', e.message); }
                console.log(`VibratoAutomation: Rendered + cropped SVG: ${baseName}.svg`);
            }
        } catch (renderErr) {
            console.error('VibratoAutomation: SVG render failed:', renderErr.stderr || renderErr.err?.message);
            // Continue without SVG - curve and MIDI still valuable
        }

        // 9. Create SVG element entry if SVG exists
        if (fs.existsSync(svgFilePath)) {
            const svgContent = fs.readFileSync(svgFilePath, 'utf-8');
            // Parse dimensions
            let svgWidth = 100, svgHeight = 100;
            const widthMatch = svgContent.match(/width="([^"]+)"/);
            const heightMatch = svgContent.match(/height="([^"]+)"/);
            if (widthMatch) {
                svgWidth = parseFloat(widthMatch[1]);
                if (widthMatch[1].includes('mm')) svgWidth *= 3.78;
            }
            if (heightMatch) {
                svgHeight = parseFloat(heightMatch[1]);
                if (heightMatch[1].includes('mm')) svgHeight *= 3.78;
            }
            const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');

            // Position: left edge of curve, on the track
            const xPercent = ((startActual % secondsPerPage) / secondsPerPage) * 100;
            // Approximate scale (85% of ~80px track height)
            const approxTrackHeight = 80;
            const targetHeight = approxTrackHeight * 0.85;
            const scale = targetHeight / svgHeight;
            const scaledWidth = svgWidth * scale;
            // SVG right edge at curve start minus 5px gap (as percentage)
            const svgXPercent = Math.max(0, xPercent - (scaledWidth / 10) - 0.5);

            const existingSvgElements = scoreData.svgElements || [];
            const maxSvgId = existingSvgElements.reduce((max, e) => Math.max(max, e.id || 0), 0);

            // Anchor-based SVG element: referenceSeconds = curve start, offsetSeconds = left of anchor
            // Approximate offsetSeconds from pixel gap (5px + scaledWidth)
            const approxScoreWidthVib = 1000;
            const secondsPerPixelVib = secondsPerPage / approxScoreWidthVib;
            let svgOffsetSeconds = -(5 + scaledWidth) * secondsPerPixelVib;

            // Clamp: don't let SVG fall off the left edge of the page
            const pageStartScoreSeconds = (startPage * secondsPerPage) - leadIn;
            if (startSeconds + svgOffsetSeconds < pageStartScoreSeconds) {
                svgOffsetSeconds = pageStartScoreSeconds - startSeconds;
            }

            // Generate standard name: SVG_YYYYMMDD_HHMMSS_NN_filename
            const nowVib = new Date();
            const padVib = (n, len) => String(n).padStart(len, '0');
            const svgCounter = existingSvgElements.length + 1;
            const svgStdName = `SVG_${nowVib.getFullYear()}${padVib(nowVib.getMonth()+1,2)}${padVib(nowVib.getDate(),2)}_${padVib(nowVib.getHours(),2)}${padVib(nowVib.getMinutes(),2)}${padVib(nowVib.getSeconds(),2)}_${padVib(svgCounter,2)}_${baseName}`;

            const svgElement = {
                id: maxSvgId + 1,
                name: svgStdName,
                referenceSeconds: startSeconds,
                offsetSeconds: svgOffsetSeconds,
                offsetYFraction: 0.0,
                width: svgWidth,
                height: svgHeight,
                scale,
                track: trackNum,
                svgDataUrl
            };
            if (!scoreData.svgElements) scoreData.svgElements = [];
            scoreData.svgElements.push(svgElement);
            console.log(`VibratoAutomation: Added SVG element ${baseName}`);
        }

        // 10. Generate MIDI file
        const midiNote = pitchToMidi(pitch);
        const CC_SAMPLE_INTERVAL = 50; // ms
        const numCCSamples = Math.max(2, Math.ceil(duration * 1000 / CC_SAMPLE_INTERVAL));
        const ccSamples = [];
        for (let i = 0; i < numCCSamples; i++) {
            const t = startSeconds + (i / (numCCSamples - 1)) * duration;
            const curveIdx = Math.round((t - curveData.startTime) / curveData.sampleInterval);
            const clampedIdx = Math.max(0, Math.min(curveData.samples.length - 1, curveIdx));
            const normalizedY = curveData.samples[clampedIdx];
            const ccValue = Math.round(Math.max(0, Math.min(127, normalizedY * 127)));
            ccSamples.push({ timeRelative: (t - startSeconds), value: ccValue });
        }

        // Vibrato uses MIDI channels 5-8 (0-indexed: 4-7) = trackNum + 3
        const vibratoMidiChannel = trackNum + 3; // Track 1→ch4(=MIDI ch5), Track 2→ch5(=MIDI ch6), etc.
        const midiBuffer = buildVibratoMidiFile(midiNote, velocity, duration, ccSamples, bpm, vibratoMidiChannel);
        const midiFilename = `Vib_${curveName}_${pitch.replace('#', 's').replace(/[^a-zA-Z0-9]/g, '')}.mid`;
        const midiFilePath = path.join(__dirname, 'public', 'midi_files', midiFilename);

        // Ensure midi_files directory exists
        const midiDir = path.join(__dirname, 'public', 'midi_files');
        if (!fs.existsSync(midiDir)) fs.mkdirSync(midiDir, { recursive: true });
        fs.writeFileSync(midiFilePath, midiBuffer);
        console.log(`VibratoAutomation: Saved MIDI file: ${midiFilename} (${ccSamples.length} CC samples, MIDI ch ${vibratoMidiChannel + 1})`);

        // 11. Parse MIDI events and add to score's midiTracks
        const curveStartMs = startSeconds * 1000;
        const midiEvents = parseMidiToEvents(midiBuffer, curveStartMs, bpm);

        // Add snippet to databases.midiSnippets
        if (!scoreData.databases) scoreData.databases = {};
        if (!scoreData.databases.midiSnippets) scoreData.databases.midiSnippets = { snippets: [], nextId: 1 };
        const snippetId = scoreData.databases.midiSnippets.nextId++;
        scoreData.databases.midiSnippets.snippets.push({
            id: snippetId,
            name: `Vib @ ${curveName}`,
            trackIndex: trackNum - 1,
            startTimeMs: curveStartMs,
            durationMs: duration * 1000,
            startSeconds,
            endSeconds,
            events: midiEvents,
            color,
            sourceCurve: newCurveId,
            sourceFile: midiFilename
        });

        // Add events to midiTracks
        if (!scoreData.midiTracks) scoreData.midiTracks = [];
        while (scoreData.midiTracks.length < trackNum) {
            scoreData.midiTracks.push({ channel: scoreData.midiTracks.length + 1, midiEvents: [] });
        }
        const trackEvents = scoreData.midiTracks[trackNum - 1];
        for (const event of midiEvents) {
            trackEvents.midiEvents.push({
                timeMs: event.timeMs,
                type: event.type,
                data: [...event.data],
                snippetId: snippetId,
                timestamp: event.timeMs
            });
        }
        trackEvents.midiEvents.sort((a, b) => a.timeMs - b.timeMs);

        // 12. Add curve to databases.curves
        if (!scoreData.databases.curves) scoreData.databases.curves = { curves: [], nextId: 1 };
        scoreData.databases.curves.curves.push(curveEntry);
        scoreData.databases.curves.nextId = newCurveId + 1;

        // 13. Update cursor state so auto-load scrolls to the vibrato position
        scoreData.cursorState = {
            editCursorSeconds: startSeconds - 1,
            gotoDisplaySeconds: startSeconds - 1,
            leadInSeconds: leadIn
        };

        // 14. Update metadata
        scoreData.metadata = scoreData.metadata || {};
        scoreData.metadata.title = nextName;
        scoreData.metadata.modified = new Date().toISOString();

        // 15. Save as next iteration
        const newFilePath = path.join(SCORES_DIR, `${nextName}.json`);
        fs.writeFileSync(newFilePath, JSON.stringify(scoreData, null, 2));
        console.log(`VibratoAutomation: Saved score as '${nextName}'`);

        // 16. Also save a version backup
        const versionFilename = `${nextName}_v${Date.now()}.json`;
        fs.writeFileSync(path.join(VERSIONS_DIR, versionFilename), JSON.stringify(scoreData, null, 2));

        res.json({
            success: true,
            scoreName: nextName,
            previousScore: latest,
            curve: { id: newCurveId, name: curveName, startSeconds, endSeconds },
            direction,
            midi: { filename: midiFilename, events: midiEvents.length, ccSamples: ccSamples.length },
            svg: fs.existsSync(svgFilePath) ? baseName + '.svg' : null,
            message: `Vibrato motive created. Score saved as '${nextName}'. Refresh browser to see it.`
        });

    } catch (err) {
        console.error('VibratoAutomation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Helper: pitch string to MIDI note number with quarter-tone offset (for glissando segments)
function pitchToMidiFloat(pitchStr) {
    const noteMap = { 'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11 };
    const match = pitchStr.trim().toUpperCase().match(/^([A-G])([#B]?)([+D]?)(-?\d)$/);
    if (!match) return { midi: 60, quarterTone: 0 };
    let [, noteName, accidental, quarterTone, octave] = match;
    let midi = noteMap[noteName];
    if (accidental === '#') midi += 1;
    else if (accidental === 'B') midi -= 1;
    midi += (parseInt(octave) + 1) * 12;
    midi = Math.max(0, Math.min(127, midi));
    let qtOffset = 0;
    if (quarterTone === '+') qtOffset = 0.5;
    else if (quarterTone === 'D') qtOffset = -0.5;
    return { midi, quarterTone: qtOffset };
}

// Helper: check if two pitches share the same staff line (for gliss offset in LilyPond)
function sameStaffLine(startPitch, endPitch) {
    return startPitch.charAt(0).toUpperCase() === endPitch.charAt(0).toUpperCase();
}

// Helper: generate glissando LilyPond filename
function generateGlissFilename(clef, startPitch, endPitch, dynamic) {
    const normalizePitch = (p) => p.replace('#', 's').replace('+', 'q').replace('d', 'qf');
    const clefName = clef === 'cClef' ? 'alto' : clef;
    const dynSuffix = dynamic ? `-${dynamic}` : '';
    return `Gliss-${clefName}-${normalizePitch(startPitch)}-${normalizePitch(endPitch)}${dynSuffix}.ly`;
}

// Helper: build a single glissando MIDI segment file (returns Buffer)
function buildGlissandoSegmentMidi(segment, bpm) {
    const TICKS_PER_BEAT = 480;
    const MICROSECONDS_PER_BEAT = Math.round(60000000 / bpm);

    const writeVarInt = (value) => {
        const bytes = [];
        bytes.push(value & 0x7f);
        value >>= 7;
        while (value > 0) { bytes.unshift((value & 0x7f) | 0x80); value >>= 7; }
        return bytes;
    };
    const writeInt = (value, length) => {
        const bytes = [];
        for (let i = length - 1; i >= 0; i--) bytes.push((value >> (i * 8)) & 0xff);
        return bytes;
    };
    const secondsToTicks = (seconds) => Math.round(seconds * TICKS_PER_BEAT * bpm / 60);

    const trackEvents = [];
    let lastTick = 0;

    // CC0 (articulation) if applicable (first 2 segments only)
    if (segment.cc0Value !== null) {
        trackEvents.push(...writeVarInt(0));
        trackEvents.push(0xB0, 0x00, segment.cc0Value);
    }

    // Initial pitch bend
    const pbLSB = segment.startBend & 0x7F;
    const pbMSB = (segment.startBend >> 7) & 0x7F;
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xE0, pbLSB, pbMSB);

    // Note On
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0x90, segment.midiNote, segment.velocity);

    // Pitch bend samples
    if (segment.pitchBendSamples && segment.pitchBendSamples.length > 1) {
        let prevTick = 0;
        for (let pbIdx = 1; pbIdx < segment.pitchBendSamples.length; pbIdx++) {
            const pbSample = segment.pitchBendSamples[pbIdx];
            const pbTick = secondsToTicks(pbSample.timeRelative);
            const deltaTick = Math.max(0, pbTick - prevTick);
            const lsb = pbSample.value & 0x7F;
            const msb = (pbSample.value >> 7) & 0x7F;
            trackEvents.push(...writeVarInt(deltaTick));
            trackEvents.push(0xE0, lsb, msb);
            prevTick = pbTick;
        }
        lastTick = prevTick;
    }

    // Note Off
    const endTick = secondsToTicks(segment.duration);
    const noteOffDelta = Math.max(0, endTick - lastTick);
    trackEvents.push(...writeVarInt(noteOffDelta));
    trackEvents.push(0x80, segment.midiNote, 0);

    // End of track
    trackEvents.push(...writeVarInt(0));
    trackEvents.push(0xFF, 0x2F, 0x00);

    // Build tempo track
    const tempoTrack = [];
    tempoTrack.push(...writeVarInt(0));
    tempoTrack.push(0xFF, 0x51, 0x03);
    tempoTrack.push((MICROSECONDS_PER_BEAT >> 16) & 0xFF);
    tempoTrack.push((MICROSECONDS_PER_BEAT >> 8) & 0xFF);
    tempoTrack.push(MICROSECONDS_PER_BEAT & 0xFF);
    tempoTrack.push(...writeVarInt(0));
    tempoTrack.push(0xFF, 0x2F, 0x00);

    // Build MIDI file
    const midiFile = [];
    midiFile.push(0x4D, 0x54, 0x68, 0x64); // MThd
    midiFile.push(...writeInt(6, 4));
    midiFile.push(...writeInt(1, 2)); // Format 1
    midiFile.push(...writeInt(2, 2)); // 2 tracks
    midiFile.push(...writeInt(TICKS_PER_BEAT, 2));
    midiFile.push(0x4D, 0x54, 0x72, 0x6B); // MTrk (tempo)
    midiFile.push(...writeInt(tempoTrack.length, 4));
    midiFile.push(...tempoTrack);
    midiFile.push(0x4D, 0x54, 0x72, 0x6B); // MTrk (data)
    midiFile.push(...writeInt(trackEvents.length, 4));
    midiFile.push(...trackEvents);

    return Buffer.from(midiFile);
}

// Helper: generate glissando segments from curve data and pitch range
// Replicates client-side LongToneUI.generateGlissandoMidi segment logic
function generateGlissandoSegments(curveData, startPitchMidi, endPitchMidi, velocity, articulationValue) {
    const PITCH_BEND_RANGE = 2;
    const PITCH_BEND_SAMPLE_INTERVAL = 50; // ms
    const PITCH_BEND_MAX = 16383;
    const PITCH_BEND_MIN = 0;

    const samples = curveData.samples;
    const sampleInterval = curveData.sampleInterval;
    const startTime = curveData.startTime;

    const highPitch = Math.max(startPitchMidi, endPitchMidi);
    const lowPitch = Math.min(startPitchMidi, endPitchMidi);
    const pitchRange = highPitch - lowPitch;

    // normalizedY (0-1) maps: 0 = low pitch, 1 = high pitch
    const pitchAtSample = samples.map(normalizedY => lowPitch + normalizedY * pitchRange);

    const segments = [];
    let segmentStartIndex = 0;
    let segmentBasePitch = pitchAtSample[0];

    const createSegment = (segIndex, segStartIndex, segEndIndex, segStartPitch, segEndPitch) => {
        const segStartTime = startTime + segStartIndex * sampleInterval;
        const segEndTime = startTime + segEndIndex * sampleInterval;
        const segDuration = segEndTime - segStartTime;
        const segIsDown = segEndPitch < segStartPitch;

        // MIDI note offset by 1 semitone based on direction
        const midiNote = segIsDown ?
            Math.round(segStartPitch) - 1 :
            Math.round(segStartPitch) + 1;

        const pitchChangeInSegment = Math.abs(segEndPitch - segStartPitch);
        const bendRangeUsed = pitchChangeInSegment / PITCH_BEND_RANGE;

        let startBend, endBend;
        if (segIsDown) {
            startBend = PITCH_BEND_MAX;
            endBend = Math.round(PITCH_BEND_MAX - (bendRangeUsed * (PITCH_BEND_MAX - PITCH_BEND_MIN)));
        } else {
            startBend = PITCH_BEND_MIN;
            endBend = Math.round(PITCH_BEND_MIN + (bendRangeUsed * (PITCH_BEND_MAX - PITCH_BEND_MIN)));
        }

        // Generate pitch bend samples
        const pitchBendSamples = [];
        const numPbSamples = Math.max(2, Math.ceil(segDuration * 1000 / PITCH_BEND_SAMPLE_INTERVAL));

        for (let pbIdx = 0; pbIdx < numPbSamples; pbIdx++) {
            const pbTime = segStartTime + (pbIdx / (numPbSamples - 1)) * segDuration;
            const curveIdx = Math.round((pbTime - startTime) / sampleInterval);
            const clampedIdx = Math.max(0, Math.min(samples.length - 1, curveIdx));
            const pitchAtTime = pitchAtSample[clampedIdx];
            const pitchProgress = (segEndPitch !== segStartPitch) ?
                (pitchAtTime - segStartPitch) / (segEndPitch - segStartPitch) : 0;
            const clampedProgress = Math.max(0, Math.min(1, pitchProgress));
            const bendValue = Math.round(startBend + clampedProgress * (endBend - startBend));
            pitchBendSamples.push({ timeRelative: pbTime - segStartTime, value: bendValue });
        }

        return {
            index: segIndex,
            startTime: segStartTime,
            endTime: segEndTime,
            duration: segDuration,
            startPitch: segStartPitch,
            endPitch: segEndPitch,
            midiNote,
            startBend,
            endBend,
            pitchBendSamples,
            cc0Value: (segIndex < 2) ? articulationValue : null,
            velocity,
            isGlissDown: segIsDown
        };
    };

    for (let i = 1; i < pitchAtSample.length; i++) {
        const currentPitch = pitchAtSample[i];
        const deviation = currentPitch - segmentBasePitch;
        if (Math.abs(deviation) > PITCH_BEND_RANGE) {
            const segmentEndPitch = pitchAtSample[i - 1];
            segments.push(createSegment(segments.length, segmentStartIndex, i - 1, segmentBasePitch, segmentEndPitch));
            segmentStartIndex = i;
            segmentBasePitch = currentPitch;
        }
    }

    // Add final segment
    segments.push(createSegment(
        segments.length,
        segmentStartIndex,
        samples.length - 1,
        segmentBasePitch,
        pitchAtSample[pitchAtSample.length - 1]
    ));

    return segments;
}

// MIDI note number to pitch name (for filenames)
function midiNoteToPitchName(pitch) {
    const noteNames = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    return noteNames[pitch % 12] + octave;
}

// Main automation endpoint: create glissando and save to score
app.post('/api/glissando/create-and-save', async (req, res) => {
    const {
        start, end, track = 1, startPitch = 'C4', endPitch = 'C5',
        clef = 'treble', dynamic = 'p',
        velocity = 64, articulation = 89,
        y1 = 10, y2 = 0,
        model = 'logarithmic', slope = -0.65,
        color = 'limeGreen', fillMode = 'bottom'
    } = req.body;

    // Validate required params
    if (start === undefined || end === undefined) {
        return res.status(400).json({ success: false, error: 'start and end times are required' });
    }
    if (end <= start) {
        return res.status(400).json({ success: false, error: 'end must be greater than start' });
    }

    const startSeconds = parseFloat(start);
    const endSeconds = parseFloat(end);
    const trackNum = parseInt(track);
    const gTrack = String(trackNum);

    console.log(`GlissandoAutomation: Creating glissando ${startPitch}->${endPitch} on track ${gTrack}, ${startSeconds}s-${endSeconds}s, ${model} slope ${slope}`);

    try {
        // 1. Find latest score and load it
        const { latest, nextName } = findLatestScoreAndNext();
        if (!latest) {
            return res.status(404).json({ success: false, error: 'No score files found in scores directory' });
        }
        const scoreData = JSON.parse(fs.readFileSync(path.join(SCORES_DIR, `${latest}.json`), 'utf8'));
        console.log(`GlissandoAutomation: Loaded score '${latest}', will save as '${nextName}'`);

        // 2. Get BPM from score's tempo history
        const bpm = (scoreData.tempoHistory && scoreData.tempoHistory[0]) ? scoreData.tempoHistory[0].bpm : 60;
        const beatsPerPage = (scoreData.tempoHistory && scoreData.tempoHistory[0]) ? scoreData.tempoHistory[0].beatsPerPage : 8;
        const secondsPerPage = (beatsPerPage / bpm) * 60;
        const leadIn = scoreData.cursorState ? (scoreData.cursorState.leadInSeconds || 0) : 0;

        // 3. Compute curve data
        const curveData = generateCurveSamples(startSeconds, endSeconds, y1, y2, model, slope);
        const duration = endSeconds - startSeconds;

        // 4. Determine page/section for the curve
        const startActual = startSeconds + leadIn;
        const startPage = Math.floor(Math.max(0, startActual) / secondsPerPage);
        const section = startPage % 2 === 0 ? 'top' : 'bottom';

        // 5. Create curve entry for databases.curves
        const existingCurves = scoreData.databases?.curves?.curves || [];
        const maxCurveId = existingCurves.reduce((max, c) => Math.max(max, c.id || 0), 0);
        const newCurveId = maxCurveId + 1;
        const curveName = `CRV_${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 15)}`;

        const curveEntry = {
            id: newCurveId,
            name: curveName,
            startSeconds,
            endSeconds,
            y1,
            y2,
            gTrack,
            color,
            fillMode,
            section,
            page: startPage,
            x1: 0,
            y1Pixel: 0,
            x2: 100,
            y2Pixel: 0,
            origY1Pixel: 0,
            origY2Pixel: 0,
            tension: 0,
            slope,
            model,
            trackDims: { y: 0, height: 80 },
            curveData
        };

        // 6. Create LilyPond file
        const lpStartPitch = pitchToLilyPond(startPitch);
        const lpEndPitch = pitchToLilyPond(endPitch);
        const lpClef = clefToLilyPond(clef);
        const glissOffset = sameStaffLine(startPitch, endPitch) ? '0.3' : '0';
        const lyFilename = generateGlissFilename(clef, startPitch, endPitch, dynamic);

        const templatePath = path.join(LILYPOND_DIR, 'GlissandoNotationTemplate.ly');
        if (!fs.existsSync(templatePath)) {
            return res.status(404).json({ success: false, error: 'Glissando template not found' });
        }

        let template = fs.readFileSync(templatePath, 'utf8');
        template = template.replace(/\\clef alto/g, `\\clef ${lpClef}`);
        const dynamicMarkup = dynamic ? `\\${dynamic}` : '';
        template = template.replace(/^(\s*)(a4\\p)(\s*$)/m, `$1${lpStartPitch}${dynamicMarkup}$3`);
        template = template.replace(/^(\s*)(af4)(\s*$)/m, `$1${lpEndPitch}$3`);
        const offsetValue = glissOffset || '0';
        template = template.replace(/#'\(0 \. 0\)/g, `#'(0 . ${offsetValue})`);
        fs.writeFileSync(path.join(LILYPOND_DIR, lyFilename), template);
        console.log(`GlissandoAutomation: Created LilyPond file: ${lyFilename}`);

        // 7. Render SVG
        const scriptPath = path.join(LILYPOND_DIR, 'render_glissando.ps1');
        const svgOutputDir = path.join(__dirname, 'public', 'SVG_graphics');
        const baseName = path.basename(lyFilename, '.ly');
        const svgFilePath = path.join(svgOutputDir, `${baseName}.svg`);

        try {
            const command = `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Filename "${lyFilename}"`;
            await execAsync(command, { timeout: 60000 });
            if (fs.existsSync(svgFilePath)) {
                try { cropSvgToContent(svgFilePath); } catch (e) { console.warn('SVG crop warning:', e.message); }
                console.log(`GlissandoAutomation: Rendered + cropped SVG: ${baseName}.svg`);
            }
        } catch (renderErr) {
            console.error('GlissandoAutomation: SVG render failed:', renderErr.stderr || renderErr.err?.message);
        }

        // 8. Create SVG element entry if SVG exists
        if (fs.existsSync(svgFilePath)) {
            const svgContent = fs.readFileSync(svgFilePath, 'utf-8');
            let svgWidth = 100, svgHeight = 100;
            const widthMatch = svgContent.match(/width="([^"]+)"/);
            const heightMatch = svgContent.match(/height="([^"]+)"/);
            if (widthMatch) {
                svgWidth = parseFloat(widthMatch[1]);
                if (widthMatch[1].includes('mm')) svgWidth *= 3.78;
            }
            if (heightMatch) {
                svgHeight = parseFloat(heightMatch[1]);
                if (heightMatch[1].includes('mm')) svgHeight *= 3.78;
            }
            const svgDataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svgContent).toString('base64');

            // Scale to 42% of track height (matches LongToneUI.insertGlissandoSvg)
            const approxTrackHeight = 80;
            const approxScoreWidth = 1000;
            const targetHeight = approxTrackHeight * 0.42;
            const scale = targetHeight / svgHeight;
            const scaledContentWidth = svgWidth * scale;

            // Anchor-based SVG element: referenceSeconds = curve start, offsetSeconds = left of anchor
            // Approximate offsetSeconds from pixel gap (5px + scaledContentWidth)
            const secondsPerPixelGliss = secondsPerPage / approxScoreWidth;
            const gap = 5;
            let svgOffsetSeconds = -(gap + scaledContentWidth) * secondsPerPixelGliss;

            // Clamp: don't let SVG fall off the left edge of the page
            const pageStartScoreSeconds = (startPage * secondsPerPage) - leadIn;
            if (startSeconds + svgOffsetSeconds < pageStartScoreSeconds) {
                svgOffsetSeconds = pageStartScoreSeconds - startSeconds;
            }

            const existingSvgElements = scoreData.svgElements || [];
            const maxSvgId = existingSvgElements.reduce((max, e) => Math.max(max, e.id || 0), 0);

            // Generate standard name: SVG_YYYYMMDD_HHMMSS_NN_filename
            const nowGliss = new Date();
            const padGliss = (n, len) => String(n).padStart(len, '0');
            const svgCounterGliss = existingSvgElements.length + 1;
            const svgStdNameGliss = `SVG_${nowGliss.getFullYear()}${padGliss(nowGliss.getMonth()+1,2)}${padGliss(nowGliss.getDate(),2)}_${padGliss(nowGliss.getHours(),2)}${padGliss(nowGliss.getMinutes(),2)}${padGliss(nowGliss.getSeconds(),2)}_${padGliss(svgCounterGliss,2)}_${baseName}`;

            const svgElement = {
                id: maxSvgId + 1,
                name: svgStdNameGliss,
                referenceSeconds: startSeconds,
                offsetSeconds: svgOffsetSeconds,
                offsetYFraction: 0.1,
                width: svgWidth,
                height: svgHeight,
                scale,
                track: trackNum,
                svgDataUrl
            };
            if (!scoreData.svgElements) scoreData.svgElements = [];
            scoreData.svgElements.push(svgElement);
            console.log(`GlissandoAutomation: Added SVG element ${baseName}`);
        }

        // 9. Generate glissando MIDI segments
        const startPitchObj = pitchToMidiFloat(startPitch);
        const endPitchObj = pitchToMidiFloat(endPitch);
        const startPitchMidi = startPitchObj.midi + startPitchObj.quarterTone;
        const endPitchMidi = endPitchObj.midi + endPitchObj.quarterTone;

        const segments = generateGlissandoSegments(curveData, startPitchMidi, endPitchMidi, velocity, articulation);
        console.log(`GlissandoAutomation: Generated ${segments.length} MIDI segments`);

        // 10. Save MIDI files and add to score
        const midiDir = path.join(__dirname, 'public', 'midi_files');
        if (!fs.existsSync(midiDir)) fs.mkdirSync(midiDir, { recursive: true });

        if (!scoreData.databases) scoreData.databases = {};
        if (!scoreData.databases.midiSnippets) scoreData.databases.midiSnippets = { snippets: [], nextId: 1 };
        if (!scoreData.midiTracks) scoreData.midiTracks = [];
        while (scoreData.midiTracks.length < trackNum) {
            scoreData.midiTracks.push({ channel: scoreData.midiTracks.length + 1, midiEvents: [] });
        }
        const trackEvents = scoreData.midiTracks[trackNum - 1];

        const OVERLAP_MS = 5;
        let currentInsertTimeMs = startSeconds * 1000;
        const savedMidiFiles = [];

        for (let i = 0; i < segments.length; i++) {
            const seg = segments[i];
            const segNum = String(i + 1).padStart(2, '0');
            const pitchName = midiNoteToPitchName(seg.midiNote);
            const direction = seg.isGlissDown ? 'dn' : 'up';
            const midiFilename = `${curveName}_seg${segNum}_${pitchName}_${direction}.mid`;

            const midiBuffer = buildGlissandoSegmentMidi(seg, bpm);
            fs.writeFileSync(path.join(midiDir, midiFilename), midiBuffer);

            // Parse MIDI events and add to score
            const midiEvents = parseMidiToEvents(midiBuffer, currentInsertTimeMs, bpm);
            const snippetId = scoreData.databases.midiSnippets.nextId++;
            const segStartSeconds = currentInsertTimeMs / 1000;

            scoreData.databases.midiSnippets.snippets.push({
                id: snippetId,
                name: `Gliss seg${i + 1} @ ${curveName}`,
                trackIndex: trackNum - 1,
                startTimeMs: currentInsertTimeMs,
                durationMs: seg.duration * 1000,
                startSeconds: segStartSeconds,
                endSeconds: segStartSeconds + seg.duration,
                events: midiEvents,
                color,
                sourceCurve: newCurveId,
                sourceFile: midiFilename
            });

            for (const event of midiEvents) {
                trackEvents.midiEvents.push({
                    timeMs: event.timeMs,
                    type: event.type,
                    data: [...event.data],
                    snippetId: snippetId,
                    timestamp: event.timeMs
                });
            }

            savedMidiFiles.push(midiFilename);

            // Next segment: end of this note minus overlap
            currentInsertTimeMs = currentInsertTimeMs + seg.duration * 1000 - OVERLAP_MS;
        }

        trackEvents.midiEvents.sort((a, b) => a.timeMs - b.timeMs);

        // 11. Add curve to databases.curves
        if (!scoreData.databases.curves) scoreData.databases.curves = { curves: [], nextId: 1 };
        scoreData.databases.curves.curves.push(curveEntry);
        scoreData.databases.curves.nextId = newCurveId + 1;

        // 12. Update cursor state
        scoreData.cursorState = {
            editCursorSeconds: startSeconds - 1,
            gotoDisplaySeconds: startSeconds - 1,
            leadInSeconds: leadIn
        };

        // 13. Update metadata
        scoreData.metadata = scoreData.metadata || {};
        scoreData.metadata.title = nextName;
        scoreData.metadata.modified = new Date().toISOString();

        // 14. Save as next iteration
        const newFilePath = path.join(SCORES_DIR, `${nextName}.json`);
        fs.writeFileSync(newFilePath, JSON.stringify(scoreData, null, 2));
        console.log(`GlissandoAutomation: Saved score as '${nextName}'`);

        // 15. Version backup
        const versionFilename = `${nextName}_v${Date.now()}.json`;
        fs.writeFileSync(path.join(VERSIONS_DIR, versionFilename), JSON.stringify(scoreData, null, 2));

        res.json({
            success: true,
            scoreName: nextName,
            previousScore: latest,
            curve: { id: newCurveId, name: curveName, startSeconds, endSeconds },
            pitchRange: { start: startPitch, end: endPitch },
            midi: { segments: segments.length, files: savedMidiFiles },
            svg: fs.existsSync(svgFilePath) ? baseName + '.svg' : null,
            message: `Glissando created. Score saved as '${nextName}'. Refresh browser to see it.`
        });

    } catch (err) {
        console.error('GlissandoAutomation error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
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
